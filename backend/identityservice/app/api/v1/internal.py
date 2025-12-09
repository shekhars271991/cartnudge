"""
Internal API endpoints (service-to-service).
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import Database
from app.core.security import decode_token
from app.services.api_key_service import ApiKeyService
from app.services.project_service import ProjectService
from bson import ObjectId

router = APIRouter()


class TokenValidationRequest(BaseModel):
    """Request for token validation."""
    token: str


class TokenValidationResponse(BaseModel):
    """Response for token validation."""
    valid: bool
    user_id: Optional[str] = None
    error: Optional[str] = None


class ApiKeyValidationRequest(BaseModel):
    """Request for API key validation."""
    api_key: str


class ApiKeyValidationResponse(BaseModel):
    """Response for API key validation."""
    valid: bool
    project_id: Optional[str] = None
    scopes: List[str] = []
    error: Optional[str] = None


class PermissionsResponse(BaseModel):
    """Response for permissions check."""
    role: Optional[str]
    permissions: List[str]


class MembershipResponse(BaseModel):
    """Response for membership check."""
    is_member: bool
    role: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None


# Permission definitions by role
ROLE_PERMISSIONS = {
    "owner": ["*"],
    "admin": [
        "project:read", "project:update",
        "members:read", "members:invite", "members:remove",
        "api_keys:read", "api_keys:create", "api_keys:revoke",
        "billing:read",
        "pipelines:read", "pipelines:create", "pipelines:update", "pipelines:delete",
        "features:read", "features:create", "features:update", "features:delete",
        "deployments:read", "deployments:create", "deployments:rollback",
    ],
    "developer": [
        "project:read",
        "members:read",
        "api_keys:read",
        "pipelines:read", "pipelines:create", "pipelines:update", "pipelines:delete",
        "features:read", "features:create", "features:update", "features:delete",
        "deployments:read", "deployments:create",
    ],
    "viewer": [
        "project:read",
        "members:read",
        "pipelines:read",
        "features:read",
        "deployments:read",
    ],
}


@router.post(
    "/validate-token",
    response_model=TokenValidationResponse,
    summary="Validate JWT token",
    description="Validate a JWT access token (internal use only).",
)
async def validate_token(data: TokenValidationRequest, db: Database):
    """Validate a JWT token."""
    payload = decode_token(data.token)
    
    if not payload:
        return TokenValidationResponse(valid=False, error="Invalid or expired token")
    
    if payload.get("type") != "access":
        return TokenValidationResponse(valid=False, error="Invalid token type")
    
    user_id = payload.get("sub")
    if not user_id:
        return TokenValidationResponse(valid=False, error="Invalid token payload")
    
    # Check if user exists and is active
    user = await db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True,
    })
    
    if not user:
        return TokenValidationResponse(valid=False, error="User not found or inactive")
    
    return TokenValidationResponse(valid=True, user_id=user_id)


@router.post(
    "/validate-api-key",
    response_model=ApiKeyValidationResponse,
    summary="Validate API key",
    description="Validate an API key (internal use only).",
)
async def validate_api_key(data: ApiKeyValidationRequest, db: Database):
    """Validate an API key."""
    service = ApiKeyService(db)
    result = await service.validate(data.api_key)
    
    if not result:
        return ApiKeyValidationResponse(valid=False, error="Invalid or expired API key")
    
    return ApiKeyValidationResponse(
        valid=True,
        project_id=result["project_id"],
        scopes=result["scopes"],
    )


@router.get(
    "/projects/{project_id}/permissions/{user_id}",
    response_model=PermissionsResponse,
    summary="Get user permissions",
    description="Get a user's permissions for a project (internal use only).",
)
async def get_permissions(
    project_id: str,
    user_id: str,
    db: Database,
):
    """Get user's permissions for a project."""
    service = ProjectService(db)
    role = await service.get_user_role(project_id, user_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this project",
        )
    
    permissions = ROLE_PERMISSIONS.get(role, [])
    
    return PermissionsResponse(role=role, permissions=permissions)


@router.get(
    "/projects/{project_id}/members/{user_id}",
    response_model=MembershipResponse,
    summary="Check project membership",
    description="Check if a user is a member of a project and get their role (internal use only).",
)
async def check_membership(
    project_id: str,
    user_id: str,
    db: Database,
):
    """
    Check if a user is a member of a project.
    
    Used by other services (e.g., Data Platform Service) to verify
    project access and get the user's role.
    """
    service = ProjectService(db)
    role = await service.get_user_role(project_id, user_id)
    
    if not role:
        return MembershipResponse(
            is_member=False,
            project_id=project_id,
            user_id=user_id,
        )
    
    return MembershipResponse(
        is_member=True,
        role=role,
        project_id=project_id,
        user_id=user_id,
    )
