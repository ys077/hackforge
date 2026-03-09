import { mlClient, apiClient } from './api';

export const resumeService = {
  generateResume: async (profileData) => {
    // We send it to ML service for generation
    const response = await mlClient.post('/resume/generate', profileData);
    return response.data;
  },

  analyzeResume: async (resumeData, jobDescription) => {
    const response = await mlClient.post('/resume-analyze', {
      resume: typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData),
      job_description: jobDescription
    });
    return response.data;
  },

  saveResume: async (resumeData) => {
    // Backend uses POST /resumes
    const response = await apiClient.post('/resumes', { ...resumeData });
    return response.data;
  },

  getResumes: async () => {
    // Backend uses GET /resumes to return current worker's resumes
    const response = await apiClient.get('/resumes');
    return response.data?.data || response.data;
  }
};
