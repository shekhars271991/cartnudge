"""
Event Ingestion API - accepts data events and publishes to Kafka.

API Key Format: proj_{project_id}_{random_secret}
The project_id is extracted from the API key, so clients don't need to specify it.

Topics are configured in data/event_topics.json and must be explicitly specified in requests.
"""
from __future__ import annotations

from typing import Any
import re

from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.dependencies import Database
from app.services.kafka_producer import get_kafka_producer
from app.services.kafka_admin import event_topic_config
from app.services.datablock_service import DatablockService

router = APIRouter(tags=["Events"])


# -----------------------------------------------------------------------------
# API Key Utilities
# -----------------------------------------------------------------------------

def parse_api_key(api_key: str) -> tuple[str, str]:
    """
    Parse API key to extract project_id.
    
    API Key Format: proj_{project_id}_{secret}
    Example: proj_abc123def456_sk_live_xxxxxxxxxxxx
    
    Returns: (project_id, secret)
    Raises: HTTPException if invalid format
    """
    if not api_key or not api_key.startswith("proj_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format. Expected: proj_{project_id}_{secret}",
        )
    
    # Format: proj_{project_id}_{secret}
    parts = api_key.split("_", 2)  # Split into max 3 parts
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format. Expected: proj_{project_id}_{secret}",
        )
    
    project_id = parts[1]
    secret = parts[2] if len(parts) > 2 else ""
    
    if not project_id or len(project_id) < 10:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project ID in API key",
        )
    
    # TODO: Validate secret against stored API keys in database
    
    return project_id, secret


# -----------------------------------------------------------------------------
# Request/Response Models
# -----------------------------------------------------------------------------

class EventIngestRequest(BaseModel):
    """Request model for ingesting an event."""
    
    topic: str = Field(
        ...,
        description="Kafka topic to publish the event to. Must be a valid topic from event_topics.json",
        examples=["cart_events", "page_events", "order_events", "user_events", "custom_events"],
    )
    event_type: str = Field(
        ...,
        description="The type/name of the event for categorization",
        examples=["cart.add", "cart.remove", "page.view", "order.created"],
    )
    data: dict[str, Any] = Field(
        ...,
        description="The event payload data. Must include user_id.",
        examples=[{
            "user_id": "user_abc123",
            "product_id": "prod_123",
            "quantity": 2,
            "cart_total": 59.99,
            "timestamp": "2025-01-01T12:00:00Z",
        }],
    )


class EventIngestResponse(BaseModel):
    """Response after successfully ingesting an event."""
    
    success: bool = True
    event_id: str = Field(..., description="Unique event identifier")
    topic: str = Field(..., description="The Kafka topic the event was published to")
    event_type: str = Field(..., description="The event type that was ingested")
    timestamp: str = Field(..., description="Event timestamp")


class EventIngestBatchRequest(BaseModel):
    """Request model for batch event ingestion."""
    
    events: list[EventIngestRequest] = Field(
        ...,
        description="List of events to ingest",
        min_length=1,
        max_length=100,
    )


class EventIngestBatchResponse(BaseModel):
    """Response after batch event ingestion."""
    
    success: bool = True
    total: int = Field(..., description="Total events submitted")
    successful: int = Field(..., description="Successfully ingested events")
    failed: int = Field(..., description="Failed events")
    results: list[dict] = Field(..., description="Individual event results")


class AvailableTopicsResponse(BaseModel):
    """Response listing available Kafka topics."""
    
    topics: list[dict] = Field(..., description="List of available topics with their configurations")
    default_topic: str = Field(..., description="Default topic for custom events")


class IntegrationDetailsResponse(BaseModel):
    """API integration details for a datablock."""
    
    datablock_name: str
    kafka_topic: str
    endpoint: str
    method: str = "POST"
    headers: dict[str, str]
    example_payload: dict[str, Any]
    example_curl: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/events/topics",
    response_model=AvailableTopicsResponse,
    summary="List available Kafka topics",
    description="Get all available Kafka topics that events can be published to.",
)
async def list_topics():
    """List all available Kafka topics."""
    topics = []
    for topic_id, config in event_topic_config.topics.items():
        topics.append({
            "topic_id": config["topic_id"],
            "name": config["name"],
            "display_name": config["display_name"],
            "description": config["description"],
            "mapped_templates": config.get("mapped_templates", []),
        })
    
    return AvailableTopicsResponse(
        topics=topics,
        default_topic=event_topic_config.default_topic,
    )


@router.post(
    "/events/ingest",
    response_model=EventIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest a single event",
    description="""
    Ingest a data event and publish it to the specified Kafka topic.
    
    **Required fields:**
    - `topic`: The Kafka topic to publish to (e.g., cart_events, page_events)
    - `event_type`: Event type for categorization (e.g., cart.add, page.view)
    - `data`: Event payload with required `user_id` field
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    API Key format: `proj_{project_id}_{secret}`
    
    **Available topics**: Use GET /events/topics to see available topics.
    """,
)
async def ingest_event(
    request: EventIngestRequest,
    x_api_key: str = Header(..., description="API key (format: proj_{project_id}_{secret})"),
):
    """Ingest a single event to a Kafka topic."""
    # Extract project_id from API key
    project_id, _ = parse_api_key(x_api_key)
    
    # Validate topic exists
    valid_topics = event_topic_config.get_all_topic_names()
    if request.topic not in valid_topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid topic '{request.topic}'. Valid topics: {', '.join(valid_topics)}",
        )
    
    # Extract user_id from data (required for routing/storage)
    user_id = request.data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required field 'user_id' in data",
        )
    
    # Publish to Kafka
    try:
        producer = await get_kafka_producer()
        
        result = await producer.publish_event(
            event_type=request.event_type,
            user_id=user_id,
            data=request.data,
            project_id=project_id,
            topic=request.topic,
        )
        
        return EventIngestResponse(
            event_id=result["event_id"],
            topic=result["topic"],
            event_type=request.event_type,
            timestamp=result["timestamp"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish event: {str(e)}",
        )


@router.post(
    "/events/ingest/batch",
    response_model=EventIngestBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest multiple events",
    description="Ingest a batch of events (up to 100 at a time). Each event must specify its topic.",
)
async def ingest_events_batch(
    request: EventIngestBatchRequest,
    x_api_key: str = Header(..., description="API key (format: proj_{project_id}_{secret})"),
):
    """Ingest a batch of events."""
    # Extract project_id from API key
    project_id, _ = parse_api_key(x_api_key)
    
    producer = await get_kafka_producer()
    valid_topics = event_topic_config.get_all_topic_names()
    
    results = []
    successful = 0
    failed = 0
    
    for event in request.events:
        try:
            # Validate topic
            if event.topic not in valid_topics:
                results.append({
                    "event_type": event.event_type,
                    "topic": event.topic,
                    "success": False,
                    "error": f"Invalid topic '{event.topic}'",
                })
                failed += 1
                continue
            
            # Extract user_id from data
            user_id = event.data.get("user_id")
            if not user_id:
                results.append({
                    "event_type": event.event_type,
                    "topic": event.topic,
                    "success": False,
                    "error": "Missing required field 'user_id' in data",
                })
                failed += 1
                continue
            
            # Publish to Kafka
            result = await producer.publish_event(
                event_type=event.event_type,
                user_id=user_id,
                data=event.data,
                project_id=project_id,
                topic=event.topic,
            )
            
            results.append({
                "event_type": event.event_type,
                "topic": event.topic,
                "success": True,
                "event_id": result["event_id"],
            })
            successful += 1
            
        except Exception as e:
            results.append({
                "event_type": event.event_type,
                "topic": event.topic,
                "success": False,
                "error": str(e),
            })
            failed += 1
    
    return EventIngestBatchResponse(
        total=len(request.events),
        successful=successful,
        failed=failed,
        results=results,
    )


@router.get(
    "/projects/{project_id}/datablocks/{datablock_id}/integration",
    response_model=IntegrationDetailsResponse,
    summary="Get API integration details",
    description="Get API integration details for a deployed datablock.",
)
async def get_integration_details(
    project_id: str,
    datablock_id: str,
    db: Database,
):
    """Get integration details for a datablock."""
    datablock_service = DatablockService(db)
    datablock = await datablock_service.get_by_id(datablock_id, project_id)
    
    if not datablock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datablock not found",
        )
    
    # Get the kafka_topic for this datablock
    kafka_topic = datablock.get("kafka_topic") or event_topic_config.default_topic
    
    # Build example payload from schema - include ALL fields defined in the datablock
    example_data = {}
    for field in datablock.get("schema_fields", []):
        field_name = field.get("name", "field")
        field_type = field.get("type", "string")
        
        # Generate example value based on type
        if field_type == "string":
            if field_name == "user_id":
                example_data[field_name] = "user_abc123"
            elif field_name == "session_id":
                example_data[field_name] = "session_xyz789"
            elif field_name == "event_id":
                example_data[field_name] = "evt_123456"
            else:
                example_data[field_name] = f"example_{field_name}"
        elif field_type == "number":
            example_data[field_name] = 123.45
        elif field_type == "boolean":
            example_data[field_name] = True
        elif field_type == "date":
            example_data[field_name] = "2025-01-01T00:00:00Z"
        elif field_type == "array":
            example_data[field_name] = ["item1", "item2"]
        elif field_type == "object":
            example_data[field_name] = {"key": "value"}
        else:
            example_data[field_name] = None
    
    # Build the endpoint URL (no project_id in URL - extracted from API key)
    base_url = "https://api.cartnudge.ai"  # Production URL
    endpoint = f"{base_url}/api/v1/events/ingest"
    
    # API key format
    api_key_example = f"proj_{project_id}_sk_live_xxxxxxxxxx"
    
    # Build example payload - topic is required
    example_payload = {
        "topic": kafka_topic,
        "event_type": datablock["name"],
        "data": example_data,
    }
    
    # Build curl example
    import json
    curl_example = f'''curl -X POST "{endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: {api_key_example}" \\
  -d '{json.dumps(example_payload, indent=2)}'
'''
    
    return IntegrationDetailsResponse(
        datablock_name=datablock["name"],
        kafka_topic=kafka_topic,
        endpoint=endpoint,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key_example,
        },
        example_payload=example_payload,
        example_curl=curl_example,
    )
