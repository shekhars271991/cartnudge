"""
Aerospike Service - key-value storage for event data and features.

Feature Groups:
- cart: Shopping cart behavior (adds, removes, checkout)
- page: Page view and session data
- order: Purchase history and revenue
- engagement: Computed engagement scores
- recency: Time-based recency features
"""
from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from typing import Any, Optional

import aerospike
from aerospike import exception as aerospike_exceptions

from app.core.config import settings


class FeatureGroup(str, Enum):
    """Feature group identifiers."""
    CART = "cart"
    PAGE = "page"
    ORDER = "order"
    ENGAGEMENT = "engagement"
    RECENCY = "recency"
    
    @classmethod
    def all(cls) -> list[str]:
        """Get all feature group names."""
        return [g.value for g in cls]


# Default TTLs for each feature group (in seconds)
FEATURE_GROUP_TTLS = {
    FeatureGroup.CART: 7 * 24 * 3600,       # 7 days - cart behavior changes frequently
    FeatureGroup.PAGE: 7 * 24 * 3600,       # 7 days - session data
    FeatureGroup.ORDER: 30 * 24 * 3600,     # 30 days - purchase history is valuable longer
    FeatureGroup.ENGAGEMENT: 7 * 24 * 3600, # 7 days - computed scores
    FeatureGroup.RECENCY: 1 * 24 * 3600,    # 1 day - recency needs frequent updates
}


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
    
    # =========================================================================
    # Feature Store Methods
    # =========================================================================
    
    def _build_feature_key(self, project_id: str, user_id: str) -> tuple:
        """
        Build an Aerospike key for user features.
        
        Key format: (namespace, set, pk)
        - namespace: from settings
        - set: {project_id}_features
        - pk: user_id
        """
        set_name = f"{project_id}_features"
        return (settings.aerospike_namespace, set_name, user_id)
    
    def put_user_features(
        self,
        project_id: str,
        user_id: str,
        features: dict[str, Any],
        ttl: int = 0,
    ) -> bool:
        """
        Store computed features for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            features: Dictionary of computed features
            ttl: Time-to-live in seconds (0 = default)
            
        Returns:
            True if successful
        """
        key = self._build_feature_key(project_id, user_id)
        
        # Store features as JSON string
        bins = {
            "features": json.dumps(features),
            "user_id": user_id,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        meta = {"ttl": ttl} if ttl > 0 else {}
        
        policy = {
            "key": aerospike.POLICY_KEY_SEND,
        }
        
        try:
            self.client.put(key, bins, meta, policy)
            return True
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike put_user_features error: {e}")
            return False
    
    def get_user_features(
        self,
        project_id: str,
        user_id: str,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve computed features for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            
        Returns:
            Feature dictionary or None if not found
        """
        key = self._build_feature_key(project_id, user_id)
        
        try:
            _, _, bins = self.client.get(key)
            if bins and "features" in bins:
                features = json.loads(bins["features"])
                features["_updated_at"] = bins.get("updated_at")
                return features
            return None
        except aerospike_exceptions.RecordNotFound:
            return None
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike get_user_features error: {e}")
            return None
    
    def delete_user_features(
        self,
        project_id: str,
        user_id: str,
    ) -> bool:
        """
        Delete features for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            
        Returns:
            True if deleted
        """
        key = self._build_feature_key(project_id, user_id)
        
        try:
            self.client.remove(key)
            return True
        except aerospike_exceptions.RecordNotFound:
            return False
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike delete_user_features error: {e}")
            return False
    
    # =========================================================================
    # Feature Groups - Organized Feature Storage
    # =========================================================================
    
    def _build_feature_group_key(
        self, project_id: str, user_id: str, feature_group: str
    ) -> tuple:
        """
        Build an Aerospike key for a feature group.
        
        Key format: (namespace, set, pk)
        - namespace: from settings
        - set: {project_id}_feat_{group}  (e.g., proj123_feat_cart)
        - pk: user_id
        """
        set_name = f"{project_id}_feat_{feature_group}"
        return (settings.aerospike_namespace, set_name, user_id)
    
    def put_feature_group(
        self,
        project_id: str,
        user_id: str,
        feature_group: str | FeatureGroup,
        features: dict[str, Any],
        ttl: int | None = None,
    ) -> bool:
        """
        Store features for a specific feature group.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            feature_group: Feature group name (cart, page, order, engagement, recency)
            features: Dictionary of features for this group
            ttl: Time-to-live in seconds (None = use group default)
            
        Returns:
            True if successful
        """
        group_name = feature_group.value if isinstance(feature_group, FeatureGroup) else feature_group
        key = self._build_feature_group_key(project_id, user_id, group_name)
        
        # Use default TTL for group if not specified
        if ttl is None:
            try:
                ttl = FEATURE_GROUP_TTLS.get(FeatureGroup(group_name), 7 * 24 * 3600)
            except ValueError:
                ttl = 7 * 24 * 3600  # Default 7 days for unknown groups
        
        # Store features as individual bins for faster partial reads
        bins = {
            "features": json.dumps(features),
            "group": group_name,
            "user_id": user_id,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        meta = {"ttl": ttl} if ttl > 0 else {}
        
        policy = {
            "key": aerospike.POLICY_KEY_SEND,
        }
        
        try:
            self.client.put(key, bins, meta, policy)
            return True
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike put_feature_group error ({group_name}): {e}")
            return False
    
    def get_feature_group(
        self,
        project_id: str,
        user_id: str,
        feature_group: str | FeatureGroup,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve features for a specific feature group.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            feature_group: Feature group name
            
        Returns:
            Feature dictionary or None if not found
        """
        group_name = feature_group.value if isinstance(feature_group, FeatureGroup) else feature_group
        key = self._build_feature_group_key(project_id, user_id, group_name)
        
        try:
            _, _, bins = self.client.get(key)
            if bins and "features" in bins:
                features = json.loads(bins["features"])
                features["_group"] = group_name
                features["_updated_at"] = bins.get("updated_at")
                return features
            return None
        except aerospike_exceptions.RecordNotFound:
            return None
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike get_feature_group error ({group_name}): {e}")
            return None
    
    def get_all_feature_groups(
        self,
        project_id: str,
        user_id: str,
        groups: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """
        Retrieve all feature groups for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            groups: Optional list of groups to fetch (default: all)
            
        Returns:
            Dictionary mapping group name to features
        """
        if groups is None:
            groups = FeatureGroup.all()
        
        result = {}
        for group in groups:
            features = self.get_feature_group(project_id, user_id, group)
            if features:
                # Remove metadata for cleaner response
                features.pop("_group", None)
                updated_at = features.pop("_updated_at", None)
                result[group] = {
                    "features": features,
                    "updated_at": updated_at,
                }
        
        return result
    
    def get_flattened_features(
        self,
        project_id: str,
        user_id: str,
        groups: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Get all features flattened into a single dictionary.
        
        Useful for ML model inference where you need all features in one dict.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            groups: Optional list of groups to fetch
            
        Returns:
            Flattened dictionary of all features
        """
        all_groups = self.get_all_feature_groups(project_id, user_id, groups)
        
        flattened = {
            "user_id": user_id,
            "project_id": project_id,
        }
        
        latest_update = None
        for group_name, group_data in all_groups.items():
            # Prefix features with group name to avoid collisions
            for key, value in group_data.get("features", {}).items():
                flattened[f"{group_name}_{key}"] = value
            
            # Track latest update time
            update_time = group_data.get("updated_at")
            if update_time and (latest_update is None or update_time > latest_update):
                latest_update = update_time
        
        flattened["_updated_at"] = latest_update
        return flattened
    
    def delete_feature_group(
        self,
        project_id: str,
        user_id: str,
        feature_group: str | FeatureGroup,
    ) -> bool:
        """
        Delete a feature group for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            feature_group: Feature group name
            
        Returns:
            True if deleted
        """
        group_name = feature_group.value if isinstance(feature_group, FeatureGroup) else feature_group
        key = self._build_feature_group_key(project_id, user_id, group_name)
        
        try:
            self.client.remove(key)
            return True
        except aerospike_exceptions.RecordNotFound:
            return False
        except aerospike_exceptions.AerospikeError as e:
            print(f"Aerospike delete_feature_group error ({group_name}): {e}")
            return False
    
    def delete_all_feature_groups(
        self,
        project_id: str,
        user_id: str,
    ) -> dict[str, bool]:
        """
        Delete all feature groups for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            
        Returns:
            Dictionary mapping group name to deletion success
        """
        results = {}
        for group in FeatureGroup.all():
            results[group] = self.delete_feature_group(project_id, user_id, group)
        return results


# Global instance
aerospike_service = AerospikeService()


def get_aerospike_service() -> AerospikeService:
    """Get the Aerospike service instance."""
    if aerospike_service._client is None:
        aerospike_service.connect()
    return aerospike_service

