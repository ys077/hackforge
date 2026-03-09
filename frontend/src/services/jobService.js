import { mlClient, apiClient } from './api';

export const jobService = {
  getMatches: async (profileData) => {
    // AI Job Matcher
    const response = await mlClient.post('/jobs/recommend', profileData);
    return response.data.recommendations || [];
  },

  getJobDetails: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  scrapeJobs: async () => {
    const response = await mlClient.post('/jobs/scrape');
    return response.data;
  },

  getApplications: async () => {
    // Workers can check their own applications at /workers/applications
    const response = await apiClient.get('/workers/applications');
    return response.data?.data || response.data;
  },

  applyJob: async (jobId, resumeData) => {
    // Post to /jobs/:id/apply 
    const response = await apiClient.post(`/jobs/${jobId}/apply`, { resumeData });
    return response.data;
  }
};
