/**
 * API module - exports all API functions and types
 */

// Re-export everything from identity service
export * from "./types";
export { apiClient, tokenManager } from "./client";
export { authApi } from "./auth";
export { usersApi } from "./users";
export { projectsApi } from "./projects";
export { membersApi } from "./members";
export { apiKeysApi } from "./apiKeys";

// Re-export data platform service APIs
export * from "./dataplatform";

// Default export with all APIs
import { authApi } from "./auth";
import { usersApi } from "./users";
import { projectsApi } from "./projects";
import { membersApi } from "./members";
import { apiKeysApi } from "./apiKeys";
import { datablocksApi } from "./dataplatform";

const api = {
  auth: authApi,
  users: usersApi,
  projects: projectsApi,
  members: membersApi,
  apiKeys: apiKeysApi,
  datablocks: datablocksApi,
};

export default api;

