"""
API v1 router - aggregates all API routes.
"""

from fastapi import APIRouter

from app.api.v1 import auth, users, projects, members, api_keys, internal

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(members.router, tags=["Team Members"])
router.include_router(api_keys.router, tags=["API Keys"])
router.include_router(internal.router, prefix="/internal", tags=["Internal"])

