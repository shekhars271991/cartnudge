"""
Aerospike Service - key-value storage for event data and features.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

import aerospike
from aerospike import exception as aerospike_exceptions

from app.core.config import settings


class AerospikeService:
    """Service for Aerospike key-value operations."""
    
    _instance: Optional["AerospikeService"] = None
    _client: Optional[aerospike.Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def connect(self):
        """Connect to Aerospike cluster."""
        if self._client is None:
            config = {
                "hosts": settings.aerospike_hosts_list,
            }
            self._client = aerospike.client(config).connect()
            print(f"✓ Connected to Aerospike: {settings.aerospike_hosts}")
    
    def disconnect(self):
        """Disconnect from Aerospike."""
        if self._client is not None:
            self._client.close()
            self._client = None
            print("✓ Disconnected from Aerospike")
    
    @property
    def client(self) -> aerospike.Client:
        """Get the Aerospike client, connecting if needed."""
        if self._client is None:
            self.connect()
        return self._client
    
    def _build_key(self, project_id: str, user_id: str, event_type: str) -> tuple:
        """
        Build an Aerospike key.
        
        Key format: (namespace, set, pk)
        - namespace: from settings
        - set: project_id (each project has its own set)
        - pk: user_id:event_type
        """
        pk = f"{user_id}:{event_type}"
        return (settings.aerospike_namespace, project_id, pk)
    
    def put_event_data(
        self,
        project_id: str,
        user_id: str,
        event_type: str,
        data: dict[str, Any],
        ttl: int = 0,  # 0 means use default TTL
    ) -> bool:
        """
        Store event data in Aerospike.
        
        Args:
            project_id: Project identifier (used as Aerospike set)
            user_id: User identifier
            event_type: Event type/datablock name
            data: The data to store
            ttl: Time-to-live in seconds (0 = default)
            
        Returns:
            True if successful
        """
        key = self._build_key(project_id, user_id, event_type)
        
        # Store the data with metadata
        bins = {
            "data": json.dumps(data),  # Store as JSON string for flexibility
            "event_type": event_type,
            "user_id": user_id,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        meta = {"ttl": ttl} if ttl > 0 else {}
        
        # Write policy: store the primary key with the record
        policy = {
            "key": aerospike.POLICY_KEY_SEND,  # Store the key in the record
        }
        
        try:
            self.client.put(key, bins, meta, policy)
            return True
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike put error: {e}")
            return False
    
    def get_event_data(
        self,
        project_id: str,
        user_id: str,
        event_type: str,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve event data from Aerospike.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            event_type: Event type/datablock name
            
        Returns:
            The stored data or None if not found
        """
        key = self._build_key(project_id, user_id, event_type)
        
        try:
            _, _, bins = self.client.get(key)
            if bins and "data" in bins:
                return {
                    "data": json.loads(bins["data"]),
                    "event_type": bins.get("event_type"),
                    "user_id": bins.get("user_id"),
                    "updated_at": bins.get("updated_at"),
                }
            return None
        except aerospike_exceptions.RecordNotFound:
            return None
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike get error: {e}")
            return None
    
    def delete_event_data(
        self,
        project_id: str,
        user_id: str,
        event_type: str,
    ) -> bool:
        """
        Delete event data from Aerospike.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            event_type: Event type/datablock name
            
        Returns:
            True if deleted, False if not found or error
        """
        key = self._build_key(project_id, user_id, event_type)
        
        try:
            self.client.remove(key)
            return True
        except aerospike_exceptions.RecordNotFound:
            return False
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike delete error: {e}")
            return False
    
    def get_user_events(
        self,
        project_id: str,
        user_id: str,
        event_types: list[str],
    ) -> dict[str, Any]:
        """
        Get multiple event types for a user in batch.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            event_types: List of event types to fetch
            
        Returns:
            Dictionary mapping event_type to data
        """
        result = {}
        
        for event_type in event_types:
            data = self.get_event_data(project_id, user_id, event_type)
            if data:
                result[event_type] = data["data"]
        
        return result


# Global instance
aerospike_service = AerospikeService()


def get_aerospike_service() -> AerospikeService:
    """Get the Aerospike service instance."""
    if aerospike_service._client is None:
        aerospike_service.connect()
    return aerospike_service

