// Pipeline template definitions for feature engineering

export type EventField = {
    name: string;
    type: "string" | "number" | "boolean" | "timestamp" | "array";
    required: boolean;
    description: string;
};

export type PipelineEvent = {
    name: string;
    description: string;
    fields: EventField[];
    enabled: boolean;
};

export type ComputedFeature = {
    name: string;
    description: string;
    aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT" | "LAST" | "FIRST" | "RATIO";
    timeWindows: string[];
    sourceEvent: string;
};

export type PipelineTemplate = {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: "behavioral" | "transaction" | "context" | "marketing" | "trust" | "realtime";
    events: PipelineEvent[];
    computedFeatures: ComputedFeature[];
    status: "inactive" | "active" | "configuring";
    webhookPath: string;
};

export type PipelineCategory = {
    id: string;
    name: string;
    description: string;
    pipelines: PipelineTemplate[];
};

// ============================================
// PIPELINE TEMPLATES
// ============================================

export const browsingPipeline: PipelineTemplate = {
    id: "browsing",
    name: "Browsing & Discovery",
    description: "Track page views, product views, searches, and engagement signals",
    icon: "Search",
    category: "behavioral",
    webhookPath: "/v1/events/browsing",
    status: "inactive",
    events: [
        {
            name: "page_view",
            description: "User views any page",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "url", type: "string", required: true, description: "Page URL" },
                { name: "title", type: "string", required: false, description: "Page title" },
                { name: "referrer", type: "string", required: false, description: "Referrer URL" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "product_view",
            description: "User views a product detail page",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product SKU or ID" },
                { name: "product_name", type: "string", required: false, description: "Product name" },
                { name: "category", type: "string", required: false, description: "Product category" },
                { name: "price", type: "number", required: false, description: "Product price" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "category_view",
            description: "User browses a category page",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "category_id", type: "string", required: true, description: "Category ID" },
                { name: "category_name", type: "string", required: false, description: "Category name" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "search",
            description: "User performs a search",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "query", type: "string", required: true, description: "Search query" },
                { name: "results_count", type: "number", required: false, description: "Number of results" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "scroll_depth",
            description: "User scroll depth on page",
            enabled: false,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "url", type: "string", required: true, description: "Page URL" },
                { name: "depth_percent", type: "number", required: true, description: "Scroll depth percentage" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "page_views_count", description: "Total page views", aggregation: "COUNT", timeWindows: ["5m", "1h", "24h", "7d"], sourceEvent: "page_view" },
        { name: "product_views_count", description: "Product detail page views", aggregation: "COUNT", timeWindows: ["5m", "1h", "24h", "7d"], sourceEvent: "product_view" },
        { name: "unique_products_viewed", description: "Unique products viewed", aggregation: "COUNT_DISTINCT", timeWindows: ["24h", "7d", "30d"], sourceEvent: "product_view" },
        { name: "unique_categories_viewed", description: "Unique categories browsed", aggregation: "COUNT_DISTINCT", timeWindows: ["24h", "7d"], sourceEvent: "category_view" },
        { name: "search_count", description: "Number of searches", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], sourceEvent: "search" },
    ],
};

export const cartPipeline: PipelineTemplate = {
    id: "cart",
    name: "Cart & Checkout",
    description: "Track cart additions, removals, abandonment, and checkout behavior",
    icon: "ShoppingCart",
    category: "behavioral",
    webhookPath: "/v1/events/cart",
    status: "inactive",
    events: [
        {
            name: "add_to_cart",
            description: "User adds item to cart",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product SKU or ID" },
                { name: "quantity", type: "number", required: true, description: "Quantity added" },
                { name: "price", type: "number", required: true, description: "Item price" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "remove_from_cart",
            description: "User removes item from cart",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product SKU or ID" },
                { name: "quantity", type: "number", required: true, description: "Quantity removed" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "cart_view",
            description: "User views their cart",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "cart_value", type: "number", required: true, description: "Total cart value" },
                { name: "item_count", type: "number", required: true, description: "Number of items" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "checkout_started",
            description: "User initiates checkout",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "cart_value", type: "number", required: true, description: "Total cart value" },
                { name: "item_count", type: "number", required: true, description: "Number of items" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "checkout_completed",
            description: "User completes checkout",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "order_value", type: "number", required: true, description: "Order total" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "cart_additions_count", description: "Number of cart additions", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], sourceEvent: "add_to_cart" },
        { name: "cart_removals_count", description: "Number of cart removals", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], sourceEvent: "remove_from_cart" },
        { name: "cart_abandonment_rate", description: "Cart abandonment frequency", aggregation: "RATIO", timeWindows: ["7d", "30d"], sourceEvent: "checkout_started" },
        { name: "avg_cart_value", description: "Average cart value", aggregation: "AVG", timeWindows: ["7d", "30d"], sourceEvent: "cart_view" },
        { name: "items_per_cart", description: "Average items per cart", aggregation: "AVG", timeWindows: ["7d", "30d"], sourceEvent: "cart_view" },
        { name: "time_since_cart_update", description: "Time since last cart activity", aggregation: "LAST", timeWindows: ["realtime"], sourceEvent: "add_to_cart" },
    ],
};

export const sessionPipeline: PipelineTemplate = {
    id: "sessions",
    name: "Sessions",
    description: "Track session duration, device type, entry source, and engagement velocity",
    icon: "Monitor",
    category: "behavioral",
    webhookPath: "/v1/events/sessions",
    status: "inactive",
    events: [
        {
            name: "session_start",
            description: "New session begins",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "session_id", type: "string", required: true, description: "Session ID" },
                { name: "device_type", type: "string", required: true, description: "mobile/desktop/tablet" },
                { name: "entry_source", type: "string", required: true, description: "direct/organic/paid/referral" },
                { name: "referrer", type: "string", required: false, description: "Referrer URL" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "session_end",
            description: "Session ends",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "session_id", type: "string", required: true, description: "Session ID" },
                { name: "duration_seconds", type: "number", required: true, description: "Session duration" },
                { name: "pages_viewed", type: "number", required: true, description: "Pages viewed in session" },
                { name: "actions_count", type: "number", required: false, description: "Total actions taken" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "session_heartbeat",
            description: "Periodic session activity ping",
            enabled: false,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "session_id", type: "string", required: true, description: "Session ID" },
                { name: "active_seconds", type: "number", required: true, description: "Active time since last heartbeat" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "avg_session_duration", description: "Average session duration", aggregation: "AVG", timeWindows: ["7d", "30d"], sourceEvent: "session_end" },
        { name: "sessions_count", description: "Total sessions", aggregation: "COUNT", timeWindows: ["24h", "7d", "30d"], sourceEvent: "session_start" },
        { name: "mobile_session_ratio", description: "Mobile vs desktop ratio", aggregation: "RATIO", timeWindows: ["30d"], sourceEvent: "session_start" },
        { name: "session_velocity", description: "Actions per minute", aggregation: "AVG", timeWindows: ["7d"], sourceEvent: "session_end" },
        { name: "bounce_rate", description: "Single-page session rate", aggregation: "RATIO", timeWindows: ["7d", "30d"], sourceEvent: "session_end" },
    ],
};

export const ordersPipeline: PipelineTemplate = {
    id: "orders",
    name: "Orders & Purchases",
    description: "Track order history, RFM metrics, lifetime value, and purchase frequency",
    icon: "Receipt",
    category: "transaction",
    webhookPath: "/v1/events/orders",
    status: "inactive",
    events: [
        {
            name: "order_placed",
            description: "New order placed",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "order_value", type: "number", required: true, description: "Order total" },
                { name: "items", type: "array", required: true, description: "Order items" },
                { name: "discount_amount", type: "number", required: false, description: "Discount applied" },
                { name: "shipping_fee", type: "number", required: false, description: "Shipping cost" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "order_shipped",
            description: "Order shipped",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "carrier", type: "string", required: false, description: "Shipping carrier" },
                { name: "estimated_delivery", type: "timestamp", required: false, description: "Expected delivery date" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "order_delivered",
            description: "Order delivered",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "delivery_time_days", type: "number", required: false, description: "Days to deliver" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "order_cancelled",
            description: "Order cancelled",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "reason", type: "string", required: false, description: "Cancellation reason" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "total_lifetime_spend", description: "Total lifetime spend", aggregation: "SUM", timeWindows: ["all_time"], sourceEvent: "order_placed" },
        { name: "orders_count", description: "Total orders", aggregation: "COUNT", timeWindows: ["30d", "90d", "all_time"], sourceEvent: "order_placed" },
        { name: "avg_order_value", description: "Average order value", aggregation: "AVG", timeWindows: ["90d", "all_time"], sourceEvent: "order_placed" },
        { name: "days_since_last_purchase", description: "Recency", aggregation: "LAST", timeWindows: ["realtime"], sourceEvent: "order_placed" },
        { name: "order_frequency", description: "Orders per month", aggregation: "AVG", timeWindows: ["90d"], sourceEvent: "order_placed" },
        { name: "cancellation_rate", description: "Order cancellation rate", aggregation: "RATIO", timeWindows: ["90d"], sourceEvent: "order_cancelled" },
    ],
};

export const pricingPipeline: PipelineTemplate = {
    id: "pricing",
    name: "Pricing & Discounts",
    description: "Track discount usage, coupon behavior, and price sensitivity signals",
    icon: "Tag",
    category: "transaction",
    webhookPath: "/v1/events/pricing",
    status: "inactive",
    events: [
        {
            name: "coupon_applied",
            description: "User applies a coupon code",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "coupon_code", type: "string", required: true, description: "Coupon code" },
                { name: "discount_type", type: "string", required: true, description: "percent/fixed" },
                { name: "discount_value", type: "number", required: true, description: "Discount amount" },
                { name: "success", type: "boolean", required: true, description: "Was coupon valid" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "price_alert_set",
            description: "User sets a price drop alert",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product ID" },
                { name: "current_price", type: "number", required: true, description: "Current price" },
                { name: "target_price", type: "number", required: false, description: "Desired price" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "discount_purchase",
            description: "Purchase made with discount",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "original_price", type: "number", required: true, description: "Price before discount" },
                { name: "final_price", type: "number", required: true, description: "Price after discount" },
                { name: "discount_percent", type: "number", required: true, description: "Discount percentage" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "coupon_usage_rate", description: "Percentage of orders with coupons", aggregation: "RATIO", timeWindows: ["30d", "90d"], sourceEvent: "coupon_applied" },
        { name: "avg_discount_used", description: "Average discount percentage", aggregation: "AVG", timeWindows: ["90d"], sourceEvent: "discount_purchase" },
        { name: "discount_only_purchases", description: "Purchases only during sales", aggregation: "RATIO", timeWindows: ["90d"], sourceEvent: "discount_purchase" },
        { name: "price_sensitivity_score", description: "Derived price sensitivity", aggregation: "AVG", timeWindows: ["all_time"], sourceEvent: "discount_purchase" },
    ],
};

export const paymentsPipeline: PipelineTemplate = {
    id: "payments",
    name: "Payments",
    description: "Track payment methods, failures, EMI usage, and wallet preferences",
    icon: "CreditCard",
    category: "transaction",
    webhookPath: "/v1/events/payments",
    status: "inactive",
    events: [
        {
            name: "payment_initiated",
            description: "Payment attempt started",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "payment_method", type: "string", required: true, description: "card/upi/cod/wallet/emi" },
                { name: "amount", type: "number", required: true, description: "Payment amount" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "payment_success",
            description: "Payment completed successfully",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "payment_method", type: "string", required: true, description: "Payment method used" },
                { name: "amount", type: "number", required: true, description: "Payment amount" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "payment_failed",
            description: "Payment failed",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "payment_method", type: "string", required: true, description: "Payment method attempted" },
                { name: "failure_reason", type: "string", required: false, description: "Failure reason code" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "cod_ratio", description: "COD vs prepaid ratio", aggregation: "RATIO", timeWindows: ["90d", "all_time"], sourceEvent: "payment_success" },
        { name: "payment_failure_rate", description: "Payment failure rate", aggregation: "RATIO", timeWindows: ["30d", "90d"], sourceEvent: "payment_failed" },
        { name: "preferred_payment_method", description: "Most used payment method", aggregation: "FIRST", timeWindows: ["90d"], sourceEvent: "payment_success" },
        { name: "emi_usage_rate", description: "EMI usage frequency", aggregation: "RATIO", timeWindows: ["all_time"], sourceEvent: "payment_success" },
    ],
};

export const productContextPipeline: PipelineTemplate = {
    id: "product_context",
    name: "Product Context",
    description: "Track product availability, price changes, and inventory signals",
    icon: "Package",
    category: "context",
    webhookPath: "/v1/events/products",
    status: "inactive",
    events: [
        {
            name: "product_availability_check",
            description: "User checks product availability",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product ID" },
                { name: "is_available", type: "boolean", required: true, description: "Is product in stock" },
                { name: "stock_level", type: "number", required: false, description: "Stock quantity" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "price_viewed",
            description: "User views product price",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product ID" },
                { name: "current_price", type: "number", required: true, description: "Current price" },
                { name: "original_price", type: "number", required: false, description: "Original/list price" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "wishlist_add",
            description: "User adds product to wishlist",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: true, description: "Product ID" },
                { name: "price_at_add", type: "number", required: true, description: "Price when added" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "out_of_stock_views", description: "Views of out-of-stock items", aggregation: "COUNT", timeWindows: ["7d", "30d"], sourceEvent: "product_availability_check" },
        { name: "wishlist_size", description: "Items in wishlist", aggregation: "COUNT", timeWindows: ["all_time"], sourceEvent: "wishlist_add" },
        { name: "price_drop_interest", description: "Interest in discounted items", aggregation: "RATIO", timeWindows: ["30d"], sourceEvent: "price_viewed" },
    ],
};

export const logisticsPipeline: PipelineTemplate = {
    id: "logistics",
    name: "Logistics & Delivery",
    description: "Track delivery estimates, shipping preferences, and fulfillment success",
    icon: "Truck",
    category: "context",
    webhookPath: "/v1/events/logistics",
    status: "inactive",
    events: [
        {
            name: "delivery_estimate_viewed",
            description: "User views delivery estimate",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "product_id", type: "string", required: false, description: "Product ID" },
                { name: "pincode", type: "string", required: true, description: "Delivery pincode" },
                { name: "estimated_days", type: "number", required: true, description: "Estimated delivery days" },
                { name: "is_serviceable", type: "boolean", required: true, description: "Is location serviceable" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "shipping_option_selected",
            description: "User selects shipping option",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "shipping_type", type: "string", required: true, description: "standard/express/same_day" },
                { name: "shipping_fee", type: "number", required: true, description: "Shipping cost" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "delivery_completed",
            description: "Delivery completed",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "delivery_days", type: "number", required: true, description: "Actual delivery days" },
                { name: "on_time", type: "boolean", required: true, description: "Delivered on time" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "express_shipping_preference", description: "Preference for fast shipping", aggregation: "RATIO", timeWindows: ["90d"], sourceEvent: "shipping_option_selected" },
        { name: "delivery_success_rate", description: "Successful delivery rate", aggregation: "RATIO", timeWindows: ["all_time"], sourceEvent: "delivery_completed" },
        { name: "avg_delivery_time", description: "Average delivery time", aggregation: "AVG", timeWindows: ["90d"], sourceEvent: "delivery_completed" },
    ],
};

export const marketingPipeline: PipelineTemplate = {
    id: "marketing",
    name: "Marketing & Attribution",
    description: "Track campaign exposure, channel attribution, and marketing response",
    icon: "Megaphone",
    category: "marketing",
    webhookPath: "/v1/events/marketing",
    status: "inactive",
    events: [
        {
            name: "campaign_exposure",
            description: "User exposed to marketing campaign",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "campaign_id", type: "string", required: true, description: "Campaign ID" },
                { name: "channel", type: "string", required: true, description: "email/sms/push/ad" },
                { name: "creative_id", type: "string", required: false, description: "Creative variant" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "campaign_click",
            description: "User clicks on campaign",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "campaign_id", type: "string", required: true, description: "Campaign ID" },
                { name: "channel", type: "string", required: true, description: "Channel clicked from" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "email_event",
            description: "Email engagement event",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "email_id", type: "string", required: true, description: "Email ID" },
                { name: "event_type", type: "string", required: true, description: "open/click/unsubscribe" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "email_open_rate", description: "Email open rate", aggregation: "RATIO", timeWindows: ["30d", "90d"], sourceEvent: "email_event" },
        { name: "campaign_response_rate", description: "Campaign click-through rate", aggregation: "RATIO", timeWindows: ["30d"], sourceEvent: "campaign_click" },
        { name: "preferred_channel", description: "Most responsive channel", aggregation: "FIRST", timeWindows: ["90d"], sourceEvent: "campaign_click" },
        { name: "time_since_last_campaign", description: "Days since last exposure", aggregation: "LAST", timeWindows: ["realtime"], sourceEvent: "campaign_exposure" },
    ],
};

export const trustPipeline: PipelineTemplate = {
    id: "trust",
    name: "Trust & Risk",
    description: "Track returns, refunds, disputes, and risk signals",
    icon: "Shield",
    category: "trust",
    webhookPath: "/v1/events/trust",
    status: "inactive",
    events: [
        {
            name: "return_requested",
            description: "User requests a return",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "product_id", type: "string", required: true, description: "Product ID" },
                { name: "reason", type: "string", required: true, description: "Return reason" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "refund_processed",
            description: "Refund processed",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "refund_amount", type: "number", required: true, description: "Refund amount" },
                { name: "refund_type", type: "string", required: true, description: "full/partial" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "dispute_filed",
            description: "User files a dispute",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "order_id", type: "string", required: true, description: "Order ID" },
                { name: "dispute_type", type: "string", required: true, description: "Type of dispute" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "return_rate", description: "Return rate", aggregation: "RATIO", timeWindows: ["90d", "all_time"], sourceEvent: "return_requested" },
        { name: "refund_frequency", description: "Refund frequency", aggregation: "COUNT", timeWindows: ["90d"], sourceEvent: "refund_processed" },
        { name: "dispute_count", description: "Total disputes", aggregation: "COUNT", timeWindows: ["all_time"], sourceEvent: "dispute_filed" },
        { name: "risk_score", description: "Calculated risk score", aggregation: "AVG", timeWindows: ["all_time"], sourceEvent: "return_requested" },
    ],
};

export const nudgeFeedbackPipeline: PipelineTemplate = {
    id: "nudge_feedback",
    name: "Nudge Feedback",
    description: "Track nudge delivery, engagement, and conversion for closed-loop learning",
    icon: "Bell",
    category: "marketing",
    webhookPath: "/v1/events/nudges",
    status: "inactive",
    events: [
        {
            name: "nudge_sent",
            description: "Nudge delivered to user",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                { name: "nudge_type", type: "string", required: true, description: "Type of nudge" },
                { name: "channel", type: "string", required: true, description: "Delivery channel" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "nudge_clicked",
            description: "User clicks on nudge",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "nudge_converted",
            description: "Nudge leads to conversion",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                { name: "conversion_value", type: "number", required: true, description: "Conversion value" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "nudge_dismissed",
            description: "User dismisses nudge",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "nudge_response_rate", description: "Nudge click-through rate", aggregation: "RATIO", timeWindows: ["7d", "30d"], sourceEvent: "nudge_clicked" },
        { name: "nudge_conversion_rate", description: "Nudge conversion rate", aggregation: "RATIO", timeWindows: ["7d", "30d"], sourceEvent: "nudge_converted" },
        { name: "nudge_fatigue_score", description: "Nudge fatigue indicator", aggregation: "AVG", timeWindows: ["7d"], sourceEvent: "nudge_dismissed" },
        { name: "time_since_last_nudge", description: "Time since last nudge", aggregation: "LAST", timeWindows: ["realtime"], sourceEvent: "nudge_sent" },
        { name: "nudges_received_count", description: "Total nudges received", aggregation: "COUNT", timeWindows: ["24h", "7d"], sourceEvent: "nudge_sent" },
    ],
};

export const realtimePipeline: PipelineTemplate = {
    id: "realtime",
    name: "Real-Time Events",
    description: "Sub-second event streaming for real-time inference and instant nudging",
    icon: "Zap",
    category: "realtime",
    webhookPath: "/v1/events/realtime",
    status: "inactive",
    events: [
        {
            name: "live_action",
            description: "Any real-time user action",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "action_type", type: "string", required: true, description: "Type of action" },
                { name: "context", type: "string", required: false, description: "Action context JSON" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "checkout_step",
            description: "User progresses through checkout",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "step", type: "string", required: true, description: "Checkout step name" },
                { name: "cart_value", type: "number", required: true, description: "Current cart value" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
        {
            name: "payment_screen",
            description: "User reaches payment screen",
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "cart_value", type: "number", required: true, description: "Cart value" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        },
    ],
    computedFeatures: [
        { name: "current_session_actions", description: "Actions in current session", aggregation: "COUNT", timeWindows: ["session"], sourceEvent: "live_action" },
        { name: "checkout_progress", description: "Furthest checkout step reached", aggregation: "LAST", timeWindows: ["session"], sourceEvent: "checkout_step" },
        { name: "time_on_payment", description: "Time spent on payment", aggregation: "SUM", timeWindows: ["session"], sourceEvent: "payment_screen" },
    ],
};

// ============================================
// CATEGORY GROUPS
// ============================================

export const pipelineCategories: PipelineCategory[] = [
    {
        id: "behavioral",
        name: "Behavioral Data",
        description: "Track user browsing, cart, and session behavior",
        pipelines: [browsingPipeline, cartPipeline, sessionPipeline],
    },
    {
        id: "transaction",
        name: "Transaction Data",
        description: "Track purchases, pricing behavior, and payments",
        pipelines: [ordersPipeline, pricingPipeline, paymentsPipeline],
    },
    {
        id: "context",
        name: "Context & Signals",
        description: "Product availability, logistics, and delivery context",
        pipelines: [productContextPipeline, logisticsPipeline],
    },
    {
        id: "marketing",
        name: "Marketing & Feedback",
        description: "Campaign attribution and nudge feedback loop",
        pipelines: [marketingPipeline, nudgeFeedbackPipeline],
    },
    {
        id: "trust",
        name: "Trust & Risk",
        description: "Returns, refunds, and risk signals",
        pipelines: [trustPipeline],
    },
    {
        id: "realtime",
        name: "Real-Time Streaming",
        description: "Sub-second events for instant inference",
        pipelines: [realtimePipeline],
    },
];

// Helper to get all pipelines flat
export const allPipelines: PipelineTemplate[] = pipelineCategories.flatMap(
    (cat) => cat.pipelines
);

