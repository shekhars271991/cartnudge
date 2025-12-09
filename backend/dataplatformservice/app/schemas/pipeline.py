"""
Pydantic schemas for Pipeline API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


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
    description: Optional[str] = None


# -----------------------------------------------------------------------------
# Event Schema (nested in Pipeline)
# -----------------------------------------------------------------------------

class EventBase(BaseModel):
    """Base schema for pipeline event."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    enabled: bool = True
    fields: List[EventFieldSchema] = []


class EventCreate(EventBase):
    """Schema for creating an event."""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an event."""
    description: Optional[str] = None
    enabled: Optional[bool] = None
    fields: Optional[List[EventFieldSchema]] = None


class EventResponse(EventBase):
    """Schema for event response."""
    pass


# -----------------------------------------------------------------------------
# Pipeline Schema
# -----------------------------------------------------------------------------

class PipelineBase(BaseModel):
    """Base schema for pipeline."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: PipelineCategory


class PipelineCreate(PipelineBase):
    """Schema for creating a pipeline."""
    events: List[EventCreate] = []


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[PipelineStatus] = None


class PipelineResponse(PipelineBase):
    """Schema for pipeline response."""
    model_config = ConfigDict(populate_by_name=True, by_alias=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    status: PipelineStatus
    events: List[EventResponse] = []
    created_at: datetime
    updated_at: datetime


class PipelineListResponse(BaseModel):
    """Schema for list of pipelines."""
    items: List[PipelineResponse]
    total: int


class WebhookInfo(BaseModel):
    """Webhook information for a pipeline."""
    url: str
    secret: str
