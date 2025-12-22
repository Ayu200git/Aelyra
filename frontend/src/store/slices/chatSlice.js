import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

let fetchChatsPromise = null;

export const fetchChats = createAsyncThunk(
  'chat/fetchChats',
  async ({ search = '', page = 1, append = false } = {}, { rejectWithValue }) => {
    const trimmedSearch = search.trim();
    const requestKey = `${trimmedSearch}-${page}-${append}`;
  
    if (fetchChatsPromise && fetchChatsPromise.key === requestKey) {
      return fetchChatsPromise.promise;
    }
    
    try {
      const promise = api.get('/api/chat/history', {
        params: {
          ...(trimmedSearch ? { q: trimmedSearch } : {}),
          page,
          limit: 20,
        },
      }).then(response => {
        const data = response.data.data || response.data;
        const chats = data.chats || [];
        const pagination = data.pagination || {};
        
        const normalizedChats = chats.map(chat => ({ ...chat, id: chat._id || chat.id }));
        
        return {
          chats: normalizedChats,
          pagination,
          append,  
        };
      });
      
      fetchChatsPromise = { key: requestKey, promise };
      const result = await promise;
      fetchChatsPromise = null;
      return result;
    } catch (error) {
      fetchChatsPromise = null;
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch chats');
    }
  }
);

export const createChat = createAsyncThunk(
  'chat/createChat',
  async ({ title = 'New Chat' }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/chat/create', { title });
      const chat = response.data.data?.chat || response.data.chat;
      return { ...chat, id: chat._id || chat.id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to create chat');
    }
  }
);

export const fetchChat = createAsyncThunk(
  'chat/fetchChat',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/${chatId}`);
      const chat = response.data.data?.chat || response.data.chat;
      return { ...chat, id: chat._id || chat.id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch chat');
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId, { rejectWithValue }) => {
    try {
      await api.delete(`/chat/${chatId}`);
      return chatId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to delete chat');
    }
  }
);

export const updateChat = createAsyncThunk(
  'chat/updateChat',
  async ({ chatId, updates }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/chat/${chatId}`, updates);
      const chat = response.data.data?.chat || response.data.chat;
      return { ...chat, id: chat._id || chat.id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to update chat');
    }
  }
);

export const toggleStarChat = createAsyncThunk(
  'chat/toggleStarChat',
  async ({ chatId, isStarred }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/chat/${chatId}`, { isStarred });
      const chat = response.data.data?.chat || response.data.chat;
      return { ...chat, id: chat._id || chat.id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to star chat');
    }
  }
);

export const shareChat = createAsyncThunk(
  'chat/shareChat',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/chat/${chatId}/share`);
      const shareData = response.data.data || response.data;
      return { chatId, ...shareData };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to share chat');
    }
  }
);

export const unshareChat = createAsyncThunk(
  'chat/unshareChat',
  async (chatId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/chat/${chatId}/share`);
      return { chatId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to unshare chat');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, chatId, imageFile = null, regenerate = false }, { rejectWithValue, dispatch }) => {
    try {
      if (regenerate) {
        dispatch(removeLastAssistantMessage({ chatId }));
      }
      let body;
      let headers = {
        'Content-Type': 'application/json',
      };

      if (imageFile && imageFile instanceof File) {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('chatId', chatId);
        formData.append('image', imageFile);
        body = formData;
        headers = {}; 
      } else {
        body = JSON.stringify({ message, chatId });
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      const reply = data.data?.reply || data.reply;
      const updatedChat = data.data?.chat || data.chat;

      if (reply) {
        dispatch(finalizeMessage({ chatId, content: reply }));
      }

      if (updatedChat) {
        const normalizedChat = { ...updatedChat, id: updatedChat._id || updatedChat.id };
        return { chatId, chat: normalizedChat, message: reply };
      }

      return { chatId, message: reply };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    currentChat: null,
    loading: false,
    streaming: false,
    error: null,
    sidebarOpen: true,
    chatsFetched: false,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    },
  },
  reducers: {
    setCurrentChat: (state, action) => {
      state.currentChat = action.payload;
    },
    clearCurrentChat: (state) => {
      state.currentChat = null;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    addUserMessage: (state, action) => {
      const { chatId, message, imageUrl } = action.payload;
      if (state.currentChat && 
          ((state.currentChat._id || state.currentChat.id) === chatId ||
           state.currentChat._id === chatId ||
           state.currentChat.id === chatId)) {
        state.currentChat.messages.push({
          role: 'user',
          content: message,
          imageUrl: imageUrl || '',
        });
      }
    },
    updateStreamingMessage: (state, action) => {
      const { chatId, content } = action.payload;
      if (state.currentChat && 
          ((state.currentChat._id || state.currentChat.id) === chatId ||
           state.currentChat._id === chatId ||
           state.currentChat.id === chatId)) {
        const lastMessage = state.currentChat.messages[state.currentChat.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content;
        } else {
          state.currentChat.messages.push({
            role: 'assistant',
            content: content,
          });
        }
        state.streaming = true;
      }
    },
    finalizeMessage: (state, action) => {
      const { chatId, content } = action.payload;
      if (state.currentChat && 
          ((state.currentChat._id || state.currentChat.id) === chatId ||
           state.currentChat._id === chatId ||
           state.currentChat.id === chatId)) {
        const messages = state.currentChat.messages;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content;
        } else {
          messages.push({
            role: 'assistant',
            content: content,
          });
        }
        state.streaming = false;
      }
    },
    removeLastAssistantMessage: (state, action) => {
      const { chatId } = action.payload;
      if (state.currentChat && 
          ((state.currentChat._id || state.currentChat.id) === chatId ||
           state.currentChat._id === chatId ||
           state.currentChat.id === chatId)) {
        const messages = state.currentChat.messages;
        if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
          messages.pop();
        }
      }
    },
    updateMessageFeedback: (state, action) => {
      const { messageIndex, feedback } = action.payload;
      if (state.currentChat && state.currentChat.messages[messageIndex]) {
        state.currentChat.messages[messageIndex].feedback = feedback;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetChats: (state) => {
      state.chats = [];
      state.currentChat = null;
      state.chatsFetched = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        const { chats, pagination, append } = action.payload;
        
        if (append) {
          state.chats = [...state.chats, ...chats];
        } else {
          state.chats = chats;
          state.chatsFetched = true; 
        }
        
        if (pagination) {
          state.pagination = pagination;
        }
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.chats.unshift(action.payload);
        state.currentChat = action.payload;
      })
      .addCase(fetchChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChat.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChat = {
          ...action.payload,
          messages: action.payload.messages || [],
        };
      })
      .addCase(fetchChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        const chatId = action.payload;
        state.chats = state.chats.filter((chat) => 
          (chat._id || chat.id) !== (chatId._id || chatId) && 
          chat._id !== chatId && 
          chat.id !== chatId
        );
        if (state.currentChat && 
            ((state.currentChat._id || state.currentChat.id) === (chatId._id || chatId) ||
             state.currentChat._id === chatId ||
             state.currentChat.id === chatId)) {
          state.currentChat = null;
        }
      })
      .addCase(updateChat.fulfilled, (state, action) => {
        const updated = action.payload;
        const chatId = updated._id || updated.id;
        const index = state.chats.findIndex((chat) => 
          (chat._id || chat.id) === chatId
        );
        if (index !== -1) {
          state.chats[index] = updated;
        }
        if (state.currentChat && 
            ((state.currentChat._id || state.currentChat.id) === chatId)) {
          state.currentChat = updated;
        }
      })
      .addCase(toggleStarChat.fulfilled, (state, action) => {
        const updated = action.payload;
        const chatId = updated._id || updated.id;
        const idx = state.chats.findIndex((c) => 
          (c._id || c.id) === chatId
        );
        if (idx !== -1) {
          state.chats[idx] = updated;
        }
        if (state.currentChat && 
            ((state.currentChat._id || state.currentChat.id) === chatId)) {
          state.currentChat = updated;
        }
      })
      .addCase(sendMessage.pending, (state) => {
        state.streaming = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.streaming = false;
        if (action.payload?.chat) {
          const updatedChat = action.payload.chat;
          const chatId = updatedChat.id || updatedChat._id;
          const index = state.chats.findIndex(c => (c.id || c._id) === chatId);
          if (index !== -1) {
            state.chats[index] = { ...state.chats[index], ...updatedChat };
          } else if (state.chats.length > 0) {
            state.chats.unshift({ ...updatedChat, id: updatedChat.id || updatedChat._id });
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.streaming = false;
        state.error = "AI Quota reached retry after some time.";
      });
  },
});

export const {
  setCurrentChat,
  clearCurrentChat,
  toggleSidebar,
  setSidebarOpen,
  addUserMessage,
  updateStreamingMessage,
  finalizeMessage,
  removeLastAssistantMessage,
  updateMessageFeedback,
  clearError,
  resetChats,
} = chatSlice.actions;

export default chatSlice.reducer;
