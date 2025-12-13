import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Minus,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { featuresApi } from "@/lib/api/dataplatform";
import type { FeatureGroupsResponse, FeatureGroupName } from "@/lib/api/dataplatform/types";

// Feature group configurations
const FEATURE_GROUP_CONFIG: Record<
    FeatureGroupName,
    {
        icon: typeof ShoppingCart;
        label: string;
        description: string;
        color: { bg: string; text: string; border: string; light: string };
    }
> = {
    cart: {
        icon: ShoppingCart,
        label: "Cart Behavior",
        description: "Shopping cart adds, removes, and checkout activity",
        color: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" },
    },
    page: {
        icon: Eye,
        label: "Page Activity",
        description: "Page views, sessions, and browsing patterns",
        color: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200", light: "bg-blue-50" },
    },
    order: {
        icon: CreditCard,
        label: "Purchase History",
        description: "Orders, revenue, and average order value",
        color: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", light: "bg-emerald-50" },
    },
    engagement: {
        icon: Activity,
        label: "Engagement Scores",
        description: "Computed engagement metrics and conversion ratios",
        color: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200", light: "bg-violet-50" },
    },
    recency: {
        icon: Clock,
        label: "Recency",
        description: "Time since last activity and visit patterns",
        color: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200", light: "bg-rose-50" },
    },
};

// Feature metadata for display
const FEATURE_METADATA: Record<string, { label: string; description: string; format?: "number" | "currency" | "percent" | "date" | "boolean" }> = {
    // Cart features
    adds_1d: { label: "Cart Adds (1d)", description: "Items added to cart in last day", format: "number" },
    adds_7d: { label: "Cart Adds (7d)", description: "Items added to cart in last 7 days", format: "number" },
    adds_30d: { label: "Cart Adds (30d)", description: "Items added to cart in last 30 days", format: "number" },
    removes_7d: { label: "Cart Removes (7d)", description: "Items removed from cart in last 7 days", format: "number" },
    removes_30d: { label: "Cart Removes (30d)", description: "Items removed from cart in last 30 days", format: "number" },
    checkouts_30d: { label: "Checkouts (30d)", description: "Checkout events in last 30 days", format: "number" },
    avg_value: { label: "Avg Cart Value", description: "Average cart value", format: "currency" },
    max_value: { label: "Max Cart Value", description: "Maximum cart value", format: "currency" },
    unique_products: { label: "Unique Products", description: "Unique products added to cart", format: "number" },
    
    // Page features
    views_1d: { label: "Page Views (1d)", description: "Pages viewed in last day", format: "number" },
    views_7d: { label: "Page Views (7d)", description: "Pages viewed in last 7 days", format: "number" },
    views_30d: { label: "Page Views (30d)", description: "Pages viewed in last 30 days", format: "number" },
    sessions_1d: { label: "Sessions (1d)", description: "Sessions in last day", format: "number" },
    sessions_7d: { label: "Sessions (7d)", description: "Sessions in last 7 days", format: "number" },
    sessions_30d: { label: "Sessions (30d)", description: "Sessions in last 30 days", format: "number" },
    avg_duration_ms: { label: "Avg Duration", description: "Average page view duration", format: "number" },
    product_views: { label: "Product Views", description: "Product page views", format: "number" },
    unique_products_viewed: { label: "Unique Products Viewed", description: "Unique products viewed", format: "number" },
    
    // Order features
    count_30d: { label: "Orders (30d)", description: "Orders placed in last 30 days", format: "number" },
    count_90d: { label: "Orders (90d)", description: "Orders placed in last 90 days", format: "number" },
    count_lifetime: { label: "Lifetime Orders", description: "Total orders placed", format: "number" },
    revenue_30d: { label: "Revenue (30d)", description: "Revenue in last 30 days", format: "currency" },
    revenue_lifetime: { label: "Lifetime Revenue", description: "Total revenue", format: "currency" },
    items_30d: { label: "Items (30d)", description: "Items purchased in last 30 days", format: "number" },
    
    // Engagement features
    cart_abandonment_rate: { label: "Cart Abandonment", description: "Cart abandonment rate", format: "percent" },
    engagement_score: { label: "Engagement Score", description: "Overall engagement score (0-100)", format: "number" },
    recency_score: { label: "Recency Score", description: "Recency-based score", format: "number" },
    browse_to_cart_ratio: { label: "Browse → Cart", description: "Browse to cart conversion ratio", format: "percent" },
    cart_to_purchase_ratio: { label: "Cart → Purchase", description: "Cart to purchase conversion ratio", format: "percent" },
    is_active_7d: { label: "Active (7d)", description: "Active in last 7 days", format: "boolean" },
    is_buyer: { label: "Has Purchased", description: "Has made at least one purchase", format: "boolean" },
    
    // Recency features
    days_since_last: { label: "Days Since Last", description: "Days since last activity", format: "number" },
    hours_since_last: { label: "Hours Since Last", description: "Hours since last activity", format: "number" },
    first_seen: { label: "First Seen", description: "First activity timestamp", format: "date" },
    last_seen: { label: "Last Seen", description: "Last activity timestamp", format: "date" },
};

// Format feature value for display
function formatFeatureValue(value: unknown, format?: string): string {
    if (value === null || value === undefined) return "—";
    
    switch (format) {
        case "currency":
            return typeof value === "number" ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value);
        case "percent":
            return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : String(value);
        case "boolean":
            return value ? "Yes" : "No";
        case "date":
            if (typeof value === "string") {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
            }
            return String(value);
        case "number":
        default:
            return typeof value === "number" ? value.toLocaleString() : String(value);
    }
}

// Get trend indicator
function getTrendIndicator(value: unknown): { icon: typeof TrendingUp; color: string } | null {
    if (typeof value !== "number") return null;
    if (value > 0) return { icon: TrendingUp, color: "text-emerald-500" };
    if (value < 0) return { icon: TrendingDown, color: "text-red-500" };
    return { icon: Minus, color: "text-slate-400" };
}

// ============================================================================
// Feature Group Card Component
// ============================================================================
interface FeatureGroupCardProps {
    group: FeatureGroupName;
    data: { features: Record<string, unknown>; updated_at?: string };
    isExpanded: boolean;
    onToggle: () => void;
}

function FeatureGroupCard({ group, data, isExpanded, onToggle }: FeatureGroupCardProps) {
    const config = FEATURE_GROUP_CONFIG[group];
    const Icon = config.icon;
    const features = data.features || {};
    const featureCount = Object.keys(features).length;
    
    return (
        <div className={cn("rounded-xl border-2 overflow-hidden transition-all", config.color.border)}>
            {/* Header */}
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
                        <h3 className="font-semibold text-slate-900">{config.label}</h3>
                        <p className="text-sm text-slate-500">{config.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                        {featureCount} features
                    </Badge>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                </div>
            </button>
            
            {/* Features */}
            {isExpanded && (
                <div className="bg-white border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-100">
                        {Object.entries(features).map(([key, value]) => {
                            const meta = FEATURE_METADATA[key] || { label: key, description: "" };
                            const trend = getTrendIndicator(value);
                            
                            return (
                                <div key={key} className="bg-white p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between mb-1">
                                        <span className="text-xs text-slate-500 font-medium">{meta.label}</span>
                                        {trend && <trend.icon className={cn("h-3.5 w-3.5", trend.color)} />}
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {formatFeatureValue(value, meta.format)}
                                    </div>
                                    {meta.description && (
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{meta.description}</p>
                                    )}
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

// ============================================================================
// Main Component
// ============================================================================
export default function FeatureStore() {
    const { selectedProject } = useProject();
    
    // State
    const [userId, setUserId] = useState("");
    const [searchedUserId, setSearchedUserId] = useState("");
    const [features, setFeatures] = useState<FeatureGroupsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<FeatureGroupName>>(new Set(["cart", "page", "order", "engagement", "recency"]));
    const [copied, setCopied] = useState(false);
    
    // Fetch features
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
    
    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchFeatures();
    };
    
    // Toggle group expansion
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
    
    // Expand/collapse all
    const expandAll = () => setExpandedGroups(new Set(["cart", "page", "order", "engagement", "recency"]));
    const collapseAll = () => setExpandedGroups(new Set());
    
    // Copy user ID
    const copyUserId = async () => {
        if (searchedUserId) {
            await navigator.clipboard.writeText(searchedUserId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    // Show empty state if no project selected
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
                    View computed user features for ML model inference and personalization
                </p>
            </div>
            
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
                        Enter a user ID and API key to view their computed feature groups including cart behavior, 
                        page activity, purchase history, engagement scores, and recency metrics.
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
                        
                        {/* Quick Stats */}
                        <div className="grid grid-cols-5 gap-4 mt-6">
                            {features.available_groups.map((group) => {
                                const config = FEATURE_GROUP_CONFIG[group];
                                const Icon = config.icon;
                                const groupData = features.groups[group];
                                const featureCount = groupData ? Object.keys(groupData.features || {}).length : 0;
                                
                                return (
                                    <div
                                        key={group}
                                        className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => toggleGroup(group)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs text-slate-400">{config.label}</span>
                                        </div>
                                        <p className="text-lg font-semibold">{featureCount} features</p>
                                    </div>
                                );
                            })}
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
