"""
Pydantic schemas for API Key API.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    """Request schema for creating an API key."""
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = ["ingest", "read_features"]
    expires_in_days: Optional[int] = None  # None = never expires


class ApiKeyResponse(BaseModel):
    """Response schema for API key (without the full key)."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    name: str
    key_prefix: str
    scopes: List[str]
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_by: str
    created_at: datetime


class ApiKeyCreatedResponse(BaseModel):
    """Response schema when creating an API key (includes full key)."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    name: str
    key: str  # Full key - only shown once!
    key_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime] = None
    created_at: datetime


class ApiKeyListResponse(BaseModel):
    """Response schema for list of API keys."""
    items: List[ApiKeyResponse]
    total: int
