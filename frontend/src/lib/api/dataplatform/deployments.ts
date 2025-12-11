/**
 * Deployment API
 * Manages deployment buckets, items, and deployment execution
 */

import apiClient from "./client";
import type {
  DeploymentBucket,
  DeploymentBucketCreate,
  DeploymentBucketListResponse,
  DeploymentBucketStatus,
  DeploymentItem,
  DeploymentItemCreate,
  Deployment,
  DeploymentListResponse,
  ConflictCheckResponse,
  DeployRequest,
  DeployResponse,
} from "./types";

// ============================================================================
// Bucket Management
// ============================================================================

/**
 * Get or create active deployment bucket for the current user
 */
export async function getOrCreateActiveBucket(
  projectId: string,
  data?: DeploymentBucketCreate
): Promise<DeploymentBucket> {
  const response = await apiClient.post<DeploymentBucket>(
    `/projects/${projectId}/deployment-buckets`,
    data || {}
  );
  return normalizeId(response.data);
}

/**
 * List deployment buckets for a project
 */
export async function listBuckets(
  projectId: string,
  options?: {
    status?: DeploymentBucketStatus;
    allUsers?: boolean;
    skip?: number;
    limit?: number;
  }
): Promise<DeploymentBucketListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.allUsers) params.append("all_users", "true");
  if (options?.skip) params.append("skip", String(options.skip));
  if (options?.limit) params.append("limit", String(options.limit));
  
  const response = await apiClient.get<DeploymentBucketListResponse>(
    `/projects/${projectId}/deployment-buckets?${params.toString()}`
  );
  
  return {
    ...response.data,
    items: response.data.items.map(normalizeId),
  };
}

/**
 * Get active deployment bucket
 */
export async function getActiveBucket(projectId: string): Promise<DeploymentBucket | null> {
  try {
    const response = await apiClient.get<DeploymentBucket>(
      `/projects/${projectId}/deployment-buckets/active`
    );
    return normalizeId(response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get deployment bucket by ID
 */
export async function getBucket(
  projectId: string,
  bucketId: string
): Promise<DeploymentBucket> {
  const response = await apiClient.get<DeploymentBucket>(
    `/projects/${projectId}/deployment-buckets/${bucketId}`
  );
  return normalizeId(response.data);
}

/**
 * Discard a deployment bucket
 */
export async function discardBucket(
  projectId: string,
  bucketId: string
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/deployment-buckets/${bucketId}`);
}

// ============================================================================
// Item Management
// ============================================================================

/**
 * Add an item to the deployment bucket
 */
export async function addItemToBucket(
  projectId: string,
  bucketId: string,
  item: DeploymentItemCreate
): Promise<DeploymentItem> {
  const response = await apiClient.post<DeploymentItem>(
    `/projects/${projectId}/deployment-buckets/${bucketId}/items`,
    item
  );
  return normalizeItemId(response.data);
}

/**
 * Remove an item from the deployment bucket
 */
export async function removeItemFromBucket(
  projectId: string,
  bucketId: string,
  itemId: string
): Promise<void> {
  await apiClient.delete(
    `/projects/${projectId}/deployment-buckets/${bucketId}/items/${itemId}`
  );
}

// ============================================================================
// Conflict Check & Deployment
// ============================================================================

/**
 * Check for deployment conflicts
 */
export async function checkConflicts(
  projectId: string,
  bucketId: string
): Promise<ConflictCheckResponse> {
  const response = await apiClient.post<ConflictCheckResponse>(
    `/projects/${projectId}/deployment-buckets/${bucketId}/check-conflicts`
  );
  return response.data;
}

/**
 * Execute deployment
 */
export async function deploy(
  projectId: string,
  bucketId: string,
  options?: DeployRequest
): Promise<DeployResponse> {
  const response = await apiClient.post<DeployResponse>(
    `/projects/${projectId}/deployment-buckets/${bucketId}/deploy`,
    options || {}
  );
  return response.data;
}

// ============================================================================
// Deployment History
// ============================================================================

/**
 * List deployment history
 */
export async function listDeployments(
  projectId: string,
  options?: { skip?: number; limit?: number }
): Promise<DeploymentListResponse> {
  const params = new URLSearchParams();
  if (options?.skip) params.append("skip", String(options.skip));
  if (options?.limit) params.append("limit", String(options.limit));
  
  const response = await apiClient.get<DeploymentListResponse>(
    `/projects/${projectId}/deployments?${params.toString()}`
  );
  
  return {
    ...response.data,
    items: response.data.items.map(normalizeDeploymentId),
  };
}

/**
 * Get current deployment ID
 */
export async function getCurrentDeploymentId(
  projectId: string
): Promise<number> {
  const response = await apiClient.get<{ current_deployment_id: number }>(
    `/projects/${projectId}/deployments/current`
  );
  return response.data.current_deployment_id;
}

/**
 * Get deployment details
 */
export async function getDeployment(
  projectId: string,
  deploymentId: number
): Promise<Deployment> {
  const response = await apiClient.get<Deployment>(
    `/projects/${projectId}/deployments/${deploymentId}`
  );
  return normalizeDeploymentId(response.data);
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeId<T extends { id?: string; _id?: string }>(item: T): T & { id: string } {
  const result = {
    ...item,
    id: item.id || item._id || "",
  };
  
  // Normalize items array if present
  if ("items" in result && Array.isArray((result as DeploymentBucket).items)) {
    (result as DeploymentBucket).items = (result as DeploymentBucket).items.map(normalizeItemId);
  }
  
  return result as T & { id: string };
}

function normalizeItemId<T extends { id?: string; _id?: string }>(item: T): T & { id: string } {
  return {
    ...item,
    id: item.id || item._id || "",
  };
}

function normalizeDeploymentId<T extends { id?: string; _id?: string }>(item: T): T & { id: string } {
  return {
    ...item,
    id: item.id || item._id || "",
  };
}

// Export as object for easier importing
export const deploymentsApi = {
  // Bucket management
  getOrCreateActiveBucket,
  listBuckets,
  getActiveBucket,
  getBucket,
  discardBucket,
  // Item management
  addItemToBucket,
  removeItemFromBucket,
  // Deployment
  checkConflicts,
  deploy,
  // History
  listDeployments,
  getCurrentDeploymentId,
  getDeployment,
};

