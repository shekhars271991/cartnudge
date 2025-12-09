/**
 * Data Platform Service API
 * 
 * Exports for datablocks, pipelines, and features
 */

export { default as dataPlatformClient } from "./client";
export { datablocksApi } from "./datablocks";

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
  // Pipeline types
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
} from "./types";

