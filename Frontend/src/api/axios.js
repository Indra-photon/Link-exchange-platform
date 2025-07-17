// import axios from "axios";
// import { StorageKeys } from "../utils/constants";

// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// const axiosInstance = axios.create({
//   baseURL: API_URL,
//   withCredentials: true,
//   timeout: 10000,
// });

// axiosInstance.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem(StorageKeys.ACCESS_TOKEN)
//         if(token){
//             config.headers.Authorization = `Bearer ${token}`
//         }

//         return config
//     },
//     (error) => Promise.reject(error)
// )

// axiosInstance.interceptors.response.use(
//     (response) => response,

//     async(error) => {
//         const originalRequest = error.config

//         if(error.response?.status === 401 && !originalRequest._retry){
//             originalRequest._retry = true

//             try {
//                 const refreshToken = localStorage.getItem(StorageKeys.REFRESH_TOKEN)

//                 if(!refreshToken){
//                     localStorage.removeItem(StorageKeys.ACCESS_TOKEN)
//                     window.location.href = "/login"
//                     return Promise.reject(error)
//                 }

//                 const response = await axios.post(
//                     `${API_URL}/auth/refresh-token`,
//                     {refreshToken},
//                     {
//                         withCredentials: true
//                     }
//                 )

//                 if (response.data?.data?.accessToken) {
//                   localStorage.setItem(
//                     StorageKeys.ACCESS_TOKEN,
//                     response.data.data.accessToken
//                   );
//                 }
//                 if (response.data?.data?.refreshToken) {
//                   localStorage.setItem(
//                     StorageKeys.REFRESH_TOKEN,
//                     response.data.data.accessToken
//                   );
//                 }

//                 originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
//                 return axiosInstance(originalRequest)


//             } catch (error) {
//                 localStorage.removeItem(StorageKeys.ACCESS_TOKEN)
//                 localStorage.removeItem(StorageKeys.REFRESH_TOKEN)
//                  window.location.href = "/login";

//                  return Promise.reject(error)
//             }
//         }
//     }
// )


// export default axiosInstance;


import axios from 'axios';
import store from '../store/store';
import { StorageKeys, APP_CONFIG } from '../utils/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: APP_CONFIG.API_TIMEOUT,
});

// Request interceptor - Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from Redux store first, then fallback to localStorage
    const state = store.getState();
    const token = state.auth.token || localStorage.getItem(StorageKeys.ACCESS_TOKEN);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (APP_CONFIG.DEBUG_MODE) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (APP_CONFIG.DEBUG_MODE) {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error in development
    if (APP_CONFIG.DEBUG_MODE) {
      console.error(`API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.message,
      });
    }

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from localStorage (fallback to Redux)
        const state = store.getState();
        const refreshToken = localStorage.getItem(StorageKeys.REFRESH_TOKEN) || 
                           state.auth.refreshToken;

        if (!refreshToken) {
          console.warn('No refresh token available');
          // Import authService dynamically to avoid circular dependency
          const { default: authService } = await import('./authService.js');
          await authService.logout();
          return Promise.reject(error);
        }

        console.log('Attempting token refresh...');
        
        // Import authService dynamically to avoid circular dependency
        const { default: authService } = await import('./authService.js');
        await authService.refreshToken();

        console.log('Token refresh successful, retrying original request');

        // Get new token and retry original request
        const newState = store.getState();
        const newToken = newState.auth.token || localStorage.getItem(StorageKeys.ACCESS_TOKEN);
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } else {
          console.error('No new token after refresh');
          await authService.logout();
          return Promise.reject(error);
        }

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Import authService dynamically to avoid circular dependency
        const { default: authService } = await import('./authService.js');
        await authService.logout();
        
        return Promise.reject(refreshError);
      }
    }

    // For all other errors, just pass through
    return Promise.reject(error);
  }
);

export default axiosInstance;