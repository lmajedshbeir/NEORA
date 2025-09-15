import axios from 'axios';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://neora-backend-zl4q.onrender.com/api';

// Log environment variable status
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn('VITE_API_BASE_URL environment variable is not set! Using default:', API_BASE_URL);
}

// Debug logging
console.log('API_BASE_URL:', API_BASE_URL);
console.log('VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_BACKEND_URL env var:', import.meta.env.VITE_BACKEND_URL);
console.log('All env vars:', import.meta.env);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for JWT cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Debug logging
    console.log('Request config:', config);
    console.log('Base URL:', config.baseURL);
    console.log('Request URL:', config.url);
    
    // Safely construct the full URL
    try {
      const fullUrl = config.baseURL + config.url;
      console.log('Full URL:', fullUrl);
      
      // Validate URL
      new URL(fullUrl);
    } catch (urlError) {
      console.error('Invalid URL construction:', urlError);
      console.error('Base URL:', config.baseURL);
      console.error('Request URL:', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with safe refresh handling (no infinite loops)
let isRefreshing = false;
let pendingRequests = [];

const processPending = (error, tokenRefreshed) => {
  pendingRequests.forEach(({ resolve, reject, config }) => {
    if (tokenRefreshed) {
      resolve(apiClient(config));
    } else {
      reject(error);
    }
  });
  pendingRequests = [];
};

// Helper function to check if we have auth cookies
const hasAuthCookies = () => {
  return document.cookie.includes('access_token=') || document.cookie.includes('refresh_token=');
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};

    // Never try to refresh the refresh endpoint itself
    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we don't have auth cookies
    if (status === 401 && !hasAuthCookies()) {
      // No auth cookies, just reject the request
      return Promise.reject(error);
    }

    if (status === 401) {
      if (isRefreshing) {
        // Queue while a single refresh attempt is in-flight
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      try {
        await apiClient.post('/auth/refresh');
        isRefreshing = false;
        processPending(null, true);
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processPending(refreshError, false);
        // Only redirect to login if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

