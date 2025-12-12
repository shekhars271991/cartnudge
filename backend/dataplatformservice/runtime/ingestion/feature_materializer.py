"""
Feature Materializer - Consumes events from Kafka and stores them in ClickHouse.

This consumer reads events from all configured Kafka topics and persists them
to ClickHouse for feature engineering and ML training data generation.

Run as a standalone process:
    python -m runtime.ingestion.feature_materializer

Health check endpoint available at: http://localhost:8011/health
"""
from __future__ import annotations

import asyncio
import json
import signal
import sys
import time
import os
from datetime import datetime
from aiohttp import web
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.errors import KafkaError

from app.core.config import settings
from app.services.clickhouse_service import get_clickhouse_service
from app.services.kafka_admin import event_topic_config

# Health check port
HEALTH_CHECK_PORT = int(os.environ.get("HEALTH_CHECK_PORT", "8011"))

# Batch settings for ClickHouse inserts
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "100"))
BATCH_TIMEOUT_SECONDS = float(os.environ.get("BATCH_TIMEOUT_SECONDS", "5.0"))


@dataclass
class MaterializerStats:
    """Statistics for the materializer."""
    messages_received: int = 0
    messages_processed: int = 0
    messages_failed: int = 0
    messages_to_dlq: int = 0
    batches_written: int = 0
    start_time: float = field(default_factory=time.time)
    
    def __str__(self) -> str:
        elapsed = time.time() - self.start_time
        rate = self.messages_processed / elapsed if elapsed > 0 else 0
        return (
            f"Received: {self.messages_received}, "
            f"Processed: {self.messages_processed}, "
            f"Failed: {self.messages_failed}, "
            f"DLQ: {self.messages_to_dlq}, "
            f"Batches: {self.batches_written}, "
            f"Rate: {rate:.1f}/s"
        )


class FeatureMaterializer:
    """
    Kafka consumer that materializes event data to ClickHouse.
    
    Subscribes to all event topics defined in event_topics.json and writes
    all raw events to ClickHouse for feature engineering.
    
    Events are batched for efficient inserts.
    """
    
    def __init__(
        self,
        group_id: str = "feature-materializer",
        bootstrap_servers: str = None,
        enable_dlq: bool = True,
        batch_size: int = BATCH_SIZE,
        batch_timeout: float = BATCH_TIMEOUT_SECONDS,
    ):
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers or os.environ.get(
            "KAFKA_BOOTSTRAP_SERVERS", settings.kafka_bootstrap_servers
        )
        self.enable_dlq = enable_dlq
        self.dlq_topic = "dlq_events"
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.dlq_producer: Optional[AIOKafkaProducer] = None
        self.clickhouse = None
        self.running = False
        
        self.stats = MaterializerStats()
        
        # Event batch buffer
        self._batch: list[dict] = []
        self._last_flush_time: float = time.time()
        
        # Get topics to consume (exclude dlq_events)
        self.topics = [
            name for name in event_topic_config.get_all_topic_names()
            if name != self.dlq_topic
        ]
    
    async def start(self):
        """Start the consumer and connect to services."""
        print("=" * 60)
        print("Feature Materializer - Starting")
        print("=" * 60)
        print(f"  Group ID: {self.group_id}")
        print(f"  Bootstrap Servers: {self.bootstrap_servers}")
        print(f"  Topics: {', '.join(self.topics)}")
        print(f"  DLQ Enabled: {self.enable_dlq}")
        print(f"  Batch Size: {self.batch_size}")
        print(f"  Batch Timeout: {self.batch_timeout}s")
        print()
        
        # Connect to ClickHouse
        try:
            self.clickhouse = get_clickhouse_service()
            self.clickhouse.connect()
            if self.clickhouse.health_check():
                print("✓ Connected to ClickHouse")
            else:
                raise Exception("ClickHouse health check failed")
        except Exception as e:
            print(f"✗ Failed to connect to ClickHouse: {e}")
            raise
        
        # Create Kafka consumer subscribed to all event topics
        self.consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=5000,
        )
        
        await self.consumer.start()
        print("✓ Kafka consumer started")
        
        # Create DLQ producer if enabled
        if self.enable_dlq:
            self.dlq_producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            )
            await self.dlq_producer.start()
            print("✓ DLQ producer started")
        
        self.running = True
        self.stats = MaterializerStats()
        self._last_flush_time = time.time()
        print()
    
    async def stop(self):
        """Stop the consumer gracefully."""
        print("\n" + "=" * 60)
        print("Feature Materializer - Stopping")
        print("=" * 60)
        self.running = False
        
        # Flush any remaining events
        if self._batch:
            print(f"  Flushing {len(self._batch)} remaining events...")
            await self._flush_batch()
        
        if self.consumer:
            await self.consumer.stop()
            print("✓ Kafka consumer stopped")
        
        if self.dlq_producer:
            await self.dlq_producer.stop()
            print("✓ DLQ producer stopped")
        
        if self.clickhouse:
            self.clickhouse.close()
            print("✓ ClickHouse connection closed")
        
        print()
        print("Final Stats:")
        print(f"  {self.stats}")
        print()
    
    async def send_to_dlq(self, event: dict, error: str, source_topic: str):
        """Send a failed event to the dead letter queue."""
        if not self.enable_dlq or not self.dlq_producer:
            return
        
        dlq_event = {
            "original_event": event,
            "error": error,
            "source_topic": source_topic,
            "failed_at": time.time(),
            "consumer_group": self.group_id,
        }
        
        try:
            await self.dlq_producer.send_and_wait(
                topic=self.dlq_topic,
                value=dlq_event,
            )
            self.stats.messages_to_dlq += 1
        except Exception as e:
            print(f"✗ Failed to send to DLQ: {e}")
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string to datetime."""
        if not timestamp_str:
            return datetime.utcnow()
        try:
            # Handle ISO format with or without microseconds
            if "." in timestamp_str:
                return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00").replace("+00:00", ""))
            return datetime.fromisoformat(timestamp_str.replace("Z", ""))
        except Exception:
            return datetime.utcnow()
    
    async def _flush_batch(self):
        """Flush the current batch to ClickHouse."""
        if not self._batch:
            return
        
        batch_to_write = self._batch
        self._batch = []
        self._last_flush_time = time.time()
        
        try:
            success, failed = self.clickhouse.insert_events_batch(batch_to_write)
            self.stats.messages_processed += success
            self.stats.messages_failed += failed
            self.stats.batches_written += 1
            
            if success > 0:
                print(f"📝 Wrote batch: {success} events to ClickHouse (batch #{self.stats.batches_written})")
            
            if failed > 0:
                print(f"⚠ Failed to write {failed} events")
                # Send failed events to DLQ
                for event in batch_to_write:
                    await self.send_to_dlq(
                        event.get("original_event", event),
                        "Batch insert failed",
                        event.get("topic", "unknown"),
                    )
                    
        except Exception as e:
            print(f"✗ Batch write error: {e}")
            self.stats.messages_failed += len(batch_to_write)
            # Send all events to DLQ
            for event in batch_to_write:
                await self.send_to_dlq(
                    event.get("original_event", event),
                    f"Batch error: {str(e)}",
                    event.get("topic", "unknown"),
                )
    
    async def process_message(self, message) -> bool:
        """
        Process a single Kafka message and add to batch.
        
        Args:
            message: Kafka message with event data
            
        Returns:
            True if added to batch successfully, False otherwise
        """
        event = message.value
        source_topic = message.topic
        
        try:
            # Extract event details
            project_id = event.get("project_id")
            user_id = event.get("user_id")
            event_type = event.get("event_type")
            data = event.get("data", {})
            timestamp_str = event.get("timestamp")
            event_id = event.get("event_id")
            
            # Validate required fields
            if not all([project_id, user_id, event_type, event_id]):
                error_msg = f"Missing required fields: project_id={project_id}, user_id={user_id}, event_type={event_type}, event_id={event_id}"
                print(f"⚠ {error_msg}")
                await self.send_to_dlq(event, error_msg, source_topic)
                return False
            
            # Prepare event for ClickHouse
            ch_event = {
                "event_id": event_id,
                "project_id": project_id,
                "user_id": user_id,
                "event_type": event_type,
                "topic": source_topic,
                "kafka_partition": message.partition,
                "kafka_offset": message.offset,
                "data": data,
                "event_timestamp": self._parse_timestamp(timestamp_str),
                "original_event": event,  # Keep for DLQ if needed
            }
            
            # Add to batch
            self._batch.append(ch_event)
            
            # Check if we should flush
            should_flush = (
                len(self._batch) >= self.batch_size or
                (time.time() - self._last_flush_time) >= self.batch_timeout
            )
            
            if should_flush:
                await self._flush_batch()
            
            return True
                
        except Exception as e:
            error_msg = f"Processing error: {str(e)}"
            print(f"✗ {error_msg}")
            await self.send_to_dlq(event, error_msg, source_topic)
            return False
    
    async def run(self):
        """Main consumer loop."""
        await self.start()
        
        try:
            print(f"🎧 Listening for events on {len(self.topics)} topics...\n")
            
            async for message in self.consumer:
                if not self.running:
                    break
                
                self.stats.messages_received += 1
                await self.process_message(message)
                
                # Log stats periodically
                total = self.stats.messages_received
                if total % 100 == 0 and total > 0:
                    print(f"📊 {self.stats}")
                
                # Time-based flush check (in case messages are slow)
                if (time.time() - self._last_flush_time) >= self.batch_timeout and self._batch:
                    await self._flush_batch()
                    
        except KafkaError as e:
            print(f"Kafka error: {e}")
        except Exception as e:
            print(f"Consumer error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await self.stop()


class HealthCheckServer:
    """Simple HTTP server for health checks."""
    
    def __init__(self, materializer: FeatureMaterializer, port: int = HEALTH_CHECK_PORT):
        self.materializer = materializer
        self.port = port
        self.app = web.Application()
        self.app.router.add_get("/health", self.health_handler)
        self.app.router.add_get("/stats", self.stats_handler)
        self.app.router.add_get("/ready", self.ready_handler)
        self.runner = None
    
    async def health_handler(self, request):
        """Health check endpoint - returns 200 if running."""
        if self.materializer.running:
            return web.json_response({
                "status": "healthy",
                "running": True,
                "uptime_seconds": time.time() - self.materializer.stats.start_time,
            })
        return web.json_response(
            {"status": "unhealthy", "running": False},
            status=503
        )
    
    async def ready_handler(self, request):
        """Readiness check - returns 200 if ready to process."""
        if self.materializer.running and self.materializer.consumer:
            return web.json_response({"status": "ready"})
        return web.json_response({"status": "not_ready"}, status=503)
    
    async def stats_handler(self, request):
        """Statistics endpoint."""
        stats = self.materializer.stats
        elapsed = time.time() - stats.start_time
        return web.json_response({
            "messages_received": stats.messages_received,
            "messages_processed": stats.messages_processed,
            "messages_failed": stats.messages_failed,
            "messages_to_dlq": stats.messages_to_dlq,
            "batches_written": stats.batches_written,
            "uptime_seconds": elapsed,
            "rate_per_second": stats.messages_processed / elapsed if elapsed > 0 else 0,
            "topics": self.materializer.topics,
            "batch_size": self.materializer.batch_size,
            "pending_batch": len(self.materializer._batch),
        })
    
    async def start(self):
        """Start the health check server."""
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, "0.0.0.0", self.port)
        await site.start()
        print(f"✓ Health check server started on port {self.port}")
    
    async def stop(self):
        """Stop the health check server."""
        if self.runner:
            await self.runner.cleanup()
            print("✓ Health check server stopped")


async def main():
    """Main entry point."""
    materializer = FeatureMaterializer()
    health_server = HealthCheckServer(materializer)
    
    # Setup graceful shutdown
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        print("\n\n⚠ Received shutdown signal...")
        materializer.running = False
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    # Start health check server
    await health_server.start()
    
    try:
        # Run materializer
        await materializer.run()
    finally:
        await health_server.stop()


if __name__ == "__main__":
    print()
    print("╔" + "═" * 58 + "╗")
    print("║" + " CartNudge Feature Materializer ".center(58) + "║")
    print("║" + " Kafka → ClickHouse ".center(58) + "║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    asyncio.run(main())
