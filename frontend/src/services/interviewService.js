import { apiClient } from './api';

export const interviewService = {
  getInterviews: async (userId) => {
    const response = await apiClient.get(`/interviews/candidate/${userId || 'me'}`);
    return response.data;
  },

  scheduleInterview: async (interviewId, timeSlot) => {
    const response = await apiClient.post('/interviews/schedule', {
      interviewId,
      timeSlot
    });
    return response.data;
  },

  confirmInterview: async (interviewId) => {
    const response = await apiClient.put(`/interviews/${interviewId}/confirm`);
    return response.data;
  }
};
