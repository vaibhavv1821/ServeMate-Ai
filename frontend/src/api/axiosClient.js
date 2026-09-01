import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('servmate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Returns res.data directly and formats clean Error with backend message
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network request failed';
    const customError = new Error(message);
    customError.response = error.response;
    customError.status = error.response?.status;

    // Handle 401 Unauthorized token cleanup (excluding login/register attempts)
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
      localStorage.removeItem('servmate_token');
      delete axiosClient.defaults.headers.common['Authorization'];
    }

    return Promise.reject(customError);
  }
);

export default axiosClient;
