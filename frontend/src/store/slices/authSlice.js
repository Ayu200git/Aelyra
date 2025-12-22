import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }, { rejectWithValue }) => {  // ← Changed 'username' to 'name'
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),  // ← Changed 'username' to 'name'
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Registration failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Login failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'GET',  // ← Changed from POST to GET (your backend uses GET)
        credentials: 'include',
      });
      if (!response.ok) {
        return rejectWithValue('Logout failed');
      }
      return {};
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { 
          user: null, 
          isAuthenticated: false, 
          error: error.message || 'Authentication check failed' 
        };
      }
      
      const data = await response.json();
      return { 
        user: data.user, 
        isAuthenticated: data.authenticated || false 
      };
    } catch (error) {
      console.error('Auth check error:', error);
      return { 
        user: null, 
        isAuthenticated: false, 
        error: error.message 
      };
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Update failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const deleteProfile = createAsyncThunk(
  'auth/deleteProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/delete`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Delete failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Request failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {  // ← Fixed URL
        method: 'PUT',  // ← Changed from POST to PUT (your backend uses PUT)
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),  // ← Only send password, not token
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Reset failed');
      }
      // Handle both old and new response formats
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user = action.payload.user;
        state.initialized = true;
        state.error = action.payload.error || null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
        state.error = action.payload || 'Failed to check authentication';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.loading = false;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProfile.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;