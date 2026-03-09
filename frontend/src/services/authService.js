import { apiClient } from './api';

export const authService = {
  sendOtp: async (phone) => {
    const response = await apiClient.post('/auth/send-otp', { phone });
    return response.data;
  },

  verifyOtp: async (phone, otp) => {
    const response = await apiClient.post('/auth/verify-otp', { phone, otp });
    
    // Adjusted based on backend `{ status: 'success', data: { token, user } }` signature
    if (response.data?.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user || {}));
    }
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }
};
