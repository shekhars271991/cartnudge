"""
Pipeline API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database
from app.services.pipeline_service import PipelineService
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineListResponse,
    EventCreate,
    EventUpdate,
    EventResponse,
    WebhookInfo,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Pipeline CRUD
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/pipelines", response_model=PipelineListResponse)
async def list_pipelines(
    project_id: str,
    db: Database,
    skip: int = 0,
    limit: int = 100,
):
    """List all pipelines for a project."""
    service = PipelineService(db)
    pipelines, total = await service.get_all_for_project(project_id, skip=skip, limit=limit)
    
    return PipelineListResponse(
        items=[PipelineResponse.model_validate(p) for p in pipelines],
        total=total,
    )


@router.post(
    "/projects/{project_id}/pipelines",
    response_model=PipelineResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_pipeline(
    project_id: str,
    data: PipelineCreate,
    db: Database,
):
    """Create a new pipeline."""
    service = PipelineService(db)
    pipeline = await service.create(project_id, data)
    return PipelineResponse.model_validate(pipeline)


@router.get("/projects/{project_id}/pipelines/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Get a pipeline by ID."""
    service = PipelineService(db)
    pipeline = await service.get_by_id(pipeline_id, project_id)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.put("/projects/{project_id}/pipelines/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    project_id: str,
    pipeline_id: str,
    data: PipelineUpdate,
    db: Database,
):
    """Update a pipeline."""
    service = PipelineService(db)
    pipeline = await service.update(pipeline_id, project_id, data)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.delete(
    "/projects/{project_id}/pipelines/{pipeline_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Delete a pipeline."""
    service = PipelineService(db)
    deleted = await service.delete(pipeline_id, project_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )


@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/activate",
    response_model=PipelineResponse,
)
async def activate_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Activate a pipeline."""
    service = PipelineService(db)
    pipeline = await service.activate(pipeline_id, project_id)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/deactivate",
    response_model=PipelineResponse,
)
async def deactivate_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Deactivate a pipeline."""
    service = PipelineService(db)
    pipeline = await service.deactivate(pipeline_id, project_id)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


# -----------------------------------------------------------------------------
# Webhook
# -----------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/pipelines/{pipeline_id}/webhook",
    response_model=WebhookInfo,
)
async def get_webhook(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Get webhook information for a pipeline."""
    service = PipelineService(db)
    secret = await service.get_webhook_secret(pipeline_id, project_id)
    
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    # Build webhook URL
    webhook_url = f"http://localhost:8001/ingest/{project_id}/{pipeline_id}"
    
    return WebhookInfo(url=webhook_url, secret=secret)


@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/webhook/rotate",
    response_model=WebhookInfo,
)
async def rotate_webhook_secret(
    project_id: str,
    pipeline_id: str,
    db: Database,
):
    """Rotate webhook secret for a pipeline."""
    service = PipelineService(db)
    new_secret = await service.rotate_webhook_secret(pipeline_id, project_id)
    
    if not new_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    webhook_url = f"http://localhost:8001/ingest/{project_id}/{pipeline_id}"
    
    return WebhookInfo(url=webhook_url, secret=new_secret)


# -----------------------------------------------------------------------------
# Events (nested in pipeline)
# -----------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/events",
    response_model=PipelineResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_event(
    project_id: str,
    pipeline_id: str,
    data: EventCreate,
    db: Database,
):
    """Add an event to a pipeline."""
    service = PipelineService(db)
    pipeline = await service.add_event(pipeline_id, project_id, data)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.put(
    "/projects/{project_id}/pipelines/{pipeline_id}/events/{event_name}",
    response_model=PipelineResponse,
)
async def update_event(
    project_id: str,
    pipeline_id: str,
    event_name: str,
    data: EventUpdate,
    db: Database,
):
    """Update an event in a pipeline."""
    service = PipelineService(db)
    pipeline = await service.update_event(pipeline_id, project_id, event_name, data)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline or event not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.delete(
    "/projects/{project_id}/pipelines/{pipeline_id}/events/{event_name}",
    response_model=PipelineResponse,
)
async def delete_event(
    project_id: str,
    pipeline_id: str,
    event_name: str,
    db: Database,
):
    """Delete an event from a pipeline."""
    service = PipelineService(db)
    pipeline = await service.delete_event(pipeline_id, project_id, event_name)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline or event not found",
        )
    
    return PipelineResponse.model_validate(pipeline)
