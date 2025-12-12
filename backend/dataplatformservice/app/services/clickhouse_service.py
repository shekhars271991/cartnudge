"""
ClickHouse Service - Manages connections and operations for the event store.

This service handles writing raw events to ClickHouse for feature engineering
and ML training data generation.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from app.core.config import settings


class ClickHouseService:
    """Service for interacting with ClickHouse event store."""
    
    def __init__(self):
        self.host = os.environ.get("CLICKHOUSE_HOST", settings.clickhouse_host)
        self.port = int(os.environ.get("CLICKHOUSE_PORT", settings.clickhouse_port))
        self.user = os.environ.get("CLICKHOUSE_USER", settings.clickhouse_user)
        self.password = os.environ.get("CLICKHOUSE_PASSWORD", settings.clickhouse_password)
        self.database = os.environ.get("CLICKHOUSE_DATABASE", settings.clickhouse_database)
        self._client: Client | None = None
    
    def connect(self) -> Client:
        """Create and return a ClickHouse client."""
        if self._client is None:
            self._client = clickhouse_connect.get_client(
                host=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                database=self.database,
            )
        return self._client
    
    def close(self):
        """Close the ClickHouse connection."""
        if self._client:
            self._client.close()
            self._client = None
    
    @property
    def client(self) -> Client:
        """Get or create the client."""
        return self.connect()
    
    def insert_event(
        self,
        event_id: str,
        project_id: str,
        user_id: str,
        event_type: str,
        topic: str,
        data: dict[str, Any],
        event_timestamp: datetime,
        kafka_partition: int = 0,
        kafka_offset: int = 0,
    ) -> bool:
        """
        Insert a single event into ClickHouse.
        
        Args:
            event_id: Unique event identifier
            project_id: Project identifier
            user_id: User identifier
            event_type: Type of event
            topic: Source Kafka topic
            data: Event payload
            event_timestamp: When the event occurred
            kafka_partition: Source Kafka partition
            kafka_offset: Source Kafka offset
            
        Returns:
            True if successful
        """
        try:
            self.client.insert(
                table="raw_events",
                data=[[
                    event_id,
                    project_id,
                    user_id,
                    event_type,
                    topic,
                    kafka_partition,
                    kafka_offset,
                    json.dumps(data),
                    event_timestamp,
                ]],
                column_names=[
                    "event_id",
                    "project_id",
                    "user_id",
                    "event_type",
                    "topic",
                    "kafka_partition",
                    "kafka_offset",
                    "data",
                    "event_timestamp",
                ],
            )
            return True
        except Exception as e:
            print(f"ClickHouse insert error: {e}")
            return False
    
    def insert_events_batch(
        self,
        events: list[dict[str, Any]],
    ) -> tuple[int, int]:
        """
        Insert multiple events in a batch.
        
        Args:
            events: List of event dictionaries with keys:
                - event_id, project_id, user_id, event_type, topic,
                - data, event_timestamp, kafka_partition, kafka_offset
                
        Returns:
            Tuple of (successful_count, failed_count)
        """
        if not events:
            return 0, 0
        
        rows = []
        for event in events:
            rows.append([
                event["event_id"],
                event["project_id"],
                event["user_id"],
                event["event_type"],
                event["topic"],
                event.get("kafka_partition", 0),
                event.get("kafka_offset", 0),
                json.dumps(event["data"]) if isinstance(event["data"], dict) else event["data"],
                event["event_timestamp"],
            ])
        
        try:
            self.client.insert(
                table="raw_events",
                data=rows,
                column_names=[
                    "event_id",
                    "project_id",
                    "user_id",
                    "event_type",
                    "topic",
                    "kafka_partition",
                    "kafka_offset",
                    "data",
                    "event_timestamp",
                ],
            )
            return len(events), 0
        except Exception as e:
            print(f"ClickHouse batch insert error: {e}")
            return 0, len(events)
    
    def get_user_events(
        self,
        project_id: str,
        user_id: str,
        event_types: list[str] | None = None,
        days: int = 30,
        limit: int = 1000,
    ) -> list[dict[str, Any]]:
        """
        Get recent events for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            event_types: Optional list of event types to filter
            days: Number of days to look back
            limit: Maximum number of events to return
            
        Returns:
            List of event dictionaries
        """
        query = """
            SELECT 
                event_id,
                event_type,
                data,
                event_timestamp
            FROM raw_events
            WHERE project_id = {project_id:String}
                AND user_id = {user_id:String}
                AND event_timestamp >= now() - INTERVAL {days:UInt32} DAY
        """
        
        params = {
            "project_id": project_id,
            "user_id": user_id,
            "days": days,
        }
        
        if event_types:
            query += " AND event_type IN {event_types:Array(String)}"
            params["event_types"] = event_types
        
        query += f" ORDER BY event_timestamp DESC LIMIT {limit}"
        
        try:
            result = self.client.query(query, parameters=params)
            events = []
            for row in result.result_rows:
                events.append({
                    "event_id": row[0],
                    "event_type": row[1],
                    "data": json.loads(row[2]) if isinstance(row[2], str) else row[2],
                    "event_timestamp": row[3],
                })
            return events
        except Exception as e:
            print(f"ClickHouse query error: {e}")
            return []
    
    def get_user_event_counts(
        self,
        project_id: str,
        user_id: str,
        days: int = 30,
    ) -> dict[str, int]:
        """
        Get event counts by type for a user.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            days: Number of days to look back
            
        Returns:
            Dictionary of event_type -> count
        """
        query = """
            SELECT 
                event_type,
                sum(event_count) as total
            FROM user_event_counts
            WHERE project_id = {project_id:String}
                AND user_id = {user_id:String}
                AND day >= today() - {days:UInt32}
            GROUP BY event_type
        """
        
        try:
            result = self.client.query(query, parameters={
                "project_id": project_id,
                "user_id": user_id,
                "days": days,
            })
            return {row[0]: row[1] for row in result.result_rows}
        except Exception as e:
            print(f"ClickHouse query error: {e}")
            return {}
    
    def health_check(self) -> bool:
        """Check if ClickHouse is healthy."""
        try:
            result = self.client.query("SELECT 1")
            return result.result_rows[0][0] == 1
        except Exception:
            return False


# Singleton instance
_clickhouse_service: ClickHouseService | None = None


def get_clickhouse_service() -> ClickHouseService:
    """Get the ClickHouse service singleton."""
    global _clickhouse_service
    if _clickhouse_service is None:
        _clickhouse_service = ClickHouseService()
    return _clickhouse_service

