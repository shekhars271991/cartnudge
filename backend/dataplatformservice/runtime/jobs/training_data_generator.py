"""
Training Data Generator - Generates labeled training data for ML models.

This job generates training data for purchase propensity prediction:
- For each cart.add event, compute features as of that moment
- Look ahead to determine if user purchased (label)
- Write to ClickHouse training table

Configuration via environment variables:
- TRAINING_DATA_DATE: Specific date to process (YYYY-MM-DD), default: yesterday
- LABEL_WINDOW_HOURS: Hours to wait for purchase (default: 24)
- FEATURE_WINDOW_DAYS: Days to look back for features (default: 30)
- BATCH_SIZE: Samples to process per batch (default: 1000)

Run modes:
- Daily job (default): Process yesterday's data
- Manual trigger: Process specific date range via API
"""
from __future__ import annotations

import asyncio
import os
import signal
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.config import settings


# Configuration from environment
LABEL_WINDOW_HOURS = int(os.environ.get("LABEL_WINDOW_HOURS", "24"))
FEATURE_WINDOW_DAYS = int(os.environ.get("FEATURE_WINDOW_DAYS", "30"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "1000"))
HEALTH_CHECK_PORT = int(os.environ.get("HEALTH_CHECK_PORT", "8013"))


class PurchasePropensityTrainingDataGenerator:
    """
    Generates training data for purchase propensity prediction.
    
    For each cart.add event:
    1. Compute features as of that timestamp (looking back FEATURE_WINDOW_DAYS)
    2. Look ahead LABEL_WINDOW_HOURS to determine if purchase occurred
    3. Write sample to ClickHouse training table
    """
    
    def __init__(self):
        self._clickhouse = None
        self.label_window_hours = LABEL_WINDOW_HOURS
        self.feature_window_days = FEATURE_WINDOW_DAYS
        self.batch_size = BATCH_SIZE
        
        # Stats
        self.samples_generated = 0
        self.positive_samples = 0
        self.negative_samples = 0
        self.errors = 0
    
    @property
    def clickhouse(self):
        if self._clickhouse is None:
            from app.services.clickhouse_service import get_clickhouse_service
            self._clickhouse = get_clickhouse_service()
            self._clickhouse.connect()
        return self._clickhouse
    
    def generate_for_date_range(
        self,
        project_id: str,
        start_date: str,
        end_date: str,
    ) -> Dict[str, Any]:
        """
        Generate training data for a date range.
        
        Args:
            project_id: Project identifier
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD), exclusive
            
        Returns:
            Stats dictionary
        """
        run_id = str(uuid.uuid4())
        
        print(f"\n{'='*60}")
        print(f"Purchase Propensity Training Data Generator")
        print(f"{'='*60}")
        print(f"Run ID: {run_id}")
        print(f"Project: {project_id}")
        print(f"Date Range: {start_date} to {end_date}")
        print(f"Label Window: {self.label_window_hours} hours")
        print(f"Feature Window: {self.feature_window_days} days")
        print(f"{'='*60}\n")
        
        # Record run start
        self._record_run_start(run_id, project_id, start_date, end_date)
        
        try:
            # Generate training data using SQL
            samples = self._generate_samples(project_id, start_date, end_date, run_id)
            
            # Record run completion
            self._record_run_complete(run_id, samples)
            
            print(f"\n{'='*60}")
            print(f"COMPLETED")
            print(f"{'='*60}")
            print(f"Total Samples: {samples['total']}")
            print(f"Positive (purchased): {samples['positive']} ({samples['positive']/max(samples['total'],1)*100:.1f}%)")
            print(f"Negative (abandoned): {samples['negative']} ({samples['negative']/max(samples['total'],1)*100:.1f}%)")
            print(f"{'='*60}\n")
            
            return samples
            
        except Exception as e:
            print(f"ERROR: {e}")
            self._record_run_error(run_id, str(e))
            raise
    
    def _generate_samples(
        self,
        project_id: str,
        start_date: str,
        end_date: str,
        run_id: str,
    ) -> Dict[str, int]:
        """Generate and insert training samples."""
        
        # This query:
        # 1. Gets all cart.add events in the date range
        # 2. Computes features as of that timestamp
        # 3. Determines label (did purchase happen within window?)
        # 4. Inserts into training table
        
        insert_query = f"""
        INSERT INTO events.purchase_propensity_training
        SELECT
            -- Identifiers
            generateUUIDv4() as sample_id,
            c.project_id,
            c.user_id,
            
            -- Observation context
            c.event_timestamp as observation_timestamp,
            toDate(c.event_timestamp) as observation_date,
            
            -- Current cart context
            c.price as cart_item_price,
            c.cart_total,
            1 as cart_item_count,  -- At least 1 item added
            
            -- Cart Behavior Features (looking back from observation)
            countIf(c2.event_type = 'cart.add' 
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 7 DAY) as f_cart_adds_7d,
            countIf(c2.event_type = 'cart.add'
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_cart_adds_30d,
            countIf(c2.event_type = 'cart.remove'
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_cart_removes_30d,
            countIf(c2.event_type = 'cart.checkout'
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_checkouts_30d,
            uniqExactIf(c2.product_id, c2.event_type = 'cart.add'
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_unique_products_carted_30d,
            avgIf(c2.cart_total, c2.cart_total > 0
                AND c2.event_timestamp < c.event_timestamp
                AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_avg_cart_value_30d,
            
            -- Cart Abandonment (cart adds without checkout in 30d)
            IF(
                countIf(c2.event_type = 'cart.add' AND c2.event_timestamp < c.event_timestamp
                    AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) > 0,
                1 - (countIf(c2.event_type = 'cart.checkout' AND c2.event_timestamp < c.event_timestamp
                    AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) /
                    countIf(c2.event_type = 'cart.add' AND c2.event_timestamp < c.event_timestamp
                        AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY)),
                0
            ) as f_cart_abandonment_rate,
            
            -- Carts abandoned (approximation: cart adds - orders)
            greatest(0, 
                countIf(c2.event_type = 'cart.add' AND c2.event_timestamp < c.event_timestamp
                    AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) -
                (SELECT count() FROM events.order_events o 
                 WHERE o.user_id = c.user_id AND o.project_id = c.project_id
                   AND o.event_type = 'order.created'
                   AND o.event_timestamp < c.event_timestamp
                   AND o.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY)
            ) as f_carts_abandoned_30d,
            
            -- Page Engagement Features
            (SELECT count() FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 7 DAY) as f_page_views_7d,
            (SELECT count() FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_page_views_30d,
            (SELECT uniqExact(session_id) FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 7 DAY) as f_sessions_7d,
            (SELECT uniqExact(session_id) FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_sessions_30d,
            (SELECT avg(duration_ms) FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.event_timestamp < c.event_timestamp
               AND p.duration_ms > 0) as f_avg_session_duration_ms,
            (SELECT count() FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.page_type = 'product'
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_product_views_30d,
            (SELECT uniqExact(product_id) FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.page_type = 'product' AND p.product_id != ''
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_unique_products_viewed_30d,
            (SELECT count() FROM events.page_events p
             WHERE p.user_id = c.user_id AND p.project_id = c.project_id
               AND p.page_type = 'checkout'
               AND p.event_timestamp < c.event_timestamp
               AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_checkout_page_views_30d,
            
            -- Purchase History Features
            (SELECT count() FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp
               AND o.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_orders_30d,
            (SELECT count() FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp
               AND o.event_timestamp >= c.event_timestamp - INTERVAL 90 DAY) as f_orders_90d,
            (SELECT count() FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp) as f_orders_lifetime,
            (SELECT sum(total_amount) FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp
               AND o.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) as f_total_revenue_30d,
            (SELECT sum(total_amount) FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp) as f_total_revenue_lifetime,
            (SELECT avg(total_amount) FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp < c.event_timestamp) as f_avg_order_value,
            
            -- Recency Features
            coalesce(
                dateDiff('day',
                    (SELECT max(event_timestamp) FROM events.page_events p
                     WHERE p.user_id = c.user_id AND p.project_id = c.project_id
                       AND p.event_timestamp < c.event_timestamp),
                    c.event_timestamp),
                999
            ) as f_days_since_last_visit,
            coalesce(
                dateDiff('day',
                    (SELECT max(event_timestamp) FROM events.cart_events c3
                     WHERE c3.user_id = c.user_id AND c3.project_id = c.project_id
                       AND c3.event_type = 'cart.add'
                       AND c3.event_timestamp < c.event_timestamp),
                    c.event_timestamp),
                999
            ) as f_days_since_last_cart_add,
            coalesce(
                dateDiff('day',
                    (SELECT max(event_timestamp) FROM events.order_events o
                     WHERE o.user_id = c.user_id AND o.project_id = c.project_id
                       AND o.event_type = 'order.created'
                       AND o.event_timestamp < c.event_timestamp),
                    c.event_timestamp),
                999
            ) as f_days_since_last_order,
            
            -- Time-based Features
            toDayOfWeek(c.event_timestamp) as f_day_of_week,
            toHour(c.event_timestamp) as f_hour_of_day,
            IF(toDayOfWeek(c.event_timestamp) IN (6, 7), 1, 0) as f_is_weekend,
            
            -- Engagement Score (composite)
            least(100, 
                (SELECT count() FROM events.page_events p
                 WHERE p.user_id = c.user_id AND p.project_id = c.project_id
                   AND p.event_timestamp < c.event_timestamp
                   AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) * 0.3 +
                (SELECT uniqExact(session_id) FROM events.page_events p
                 WHERE p.user_id = c.user_id AND p.project_id = c.project_id
                   AND p.event_timestamp < c.event_timestamp
                   AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) * 2 +
                countIf(c2.event_type = 'cart.add'
                    AND c2.event_timestamp < c.event_timestamp
                    AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) * 5 +
                (SELECT count() FROM events.order_events o
                 WHERE o.user_id = c.user_id AND o.project_id = c.project_id
                   AND o.event_type = 'order.created'
                   AND o.event_timestamp < c.event_timestamp
                   AND o.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) * 20
            ) as f_engagement_score,
            
            -- Browse-to-Cart Ratio
            IF(
                (SELECT uniqExact(product_id) FROM events.page_events p
                 WHERE p.user_id = c.user_id AND p.project_id = c.project_id
                   AND p.page_type = 'product' AND p.product_id != ''
                   AND p.event_timestamp < c.event_timestamp
                   AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) > 0,
                uniqExactIf(c2.product_id, c2.event_type = 'cart.add'
                    AND c2.event_timestamp < c.event_timestamp
                    AND c2.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY) /
                (SELECT uniqExact(product_id) FROM events.page_events p
                 WHERE p.user_id = c.user_id AND p.project_id = c.project_id
                   AND p.page_type = 'product' AND p.product_id != ''
                   AND p.event_timestamp < c.event_timestamp
                   AND p.event_timestamp >= c.event_timestamp - INTERVAL 30 DAY),
                0
            ) as f_browse_to_cart_ratio,
            
            -- LABEL: Did user purchase within {LABEL_WINDOW_HOURS} hours?
            IF(
                EXISTS(
                    SELECT 1 FROM events.order_events o
                    WHERE o.user_id = c.user_id AND o.project_id = c.project_id
                      AND o.event_type = 'order.created'
                      AND o.event_timestamp > c.event_timestamp
                      AND o.event_timestamp <= c.event_timestamp + INTERVAL {self.label_window_hours} HOUR
                ), 1, 0
            ) as label,
            
            {self.label_window_hours} as label_window_hours,
            
            -- Label context
            (SELECT min(event_timestamp) FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp > c.event_timestamp
               AND o.event_timestamp <= c.event_timestamp + INTERVAL {self.label_window_hours} HOUR) as purchased_at,
            (SELECT total_amount FROM events.order_events o
             WHERE o.user_id = c.user_id AND o.project_id = c.project_id
               AND o.event_type = 'order.created'
               AND o.event_timestamp > c.event_timestamp
               AND o.event_timestamp <= c.event_timestamp + INTERVAL {self.label_window_hours} HOUR
             ORDER BY event_timestamp LIMIT 1) as purchase_amount,
            
            -- Metadata
            now64(3) as generated_at,
            '1.0' as model_version
            
        FROM events.cart_events c
        LEFT JOIN events.cart_events c2 ON c.user_id = c2.user_id AND c.project_id = c2.project_id
        WHERE c.event_type = 'cart.add'
          AND c.project_id = {{project_id:String}}
          AND toDate(c.event_timestamp) >= {{start_date:String}}
          AND toDate(c.event_timestamp) < {{end_date:String}}
        GROUP BY
            c.project_id, c.user_id, c.event_timestamp, c.event_id,
            c.price, c.cart_total
        """
        
        print(f"Generating training samples...")
        
        # Execute the insert
        self.clickhouse.client.command(insert_query, parameters={
            "project_id": project_id,
            "start_date": start_date,
            "end_date": end_date,
        })
        
        # Get stats
        stats_query = """
        SELECT
            count() as total,
            countIf(label = 1) as positive,
            countIf(label = 0) as negative
        FROM events.purchase_propensity_training
        WHERE project_id = {project_id:String}
          AND observation_date >= {start_date:String}
          AND observation_date < {end_date:String}
          AND generated_at >= now() - INTERVAL 1 HOUR
        """
        
        result = self.clickhouse.client.query(stats_query, parameters={
            "project_id": project_id,
            "start_date": start_date,
            "end_date": end_date,
        })
        
        if result.result_rows:
            row = result.result_rows[0]
            return {
                "total": int(row[0]),
                "positive": int(row[1]),
                "negative": int(row[2]),
            }
        
        return {"total": 0, "positive": 0, "negative": 0}
    
    def _record_run_start(self, run_id: str, project_id: str, start_date: str, end_date: str):
        """Record run start in tracking table."""
        try:
            self.clickhouse.client.command("""
                INSERT INTO events.training_data_runs
                (run_id, model_type, project_id, start_date, end_date, 
                 label_window_hours, feature_window_days, status)
                VALUES
                ({run_id:String}, 'purchase_propensity', {project_id:String},
                 {start_date:String}, {end_date:String},
                 {label_window:Int32}, {feature_window:Int32}, 'running')
            """, parameters={
                "run_id": run_id,
                "project_id": project_id,
                "start_date": start_date,
                "end_date": end_date,
                "label_window": self.label_window_hours,
                "feature_window": self.feature_window_days,
            })
        except Exception as e:
            print(f"Warning: Could not record run start: {e}")
    
    def _record_run_complete(self, run_id: str, stats: Dict[str, int]):
        """Record run completion."""
        try:
            self.clickhouse.client.command("""
                ALTER TABLE events.training_data_runs
                UPDATE 
                    status = 'completed',
                    samples_generated = {total:Int64},
                    positive_samples = {positive:Int64},
                    negative_samples = {negative:Int64},
                    completed_at = now64(3)
                WHERE run_id = {run_id:String}
            """, parameters={
                "run_id": run_id,
                "total": stats["total"],
                "positive": stats["positive"],
                "negative": stats["negative"],
            })
        except Exception as e:
            print(f"Warning: Could not record run completion: {e}")
    
    def _record_run_error(self, run_id: str, error: str):
        """Record run error."""
        try:
            self.clickhouse.client.command("""
                ALTER TABLE events.training_data_runs
                UPDATE 
                    status = 'failed',
                    error_message = {error:String},
                    completed_at = now64(3)
                WHERE run_id = {run_id:String}
            """, parameters={
                "run_id": run_id,
                "error": error[:1000],  # Truncate if too long
            })
        except Exception as e:
            print(f"Warning: Could not record run error: {e}")
    
    def generate_for_all_projects(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generate training data for all projects with activity."""
        
        # Get projects with cart events in date range
        query = """
        SELECT DISTINCT project_id
        FROM events.cart_events
        WHERE event_type = 'cart.add'
          AND toDate(event_timestamp) >= {start_date:String}
          AND toDate(event_timestamp) < {end_date:String}
        """
        
        result = self.clickhouse.client.query(query, parameters={
            "start_date": start_date,
            "end_date": end_date,
        })
        
        projects = [row[0] for row in result.result_rows]
        print(f"Found {len(projects)} projects with activity")
        
        all_stats = {}
        for project_id in projects:
            try:
                stats = self.generate_for_date_range(project_id, start_date, end_date)
                all_stats[project_id] = stats
            except Exception as e:
                print(f"Error processing project {project_id}: {e}")
                all_stats[project_id] = {"error": str(e)}
        
        return all_stats


async def run_health_server(generator: PurchasePropensityTrainingDataGenerator):
    """Run a simple health check server."""
    from aiohttp import web
    
    async def health_handler(request):
        return web.json_response({
            "status": "healthy",
            "service": "training-data-generator",
            "samples_generated": generator.samples_generated,
            "positive_samples": generator.positive_samples,
            "negative_samples": generator.negative_samples,
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
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate ML training data")
    parser.add_argument("--date", type=str, help="Specific date to process (YYYY-MM-DD)")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD)")
    parser.add_argument("--project", type=str, help="Specific project ID (default: all)")
    parser.add_argument("--daily", action="store_true", help="Run daily job (process yesterday)")
    
    args = parser.parse_args()
    
    generator = PurchasePropensityTrainingDataGenerator()
    
    # Determine date range
    if args.daily or (not args.date and not args.start_date):
        # Default: process yesterday
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        start_date = yesterday.isoformat()
        end_date = datetime.utcnow().date().isoformat()
    elif args.date:
        # Specific date
        start_date = args.date
        end_date = (datetime.fromisoformat(args.date).date() + timedelta(days=1)).isoformat()
    else:
        # Date range
        start_date = args.start_date
        end_date = args.end_date or datetime.utcnow().date().isoformat()
    
    print(f"Processing date range: {start_date} to {end_date}")
    
    if args.project:
        # Single project
        generator.generate_for_date_range(args.project, start_date, end_date)
    else:
        # All projects
        generator.generate_for_all_projects(start_date, end_date)


if __name__ == "__main__":
    asyncio.run(main())

