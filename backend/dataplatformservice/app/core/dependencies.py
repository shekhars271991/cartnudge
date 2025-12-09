"""
FastAPI dependencies for dependency injection.
"""

from typing import Annotated

from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database
from app.core.auth import (
    AuthenticatedUser,
    get_authenticated_user,
    require_permission,
    Permission,
    Role,
    RequireRead,
    RequireCreate,
    RequireUpdate,
    RequireDelete,
    RequireDeploy,
    CurrentUser,
)


async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return get_database()


# Type alias for cleaner dependency injection
Database = Annotated[AsyncIOMotorDatabase, Depends(get_db)]

# Re-export auth dependencies for convenience
__all__ = [
    "Database",
    "AuthenticatedUser",
    "get_authenticated_user",
    "require_permission",
    "Permission",
    "Role",
    "RequireRead",
    "RequireCreate",
    "RequireUpdate",
    "RequireDelete",
    "RequireDeploy",
    "CurrentUser",
]
