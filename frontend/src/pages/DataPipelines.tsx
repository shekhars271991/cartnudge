import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    CheckCircle2,
    Clock,
    Zap,
    Loader2,
    AlertCircle,
    ShoppingCart,
    Eye,
    CreditCard,
    Users,
    Settings2,
    Activity,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { pipelinesApi } from "@/lib/api/dataplatform";
import type { EventPipeline } from "@/lib/api/dataplatform/types";

// Topic icons and colors
const TOPIC_ICONS: Record<string, typeof ShoppingCart> = {
    cart_events: ShoppingCart,
    page_events: Eye,
    order_events: CreditCard,
    user_events: Users,
    custom_events: Settings2,
};

const TOPIC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    cart_events: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
    page_events: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
    order_events: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
    user_events: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
    custom_events: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
};

const TOPIC_NAMES: Record<string, string> = {
    cart_events: "Cart Events",
    page_events: "Page Events",
    order_events: "Order Events",
    user_events: "User Events",
    custom_events: "Custom Events",
};

// ============================================================================
// Main Component
// ============================================================================
export default function DataPipelines() {
    const navigate = useNavigate();
    const { selectedProject } = useProject();

    // Pipeline state
    const [pipelines, setPipelines] = useState<EventPipeline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load pipelines from API
    const loadPipelines = useCallback(async () => {
        if (!selectedProject) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await pipelinesApi.list(selectedProject.id);
            setPipelines(response.items);
        } catch (err: unknown) {
            console.error("Failed to load pipelines:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to load pipelines";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        loadPipelines();
    }, [loadPipelines]);

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to configure your event pipelines."
            />
        );
    }

    // Stats
    const activePipelines = pipelines.filter((p) => p.is_active).length;
    const totalEvents = pipelines.reduce((acc, p) => acc + p.events_count, 0);
    const totalEventTypes = pipelines.reduce((acc, p) => acc + p.event_configs.length, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-slate-600">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={loadPipelines}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Pipelines</h1>
                    <p className="text-slate-500 mt-1">
                        Configure event pipelines to ingest and process your data
                    </p>
                </div>
                <Button onClick={() => navigate("/data-pipelines/new")} size="lg" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Pipeline
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{activePipelines}</p>
                            <p className="text-sm text-slate-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalEvents.toLocaleString()}</p>
                            <p className="text-sm text-slate-500">Total Events</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{pipelines.length}</p>
                            <p className="text-sm text-slate-500">Pipelines</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalEventTypes}</p>
                            <p className="text-sm text-slate-500">Event Types</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pipeline List */}
            {pipelines.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Your Pipelines</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pipelines.map((pipeline) => {
                            const TopicIcon = TOPIC_ICONS[pipeline.topic_id] || Zap;
                            const colors = TOPIC_COLORS[pipeline.topic_id] || TOPIC_COLORS.custom_events;
                            const topicName = TOPIC_NAMES[pipeline.topic_id] || "Custom";

                            return (
                                <div
                                    key={pipeline.id}
                                    className={cn(
                                        "bg-white rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-md group",
                                        pipeline.is_active ? "border-emerald-200" : "border-slate-200"
                                    )}
                                    onClick={() => navigate(`/data-pipelines/${pipeline.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                            <TopicIcon className={cn("h-5 w-5", colors.text)} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pipeline.is_active ? (
                                                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-1">{pipeline.display_name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{pipeline.description}</p>
                                    <div className="flex items-center justify-between text-sm text-slate-400">
                                        <div className="flex items-center gap-4">
                                            <span className={cn("px-2 py-0.5 rounded-full text-xs", colors.bg, colors.text)}>
                                                {topicName}
                                            </span>
                                            <span>{pipeline.event_configs.length} events</span>
                                            <span>
                                                {pipeline.event_configs.reduce((acc, ec) => acc + ec.fields.length, 0)} fields
                                            </span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed">
                    <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No pipelines yet</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Create your first event pipeline to start ingesting data. Choose from cart, page, order, or user events.
                    </p>
                    <Button onClick={() => navigate("/data-pipelines/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Pipeline
                    </Button>
                </div>
            )}

        </div>
    );
}
