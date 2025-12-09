/**
 * Datablock API Functions
 */

import dataPlatformClient from "./client";
import type {
  Datablock,
  DatablockCreate,
  DatablockUpdate,
  DatablockListResponse,
  DatablockTemplate,
} from "./types";

// Helper to normalize datablock (handle _id vs id)
const normalizeDatablock = (datablock: Datablock): Datablock => {
  return {
    ...datablock,
    id: datablock.id || datablock._id || "",
  };
};

export const datablocksApi = {
  // =========================================================================
  // Templates (public endpoints)
  // =========================================================================

  /**
   * List all predefined datablock templates
   */
  listTemplates: async (): Promise<DatablockTemplate[]> => {
    const response = await dataPlatformClient.get<DatablockTemplate[]>(
      "/datablocks/templates"
    );
    return response.data;
  },

  /**
   * Get a specific template by ID
   */
  getTemplate: async (templateId: string): Promise<DatablockTemplate> => {
    const response = await dataPlatformClient.get<DatablockTemplate>(
      `/datablocks/templates/${templateId}`
    );
    return response.data;
  },

  // =========================================================================
  // Project Datablocks (protected endpoints)
  // =========================================================================

  /**
   * List all datablocks for a project
   */
  list: async (
    projectId: string,
    skip = 0,
    limit = 100
  ): Promise<DatablockListResponse> => {
    const response = await dataPlatformClient.get<DatablockListResponse>(
      `/projects/${projectId}/datablocks`,
      { params: { skip, limit } }
    );
    return {
      items: response.data.items.map(normalizeDatablock),
      total: response.data.total,
    };
  },

  /**
   * Get a single datablock
   */
  get: async (projectId: string, datablockId: string): Promise<Datablock> => {
    const response = await dataPlatformClient.get<Datablock>(
      `/projects/${projectId}/datablocks/${datablockId}`
    );
    return normalizeDatablock(response.data);
  },

  /**
   * Create a custom datablock
   */
  create: async (
    projectId: string,
    data: DatablockCreate
  ): Promise<Datablock> => {
    const response = await dataPlatformClient.post<Datablock>(
      `/projects/${projectId}/datablocks`,
      data
    );
    return normalizeDatablock(response.data);
  },

  /**
   * Create a datablock from a predefined template
   */
  createFromTemplate: async (
    projectId: string,
    templateId: string
  ): Promise<Datablock> => {
    const response = await dataPlatformClient.post<Datablock>(
      `/projects/${projectId}/datablocks/from-template/${templateId}`
    );
    return normalizeDatablock(response.data);
  },

  /**
   * Update a datablock
   */
  update: async (
    projectId: string,
    datablockId: string,
    data: DatablockUpdate
  ): Promise<Datablock> => {
    const response = await dataPlatformClient.put<Datablock>(
      `/projects/${projectId}/datablocks/${datablockId}`,
      data
    );
    return normalizeDatablock(response.data);
  },

  /**
   * Delete a datablock
   */
  delete: async (projectId: string, datablockId: string): Promise<void> => {
    await dataPlatformClient.delete(
      `/projects/${projectId}/datablocks/${datablockId}`
    );
  },

  // =========================================================================
  // Status Updates
  // =========================================================================

  /**
   * Mark a datablock as ready for deployment
   */
  markReady: async (
    projectId: string,
    datablockId: string
  ): Promise<Datablock> => {
    const response = await dataPlatformClient.post<Datablock>(
      `/projects/${projectId}/datablocks/${datablockId}/mark-ready`
    );
    return normalizeDatablock(response.data);
  },

  /**
   * Mark a datablock as deployed
   */
  markDeployed: async (
    projectId: string,
    datablockId: string
  ): Promise<Datablock> => {
    const response = await dataPlatformClient.post<Datablock>(
      `/projects/${projectId}/datablocks/${datablockId}/mark-deployed`
    );
    return normalizeDatablock(response.data);
  },
};

export default datablocksApi;

