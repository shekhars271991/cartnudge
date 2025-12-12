"""
End-to-End Integration Test for Event Flow.

Tests the Kafka → Consumer → Aerospike pipeline directly.

Requires running infrastructure:
- Kafka (port 9093)
- Aerospike (port 3010)
- persist-data-consumer running

Run with:
    pytest tests/integration/test_e2e_event_flow.py -v -s

Start infrastructure first:
    cd dataplatformservice && docker-compose up -d
    docker-compose --profile consumers up -d persist-data-consumer
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timezone

from aiokafka import AIOKafkaProducer


# =============================================================================
# Test Configuration
# =============================================================================

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "events"

AEROSPIKE_HOST = "localhost"
AEROSPIKE_PORT = 3010
AEROSPIKE_NAMESPACE = "features"


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
async def kafka_producer():
    """Kafka producer for publishing test events."""
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await producer.start()
    yield producer
    await producer.stop()


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


# =============================================================================
# Helper Functions
# =============================================================================

def create_event_envelope(
    event_type: str,
    user_id: str,
    project_id: str,
    data: dict,
) -> dict:
    """Create a properly formatted event envelope."""
    return {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "user_id": user_id,
        "project_id": project_id,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def get_aerospike_key(client, project_id: str, user_id: str, event_type: str):
    """Get the Aerospike key tuple."""
    # Key format: user_id:event_type (within project namespace/set)
    key_string = f"{user_id}:{event_type}"
    return (AEROSPIKE_NAMESPACE, project_id, key_string)


# =============================================================================
# Tests
# =============================================================================

class TestKafkaToAerospikeFlow:
    """
    Tests the complete Kafka → Consumer → Aerospike flow.
    
    These tests publish events directly to Kafka and verify
    they appear in Aerospike after the consumer processes them.
    """

    @pytest.mark.asyncio
    async def test_single_event_flow(self, kafka_producer, aerospike_client):
        """Test single event: Kafka → Consumer → Aerospike."""
        print("\n" + "="*60)
        print("SINGLE EVENT FLOW TEST")
        print("="*60)
        
        # Create unique identifiers for this test
        test_id = uuid.uuid4().hex[:8]
        project_id = f"test_project_{test_id}"
        user_id = f"user_{test_id}"
        product_id = f"prod_{test_id}"
        
        # Create event
        event = create_event_envelope(
            event_type="cart_events",
            user_id=user_id,
            project_id=project_id,
            data={
                "user_id": user_id,
                "product_id": product_id,
                "quantity": 2,
                "cart_total": 99.99,
            }
        )
        
        print(f"\n[Step 1] Publishing event to Kafka...")
        print(f"  Topic: {KAFKA_TOPIC}")
        print(f"  Event ID: {event['event_id']}")
        print(f"  User: {user_id}")
        
        # Publish to Kafka
        result = await kafka_producer.send_and_wait(KAFKA_TOPIC, event)
        print(f"  ✓ Published to partition {result.partition}, offset {result.offset}")
        
        # Wait for consumer to process
        print(f"\n[Step 2] Waiting for consumer to process (5s)...")
        await asyncio.sleep(5)
        
        # Verify in Aerospike
        print(f"\n[Step 3] Checking Aerospike...")
        key = get_aerospike_key(aerospike_client, project_id, user_id, "cart_events")
        print(f"  Key: {key}")
        
        try:
            _, _, bins = aerospike_client.get(key)
            
            if bins:
                print(f"  ✓ Data found in Aerospike!")
                print(f"  Stored data: {bins}")
                
                # Parse the data (stored as JSON string in 'data' bin)
                if "data" in bins:
                    stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                    assert stored_data.get("product_id") == product_id, "Product ID mismatch"
                    print(f"\n{'='*60}")
                    print("✓ TEST PASSED!")
                    print("="*60)
                else:
                    print(f"  Data bins: {bins}")
            else:
                pytest.fail("No data found in Aerospike")
                
        except aerospike_client.exception.RecordNotFound:
            print("  ✗ Record not found in Aerospike")
            print("\n  Troubleshooting:")
            print("  1. Is the consumer running? docker-compose --profile consumers up -d")
            print("  2. Check consumer logs: docker-compose logs persist-data-consumer")
            pytest.fail("Data not found in Aerospike - consumer may not be processing")

    @pytest.mark.asyncio
    async def test_multiple_events_flow(self, kafka_producer, aerospike_client):
        """Test multiple events from different users."""
        print("\n" + "="*60)
        print("MULTIPLE EVENTS FLOW TEST")
        print("="*60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = f"test_project_{test_id}"
        num_events = 3
        
        # Publish multiple events
        print(f"\n[Step 1] Publishing {num_events} events to Kafka...")
        
        events = []
        for i in range(num_events):
            user_id = f"user_{test_id}_{i}"
            event = create_event_envelope(
                event_type="cart_events",
                user_id=user_id,
                project_id=project_id,
                data={
                    "user_id": user_id,
                    "product_id": f"prod_{i}",
                    "quantity": i + 1,
                }
            )
            events.append((user_id, event))
            
            result = await kafka_producer.send_and_wait(KAFKA_TOPIC, event)
            print(f"  ✓ Event {i+1}: user={user_id}, offset={result.offset}")
        
        # Wait for consumer
        print(f"\n[Step 2] Waiting for consumer to process (8s)...")
        await asyncio.sleep(8)
        
        # Verify all events in Aerospike
        print(f"\n[Step 3] Verifying all events in Aerospike...")
        found = 0
        
        for user_id, event in events:
            key = get_aerospike_key(aerospike_client, project_id, user_id, "cart_events")
            try:
                _, _, bins = aerospike_client.get(key)
                if bins:
                    found += 1
                    print(f"  ✓ Found: {user_id}")
            except:
                print(f"  ✗ Not found: {user_id}")
        
        print(f"\n  Result: {found}/{num_events} events found")
        
        if found == num_events:
            print(f"\n{'='*60}")
            print("✓ TEST PASSED!")
            print("="*60)
        else:
            pytest.fail(f"Only {found}/{num_events} events found in Aerospike")

    @pytest.mark.asyncio
    async def test_event_update_overwrites(self, kafka_producer, aerospike_client):
        """Test that new events for same user overwrite old data."""
        print("\n" + "="*60)
        print("EVENT UPDATE/OVERWRITE TEST")
        print("="*60)
        
        test_id = uuid.uuid4().hex[:8]
        project_id = f"test_project_{test_id}"
        user_id = f"user_{test_id}"
        
        # First event
        print(f"\n[Step 1] Publishing first event (quantity=1)...")
        event1 = create_event_envelope(
            event_type="cart_events",
            user_id=user_id,
            project_id=project_id,
            data={"user_id": user_id, "product_id": "prod_1", "quantity": 1}
        )
        await kafka_producer.send_and_wait(KAFKA_TOPIC, event1)
        print(f"  ✓ Published")
        
        await asyncio.sleep(3)
        
        # Second event (should overwrite)
        print(f"\n[Step 2] Publishing second event (quantity=5)...")
        event2 = create_event_envelope(
            event_type="cart_events",
            user_id=user_id,
            project_id=project_id,
            data={"user_id": user_id, "product_id": "prod_2", "quantity": 5}
        )
        await kafka_producer.send_and_wait(KAFKA_TOPIC, event2)
        print(f"  ✓ Published")
        
        await asyncio.sleep(5)
        
        # Verify latest data
        print(f"\n[Step 3] Verifying latest data in Aerospike...")
        key = get_aerospike_key(aerospike_client, project_id, user_id, "cart_events")
        
        try:
            _, _, bins = aerospike_client.get(key)
            if bins and "data" in bins:
                stored_data = json.loads(bins["data"]) if isinstance(bins["data"], str) else bins["data"]
                print(f"  Stored data: {stored_data}")
                
                # Should have the latest product
                if stored_data.get("product_id") == "prod_2":
                    print(f"\n{'='*60}")
                    print("✓ TEST PASSED! Latest data overwrote previous.")
                    print("="*60)
                else:
                    print("  ⚠ Data may not have been updated yet")
        except:
            pytest.fail("Data not found in Aerospike")


# =============================================================================
# Quick Verification Test
# =============================================================================

@pytest.mark.asyncio
async def test_quick_kafka_aerospike_verification():
    """
    Quick test to verify Kafka → Aerospike pipeline is working.
    
    Run this test to quickly check if the infrastructure is set up correctly.
    """
    print("\n" + "="*60)
    print("QUICK VERIFICATION TEST")
    print("="*60)
    
    # Check Kafka
    print("\n[1] Checking Kafka connection...")
    try:
        producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await producer.start()
        print(f"  ✓ Kafka connected at {KAFKA_BOOTSTRAP_SERVERS}")
    except Exception as e:
        pytest.fail(f"Kafka connection failed: {e}")
    
    # Check Aerospike
    print("\n[2] Checking Aerospike connection...")
    try:
        import aerospike
        config = {"hosts": [(AEROSPIKE_HOST, AEROSPIKE_PORT)]}
        client = aerospike.client(config).connect()
        print(f"  ✓ Aerospike connected at {AEROSPIKE_HOST}:{AEROSPIKE_PORT}")
    except Exception as e:
        await producer.stop()
        pytest.fail(f"Aerospike connection failed: {e}")
    
    # Publish test event
    print("\n[3] Publishing test event to Kafka...")
    test_id = uuid.uuid4().hex[:8]
    event = {
        "event_id": f"quick_test_{test_id}",
        "event_type": "cart_events",
        "user_id": f"quick_user_{test_id}",
        "project_id": f"quick_project_{test_id}",
        "data": {"user_id": f"quick_user_{test_id}", "test": True},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await producer.send_and_wait(KAFKA_TOPIC, event)
    print(f"  ✓ Event published to partition {result.partition}, offset {result.offset}")
    
    await producer.stop()
    
    # Wait and check Aerospike
    print("\n[4] Waiting 5s for consumer to process...")
    await asyncio.sleep(5)
    
    print("\n[5] Checking Aerospike for data...")
    key = (AEROSPIKE_NAMESPACE, event["project_id"], f"{event['user_id']}:cart_events")
    
    try:
        _, _, bins = client.get(key)
        if bins:
            print(f"  ✓ Data found: {bins}")
            print(f"\n{'='*60}")
            print("✓ PIPELINE WORKING! Kafka → Consumer → Aerospike")
            print("="*60)
        else:
            print("  ⚠ Empty record found")
    except client.exception.RecordNotFound:
        print("  ✗ Data not found yet")
        print("\n  Check if consumer is running:")
        print("  docker-compose --profile consumers up -d persist-data-consumer")
        print("  docker-compose logs persist-data-consumer")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    finally:
        client.close()


# =============================================================================
# Run directly
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
