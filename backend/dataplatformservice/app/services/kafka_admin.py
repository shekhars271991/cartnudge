"""
Kafka Admin Service - dynamically creates and manages Kafka topics.

Topics are loaded from data/event_topics.json on startup.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Optional

from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import TopicAlreadyExistsError

from app.core.config import settings


class EventTopicConfig:
    """Configuration for event topics loaded from JSON."""
    
    _instance: Optional["EventTopicConfig"] = None
    _topics: dict = {}
    _template_to_topic: dict = {}
    _default_topic: str = "custom_events"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Load topic configuration from JSON file."""
        config_path = Path(__file__).parent.parent.parent / "data" / "event_topics.json"
        
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
            
            self._topics = {t["topic_id"]: t for t in config.get("topics", [])}
            self._default_topic = config.get("default_topic", "custom_events")
            
            # Build template to topic mapping
            for topic in config.get("topics", []):
                for template_id in topic.get("mapped_templates", []):
                    self._template_to_topic[template_id] = topic["name"]
            
            print(f"✓ Loaded {len(self._topics)} topic configurations")
        except FileNotFoundError:
            print(f"⚠ Warning: {config_path} not found, using defaults")
            self._topics = {}
        except json.JSONDecodeError as e:
            print(f"⚠ Warning: Invalid JSON in {config_path}: {e}")
            self._topics = {}
    
    @property
    def topics(self) -> dict:
        """Get all topic configurations."""
        return self._topics
    
    @property
    def default_topic(self) -> str:
        """Get the default topic for unmapped events."""
        return self._default_topic
    
    def get_topic_for_template(self, template_id: str) -> str:
        """Get the Kafka topic name for a datablock template."""
        return self._template_to_topic.get(template_id, self._default_topic)
    
    def get_topic_for_datablock(self, datablock_name: str, is_predefined: bool = False) -> str:
        """
        Get the Kafka topic name for a datablock.
        
        Args:
            datablock_name: Name of the datablock (e.g., 'cart_events', 'page_views')
            is_predefined: Whether the datablock was created from a template
            
        Returns:
            Topic name to publish events to
        """
        # If predefined (from template), look up the mapping
        if is_predefined and datablock_name in self._template_to_topic:
            return self._template_to_topic[datablock_name]
        
        # For custom datablocks, use the custom_events topic
        return self._default_topic
    
    def get_all_topic_names(self) -> list[str]:
        """Get list of all topic names."""
        return [t["name"] for t in self._topics.values()]


class KafkaAdminService:
    """Async Kafka admin client for topic management."""
    
    _instance: Optional["KafkaAdminService"] = None
    _admin: Optional[AIOKafkaAdminClient] = None
    _lock = asyncio.Lock()
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def start(self):
        """Start the Kafka admin client."""
        async with self._lock:
            if self._admin is None:
                self._admin = AIOKafkaAdminClient(
                    bootstrap_servers=settings.kafka_bootstrap_servers,
                )
                await self._admin.start()
                print(f"✓ Kafka admin connected to {settings.kafka_bootstrap_servers}")
    
    async def stop(self):
        """Stop the Kafka admin client."""
        async with self._lock:
            if self._admin is not None:
                await self._admin.close()
                self._admin = None
                print("✓ Kafka admin stopped")
    
    async def ensure_topic_exists(
        self,
        topic_name: str,
        partitions: int = 3,
        replication_factor: int = 1,
    ) -> bool:
        """
        Create a topic if it doesn't exist.
        
        Returns:
            True if topic was created, False if it already existed
        """
        if self._admin is None:
            await self.start()
        
        new_topic = NewTopic(
            name=topic_name,
            num_partitions=partitions,
            replication_factor=replication_factor,
        )
        
        try:
            await self._admin.create_topics([new_topic])
            print(f"  ✓ Created topic: {topic_name} (partitions={partitions})")
            return True
        except TopicAlreadyExistsError:
            print(f"  - Topic exists: {topic_name}")
            return False
        except Exception as e:
            print(f"  ✗ Failed to create topic {topic_name}: {e}")
            return False
    
    async def initialize_topics(self) -> dict:
        """
        Initialize all topics from the event_topics.json configuration.
        Called on application startup.
        
        Returns:
            Dict with created and existing topic counts
        """
        if self._initialized:
            return {"created": 0, "existing": 0, "skipped": True}
        
        topic_config = EventTopicConfig()
        created = 0
        existing = 0
        
        print("Initializing Kafka topics...")
        
        for topic_id, config in topic_config.topics.items():
            result = await self.ensure_topic_exists(
                topic_name=config["name"],
                partitions=config.get("partitions", 3),
                replication_factor=config.get("replication_factor", 1),
            )
            if result:
                created += 1
            else:
                existing += 1
        
        self._initialized = True
        print(f"✓ Kafka topics initialized: {created} created, {existing} existing")
        
        return {"created": created, "existing": existing, "skipped": False}
    
    async def list_topics(self) -> list[str]:
        """List all topics in the cluster."""
        if self._admin is None:
            await self.start()
        
        try:
            # Get cluster metadata which includes topic list
            metadata = await self._admin.list_topics()
            return list(metadata)
        except Exception as e:
            print(f"Failed to list topics: {e}")
            return []


# Global instances
event_topic_config = EventTopicConfig()
kafka_admin = KafkaAdminService()


async def get_kafka_admin() -> KafkaAdminService:
    """Get the Kafka admin instance."""
    if kafka_admin._admin is None:
        await kafka_admin.start()
    return kafka_admin

