"""
Pydantic schemas for Datablock API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

# Import centralized status definitions
from app.core.statuses import DatablockStatus


class DataSourceType(str, Enum):
    """Data source types for datablocks."""
    EVENT = "event"
    CSV = "csv"
    API = "api"
    HYBRID = "hybrid"


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
    from_template: bool = Field(False, description="Whether this datablock was created from a template")
    template_id: Optional[str] = Field(None, description="ID of the template this was created from (if from_template=True)")
    schema_fields: List[SchemaFieldResponse] = []
    record_count: int = 0
    last_sync: Optional[datetime] = None
    event_topic: Optional[str] = None
    api_endpoint: Optional[str] = None
    deployment_id: Optional[int] = Field(None, description="Deployment sequence number")
    deployed_at: Optional[datetime] = None
    deprecated_at: Optional[datetime] = None
    deprecated_by_deployment: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Handle both old "is_predefined" and new "from_template" field names
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to handle legacy field name."""
        if isinstance(obj, dict):
            # Convert is_predefined to from_template if present
            if "is_predefined" in obj and "from_template" not in obj:
                obj = obj.copy()
                obj["from_template"] = obj.pop("is_predefined")
        return super().model_validate(obj, **kwargs)


class DatablockListResponse(BaseModel):
    """Schema for list of datablocks."""
    items: List[DatablockResponse]
    total: int

