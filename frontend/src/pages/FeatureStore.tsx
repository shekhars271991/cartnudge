import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Search,
    Loader2,
    AlertCircle,
    ShoppingCart,
    Eye,
    CreditCard,
    Activity,
    Clock,
    User,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Sparkles,
    BookOpen,
    Layers,
    Hash,
    Calculator,
    Zap,
    Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { featuresApi } from "@/lib/api/dataplatform";
import type { FeatureGroupsResponse, FeatureGroupName } from "@/lib/api/dataplatform/types";

// ============================================================================
// Feature Definitions (from feature_definitions.json)
// ============================================================================

interface FeatureDefinition {
    name: string;
    type: "int" | "float" | "bool" | "string";
    description: string;
    aggregation: string;
    source_table?: string;
    field?: string;
    filter?: string;
    formula?: string;
    window_days?: number;
}

interface FeatureGroupDefinition {
    group_id: string;
    name: string;
    description: string;
    features: FeatureDefinition[];
}

// Feature catalog - matches the aggregation job output
const FEATURE_CATALOG: FeatureGroupDefinition[] = [
    {
        group_id: "cart",
        name: "Cart Behavior",
        description: "Features derived from shopping cart activity",
        features: [
            { name: "adds_1d", type: "int", description: "Cart adds in last day", aggregation: "count", source_table: "cart_events", window_days: 1 },
            { name: "adds_7d", type: "int", description: "Cart adds in last 7 days", aggregation: "count", source_table: "cart_events", window_days: 7 },
            { name: "adds_30d", type: "int", description: "Cart adds in last 30 days", aggregation: "count", source_table: "cart_events", window_days: 30 },
            { name: "removes_7d", type: "int", description: "Cart removes in last 7 days", aggregation: "count", source_table: "cart_events", window_days: 7 },
            { name: "removes_30d", type: "int", description: "Cart removes in last 30 days", aggregation: "count", source_table: "cart_events", window_days: 30 },
            { name: "checkouts_30d", type: "int", description: "Checkout events in last 30 days", aggregation: "count", source_table: "cart_events", window_days: 30 },
            { name: "avg_value", type: "float", description: "Average cart value", aggregation: "avg", source_table: "cart_events", field: "cart_total" },
            { name: "max_value", type: "float", description: "Maximum cart value seen", aggregation: "max", source_table: "cart_events", field: "cart_total" },
            { name: "unique_products", type: "int", description: "Unique products added to cart", aggregation: "count_distinct", source_table: "cart_events", field: "product_id" },
        ],
    },
    {
        group_id: "page",
        name: "Page Engagement",
        description: "Features derived from browsing behavior",
        features: [
            { name: "views_1d", type: "int", description: "Page views in last day", aggregation: "count", source_table: "page_events", window_days: 1 },
            { name: "views_7d", type: "int", description: "Page views in last 7 days", aggregation: "count", source_table: "page_events", window_days: 7 },
            { name: "views_30d", type: "int", description: "Page views in last 30 days", aggregation: "count", source_table: "page_events", window_days: 30 },
            { name: "sessions_1d", type: "int", description: "Unique sessions in last day", aggregation: "count_distinct", source_table: "page_events", field: "session_id", window_days: 1 },
            { name: "sessions_7d", type: "int", description: "Unique sessions in last 7 days", aggregation: "count_distinct", source_table: "page_events", field: "session_id", window_days: 7 },
            { name: "sessions_30d", type: "int", description: "Unique sessions in last 30 days", aggregation: "count_distinct", source_table: "page_events", field: "session_id", window_days: 30 },
            { name: "avg_duration_ms", type: "float", description: "Average page view duration (ms)", aggregation: "avg", source_table: "page_events", field: "duration_ms" },
            { name: "product_views", type: "int", description: "Product page views", aggregation: "count", source_table: "page_events", filter: "page_type = 'product'" },
            { name: "unique_products_viewed", type: "int", description: "Unique products viewed", aggregation: "count_distinct", source_table: "page_events", field: "product_id" },
        ],
    },
    {
        group_id: "order",
        name: "Purchase History",
        description: "Features derived from order/purchase data",
        features: [
            { name: "count_30d", type: "int", description: "Orders in last 30 days", aggregation: "count", source_table: "order_events", window_days: 30 },
            { name: "count_90d", type: "int", description: "Orders in last 90 days", aggregation: "count", source_table: "order_events", window_days: 90 },
            { name: "count_lifetime", type: "int", description: "Total lifetime orders", aggregation: "count", source_table: "order_events" },
            { name: "revenue_30d", type: "float", description: "Revenue in last 30 days", aggregation: "sum", source_table: "order_events", field: "total_amount", window_days: 30 },
            { name: "revenue_lifetime", type: "float", description: "Total lifetime revenue", aggregation: "sum", source_table: "order_events", field: "total_amount" },
            { name: "avg_value", type: "float", description: "Average order value", aggregation: "avg", source_table: "order_events", field: "total_amount" },
            { name: "items_30d", type: "int", description: "Items purchased in last 30 days", aggregation: "sum", source_table: "order_events", field: "item_count", window_days: 30 },
        ],
    },
    {
        group_id: "engagement",
        name: "Engagement Scores",
        description: "Computed engagement metrics and ratios",
        features: [
            { name: "cart_abandonment_rate", type: "float", description: "Cart abandonment rate (0-1)", aggregation: "computed", formula: "1 - (checkouts / cart_adds)" },
            { name: "engagement_score", type: "float", description: "Overall engagement score (0-100)", aggregation: "computed", formula: "views * 0.3 + sessions * 2 + cart_adds * 5 + orders * 20" },
            { name: "recency_score", type: "float", description: "Recency-based activity score (0-100)", aggregation: "computed", formula: "100 - (days_since_last * 3)" },
            { name: "browse_to_cart_ratio", type: "float", description: "Browse to cart conversion", aggregation: "computed", formula: "products_carted / products_viewed" },
            { name: "cart_to_purchase_ratio", type: "float", description: "Cart to purchase conversion", aggregation: "computed", formula: "orders / cart_adds" },
            { name: "is_active_7d", type: "bool", description: "Active in last 7 days", aggregation: "computed", formula: "views_7d > 0" },
            { name: "is_buyer", type: "bool", description: "Has made at least one purchase", aggregation: "computed", formula: "orders_lifetime > 0" },
        ],
    },
    {
        group_id: "recency",
        name: "Recency Features",
        description: "Time-based recency features",
        features: [
            { name: "days_since_last", type: "int", description: "Days since last activity", aggregation: "days_since_last", source_table: "all_events" },
            { name: "hours_since_last", type: "int", description: "Hours since last activity", aggregation: "hours_since_last", source_table: "all_events" },
            { name: "first_seen", type: "string", description: "First activity timestamp", aggregation: "min", source_table: "all_events", field: "event_timestamp" },
            { name: "last_seen", type: "string", description: "Last activity timestamp", aggregation: "max", source_table: "all_events", field: "event_timestamp" },
        ],
    },
];

// Group icons and colors
const GROUP_CONFIG: Record<string, { icon: typeof ShoppingCart; color: { bg: string; text: string; border: string; light: string } }> = {
    cart: { icon: ShoppingCart, color: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" } },
    page: { icon: Eye, color: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200", light: "bg-blue-50" } },
    order: { icon: CreditCard, color: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", light: "bg-emerald-50" } },
    engagement: { icon: Activity, color: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200", light: "bg-violet-50" } },
    recency: { icon: Clock, color: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200", light: "bg-rose-50" } },
};

// Aggregation type icons
const AGGREGATION_ICONS: Record<string, typeof Hash> = {
    count: Hash,
    sum: Calculator,
    avg: TrendingUp,
    max: TrendingUp,
    min: TrendingDown,
    count_distinct: Layers,
    computed: Zap,
    days_since_last: Clock,
    hours_since_last: Clock,
};

// ============================================================================
// Feature Catalog Component
// ============================================================================

function FeatureCatalog() {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["cart"]));
    
    const toggleGroup = (groupId: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };
    
    const totalFeatures = FEATURE_CATALOG.reduce((acc, g) => acc + g.features.length, 0);
    
    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Layers className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{FEATURE_CATALOG.length}</p>
                            <p className="text-sm text-slate-500">Feature Groups</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalFeatures}</p>
                            <p className="text-sm text-slate-500">Total Features</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">5s</p>
                            <p className="text-sm text-slate-500">Refresh Interval</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Feature Groups */}
            <div className="space-y-4">
                {FEATURE_CATALOG.map((group) => {
                    const config = GROUP_CONFIG[group.group_id] || GROUP_CONFIG.cart;
                    const Icon = config.icon;
                    const isExpanded = expandedGroups.has(group.group_id);
                    
                    return (
                        <div key={group.group_id} className={cn("rounded-xl border-2 overflow-hidden", config.color.border)}>
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.group_id)}
                                className={cn(
                                    "w-full px-5 py-4 flex items-center justify-between transition-colors",
                                    isExpanded ? config.color.light : "bg-white hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", config.color.bg)}>
                                        <Icon className={cn("h-5 w-5", config.color.text)} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                                        <p className="text-sm text-slate-500">{group.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {group.features.length} features
                                    </Badge>
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
                                    )}
                                </div>
                            </button>
                            
                            {/* Features Table */}
                            {isExpanded && (
                                <div className="bg-white border-t border-slate-100">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                <th className="px-4 py-3 text-left">Feature Name</th>
                                                <th className="px-4 py-3 text-left">Type</th>
                                                <th className="px-4 py-3 text-left">Aggregation</th>
                                                <th className="px-4 py-3 text-left">Window</th>
                                                <th className="px-4 py-3 text-left">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {group.features.map((feature) => {
                                                const AggIcon = AGGREGATION_ICONS[feature.aggregation] || Hash;
                                                return (
                                                    <tr key={feature.name} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <code className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                                                {feature.name}
                                                            </code>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant="secondary" className="text-xs font-mono">
                                                                {feature.type}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <AggIcon className="h-3.5 w-3.5 text-slate-400" />
                                                                <span className="text-sm text-slate-600">{feature.aggregation}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {feature.window_days ? (
                                                                <span className="text-sm text-slate-600">{feature.window_days}d</span>
                                                            ) : (
                                                                <span className="text-sm text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-sm text-slate-500">{feature.description}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900">How Features are Computed</p>
                        <p className="text-sm text-blue-700 mt-1">
                            Features are computed every 5 seconds by the <code className="bg-blue-100 px-1 rounded">feature-aggregator</code> service.
                            It reads raw events from ClickHouse, computes aggregations, and stores results in Aerospike for real-time serving.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// User Lookup Component
// ============================================================================

// Format feature value for display
function formatFeatureValue(value: unknown, featureName: string): string {
    if (value === null || value === undefined) return "—";
    
    // Currency fields
    if (featureName.includes("value") || featureName.includes("revenue") || featureName.includes("amount")) {
        return typeof value === "number" ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value);
    }
    
    // Percentage/ratio fields
    if (featureName.includes("rate") || featureName.includes("ratio") || featureName.includes("score")) {
        if (typeof value === "number") {
            if (value <= 1) return `${(value * 100).toFixed(1)}%`;
            return value.toFixed(2);
        }
    }
    
    // Boolean fields
    if (typeof value === "boolean" || featureName.startsWith("is_")) {
        return value ? "Yes" : "No";
    }
    
    // Date fields
    if (featureName.includes("_seen") || featureName.includes("_at")) {
        if (typeof value === "string") {
            const date = new Date(value);
            return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
        }
    }
    
    return typeof value === "number" ? value.toLocaleString() : String(value);
}

interface FeatureGroupCardProps {
    group: FeatureGroupName;
    data: { features: Record<string, unknown>; updated_at?: string };
    isExpanded: boolean;
    onToggle: () => void;
}

function FeatureGroupCard({ group, data, isExpanded, onToggle }: FeatureGroupCardProps) {
    const config = GROUP_CONFIG[group] || GROUP_CONFIG.cart;
    const Icon = config.icon;
    const features = data.features || {};
    const featureCount = Object.keys(features).length;
    const groupDef = FEATURE_CATALOG.find((g) => g.group_id === group);
    
    return (
        <div className={cn("rounded-xl border-2 overflow-hidden transition-all", config.color.border)}>
            <button
                onClick={onToggle}
                className={cn(
                    "w-full px-5 py-4 flex items-center justify-between transition-colors",
                    isExpanded ? config.color.light : "bg-white hover:bg-slate-50"
                )}
            >
                <div className="flex items-center gap-4">
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", config.color.bg)}>
                        <Icon className={cn("h-5 w-5", config.color.text)} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-slate-900">{groupDef?.name || group}</h3>
                        <p className="text-sm text-slate-500">{groupDef?.description || ""}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                        {featureCount} values
                    </Badge>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                </div>
            </button>
            
            {isExpanded && (
                <div className="bg-white border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-100">
                        {Object.entries(features).map(([key, value]) => {
                            const featureDef = groupDef?.features.find((f) => f.name === key);
                            return (
                                <div key={key} className="bg-white p-4 hover:bg-slate-50 transition-colors">
                                    <div className="text-xs text-slate-500 font-medium mb-1">
                                        {featureDef?.description || key}
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {formatFeatureValue(value, key)}
                                    </div>
                                    <code className="text-xs text-slate-400 font-mono">{key}</code>
                                </div>
                            );
                        })}
                    </div>
                    {data.updated_at && (
                        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">
                            Last updated: {new Date(data.updated_at).toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function UserLookup() {
    const { selectedProject } = useProject();
    
    const [userId, setUserId] = useState("");
    const [searchedUserId, setSearchedUserId] = useState("");
    const [features, setFeatures] = useState<FeatureGroupsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<FeatureGroupName>>(new Set(["cart", "page", "order", "engagement", "recency"]));
    const [copied, setCopied] = useState(false);
    
    const fetchFeatures = useCallback(async () => {
        if (!selectedProject || !userId.trim()) {
            setError("Please enter a User ID");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const data = await featuresApi.getAllGroups(selectedProject.id, userId.trim());
            setFeatures(data);
            setSearchedUserId(userId.trim());
        } catch (err: unknown) {
            console.error("Failed to fetch features:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch features";
            if (errorMessage.includes("404")) {
                setError(`No features found for user "${userId}". Features may not have been computed yet.`);
            } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
                setError("You don't have permission to access this project's features.");
            } else {
                setError(errorMessage);
            }
            setFeatures(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject, userId]);
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchFeatures();
    };
    
    const toggleGroup = (group: FeatureGroupName) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };
    
    const expandAll = () => setExpandedGroups(new Set(["cart", "page", "order", "engagement", "recency"]));
    const collapseAll = () => setExpandedGroups(new Set());
    
    const copyUserId = async () => {
        if (searchedUserId) {
            await navigator.clipboard.writeText(searchedUserId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    return (
        <div className="space-y-6">
            {/* Search Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="userId" className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            User ID
                        </Label>
                        <div className="flex gap-3">
                            <Input
                                id="userId"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter user ID (e.g., user_123, test_user_1)"
                                className="font-mono max-w-md"
                            />
                            <Button type="submit" disabled={isLoading || !userId.trim()}>
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4 mr-2" />
                                )}
                                Lookup Features
                            </Button>
                            {features && (
                                <Button type="button" variant="outline" onClick={fetchFeatures} disabled={isLoading}>
                                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            Enter any user ID to view their computed features from Aerospike
                        </p>
                    </div>
                </form>
            </div>
            
            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Error loading features</p>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                </div>
            )}
            
            {/* Empty State */}
            {!features && !error && !isLoading && (
                <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Look up user features</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Enter a user ID to view their computed feature values. Features are organized into groups: 
                        cart behavior, page activity, purchase history, engagement scores, and recency metrics.
                    </p>
                </div>
            )}
            
            {/* Features Display */}
            {features && (
                <div className="space-y-4">
                    {/* User Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                                    <User className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">User Features</p>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold font-mono">{searchedUserId}</h2>
                                        <button
                                            onClick={copyUserId}
                                            className="p-1 rounded hover:bg-white/10 transition-colors"
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={expandAll} className="text-white hover:bg-white/10">
                                    Expand All
                                </Button>
                                <Button variant="ghost" size="sm" onClick={collapseAll} className="text-white hover:bg-white/10">
                                    Collapse All
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Feature Groups */}
                    <div className="space-y-4">
                        {features.available_groups.map((group) => {
                            const groupData = features.groups[group];
                            if (!groupData) return null;
                            
                            return (
                                <FeatureGroupCard
                                    key={group}
                                    group={group}
                                    data={groupData}
                                    isExpanded={expandedGroups.has(group)}
                                    onToggle={() => toggleGroup(group)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================
export default function FeatureStore() {
    const { selectedProject } = useProject();
    const [activeTab, setActiveTab] = useState("catalog");
    
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to view user features."
            />
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Feature Store</h1>
                <p className="text-slate-500 mt-1">
                    View feature definitions and query computed user features for ML inference
                </p>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="catalog" className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Feature Catalog
                    </TabsTrigger>
                    <TabsTrigger value="lookup" className="gap-2">
                        <Search className="h-4 w-4" />
                        User Lookup
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="catalog">
                    <FeatureCatalog />
                </TabsContent>
                
                <TabsContent value="lookup">
                    <UserLookup />
                </TabsContent>
            </Tabs>
        </div>
    );
}
