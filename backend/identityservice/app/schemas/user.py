"""
Pydantic schemas for User API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    """Response schema for user."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    email: EmailStr
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    """Request schema for updating user profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class PasswordChange(BaseModel):
    """Request schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
