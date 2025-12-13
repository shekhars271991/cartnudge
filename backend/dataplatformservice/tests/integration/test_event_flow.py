"""
Integration tests for the complete event ingestion flow.

Tests the full pipeline:
1. Customer calls event ingestion API
2. API publishes event to Kafka
3. Feature Materializer reads from Kafka and writes to ClickHouse
4. Feature Aggregator computes features and stores in Aerospike

Requires running services for end-to-end tests:
- MongoDB
- Kafka
- ClickHouse
- Aerospike
"""

import pytest
import asyncio
import json
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient
from bson import ObjectId


# =============================================================================
# Test Configuration
# =============================================================================

TEST_PROJECT_ID = "test-project-integration"
TEST_USER_ID = "user_integration_123"
TEST_SESSION_ID = "session_abc"


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def sample_cart_event():
    """Sample cart event data."""
    return {
        "event_type": "cart_events",
        "data": {
            "user_id": TEST_USER_ID,
            "session_id": TEST_SESSION_ID,
            "event_type": "add_to_cart",
            "product_id": "prod_12345",
            "quantity": 2,
            "cart_total": 149.99,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@pytest.fixture
def sample_page_view_event():
    """Sample page view event data."""
    return {
        "event_type": "page_views",
        "data": {
            "user_id": TEST_USER_ID,
            "session_id": TEST_SESSION_ID,
            "page_url": "/products/shoes",
            "referrer": "/home",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


# =============================================================================
# Integration Tests - API to Kafka (with mocks)
# =============================================================================

class TestEventApiFlow:
    """Tests for API to Kafka flow."""

    @pytest.mark.asyncio
    async def test_api_to_kafka_flow(self, client: AsyncClient, sample_cart_event):
        """Test the flow from API to Kafka publication."""
        # Create and deploy a datablock first
        create_response = await client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/from-template/cart_events"
        )
        assert create_response.status_code == 201
        datablock_id = create_response.json()["_id"]
        
        # Mark as deployed
        await client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/{datablock_id}/mark-deployed"
        )
        
        # Mock Kafka producer
        with patch("app.api.v1.events.get_kafka_producer") as mock_get_producer:
            mock_producer = AsyncMock()
            published_event = None
            
            async def capture_publish(**kwargs):
                nonlocal published_event
                published_event = kwargs
                return {
                    "event_id": "evt_test_123",
                    "topic": "events",
                    "partition": 0,
                    "offset": 1,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            
            mock_producer.publish_event = capture_publish
            mock_get_producer.return_value = mock_producer
            
            # Call the event ingestion API
            response = await client.post(
                "/api/v1/events/ingest",
                json=sample_cart_event,
                headers={"X-API-Key": f"proj_{TEST_PROJECT_ID}_sk_live_secret"},
            )
            
            assert response.status_code == 202
            data = response.json()
            assert data["success"] is True
            assert data["event_type"] == "cart_events"
            
            # Verify Kafka publish was called with correct data
            assert published_event is not None
            assert published_event["event_type"] == "cart_events"
            assert published_event["user_id"] == TEST_USER_ID
            assert published_event["project_id"] == TEST_PROJECT_ID

    @pytest.mark.asyncio
    async def test_complete_flow_with_multiple_events(self, client: AsyncClient):
        """Test complete flow with multiple events."""
        # Create and deploy datablocks
        for template in ["cart_events", "page_views"]:
            create_response = await client.post(
                f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/from-template/{template}"
            )
            if create_response.status_code == 201:
                datablock_id = create_response.json()["_id"]
                await client.post(
                    f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/{datablock_id}/mark-deployed"
                )
        
        # Track published events
        published_events = []
        
        with patch("app.api.v1.events.get_kafka_producer") as mock_get_producer:
            mock_producer = AsyncMock()
            
            async def capture_publish(**kwargs):
                published_events.append(kwargs)
                return {
                    "event_id": f"evt_{len(published_events)}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            
            mock_producer.publish_event = capture_publish
            mock_get_producer.return_value = mock_producer
            
            # Send multiple events
            events = [
                {
                    "event_type": "cart_events",
                    "data": {
                        "user_id": TEST_USER_ID,
                        "session_id": TEST_SESSION_ID,
                        "product_id": "prod_1",
                        "quantity": 1,
                    }
                },
                {
                    "event_type": "cart_events",
                    "data": {
                        "user_id": TEST_USER_ID,
                        "session_id": TEST_SESSION_ID,
                        "product_id": "prod_2",
                        "quantity": 2,
                    }
                },
                {
                    "event_type": "page_views",
                    "data": {
                        "user_id": TEST_USER_ID,
                        "session_id": TEST_SESSION_ID,
                        "page_url": "/checkout",
                    }
                },
            ]
            
            for event in events:
                response = await client.post(
                    "/api/v1/events/ingest",
                    json=event,
                    headers={"X-API-Key": f"proj_{TEST_PROJECT_ID}_sk_live_secret"},
                )
                assert response.status_code == 202
            
            # Verify all events were published
            assert len(published_events) == 3
            
            # Verify event types
            event_types = [e["event_type"] for e in published_events]
            assert event_types.count("cart_events") == 2
            assert event_types.count("page_views") == 1

    @pytest.mark.asyncio
    async def test_batch_event_ingestion(self, client: AsyncClient):
        """Test batch event ingestion."""
        # Create and deploy datablock
        create_response = await client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/from-template/cart_events"
        )
        if create_response.status_code == 201:
            datablock_id = create_response.json()["_id"]
            await client.post(
                f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/{datablock_id}/mark-deployed"
            )
        
        published_events = []
        
        with patch("app.api.v1.events.get_kafka_producer") as mock_get_producer:
            mock_producer = AsyncMock()
            
            async def capture_publish(**kwargs):
                published_events.append(kwargs)
                return {
                    "event_id": f"evt_{len(published_events)}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            
            mock_producer.publish_event = capture_publish
            mock_get_producer.return_value = mock_producer
            
            # Send batch of events
            batch_request = {
                "events": [
                    {"event_type": "cart_events", "data": {"user_id": f"user_{i}", "product_id": f"prod_{i}"}}
                    for i in range(10)
                ]
            }
            
            response = await client.post(
                "/api/v1/events/ingest/batch",
                json=batch_request,
                headers={"X-API-Key": f"proj_{TEST_PROJECT_ID}_sk_live_secret"},
            )
            
            assert response.status_code == 202
            data = response.json()
            assert data["success"] is True
            assert data["total"] == 10
            assert data["successful"] == 10
            
            # Verify all events were published to Kafka
            assert len(published_events) == 10


# =============================================================================
# End-to-End Tests (requires running infrastructure)
# =============================================================================

@pytest.mark.skip(reason="Requires running Kafka and Aerospike infrastructure")
class TestEndToEndEventFlow:
    """
    End-to-end tests that require actual running infrastructure.
    
    To run these tests manually:
    1. Start the infrastructure: cd dataplatformservice && docker-compose up -d
    2. Run with: pytest tests/integration/test_event_flow.py::TestEndToEndEventFlow -v --runinfra
    """

    @pytest.mark.asyncio
    async def test_real_aerospike_feature_storage(self):
        """Test real Aerospike feature storage operations."""
        from app.services.aerospike_service import get_aerospike_service
        
        aerospike = get_aerospike_service()
        
        test_features = {
            "views_30d": 100,
            "sessions_30d": 25,
            "engagement_score": 75.5,
        }
        
        # Write feature group
        success = aerospike.put_feature_group(
            project_id=TEST_PROJECT_ID,
            user_id="test_user_e2e",
            feature_group="page",
            features=test_features,
        )
        assert success is True
        
        # Read feature group back
        result = aerospike.get_feature_group(
            project_id=TEST_PROJECT_ID,
            user_id="test_user_e2e",
            feature_group="page",
        )
        
        assert result is not None
        assert result["views_30d"] == 100
        assert result["sessions_30d"] == 25
        
        aerospike.disconnect()

    @pytest.mark.asyncio
    async def test_real_all_feature_groups(self):
        """Test retrieving all feature groups for a user."""
        from app.services.aerospike_service import get_aerospike_service
        
        aerospike = get_aerospike_service()
        
        # Store multiple feature groups
        groups_data = {
            "cart": {"adds_30d": 5, "removes_7d": 1},
            "page": {"views_30d": 50, "sessions_30d": 10},
            "order": {"count_30d": 2, "revenue_30d": 150.00},
        }
        
        for group, features in groups_data.items():
            aerospike.put_feature_group(
                project_id=TEST_PROJECT_ID,
                user_id="test_user_all_groups",
                feature_group=group,
                features=features,
            )
        
        # Retrieve all groups
        all_groups = aerospike.get_all_feature_groups(
            project_id=TEST_PROJECT_ID,
            user_id="test_user_all_groups",
        )
        
        assert "cart" in all_groups
        assert "page" in all_groups
        assert "order" in all_groups
        assert all_groups["cart"]["features"]["adds_30d"] == 5
        assert all_groups["page"]["features"]["views_30d"] == 50
        
        aerospike.disconnect()
