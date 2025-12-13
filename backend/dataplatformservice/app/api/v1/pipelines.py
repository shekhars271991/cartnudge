"""
Event Pipeline API endpoints.

Uses Bearer token authentication with project_id in the URL path.
This is for dashboard/UI operations, not external integrations.
"""
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import (
    Database,
    RequireRead,
    RequireCreate,
    RequireUpdate,
    RequireDelete,
)
from app.services.pipeline_service import PipelineService
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineListResponse,
    PipelineActivateRequest,
    EventTypeConfigCreate,
    EventTypeConfigUpdate,
    PipelineIntegrationResponse,
    IntegrationExample,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Pipeline CRUD
# -----------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/pipelines",
    response_model=PipelineListResponse,
    summary="List event pipelines",
    description="Get all event pipelines for a project. Requires READ permission.",
)
async def list_pipelines(
    project_id: str,
    db: Database,
    user: RequireRead,
    skip: int = 0,
    limit: int = 100,
):
    """List all event pipelines for a project."""
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
    summary="Create event pipeline",
    description="""
    Create a new event pipeline for a project. Requires CREATE permission.
    
    A pipeline defines how events are ingested for a specific topic.
    Each pipeline contains event type configurations with their own field definitions.
    """,
)
async def create_pipeline(
    project_id: str,
    data: PipelineCreate,
    db: Database,
    user: RequireCreate,
):
    """Create a new event pipeline."""
    service = PipelineService(db)
    
    # Check if pipeline for this topic already exists
    existing = await service.get_by_topic(data.topic_id, project_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A pipeline for topic '{data.topic_id}' already exists in this project",
        )
    
    pipeline = await service.create(project_id, data)
    return PipelineResponse.model_validate(pipeline)


@router.get(
    "/projects/{project_id}/pipelines/{pipeline_id}",
    response_model=PipelineResponse,
    summary="Get event pipeline",
    description="Get a specific event pipeline by ID. Requires READ permission.",
)
async def get_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
    user: RequireRead,
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


@router.put(
    "/projects/{project_id}/pipelines/{pipeline_id}",
    response_model=PipelineResponse,
    summary="Update event pipeline",
    description="Update an event pipeline. Requires UPDATE permission.",
)
async def update_pipeline(
    project_id: str,
    pipeline_id: str,
    data: PipelineUpdate,
    db: Database,
    user: RequireUpdate,
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
    summary="Delete event pipeline",
    description="Delete an event pipeline. Requires DELETE permission.",
)
async def delete_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
    user: RequireDelete,
):
    """Delete a pipeline."""
    service = PipelineService(db)
    deleted = await service.delete(pipeline_id, project_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )


# -----------------------------------------------------------------------------
# Activate / Deactivate
# -----------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/activate",
    response_model=PipelineResponse,
    summary="Activate pipeline",
    description="Activate a pipeline to start receiving events. Requires UPDATE permission.",
)
async def activate_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
    user: RequireUpdate,
):
    """Activate a pipeline."""
    service = PipelineService(db)
    pipeline = await service.set_active(pipeline_id, project_id, True)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/deactivate",
    response_model=PipelineResponse,
    summary="Deactivate pipeline",
    description="Deactivate a pipeline to stop receiving events. Requires UPDATE permission.",
)
async def deactivate_pipeline(
    project_id: str,
    pipeline_id: str,
    db: Database,
    user: RequireUpdate,
):
    """Deactivate a pipeline."""
    service = PipelineService(db)
    pipeline = await service.set_active(pipeline_id, project_id, False)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.put(
    "/projects/{project_id}/pipelines/{pipeline_id}/status",
    response_model=PipelineResponse,
    summary="Set pipeline status",
    description="Set pipeline active status. Requires UPDATE permission.",
)
async def set_pipeline_status(
    project_id: str,
    pipeline_id: str,
    request: PipelineActivateRequest,
    db: Database,
    user: RequireUpdate,
):
    """Set pipeline active status."""
    service = PipelineService(db)
    pipeline = await service.set_active(pipeline_id, project_id, request.is_active)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


# -----------------------------------------------------------------------------
# Event Type Config Operations
# -----------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/pipelines/{pipeline_id}/event-configs",
    response_model=PipelineResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add event type configuration",
    description="Add a new event type configuration to a pipeline. Requires CREATE permission.",
)
async def add_event_config(
    project_id: str,
    pipeline_id: str,
    data: EventTypeConfigCreate,
    db: Database,
    user: RequireCreate,
):
    """Add an event type configuration to a pipeline."""
    service = PipelineService(db)
    
    # Check if event type already exists
    existing = await service.get_event_config(pipeline_id, project_id, data.event_type)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event type '{data.event_type}' already exists in this pipeline",
        )
    
    pipeline = await service.add_event_config(pipeline_id, project_id, data)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.put(
    "/projects/{project_id}/pipelines/{pipeline_id}/event-configs/{event_type}",
    response_model=PipelineResponse,
    summary="Update event type configuration",
    description="Update an event type configuration in a pipeline. Requires UPDATE permission.",
)
async def update_event_config(
    project_id: str,
    pipeline_id: str,
    event_type: str,
    data: EventTypeConfigUpdate,
    db: Database,
    user: RequireUpdate,
):
    """Update an event type configuration."""
    service = PipelineService(db)
    pipeline = await service.update_event_config(pipeline_id, project_id, event_type, data)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline or event type not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


@router.delete(
    "/projects/{project_id}/pipelines/{pipeline_id}/event-configs/{event_type}",
    response_model=PipelineResponse,
    summary="Delete event type configuration",
    description="Delete an event type configuration from a pipeline. Requires DELETE permission.",
)
async def delete_event_config(
    project_id: str,
    pipeline_id: str,
    event_type: str,
    db: Database,
    user: RequireDelete,
):
    """Delete an event type configuration."""
    service = PipelineService(db)
    pipeline = await service.delete_event_config(pipeline_id, project_id, event_type)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline or event type not found",
        )
    
    return PipelineResponse.model_validate(pipeline)


# -----------------------------------------------------------------------------
# Integration Details
# -----------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/pipelines/{pipeline_id}/integration",
    response_model=PipelineIntegrationResponse,
    summary="Get integration details",
    description="""
    Get integration details for a pipeline. Requires READ permission.
    
    Returns example code for each event type configured in the pipeline.
    The examples show how to send events using the Events API with an API key.
    """,
)
async def get_integration_details(
    project_id: str,
    pipeline_id: str,
    db: Database,
    user: RequireRead,
):
    """Get integration details for a pipeline."""
    service = PipelineService(db)
    pipeline = await service.get_by_id(pipeline_id, project_id)
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    examples = []
    endpoint = "/api/v1/events/ingest"
    
    for event_config in pipeline.get("event_configs", []):
        event_type = event_config["event_type"]
        fields = event_config.get("fields", [])
        
        # Build example payload
        example_data = {}
        for field in fields:
            field_name = field["name"]
            field_type = field["type"]
            
            if field_type == "string":
                example_data[field_name] = f"example_{field_name}"
            elif field_type == "number":
                example_data[field_name] = 0
            elif field_type == "boolean":
                example_data[field_name] = True
            elif field_type == "date":
                example_data[field_name] = "2024-01-01T00:00:00Z"
            elif field_type == "array":
                example_data[field_name] = []
            elif field_type == "object":
                example_data[field_name] = {}
        
        example_payload = {
            "event_type": event_type,
            "topic": pipeline["topic_id"],
            "data": example_data,
        }
        
        # Build curl example (user needs to use their own API key)
        payload_json = json.dumps(example_payload, indent=2)
        curl_example = f'''curl -X POST "https://api.cartnudge.ai{endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: proj_{project_id}_YOUR_SECRET_KEY" \\
  -d '{payload_json}' '''
        
        examples.append(IntegrationExample(
            event_type=event_type,
            endpoint=endpoint,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": f"proj_{project_id}_<your_secret_key>",
            },
            example_payload=example_payload,
            example_curl=curl_example,
        ))
    
    return PipelineIntegrationResponse(
        pipeline_id=pipeline_id,
        topic_id=pipeline["topic_id"],
        examples=examples,
    )
