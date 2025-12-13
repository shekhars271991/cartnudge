"""
Pydantic schemas for Event Pipeline API.

Event Pipelines define how events are ingested and structured.
Each pipeline is associated with a topic and contains multiple event type configurations,
where each event type has its own field definitions.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PipelineStatus(str, Enum):
    """Pipeline status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    CONFIGURING = "configuring"


class FieldType(str, Enum):
    """Supported field types."""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    ARRAY = "array"
    OBJECT = "object"


# -----------------------------------------------------------------------------
# Event Field Schema (nested in EventTypeConfig)
# -----------------------------------------------------------------------------

class EventFieldSchema(BaseModel):
    """Schema for an event field."""
    name: str = Field(..., min_length=1, max_length=255)
    type: FieldType
    required: bool = False
    description: Optional[str] = None


class EventFieldCreate(BaseModel):
    """Schema for creating an event field."""
    name: str = Field(..., min_length=1, max_length=255)
    type: FieldType = FieldType.STRING
    required: bool = False
    description: Optional[str] = None


# -----------------------------------------------------------------------------
# Event Type Config Schema (each event type has its own fields)
# -----------------------------------------------------------------------------

class EventTypeConfigBase(BaseModel):
    """Base schema for event type configuration."""
    event_type: str = Field(..., min_length=1, max_length=255, description="Event type identifier, e.g., 'cart.add'")
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    fields: List[EventFieldSchema] = []


class EventTypeConfigCreate(BaseModel):
    """Schema for creating an event type configuration."""
    event_type: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    fields: List[EventFieldCreate] = []


class EventTypeConfigUpdate(BaseModel):
    """Schema for updating an event type configuration."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    fields: Optional[List[EventFieldCreate]] = None


class EventTypeConfigResponse(EventTypeConfigBase):
    """Schema for event type config response."""
    pass


# -----------------------------------------------------------------------------
# Pipeline Schema
# -----------------------------------------------------------------------------

class PipelineBase(BaseModel):
    """Base schema for pipeline."""
    name: str = Field(..., min_length=1, max_length=255, description="Internal pipeline name")
    display_name: str = Field(..., min_length=1, max_length=255, description="Display name")
    description: Optional[str] = None
    topic_id: str = Field(..., min_length=1, max_length=100, description="Kafka topic ID from event_topics.json")


class PipelineCreate(PipelineBase):
    """Schema for creating a pipeline."""
    event_configs: List[EventTypeConfigCreate] = Field(
        default=[],
        description="Event type configurations, each with its own fields"
    )


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_configs: Optional[List[EventTypeConfigCreate]] = None


class PipelineResponse(BaseModel):
    """Schema for pipeline response."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    name: str
    display_name: str
    description: Optional[str] = None
    topic_id: str
    event_configs: List[EventTypeConfigResponse] = []
    is_active: bool = False
    events_count: int = 0
    last_event_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PipelineListResponse(BaseModel):
    """Schema for list of pipelines."""
    items: List[PipelineResponse]
    total: int


class PipelineActivateRequest(BaseModel):
    """Request to activate/deactivate a pipeline."""
    is_active: bool


# -----------------------------------------------------------------------------
# Integration Details
# -----------------------------------------------------------------------------

class IntegrationExample(BaseModel):
    """Example integration code."""
    event_type: str
    endpoint: str
    method: str = "POST"
    headers: dict
    example_payload: dict
    example_curl: str


class PipelineIntegrationResponse(BaseModel):
    """Integration details for a pipeline."""
    pipeline_id: str
    topic_id: str
    examples: List[IntegrationExample]
