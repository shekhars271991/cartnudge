/**
 * Data Platform Service Types
 * Types for datablocks, pipelines, and features
 */

// ============================================================================
// Datablock Types
// ============================================================================

export type DataSourceType = "event" | "csv" | "api" | "hybrid";
// NOTE: This type should match the values in @/lib/constants/statuses.ts
// When adding new statuses, update both files
export type DatablockStatus = "not_configured" | "configured" | "ready_for_deployment" | "deployed" | "pending_update" | "deprecated" | "pending_deletion" | "discarded" | "error";
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

// Template category
export type TemplateCategory = "user_data" | "product_data" | "event_data" | "transaction_data" | "custom";
export type TemplateStatus = "active" | "deprecated" | "draft";

// Template returned from /datablocks/templates (now stored in MongoDB)
export interface DatablockTemplate {
  id: string;
  _id?: string;
  template_id: string;
  name: string;
  display_name: string;
  description: string;
  icon: IconType;
  source_type: DataSourceType;
  category: TemplateCategory;
  status: TemplateStatus;
  default_schema: SchemaField[];
  event_topic?: string | null;
  tags: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface DatablockTemplateListResponse {
  items: DatablockTemplate[];
  total: number;
}

// Datablock from project (user-created instances)
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
  from_template: boolean;  // Whether this was created from a template
  template_id?: string | null;  // ID of the template (if from_template is true)
  schema_fields: SchemaField[];
  record_count: number;
  last_sync?: string | null;
  event_topic?: string | null;
  api_endpoint?: string | null;
  deployment_id?: number | null;
  deployed_at?: string | null;
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

// Integration details for sending events to a datablock
export interface IntegrationDetails {
  datablock_name: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  example_payload: {
    event_type: string;
    user_id: string;
    session_id?: string;
    data: Record<string, unknown>;
  };
  example_curl: string;
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

// ============================================================================
// Deployment Types
// ============================================================================

export type ComponentType = "datablock" | "pipeline" | "feature";
export type ChangeType = "create" | "update" | "delete";
export type DeploymentItemStatus = "pending" | "deploying" | "deployed" | "failed" | "conflict";
export type DeploymentBucketStatus = "active" | "deploying" | "deployed" | "discarded" | "conflict";
export type DeploymentStatusType = "success" | "partial" | "failed" | "rolled_back";

export interface DeploymentItem {
  id: string;
  _id?: string;
  component_type: ComponentType;
  component_id: string;
  component_name: string;
  change_type: ChangeType;
  change_summary?: string;
  previous_version?: number | null;
  payload?: Record<string, unknown>;
  status: DeploymentItemStatus;
  error_message?: string | null;
  deployed_at?: string | null;
  created_at: string;
}

export interface DeploymentItemCreate {
  component_type: ComponentType;
  component_id: string;
  component_name: string;
  change_type: ChangeType;
  change_summary?: string;
  previous_version?: number;
  payload?: Record<string, unknown>;
}

export interface DeploymentBucket {
  id: string;
  _id?: string;
  project_id: string;
  user_id: string;
  name?: string | null;
  description?: string | null;
  status: DeploymentBucketStatus;
  items: DeploymentItem[];
  item_count: number;
  base_deployment_id?: number | null;
  has_conflicts: boolean;
  conflict_details?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DeploymentBucketCreate {
  name?: string;
  description?: string;
}

export interface DeploymentBucketListResponse {
  items: DeploymentBucket[];
  total: number;
  skip: number;
  limit: number;
}

export interface Deployment {
  id: string;
  _id?: string;
  deployment_id: number;
  project_id: string;
  user_id: string;
  bucket_id: string;
  status: DeploymentStatusType;
  items_total: number;
  items_succeeded: number;
  items_failed: number;
  deployed_datablocks: string[];
  deployed_pipelines: string[];
  deployed_features: string[];
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  errors: Array<{
    component_type?: string;
    component_id?: string;
    component_name?: string;
    message?: string;
  }>;
  created_at: string;
}

export interface DeploymentListResponse {
  items: Deployment[];
  total: number;
  skip: number;
  limit: number;
}

export interface ConflictCheckResponse {
  has_conflicts: boolean;
  current_deployment_id: number;
  bucket_base_deployment_id?: number | null;
  conflicts: Array<{
    type: string;
    component_type?: string;
    component_id?: string;
    component_name?: string;
    conflicting_deployment_id?: number;
    deployed_by?: string;
    deployed_at?: string;
    message?: string;
  }>;
  message: string;
}

export interface DeployRequest {
  dry_run?: boolean;
  force?: boolean;
}

export interface DeployResponse {
  success: boolean;
  deployment_id?: number | null;
  deployment?: Deployment | null;
  message: string;
  errors: Array<{
    component_type?: string;
    component_id?: string;
    component_name?: string;
    message?: string;
  }>;
}

