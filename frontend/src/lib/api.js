const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Remove Content-Type for FormData
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

// Create axios-like API client for compatibility
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

// Auth APIs
export const authAPI = {
  register: (data) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => apiCall('/auth/me'),
  forgotPassword: (email) => apiCall('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => apiCall('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};

// Chat APIs
export const chatAPI = {
  createChat: (data) => apiCall('/chat/create', { method: 'POST', body: JSON.stringify(data) }),
  getChatHistory: () => apiCall('/chat/history'),
  getChat: (chatId) => apiCall(`/chat/${chatId}`),
  sendMessage: (data) => apiCall('/chat/send', { method: 'POST', body: JSON.stringify(data) }),
  deleteChat: (chatId) => apiCall(`/chat/${chatId}`, { method: 'DELETE' }),
  shareChat: (chatId) => apiCall(`/chat/${chatId}/share`, { method: 'POST' }),
  getSharedChat: (token) => apiCall(`/chat/shared/${token}`),
};

// Image APIs
export const imageAPI = {
  generateImage: (prompt) => apiCall('/image/generate', { method: 'POST', body: JSON.stringify({ prompt }) }),
};

// User APIs
export const userAPI = {
  getProfile: () => apiCall('/user/profile'),
  updateProfile: (data) => apiCall('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => apiCall('/user/delete', { method: 'DELETE' }),
};

export default api;
export { apiCall };
