"""
Datablock API endpoints.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import (
    Database,
    RequireRead,
    RequireCreate,
    RequireUpdate,
    RequireDelete,
    RequireDeploy,
)
from app.services.datablock_service import DatablockService
from app.services.datablock_template_service import DatablockTemplateService
from app.services.deployment_service import DeploymentService
from app.schemas.datablock import (
    DatablockCreate,
    DatablockUpdate,
    DatablockResponse,
    DatablockListResponse,
    DatablockStatus,
)
from app.schemas.datablock_template import (
    DatablockTemplateResponse,
    DatablockTemplateListResponse,
)
from app.schemas.deployment import (
    DeploymentItemCreate,
    ComponentType,
    ChangeType,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Datablock Templates (from MongoDB collection)
# -----------------------------------------------------------------------------

@router.get(
    "/datablocks/templates",
    response_model=DatablockTemplateListResponse,
    summary="List datablock templates",
    description="Get all available datablock templates. Templates are predefined schemas that can be used to create datablocks.",
)
async def list_templates(
    db: Database,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """List all datablock templates."""
    service = DatablockTemplateService(db)
    templates, total = await service.get_all(skip=skip, limit=limit)
    
    return DatablockTemplateListResponse(
        items=[DatablockTemplateResponse.model_validate(t) for t in templates],
        total=total,
    )


@router.get(
    "/datablocks/templates/{template_id}",
    response_model=DatablockTemplateResponse,
    summary="Get a template",
    description="Get a specific datablock template by its template_id.",
)
async def get_template(template_id: str, db: Database):
    """Get a specific template."""
    service = DatablockTemplateService(db)
    template = await service.get_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )
    
    return DatablockTemplateResponse.model_validate(template)


@router.post(
    "/datablocks/templates/seed",
    summary="Seed templates from JSON",
    description="Load templates from the JSON file into the database. Only adds templates that don't already exist.",
)
async def seed_templates(db: Database):
    """Seed templates from the JSON file."""
    service = DatablockTemplateService(db)
    added_count = await service.seed_from_json()
    
    return {
        "message": f"Seeded {added_count} new templates",
        "added_count": added_count,
    }


# -----------------------------------------------------------------------------
# Datablock CRUD (Protected - requires project membership)
# -----------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/datablocks",
    response_model=DatablockListResponse,
    summary="List project datablocks",
    description="Get all datablocks for a project. Requires READ permission.",
)
async def list_datablocks(
    project_id: str,
    db: Database,
    user: RequireRead,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """List all datablocks for a project."""
    service = DatablockService(db)
    datablocks, total = await service.get_all_for_project(project_id, skip=skip, limit=limit)
    
    return DatablockListResponse(
        items=[DatablockResponse.model_validate(d) for d in datablocks],
        total=total,
    )


@router.post(
    "/projects/{project_id}/datablocks",
    response_model=DatablockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a datablock",
    description="Create a new custom datablock. Requires CREATE permission.",
)
async def create_datablock(
    project_id: str,
    data: DatablockCreate,
    db: Database,
    user: RequireCreate,
):
    """Create a new custom datablock."""
    service = DatablockService(db)
    
    # Check if name already exists
    if await service.check_exists_by_name(project_id, data.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Datablock with name '{data.name}' already exists",
        )
    
    datablock = await service.create(project_id, data)
    return DatablockResponse.model_validate(datablock)


@router.post(
    "/projects/{project_id}/datablocks/from-template/{template_id}",
    response_model=DatablockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create datablock from template",
    description="Create a datablock from a predefined template. Requires CREATE permission.",
)
async def create_from_template(
    project_id: str,
    template_id: str,
    db: Database,
    user: RequireCreate,
):
    """Create a datablock from a predefined template."""
    template_service = DatablockTemplateService(db)
    datablock_service = DatablockService(db)
    
    # Check if template exists
    template = await template_service.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )
    
    # Check if datablock with same name already exists
    if await datablock_service.check_exists_by_name(project_id, template["name"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Datablock '{template['name']}' already exists in this project",
        )
    
    datablock = await datablock_service.create_from_template(project_id, template_id)
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create datablock from template",
        )
    
    return DatablockResponse.model_validate(datablock)


@router.get(
    "/projects/{project_id}/datablocks/{datablock_id}",
    response_model=DatablockResponse,
    summary="Get a datablock",
    description="Get a specific datablock by ID. Requires READ permission.",
)
async def get_datablock(
    project_id: str,
    datablock_id: str,
    db: Database,
    user: RequireRead,
):
    """Get a specific datablock."""
    service = DatablockService(db)
    datablock = await service.get_by_id(datablock_id, project_id)
    
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    return DatablockResponse.model_validate(datablock)


@router.put(
    "/projects/{project_id}/datablocks/{datablock_id}",
    response_model=DatablockResponse,
    summary="Update a datablock",
    description="Update a datablock's configuration. Requires UPDATE permission.",
)
async def update_datablock(
    project_id: str,
    datablock_id: str,
    data: DatablockUpdate,
    db: Database,
    user: RequireUpdate,
):
    """Update a datablock."""
    service = DatablockService(db)
    datablock = await service.update(datablock_id, project_id, data)
    
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    return DatablockResponse.model_validate(datablock)


@router.delete(
    "/projects/{project_id}/datablocks/{datablock_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a datablock",
    description="Delete a datablock. Requires DELETE permission.",
)
async def delete_datablock(
    project_id: str,
    datablock_id: str,
    db: Database,
    user: RequireDelete,
):
    """Delete a datablock."""
    service = DatablockService(db)
    deleted = await service.delete(datablock_id, project_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    return None


# -----------------------------------------------------------------------------
# Status Updates (Deployment permissions required)
# -----------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/mark-ready",
    response_model=DatablockResponse,
    summary="Mark datablock ready for deployment",
    description="Mark a configured datablock as ready for deployment and add to deployment bucket. Requires DEPLOY permission.",
)
async def mark_ready_for_deployment(
    project_id: str,
    datablock_id: str,
    db: Database,
    user: RequireDeploy,
    add_to_bucket: bool = Query(True, description="Automatically add to deployment bucket"),
):
    """Mark a datablock as ready for deployment."""
    datablock_service = DatablockService(db)
    
    # Get the datablock first to check it exists
    datablock = await datablock_service.get_by_id(datablock_id, project_id)
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    # Mark as ready
    datablock = await datablock_service.mark_ready_for_deployment(datablock_id, project_id)
    
    # Add to user's deployment bucket if requested
    if add_to_bucket and datablock:
        deployment_service = DeploymentService(db)
        
        # Get or create active bucket
        bucket = await deployment_service.get_or_create_active_bucket(
            project_id=project_id,
            user_id=user.user_id,
        )
        
        # Create deployment item
        item = DeploymentItemCreate(
            component_type=ComponentType.DATABLOCK,
            component_id=datablock_id,
            component_name=datablock["display_name"],
            change_type=ChangeType.UPDATE if datablock.get("deployment_id") else ChangeType.CREATE,
            change_summary=f"Add datablock: {datablock['display_name']}",
            previous_version=datablock.get("deployment_id"),
            payload={
                "name": datablock["name"],
                "display_name": datablock["display_name"],
                "schema_fields": datablock["schema_fields"],
            },
        )
        
        await deployment_service.add_item_to_bucket(
            bucket_id=bucket["_id"],
            project_id=project_id,
            user_id=user.user_id,
            item=item,
        )
    
    return DatablockResponse.model_validate(datablock)


@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/mark-deployed",
    response_model=DatablockResponse,
    summary="Mark datablock as deployed",
    description="Mark a datablock as deployed (called after successful deployment). Requires DEPLOY permission.",
)
async def mark_deployed(
    project_id: str,
    datablock_id: str,
    db: Database,
    user: RequireDeploy,
):
    """Mark a datablock as deployed."""
    service = DatablockService(db)
    datablock = await service.mark_deployed(datablock_id, project_id)
    
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    return DatablockResponse.model_validate(datablock)


@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/mark-pending-deletion",
    response_model=DatablockResponse,
    summary="Mark datablock for pending deletion",
    description="Mark a datablock as pending deletion and add to deployment bucket. Requires DELETE permission.",
)
async def mark_pending_deletion(
    project_id: str,
    datablock_id: str,
    db: Database,
    user: RequireDelete,
):
    """Mark a datablock as pending deletion and add to deployment bucket."""
    datablock_service = DatablockService(db)
    deployment_service = DeploymentService(db)
    
    # Get the datablock first
    datablock = await datablock_service.get_by_id(datablock_id, project_id)
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    # Note: is_predefined just means "created from a template", not "cannot be deleted"
    # All datablocks (custom or from template) can be deleted by the user
    
    # Update status to pending_deletion
    datablock = await datablock_service.update(
        datablock_id, 
        project_id, 
        DatablockUpdate(status=DatablockStatus.PENDING_DELETION)
    )
    
    # Add to deployment bucket
    bucket = await deployment_service.get_or_create_active_bucket(
        project_id=project_id,
        user_id=user.user_id,
    )
    
    item = DeploymentItemCreate(
        component_type=ComponentType.DATABLOCK,
        component_id=datablock_id,
        component_name=datablock["display_name"],
        change_type=ChangeType.DELETE,
        change_summary=f"Delete datablock: {datablock['display_name']}",
        previous_version=datablock.get("deployment_id"),
    )
    
    await deployment_service.add_item_to_bucket(
        bucket_id=bucket["_id"],
        project_id=project_id,
        user_id=user.user_id,
        item=item,
    )
    
    return DatablockResponse.model_validate(datablock)


@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/add-update-to-bucket",
    response_model=DatablockResponse,
    summary="Add schema update to deployment bucket",
    description="Add schema changes to deployment bucket for a deployed datablock. Requires UPDATE permission.",
)
async def add_update_to_bucket(
    project_id: str,
    datablock_id: str,
    data: DatablockUpdate,
    db: Database,
    user: RequireUpdate,
):
    """Add schema update to deployment bucket without applying changes directly."""
    datablock_service = DatablockService(db)
    deployment_service = DeploymentService(db)
    
    # Get the datablock first
    datablock = await datablock_service.get_by_id(datablock_id, project_id)
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    # Only allow for deployed datablocks
    if datablock["status"] not in ["deployed", "pending_update"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only add updates to deployment bucket for deployed datablocks. For non-deployed datablocks, use the regular update endpoint.",
        )
    
    # Update status to pending_update
    updated_datablock = await datablock_service.update(
        datablock_id, 
        project_id, 
        DatablockUpdate(status=DatablockStatus.PENDING_UPDATE)
    )
    
    # Prepare the payload with the new schema
    payload = {}
    if data.schema_fields:
        payload["schema_fields"] = [
            {
                "name": f.name,
                "type": f.type,
                "required": f.required,
                "description": f.description,
                "is_primary_key": f.is_primary_key,
            } for f in data.schema_fields
        ]
    if data.display_name:
        payload["display_name"] = data.display_name
    if data.description is not None:
        payload["description"] = data.description
    if data.source_type:
        payload["source_type"] = data.source_type.value
    
    # Add to deployment bucket
    bucket = await deployment_service.get_or_create_active_bucket(
        project_id=project_id,
        user_id=user.user_id,
    )
    
    item = DeploymentItemCreate(
        component_type=ComponentType.DATABLOCK,
        component_id=datablock_id,
        component_name=datablock["display_name"],
        change_type=ChangeType.UPDATE,
        change_summary=f"Update schema: {datablock['display_name']}",
        previous_version=datablock.get("deployment_id"),
        payload=payload,
    )
    
    await deployment_service.add_item_to_bucket(
        bucket_id=bucket["_id"],
        project_id=project_id,
        user_id=user.user_id,
        item=item,
    )
    
    return DatablockResponse.model_validate(updated_datablock)
