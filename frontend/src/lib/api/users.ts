/**
 * Users API functions
 */

import apiClient from "./client";
import type { User, UserUpdate, PasswordChange, MessageResponse } from "./types";

export const usersApi = {
  /**
   * Get current user profile
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>("/users/me");
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateMe: async (data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>("/users/me", data);
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: PasswordChange): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>("/users/me/password", data);
    return response.data;
  },

  /**
   * Delete account (soft delete)
   */
  deleteAccount: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>("/users/me");
    return response.data;
  },
};

export default usersApi;

