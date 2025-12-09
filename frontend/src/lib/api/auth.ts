/**
 * Auth API functions
 */

import apiClient, { tokenManager } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
} from "./types";

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>("/auth/register", data);
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    
    // Store tokens
    tokenManager.setTokens(response.data.access_token, response.data.refresh_token);
    
    return response.data;
  },

  /**
   * Logout - revoke refresh token
   */
  logout: async (): Promise<void> => {
    const refreshToken = tokenManager.getRefreshToken();
    
    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refresh_token: refreshToken });
      } catch (error) {
        // Ignore errors on logout - we'll clear tokens anyway
        console.error("Logout error:", error);
      }
    }
    
    tokenManager.clearTokens();
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/auth/forgot-password", data);
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/auth/reset-password", data);
    return response.data;
  },
};

export default authApi;

