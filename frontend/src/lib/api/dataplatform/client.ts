/**
 * Data Platform Service API Client
 * 
 * Separate client for the data platform service (runs on different port)
 * Uses the same auth token from identity service (Bearer token)
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenManager } from "../client";

// Data Platform Service base URL
const DATA_PLATFORM_URL = import.meta.env.VITE_DATA_PLATFORM_URL || "http://localhost:8010/api/v1";

// Create axios instance for data platform
export const dataPlatformClient = axios.create({
  baseURL: DATA_PLATFORM_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - attach Bearer access token
dataPlatformClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
dataPlatformClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If 401, redirect to login (token expired and refresh failed)
    if (error.response?.status === 401) {
      // The identity service client will handle token refresh
      // If we get a 401 here, it means the token is truly invalid
      tokenManager.clearTokens();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default dataPlatformClient;
