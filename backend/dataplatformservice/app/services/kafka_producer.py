"""
Kafka Producer Service - publishes events to Kafka topics.

Topics must be explicitly specified when publishing events.
Topic configurations are defined in data/event_topics.json.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional
import asyncio

from aiokafka import AIOKafkaProducer

from app.core.config import settings


class KafkaProducerService:
    """Async Kafka producer for publishing events."""
    
    _instance: Optional["KafkaProducerService"] = None
    _producer: Optional[AIOKafkaProducer] = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def start(self):
        """Start the Kafka producer."""
        async with self._lock:
            if self._producer is None:
                self._producer = AIOKafkaProducer(
                    bootstrap_servers=settings.kafka_bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                    key_serializer=lambda k: k.encode("utf-8") if k else None,
                )
                await self._producer.start()
                print(f"✓ Kafka producer connected to {settings.kafka_bootstrap_servers}")
    
    async def stop(self):
        """Stop the Kafka producer."""
        async with self._lock:
            if self._producer is not None:
                await self._producer.stop()
                self._producer = None
                print("✓ Kafka producer stopped")
    
    async def publish_event(
        self,
        event_type: str,
        user_id: str,
        data: dict[str, Any],
        project_id: str,
        topic: str,
    ) -> dict:
        """
        Publish an event to Kafka.
        
        Args:
            event_type: The type/name of the event (e.g., cart.add, page.view)
            user_id: The end user being tracked
            data: The event payload data
            project_id: The project this event belongs to
            topic: The Kafka topic to publish to (required)
            
        Returns:
            Event metadata including offset and partition
        """
        if self._producer is None:
            await self.start()
        
        # Build the event envelope
        event = {
            "event_id": f"{project_id}:{user_id}:{event_type}:{datetime.utcnow().timestamp()}",
            "event_type": event_type,
            "user_id": user_id,
            "project_id": project_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0",
        }
        
        # Use user_id as key for partitioning (same user goes to same partition)
        key = f"{project_id}:{user_id}"
        
        # Send to Kafka
        result = await self._producer.send_and_wait(
            topic=topic,
            value=event,
            key=key,
        )
        
        return {
            "event_id": event["event_id"],
            "topic": topic,
            "partition": result.partition,
            "offset": result.offset,
            "timestamp": event["timestamp"],
        }


# Global instance
kafka_producer = KafkaProducerService()


async def get_kafka_producer() -> KafkaProducerService:
    """Get the Kafka producer instance."""
    if kafka_producer._producer is None:
        await kafka_producer.start()
    return kafka_producer

