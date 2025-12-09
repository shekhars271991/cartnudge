"""
Authentication and Authorization for Data Platform Service.

Handles:
- JWT token validation (tokens issued by Identity Service)
- Project access verification
- Role-based permission checking
"""
from __future__ import annotations

from enum import Enum
from typing import Annotated, Dict, Optional, Set

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)


class Role(str, Enum):
    """Project member roles (must match identity service)."""
    OWNER = "owner"
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class Permission(str, Enum):
    """Available permissions for actions."""
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    DEPLOY = "deploy"
    SETTINGS = "settings"


# Role -> Permissions mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.OWNER: {
        Permission.READ,
        Permission.CREATE,
        Permission.UPDATE,
        Permission.DELETE,
        Permission.DEPLOY,
        Permission.SETTINGS,
    },
    Role.ADMIN: {
        Permission.READ,
        Permission.CREATE,
        Permission.UPDATE,
        Permission.DELETE,
        Permission.DEPLOY,
        Permission.SETTINGS,
    },
    Role.DEVELOPER: {
        Permission.READ,
        Permission.CREATE,
        Permission.UPDATE,
    },
    Role.VIEWER: {
        Permission.READ,
    },
}


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


class AuthenticatedUser:
    """
    Represents an authenticated user with optional project context.
    
    After authentication, call set_project_context() to enable
    permission checking for a specific project.
    """
    
    def __init__(self, user_id: str, email: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self._project_role: Optional[Role] = None
        self._project_id: Optional[str] = None
    
    def set_project_context(self, project_id: str, role: Role):
        """Set the project context after authorization."""
        self._project_id = project_id
        self._project_role = role
    
    @property
    def project_id(self) -> Optional[str]:
        return self._project_id
    
    @property
    def role(self) -> Optional[Role]:
        return self._project_role
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has a specific permission in current project."""
        if not self._project_role:
            return False
        return permission in ROLE_PERMISSIONS.get(self._project_role, set())
    
    def can_read(self) -> bool:
        return self.has_permission(Permission.READ)
    
    def can_create(self) -> bool:
        return self.has_permission(Permission.CREATE)
    
    def can_update(self) -> bool:
        return self.has_permission(Permission.UPDATE)
    
    def can_delete(self) -> bool:
        return self.has_permission(Permission.DELETE)
    
    def can_deploy(self) -> bool:
        return self.has_permission(Permission.DEPLOY)
    
    def can_manage_settings(self) -> bool:
        return self.has_permission(Permission.SETTINGS)


async def get_authenticated_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> AuthenticatedUser:
    """
    Authenticate user from JWT token.
    
    This only validates the token - it doesn't check project access.
    Use require_project_access() for project-specific authorization.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(credentials.credentials)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    return AuthenticatedUser(
        user_id=user_id,
        email=payload.get("email"),
    )


async def get_project_membership(project_id: str, user_id: str) -> Optional[Role]:
    """
    Check user's role in a project by calling Identity Service.
    
    Returns the user's Role if they are a member, None otherwise.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.identity_service_url}/api/v1/internal/projects/{project_id}/members/{user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                role_str = data.get("role")
                if role_str:
                    try:
                        return Role(role_str)
                    except ValueError:
                        return None
            
            return None
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity service unavailable",
        )


async def authorize_project_access(
    project_id: str,
    user: AuthenticatedUser,
    required_permission: Permission = Permission.READ,
) -> AuthenticatedUser:
    """
    Verify user has access to a project with the required permission.
    
    This function:
    1. Checks if the user is a member of the project
    2. Verifies they have the required permission based on their role
    3. Sets the project context on the user object
    
    Raises HTTPException if access is denied.
    """
    role = await get_project_membership(project_id, user.user_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project",
        )
    
    # Set project context
    user.set_project_context(project_id, role)
    
    # Check permission
    if not user.has_permission(required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to {required_permission.value} in this project",
        )
    
    return user


def require_permission(permission: Permission):
    """
    Dependency factory for requiring a specific permission.
    
    Usage:
        @router.post("/projects/{project_id}/datablocks")
        async def create_datablock(
            project_id: str,
            user: Annotated[AuthenticatedUser, Depends(require_permission(Permission.CREATE))],
        ):
            ...
    """
    async def _require_permission(
        project_id: str,
        user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    ) -> AuthenticatedUser:
        return await authorize_project_access(project_id, user, permission)
    
    return _require_permission


# Convenience dependencies for common permission checks
RequireRead = Annotated[AuthenticatedUser, Depends(require_permission(Permission.READ))]
RequireCreate = Annotated[AuthenticatedUser, Depends(require_permission(Permission.CREATE))]
RequireUpdate = Annotated[AuthenticatedUser, Depends(require_permission(Permission.UPDATE))]
RequireDelete = Annotated[AuthenticatedUser, Depends(require_permission(Permission.DELETE))]
RequireDeploy = Annotated[AuthenticatedUser, Depends(require_permission(Permission.DEPLOY))]

# Type alias for authenticated user (no project context)
CurrentUser = Annotated[AuthenticatedUser, Depends(get_authenticated_user)]

