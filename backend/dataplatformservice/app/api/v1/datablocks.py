"""
Datablock API endpoints.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import Database
from app.services.datablock_service import DatablockService
from app.schemas.datablock import (
    DatablockCreate,
    DatablockUpdate,
    DatablockResponse,
    DatablockListResponse,
    PredefinedDatablockTemplate,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Predefined Templates
# -----------------------------------------------------------------------------

@router.get(
    "/datablocks/templates",
    response_model=List[PredefinedDatablockTemplate],
    summary="List predefined datablock templates",
    description="Get all available predefined datablock templates that can be used to create datablocks.",
)
async def list_templates(db: Database):
    """List all predefined datablock templates."""
    service = DatablockService(db)
    templates = service.get_predefined_templates()
    return templates


@router.get(
    "/datablocks/templates/{template_id}",
    response_model=PredefinedDatablockTemplate,
    summary="Get a predefined template",
    description="Get a specific predefined datablock template by ID.",
)
async def get_template(template_id: str, db: Database):
    """Get a specific predefined template."""
    service = DatablockService(db)
    template = service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )
    
    return template


# -----------------------------------------------------------------------------
# Datablock CRUD
# -----------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/datablocks",
    response_model=DatablockListResponse,
    summary="List project datablocks",
    description="Get all datablocks for a project.",
)
async def list_datablocks(
    project_id: str,
    db: Database,
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
    description="Create a new custom datablock.",
)
async def create_datablock(
    project_id: str,
    data: DatablockCreate,
    db: Database,
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
    description="Create a datablock from a predefined template.",
)
async def create_from_template(
    project_id: str,
    template_id: str,
    db: Database,
):
    """Create a datablock from a predefined template."""
    service = DatablockService(db)
    
    # Check if template exists
    template = service.get_template_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )
    
    # Check if datablock with same name already exists
    if await service.check_exists_by_name(project_id, template["name"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Datablock '{template['name']}' already exists in this project",
        )
    
    datablock = await service.create_from_template(project_id, template_id)
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
    description="Get a specific datablock by ID.",
)
async def get_datablock(
    project_id: str,
    datablock_id: str,
    db: Database,
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
    description="Update a datablock's configuration.",
)
async def update_datablock(
    project_id: str,
    datablock_id: str,
    data: DatablockUpdate,
    db: Database,
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
    description="Delete a datablock.",
)
async def delete_datablock(
    project_id: str,
    datablock_id: str,
    db: Database,
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
# Status Updates
# -----------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/mark-ready",
    response_model=DatablockResponse,
    summary="Mark datablock ready for deployment",
    description="Mark a configured datablock as ready for deployment.",
)
async def mark_ready_for_deployment(
    project_id: str,
    datablock_id: str,
    db: Database,
):
    """Mark a datablock as ready for deployment."""
    service = DatablockService(db)
    datablock = await service.mark_ready_for_deployment(datablock_id, project_id)
    
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    return DatablockResponse.model_validate(datablock)


@router.post(
    "/projects/{project_id}/datablocks/{datablock_id}/mark-deployed",
    response_model=DatablockResponse,
    summary="Mark datablock as deployed",
    description="Mark a datablock as deployed (called after successful deployment).",
)
async def mark_deployed(
    project_id: str,
    datablock_id: str,
    db: Database,
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

