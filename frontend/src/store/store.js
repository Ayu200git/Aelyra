import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';

const isDevelopment = import.meta.env.DEV;

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'chat/sendMessage/fulfilled',
          'chat/sendMessage/pending',
          'chat/updateStreamingMessage',
          'chat/finalizeMessage',
          'chat/addUserMessage',
        ],
        ignoredActionPaths: ['payload.timestamp', 'meta', 'payload.messages'],
        ignoredPaths: [
          'chat.currentChat.messages',
          'chat.chats',
          'chat.currentChat',
        ],
        warnAfter: isDevelopment ? 1000 : 128,
      },
      immutableCheck: {
        ignoredPaths: [
          'chat.currentChat.messages',
          'chat.chats',
          'chat.currentChat',
        ],
        warnAfter: isDevelopment ? 1000 : 128,
      },
    }),
});

