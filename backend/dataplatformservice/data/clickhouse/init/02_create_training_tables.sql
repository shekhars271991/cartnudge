-- ============================================================================
-- CartNudge ML Training Data Tables
-- Tables for storing training datasets for ML models
-- ============================================================================

-- ============================================================================
-- PURCHASE PROPENSITY TRAINING DATA
-- 
-- Each row represents an observation:
-- - A user added something to cart (observation event)
-- - Features computed as of that moment (looking back 30 days)
-- - Label: did they purchase within 24 hours?
--
-- Used to train models that predict if a user will complete purchase
-- ============================================================================

CREATE TABLE IF NOT EXISTS events.purchase_propensity_training (
    -- Identifiers
    sample_id String,                          -- Unique sample ID
    project_id String,
    user_id String,
    
    -- Observation context
    observation_timestamp DateTime64(3),       -- When cart.add happened
    observation_date Date,                     -- Date for partitioning
    
    -- Current cart context (at observation time)
    cart_item_price Decimal64(2),              -- Price of item added
    cart_total Decimal64(2),                   -- Cart total at observation
    cart_item_count Int32,                     -- Items in cart
    
    -- =========================================================================
    -- FEATURES (computed looking back from observation_timestamp)
    -- =========================================================================
    
    -- Cart Behavior Features (30 days before observation)
    f_cart_adds_7d Int32 DEFAULT 0,            -- Cart adds in last 7 days
    f_cart_adds_30d Int32 DEFAULT 0,           -- Cart adds in last 30 days
    f_cart_removes_30d Int32 DEFAULT 0,        -- Cart removes in last 30 days
    f_checkouts_30d Int32 DEFAULT 0,           -- Checkouts initiated
    f_unique_products_carted_30d Int32 DEFAULT 0, -- Unique products added to cart
    f_avg_cart_value_30d Decimal64(2) DEFAULT 0,  -- Average cart value
    
    -- Cart Abandonment History
    f_cart_abandonment_rate Float32 DEFAULT 0,  -- Historical abandonment rate
    f_carts_abandoned_30d Int32 DEFAULT 0,      -- Carts abandoned (no purchase)
    
    -- Page Engagement Features (30 days before observation)
    f_page_views_7d Int32 DEFAULT 0,            -- Page views last 7 days
    f_page_views_30d Int32 DEFAULT 0,           -- Page views last 30 days
    f_sessions_7d Int32 DEFAULT 0,              -- Sessions last 7 days
    f_sessions_30d Int32 DEFAULT 0,             -- Sessions last 30 days
    f_avg_session_duration_ms Int64 DEFAULT 0,  -- Avg session time
    f_product_views_30d Int32 DEFAULT 0,        -- Product page views
    f_unique_products_viewed_30d Int32 DEFAULT 0, -- Unique products viewed
    f_checkout_page_views_30d Int32 DEFAULT 0,  -- Checkout page visits
    
    -- Purchase History Features
    f_orders_30d Int32 DEFAULT 0,               -- Orders in last 30 days
    f_orders_90d Int32 DEFAULT 0,               -- Orders in last 90 days
    f_orders_lifetime Int32 DEFAULT 0,          -- Total lifetime orders
    f_total_revenue_30d Decimal64(2) DEFAULT 0, -- Revenue last 30 days
    f_total_revenue_lifetime Decimal64(2) DEFAULT 0, -- Lifetime revenue
    f_avg_order_value Decimal64(2) DEFAULT 0,   -- Average order value
    
    -- Recency Features (days since last X before observation)
    f_days_since_last_visit Int32 DEFAULT 999,  -- Days since last page view
    f_days_since_last_cart_add Int32 DEFAULT 999, -- Days since last cart add
    f_days_since_last_order Int32 DEFAULT 999,  -- Days since last purchase
    
    -- Time-based Features
    f_day_of_week Int8 DEFAULT 0,               -- 1-7 (Mon-Sun)
    f_hour_of_day Int8 DEFAULT 0,               -- 0-23
    f_is_weekend Int8 DEFAULT 0,                -- 1 if Sat/Sun
    
    -- Engagement Score (composite)
    f_engagement_score Float32 DEFAULT 0,       -- Computed engagement
    
    -- Browse-to-Cart Ratio
    f_browse_to_cart_ratio Float32 DEFAULT 0,   -- products_carted / products_viewed
    
    -- =========================================================================
    -- LABEL
    -- =========================================================================
    label Int8,                                 -- 1 = purchased within window, 0 = abandoned
    label_window_hours Int32 DEFAULT 24,        -- How long we waited for purchase
    
    -- Label context (for analysis)
    purchased_at Nullable(DateTime64(3)),       -- When purchase happened (if any)
    purchase_amount Nullable(Decimal64(2)),     -- Purchase amount (if any)
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    generated_at DateTime64(3) DEFAULT now64(3), -- When this sample was created
    model_version String DEFAULT '1.0',         -- For tracking schema changes
    
    -- Indexes
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_label label TYPE minmax GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(observation_date)
ORDER BY (project_id, observation_date, user_id, observation_timestamp)
TTL observation_date + INTERVAL 365 DAY  -- Keep training data for 1 year
SETTINGS index_granularity = 8192;


-- ============================================================================
-- TRAINING DATA GENERATION RUNS
-- Track when training data was generated
-- ============================================================================

CREATE TABLE IF NOT EXISTS events.training_data_runs (
    run_id String,
    model_type String,                          -- 'purchase_propensity', 'churn', etc.
    project_id String,
    
    -- Time range processed
    start_date Date,
    end_date Date,
    
    -- Stats
    samples_generated Int64 DEFAULT 0,
    positive_samples Int64 DEFAULT 0,           -- label = 1
    negative_samples Int64 DEFAULT 0,           -- label = 0
    
    -- Config used
    label_window_hours Int32 DEFAULT 24,
    feature_window_days Int32 DEFAULT 30,
    
    -- Status
    status String DEFAULT 'running',            -- running, completed, failed
    error_message Nullable(String),
    
    -- Timestamps
    started_at DateTime64(3) DEFAULT now64(3),
    completed_at Nullable(DateTime64(3)),
    
    INDEX idx_model_type model_type TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_date)
ORDER BY (model_type, project_id, started_at)
SETTINGS index_granularity = 8192;


-- ============================================================================
-- HELPER VIEW: Training data summary
-- ============================================================================

CREATE VIEW IF NOT EXISTS events.v_training_data_summary AS
SELECT
    project_id,
    toDate(observation_timestamp) as observation_date,
    count() as total_samples,
    countIf(label = 1) as positive_samples,
    countIf(label = 0) as negative_samples,
    round(countIf(label = 1) / count() * 100, 2) as conversion_rate_pct,
    avg(f_cart_adds_30d) as avg_cart_adds_30d,
    avg(f_page_views_30d) as avg_page_views_30d,
    avg(f_orders_lifetime) as avg_lifetime_orders
FROM events.purchase_propensity_training
GROUP BY project_id, observation_date
ORDER BY project_id, observation_date DESC;

