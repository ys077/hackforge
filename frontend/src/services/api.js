import axios from 'axios';
import Cookies from 'js-cookie';

// Using localhost for development since no specific Railway URL was provided.
// The Node backend is at 5000, and ML backend is 8001.
const NODE_API_URL = 'http://localhost:5000/api';
const ML_API_URL = 'http://localhost:8001/ml';

export const apiClient = axios.create({
  baseURL: NODE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const mlClient = axios.create({
  baseURL: ML_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// We can add interceptors for mlClient if it needs auth later.
