"""
Deployment schemas - Pydantic models for deployment orchestration.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

# Import centralized status definitions
from app.core.statuses import (
    ComponentType,
    ChangeType,
    DeploymentBucketStatus,
    DeploymentStatus,
)


class DeploymentItemStatus(str, Enum):
    """Status of an item in the deployment bucket."""
    PENDING = "pending"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    FAILED = "failed"
    CONFLICT = "conflict"


# =============================================================================
# Deployment Item (individual change in a bucket)
# =============================================================================

class DeploymentItemBase(BaseModel):
    """Base schema for deployment item."""
    component_type: ComponentType
    component_id: str = Field(..., description="ID of the component being changed")
    component_name: str = Field(..., description="Display name for UI")
    change_type: ChangeType
    change_summary: Optional[str] = Field(None, description="Human-readable summary of changes")
    previous_version: Optional[int] = Field(None, description="Version before this change")
    payload: Optional[Dict[str, Any]] = Field(None, description="Snapshot of component data")


class DeploymentItemCreate(DeploymentItemBase):
    """Schema for adding an item to deployment bucket."""
    pass


class DeploymentItemResponse(DeploymentItemBase):
    """Schema for deployment item response."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str = Field(..., alias="_id")
    status: DeploymentItemStatus = DeploymentItemStatus.PENDING
    error_message: Optional[str] = None
    deployed_at: Optional[datetime] = None
    created_at: datetime


# =============================================================================
# Deployment Bucket (collection of pending changes for a user)
# =============================================================================

class DeploymentBucketCreate(BaseModel):
    """Schema for creating a new deployment bucket."""
    name: Optional[str] = Field(None, description="Optional name for the bucket")
    description: Optional[str] = Field(None, description="Optional description")


class DeploymentBucketResponse(BaseModel):
    """Schema for deployment bucket response."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    user_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    status: DeploymentBucketStatus
    items: List[DeploymentItemResponse] = []
    item_count: int = 0
    base_deployment_id: Optional[int] = Field(
        None, 
        description="The deployment ID this bucket was created from (for conflict detection)"
    )
    has_conflicts: bool = False
    conflict_details: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime


class DeploymentBucketListResponse(BaseModel):
    """Schema for listing deployment buckets."""
    items: List[DeploymentBucketResponse]
    total: int
    skip: int
    limit: int


# =============================================================================
# Deployment (completed deployment record)
# =============================================================================

class DeploymentResponse(BaseModel):
    """Schema for completed deployment response."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str = Field(..., alias="_id")
    deployment_id: int = Field(..., description="Incremental deployment sequence number")
    project_id: str
    user_id: str
    bucket_id: str
    status: DeploymentStatus
    
    # Deployment details
    items_total: int = 0
    items_succeeded: int = 0
    items_failed: int = 0
    
    # Component breakdown
    deployed_datablocks: List[str] = []
    deployed_pipelines: List[str] = []
    deployed_features: List[str] = []
    
    # Timing
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    
    # Error tracking
    errors: List[Dict[str, Any]] = []
    
    created_at: datetime


class DeploymentListResponse(BaseModel):
    """Schema for listing deployments."""
    items: List[DeploymentResponse]
    total: int
    skip: int
    limit: int


# =============================================================================
# Conflict Check
# =============================================================================

class ConflictCheckResponse(BaseModel):
    """Response for conflict check."""
    has_conflicts: bool
    current_deployment_id: int
    bucket_base_deployment_id: Optional[int]
    conflicts: List[Dict[str, Any]] = []
    message: str


# =============================================================================
# Deploy Request/Response
# =============================================================================

class DeployRequest(BaseModel):
    """Request to execute deployment."""
    force: bool = Field(
        False, 
        description="Force deployment even with warnings (not conflicts)"
    )
    dry_run: bool = Field(
        False, 
        description="Simulate deployment without making changes"
    )


class DeployResponse(BaseModel):
    """Response after deployment execution."""
    success: bool
    deployment_id: Optional[int] = None
    deployment: Optional[DeploymentResponse] = None
    message: str
    errors: List[Dict[str, Any]] = []

