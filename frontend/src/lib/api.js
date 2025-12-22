const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

//api client
const api = {
  get: async (endpoint, config = {}) => {
    const url = config.params 
      ? `${API_BASE_URL}${endpoint}?${new URLSearchParams(config.params).toString()}`
      : `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data };
  },
  
  post: async (endpoint, body, config = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data };
  },
  
  put: async (endpoint, body, config = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data };
  },
  
  patch: async (endpoint, body, config = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data };
  },
  
  delete: async (endpoint, config = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data };
  },
};

//api for authentication
export const authAPI = {
  register: (data) => apiCall('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiCall('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiCall('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => apiCall('/api/auth/me'),
  forgotPassword: (email) => apiCall('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => apiCall('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};

// api for chats
export const chatAPI = {
  createChat: (data) => apiCall('/api/chat/create', { method: 'POST', body: JSON.stringify(data) }),
  getChatHistory: () => apiCall('/api/chat/history'),
  getChat: (chatId) => apiCall(`/api/chat/${chatId}`),
  sendMessage: (data) => apiCall('/api/chat/send', { method: 'POST', body: JSON.stringify(data) }),
  deleteChat: (chatId) => apiCall(`/api/chat/${chatId}`, { method: 'DELETE' }),
  shareChat: (chatId) => apiCall(`/api/chat/${chatId}/share`, { method: 'POST' }),
  getSharedChat: (token) => apiCall(`/api/chat/shared/${token}`),
};

// api for image
export const imageAPI = {
  generateImage: (prompt) => apiCall('/api/image/generate', { method: 'POST', body: JSON.stringify({ prompt }) }),
};

// api for user
export const userAPI = {
  getProfile: () => apiCall('/api/user/profile'),
  updateProfile: (data) => apiCall('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => apiCall('/api/user/delete', { method: 'DELETE' }),
};

export default api;
export { apiCall };
