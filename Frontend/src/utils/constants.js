export const StorageKeys = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
};

// API Endpoints - all standardized to /api/v1/users/*
export const API_ENDPOINTS = {
  BASE_URL: "/api/v1/users",
  REGISTER: "/api/v1/users/register",
  LOGIN: "/api/v1/users/login",
  LOGOUT: "/api/v1/users/logout",
  REFRESH_TOKEN: "/api/v1/users/refresh-token",
  CURRENT_USER: "/api/v1/users/me",
  FORGOT_PASSWORD: "/api/v1/users/forgot-password",
  RESET_PASSWORD: "/api/v1/users/reset-password",
  VERIFY_EMAIL: "/api/v1/users/verify-email",
};

// Session Management
export const SESSION_CONFIG = {
  WARNING_TIME_SECONDS: 60, // Show warning 60 seconds before expiry
  AUTO_REFRESH_THRESHOLD: 300, // Auto refresh if less than 5 minutes remaining
};

// Environment/Debug flags
export const APP_CONFIG = {
  DEBUG_MODE: import.meta.env.MODE === 'development',
  API_TIMEOUT: 10000, // 10 seconds
};