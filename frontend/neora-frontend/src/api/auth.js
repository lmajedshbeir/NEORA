import apiClient from './client';

export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Verify email
  verifyEmail: async (token) => {
    console.log('authAPI.verifyEmail: Sending token:', token);
    const response = await apiClient.post('/auth/verify', { token });
    console.log('authAPI.verifyEmail: Response:', response.data);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset', {
      token,
      new_password: newPassword
    });
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (updates) => {
    const response = await apiClient.patch('/me', updates);
    return response.data;
  }
};

