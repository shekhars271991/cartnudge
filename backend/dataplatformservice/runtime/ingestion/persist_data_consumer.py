"""
PersistData Consumer - Consumes events from Kafka and stores in Aerospike.

This consumer reads events from the Kafka events topic and persists them
to Aerospike with the key format: user_id:event_type

Run as a standalone process:
    python -m runtime.ingestion.persist_data_consumer
"""
from __future__ import annotations

import asyncio
import json
import signal
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

from app.core.config import settings
from app.services.aerospike_service import get_aerospike_service


class PersistDataConsumer:
    """
    Kafka consumer that persists event data to Aerospike.
    
    Key format in Aerospike: user_id:event_type
    Value: The event data payload
    """
    
    def __init__(
        self,
        topic: str = None,
        group_id: str = "persist-data-consumer",
        bootstrap_servers: str = None,
    ):
        self.topic = topic or settings.kafka_topic_events
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self.consumer: AIOKafkaConsumer = None
        self.running = False
        self.aerospike = None
        
        # Stats
        self.messages_processed = 0
        self.messages_failed = 0
    
    async def start(self):
        """Start the consumer."""
        print(f"Starting PersistData Consumer...")
        print(f"  Topic: {self.topic}")
        print(f"  Group ID: {self.group_id}")
        print(f"  Bootstrap Servers: {self.bootstrap_servers}")
        
        # Connect to Aerospike
        self.aerospike = get_aerospike_service()
        print(f"✓ Connected to Aerospike")
        
        # Create Kafka consumer
        self.consumer = AIOKafkaConsumer(
            self.topic,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        
        await self.consumer.start()
        print(f"✓ Kafka consumer started")
        
        self.running = True
    
    async def stop(self):
        """Stop the consumer gracefully."""
        print("\nStopping PersistData Consumer...")
        self.running = False
        
        if self.consumer:
            await self.consumer.stop()
            print("✓ Kafka consumer stopped")
        
        if self.aerospike:
            self.aerospike.disconnect()
        
        print(f"\nStats:")
        print(f"  Messages processed: {self.messages_processed}")
        print(f"  Messages failed: {self.messages_failed}")
    
    async def process_message(self, message) -> bool:
        """
        Process a single Kafka message.
        
        Args:
            message: Kafka message with event data
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            event = message.value
            
            # Extract event details
            project_id = event.get("project_id")
            user_id = event.get("user_id")
            event_type = event.get("event_type")
            data = event.get("data", {})
            timestamp = event.get("timestamp")
            
            if not all([project_id, user_id, event_type]):
                print(f"⚠ Invalid event (missing required fields): {event}")
                return False
            
            # Add metadata to the data
            enriched_data = {
                **data,
                "_event_id": event.get("event_id"),
                "_timestamp": timestamp,
            }
            
            # Store in Aerospike
            # Key: user_id:event_type
            success = self.aerospike.put_event_data(
                project_id=project_id,
                user_id=user_id,
                event_type=event_type,
                data=enriched_data,
            )
            
            if success:
                print(f"✓ Persisted: {project_id}/{user_id}:{event_type}")
                return True
            else:
                print(f"✗ Failed to persist: {project_id}/{user_id}:{event_type}")
                return False
                
        except Exception as e:
            print(f"✗ Error processing message: {e}")
            return False
    
    async def run(self):
        """Main consumer loop."""
        await self.start()
        
        try:
            print(f"\n🎧 Listening for events on topic '{self.topic}'...\n")
            
            async for message in self.consumer:
                if not self.running:
                    break
                
                success = await self.process_message(message)
                
                if success:
                    self.messages_processed += 1
                else:
                    self.messages_failed += 1
                
                # Log stats periodically
                total = self.messages_processed + self.messages_failed
                if total % 100 == 0:
                    print(f"📊 Processed: {self.messages_processed}, Failed: {self.messages_failed}")
                    
        except KafkaError as e:
            print(f"Kafka error: {e}")
        except Exception as e:
            print(f"Consumer error: {e}")
        finally:
            await self.stop()


async def main():
    """Main entry point."""
    consumer = PersistDataConsumer()
    
    # Setup graceful shutdown
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        print("\n\nReceived shutdown signal...")
        asyncio.create_task(consumer.stop())
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    await consumer.run()


if __name__ == "__main__":
    print("=" * 60)
    print("CartNudge PersistData Consumer")
    print("=" * 60)
    print()
    
    asyncio.run(main())

