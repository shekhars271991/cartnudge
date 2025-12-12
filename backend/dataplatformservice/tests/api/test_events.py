"""
Tests for Event Ingestion API endpoints.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


# -----------------------------------------------------------------------------
# API Key Parsing Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ingest_event_invalid_api_key_format(client: AsyncClient):
    """Test that invalid API key format is rejected."""
    response = await client.post(
        "/api/v1/events/ingest",
        json={
            "event_type": "cart_events",
            "data": {"user_id": "user_123", "product_id": "prod_456"},
        },
        headers={"X-API-Key": "invalid_key"},
    )
    
    assert response.status_code == 401
    assert "Invalid API key format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_ingest_event_missing_api_key(client: AsyncClient):
    """Test that missing API key is rejected."""
    response = await client.post(
        "/api/v1/events/ingest",
        json={
            "event_type": "cart_events",
            "data": {"user_id": "user_123"},
        },
    )
    
    assert response.status_code == 422  # Validation error - missing header


@pytest.mark.asyncio
async def test_ingest_event_missing_user_id(client: AsyncClient):
    """Test that missing user_id in data is rejected."""
    response = await client.post(
        "/api/v1/events/ingest",
        json={
            "event_type": "cart_events",
            "data": {"product_id": "prod_456"},  # Missing user_id
        },
        headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
    )
    
    assert response.status_code == 400
    assert "user_id" in response.json()["detail"]


@pytest.mark.asyncio
async def test_ingest_event_unknown_event_type(client: AsyncClient):
    """Test that unknown event type is rejected."""
    response = await client.post(
        "/api/v1/events/ingest",
        json={
            "event_type": "unknown_events",
            "data": {"user_id": "user_123"},
        },
        headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
    )
    
    assert response.status_code == 400
    assert "Unknown event type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_ingest_event_datablock_not_deployed(client: AsyncClient):
    """Test that ingesting to non-deployed datablock is rejected."""
    # Create a datablock but don't deploy it
    await client.post(
        "/api/v1/projects/test123456789/datablocks/from-template/cart_events"
    )
    
    # Try to ingest event
    response = await client.post(
        "/api/v1/events/ingest",
        json={
            "event_type": "cart_events",
            "data": {"user_id": "user_123", "product_id": "prod_456"},
        },
        headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
    )
    
    assert response.status_code == 400
    assert "not deployed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_ingest_event_success(client: AsyncClient):
    """Test successful event ingestion."""
    # Create and deploy a datablock
    create_response = await client.post(
        "/api/v1/projects/test123456789/datablocks/from-template/cart_events"
    )
    datablock_id = create_response.json()["_id"]
    
    # Mark as deployed
    await client.post(
        f"/api/v1/projects/test123456789/datablocks/{datablock_id}/mark-deployed"
    )
    
    # Mock the Kafka producer
    with patch("app.api.v1.events.get_kafka_producer") as mock_producer:
        mock_producer_instance = AsyncMock()
        mock_producer_instance.publish_event = AsyncMock(return_value={
            "event_id": "test_event_123",
            "topic": "events",
            "partition": 0,
            "offset": 1,
            "timestamp": "2025-01-01T00:00:00",
        })
        mock_producer.return_value = mock_producer_instance
        
        # Ingest event
        response = await client.post(
            "/api/v1/events/ingest",
            json={
                "event_type": "cart_events",
                "data": {
                    "user_id": "user_123",
                    "session_id": "session_456",
                    "product_id": "prod_789",
                    "quantity": 2,
                    "cart_total": 99.99,
                },
            },
            headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
        )
        
        assert response.status_code == 202
        data = response.json()
        assert data["success"] is True
        assert data["event_type"] == "cart_events"
        assert "event_id" in data
        assert "timestamp" in data


# -----------------------------------------------------------------------------
# Batch Ingestion Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ingest_batch_events(client: AsyncClient):
    """Test batch event ingestion."""
    # Create and deploy a datablock
    create_response = await client.post(
        "/api/v1/projects/test123456789/datablocks/from-template/cart_events"
    )
    datablock_id = create_response.json()["_id"]
    
    # Mark as deployed
    await client.post(
        f"/api/v1/projects/test123456789/datablocks/{datablock_id}/mark-deployed"
    )
    
    # Mock the Kafka producer
    with patch("app.api.v1.events.get_kafka_producer") as mock_producer:
        mock_producer_instance = AsyncMock()
        mock_producer_instance.publish_event = AsyncMock(return_value={
            "event_id": "test_event_123",
            "timestamp": "2025-01-01T00:00:00",
        })
        mock_producer.return_value = mock_producer_instance
        
        # Ingest batch
        response = await client.post(
            "/api/v1/events/ingest/batch",
            json={
                "events": [
                    {
                        "event_type": "cart_events",
                        "data": {"user_id": "user_1", "product_id": "prod_1"},
                    },
                    {
                        "event_type": "cart_events",
                        "data": {"user_id": "user_2", "product_id": "prod_2"},
                    },
                ],
            },
            headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
        )
        
        assert response.status_code == 202
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 2
        assert data["successful"] == 2
        assert data["failed"] == 0


@pytest.mark.asyncio
async def test_ingest_batch_partial_failure(client: AsyncClient):
    """Test batch ingestion with partial failures."""
    # Create and deploy a datablock
    create_response = await client.post(
        "/api/v1/projects/test123456789/datablocks/from-template/cart_events"
    )
    datablock_id = create_response.json()["_id"]
    
    # Mark as deployed
    await client.post(
        f"/api/v1/projects/test123456789/datablocks/{datablock_id}/mark-deployed"
    )
    
    # Mock the Kafka producer
    with patch("app.api.v1.events.get_kafka_producer") as mock_producer:
        mock_producer_instance = AsyncMock()
        mock_producer_instance.publish_event = AsyncMock(return_value={
            "event_id": "test_event_123",
            "timestamp": "2025-01-01T00:00:00",
        })
        mock_producer.return_value = mock_producer_instance
        
        # Ingest batch with one invalid event (unknown event type)
        response = await client.post(
            "/api/v1/events/ingest/batch",
            json={
                "events": [
                    {
                        "event_type": "cart_events",
                        "data": {"user_id": "user_1", "product_id": "prod_1"},
                    },
                    {
                        "event_type": "unknown_events",  # Invalid
                        "data": {"user_id": "user_2"},
                    },
                ],
            },
            headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
        )
        
        assert response.status_code == 202
        data = response.json()
        assert data["total"] == 2
        assert data["successful"] == 1
        assert data["failed"] == 1


@pytest.mark.asyncio
async def test_ingest_batch_missing_user_id(client: AsyncClient):
    """Test batch ingestion with missing user_id."""
    # Create and deploy a datablock
    create_response = await client.post(
        "/api/v1/projects/test123456789/datablocks/from-template/cart_events"
    )
    datablock_id = create_response.json()["_id"]
    
    await client.post(
        f"/api/v1/projects/test123456789/datablocks/{datablock_id}/mark-deployed"
    )
    
    with patch("app.api.v1.events.get_kafka_producer") as mock_producer:
        mock_producer_instance = AsyncMock()
        mock_producer.return_value = mock_producer_instance
        
        response = await client.post(
            "/api/v1/events/ingest/batch",
            json={
                "events": [
                    {
                        "event_type": "cart_events",
                        "data": {"product_id": "prod_1"},  # Missing user_id
                    },
                ],
            },
            headers={"X-API-Key": "proj_test123456789_sk_live_secret"},
        )
        
        assert response.status_code == 202
        data = response.json()
        assert data["failed"] == 1
        assert "user_id" in data["results"][0]["error"]


