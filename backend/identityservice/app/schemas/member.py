"""
Pydantic schemas for Team Member API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Role(str, Enum):
    """Project roles."""
    OWNER = "owner"
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class MemberResponse(BaseModel):
    """Response schema for a team member."""
    user_id: str
    email: str
    name: str
    role: Role
    joined_at: datetime


class MemberInvite(BaseModel):
    """Request schema for inviting a member."""
    email: EmailStr
    role: Role = Role.DEVELOPER


class MemberRoleUpdate(BaseModel):
    """Request schema for updating member role."""
    role: Role


class InvitationResponse(BaseModel):
    """Response schema for invitation."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    project_name: Optional[str] = None
    email: str
    role: Role
    invited_by: str
    expires_at: datetime
    created_at: datetime
