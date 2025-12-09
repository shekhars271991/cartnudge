/**
 * Data Platform Service Types
 * Types for datablocks, pipelines, and features
 */

// ============================================================================
// Datablock Types
// ============================================================================

export type DataSourceType = "event" | "csv" | "api" | "hybrid";
export type DatablockStatus = "not_configured" | "configured" | "ready_for_deployment" | "deployed" | "error";
export type FieldType = "string" | "number" | "boolean" | "date" | "email" | "array" | "object";
export type IconType = "users" | "package" | "cart" | "cursor" | "credit-card" | "database";

export interface SchemaField {
  id?: string;
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  is_primary_key: boolean;
}

export interface SchemaFieldCreate {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  is_primary_key: boolean;
}

// Template returned from /datablocks/templates
export interface DatablockTemplate {
  template_id: string;
  name: string;
  display_name: string;
  description: string;
  icon: IconType;
  source_type: DataSourceType;
  default_schema: SchemaField[];
  event_topic?: string | null;
}

// Datablock from project
export interface Datablock {
  id: string;
  _id?: string;
  project_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  icon: IconType;
  source_type: DataSourceType;
  status: DatablockStatus;
  is_predefined: boolean;
  template_id?: string;
  schema_fields: SchemaField[];
  record_count: number;
  last_sync?: string | null;
  event_topic?: string | null;
  api_endpoint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatablockCreate {
  name: string;
  display_name: string;
  description?: string;
  icon?: IconType;
  source_type: DataSourceType;
  schema_fields?: SchemaFieldCreate[];
  event_topic?: string;
  api_endpoint?: string;
}

export interface DatablockUpdate {
  display_name?: string;
  description?: string;
  icon?: IconType;
  source_type?: DataSourceType;
  schema_fields?: SchemaFieldCreate[];
  event_topic?: string;
  api_endpoint?: string;
  status?: DatablockStatus;
}

export interface DatablockListResponse {
  items: Datablock[];
  total: number;
}

// ============================================================================
// Pipeline Types (for future use)
// ============================================================================

export interface Pipeline {
  id: string;
  _id?: string;
  project_id: string;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  events: PipelineEvent[];
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineEvent {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
}

export interface PipelineCreate {
  name: string;
  description?: string;
  category: string;
  events?: PipelineEvent[];
}

export interface PipelineUpdate {
  name?: string;
  description?: string;
  category?: string;
}

export interface PipelineListResponse {
  items: Pipeline[];
  total: number;
}

// ============================================================================
// Feature Types (for future use)
// ============================================================================

export type AggregationType = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "DISTINCT_COUNT" | "LAST";

export interface Feature {
  id: string;
  _id?: string;
  project_id: string;
  pipeline_id: string;
  name: string;
  description?: string;
  source_event: string;
  aggregation: AggregationType;
  field?: string;
  filter_expression?: string;
  time_windows: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureCreate {
  pipeline_id: string;
  name: string;
  description?: string;
  source_event: string;
  aggregation: AggregationType;
  field?: string;
  filter_expression?: string;
  time_windows: string[];
}

export interface FeatureUpdate {
  name?: string;
  description?: string;
  source_event?: string;
  aggregation?: AggregationType;
  field?: string;
  filter_expression?: string;
  time_windows?: string[];
}

export interface FeatureListResponse {
  items: Feature[];
  total: number;
}

