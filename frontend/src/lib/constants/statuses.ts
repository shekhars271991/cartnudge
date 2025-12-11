/**
 * Centralized status definitions for all components.
 * 
 * This file mirrors the backend status definitions and is the single source
 * of truth for all statuses used in the frontend.
 * 
 * Keep in sync with: backend/dataplatformservice/app/core/statuses.py
 */

// =============================================================================
// DATABLOCK STATUSES
// =============================================================================

export const DatablockStatus = {
  NOT_CONFIGURED: "not_configured",
  CONFIGURED: "configured",
  READY_FOR_DEPLOYMENT: "ready_for_deployment",
  DEPLOYED: "deployed",
  PENDING_UPDATE: "pending_update",
  PENDING_DELETION: "pending_deletion",
  DEPRECATED: "deprecated",
  DISCARDED: "discarded",
  ERROR: "error",
} as const;

export type DatablockStatusType = typeof DatablockStatus[keyof typeof DatablockStatus];

// Statuses that are visible in the UI (not hidden)
export const DATABLOCK_VISIBLE_STATUSES: DatablockStatusType[] = [
  DatablockStatus.NOT_CONFIGURED,
  DatablockStatus.CONFIGURED,
  DatablockStatus.READY_FOR_DEPLOYMENT,
  DatablockStatus.DEPLOYED,
  DatablockStatus.PENDING_UPDATE,
  DatablockStatus.PENDING_DELETION,
];

// Statuses that are hidden from UI
export const DATABLOCK_HIDDEN_STATUSES: DatablockStatusType[] = [
  DatablockStatus.DEPRECATED,
  DatablockStatus.DISCARDED,
  DatablockStatus.ERROR,
];

// Statuses that indicate item is in deployment bucket
export const DATABLOCK_IN_BUCKET_STATUSES: DatablockStatusType[] = [
  DatablockStatus.READY_FOR_DEPLOYMENT,
  DatablockStatus.PENDING_UPDATE,
  DatablockStatus.PENDING_DELETION,
];

// Statuses that can be edited
export const DATABLOCK_EDITABLE_STATUSES: DatablockStatusType[] = [
  DatablockStatus.NOT_CONFIGURED,
  DatablockStatus.CONFIGURED,
  DatablockStatus.DEPLOYED,
  DatablockStatus.PENDING_UPDATE,
];

// Active statuses (configuring, not yet deployed)
export const DATABLOCK_ACTIVE_STATUSES: DatablockStatusType[] = [
  DatablockStatus.NOT_CONFIGURED,
  DatablockStatus.CONFIGURED,
];


// =============================================================================
// DEPLOYMENT BUCKET STATUSES
// =============================================================================

export const DeploymentBucketStatus = {
  ACTIVE: "active",
  DEPLOYING: "deploying",
  DEPLOYED: "deployed",
  CONFLICT: "conflict",
  DISCARDED: "discarded",
} as const;

export type DeploymentBucketStatusType = typeof DeploymentBucketStatus[keyof typeof DeploymentBucketStatus];


// =============================================================================
// DEPLOYMENT STATUSES
// =============================================================================

export const DeploymentStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  SUCCESS: "success",
  PARTIAL_SUCCESS: "partial_success",
  FAILED: "failed",
  ROLLED_BACK: "rolled_back",
} as const;

export type DeploymentStatusType = typeof DeploymentStatus[keyof typeof DeploymentStatus];


// =============================================================================
// CHANGE TYPES
// =============================================================================

export const ChangeType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type ChangeTypeValue = typeof ChangeType[keyof typeof ChangeType];


// =============================================================================
// COMPONENT TYPES
// =============================================================================

export const ComponentType = {
  DATABLOCK: "datablock",
  PIPELINE: "pipeline",
  FEATURE: "feature",
} as const;

export type ComponentTypeValue = typeof ComponentType[keyof typeof ComponentType];


// =============================================================================
// PIPELINE STATUSES
// =============================================================================

export const PipelineStatus = {
  DRAFT: "draft",
  CONFIGURED: "configured",
  READY_FOR_DEPLOYMENT: "ready_for_deployment",
  DEPLOYED: "deployed",
  PENDING_UPDATE: "pending_update",
  PENDING_DELETION: "pending_deletion",
  DEPRECATED: "deprecated",
  DISCARDED: "discarded",
  ERROR: "error",
} as const;

export type PipelineStatusType = typeof PipelineStatus[keyof typeof PipelineStatus];


// =============================================================================
// FEATURE STATUSES
// =============================================================================

export const FeatureStatus = {
  DRAFT: "draft",
  CONFIGURED: "configured",
  READY_FOR_DEPLOYMENT: "ready_for_deployment",
  DEPLOYED: "deployed",
  PENDING_UPDATE: "pending_update",
  PENDING_DELETION: "pending_deletion",
  DEPRECATED: "deprecated",
  DISCARDED: "discarded",
  ERROR: "error",
} as const;

export type FeatureStatusType = typeof FeatureStatus[keyof typeof FeatureStatus];


// =============================================================================
// STATUS DISPLAY CONFIG (for UI rendering)
// =============================================================================

export interface StatusDisplayConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export const STATUS_DISPLAY_CONFIG: Record<string, StatusDisplayConfig> = {
  // Datablock statuses
  [DatablockStatus.NOT_CONFIGURED]: {
    label: "Not Configured",
    color: "slate",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
    description: "Initial state, needs configuration",
  },
  [DatablockStatus.CONFIGURED]: {
    label: "Configured",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    description: "Configured and ready to be added to deployment",
  },
  [DatablockStatus.READY_FOR_DEPLOYMENT]: {
    label: "Ready for Deployment",
    color: "amber",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    description: "In deployment bucket, waiting to be deployed",
  },
  [DatablockStatus.DEPLOYED]: {
    label: "Deployed",
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    description: "Successfully deployed and active",
  },
  [DatablockStatus.PENDING_UPDATE]: {
    label: "Pending Update",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    description: "Has pending schema changes in deployment bucket",
  },
  [DatablockStatus.PENDING_DELETION]: {
    label: "Pending Deletion",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    description: "Marked for deletion, waiting for deployment",
  },
  [DatablockStatus.DEPRECATED]: {
    label: "Deprecated",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    description: "Replaced by a newer version",
  },
  [DatablockStatus.DISCARDED]: {
    label: "Discarded",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    description: "Discarded before deployment",
  },
  [DatablockStatus.ERROR]: {
    label: "Error",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    description: "Error state",
  },
  
  // Deployment bucket statuses
  [DeploymentBucketStatus.ACTIVE]: {
    label: "Active",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    description: "Active deployment bucket",
  },
  [DeploymentBucketStatus.DEPLOYING]: {
    label: "Deploying",
    color: "amber",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    description: "Deployment in progress",
  },
  [DeploymentBucketStatus.DEPLOYED]: {
    label: "Deployed",
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    description: "Successfully deployed",
  },
  [DeploymentBucketStatus.CONFLICT]: {
    label: "Conflict",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    description: "Conflicts detected with other deployments",
  },
  [DeploymentBucketStatus.DISCARDED]: {
    label: "Discarded",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    description: "Bucket was discarded",
  },
  
  // Deployment execution statuses
  [DeploymentStatus.PENDING]: {
    label: "Pending",
    color: "slate",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
    description: "Waiting to start",
  },
  [DeploymentStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "amber",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    description: "Currently executing",
  },
  [DeploymentStatus.SUCCESS]: {
    label: "Success",
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    description: "Completed successfully",
  },
  [DeploymentStatus.PARTIAL_SUCCESS]: {
    label: "Partial Success",
    color: "amber",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    description: "Some items failed",
  },
  [DeploymentStatus.FAILED]: {
    label: "Failed",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    description: "Deployment failed",
  },
  [DeploymentStatus.ROLLED_BACK]: {
    label: "Rolled Back",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    description: "Changes were rolled back",
  },
};


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the display configuration for a status
 */
export function getStatusConfig(status: string): StatusDisplayConfig {
  return STATUS_DISPLAY_CONFIG[status] || {
    label: status,
    color: "slate",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
    description: "Unknown status",
  };
}

/**
 * Check if a datablock status is visible in the UI
 */
export function isDatablockVisible(status: string): boolean {
  return DATABLOCK_VISIBLE_STATUSES.includes(status as DatablockStatusType);
}

/**
 * Check if a datablock is in the deployment bucket
 */
export function isDatablockInBucket(status: string): boolean {
  return DATABLOCK_IN_BUCKET_STATUSES.includes(status as DatablockStatusType);
}

/**
 * Check if a datablock can be edited
 */
export function isDatablockEditable(status: string): boolean {
  return DATABLOCK_EDITABLE_STATUSES.includes(status as DatablockStatusType);
}

/**
 * Check if a datablock is in active/configuring state
 */
export function isDatablockActive(status: string): boolean {
  return DATABLOCK_ACTIVE_STATUSES.includes(status as DatablockStatusType);
}

