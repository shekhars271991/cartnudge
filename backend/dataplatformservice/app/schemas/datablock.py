"""
Pydantic schemas for Datablock API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DataSourceType(str, Enum):
    """Data source types for datablocks."""
    EVENT = "event"
    CSV = "csv"
    API = "api"
    HYBRID = "hybrid"


class DatablockStatus(str, Enum):
    """Datablock status."""
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    READY_FOR_DEPLOYMENT = "ready_for_deployment"
    DEPLOYED = "deployed"
    ERROR = "error"


class FieldType(str, Enum):
    """Supported field types."""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    EMAIL = "email"
    ARRAY = "array"
    OBJECT = "object"


class IconType(str, Enum):
    """Icon types for datablocks."""
    USERS = "users"
    PACKAGE = "package"
    CART = "cart"
    CURSOR = "cursor"
    CREDIT_CARD = "credit-card"
    DATABASE = "database"


# -----------------------------------------------------------------------------
# Schema Field
# -----------------------------------------------------------------------------

class SchemaFieldBase(BaseModel):
    """Base schema for a datablock field."""
    name: str = Field(..., min_length=1, max_length=255)
    type: FieldType
    required: bool = False
    description: Optional[str] = None
    is_primary_key: bool = False


class SchemaFieldCreate(SchemaFieldBase):
    """Schema for creating a field."""
    pass


class SchemaFieldResponse(SchemaFieldBase):
    """Schema for field response."""
    id: str


# -----------------------------------------------------------------------------
# Datablock Schema
# -----------------------------------------------------------------------------

class DatablockBase(BaseModel):
    """Base schema for datablock."""
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: IconType = IconType.DATABASE
    source_type: DataSourceType


class DatablockCreate(DatablockBase):
    """Schema for creating a datablock."""
    schema_fields: List[SchemaFieldCreate] = []
    event_topic: Optional[str] = None
    api_endpoint: Optional[str] = None


class DatablockUpdate(BaseModel):
    """Schema for updating a datablock."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[IconType] = None
    source_type: Optional[DataSourceType] = None
    schema_fields: Optional[List[SchemaFieldCreate]] = None
    event_topic: Optional[str] = None
    api_endpoint: Optional[str] = None
    status: Optional[DatablockStatus] = None


class DatablockResponse(DatablockBase):
    """Schema for datablock response."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    status: DatablockStatus
    is_predefined: bool = False
    schema_fields: List[SchemaFieldResponse] = []
    record_count: int = 0
    last_sync: Optional[datetime] = None
    event_topic: Optional[str] = None
    api_endpoint: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DatablockListResponse(BaseModel):
    """Schema for list of datablocks."""
    items: List[DatablockResponse]
    total: int


# -----------------------------------------------------------------------------
# Predefined Datablock Template
# -----------------------------------------------------------------------------

class PredefinedDatablockTemplate(BaseModel):
    """Template for predefined datablocks."""
    template_id: str
    name: str
    display_name: str
    description: str
    icon: IconType
    source_type: DataSourceType
    default_schema: List[SchemaFieldCreate]
    event_topic: Optional[str] = None

