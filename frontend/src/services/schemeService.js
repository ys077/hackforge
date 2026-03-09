import { mlClient, apiClient } from './api';

export const schemeService = {
  getRecommendations: async (profileData) => {
    const response = await mlClient.post('/schemes/recommend', profileData);
    return response.data.recommendations || [];
  },

  applyScheme: async (schemeId, applicationData) => {
    // Assuming Node backend handles applications
    const response = await apiClient.post('/schemes/apply', { schemeId, ...applicationData });
    return response.data;
  },

  scrapeSchemes: async () => {
    const response = await mlClient.post('/schemes/scrape');
    return response.data;
  }
};
