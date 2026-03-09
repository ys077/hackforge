import { apiClient, mlClient } from './api';

export const documentService = {
  uploadDocument: async (file, type) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', type);
    formData.append('document_name', `${type}_upload`);

    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  verifyDocumentMl: async (base64Image, type) => {
    const response = await mlClient.post('/documents/verify', {
      document_type: type,
      image: base64Image
    });
    return response.data;
  },

  classifyDocumentMl: async (base64Image) => {
    const response = await mlClient.post('/documents/classify', {
      image: base64Image
    });
    return response.data;
  },

  getTrustScore: async (userId) => {
    // Backend uses /documents/stats to return verification statistics including trust score
    const response = await apiClient.get('/documents/stats');
    return response.data?.data || response.data;
  }
};
