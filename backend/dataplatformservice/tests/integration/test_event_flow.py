"""
Integration tests for the complete event ingestion flow.

Tests the full pipeline:
1. Customer calls event ingestion API
2. API publishes event to Kafka
3. Consumer reads from Kafka
4. Consumer writes to Aerospike

Requires running services for end-to-end tests:
- MongoDB
- Kafka
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
# Unit Tests - Consumer Processing
# =============================================================================

class TestPersistDataConsumer:
    """Tests for the PersistData consumer."""

    @pytest.mark.asyncio
    async def test_message_processing(self, sample_cart_event):
        """Test that consumer correctly processes messages."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        
        with patch("runtime.ingestion.persist_data_consumer.get_aerospike_service") as mock_get_aerospike:
            mock_aerospike_instance = MagicMock()
            mock_aerospike_instance.put_event_data = MagicMock(return_value=True)
            mock_get_aerospike.return_value = mock_aerospike_instance
            
            consumer = PersistDataConsumer()
            consumer.aerospike = mock_aerospike_instance
            
            # Create a mock Kafka message
            mock_message = MagicMock()
            mock_message.value = {
                "event_id": "evt_123",
                "event_type": "cart_events",
                "user_id": TEST_USER_ID,
                "project_id": TEST_PROJECT_ID,
                "data": sample_cart_event["data"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            # Process the message
            result = await consumer.process_message(mock_message)
            
            # Verify success
            assert result is True
            
            # Verify Aerospike was called with correct parameters
            mock_aerospike_instance.put_event_data.assert_called_once()
            call_kwargs = mock_aerospike_instance.put_event_data.call_args[1]
            assert call_kwargs["project_id"] == TEST_PROJECT_ID
            assert call_kwargs["user_id"] == TEST_USER_ID
            assert call_kwargs["event_type"] == "cart_events"

    @pytest.mark.asyncio
    async def test_batch_message_processing(self):
        """Test processing multiple events in batch."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        
        with patch("runtime.ingestion.persist_data_consumer.get_aerospike_service") as mock_get_aerospike:
            mock_aerospike_instance = MagicMock()
            mock_aerospike_instance.put_event_data = MagicMock(return_value=True)
            mock_get_aerospike.return_value = mock_aerospike_instance
            
            consumer = PersistDataConsumer()
            consumer.aerospike = mock_aerospike_instance
            
            # Create multiple mock messages
            messages = []
            for i in range(5):
                mock_message = MagicMock()
                mock_message.value = {
                    "event_id": f"evt_{i}",
                    "event_type": "cart_events",
                    "user_id": f"user_{i}",
                    "project_id": TEST_PROJECT_ID,
                    "data": {"user_id": f"user_{i}", "product_id": f"prod_{i}"},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                messages.append(mock_message)
            
            # Process each message
            for msg in messages:
                await consumer.process_message(msg)
            
            # Verify all events were written
            assert mock_aerospike_instance.put_event_data.call_count == 5

    @pytest.mark.asyncio
    async def test_invalid_message_handling(self):
        """Test handling of invalid messages (missing required fields)."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        
        with patch("runtime.ingestion.persist_data_consumer.get_aerospike_service") as mock_get_aerospike:
            mock_aerospike_instance = MagicMock()
            mock_get_aerospike.return_value = mock_aerospike_instance
            
            consumer = PersistDataConsumer()
            consumer.aerospike = mock_aerospike_instance
            
            # Create an invalid message (missing user_id)
            mock_message = MagicMock()
            mock_message.value = {
                "event_id": "evt_invalid",
                "event_type": "cart_events",
                # Missing user_id and project_id
                "data": {"product_id": "prod_1"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            # Process the message
            result = await consumer.process_message(mock_message)
            
            # Should return False for invalid messages
            assert result is False
            
            # Aerospike should not be called
            mock_aerospike_instance.put_event_data.assert_not_called()

    @pytest.mark.asyncio
    async def test_aerospike_key_format(self, sample_cart_event):
        """Test that Aerospike key is formatted correctly as user_id:event_type."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        
        captured_args = {}
        
        with patch("runtime.ingestion.persist_data_consumer.get_aerospike_service") as mock_get_aerospike:
            mock_aerospike_instance = MagicMock()
            
            def capture_put(**kwargs):
                captured_args.update(kwargs)
                return True
            
            mock_aerospike_instance.put_event_data = capture_put
            mock_get_aerospike.return_value = mock_aerospike_instance
            
            consumer = PersistDataConsumer()
            consumer.aerospike = mock_aerospike_instance
            
            mock_message = MagicMock()
            mock_message.value = {
                "event_id": "evt_key_test",
                "event_type": "cart_events",
                "user_id": "user_abc",
                "project_id": "project_xyz",
                "data": {"user_id": "user_abc", "product_id": "prod_1"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            await consumer.process_message(mock_message)
            
            # Verify the key components
            assert captured_args["user_id"] == "user_abc"
            assert captured_args["event_type"] == "cart_events"
            assert captured_args["project_id"] == "project_xyz"


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
    async def test_kafka_to_aerospike_flow(self, sample_cart_event):
        """Test the flow from Kafka message to Aerospike storage."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        
        stored_data = {}
        
        with patch("runtime.ingestion.persist_data_consumer.get_aerospike_service") as mock_get_aerospike:
            mock_aerospike_instance = MagicMock()
            
            def capture_put(project_id, user_id, event_type, data):
                key = f"{project_id}/{user_id}:{event_type}"
                stored_data[key] = data
                return True
            
            mock_aerospike_instance.put_event_data = capture_put
            mock_get_aerospike.return_value = mock_aerospike_instance
            
            consumer = PersistDataConsumer()
            consumer.aerospike = mock_aerospike_instance
            
            # Create a mock Kafka message
            mock_message = MagicMock()
            mock_message.value = {
                "event_id": "evt_kafka_123",
                "event_type": "cart_events",
                "user_id": TEST_USER_ID,
                "project_id": TEST_PROJECT_ID,
                "data": sample_cart_event["data"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            # Process the message
            result = await consumer.process_message(mock_message)
            
            # Verify success
            assert result is True
            
            # Verify data was stored in Aerospike
            expected_key = f"{TEST_PROJECT_ID}/{TEST_USER_ID}:cart_events"
            assert expected_key in stored_data

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
                    "data": {"user_id": "user_1", "product_id": "prod_1", "quantity": 1},
                },
                {
                    "event_type": "cart_events",
                    "data": {"user_id": "user_2", "product_id": "prod_2", "quantity": 3},
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
            assert len(published_events) == 2

    @pytest.mark.asyncio
    async def test_batch_api_ingestion(self, client: AsyncClient):
        """Test batch event ingestion via API."""
        # Create and deploy cart_events datablock
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
    async def test_real_kafka_publish_and_consume(self, client: AsyncClient, sample_cart_event):
        """Test real Kafka publish and consume with actual infrastructure."""
        from runtime.ingestion.persist_data_consumer import PersistDataConsumer
        from app.services.kafka_producer import get_kafka_producer
        
        # Create and deploy a datablock
        create_response = await client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/from-template/cart_events"
        )
        datablock_id = create_response.json()["_id"]
        await client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/datablocks/{datablock_id}/mark-deployed"
        )
        
        # Publish event via API (uses real Kafka)
        response = await client.post(
            "/api/v1/events/ingest",
            json=sample_cart_event,
            headers={"X-API-Key": f"proj_{TEST_PROJECT_ID}_sk_live_secret"},
        )
        
        assert response.status_code == 202
        
        # Start consumer to read the event
        consumer = PersistDataConsumer(group_id="test-consumer-e2e")
        await consumer.start()
        
        # Consume for a short time
        events_received = []
        timeout = 10  # seconds
        start_time = asyncio.get_event_loop().time()
        
        async for message in consumer.consumer:
            events_received.append(message.value)
            if asyncio.get_event_loop().time() - start_time > timeout:
                break
            if len(events_received) >= 1:
                break
        
        await consumer.stop()
        
        # Verify event was received
        assert len(events_received) >= 1
        received_event = events_received[0]
        assert received_event["event_type"] == "cart_events"
        assert received_event["user_id"] == TEST_USER_ID

    @pytest.mark.asyncio
    async def test_real_aerospike_storage(self):
        """Test real Aerospike read/write operations."""
        from app.services.aerospike_service import get_aerospike_service
        
        aerospike = get_aerospike_service()
        
        test_data = {
            "user_id": "test_user_e2e",
            "product_id": "prod_e2e_123",
            "quantity": 5,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        # Write data
        success = aerospike.put_event_data(
            project_id=TEST_PROJECT_ID,
            user_id="test_user_e2e",
            event_type="cart_events",
            data=test_data,
        )
        assert success is True
        
        # Read data back
        result = aerospike.get_event_data(
            project_id=TEST_PROJECT_ID,
            user_id="test_user_e2e",
            event_type="cart_events",
        )
        
        assert result is not None
        assert result["product_id"] == "prod_e2e_123"
        
        aerospike.disconnect()
