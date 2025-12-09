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

// Normalize project data to ensure `id` field exists (backend may return `_id`)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeProject = (data: any): Project => ({
  ...data,
  id: data.id || data._id,
});

export const projectsApi = {
  /**
   * List all projects for current user
   */
  list: async (skip = 0, limit = 100): Promise<ProjectListResponse> => {
    const response = await apiClient.get<ProjectListResponse>("/projects", {
      params: { skip, limit },
    });
    return {
      ...response.data,
      items: response.data.items.map(normalizeProject),
    };
  },

  /**
   * Get a single project by ID
   */
  get: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${projectId}`);
    return normalizeProject(response.data);
  },

  /**
   * Create a new project
   */
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post<Project>("/projects", data);
    return normalizeProject(response.data);
  },

  /**
   * Update a project
   */
  update: async (projectId: string, data: ProjectUpdate): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${projectId}`, data);
    return normalizeProject(response.data);
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

