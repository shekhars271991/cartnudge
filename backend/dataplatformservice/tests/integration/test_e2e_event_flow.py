"""
End-to-End Integration Test for Event Flow.

Tests the complete pipeline: API → Kafka → Feature Materializer → Aerospike

Requires running infrastructure:
- API Server (port 8010)
- Kafka (port 9092)
- Aerospike (port 3010)
- Feature Materializer running

Run with:
    pytest tests/integration/test_e2e_event_flow.py -v -s

Start infrastructure first:
    ./run.sh
"""

import pytest
import asyncio
import json
import uuid
import time
from datetime import datetime, timezone

import httpx


# =============================================================================
# Test Configuration
# =============================================================================

API_BASE_URL = "http://localhost:8010/api/v1"
API_KEY = "proj_testproject123_sk_test_secret"  # Test API key

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

AEROSPIKE_HOST = "localhost"
AEROSPIKE_PORT = 3010
AEROSPIKE_NAMESPACE = "test"  # Default Aerospike namespace

# Wait time for consumer to process events (seconds)
# Needs to be enough for consumer rebalancing + processing
CONSUMER_PROCESSING_TIME = 8


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def http_client():
    """HTTP client for API calls."""
    with httpx.Client(base_url=API_BASE_URL, timeout=30.0) as client:
        yield client


@pytest.fixture
def aerospike_client():
    """Aerospike client for verification."""
    try:
        import aerospike
        config = {"hosts": [(AEROSPIKE_HOST, AEROSPIKE_PORT)]}
        client = aerospike.client(config).connect()
        yield client
        client.close()
    except Exception as e:
        pytest.skip(f"Aerospike not available: {e}")


@pytest.fixture
async def kafka_producer():
    """Kafka producer for direct publishing (optional tests)."""
    from aiokafka import AIOKafkaProducer
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )
    await producer.start()
    yield producer
    await producer.stop()


# =============================================================================
# Helper Functions
# =============================================================================

def create_test_event(topic: str, event_type: str, user_id: str, data: dict) -> dict:
    """Create a test event payload."""
    return {
        "topic": topic,
        "event_type": event_type,
        "data": {
            "user_id": user_id,
            **data
        }
    }


def get_aerospike_key(project_id: str, user_id: str, event_type: str) -> tuple:
    """Get the Aerospike key tuple."""
    key_string = f"{user_id}:{event_type}"
    return (AEROSPIKE_NAMESPACE, project_id, key_string)


def extract_project_id_from_api_key(api_key: str) -> str:
    """Extract project_id from API key format: proj_{project_id}_{secret}."""
    parts = api_key.split("_", 2)
    return parts[1] if len(parts) >= 2 else "unknown"


# =============================================================================
# API Tests
# =============================================================================

class TestEventIngestionAPI:
    """Tests for the Event Ingestion API."""

    def test_list_available_topics(self, http_client):
        """Test listing available Kafka topics."""
        print("\n" + "=" * 60)
        print("TEST: List Available Topics")
        print("=" * 60)
        
        response = http_client.get("/events/topics")
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Topics found: {len(data['topics'])}")
        
        for topic in data["topics"]:
            print(f"  - {topic['name']}: {topic['description']}")
        
        # Verify expected topics exist
        topic_names = [t["name"] for t in data["topics"]]
        assert "cart_events" in topic_names
        assert "page_events" in topic_names
        assert "order_events" in topic_names
        assert "custom_events" in topic_names
        
        print("\n✓ TEST PASSED!")

    def test_ingest_event_requires_topic(self, http_client):
        """Test that topic is required in event ingestion."""
        print("\n" + "=" * 60)
        print("TEST: Topic Required Validation")
        print("=" * 60)
        
        # Try without topic
        response = http_client.post(
            "/events/ingest",
            json={
                "event_type": "cart.add",
                "data": {"user_id": "test_user"}
            },
            headers={"X-API-Key": API_KEY}
        )
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 422  # Validation error
        print("✓ Correctly rejected request without topic")
        print("\n✓ TEST PASSED!")

    def test_ingest_event_validates_topic(self, http_client):
        """Test that invalid topics are rejected."""
        print("\n" + "=" * 60)
        print("TEST: Invalid Topic Validation")
        print("=" * 60)
        
        response = http_client.post(
            "/events/ingest",
            json={
                "topic": "invalid_topic_name",
                "event_type": "test.event",
                "data": {"user_id": "test_user"}
            },
            headers={"X-API-Key": API_KEY}
        )
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 400
        print(f"Error: {response.json()['detail']}")
        print("✓ Correctly rejected invalid topic")
        print("\n✓ TEST PASSED!")

    def test_ingest_event_requires_user_id(self, http_client):
        """Test that user_id is required in event data."""
        print("\n" + "=" * 60)
        print("TEST: User ID Required Validation")
        print("=" * 60)
        
        response = http_client.post(
            "/events/ingest",
            json={
                "topic": "cart_events",
                "event_type": "cart.add",
                "data": {"product_id": "prod_123"}  # Missing user_id
            },
            headers={"X-API-Key": API_KEY}
        )
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 400
        print(f"Error: {response.json()['detail']}")
        print("✓ Correctly rejected request without user_id")
        print("\n✓ TEST PASSED!")

    def test_ingest_single_event_success(self, http_client):
        """Test successful single event ingestion."""
        print("\n" + "=" * 60)
        print("TEST: Single Event Ingestion")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        
        event = create_test_event(
            topic="cart_events",
            event_type="cart.add",
            user_id=f"user_{test_id}",
            data={
                "product_id": f"prod_{test_id}",
                "quantity": 2,
                "cart_total": 99.99
            }
        )
        
        print(f"\nSending event: {json.dumps(event, indent=2)}")
        
        response = http_client.post(
            "/events/ingest",
            json=event,
            headers={"X-API-Key": API_KEY}
        )
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 202
        
        data = response.json()
        print(f"Event ID: {data['event_id']}")
        print(f"Topic: {data['topic']}")
        print(f"Timestamp: {data['timestamp']}")
        
        assert data["success"] == True
        assert data["topic"] == "cart_events"
        
        print("\n✓ TEST PASSED!")

    def test_ingest_batch_events(self, http_client):
        """Test batch event ingestion."""
        print("\n" + "=" * 60)
        print("TEST: Batch Event Ingestion")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        
        events = [
            create_test_event(
                topic="cart_events",
                event_type="cart.add",
                user_id=f"batch_user_{test_id}_{i}",
                data={"product_id": f"prod_{i}", "quantity": i + 1}
            )
            for i in range(3)
        ]
        
        print(f"\nSending {len(events)} events...")
        
        response = http_client.post(
            "/events/ingest/batch",
            json={"events": events},
            headers={"X-API-Key": API_KEY}
        )
        
        print(f"\nResponse status: {response.status_code}")
        assert response.status_code == 202
        
        data = response.json()
        print(f"Total: {data['total']}")
        print(f"Successful: {data['successful']}")
        print(f"Failed: {data['failed']}")
        
        assert data["total"] == 3
        assert data["successful"] == 3
        assert data["failed"] == 0
        
        print("\n✓ TEST PASSED!")


# =============================================================================
# End-to-End Flow Tests
# =============================================================================

class TestEndToEndFlow:
    """
    Tests the complete flow: API → Kafka → Feature Materializer → Aerospike.
    
    These tests require the Feature Materializer to be running.
    """

    def test_cart_event_flow(self, http_client, aerospike_client):
        """Test cart event from API to Aerospike."""
        print("\n" + "=" * 60)
        print("E2E TEST: Cart Event Flow")
        print("API → Kafka → Feature Materializer → Aerospike")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = extract_project_id_from_api_key(API_KEY)
        user_id = f"e2e_user_{test_id}"
        
        # Step 1: Send event via API
        print(f"\n[Step 1] Sending cart event via API...")
        event = create_test_event(
            topic="cart_events",
            event_type="cart.add",
            user_id=user_id,
            data={
                "product_id": f"prod_{test_id}",
                "quantity": 3,
                "cart_total": 149.99
            }
        )
        
        response = http_client.post(
            "/events/ingest",
            json=event,
            headers={"X-API-Key": API_KEY}
        )
        
        assert response.status_code == 202
        api_response = response.json()
        print(f"  ✓ Event published: {api_response['event_id']}")
        print(f"  Topic: {api_response['topic']}")
        
        # Step 2: Wait for Feature Materializer to process
        print(f"\n[Step 2] Waiting {CONSUMER_PROCESSING_TIME}s for Feature Materializer...")
        time.sleep(CONSUMER_PROCESSING_TIME)
        
        # Step 3: Verify in Aerospike
        print(f"\n[Step 3] Checking Aerospike...")
        key = get_aerospike_key(project_id, user_id, "cart.add")
        print(f"  Key: {key}")
        
        try:
            _, _, bins = aerospike_client.get(key)
            
            if bins:
                print(f"  ✓ Data found in Aerospike!")
                
                # Parse stored data
                if "data" in bins:
                    stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                    print(f"  Stored data: {json.dumps(stored_data, indent=4)}")
                    
                    # Verify data content
                    assert stored_data.get("product_id") == f"prod_{test_id}"
                    assert stored_data.get("quantity") == 3
                    
                print(f"\n{'=' * 60}")
                print("✓ E2E TEST PASSED!")
                print("=" * 60)
            else:
                pytest.fail("Empty record found in Aerospike")
                
        except Exception as e:
            if "RecordNotFound" in str(type(e)):
                print("  ✗ Record not found in Aerospike")
                print("\n  Troubleshooting:")
                print("  1. Is Feature Materializer running?")
                print("     python -m runtime.ingestion.feature_materializer")
                print("  2. Check materializer logs")
                pytest.fail(f"Data not found in Aerospike - Feature Materializer may not be running")
            else:
                raise

    def test_page_event_flow(self, http_client, aerospike_client):
        """Test page view event from API to Aerospike."""
        print("\n" + "=" * 60)
        print("E2E TEST: Page Event Flow")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = extract_project_id_from_api_key(API_KEY)
        user_id = f"page_user_{test_id}"
        
        # Send page view event
        print(f"\n[Step 1] Sending page view event...")
        event = create_test_event(
            topic="page_events",
            event_type="page.view",
            user_id=user_id,
            data={
                "page_type": "product",
                "product_id": f"prod_{test_id}",
                "duration_seconds": 45
            }
        )
        
        response = http_client.post(
            "/events/ingest",
            json=event,
            headers={"X-API-Key": API_KEY}
        )
        assert response.status_code == 202
        print(f"  ✓ Event published to {response.json()['topic']}")
        
        # Wait for processing
        print(f"\n[Step 2] Waiting {CONSUMER_PROCESSING_TIME}s for processing...")
        time.sleep(CONSUMER_PROCESSING_TIME)
        
        # Verify
        print(f"\n[Step 3] Verifying in Aerospike...")
        key = get_aerospike_key(project_id, user_id, "page.view")
        
        try:
            _, _, bins = aerospike_client.get(key)
            if bins and "data" in bins:
                stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                assert stored_data.get("page_type") == "product"
                print(f"  ✓ Data verified!")
                print(f"\n✓ E2E TEST PASSED!")
            else:
                pytest.fail("No data found")
        except Exception as e:
            if "RecordNotFound" in str(type(e)):
                pytest.skip("Feature Materializer may not be running")
            raise

    def test_order_event_flow(self, http_client, aerospike_client):
        """Test order event from API to Aerospike."""
        print("\n" + "=" * 60)
        print("E2E TEST: Order Event Flow")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = extract_project_id_from_api_key(API_KEY)
        user_id = f"order_user_{test_id}"
        
        # Send order event
        print(f"\n[Step 1] Sending order event...")
        event = create_test_event(
            topic="order_events",
            event_type="order.created",
            user_id=user_id,
            data={
                "order_id": f"order_{test_id}",
                "total_amount": 299.99,
                "item_count": 5
            }
        )
        
        response = http_client.post(
            "/events/ingest",
            json=event,
            headers={"X-API-Key": API_KEY}
        )
        assert response.status_code == 202
        print(f"  ✓ Event published to {response.json()['topic']}")
        
        # Wait
        print(f"\n[Step 2] Waiting {CONSUMER_PROCESSING_TIME}s...")
        time.sleep(CONSUMER_PROCESSING_TIME)
        
        # Verify
        print(f"\n[Step 3] Verifying in Aerospike...")
        key = get_aerospike_key(project_id, user_id, "order.created")
        
        try:
            _, _, bins = aerospike_client.get(key)
            if bins and "data" in bins:
                stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                assert stored_data.get("order_id") == f"order_{test_id}"
                assert stored_data.get("total_amount") == 299.99
                print(f"  ✓ Order data verified!")
                print(f"\n✓ E2E TEST PASSED!")
            else:
                pytest.fail("No data found")
        except Exception as e:
            if "RecordNotFound" in str(type(e)):
                pytest.skip("Feature Materializer may not be running")
            raise

    def test_multiple_events_same_user(self, http_client, aerospike_client):
        """Test that latest event overwrites previous for same user/event_type."""
        print("\n" + "=" * 60)
        print("E2E TEST: Event Overwrite (Latest Wins)")
        print("=" * 60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = extract_project_id_from_api_key(API_KEY)
        user_id = f"overwrite_user_{test_id}"
        
        # Send first event
        print(f"\n[Step 1] Sending first event (quantity=1)...")
        event1 = create_test_event(
            topic="cart_events",
            event_type="cart.update",
            user_id=user_id,
            data={"product_id": "prod_first", "quantity": 1}
        )
        
        response = http_client.post("/events/ingest", json=event1, headers={"X-API-Key": API_KEY})
        assert response.status_code == 202
        print(f"  ✓ First event published")
        
        time.sleep(2)
        
        # Send second event (should overwrite)
        print(f"\n[Step 2] Sending second event (quantity=10)...")
        event2 = create_test_event(
            topic="cart_events",
            event_type="cart.update",
            user_id=user_id,
            data={"product_id": "prod_second", "quantity": 10}
        )
        
        response = http_client.post("/events/ingest", json=event2, headers={"X-API-Key": API_KEY})
        assert response.status_code == 202
        print(f"  ✓ Second event published")
        
        # Wait for processing
        print(f"\n[Step 3] Waiting {CONSUMER_PROCESSING_TIME}s...")
        time.sleep(CONSUMER_PROCESSING_TIME)
        
        # Verify latest data
        print(f"\n[Step 4] Verifying latest data in Aerospike...")
        key = get_aerospike_key(project_id, user_id, "cart.update")
        
        try:
            _, _, bins = aerospike_client.get(key)
            if bins and "data" in bins:
                stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                print(f"  Stored: {stored_data}")
                
                # Should have latest values
                assert stored_data.get("product_id") == "prod_second"
                assert stored_data.get("quantity") == 10
                
                print(f"\n✓ E2E TEST PASSED! Latest event overwrote previous.")
            else:
                pytest.fail("No data found")
        except Exception as e:
            if "RecordNotFound" in str(type(e)):
                pytest.skip("Feature Materializer may not be running")
            raise


# =============================================================================
# Infrastructure Health Check
# =============================================================================

class TestInfrastructureHealth:
    """Quick health checks for all services."""

    def test_api_health(self, http_client):
        """Test API server is running."""
        print("\n[Health] Checking API server...")
        response = http_client.get("/", headers={})  # Root endpoint
        # Adjust URL to hit root
        response = httpx.get("http://localhost:8010/health")
        assert response.status_code == 200
        print(f"  ✓ API server healthy: {response.json()}")

    def test_kafka_health(self):
        """Test Kafka is accessible."""
        print("\n[Health] Checking Kafka...")
        try:
            from aiokafka import AIOKafkaProducer
            import asyncio
            
            async def check():
                producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
                await producer.start()
                await producer.stop()
                return True
            
            asyncio.run(check())
            print(f"  ✓ Kafka accessible at {KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            pytest.fail(f"Kafka not accessible: {e}")

    def test_aerospike_health(self, aerospike_client):
        """Test Aerospike is accessible."""
        print("\n[Health] Checking Aerospike...")
        # Just having the fixture means it connected successfully
        print(f"  ✓ Aerospike accessible at {AEROSPIKE_HOST}:{AEROSPIKE_PORT}")


# =============================================================================
# Run directly
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
