"""
Pydantic schemas for Datablock Templates.

Templates are predefined datablock schemas that users can use to quickly create datablocks.
They are stored separately from actual datablocks.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.datablock import DataSourceType, FieldType, IconType, SchemaFieldCreate


class TemplateCategory(str, Enum):
    """Categories for organizing templates."""
    USER_DATA = "user_data"
    PRODUCT_DATA = "product_data"
    EVENT_DATA = "event_data"
    TRANSACTION_DATA = "transaction_data"
    CUSTOM = "custom"


class TemplateStatus(str, Enum):
    """Template status."""
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    DRAFT = "draft"


# -----------------------------------------------------------------------------
# Template Schema Field
# -----------------------------------------------------------------------------

class TemplateSchemaField(BaseModel):
    """Schema field definition for a template."""
    name: str = Field(..., min_length=1, max_length=255)
    type: FieldType
    required: bool = False
    description: Optional[str] = None
    is_primary_key: bool = False


# -----------------------------------------------------------------------------
# Template CRUD Schemas
# -----------------------------------------------------------------------------

class DatablockTemplateCreate(BaseModel):
    """Schema for creating a new template."""
    template_id: str = Field(..., min_length=1, max_length=100, description="Unique identifier for the template")
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: str
    icon: IconType = IconType.DATABASE
    source_type: DataSourceType
    category: TemplateCategory = TemplateCategory.CUSTOM
    default_schema: List[TemplateSchemaField] = []
    event_topic: Optional[str] = None
    tags: List[str] = []


class DatablockTemplateUpdate(BaseModel):
    """Schema for updating a template."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[IconType] = None
    source_type: Optional[DataSourceType] = None
    category: Optional[TemplateCategory] = None
    default_schema: Optional[List[TemplateSchemaField]] = None
    event_topic: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[TemplateStatus] = None


class DatablockTemplateResponse(BaseModel):
    """Schema for template response."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str = Field(..., alias="_id")
    template_id: str
    name: str
    display_name: str
    description: str
    icon: IconType
    source_type: DataSourceType
    category: TemplateCategory
    status: TemplateStatus
    default_schema: List[TemplateSchemaField]
    event_topic: Optional[str] = None
    tags: List[str] = []
    usage_count: int = 0  # How many datablocks were created from this template
    created_at: datetime
    updated_at: datetime


class DatablockTemplateListResponse(BaseModel):
    """Schema for listing templates."""
    items: List[DatablockTemplateResponse]
    total: int

