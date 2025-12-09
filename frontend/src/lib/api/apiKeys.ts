/**
 * API Keys API functions
 */

import apiClient from "./client";
import type {
  ApiKeyCreate,
  ApiKeyCreated,
  ApiKeyListResponse,
  MessageResponse,
} from "./types";

export const apiKeysApi = {
  /**
   * List all API keys for a project
   */
  list: async (projectId: string, skip = 0, limit = 100): Promise<ApiKeyListResponse> => {
    const response = await apiClient.get<ApiKeyListResponse>(
      `/projects/${projectId}/api-keys`,
      { params: { skip, limit } }
    );
    return response.data;
  },

  /**
   * Create a new API key
   * Note: The full key is only returned once!
   */
  create: async (projectId: string, data: ApiKeyCreate): Promise<ApiKeyCreated> => {
    const response = await apiClient.post<ApiKeyCreated>(
      `/projects/${projectId}/api-keys`,
      data
    );
    return response.data;
  },

  /**
   * Revoke an API key
   */
  revoke: async (projectId: string, keyId: string): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(
      `/projects/${projectId}/api-keys/${keyId}`
    );
    return response.data;
  },
};

export default apiKeysApi;

