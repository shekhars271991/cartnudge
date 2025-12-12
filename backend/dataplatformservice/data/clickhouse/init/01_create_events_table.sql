-- ============================================================================
-- CartNudge Events Table
-- Stores all raw events from Kafka for feature engineering
-- ============================================================================

CREATE DATABASE IF NOT EXISTS events;

-- Main events table with partitioning by month
CREATE TABLE IF NOT EXISTS events.raw_events (
    -- Event identifiers
    event_id String,
    project_id String,
    user_id String,
    event_type String,
    
    -- Source information
    topic String,
    kafka_partition UInt32,
    kafka_offset UInt64,
    
    -- Event data (stored as JSON string for flexibility)
    data String,
    
    -- Timestamps
    event_timestamp DateTime64(3),  -- Original event timestamp
    ingested_at DateTime64(3) DEFAULT now64(3),  -- When we received it
    
    -- Indexing hints
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_type, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- ============================================================================
-- Materialized View for User Event Counts (for quick aggregations)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS events.user_event_counts
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (project_id, user_id, event_type, day)
AS SELECT
    project_id,
    user_id,
    event_type,
    toDate(event_timestamp) AS day,
    count() AS event_count
FROM events.raw_events
GROUP BY project_id, user_id, event_type, day;

-- ============================================================================
-- Materialized View for Daily Active Users
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS events.daily_active_users
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (project_id, day)
AS SELECT
    project_id,
    toDate(event_timestamp) AS day,
    uniqExact(user_id) AS unique_users,
    count() AS total_events
FROM events.raw_events
GROUP BY project_id, day;

