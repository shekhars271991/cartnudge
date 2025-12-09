"""
Feature API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import (
    Database,
    RequireRead,
    RequireCreate,
    RequireUpdate,
    RequireDelete,
    RequireDeploy,
)
from app.services.feature_service import FeatureService
from app.schemas.feature import (
    FeatureCreate,
    FeatureUpdate,
    FeatureResponse,
    FeatureListResponse,
)

router = APIRouter()


@router.get("/projects/{project_id}/features", response_model=FeatureListResponse)
async def list_features(
    project_id: str,
    db: Database,
    user: RequireRead,
    skip: int = 0,
    limit: int = 100,
):
    """List all feature definitions for a project. Requires READ permission."""
    service = FeatureService(db)
    features, total = await service.get_all_for_project(project_id, skip=skip, limit=limit)
    
    return FeatureListResponse(
        items=[FeatureResponse.model_validate(f) for f in features],
        total=total,
    )


@router.post(
    "/projects/{project_id}/features",
    response_model=FeatureResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(
    project_id: str,
    data: FeatureCreate,
    db: Database,
    user: RequireCreate,
):
    """Create a new feature definition. Requires CREATE permission."""
    service = FeatureService(db)
    feature = await service.create(project_id, data)
    return FeatureResponse.model_validate(feature)


@router.get("/projects/{project_id}/features/{feature_id}", response_model=FeatureResponse)
async def get_feature(
    project_id: str,
    feature_id: str,
    db: Database,
    user: RequireRead,
):
    """Get a feature by ID. Requires READ permission."""
    service = FeatureService(db)
    feature = await service.get_by_id(feature_id, project_id)
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found",
        )
    
    return FeatureResponse.model_validate(feature)


@router.put("/projects/{project_id}/features/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    project_id: str,
    feature_id: str,
    data: FeatureUpdate,
    db: Database,
    user: RequireUpdate,
):
    """Update a feature. Requires UPDATE permission."""
    service = FeatureService(db)
    feature = await service.update(feature_id, project_id, data)
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found",
        )
    
    return FeatureResponse.model_validate(feature)


@router.delete(
    "/projects/{project_id}/features/{feature_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_feature(
    project_id: str,
    feature_id: str,
    db: Database,
    user: RequireDelete,
):
    """Delete a feature. Requires DELETE permission."""
    service = FeatureService(db)
    deleted = await service.delete(feature_id, project_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found",
        )


@router.post(
    "/projects/{project_id}/features/{feature_id}/enable",
    response_model=FeatureResponse,
)
async def enable_feature(
    project_id: str,
    feature_id: str,
    db: Database,
    user: RequireDeploy,
):
    """Enable a feature. Requires DEPLOY permission."""
    service = FeatureService(db)
    feature = await service.enable(feature_id, project_id)
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found",
        )
    
    return FeatureResponse.model_validate(feature)


@router.post(
    "/projects/{project_id}/features/{feature_id}/disable",
    response_model=FeatureResponse,
)
async def disable_feature(
    project_id: str,
    feature_id: str,
    db: Database,
    user: RequireDeploy,
):
    """Disable a feature. Requires DEPLOY permission."""
    service = FeatureService(db)
    feature = await service.disable(feature_id, project_id)
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found",
        )
    
    return FeatureResponse.model_validate(feature)
