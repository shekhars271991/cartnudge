-- ============================================================================
-- CartNudge Event Store - ClickHouse Schema
-- Separate tables per event type for efficient querying and aggregations
-- ============================================================================

CREATE DATABASE IF NOT EXISTS events;

-- ============================================================================
-- 1. CART EVENTS TABLE
-- Shopping cart activity: add, remove, checkout events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events.cart_events (
    -- Common fields
    event_id String,
    project_id String,
    user_id String,
    event_type String,  -- cart.add, cart.remove, cart.checkout
    
    -- Cart-specific fields (from datablock template)
    session_id String DEFAULT '',
    product_id String DEFAULT '',
    quantity Int32 DEFAULT 0,
    price Decimal64(2) DEFAULT 0,
    cart_total Decimal64(2) DEFAULT 0,
    currency String DEFAULT 'USD',
    
    -- Custom data (JSON for any extra fields)
    custom_data String DEFAULT '{}',
    
    -- Kafka metadata
    kafka_topic String DEFAULT 'cart_events',
    kafka_partition UInt32 DEFAULT 0,
    kafka_offset UInt64 DEFAULT 0,
    
    -- Timestamps
    event_timestamp DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3),
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_product_id product_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- ============================================================================
-- 2. PAGE EVENTS TABLE
-- Page views, clicks, and browsing behavior
-- ============================================================================
CREATE TABLE IF NOT EXISTS events.page_events (
    -- Common fields
    event_id String,
    project_id String,
    user_id String,
    event_type String,  -- page.view, page.click
    
    -- Page-specific fields
    session_id String DEFAULT '',
    page_url String DEFAULT '',
    page_type String DEFAULT '',  -- home, product, category, cart, checkout
    product_id String DEFAULT '',  -- if on product page
    category String DEFAULT '',
    referrer String DEFAULT '',
    duration_ms Int64 DEFAULT 0,
    scroll_depth Int32 DEFAULT 0,  -- percentage 0-100
    
    -- Custom data
    custom_data String DEFAULT '{}',
    
    -- Kafka metadata
    kafka_topic String DEFAULT 'page_events',
    kafka_partition UInt32 DEFAULT 0,
    kafka_offset UInt64 DEFAULT 0,
    
    -- Timestamps
    event_timestamp DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3),
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_page_type page_type TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- ============================================================================
-- 3. ORDER EVENTS TABLE  
-- Order creation, updates, and fulfillment
-- ============================================================================
CREATE TABLE IF NOT EXISTS events.order_events (
    -- Common fields
    event_id String,
    project_id String,
    user_id String,
    event_type String,  -- order.created, order.updated, order.fulfilled
    
    -- Order-specific fields
    order_id String DEFAULT '',
    total_amount Decimal64(2) DEFAULT 0,
    subtotal Decimal64(2) DEFAULT 0,
    tax_amount Decimal64(2) DEFAULT 0,
    discount_amount Decimal64(2) DEFAULT 0,
    currency String DEFAULT 'USD',
    status String DEFAULT '',  -- pending, paid, shipped, delivered
    item_count Int32 DEFAULT 0,
    payment_method String DEFAULT '',
    shipping_method String DEFAULT '',
    
    -- Custom data
    custom_data String DEFAULT '{}',
    
    -- Kafka metadata
    kafka_topic String DEFAULT 'order_events',
    kafka_partition UInt32 DEFAULT 0,
    kafka_offset UInt64 DEFAULT 0,
    
    -- Timestamps
    event_timestamp DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3),
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_order_id order_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_status status TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 180 DAY  -- Keep orders longer
SETTINGS index_granularity = 8192;


-- ============================================================================
-- 4. USER EVENTS TABLE
-- User profile updates and lifecycle events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events.user_events (
    -- Common fields
    event_id String,
    project_id String,
    user_id String,
    event_type String,  -- user.created, user.updated, user.login
    
    -- User-specific fields
    segment String DEFAULT '',
    lifetime_value Decimal64(2) DEFAULT 0,
    total_orders Int32 DEFAULT 0,
    first_seen_at DateTime64(3) DEFAULT now64(3),
    last_active_at DateTime64(3) DEFAULT now64(3),
    device_type String DEFAULT '',  -- mobile, desktop, tablet
    platform String DEFAULT '',  -- ios, android, web
    country String DEFAULT '',
    city String DEFAULT '',
    
    -- Custom data
    custom_data String DEFAULT '{}',
    
    -- Kafka metadata
    kafka_topic String DEFAULT 'user_events',
    kafka_partition UInt32 DEFAULT 0,
    kafka_offset UInt64 DEFAULT 0,
    
    -- Timestamps
    event_timestamp DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3),
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_segment segment TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 365 DAY  -- Keep user data longer
SETTINGS index_granularity = 8192;


-- ============================================================================
-- 5. CUSTOM EVENTS TABLE
-- Catch-all for custom events that don't fit predefined schemas
-- ============================================================================
CREATE TABLE IF NOT EXISTS events.custom_events (
    -- Common fields
    event_id String,
    project_id String,
    user_id String,
    event_type String,
    
    -- All custom data stored as JSON
    data String DEFAULT '{}',
    
    -- Kafka metadata
    kafka_topic String DEFAULT 'custom_events',
    kafka_partition UInt32 DEFAULT 0,
    kafka_offset UInt64 DEFAULT 0,
    
    -- Timestamps
    event_timestamp DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3),
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (project_id, user_id, event_type, event_timestamp)
TTL toDateTime(event_timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- ============================================================================
-- MATERIALIZED VIEWS FOR AGGREGATIONS
-- ============================================================================

-- Daily cart metrics per user
CREATE MATERIALIZED VIEW IF NOT EXISTS events.mv_daily_cart_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (project_id, user_id, day)
AS SELECT
    project_id,
    user_id,
    toDate(event_timestamp) AS day,
    countIf(event_type = 'cart.add') AS cart_adds,
    countIf(event_type = 'cart.remove') AS cart_removes,
    countIf(event_type = 'cart.checkout') AS checkouts,
    sum(quantity) AS total_items_added,
    sum(price * quantity) AS total_value_added
FROM events.cart_events
GROUP BY project_id, user_id, day;


-- Daily page metrics per user
CREATE MATERIALIZED VIEW IF NOT EXISTS events.mv_daily_page_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (project_id, user_id, day)
AS SELECT
    project_id,
    user_id,
    toDate(event_timestamp) AS day,
    count() AS page_views,
    uniqExact(session_id) AS sessions,
    sum(duration_ms) AS total_time_ms,
    countIf(page_type = 'product') AS product_views,
    countIf(page_type = 'cart') AS cart_views,
    countIf(page_type = 'checkout') AS checkout_views
FROM events.page_events
GROUP BY project_id, user_id, day;


-- Daily order metrics per user  
CREATE MATERIALIZED VIEW IF NOT EXISTS events.mv_daily_order_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (project_id, user_id, day)
AS SELECT
    project_id,
    user_id,
    toDate(event_timestamp) AS day,
    countIf(event_type = 'order.created') AS orders_created,
    sum(total_amount) AS total_revenue,
    sum(item_count) AS total_items
FROM events.order_events
GROUP BY project_id, user_id, day;


-- ============================================================================
-- HELPER VIEW: Unified events view (for debugging/exploration)
-- ============================================================================
CREATE VIEW IF NOT EXISTS events.all_events AS
SELECT 
    event_id, project_id, user_id, event_type, 
    'cart' AS event_category,
    event_timestamp, ingested_at
FROM events.cart_events
UNION ALL
SELECT 
    event_id, project_id, user_id, event_type,
    'page' AS event_category,
    event_timestamp, ingested_at
FROM events.page_events
UNION ALL
SELECT 
    event_id, project_id, user_id, event_type,
    'order' AS event_category,
    event_timestamp, ingested_at
FROM events.order_events
UNION ALL
SELECT 
    event_id, project_id, user_id, event_type,
    'user' AS event_category,
    event_timestamp, ingested_at
FROM events.user_events
UNION ALL
SELECT 
    event_id, project_id, user_id, event_type,
    'custom' AS event_category,
    event_timestamp, ingested_at
FROM events.custom_events;
