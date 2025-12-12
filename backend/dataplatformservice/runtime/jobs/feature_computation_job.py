"""
Feature Computation Job - Periodically computes and stores user features.

This job runs on a schedule to:
1. Identify active users from ClickHouse
2. Compute features for each user
3. Store features in Aerospike for real-time serving

Run as a standalone process:
    python -m runtime.jobs.feature_computation_job

Or run once:
    python -m runtime.jobs.feature_computation_job --once
"""
from __future__ import annotations

import argparse
import asyncio
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.feature_service import get_feature_store, get_feature_service
from app.services.clickhouse_service import get_clickhouse_service


class FeatureComputationJob:
    """Job that computes user features on a schedule."""
    
    def __init__(
        self,
        interval_minutes: int = 60,
        days_active: int = 30,
        ttl_days: int = 7,
    ):
        self.interval_minutes = interval_minutes
        self.days_active = days_active
        self.ttl_days = ttl_days
        self.running = False
        
        self.feature_store = get_feature_store()
        self.clickhouse = get_clickhouse_service()
        
        # Stats
        self.runs_completed = 0
        self.total_users_processed = 0
        self.total_features_stored = 0
        self.last_run_time: datetime | None = None
    
    def get_active_projects(self) -> list[str]:
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
    
    def run_once(self) -> dict:
        """
        Run feature computation once for all active projects.
        
        Returns:
            Stats dictionary
        """
        start_time = time.time()
        print()
        print("=" * 60)
        print(f"Feature Computation Job - Starting")
        print(f"Time: {datetime.utcnow().isoformat()}")
        print("=" * 60)
        
        # Get active projects
        projects = self.get_active_projects()
        print(f"Found {len(projects)} active projects")
        
        total_stats = {
            "projects": len(projects),
            "users_processed": 0,
            "features_stored": 0,
            "errors": 0,
        }
        
        for project_id in projects:
            print(f"\nProcessing project: {project_id}")
            
            try:
                stats = self.feature_store.refresh_all_features(
                    project_id=project_id,
                    days_active=self.days_active,
                    ttl_days=self.ttl_days,
                )
                
                total_stats["users_processed"] += stats["total"]
                total_stats["features_stored"] += stats["success"]
                total_stats["errors"] += stats["failed"]
                
                print(f"  ✓ Processed {stats['total']} users, {stats['success']} stored, {stats['failed']} failed")
                
            except Exception as e:
                print(f"  ✗ Error processing project {project_id}: {e}")
                total_stats["errors"] += 1
        
        elapsed = time.time() - start_time
        total_stats["elapsed_seconds"] = elapsed
        
        print()
        print("-" * 60)
        print(f"Completed in {elapsed:.2f}s")
        print(f"  Projects: {total_stats['projects']}")
        print(f"  Users processed: {total_stats['users_processed']}")
        print(f"  Features stored: {total_stats['features_stored']}")
        print(f"  Errors: {total_stats['errors']}")
        print()
        
        # Update stats
        self.runs_completed += 1
        self.total_users_processed += total_stats["users_processed"]
        self.total_features_stored += total_stats["features_stored"]
        self.last_run_time = datetime.utcnow()
        
        return total_stats
    
    async def run_scheduled(self):
        """Run on a schedule until stopped."""
        self.running = True
        
        print()
        print("╔" + "═" * 58 + "╗")
        print("║" + " Feature Computation Job - Scheduled ".center(58) + "║")
        print("║" + f" Interval: {self.interval_minutes} minutes ".center(58) + "║")
        print("╚" + "═" * 58 + "╝")
        print()
        
        while self.running:
            try:
                self.run_once()
            except Exception as e:
                print(f"Error in scheduled run: {e}")
            
            if not self.running:
                break
            
            # Wait for next run
            print(f"Next run in {self.interval_minutes} minutes...")
            for _ in range(self.interval_minutes * 60):
                if not self.running:
                    break
                await asyncio.sleep(1)
        
        print("Feature Computation Job stopped.")
    
    def stop(self):
        """Stop the scheduled job."""
        self.running = False


def compute_features_for_user(project_id: str, user_id: str) -> dict | None:
    """
    Convenience function to compute features for a single user.
    
    Args:
        project_id: Project identifier
        user_id: User identifier
        
    Returns:
        Feature dictionary or None
    """
    feature_store = get_feature_store()
    return feature_store.compute_and_store(project_id, user_id)


def get_user_features(project_id: str, user_id: str) -> dict | None:
    """
    Convenience function to get features for a user.
    
    Args:
        project_id: Project identifier
        user_id: User identifier
        
    Returns:
        Feature dictionary or None
    """
    feature_store = get_feature_store()
    return feature_store.get_features(project_id, user_id)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Feature Computation Job")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=60, help="Interval in minutes (default: 60)")
    parser.add_argument("--days", type=int, default=30, help="Days of activity to consider (default: 30)")
    parser.add_argument("--ttl", type=int, default=7, help="Feature TTL in days (default: 7)")
    parser.add_argument("--project", type=str, help="Process only this project")
    parser.add_argument("--user", type=str, help="Process only this user (requires --project)")
    
    args = parser.parse_args()
    
    # Single user mode
    if args.user:
        if not args.project:
            print("Error: --user requires --project")
            sys.exit(1)
        
        print(f"Computing features for user {args.user} in project {args.project}")
        features = compute_features_for_user(args.project, args.user)
        
        if features:
            import json
            print(json.dumps(features, indent=2, default=str))
        else:
            print("Failed to compute features")
        return
    
    job = FeatureComputationJob(
        interval_minutes=args.interval,
        days_active=args.days,
        ttl_days=args.ttl,
    )
    
    if args.once:
        job.run_once()
    else:
        # Setup graceful shutdown
        loop = asyncio.get_event_loop()
        
        def signal_handler():
            print("\n⚠ Received shutdown signal...")
            job.stop()
        
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)
        
        await job.run_scheduled()


if __name__ == "__main__":
    asyncio.run(main())

