"""
Pydantic schemas for Pipeline API.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class PipelineCategory(str, Enum):
    """Pipeline category types."""
    BEHAVIORAL = "behavioral"
    TRANSACTION = "transaction"
    CONTEXT = "context"
    MARKETING = "marketing"
    TRUST = "trust"
    REALTIME = "realtime"


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
    TIMESTAMP = "timestamp"
    OBJECT = "object"


# -----------------------------------------------------------------------------
# Event Field Schema (nested in Event)
# -----------------------------------------------------------------------------

class EventFieldSchema(BaseModel):
    """Schema for an event field."""
    name: str = Field(..., min_length=1, max_length=255)
    type: FieldType
    required: bool = False
    description: str | None = None


# -----------------------------------------------------------------------------
# Event Schema (nested in Pipeline)
# -----------------------------------------------------------------------------

class EventBase(BaseModel):
    """Base schema for pipeline event."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    enabled: bool = True
    fields: list[EventFieldSchema] = []


class EventCreate(EventBase):
    """Schema for creating an event."""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an event."""
    description: str | None = None
    enabled: bool | None = None
    fields: list[EventFieldSchema] | None = None


class EventResponse(EventBase):
    """Schema for event response."""
    pass


# -----------------------------------------------------------------------------
# Pipeline Schema
# -----------------------------------------------------------------------------

class PipelineBase(BaseModel):
    """Base schema for pipeline."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: PipelineCategory


class PipelineCreate(PipelineBase):
    """Schema for creating a pipeline."""
    events: list[EventCreate] = []


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: PipelineStatus | None = None


class PipelineResponse(PipelineBase):
    """Schema for pipeline response."""
    id: str = Field(..., alias="_id")
    project_id: str
    status: PipelineStatus
    events: list[EventResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class PipelineListResponse(BaseModel):
    """Schema for list of pipelines."""
    items: list[PipelineResponse]
    total: int


class WebhookInfo(BaseModel):
    """Webhook information for a pipeline."""
    url: str
    secret: str
