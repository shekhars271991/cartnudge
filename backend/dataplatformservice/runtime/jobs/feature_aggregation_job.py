"""
Feature Aggregation Job - Runs as a separate containerized service.

This job runs continuously in its own container, computing user features
at a configurable interval and storing them in Aerospike by FEATURE GROUPS.

Feature Groups:
- cart: Shopping cart behavior (adds, removes, checkout)
- page: Page view and session data
- order: Purchase history and revenue
- engagement: Computed engagement scores
- recency: Time-based recency features

Each group is stored in its own Aerospike set with independent TTLs.

Configuration via environment variables:
- AGGREGATION_INTERVAL_SECONDS: How often to run (default: 5)
- DAYS_ACTIVE: Only process users active in last N days (default: 30)
- BATCH_SIZE: Users to process per batch (default: 100)

Run as a standalone container:
    python -m runtime.jobs.feature_aggregation_job
"""
from __future__ import annotations

import asyncio
import os
import signal
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.config import settings


# Configuration from environment
AGGREGATION_INTERVAL_SECONDS = int(os.environ.get("AGGREGATION_INTERVAL_SECONDS", "5"))
DAYS_ACTIVE = int(os.environ.get("DAYS_ACTIVE", "30"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "100"))
HEALTH_CHECK_PORT = int(os.environ.get("HEALTH_CHECK_PORT", "8012"))


class FeatureAggregationJob:
    """
    Feature aggregation job that runs continuously.
    
    Queries ClickHouse for active users and computes their features,
    then stores them in Aerospike BY FEATURE GROUP for real-time serving.
    
    Feature Groups:
    - cart: Shopping cart behavior
    - page: Page view and session data
    - order: Purchase history
    - engagement: Computed scores
    - recency: Time-based features
    """
    
    def __init__(self):
        self.interval = AGGREGATION_INTERVAL_SECONDS
        self.days_active = DAYS_ACTIVE
        self.batch_size = BATCH_SIZE
        self.running = False
        
        # Lazy imports to avoid connection at import time
        self._clickhouse = None
        self._aerospike = None
        self._feature_group_enum = None
        
        # Stats
        self.runs_completed = 0
        self.total_users_processed = 0
        self.total_feature_groups_stored = 0
        self.errors = 0
        self.last_run_duration = 0
        self.start_time = time.time()
    
    @property
    def clickhouse(self):
        if self._clickhouse is None:
            from app.services.clickhouse_service import get_clickhouse_service
            self._clickhouse = get_clickhouse_service()
            self._clickhouse.connect()
        return self._clickhouse
    
    @property
    def aerospike(self):
        if self._aerospike is None:
            from app.services.aerospike_service import get_aerospike_service
            self._aerospike = get_aerospike_service()
        return self._aerospike
    
    @property
    def FeatureGroup(self):
        if self._feature_group_enum is None:
            from app.services.aerospike_service import FeatureGroup
            self._feature_group_enum = FeatureGroup
        return self._feature_group_enum
    
    def get_active_users(self, project_id: str) -> List[str]:
        """Get list of active users for a project."""
        query = """
            SELECT DISTINCT user_id
            FROM all_events
            WHERE project_id = {project_id:String}
              AND event_timestamp >= now() - INTERVAL {days:UInt32} DAY
            LIMIT {limit:UInt32}
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "project_id": project_id,
                "days": self.days_active,
                "limit": self.batch_size,
            })
            return [row[0] for row in result.result_rows]
        except Exception as e:
            print(f"Error getting active users: {e}")
            return []
    
    def get_active_projects(self) -> List[str]:
        """Get list of projects with recent activity."""
        query = """
            SELECT DISTINCT project_id
            FROM all_events
            WHERE event_timestamp >= now() - INTERVAL {days:UInt32} DAY
        """
        
        try:
            result = self.clickhouse.client.query(query, parameters={
                "days": self.days_active,
            })
            return [row[0] for row in result.result_rows]
        except Exception as e:
            print(f"Error getting active projects: {e}")
            return []
    
    def compute_cart_features(self, project_id: str, user_id: str) -> dict:
        """Compute cart-related features."""
        cart_query = """
            SELECT
                countIf(event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 1 DAY) AS cart_adds_1d,
                countIf(event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 7 DAY) AS cart_adds_7d,
                countIf(event_type = 'cart.add' AND event_timestamp >= now() - INTERVAL 30 DAY) AS cart_adds_30d,
                countIf(event_type = 'cart.remove' AND event_timestamp >= now() - INTERVAL 7 DAY) AS cart_removes_7d,
                countIf(event_type = 'cart.remove' AND event_timestamp >= now() - INTERVAL 30 DAY) AS cart_removes_30d,
                countIf(event_type = 'cart.checkout' AND event_timestamp >= now() - INTERVAL 30 DAY) AS checkouts_30d,
                avgIf(cart_total, cart_total > 0) AS avg_cart_value,
                maxIf(cart_total, cart_total > 0) AS max_cart_value,
                uniqExactIf(product_id, event_type = 'cart.add') AS unique_products_carted
            FROM cart_events
            WHERE project_id = {project_id:String} AND user_id = {user_id:String}
        """
        result = self.clickhouse.client.query(cart_query, parameters={
            "project_id": project_id, "user_id": user_id
        })
        
        if result.result_rows:
            row = result.result_rows[0]
            return {
                "adds_1d": int(row[0] or 0),
                "adds_7d": int(row[1] or 0),
                "adds_30d": int(row[2] or 0),
                "removes_7d": int(row[3] or 0),
                "removes_30d": int(row[4] or 0),
                "checkouts_30d": int(row[5] or 0),
                "avg_value": float(row[6] or 0),
                "max_value": float(row[7] or 0),
                "unique_products": int(row[8] or 0),
            }
        return {}
    
    def compute_page_features(self, project_id: str, user_id: str) -> dict:
        """Compute page view features."""
        page_query = """
            SELECT
                countIf(event_timestamp >= now() - INTERVAL 1 DAY) AS views_1d,
                countIf(event_timestamp >= now() - INTERVAL 7 DAY) AS views_7d,
                countIf(event_timestamp >= now() - INTERVAL 30 DAY) AS views_30d,
                uniqExactIf(session_id, event_timestamp >= now() - INTERVAL 1 DAY) AS sessions_1d,
                uniqExactIf(session_id, event_timestamp >= now() - INTERVAL 7 DAY) AS sessions_7d,
                uniqExactIf(session_id, event_timestamp >= now() - INTERVAL 30 DAY) AS sessions_30d,
                avgIf(duration_ms, duration_ms > 0) AS avg_duration_ms,
                countIf(page_type = 'product') AS product_views,
                uniqExactIf(product_id, page_type = 'product' AND product_id != '') AS unique_products_viewed
            FROM page_events
            WHERE project_id = {project_id:String} AND user_id = {user_id:String}
        """
        result = self.clickhouse.client.query(page_query, parameters={
            "project_id": project_id, "user_id": user_id
        })
        
        if result.result_rows:
            row = result.result_rows[0]
            return {
                "views_1d": int(row[0] or 0),
                "views_7d": int(row[1] or 0),
                "views_30d": int(row[2] or 0),
                "sessions_1d": int(row[3] or 0),
                "sessions_7d": int(row[4] or 0),
                "sessions_30d": int(row[5] or 0),
                "avg_duration_ms": float(row[6] or 0),
                "product_views": int(row[7] or 0),
                "unique_products_viewed": int(row[8] or 0),
            }
        return {}
    
    def compute_order_features(self, project_id: str, user_id: str) -> dict:
        """Compute order/purchase features."""
        order_query = """
            SELECT
                countIf(event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS orders_30d,
                countIf(event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 90 DAY) AS orders_90d,
                countIf(event_type = 'order.created') AS orders_lifetime,
                sumIf(total_amount, event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS revenue_30d,
                sumIf(total_amount, event_type = 'order.created') AS revenue_lifetime,
                avgIf(total_amount, event_type = 'order.created') AS avg_order_value,
                sumIf(item_count, event_type = 'order.created' AND event_timestamp >= now() - INTERVAL 30 DAY) AS items_30d
            FROM order_events
            WHERE project_id = {project_id:String} AND user_id = {user_id:String}
        """
        result = self.clickhouse.client.query(order_query, parameters={
            "project_id": project_id, "user_id": user_id
        })
        
        if result.result_rows:
            row = result.result_rows[0]
            return {
                "count_30d": int(row[0] or 0),
                "count_90d": int(row[1] or 0),
                "count_lifetime": int(row[2] or 0),
                "revenue_30d": float(row[3] or 0),
                "revenue_lifetime": float(row[4] or 0),
                "avg_value": float(row[5] or 0),
                "items_30d": int(row[6] or 0),
            }
        return {}
    
    def compute_recency_features(self, project_id: str, user_id: str) -> dict:
        """Compute recency/time-based features."""
        recency_query = """
            SELECT 
                dateDiff('day', maxIf(event_timestamp, 1=1), now()) AS days_since_last_event,
                dateDiff('hour', maxIf(event_timestamp, 1=1), now()) AS hours_since_last_event,
                minIf(event_timestamp, 1=1) AS first_seen,
                maxIf(event_timestamp, 1=1) AS last_seen
            FROM all_events
            WHERE project_id = {project_id:String} AND user_id = {user_id:String}
        """
        result = self.clickhouse.client.query(recency_query, parameters={
            "project_id": project_id, "user_id": user_id
        })
        
        if result.result_rows and result.result_rows[0][0] is not None:
            row = result.result_rows[0]
            first_seen = row[2].isoformat() if row[2] else None
            last_seen = row[3].isoformat() if row[3] else None
            return {
                "days_since_last": int(row[0] or 999),
                "hours_since_last": int(row[1] or 9999),
                "first_seen": first_seen,
                "last_seen": last_seen,
            }
        return {"days_since_last": 999, "hours_since_last": 9999}
    
    def compute_engagement_features(
        self, 
        cart_features: dict, 
        page_features: dict, 
        order_features: dict,
        recency_features: dict,
    ) -> dict:
        """Compute derived engagement features from other groups."""
        cart_adds = cart_features.get("adds_30d", 0)
        checkouts = cart_features.get("checkouts_30d", 0)
        page_views = page_features.get("views_30d", 0)
        sessions = page_features.get("sessions_30d", 0)
        orders = order_features.get("count_30d", 0)
        products_carted = cart_features.get("unique_products", 0)
        products_viewed = page_features.get("unique_products_viewed", 0)
        days_since = recency_features.get("days_since_last", 999)
        
        # Cart abandonment rate
        cart_abandonment = 1 - (checkouts / cart_adds) if cart_adds > 0 else 0
        
        # Engagement score (0-100)
        engagement_score = min(100, page_views * 0.3 + sessions * 2 + cart_adds * 5 + orders * 20)
        
        # Recency penalty
        recency_score = max(0, 100 - days_since * 3)
        
        # Conversion ratios
        browse_to_cart = products_carted / products_viewed if products_viewed > 0 else 0
        cart_to_purchase = orders / cart_adds if cart_adds > 0 else 0
        
        return {
            "cart_abandonment_rate": round(cart_abandonment, 4),
            "engagement_score": round(engagement_score, 2),
            "recency_score": round(recency_score, 2),
            "browse_to_cart_ratio": round(browse_to_cart, 4),
            "cart_to_purchase_ratio": round(cart_to_purchase, 4),
            "is_active_7d": 1 if page_features.get("views_7d", 0) > 0 else 0,
            "is_buyer": 1 if order_features.get("count_lifetime", 0) > 0 else 0,
        }
    
    def compute_user_features(self, project_id: str, user_id: str) -> dict[str, dict]:
        """
        Compute all feature groups for a single user.
        
        Returns:
            Dictionary mapping feature group name to features
        """
        try:
            feature_groups = {}
            
            # Compute each feature group
            feature_groups["cart"] = self.compute_cart_features(project_id, user_id)
            feature_groups["page"] = self.compute_page_features(project_id, user_id)
            feature_groups["order"] = self.compute_order_features(project_id, user_id)
            feature_groups["recency"] = self.compute_recency_features(project_id, user_id)
            
            # Engagement features depend on other groups
            feature_groups["engagement"] = self.compute_engagement_features(
                feature_groups["cart"],
                feature_groups["page"],
                feature_groups["order"],
                feature_groups["recency"],
            )
            
            return feature_groups
            
        except Exception as e:
            print(f"Error computing features for {user_id}: {e}")
            return {}
    
    def store_features(self, project_id: str, user_id: str, feature_groups: dict[str, dict]) -> int:
        """
        Store feature groups in Aerospike.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            feature_groups: Dictionary mapping group name to features
            
        Returns:
            Number of groups successfully stored
        """
        stored_count = 0
        
        for group_name, features in feature_groups.items():
            if not features:
                continue
                
            try:
                success = self.aerospike.put_feature_group(
                    project_id=project_id,
                    user_id=user_id,
                    feature_group=group_name,
                    features=features,
                    ttl=None,  # Use default TTL for each group
                )
                if success:
                    stored_count += 1
            except Exception as e:
                print(f"Error storing {group_name} features for {user_id}: {e}")
        
        return stored_count
    
    def run_once(self) -> dict:
        """Run one aggregation cycle."""
        start_time = time.time()
        
        stats = {
            "projects": 0,
            "users_processed": 0,
            "feature_groups_stored": 0,
            "errors": 0,
        }
        
        try:
            # Get active projects
            projects = self.get_active_projects()
            stats["projects"] = len(projects)
            
            for project_id in projects:
                # Get active users
                users = self.get_active_users(project_id)
                
                for user_id in users:
                    # Compute all feature groups
                    feature_groups = self.compute_user_features(project_id, user_id)
                    
                    if feature_groups:
                        # Store each feature group in Aerospike
                        groups_stored = self.store_features(project_id, user_id, feature_groups)
                        stats["feature_groups_stored"] += groups_stored
                        
                        if groups_stored == 0:
                            stats["errors"] += 1
                    else:
                        stats["errors"] += 1
                    
                    stats["users_processed"] += 1
            
        except Exception as e:
            print(f"Error in aggregation run: {e}")
            stats["errors"] += 1
        
        self.last_run_duration = time.time() - start_time
        self.runs_completed += 1
        self.total_users_processed += stats["users_processed"]
        self.total_feature_groups_stored += stats["feature_groups_stored"]
        self.errors += stats["errors"]
        
        return stats
    
    async def run(self):
        """Main loop - runs continuously at configured interval."""
        self.running = True
        
        print()
        print("╔" + "═" * 58 + "╗")
        print("║" + " Feature Aggregation Job (Multi-Group) ".center(58) + "║")
        print("║" + f" Interval: {self.interval}s ".center(58) + "║")
        print("╚" + "═" * 58 + "╝")
        print()
        print(f"Configuration:")
        print(f"  Interval: {self.interval} seconds")
        print(f"  Days Active: {self.days_active}")
        print(f"  Batch Size: {self.batch_size}")
        print(f"  Feature Groups: cart, page, order, engagement, recency")
        print()
        
        while self.running:
            run_start = time.time()
            
            stats = self.run_once()
            
            if stats["users_processed"] > 0:
                print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] "
                      f"Processed {stats['users_processed']} users, "
                      f"stored {stats['feature_groups_stored']} feature groups "
                      f"({self.last_run_duration:.2f}s)")
            
            # Wait for next interval
            elapsed = time.time() - run_start
            sleep_time = max(0, self.interval - elapsed)
            
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
    
    def stop(self):
        """Stop the job gracefully."""
        self.running = False
        print()
        print("=" * 60)
        print("Feature Aggregation Job - Stopping")
        print("=" * 60)
        print(f"  Runs completed: {self.runs_completed}")
        print(f"  Total users processed: {self.total_users_processed}")
        print(f"  Total feature groups stored: {self.total_feature_groups_stored}")
        print(f"  Total errors: {self.errors}")
        print(f"  Uptime: {time.time() - self.start_time:.0f}s")
        print()


async def run_health_server(job: FeatureAggregationJob):
    """Run a simple health check server."""
    from aiohttp import web
    
    async def health_handler(request):
        return web.json_response({
            "status": "healthy" if job.running else "stopped",
            "runs_completed": job.runs_completed,
            "total_users_processed": job.total_users_processed,
            "total_feature_groups_stored": job.total_feature_groups_stored,
            "feature_groups": ["cart", "page", "order", "engagement", "recency"],
            "errors": job.errors,
            "last_run_duration_seconds": job.last_run_duration,
            "uptime_seconds": time.time() - job.start_time,
        })
    
    app = web.Application()
    app.router.add_get("/health", health_handler)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", HEALTH_CHECK_PORT)
    await site.start()
    print(f"✓ Health check server on port {HEALTH_CHECK_PORT}")
    
    return runner


async def main():
    """Main entry point."""
    job = FeatureAggregationJob()
    
    # Setup signal handlers
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        print("\n⚠ Received shutdown signal...")
        job.stop()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    # Start health server
    health_runner = await run_health_server(job)
    
    try:
        await job.run()
    finally:
        await health_runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())

