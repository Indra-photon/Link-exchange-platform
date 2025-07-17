// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import axios from 'axios';

// const initialState = {
//   status: false,
//   userData: null,
//   token: null,
//   tokenInfo: {
//     accessTokenExpiry: null,
//     refreshTokenExpiry: null,
//     loginTime: null,
//     lastRefreshTime: null,
//     warningShown: false,
//   },
//   paymentStatus: {
//     loading: false,
//     error: null,
//     success: false,
//     lastUpdated: null,
//   },
// };

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     login: (state, action) => {
//       state.status = true;
//       state.userData = action.payload.user || action.payload;

//       // Store token info
//       if (action.payload.accessTokenExpiry) {
//         state.tokenInfo = {
//           accessTokenExpiry: action.payload.accessTokenExpiry,
//           refreshTokenExpiry: action.payload.refreshTokenExpiry,
//           loginTime: action.payload.loginTime,
//           lastRefreshTime: null,
//           warningShown: false,
//         };
//       }

//       // If a token is provided in the payload, store it
//       if (action.payload.token || action.payload.accessToken) {
//         state.token = action.payload.token || action.payload.accessToken;
//       }
//     },
//     logout: (state) => {
//       state.status = false;
//       state.userData = null;
//       state.token = null;
//       state.tokenInfo = initialState.tokenInfo;
//       state.paymentStatus = initialState.paymentStatus;
//     },
//     updateUserData: (state, action) => {
//       state.userData = {
//         ...state.userData,
//         ...action.payload,
//       };
//     },
//     updateTokenInfo: (state, action) => {
//       state.tokenInfo = {
//         ...state.tokenInfo,
//         ...action.payload,
//         warningShown: false,
//       };
//     },
//     setWarningShown: (state, action) => {
//       state.tokenInfo.warningShown = action.payload;
//     },
//     refreshTokenSuccess: (state, action) => {
//       // Update token info after successful refresh
//       if (action.payload.accessTokenExpiry) {
//         state.tokenInfo = {
//           ...state.tokenInfo,
//           accessTokenExpiry: action.payload.accessTokenExpiry,
//           refreshTokenExpiry: action.payload.refreshTokenExpiry,
//           lastRefreshTime: action.payload.refreshTime,
//           warningShown: false,
//         };
//       }

//       // Update token if provided
//       if (action.payload.accessToken) {
//         state.token = action.payload.accessToken;
//       }
//     },
//     // Reset payment status after handling
//     resetPaymentStatus: (state) => {
//       state.paymentStatus = initialState.paymentStatus;
//     },
//     // For direct token updates (if needed)
//     updateUserTokens: (state, action) => {
//       if (state.userData && state.userData.tokens) {
//         state.userData.tokens.balance = action.payload.newBalance;
//         // You might want to update other token-related fields
//       }
//     },
//     // For direct subscription updates (if needed)
//     updateUserSubscription: (state, action) => {
//       if (state.userData && state.userData.subscription) {
//         state.userData.subscription = {
//           ...state.userData.subscription,
//           ...action.payload,
//         };
//       }
//     },
//   },
// });

// export const {
//   login,
//   logout,
//   updateUserData,
//   resetPaymentStatus,
//   updateUserTokens,
//   updateUserSubscription,
//   updateTokenInfo,
//   setWarningShown,
//   refreshTokenSuccess,
// } = authSlice.actions;

// export default authSlice.reducer;


import { createSlice } from '@reduxjs/toolkit';
import { StorageKeys } from '../utils/constants';

const initialState = {
  status: false,
  userData: null,
  token: null,
  tokenInfo: {
    accessTokenExpiry: null,
    refreshTokenExpiry: null,
    loginTime: null,
    lastRefreshTime: null,
    warningShown: false,
  },
  loading: {
    login: false,
    register: false,
    logout: false,
    refreshing: false,
  },
  validationErrors: [],
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login actions
    loginStart: (state) => {
      state.loading.login = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.status = true;
      state.userData = action.payload.user || action.payload;
      state.token = action.payload.accessToken || action.payload.token;
      state.loading.login = false;
      state.error = null;

      // Store token info if provided
      if (action.payload.accessTokenExpiry) {
        state.tokenInfo = {
          accessTokenExpiry: action.payload.accessTokenExpiry,
          refreshTokenExpiry: action.payload.refreshTokenExpiry,
          loginTime: action.payload.loginTime || new Date().toISOString(),
          lastRefreshTime: null,
          warningShown: false,
        };
      }

      // Persist to localStorage
      if (state.token) {
        localStorage.setItem(StorageKeys.ACCESS_TOKEN, state.token);
      }
      if (action.payload.refreshToken) {
        localStorage.setItem(StorageKeys.REFRESH_TOKEN, action.payload.refreshToken);
      }
      if (state.userData) {
        localStorage.setItem(StorageKeys.USER, JSON.stringify(state.userData));
      }
    },
    loginFailure: (state, action) => {
      state.status = false;
      state.userData = null;
      state.token = null;
      state.loading.login = false;
      state.error = action.payload.message || action.payload;
      state.validationErrors = action.payload.errors || [];
      state.tokenInfo = initialState.tokenInfo;
    },

    // Register actions
    registerStart: (state) => {
      state.loading.register = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.loading.register = false;
      state.error = null;
      // Don't auto-login after register unless specified
      if (action.payload.autoLogin) {
        state.status = true;
        state.userData = action.payload.user;
        state.token = action.payload.accessToken;
        
        // Persist to localStorage if auto-login
        if (state.token) {
          localStorage.setItem(StorageKeys.ACCESS_TOKEN, state.token);
        }
        if (action.payload.refreshToken) {
          localStorage.setItem(StorageKeys.REFRESH_TOKEN, action.payload.refreshToken);
        }
        if (state.userData) {
          localStorage.setItem(StorageKeys.USER, JSON.stringify(state.userData));
        }
      }
    },
    registerFailure: (state, action) => {
      state.loading.register = false;
      state.error = action.payload;
    },

    // Logout actions
    logoutStart: (state) => {
      state.loading.logout = true;
    },
    logoutSuccess: (state) => {
      // Clear all state
      state.status = false;
      state.userData = null;
      state.token = null;
      state.tokenInfo = initialState.tokenInfo;
      state.loading = initialState.loading;
      state.error = null;

      // Clear localStorage
      localStorage.removeItem(StorageKeys.ACCESS_TOKEN);
      localStorage.removeItem(StorageKeys.REFRESH_TOKEN);
      localStorage.removeItem(StorageKeys.USER);
    },

    // Token refresh actions
    refreshTokenStart: (state) => {
      state.loading.refreshing = true;
    },
    refreshTokenSuccess: (state, action) => {
      state.token = action.payload.accessToken;
      state.loading.refreshing = false;
      state.error = null;

      // Update token info
      if (action.payload.accessTokenExpiry) {
        state.tokenInfo = {
          ...state.tokenInfo,
          accessTokenExpiry: action.payload.accessTokenExpiry,
          refreshTokenExpiry: action.payload.refreshTokenExpiry,
          lastRefreshTime: action.payload.refreshTime || new Date().toISOString(),
          warningShown: false,
        };
      }

      // Persist to localStorage
      localStorage.setItem(StorageKeys.ACCESS_TOKEN, state.token);
      if (action.payload.refreshToken) {
        localStorage.setItem(StorageKeys.REFRESH_TOKEN, action.payload.refreshToken);
      }
    },
    refreshTokenFailure: (state, action) => {
      state.loading.refreshing = false;
      state.error = action.payload;
      // Don't clear tokens here - let logout handle it
    },

    // User data updates
    updateUserData: (state, action) => {
      if (state.userData) {
        state.userData = {
          ...state.userData,
          ...action.payload,
        };
        // Persist updated user data
        localStorage.setItem(StorageKeys.USER, JSON.stringify(state.userData));
      }
    },

    // Session warning management
    setWarningShown: (state, action) => {
      state.tokenInfo.warningShown = action.payload;
    },

    // Error management
    clearError: (state) => {
      state.error = null;
    },

    // Initialize from localStorage (on app startup)
    initializeFromStorage: (state, action) => {
      const { token, userData, tokenInfo } = action.payload;
      
      if (token && userData) {
        state.status = true;
        state.userData = userData;
        state.token = token;
        state.tokenInfo = tokenInfo || initialState.tokenInfo;
      }
    },
  },
});

export const {
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
  setWarningShown,
  clearError,
  initializeFromStorage,
} = authSlice.actions;

export default authSlice.reducer;