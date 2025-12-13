/**
 * Features API Client
 * 
 * API for retrieving user features from the feature store.
 * Features are organized into groups: cart, page, order, engagement, recency.
 * 
 * Uses Bearer token authentication (for logged-in users in the admin UI).
 */
import { dataPlatformClient } from "./client";
import type {
  FeatureGroupsResponse,
  SingleFeatureGroupResponse,
  FlattenedFeaturesResponse,
  FeatureSummary,
  FeatureGroupsList,
  FeatureGroupName,
} from "./types";

/**
 * Features API
 * 
 * These endpoints use Bearer token authentication (logged-in users).
 * The project_id is passed as a path parameter.
 */
export const featuresApi = {
  /**
   * List available feature groups
   */
  async listGroups(): Promise<FeatureGroupsList> {
    const response = await dataPlatformClient.get<FeatureGroupsList>("/features/groups");
    return response.data;
  },

  /**
   * Get all feature groups for a user
   */
  async getAllGroups(
    projectId: string,
    userId: string,
    groups?: FeatureGroupName[]
  ): Promise<FeatureGroupsResponse> {
    const params = new URLSearchParams();
    if (groups && groups.length > 0) {
      params.append("groups", groups.join(","));
    }
    const queryString = params.toString();
    const url = `/projects/${projectId}/features/user/${encodeURIComponent(userId)}/groups${queryString ? `?${queryString}` : ""}`;
    
    const response = await dataPlatformClient.get<FeatureGroupsResponse>(url);
    return response.data;
  },

  /**
   * Get a specific feature group for a user
   */
  async getGroup(
    projectId: string,
    userId: string,
    group: FeatureGroupName
  ): Promise<SingleFeatureGroupResponse> {
    const response = await dataPlatformClient.get<SingleFeatureGroupResponse>(
      `/projects/${projectId}/features/user/${encodeURIComponent(userId)}/groups/${group}`
    );
    return response.data;
  },

  /**
   * Get all features flattened into one dictionary
   */
  async getFlattened(
    projectId: string,
    userId: string,
    groups?: FeatureGroupName[]
  ): Promise<FlattenedFeaturesResponse> {
    const params = new URLSearchParams();
    if (groups && groups.length > 0) {
      params.append("groups", groups.join(","));
    }
    const queryString = params.toString();
    const url = `/projects/${projectId}/features/user/${encodeURIComponent(userId)}/flat${queryString ? `?${queryString}` : ""}`;
    
    const response = await dataPlatformClient.get<FlattenedFeaturesResponse>(url);
    return response.data;
  },

  /**
   * Get feature summary for a user
   */
  async getSummary(projectId: string, userId: string): Promise<FeatureSummary> {
    const response = await dataPlatformClient.get<FeatureSummary>(
      `/projects/${projectId}/features/user/${encodeURIComponent(userId)}/summary`
    );
    return response.data;
  },
};

