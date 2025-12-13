/**
 * Data Platform Service API
 * 
 * Exports for datablocks, pipelines, features, and deployments
 */

export { default as dataPlatformClient } from "./client";
export { datablocksApi } from "./datablocks";
export { deploymentsApi } from "./deployments";
export { pipelinesApi } from "./pipelines";

// Export types
export type {
  // Datablock types
  DataSourceType,
  DatablockStatus,
  FieldType,
  IconType,
  SchemaField,
  SchemaFieldCreate,
  DatablockTemplate,
  Datablock,
  DatablockCreate,
  DatablockUpdate,
  DatablockListResponse,
  // Event Pipeline types
  EventTopic,
  EventTopicsConfig,
  EventField,
  EventTypeConfig,
  EventPipeline,
  EventPipelineCreate,
  EventPipelineUpdate,
  EventPipelineListResponse,
  // Legacy Pipeline types (for backwards compatibility)
  Pipeline,
  PipelineEvent,
  PipelineCreate,
  PipelineUpdate,
  PipelineListResponse,
  // Feature types
  AggregationType,
  Feature,
  FeatureCreate,
  FeatureUpdate,
  FeatureListResponse,
  // Deployment types
  ComponentType,
  ChangeType,
  DeploymentItemStatus,
  DeploymentBucketStatus,
  DeploymentStatusType,
  DeploymentItem,
  DeploymentItemCreate,
  DeploymentBucket,
  DeploymentBucketCreate,
  DeploymentBucketListResponse,
  Deployment,
  DeploymentListResponse,
  ConflictCheckResponse,
  DeployRequest,
  DeployResponse,
} from "./types";

