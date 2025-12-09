"""
API Key API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database, CurrentUser
from app.services.api_key_service import ApiKeyService
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyListResponse,
)
from app.schemas.auth import MessageResponse

router = APIRouter()


@router.get(
    "/projects/{project_id}/api-keys",
    response_model=ApiKeyListResponse,
    summary="List API keys",
    description="Get all API keys for a project.",
)
async def list_api_keys(
    project_id: str,
    db: Database,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """List all API keys for a project."""
    service = ApiKeyService(db)
    keys, total = await service.get_all_for_project(project_id, skip=skip, limit=limit)
    
    return ApiKeyListResponse(
        items=[ApiKeyResponse.model_validate(k) for k in keys],
        total=total,
    )


@router.post(
    "/projects/{project_id}/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an API key",
    description="Create a new API key. The full key is only shown once!",
)
async def create_api_key(
    project_id: str,
    data: ApiKeyCreate,
    db: Database,
    current_user: CurrentUser,
):
    """Create a new API key."""
    service = ApiKeyService(db)
    try:
        key_doc, _ = await service.create(project_id, current_user["_id"], data)
        return ApiKeyCreatedResponse.model_validate(key_doc)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete(
    "/projects/{project_id}/api-keys/{key_id}",
    response_model=MessageResponse,
    summary="Revoke an API key",
    description="Revoke an API key. Requires owner or admin role.",
)
async def revoke_api_key(
    project_id: str,
    key_id: str,
    db: Database,
    current_user: CurrentUser,
):
    """Revoke an API key."""
    service = ApiKeyService(db)
    try:
        revoked = await service.revoke(project_id, current_user["_id"], key_id)
        
        if not revoked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found",
            )
        
        return MessageResponse(message="API key revoked successfully")
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

