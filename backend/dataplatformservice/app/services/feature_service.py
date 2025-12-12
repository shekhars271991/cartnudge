"""
Feature Service - Computes user features from ClickHouse event data.

This service aggregates raw events into features for the feature store,
which can then be used for ML inference (churn prediction, recommendations, etc.)
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.clickhouse_service import get_clickhouse_service
from app.services.aerospike_service import get_aerospike_service


# Load feature definitions
FEATURE_DEFINITIONS_PATH = Path(__file__).parent.parent.parent / "data" / "feature_definitions.json"


@dataclass
class UserFeatures:
    """Container for computed user features."""
    user_id: str
    project_id: str
    
    # Cart behavior
    cart_adds_7d: int = 0
    cart_adds_30d: int = 0
    cart_removes_30d: int = 0
    cart_abandonment_rate: float = 0.0
    avg_cart_value_30d: float = 0.0
    unique_products_carted_30d: int = 0
    checkouts_30d: int = 0
    
    # Page engagement
    page_views_7d: int = 0
    page_views_30d: int = 0
    sessions_7d: int = 0
    sessions_30d: int = 0
    avg_session_duration_ms: float = 0.0
    product_views_30d: int = 0
    unique_products_viewed_30d: int = 0
    checkout_page_views_30d: int = 0
    
    # Purchase history
    orders_30d: int = 0
    orders_90d: int = 0
    total_revenue_30d: float = 0.0
    total_revenue_90d: float = 0.0
    avg_order_value: float = 0.0
    total_items_purchased_30d: int = 0
    
    # Recency
    days_since_last_visit: int = 999
    days_since_last_cart_add: int = 999
    days_since_last_order: int = 999
    
    # Trends (previous week for comparison)
    page_views_7d_prev: int = 0
    cart_adds_7d_prev: int = 0
    
    # Computed at runtime
    computed_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "user_id": self.user_id,
            "project_id": self.project_id,
            # Cart
            "cart_adds_7d": self.cart_adds_7d,
            "cart_adds_30d": self.cart_adds_30d,
            "cart_removes_30d": self.cart_removes_30d,
            "checkouts_30d": self.checkouts_30d,
            "cart_abandonment_rate": self.cart_abandonment_rate,
            "avg_cart_value_30d": self.avg_cart_value_30d,
            "unique_products_carted_30d": self.unique_products_carted_30d,
            # Page
            "page_views_7d": self.page_views_7d,
            "page_views_30d": self.page_views_30d,
            "sessions_7d": self.sessions_7d,
            "sessions_30d": self.sessions_30d,
            "avg_session_duration_ms": self.avg_session_duration_ms,
            "product_views_30d": self.product_views_30d,
            "unique_products_viewed_30d": self.unique_products_viewed_30d,
            "checkout_page_views_30d": self.checkout_page_views_30d,
            # Orders
            "orders_30d": self.orders_30d,
            "orders_90d": self.orders_90d,
            "total_revenue_30d": self.total_revenue_30d,
            "total_revenue_90d": self.total_revenue_90d,
            "avg_order_value": self.avg_order_value,
            "total_items_purchased_30d": self.total_items_purchased_30d,
            # Recency
            "days_since_last_visit": self.days_since_last_visit,
            "days_since_last_cart_add": self.days_since_last_cart_add,
            "days_since_last_order": self.days_since_last_order,
            # Trends
            "page_views_7d_prev": self.page_views_7d_prev,
            "cart_adds_7d_prev": self.cart_adds_7d_prev,
            # Derived features (computed)
            "page_views_trend": self._safe_div(self.page_views_7d, self.page_views_7d_prev),
            "cart_activity_trend": self._safe_div(self.cart_adds_7d, self.cart_adds_7d_prev),
            "is_declining_engagement": self._safe_div(self.page_views_7d, self.page_views_7d_prev) < 0.5 if self.page_views_7d_prev > 0 else False,
            "purchase_frequency": self.orders_30d,
            "browse_to_cart_ratio": self._safe_div(self.unique_products_carted_30d, self.unique_products_viewed_30d),
            "cart_to_purchase_ratio": self._safe_div(self.orders_30d, self.cart_adds_30d),
            "engagement_score": min(100, self.page_views_30d * 0.3 + self.sessions_30d * 2 + self.cart_adds_30d * 5 + self.orders_30d * 20),
            # Metadata
            "computed_at": self.computed_at,
        }
    
    @staticmethod
    def _safe_div(a: float, b: float) -> float:
        """Safe division, returns 0 if denominator is 0."""
        return a / b if b != 0 else 0.0


class FeatureComputationService:
    """Service for computing user features from ClickHouse."""
    
    def __init__(self):
        self.clickhouse = get_clickhouse_service()
    
    def compute_features_for_user(
        self,
        project_id: str,
        user_id: str,
    ) -> UserFeatures:
        """
        Compute all features for a single user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            
        Returns:
            UserFeatures object with all computed features
        """
        features = UserFeatures(user_id=user_id, project_id=project_id)
        
        # Compute cart features
        self._compute_cart_features(features)
        
        # Compute page features
        self._compute_page_features(features)
        
        # Compute order features
        self._compute_order_features(features)
        
        # Compute recency features
        self._compute_recency_features(features)
        
        # Compute trend features (previous week)
        self._compute_trend_features(features)
        
        # Compute cart abandonment rate
        if features.cart_adds_30d > 0:
            features.cart_abandonment_rate = 1 - (features.checkouts_30d / features.cart_adds_30d)
        
        return features
    
    def _compute_cart_features(self, features: UserFeatures):
        """Compute cart-related features."""
        query = """
            SELECT
                countIf(event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 7 DAY) AS cart_adds_7d,
                countIf(event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 30 DAY) AS cart_adds_30d,
                countIf(event_type = 'cart.remove' AND event_timestamp >= now() - INTERVAL 30 DAY) AS cart_removes_30d,
                countIf(event_type = 'cart.checkout' AND event_timestamp >= now() - INTERVAL 30 DAY) AS checkouts_30d,
                avgIf(cart_total, cart_total > 0 AND event_timestamp >= now() - INTERVAL 30 DAY) AS avg_cart_value,
                uniqExactIf(product_id, event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 30 DAY) AS unique_products
            FROM cart_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            
            if result.result_rows:
                row = result.result_rows[0]
                features.cart_adds_7d = int(row[0] or 0)
                features.cart_adds_30d = int(row[1] or 0)
                features.cart_removes_30d = int(row[2] or 0)
                features.checkouts_30d = int(row[3] or 0)
                features.avg_cart_value_30d = float(row[4] or 0)
                features.unique_products_carted_30d = int(row[5] or 0)
        except Exception as e:
            print(f"Error computing cart features: {e}")
    
    def _compute_page_features(self, features: UserFeatures):
        """Compute page engagement features."""
        query = """
            SELECT
                countIf(event_timestamp >= now() - INTERVAL 7 DAY) AS page_views_7d,
                countIf(event_timestamp >= now() - INTERVAL 30 DAY) AS page_views_30d,
                uniqExactIf(session_id, event_timestamp >= now() - INTERVAL 7 DAY) AS sessions_7d,
                uniqExactIf(session_id, event_timestamp >= now() - INTERVAL 30 DAY) AS sessions_30d,
                avgIf(duration_ms, duration_ms > 0) AS avg_duration,
                countIf(page_type = 'product' AND event_timestamp >= now() - INTERVAL 30 DAY) AS product_views,
                uniqExactIf(product_id, page_type = 'product' AND product_id != '' AND event_timestamp >= now() - INTERVAL 30 DAY) AS unique_products,
                countIf(page_type = 'checkout' AND event_timestamp >= now() - INTERVAL 30 DAY) AS checkout_views
            FROM page_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            
            if result.result_rows:
                row = result.result_rows[0]
                features.page_views_7d = int(row[0] or 0)
                features.page_views_30d = int(row[1] or 0)
                features.sessions_7d = int(row[2] or 0)
                features.sessions_30d = int(row[3] or 0)
                features.avg_session_duration_ms = float(row[4] or 0)
                features.product_views_30d = int(row[5] or 0)
                features.unique_products_viewed_30d = int(row[6] or 0)
                features.checkout_page_views_30d = int(row[7] or 0)
        except Exception as e:
            print(f"Error computing page features: {e}")
    
    def _compute_order_features(self, features: UserFeatures):
        """Compute order/purchase features."""
        query = """
            SELECT
                countIf(event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS orders_30d,
                countIf(event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 90 DAY) AS orders_90d,
                sumIf(total_amount, event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS revenue_30d,
                sumIf(total_amount, event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 90 DAY) AS revenue_90d,
                avgIf(total_amount, event_type = 'order.created') AS avg_order,
                sumIf(item_count, event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS items_30d
            FROM order_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            
            if result.result_rows:
                row = result.result_rows[0]
                features.orders_30d = int(row[0] or 0)
                features.orders_90d = int(row[1] or 0)
                features.total_revenue_30d = float(row[2] or 0)
                features.total_revenue_90d = float(row[3] or 0)
                features.avg_order_value = float(row[4] or 0)
                features.total_items_purchased_30d = int(row[5] or 0)
        except Exception as e:
            print(f"Error computing order features: {e}")
    
    def _compute_recency_features(self, features: UserFeatures):
        """Compute recency features (days since last X)."""
        # Days since last page view
        query = """
            SELECT dateDiff('day', max(event_timestamp), now())
            FROM page_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            if result.result_rows and result.result_rows[0][0] is not None:
                features.days_since_last_visit = int(result.result_rows[0][0])
        except Exception as e:
            print(f"Error computing days_since_last_visit: {e}")
        
        # Days since last cart add
        query = """
            SELECT dateDiff('day', max(event_timestamp), now())
            FROM cart_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
              AND event_type = 'cart.add'
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            if result.result_rows and result.result_rows[0][0] is not None:
                features.days_since_last_cart_add = int(result.result_rows[0][0])
        except Exception as e:
            print(f"Error computing days_since_last_cart_add: {e}")
        
        # Days since last order
        query = """
            SELECT dateDiff('day', max(event_timestamp), now())
            FROM order_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
              AND event_type = 'order.created'
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            if result.result_rows and result.result_rows[0][0] is not None:
                features.days_since_last_order = int(result.result_rows[0][0])
        except Exception as e:
            print(f"Error computing days_since_last_order: {e}")
    
    def _compute_trend_features(self, features: UserFeatures):
        """Compute previous week features for trend analysis."""
        # Page views from 7-14 days ago
        query = """
            SELECT count()
            FROM page_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
              AND event_timestamp >= now() - INTERVAL 14 DAY
              AND event_timestamp < now() - INTERVAL 7 DAY
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            if result.result_rows:
                features.page_views_7d_prev = int(result.result_rows[0][0] or 0)
        except Exception as e:
            print(f"Error computing page_views_7d_prev: {e}")
        
        # Cart adds from 7-14 days ago
        query = """
            SELECT count()
            FROM cart_events
            WHERE project_id = {project_id:String}
              AND user_id = {user_id:String}
              AND event_type = 'cart.add'
              AND event_timestamp >= now() - INTERVAL 14 DAY
              AND event_timestamp < now() - INTERVAL 7 DAY
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": features.project_id,
                "user_id": features.user_id,
            })
            if result.result_rows:
                features.cart_adds_7d_prev = int(result.result_rows[0][0] or 0)
        except Exception as e:
            print(f"Error computing cart_adds_7d_prev: {e}")
    
    def compute_features_for_all_users(
        self,
        project_id: str,
        days_active: int = 30,
    ) -> List[UserFeatures]:
        """
        Compute features for all active users in a project.
        
        Args:
            project_id: Project identifier
            days_active: Only include users active in last N days
            
        Returns:
            List of UserFeatures for all active users
        """
        # Get list of active users
        query = """
            SELECT DISTINCT user_id
            FROM all_events
            WHERE project_id = {project_id:String}
              AND event_timestamp >= now() - INTERVAL {days:UInt32} DAY
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
            "project_id": project_id,
                "days": days_active,
            })
            
            user_ids = [row[0] for row in result.result_rows]
            print(f"Found {len(user_ids)} active users in project {project_id}")
            
            features_list = []
            for user_id in user_ids:
                features = self.compute_features_for_user(project_id, user_id)
                features_list.append(features)
            
            return features_list
        except Exception as e:
            print(f"Error getting active users: {e}")
            return []


class FeatureStoreService:
    """Service for storing and retrieving features from Aerospike."""
    
    def __init__(self):
        self.aerospike = get_aerospike_service()
        self.feature_computer = FeatureComputationService()
    
    def store_features(self, features: UserFeatures, ttl_days: int = 7) -> bool:
        """
        Store computed features in Aerospike.
        
        Args:
            features: UserFeatures object
            ttl_days: Time-to-live in days
            
        Returns:
            True if successful
        """
        return self.aerospike.put_user_features(
            project_id=features.project_id,
            user_id=features.user_id,
            features=features.to_dict(),
            ttl=ttl_days * 24 * 3600,
        )
    
    def get_features(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get features for a user from Aerospike.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            
        Returns:
            Feature dictionary or None if not found
        """
        return self.aerospike.get_user_features(project_id, user_id)
    
    def compute_and_store(
        self,
        project_id: str,
        user_id: str,
        ttl_days: int = 7,
    ) -> Optional[Dict[str, Any]]:
        """
        Compute features and store in feature store.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            ttl_days: Time-to-live in days
            
        Returns:
            Computed features or None if failed
        """
        features = self.feature_computer.compute_features_for_user(project_id, user_id)
        
        if self.store_features(features, ttl_days):
            return features.to_dict()
        return None
    
    def refresh_all_features(
        self,
        project_id: str,
        days_active: int = 30,
        ttl_days: int = 7,
    ) -> Dict[str, int]:
        """
        Refresh features for all active users.
        
        Args:
            project_id: Project identifier
            days_active: Only include users active in last N days
            ttl_days: Time-to-live in days
            
        Returns:
            Stats dict with success/failed counts
        """
        features_list = self.feature_computer.compute_features_for_all_users(
            project_id, days_active
        )
        
        success = 0
        failed = 0
        
        for features in features_list:
            if self.store_features(features, ttl_days):
                success += 1
            else:
                failed += 1
        
        return {"success": success, "failed": failed, "total": len(features_list)}


# Singleton instances
_feature_service: Optional[FeatureComputationService] = None
_feature_store: Optional[FeatureStoreService] = None


def get_feature_service() -> FeatureComputationService:
    """Get the feature computation service singleton."""
    global _feature_service
    if _feature_service is None:
        _feature_service = FeatureComputationService()
    return _feature_service


def get_feature_store() -> FeatureStoreService:
    """Get the feature store service singleton."""
    global _feature_store
    if _feature_store is None:
        _feature_store = FeatureStoreService()
    return _feature_store
