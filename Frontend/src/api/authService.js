// import axiosInstance from "./axios";
// import { StorageKeys } from "../utils/constants.js";

// const authService = {
//   register: async (userdata) => {
//     const response = await axiosInstance.post("/auth/register", userdata);
//     return response.data;
//   },
//   login: async (credentials) => {
//     const response = await axiosInstance.post("/auth/login", credentials);

//     if (response.data?.data?.accessToken) {
//       localStorage.setItem(
//         StorageKeys.ACCESS_TOKEN,
//         response.data.data.accessToken
//       );
//     }
//     if (response.data?.data?.refreshToken) {
//       localStorage.setItem(
//         StorageKeys.REFRESH_TOKEN,
//         response.data.data.accessToken
//       );
//     }

//     return response.data;
//   },

//   logout: async () => {
//     const response = await axiosInstance.get("/auth/logout", userdata);
//     localStorage.removeItem(StorageKeys.ACCESS_TOKEN);
//     localStorage.removeItem(StorageKeys.REFRESH_TOKEN);
//     return response.data;
//   },
//   getCurrentUser: async (userdata) => {
//     const response = await axiosInstance.post("/auth/current-user", userdata);
//     return response.data;
//   },
// };

// export default authService;


import axiosInstance from './axios';
import store from '../store/store';
import { API_ENDPOINTS } from '../utils/constants';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logoutStart,
  logoutSuccess,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  updateUserData,
} from '../store/authSlice';
import { handleApiError } from '../utils/errorHandler';

const authService = {
  // Register user
  register: async (userData) => {
    try {
      store.dispatch(registerStart());
      
      const response = await axiosInstance.post(API_ENDPOINTS.REGISTER, userData);
      
      if (response.data?.success) {
        store.dispatch(registerSuccess({
          user: response.data.data.user,
          message: response.data.message,
          autoLogin: false, // Don't auto-login after register
        }));
      }
      
      return response.data;
    } catch (error) {
      store.dispatch(registerFailure(error.response?.data?.message || 'Registration failed'));
      handleApiError(error);
      throw error;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      store.dispatch(loginStart());
      
      const response = await axiosInstance.post(API_ENDPOINTS.LOGIN, credentials);
      
      if (response.data?.success && response.data?.data) {
        const { user, accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry } = response.data.data;
        
        store.dispatch(loginSuccess({
          user,
          accessToken,
          refreshToken,
          accessTokenExpiry,
          refreshTokenExpiry,
          loginTime: new Date().toISOString(),
        }));
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      const errors = error.response?.data?.errors || [];
      store.dispatch(loginFailure({ message: errorMessage, errors }));
      handleApiError(error);
      throw error;
    }
  },

  // Refresh access token
  refreshToken: async () => {
    try {
      store.dispatch(refreshTokenStart());
      
      const response = await axiosInstance.post(API_ENDPOINTS.REFRESH_TOKEN, {}, {
        withCredentials: true,
      });
      
      if (response.data?.success && response.data?.data) {
        const { accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry } = response.data.data;
        
        store.dispatch(refreshTokenSuccess({
          accessToken,
          refreshToken,
          accessTokenExpiry,
          refreshTokenExpiry,
          refreshTime: new Date().toISOString(),
        }));
        
        return response.data;
      } else {
        throw new Error('Invalid refresh token response');
      }
    } catch (error) {
      store.dispatch(refreshTokenFailure(error.response?.data?.message || 'Token refresh failed'));
      
      // If refresh fails, trigger logout through error handler
      handleApiError(error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      store.dispatch(logoutStart());
      
      // Call logout API to invalidate server-side session
      await axiosInstance.post(API_ENDPOINTS.LOGOUT, {}, {
        withCredentials: true,
      });
      
      // Always clear local state regardless of API response
      store.dispatch(logoutSuccess());
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      // Even if API call fails, clear local state
      store.dispatch(logoutSuccess());
      
      // Don't throw error for logout - always succeed locally
      console.warn('Logout API failed, but local logout completed:', error);
      return { success: true, message: 'Logged out locally' };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CURRENT_USER, {
        withCredentials: true,
      });
      
      if (response.data?.success && response.data?.data) {
        const { user, tokenInfo } = response.data.data;
        
        // Update user data in store
        store.dispatch(updateUserData(user));
        
        return {
          ...response.data,
          data: {
            user,
            tokenInfo,
          },
        };
      }
      
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.RESET_PASSWORD, {
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Verify email
  verifyEmail: async (token) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.VERIFY_EMAIL}/${token}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

export default authService;