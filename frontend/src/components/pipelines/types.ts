export interface EventField {
    name: string;
    type: "string" | "number" | "boolean" | "timestamp" | "object";
    required: boolean;
    description: string;
}

export interface PipelineEvent {
    id: string;
    name: string;
    description: string;
    fields: EventField[];
    enabled: boolean;
}

export interface ComputedFeature {
    id: string;
    name: string;
    description: string;
    aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT" | "LAST" | "FIRST";
    timeWindows: string[];
    enabled: boolean;
    isMandatory?: boolean;
    isCustom?: boolean;
}

export interface PipelineTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: PipelineCategory;
    events: PipelineEvent[];
    computedFeatures: ComputedFeature[];
    status: "active" | "inactive" | "configuring";
    webhookEndpoint?: string;
    lastEventAt?: string;
    eventsToday?: number;
}

export type PipelineCategory = 
    | "behavioral"
    | "transaction"
    | "context"
    | "marketing"
    | "trust"
    | "realtime";

export const PIPELINE_CATEGORIES: Record<PipelineCategory, { label: string; description: string }> = {
    behavioral: {
        label: "Behavioral Data",
        description: "Track user browsing, cart, and session behavior",
    },
    transaction: {
        label: "Transaction Data", 
        description: "Order history, pricing sensitivity, and payment patterns",
    },
    context: {
        label: "Context & Signals",
        description: "Product, logistics, and temporal context",
    },
    marketing: {
        label: "Marketing & Attribution",
        description: "Campaign exposure and channel performance",
    },
    trust: {
        label: "Trust & Risk",
        description: "Returns, disputes, and fraud signals",
    },
    realtime: {
        label: "Real-time Events",
        description: "Sub-second streaming for live inference",
    },
};

// Sample pipeline templates
export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
    // Behavioral
    {
        id: "browsing",
        name: "Browsing Events",
        description: "Page views, product views, searches, and engagement signals",
        icon: "Search",
        category: "behavioral",
        status: "active",
        eventsToday: 12450,
        lastEventAt: "2 mins ago",
        events: [
            {
                id: "page_view",
                name: "page_view",
                description: "Track page visits",
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
                id: "product_view",
                name: "product_view",
                description: "Track product detail page views",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "product_id", type: "string", required: true, description: "Product SKU/ID" },
                    { name: "product_name", type: "string", required: false, description: "Product name" },
                    { name: "category", type: "string", required: false, description: "Product category" },
                    { name: "price", type: "number", required: false, description: "Product price" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "search",
                name: "search",
                description: "Track search queries",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "query", type: "string", required: true, description: "Search query" },
                    { name: "results_count", type: "number", required: false, description: "Number of results" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "category_view",
                name: "category_view",
                description: "Track category page views",
                enabled: false,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "category_id", type: "string", required: true, description: "Category ID" },
                    { name: "category_name", type: "string", required: false, description: "Category name" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "page_views_count", name: "page_views_count", description: "Total page views", aggregation: "COUNT", timeWindows: ["5m", "1h", "24h", "7d"], enabled: true, isMandatory: true },
            { id: "product_views_count", name: "product_views_count", description: "Product detail page views", aggregation: "COUNT", timeWindows: ["5m", "1h", "24h", "7d"], enabled: true, isMandatory: true },
            { id: "unique_products_viewed", name: "unique_products_viewed", description: "Unique products viewed", aggregation: "COUNT_DISTINCT", timeWindows: ["24h", "7d", "30d"], enabled: true },
            { id: "search_count", name: "search_count", description: "Search queries", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], enabled: true },
            { id: "avg_time_on_product", name: "avg_time_on_product", description: "Average time spent on product pages", aggregation: "AVG", timeWindows: ["7d", "30d"], enabled: false },
            { id: "category_affinity", name: "category_affinity", description: "Most viewed product categories", aggregation: "COUNT", timeWindows: ["30d"], enabled: false },
        ],
    },
    {
        id: "cart",
        name: "Cart & Checkout",
        description: "Cart additions, removals, abandonment, and checkout funnel",
        icon: "ShoppingCart",
        category: "behavioral",
        status: "active",
        eventsToday: 3240,
        lastEventAt: "5 mins ago",
        events: [
            {
                id: "add_to_cart",
                name: "add_to_cart",
                description: "Item added to cart",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "product_id", type: "string", required: true, description: "Product SKU/ID" },
                    { name: "quantity", type: "number", required: true, description: "Quantity added" },
                    { name: "price", type: "number", required: true, description: "Unit price" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "remove_from_cart",
                name: "remove_from_cart",
                description: "Item removed from cart",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "product_id", type: "string", required: true, description: "Product SKU/ID" },
                    { name: "quantity", type: "number", required: true, description: "Quantity removed" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "checkout_started",
                name: "checkout_started",
                description: "User initiated checkout",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "cart_value", type: "number", required: true, description: "Total cart value" },
                    { name: "item_count", type: "number", required: true, description: "Number of items" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "cart_abandoned",
                name: "cart_abandoned",
                description: "Cart abandoned without purchase",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "cart_value", type: "number", required: true, description: "Abandoned cart value" },
                    { name: "item_count", type: "number", required: true, description: "Number of items" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "cart_additions_count", name: "cart_additions_count", description: "Items added to cart", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], enabled: true, isMandatory: true },
            { id: "cart_removals_count", name: "cart_removals_count", description: "Items removed from cart", aggregation: "COUNT", timeWindows: ["1h", "24h", "7d"], enabled: true },
            { id: "abandonment_rate", name: "abandonment_rate", description: "Cart abandonment frequency", aggregation: "AVG", timeWindows: ["7d", "30d"], enabled: true, isMandatory: true },
            { id: "avg_cart_value", name: "avg_cart_value", description: "Average cart value", aggregation: "AVG", timeWindows: ["7d", "30d"], enabled: true, isMandatory: true },
            { id: "cart_to_purchase_time", name: "cart_to_purchase_time", description: "Average time from cart to purchase", aggregation: "AVG", timeWindows: ["30d"], enabled: false },
            { id: "items_per_cart", name: "items_per_cart", description: "Average items per cart", aggregation: "AVG", timeWindows: ["7d", "30d"], enabled: false },
        ],
    },
    {
        id: "sessions",
        name: "Sessions",
        description: "Session duration, device type, entry source, and engagement",
        icon: "Monitor",
        category: "behavioral",
        status: "inactive",
        events: [
            {
                id: "session_start",
                name: "session_start",
                description: "New session initiated",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "session_id", type: "string", required: true, description: "Session ID" },
                    { name: "device_type", type: "string", required: true, description: "mobile/desktop/tablet" },
                    { name: "entry_source", type: "string", required: false, description: "direct/organic/paid/referral" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "session_end",
                name: "session_end",
                description: "Session ended",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "session_id", type: "string", required: true, description: "Session ID" },
                    { name: "duration_seconds", type: "number", required: true, description: "Session duration" },
                    { name: "pages_viewed", type: "number", required: false, description: "Pages viewed" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "avg_session_duration", name: "avg_session_duration", description: "Average session duration", aggregation: "AVG", timeWindows: ["7d", "30d"], enabled: true },
            { id: "sessions_count", name: "sessions_count", description: "Total sessions", aggregation: "COUNT", timeWindows: ["7d", "30d"], enabled: true },
            { id: "mobile_session_ratio", name: "mobile_session_ratio", description: "Mobile vs desktop ratio", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
        ],
    },
    // Transaction
    {
        id: "orders",
        name: "Orders & Purchases",
        description: "Order placement, RFM metrics, lifetime value, and AOV",
        icon: "Receipt",
        category: "transaction",
        status: "active",
        eventsToday: 847,
        lastEventAt: "12 mins ago",
        events: [
            {
                id: "order_placed",
                name: "order_placed",
                description: "Order successfully placed",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "total", type: "number", required: true, description: "Order total" },
                    { name: "items", type: "object", required: true, description: "Order items array" },
                    { name: "payment_method", type: "string", required: false, description: "Payment method used" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "order_shipped",
                name: "order_shipped",
                description: "Order shipped",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "carrier", type: "string", required: false, description: "Shipping carrier" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "order_delivered",
                name: "order_delivered",
                description: "Order delivered",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "delivery_days", type: "number", required: false, description: "Days to deliver" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "total_orders", name: "total_orders", description: "Total orders placed", aggregation: "COUNT", timeWindows: ["30d", "90d", "lifetime"], enabled: true, isMandatory: true },
            { id: "total_spend", name: "total_spend", description: "Total amount spent", aggregation: "SUM", timeWindows: ["30d", "90d", "lifetime"], enabled: true, isMandatory: true },
            { id: "aov", name: "aov", description: "Average order value", aggregation: "AVG", timeWindows: ["90d", "lifetime"], enabled: true, isMandatory: true },
            { id: "days_since_purchase", name: "days_since_purchase", description: "Days since last purchase", aggregation: "LAST", timeWindows: ["lifetime"], enabled: true, isMandatory: true },
            { id: "purchase_frequency", name: "purchase_frequency", description: "Orders per month", aggregation: "AVG", timeWindows: ["90d", "lifetime"], enabled: false },
            { id: "predicted_ltv", name: "predicted_ltv", description: "Predicted lifetime value", aggregation: "LAST", timeWindows: ["lifetime"], enabled: false },
        ],
    },
    {
        id: "pricing",
        name: "Pricing Behavior",
        description: "Discount usage, coupon rates, and price sensitivity signals",
        icon: "Tag",
        category: "transaction",
        status: "inactive",
        events: [
            {
                id: "discount_applied",
                name: "discount_applied",
                description: "Discount applied to order",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "discount_type", type: "string", required: true, description: "percentage/fixed/bogo" },
                    { name: "discount_value", type: "number", required: true, description: "Discount amount" },
                    { name: "order_value", type: "number", required: true, description: "Order value before discount" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "coupon_used",
                name: "coupon_used",
                description: "Coupon code redeemed",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "coupon_code", type: "string", required: true, description: "Coupon code" },
                    { name: "discount_amount", type: "number", required: true, description: "Discount amount" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "discount_purchase_ratio", name: "discount_purchase_ratio", description: "% of purchases with discount", aggregation: "AVG", timeWindows: ["90d", "lifetime"], enabled: true },
            { id: "avg_discount_used", name: "avg_discount_used", description: "Average discount amount", aggregation: "AVG", timeWindows: ["90d"], enabled: true },
            { id: "coupon_usage_rate", name: "coupon_usage_rate", description: "Coupon redemption rate", aggregation: "AVG", timeWindows: ["90d"], enabled: true },
        ],
    },
    {
        id: "payments",
        name: "Payment Methods",
        description: "Payment preferences, COD ratio, failures, and wallet usage",
        icon: "CreditCard",
        category: "transaction",
        status: "inactive",
        events: [
            {
                id: "payment_attempted",
                name: "payment_attempted",
                description: "Payment attempt made",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "method", type: "string", required: true, description: "cod/card/upi/wallet/emi" },
                    { name: "amount", type: "number", required: true, description: "Payment amount" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "payment_success",
                name: "payment_success",
                description: "Payment successful",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "method", type: "string", required: true, description: "Payment method" },
                    { name: "amount", type: "number", required: true, description: "Payment amount" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "payment_failed",
                name: "payment_failed",
                description: "Payment failed",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "method", type: "string", required: true, description: "Payment method" },
                    { name: "reason", type: "string", required: false, description: "Failure reason" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "cod_ratio", name: "cod_ratio", description: "COD vs prepaid ratio", aggregation: "AVG", timeWindows: ["lifetime"], enabled: true },
            { id: "payment_failure_rate", name: "payment_failure_rate", description: "Payment failure rate", aggregation: "AVG", timeWindows: ["90d"], enabled: true },
            { id: "preferred_payment_method", name: "preferred_payment_method", description: "Most used payment method", aggregation: "LAST", timeWindows: ["lifetime"], enabled: true },
        ],
    },
    // Context
    {
        id: "product_context",
        name: "Product Context",
        description: "Price changes, stock levels, and product metadata",
        icon: "Package",
        category: "context",
        status: "inactive",
        events: [
            {
                id: "price_changed",
                name: "price_changed",
                description: "Product price updated",
                enabled: true,
                fields: [
                    { name: "product_id", type: "string", required: true, description: "Product ID" },
                    { name: "old_price", type: "number", required: true, description: "Previous price" },
                    { name: "new_price", type: "number", required: true, description: "New price" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "stock_updated",
                name: "stock_updated",
                description: "Stock level changed",
                enabled: true,
                fields: [
                    { name: "product_id", type: "string", required: true, description: "Product ID" },
                    { name: "stock_level", type: "number", required: true, description: "Current stock" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "price_drops_viewed", name: "price_drops_viewed", description: "Products with price drops viewed", aggregation: "COUNT", timeWindows: ["7d"], enabled: true },
            { id: "low_stock_views", name: "low_stock_views", description: "Low stock products viewed", aggregation: "COUNT", timeWindows: ["24h", "7d"], enabled: true },
        ],
    },
    {
        id: "logistics",
        name: "Logistics & Delivery",
        description: "Delivery estimates, shipping, and fulfillment signals",
        icon: "Truck",
        category: "context",
        status: "inactive",
        events: [
            {
                id: "delivery_estimated",
                name: "delivery_estimated",
                description: "Delivery estimate shown",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "product_id", type: "string", required: true, description: "Product ID" },
                    { name: "eta_days", type: "number", required: true, description: "Estimated days to deliver" },
                    { name: "shipping_fee", type: "number", required: false, description: "Shipping cost" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "avg_delivery_eta", name: "avg_delivery_eta", description: "Average delivery ETA seen", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
            { id: "free_shipping_orders", name: "free_shipping_orders", description: "Orders with free shipping", aggregation: "COUNT", timeWindows: ["90d"], enabled: true },
        ],
    },
    {
        id: "temporal",
        name: "Temporal Patterns",
        description: "Time-of-day, day-of-week, and seasonal patterns",
        icon: "Clock",
        category: "context",
        status: "inactive",
        events: [],
        computedFeatures: [
            { id: "preferred_hour", name: "preferred_hour", description: "Most active hour of day", aggregation: "LAST", timeWindows: ["30d"], enabled: true },
            { id: "preferred_day", name: "preferred_day", description: "Most active day of week", aggregation: "LAST", timeWindows: ["30d"], enabled: true },
            { id: "weekend_activity_ratio", name: "weekend_activity_ratio", description: "Weekend vs weekday activity", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
        ],
    },
    // Marketing
    {
        id: "marketing",
        name: "Marketing Attribution",
        description: "Campaign exposure, clicks, and channel attribution",
        icon: "Megaphone",
        category: "marketing",
        status: "inactive",
        events: [
            {
                id: "campaign_exposed",
                name: "campaign_exposed",
                description: "User exposed to campaign",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "campaign_id", type: "string", required: true, description: "Campaign ID" },
                    { name: "channel", type: "string", required: true, description: "email/push/sms/ad" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "campaign_clicked",
                name: "campaign_clicked",
                description: "User clicked campaign",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "campaign_id", type: "string", required: true, description: "Campaign ID" },
                    { name: "channel", type: "string", required: true, description: "Channel" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "campaign_exposure_count", name: "campaign_exposure_count", description: "Campaign exposures", aggregation: "COUNT", timeWindows: ["7d", "30d"], enabled: true },
            { id: "campaign_click_rate", name: "campaign_click_rate", description: "Campaign click rate", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
            { id: "best_performing_channel", name: "best_performing_channel", description: "Highest converting channel", aggregation: "LAST", timeWindows: ["90d"], enabled: true },
        ],
    },
    // Trust
    {
        id: "trust",
        name: "Trust & Risk",
        description: "Returns, refunds, disputes, and fraud signals",
        icon: "Shield",
        category: "trust",
        status: "inactive",
        events: [
            {
                id: "return_requested",
                name: "return_requested",
                description: "Return request initiated",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "reason", type: "string", required: true, description: "Return reason" },
                    { name: "amount", type: "number", required: true, description: "Return value" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "refund_processed",
                name: "refund_processed",
                description: "Refund completed",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "order_id", type: "string", required: true, description: "Order ID" },
                    { name: "amount", type: "number", required: true, description: "Refund amount" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "return_rate", name: "return_rate", description: "Order return rate", aggregation: "AVG", timeWindows: ["90d", "lifetime"], enabled: true },
            { id: "refund_amount_total", name: "refund_amount_total", description: "Total refund amount", aggregation: "SUM", timeWindows: ["90d", "lifetime"], enabled: true },
            { id: "risk_score", name: "risk_score", description: "Computed risk score", aggregation: "LAST", timeWindows: ["lifetime"], enabled: true },
        ],
    },
    // Nudge Feedback
    {
        id: "nudge_feedback",
        name: "Nudge Feedback",
        description: "Nudge delivery, engagement, and conversion tracking",
        icon: "Bell",
        category: "marketing",
        status: "inactive",
        events: [
            {
                id: "nudge_sent",
                name: "nudge_sent",
                description: "Nudge delivered to user",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                    { name: "nudge_type", type: "string", required: true, description: "discount/urgency/social_proof" },
                    { name: "channel", type: "string", required: true, description: "Delivery channel" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "nudge_clicked",
                name: "nudge_clicked",
                description: "User clicked nudge",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
            {
                id: "nudge_converted",
                name: "nudge_converted",
                description: "Nudge led to conversion",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "nudge_id", type: "string", required: true, description: "Nudge ID" },
                    { name: "order_id", type: "string", required: true, description: "Resulting order ID" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "nudges_received", name: "nudges_received", description: "Total nudges received", aggregation: "COUNT", timeWindows: ["7d", "30d"], enabled: true },
            { id: "nudge_click_rate", name: "nudge_click_rate", description: "Nudge click-through rate", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
            { id: "nudge_conversion_rate", name: "nudge_conversion_rate", description: "Nudge to conversion rate", aggregation: "AVG", timeWindows: ["30d"], enabled: true },
            { id: "nudge_fatigue_score", name: "nudge_fatigue_score", description: "Nudge fatigue indicator", aggregation: "LAST", timeWindows: ["lifetime"], enabled: true },
        ],
    },
    // Real-time
    {
        id: "realtime",
        name: "Real-time Stream",
        description: "Sub-second events for live inference and instant nudging",
        icon: "Zap",
        category: "realtime",
        status: "inactive",
        events: [
            {
                id: "live_event",
                name: "live_event",
                description: "Any real-time event",
                enabled: true,
                fields: [
                    { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                    { name: "event_type", type: "string", required: true, description: "Event type" },
                    { name: "payload", type: "object", required: true, description: "Event payload" },
                    { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
                ],
            },
        ],
        computedFeatures: [
            { id: "events_last_5s", name: "events_last_5s", description: "Events in last 5 seconds", aggregation: "COUNT", timeWindows: ["5s"], enabled: true },
            { id: "events_last_30s", name: "events_last_30s", description: "Events in last 30 seconds", aggregation: "COUNT", timeWindows: ["30s"], enabled: true },
            { id: "active_now", name: "active_now", description: "Currently active flag", aggregation: "LAST", timeWindows: ["1m"], enabled: true },
        ],
    },
];

