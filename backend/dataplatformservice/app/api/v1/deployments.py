"""
Deployment API endpoints - orchestrates deployments with version control.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import Database, RequireRead, RequireCreate, RequireDeploy
from app.schemas.deployment import (
    ConflictCheckResponse,
    DeploymentBucketCreate,
    DeploymentBucketListResponse,
    DeploymentBucketResponse,
    DeploymentBucketStatus,
    DeploymentItemCreate,
    DeploymentItemResponse,
    DeploymentListResponse,
    DeploymentResponse,
    DeployRequest,
    DeployResponse,
)
from app.services.deployment_service import DeploymentService

router = APIRouter()


# =============================================================================
# Deployment Bucket Endpoints
# =============================================================================

@router.get(
    "/projects/{project_id}/deployment-buckets",
    response_model=DeploymentBucketListResponse,
    summary="List deployment buckets",
    description="List all deployment buckets for the current user in a project.",
)
async def list_deployment_buckets(
    project_id: str,
    user: RequireRead,
    db: Database,
    status: Optional[DeploymentBucketStatus] = Query(None, description="Filter by status"),
    all_users: bool = Query(False, description="Show buckets from all users (requires admin)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List deployment buckets."""
    service = DeploymentService(db)
    
    # Only show user's own buckets unless admin requests all
    user_filter = None if all_users else user.user_id
    
    buckets, total = await service.list_buckets(
        project_id=project_id,
        user_id=user_filter,
        status=status,
        skip=skip,
        limit=limit,
    )
    
    return DeploymentBucketListResponse(
        items=[DeploymentBucketResponse(**b) for b in buckets],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/projects/{project_id}/deployment-buckets",
    response_model=DeploymentBucketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or get active deployment bucket",
    description="Get the user's active deployment bucket, or create a new one if none exists.",
)
async def create_deployment_bucket(
    project_id: str,
    user: RequireCreate,
    db: Database,
    data: Optional[DeploymentBucketCreate] = None,
):
    """Create or get active deployment bucket."""
    service = DeploymentService(db)
    
    bucket = await service.get_or_create_active_bucket(
        project_id=project_id,
        user_id=user.user_id,
        data=data,
    )
    
    return DeploymentBucketResponse(**bucket)


@router.get(
    "/projects/{project_id}/deployment-buckets/active",
    response_model=DeploymentBucketResponse,
    summary="Get active deployment bucket",
    description="Get the user's currently active deployment bucket.",
)
async def get_active_deployment_bucket(
    project_id: str,
    user: RequireRead,
    db: Database,
):
    """Get active deployment bucket."""
    service = DeploymentService(db)
    
    buckets, _ = await service.list_buckets(
        project_id=project_id,
        user_id=user.user_id,
        status=DeploymentBucketStatus.ACTIVE,
        limit=1,
    )
    
    if not buckets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active deployment bucket found",
        )
    
    return DeploymentBucketResponse(**buckets[0])


@router.get(
    "/projects/{project_id}/deployment-buckets/{bucket_id}",
    response_model=DeploymentBucketResponse,
    summary="Get deployment bucket",
    description="Get a specific deployment bucket by ID.",
)
async def get_deployment_bucket(
    project_id: str,
    bucket_id: str,
    user: RequireRead,
    db: Database,
):
    """Get deployment bucket details."""
    service = DeploymentService(db)
    
    bucket = await service.get_bucket(bucket_id, project_id, user.user_id)
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment bucket not found",
        )
    
    return DeploymentBucketResponse(**bucket)


@router.delete(
    "/projects/{project_id}/deployment-buckets/{bucket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Discard deployment bucket",
    description="Discard a deployment bucket (cannot be undone).",
)
async def discard_deployment_bucket(
    project_id: str,
    bucket_id: str,
    user: RequireCreate,
    db: Database,
):
    """Discard a deployment bucket."""
    service = DeploymentService(db)
    
    success = await service.discard_bucket(bucket_id, project_id, user.user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment bucket not found or cannot be discarded",
        )


# =============================================================================
# Deployment Item Endpoints
# =============================================================================

@router.post(
    "/projects/{project_id}/deployment-buckets/{bucket_id}/items",
    response_model=DeploymentItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add item to deployment bucket",
    description="Add a component change to the deployment bucket.",
)
async def add_item_to_bucket(
    project_id: str,
    bucket_id: str,
    item: DeploymentItemCreate,
    user: RequireCreate,
    db: Database,
):
    """Add an item to deployment bucket."""
    service = DeploymentService(db)
    
    result = await service.add_item_to_bucket(
        bucket_id=bucket_id,
        project_id=project_id,
        user_id=user.user_id,
        item=item,
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add item to bucket. Bucket may not exist or is not active.",
        )
    
    return DeploymentItemResponse(**result)


@router.delete(
    "/projects/{project_id}/deployment-buckets/{bucket_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove item from deployment bucket",
    description="Remove a component change from the deployment bucket.",
)
async def remove_item_from_bucket(
    project_id: str,
    bucket_id: str,
    item_id: str,
    user: RequireCreate,
    db: Database,
):
    """Remove an item from deployment bucket."""
    service = DeploymentService(db)
    
    success = await service.remove_item_from_bucket(
        bucket_id=bucket_id,
        project_id=project_id,
        user_id=user.user_id,
        item_id=item_id,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or bucket is not active",
        )


# =============================================================================
# Conflict Check & Deploy Endpoints
# =============================================================================

@router.post(
    "/projects/{project_id}/deployment-buckets/{bucket_id}/check-conflicts",
    response_model=ConflictCheckResponse,
    summary="Check for deployment conflicts",
    description="Check if there are any conflicts with other deployments.",
)
async def check_deployment_conflicts(
    project_id: str,
    bucket_id: str,
    user: RequireRead,
    db: Database,
):
    """Check for deployment conflicts."""
    service = DeploymentService(db)
    
    result = await service.check_conflicts(
        bucket_id=bucket_id,
        project_id=project_id,
        user_id=user.user_id,
    )
    
    return ConflictCheckResponse(**result)


@router.post(
    "/projects/{project_id}/deployment-buckets/{bucket_id}/deploy",
    response_model=DeployResponse,
    summary="Execute deployment",
    description="Deploy all changes in the bucket. Checks for conflicts first.",
)
async def execute_deployment(
    project_id: str,
    bucket_id: str,
    user: RequireDeploy,
    db: Database,
    request: Optional[DeployRequest] = None,
):
    """Execute deployment from bucket."""
    service = DeploymentService(db)
    
    req = request or DeployRequest()
    
    result = await service.execute_deployment(
        bucket_id=bucket_id,
        project_id=project_id,
        user_id=user.user_id,
        force=req.force,
        dry_run=req.dry_run,
    )
    
    return DeployResponse(**result)


# =============================================================================
# Deployment History Endpoints
# =============================================================================

@router.get(
    "/projects/{project_id}/deployments",
    response_model=DeploymentListResponse,
    summary="List deployment history",
    description="List all completed deployments for a project.",
)
async def list_deployments(
    project_id: str,
    user: RequireRead,
    db: Database,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List deployment history."""
    service = DeploymentService(db)
    
    deployments, total = await service.list_deployments(
        project_id=project_id,
        skip=skip,
        limit=limit,
    )
    
    return DeploymentListResponse(
        items=[DeploymentResponse(**d) for d in deployments],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/projects/{project_id}/deployments/{deployment_id}",
    response_model=DeploymentResponse,
    summary="Get deployment details",
    description="Get details of a specific deployment.",
)
async def get_deployment(
    project_id: str,
    deployment_id: int,
    user: RequireRead,
    db: Database,
):
    """Get deployment details."""
    service = DeploymentService(db)
    
    deployment = await service.get_deployment(deployment_id, project_id)
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    return DeploymentResponse(**deployment)


@router.get(
    "/projects/{project_id}/deployments/current",
    response_model=dict,
    summary="Get current deployment ID",
    description="Get the current (latest) deployment ID for a project.",
)
async def get_current_deployment_id(
    project_id: str,
    user: RequireRead,
    db: Database,
):
    """Get current deployment ID."""
    service = DeploymentService(db)
    
    deployment_id = await service.get_current_deployment_id(project_id)
    
    return {"current_deployment_id": deployment_id}

