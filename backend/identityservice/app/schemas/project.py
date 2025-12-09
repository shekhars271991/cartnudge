"""
Pydantic schemas for Project API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    """Request schema for creating a project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    timezone: str = "UTC"


class ProjectUpdate(BaseModel):
    """Request schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict] = None


class MemberInProject(BaseModel):
    """Member info embedded in project response."""
    user_id: str
    email: str
    name: str
    role: str
    joined_at: datetime


class ProjectResponse(BaseModel):
    """Response schema for project."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    name: str
    slug: str
    description: Optional[str] = None
    timezone: str
    settings: Dict = {}
    is_active: bool
    created_by: str
    members: List[MemberInProject] = []
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Response schema for list of projects."""
    items: List[ProjectResponse]
    total: int
