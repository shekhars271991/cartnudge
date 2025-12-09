/**
 * Projects API functions
 */

import apiClient from "./client";
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectListResponse,
  MessageResponse,
} from "./types";

export const projectsApi = {
  /**
   * List all projects for current user
   */
  list: async (skip = 0, limit = 100): Promise<ProjectListResponse> => {
    const response = await apiClient.get<ProjectListResponse>("/projects", {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * Get a single project by ID
   */
  get: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Create a new project
   */
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post<Project>("/projects", data);
    return response.data;
  },

  /**
   * Update a project
   */
  update: async (projectId: string, data: ProjectUpdate): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${projectId}`, data);
    return response.data;
  },

  /**
   * Delete a project (soft delete)
   */
  delete: async (projectId: string): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(`/projects/${projectId}`);
    return response.data;
  },
};

export default projectsApi;

