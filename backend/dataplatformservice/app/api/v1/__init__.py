"""
API v1 router - aggregates all API routes.
"""

from fastapi import APIRouter

from app.api.v1 import pipelines, features, datablocks, deployments, events, training

router = APIRouter()

router.include_router(datablocks.router, tags=["Datablocks"])
router.include_router(pipelines.router, tags=["Pipelines"])
router.include_router(features.router, tags=["Features"])
router.include_router(deployments.router, tags=["Deployments"])
router.include_router(events.router, tags=["Events"])
router.include_router(training.router, tags=["Training Data"])
