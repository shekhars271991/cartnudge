/**
 * Event Pipeline API Functions
 * 
 * Uses Bearer token authentication (from login).
 * Project ID is passed in the URL path.
 */

import dataPlatformClient from "./client";
import type {
  EventPipeline,
  EventPipelineCreate,
  EventPipelineUpdate,
  EventPipelineListResponse,
  EventTypeConfig,
} from "./types";

// Integration example type (matches backend)
interface IntegrationExample {
  event_type: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  example_payload: Record<string, unknown>;
  example_curl: string;
}

interface PipelineIntegrationResponse {
  pipeline_id: string;
  topic_id: string;
  examples: IntegrationExample[];
}

// Helper to normalize pipeline (handle _id vs id)
const normalizePipeline = (pipeline: EventPipeline): EventPipeline => {
  return {
    ...pipeline,
    id: pipeline.id || pipeline._id || "",
  };
};

export const pipelinesApi = {
  /**
   * List all pipelines for a project
   */
  list: async (
    projectId: string,
    skip = 0,
    limit = 100
  ): Promise<EventPipelineListResponse> => {
    const response = await dataPlatformClient.get<EventPipelineListResponse>(
      `/projects/${projectId}/pipelines`,
      { params: { skip, limit } }
    );
    return {
      items: response.data.items.map(normalizePipeline),
      total: response.data.total,
    };
  },

  /**
   * Get a single pipeline by ID
   */
  get: async (projectId: string, pipelineId: string): Promise<EventPipeline> => {
    const response = await dataPlatformClient.get<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}`
    );
    return normalizePipeline(response.data);
  },

  /**
   * Create a new pipeline
   */
  create: async (
    projectId: string,
    data: EventPipelineCreate
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.post<EventPipeline>(
      `/projects/${projectId}/pipelines`,
      data
    );
    return normalizePipeline(response.data);
  },

  /**
   * Update a pipeline
   */
  update: async (
    projectId: string,
    pipelineId: string,
    data: EventPipelineUpdate
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.put<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}`,
      data
    );
    return normalizePipeline(response.data);
  },

  /**
   * Delete a pipeline
   */
  delete: async (projectId: string, pipelineId: string): Promise<void> => {
    await dataPlatformClient.delete(
      `/projects/${projectId}/pipelines/${pipelineId}`
    );
  },

  /**
   * Activate a pipeline
   */
  activate: async (
    projectId: string,
    pipelineId: string
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.post<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/activate`
    );
    return normalizePipeline(response.data);
  },

  /**
   * Deactivate a pipeline
   */
  deactivate: async (
    projectId: string,
    pipelineId: string
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.post<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/deactivate`
    );
    return normalizePipeline(response.data);
  },

  /**
   * Set pipeline active status
   */
  setStatus: async (
    projectId: string,
    pipelineId: string,
    isActive: boolean
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.put<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/status`,
      { is_active: isActive }
    );
    return normalizePipeline(response.data);
  },

  /**
   * Add an event type configuration to a pipeline
   */
  addEventConfig: async (
    projectId: string,
    pipelineId: string,
    config: EventTypeConfig
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.post<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/event-configs`,
      config
    );
    return normalizePipeline(response.data);
  },

  /**
   * Update an event type configuration
   */
  updateEventConfig: async (
    projectId: string,
    pipelineId: string,
    eventType: string,
    config: Partial<EventTypeConfig>
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.put<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/event-configs/${encodeURIComponent(eventType)}`,
      config
    );
    return normalizePipeline(response.data);
  },

  /**
   * Delete an event type configuration
   */
  deleteEventConfig: async (
    projectId: string,
    pipelineId: string,
    eventType: string
  ): Promise<EventPipeline> => {
    const response = await dataPlatformClient.delete<EventPipeline>(
      `/projects/${projectId}/pipelines/${pipelineId}/event-configs/${encodeURIComponent(eventType)}`
    );
    return normalizePipeline(response.data);
  },

  /**
   * Get integration details for a pipeline
   */
  getIntegration: async (
    projectId: string,
    pipelineId: string
  ): Promise<PipelineIntegrationResponse> => {
    const response = await dataPlatformClient.get<PipelineIntegrationResponse>(
      `/projects/${projectId}/pipelines/${pipelineId}/integration`
    );
    return response.data;
  },
};

export default pipelinesApi;
