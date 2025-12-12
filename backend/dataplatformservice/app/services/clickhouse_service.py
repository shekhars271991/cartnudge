"""
ClickHouse Service - Manages connections and operations for the event store.

This service handles writing events to ClickHouse with separate tables per event type.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, List, Optional

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from app.core.config import settings


# Mapping from Kafka topic to ClickHouse table
TOPIC_TO_TABLE = {
    "cart_events": "cart_events",
    "page_events": "page_events",
    "order_events": "order_events",
    "user_events": "user_events",
    "custom_events": "custom_events",
}

# Column mappings for each table (which fields to extract from data)
TABLE_COLUMNS = {
    "cart_events": {
        "columns": [
            "event_id", "project_id", "user_id", "event_type",
            "session_id", "product_id", "quantity", "price", "cart_total", "currency",
            "custom_data", "kafka_topic", "kafka_partition", "kafka_offset", "event_timestamp"
        ],
        "extract_fields": ["session_id", "product_id", "quantity", "price", "cart_total", "currency"],
        "defaults": {
            "session_id": "", "product_id": "", "quantity": 0, 
            "price": 0, "cart_total": 0, "currency": "USD"
        }
    },
    "page_events": {
        "columns": [
            "event_id", "project_id", "user_id", "event_type",
            "session_id", "page_url", "page_type", "product_id", "category", 
            "referrer", "duration_ms", "scroll_depth",
            "custom_data", "kafka_topic", "kafka_partition", "kafka_offset", "event_timestamp"
        ],
        "extract_fields": ["session_id", "page_url", "page_type", "product_id", "category", 
                          "referrer", "duration_ms", "scroll_depth", "page", "duration"],
        "defaults": {
            "session_id": "", "page_url": "", "page_type": "", "product_id": "",
            "category": "", "referrer": "", "duration_ms": 0, "scroll_depth": 0
        },
        "field_aliases": {
            "page": "page_url",  # Map 'page' to 'page_url'
            "duration": "duration_ms"  # Map 'duration' to 'duration_ms'
        }
    },
    "order_events": {
        "columns": [
            "event_id", "project_id", "user_id", "event_type",
            "order_id", "total_amount", "subtotal", "tax_amount", "discount_amount",
            "currency", "status", "item_count", "payment_method", "shipping_method",
            "custom_data", "kafka_topic", "kafka_partition", "kafka_offset", "event_timestamp"
        ],
        "extract_fields": ["order_id", "total_amount", "subtotal", "tax_amount", "discount_amount",
                          "currency", "status", "item_count", "payment_method", "shipping_method", "total"],
        "defaults": {
            "order_id": "", "total_amount": 0, "subtotal": 0, "tax_amount": 0,
            "discount_amount": 0, "currency": "USD", "status": "", "item_count": 0,
            "payment_method": "", "shipping_method": ""
        },
        "field_aliases": {
            "total": "total_amount"  # Map 'total' to 'total_amount'
        }
    },
    "user_events": {
        "columns": [
            "event_id", "project_id", "user_id", "event_type",
            "segment", "lifetime_value", "total_orders", "device_type", "platform", "country", "city",
            "custom_data", "kafka_topic", "kafka_partition", "kafka_offset", "event_timestamp"
        ],
        "extract_fields": ["segment", "lifetime_value", "total_orders", "device_type", 
                          "platform", "country", "city"],
        "defaults": {
            "segment": "", "lifetime_value": 0, "total_orders": 0,
            "device_type": "", "platform": "", "country": "", "city": ""
        }
    },
    "custom_events": {
        "columns": [
            "event_id", "project_id", "user_id", "event_type",
            "data", "kafka_topic", "kafka_partition", "kafka_offset", "event_timestamp"
        ],
        "extract_fields": [],
        "defaults": {}
    }
}


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
    
    def _get_table_for_topic(self, topic: str) -> str:
        """Get the ClickHouse table name for a Kafka topic."""
        return TOPIC_TO_TABLE.get(topic, "custom_events")
    
    def _extract_fields(self, data: dict, table: str) -> tuple[dict, dict]:
        """
        Extract known fields from data and separate custom fields.
        
        Returns:
            Tuple of (extracted_fields, custom_fields)
        """
        table_config = TABLE_COLUMNS.get(table, TABLE_COLUMNS["custom_events"])
        extract_fields = table_config.get("extract_fields", [])
        defaults = table_config.get("defaults", {})
        aliases = table_config.get("field_aliases", {})
        
        extracted = {}
        custom = {}
        
        for key, value in data.items():
            # Check if this field should be extracted (or is an alias)
            target_field = aliases.get(key, key)
            
            if target_field in extract_fields or key in extract_fields:
                extracted[target_field] = value
            elif key != "user_id":  # user_id is handled separately
                custom[key] = value
        
        # Apply defaults for missing fields
        for field, default_value in defaults.items():
            if field not in extracted:
                extracted[field] = default_value
        
        return extracted, custom
    
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
        Insert a single event into the appropriate ClickHouse table.
        """
        table = self._get_table_for_topic(topic)
        table_config = TABLE_COLUMNS.get(table, TABLE_COLUMNS["custom_events"])
        
        # Extract known fields and custom fields
        extracted, custom = self._extract_fields(data, table)
        
        # Build the row based on table schema
        if table == "custom_events":
            row = [
                event_id, project_id, user_id, event_type,
                json.dumps(data),  # Store all data as JSON
                topic, kafka_partition, kafka_offset, event_timestamp
            ]
        else:
            # Build row with extracted fields
            row = [event_id, project_id, user_id, event_type]
            
            # Add extracted fields in order
            for col in table_config["columns"][4:-5]:  # Skip common fields at start and end
                if col == "custom_data":
                    row.append(json.dumps(custom) if custom else "{}")
                else:
                    row.append(extracted.get(col, table_config["defaults"].get(col, "")))
            
            # Add custom_data and kafka metadata
            row.extend([
                json.dumps(custom) if custom else "{}",
                topic, kafka_partition, kafka_offset, event_timestamp
            ])
        
        try:
            self.client.insert(
                table=table,
                data=[row],
                column_names=table_config["columns"],
            )
            return True
        except Exception as e:
            print(f"ClickHouse insert error for {table}: {e}")
            return False
    
    def insert_events_batch(
        self,
        events: list[dict[str, Any]],
    ) -> tuple[int, int]:
        """
        Insert multiple events in batches, grouped by table.
        
        Args:
            events: List of event dictionaries
                
        Returns:
            Tuple of (successful_count, failed_count)
        """
        if not events:
            return 0, 0
        
        # Group events by target table
        events_by_table: dict[str, list] = {}
        
        for event in events:
            topic = event.get("topic", "custom_events")
            table = self._get_table_for_topic(topic)
            
            if table not in events_by_table:
                events_by_table[table] = []
            events_by_table[table].append(event)
        
        total_success = 0
        total_failed = 0
        
        # Insert each batch
        for table, table_events in events_by_table.items():
            table_config = TABLE_COLUMNS.get(table, TABLE_COLUMNS["custom_events"])
            rows = []
            
            for event in table_events:
                data = event.get("data", {})
                extracted, custom = self._extract_fields(data, table)
                
                if table == "custom_events":
                    row = [
                        event["event_id"],
                        event["project_id"],
                        event["user_id"],
                        event["event_type"],
                        json.dumps(data),
                        event.get("topic", "custom_events"),
                        event.get("kafka_partition", 0),
                        event.get("kafka_offset", 0),
                        event["event_timestamp"],
                    ]
                else:
                    row = [
                        event["event_id"],
                        event["project_id"],
                        event["user_id"],
                        event["event_type"],
                    ]
                    
                    # Add extracted fields
                    defaults = table_config.get("defaults", {})
                    for col in table_config["columns"][4:-5]:
                        if col == "custom_data":
                            continue  # Handle separately
                        row.append(extracted.get(col, defaults.get(col, "" if isinstance(defaults.get(col, ""), str) else 0)))
                    
                    # Add custom_data and metadata
                    row.extend([
                        json.dumps(custom) if custom else "{}",
                        event.get("topic", table),
                        event.get("kafka_partition", 0),
                        event.get("kafka_offset", 0),
                        event["event_timestamp"],
                    ])
                
                rows.append(row)
            
            try:
                self.client.insert(
                    table=table,
                    data=rows,
                    column_names=table_config["columns"],
                )
                total_success += len(rows)
                print(f"  → Inserted {len(rows)} events into {table}")
            except Exception as e:
                print(f"ClickHouse batch insert error for {table}: {e}")
                total_failed += len(rows)
        
        return total_success, total_failed
    
    def get_user_events(
        self,
        project_id: str,
        user_id: str,
        event_types: list[str] | None = None,
        days: int = 30,
        limit: int = 1000,
    ) -> list[dict[str, Any]]:
        """Get recent events for a user from all tables."""
        query = """
            SELECT 
                event_id,
                event_type,
                event_category,
                event_timestamp
            FROM all_events
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
                    "event_category": row[2],
                    "event_timestamp": row[3],
                })
            return events
        except Exception as e:
            print(f"ClickHouse query error: {e}")
            return []
    
    def get_user_cart_metrics(
        self,
        project_id: str,
        user_id: str,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get cart metrics for a user."""
        query = """
            SELECT 
                sum(cart_adds) AS total_cart_adds,
                sum(cart_removes) AS total_cart_removes,
                sum(checkouts) AS total_checkouts,
                sum(total_items_added) AS total_items,
                sum(total_value_added) AS total_value
            FROM mv_daily_cart_metrics
            WHERE project_id = {project_id:String}
                AND user_id = {user_id:String}
                AND day >= today() - {days:UInt32}
        """
        
        try:
            result = self.client.query(query, parameters={
                "project_id": project_id,
                "user_id": user_id,
                "days": days,
            })
            if result.result_rows:
                row = result.result_rows[0]
                return {
                    "cart_adds": row[0] or 0,
                    "cart_removes": row[1] or 0,
                    "checkouts": row[2] or 0,
                    "total_items": row[3] or 0,
                    "total_value": float(row[4] or 0),
                }
            return {}
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
