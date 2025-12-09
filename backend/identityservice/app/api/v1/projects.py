"""
Project API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database, CurrentUser
from app.services.project_service import ProjectService
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from app.schemas.auth import MessageResponse

router = APIRouter()


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List user's projects",
    description="Get all projects where the current user is a member.",
)
async def list_projects(
    db: Database,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """List all projects for the current user."""
    service = ProjectService(db)
    projects, total = await service.get_all_for_user(
        current_user["_id"], skip=skip, limit=limit
    )
    
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(p) for p in projects],
        total=total,
    )


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create a new project. The current user becomes the owner.",
)
async def create_project(
    data: ProjectCreate,
    db: Database,
    current_user: CurrentUser,
):
    """Create a new project."""
    service = ProjectService(db)
    project = await service.create(current_user["_id"], data)
    return ProjectResponse.model_validate(project)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get a project",
    description="Get a project by ID. User must be a member.",
)
async def get_project(
    project_id: str,
    db: Database,
    current_user: CurrentUser,
):
    """Get a project by ID."""
    service = ProjectService(db)
    project = await service.get_by_id(project_id, current_user["_id"])
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have access",
        )
    
    return ProjectResponse.model_validate(project)


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update a project",
    description="Update a project. Requires owner or admin role.",
)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Database,
    current_user: CurrentUser,
):
    """Update a project."""
    service = ProjectService(db)
    try:
        project = await service.update(project_id, current_user["_id"], data)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        
        return ProjectResponse.model_validate(project)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete a project",
    description="Delete a project (soft delete). Requires owner role.",
)
async def delete_project(
    project_id: str,
    db: Database,
    current_user: CurrentUser,
):
    """Delete a project."""
    service = ProjectService(db)
    try:
        deleted = await service.delete(project_id, current_user["_id"])
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        
        return MessageResponse(message="Project deleted successfully")
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

