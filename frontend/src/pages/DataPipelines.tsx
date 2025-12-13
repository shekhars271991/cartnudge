import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    Trash2,
    CheckCircle2,
    Clock,
    Zap,
    Loader2,
    AlertCircle,
    Play,
    Pause,
    ShoppingCart,
    Eye,
    CreditCard,
    Users,
    Settings2,
    Activity,
    Copy,
    Code,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { pipelinesApi } from "@/lib/api/dataplatform";
import type { EventPipeline, EventTypeConfig } from "@/lib/api/dataplatform/types";
import { Label } from "@/components/ui/label";

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

    // Detail view state
    const [selectedPipeline, setSelectedPipeline] = useState<EventPipeline | null>(null);
    const [showIntegration, setShowIntegration] = useState(false);

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

    const togglePipelineActive = async (pipelineId: string) => {
        const pipeline = pipelines.find((p) => p.id === pipelineId);
        if (!pipeline) return;

        try {
            const updated = pipeline.is_active
                ? await pipelinesApi.deactivate(selectedProject.id, pipelineId)
                : await pipelinesApi.activate(selectedProject.id, pipelineId);
            
            setPipelines((prev) =>
                prev.map((p) => (p.id === pipelineId ? updated : p))
            );
            if (selectedPipeline?.id === pipelineId) {
                setSelectedPipeline(updated);
            }
        } catch (err) {
            console.error("Failed to toggle pipeline status:", err);
            alert("Failed to update pipeline status");
        }
    };

    const deletePipeline = async (pipelineId: string) => {
        if (!confirm("Are you sure you want to delete this pipeline?")) return;

        try {
            await pipelinesApi.delete(selectedProject.id, pipelineId);
            setPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
            setSelectedPipeline(null);
        } catch (err) {
            console.error("Failed to delete pipeline:", err);
            alert("Failed to delete pipeline");
        }
    };

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
                                        "bg-white rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-md",
                                        pipeline.is_active ? "border-emerald-200" : "border-slate-200"
                                    )}
                                    onClick={() => setSelectedPipeline(pipeline)}
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
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className={cn("px-2 py-0.5 rounded-full text-xs", colors.bg, colors.text)}>
                                            {topicName}
                                        </span>
                                        <span>{pipeline.event_configs.length} events</span>
                                        <span>
                                            {pipeline.event_configs.reduce((acc, ec) => acc + ec.fields.length, 0)} fields
                                        </span>
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

            {/* ===== PIPELINE DETAIL DIALOG ===== */}
            <Dialog open={!!selectedPipeline} onOpenChange={() => setSelectedPipeline(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    {selectedPipeline && (
                        <>
                            <DialogHeader className="flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const TopicIcon = TOPIC_ICONS[selectedPipeline.topic_id] || Zap;
                                            const colors = TOPIC_COLORS[selectedPipeline.topic_id] || TOPIC_COLORS.custom_events;
                                            return (
                                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                                    <TopicIcon className={cn("h-5 w-5", colors.text)} />
                                                </div>
                                            );
                                        })()}
                                        <div>
                                            <DialogTitle>{selectedPipeline.display_name}</DialogTitle>
                                            <p className="text-sm text-slate-500">{selectedPipeline.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant={selectedPipeline.is_active ? "outline" : "default"}
                                            size="sm"
                                            onClick={() => togglePipelineActive(selectedPipeline.id)}
                                            className={
                                                selectedPipeline.is_active
                                                    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                                                    : "bg-emerald-600 hover:bg-emerald-700"
                                            }
                                        >
                                            {selectedPipeline.is_active ? (
                                                <>
                                                    <Pause className="h-4 w-4 mr-1" />
                                                    Deactivate
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="h-4 w-4 mr-1" />
                                                    Activate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto py-4 space-y-6">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-2xl font-bold text-slate-900">
                                            {selectedPipeline.events_count.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-slate-500">Total Events</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-2xl font-bold text-slate-900">{selectedPipeline.event_configs.length}</p>
                                        <p className="text-sm text-slate-500">Event Types</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-2xl font-bold text-slate-900">
                                            {selectedPipeline.event_configs.reduce((acc, ec) => acc + ec.fields.length, 0)}
                                        </p>
                                        <p className="text-sm text-slate-500">Total Fields</p>
                                    </div>
                                </div>

                                {/* Event Types */}
                                <div>
                                    <Label className="text-base mb-3 block">Event Types & Fields</Label>
                                    <div className="space-y-3">
                                        {selectedPipeline.event_configs.map((config: EventTypeConfig) => (
                                            <div key={config.event_type} className="p-4 bg-slate-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-sm font-mono text-slate-700 bg-white px-2 py-0.5 rounded border">
                                                            {config.event_type}
                                                        </code>
                                                        <span className="text-sm text-slate-500">{config.display_name}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {config.fields.length} fields
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {config.fields.map((f) => (
                                                        <Badge key={f.id} variant="secondary" className="text-xs font-mono">
                                                            {f.name}
                                                            <span className="text-slate-400 ml-1">:{f.type}</span>
                                                            {f.required && <span className="text-amber-600 ml-0.5">*</span>}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Integration */}
                                <div className="border-t pt-6">
                                    <button
                                        onClick={() => setShowIntegration(!showIntegration)}
                                        className="flex items-center justify-between w-full text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Code className="h-5 w-5 text-violet-500" />
                                            <Label className="text-base cursor-pointer">API Integration</Label>
                                        </div>
                                        <ChevronRight
                                            className={cn("h-4 w-4 text-slate-400 transition-transform", showIntegration && "rotate-90")}
                                        />
                                    </button>

                                    {showIntegration && selectedPipeline.event_configs.length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            <div className="p-4 bg-violet-50 rounded-lg space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-violet-600 font-medium">ENDPOINT</p>
                                                        <p className="text-sm font-mono text-violet-900">POST /api/v1/events/ingest</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText("/api/v1/events/ingest");
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-violet-600 font-medium">AUTHENTICATION</p>
                                                    <p className="text-sm text-violet-800 mt-1">
                                                        Use an API key created in Settings → API Keys
                                                    </p>
                                                    <p className="text-xs text-violet-600 mt-1 font-mono">
                                                        X-API-Key: proj_{selectedProject?.id}_{"<your_secret>"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-slate-700">Example cURL</p>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            const firstConfig = selectedPipeline.event_configs[0];
                                                            const curl = `curl -X POST "https://api.cartnudge.ai/api/v1/events/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: proj_${selectedProject?.id}_YOUR_SECRET" \\
  -d '{
    "event_type": "${firstConfig?.event_type || "event.type"}",
    "topic": "${selectedPipeline.topic_id}",
    "data": {
      ${firstConfig?.fields.map((f) => `"${f.name}": ${f.type === "number" ? "0" : f.type === "boolean" ? "true" : `"example"`}`).join(",\n      ") || ""}
    }
  }'`;
                                                            navigator.clipboard.writeText(curl);
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4 mr-1" />
                                                        Copy
                                                    </Button>
                                                </div>
                                                {selectedPipeline.event_configs[0] && (
                                                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "https://api.cartnudge.ai/api/v1/events/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: proj_${selectedProject?.id}_YOUR_SECRET" \\
  -d '{
    "event_type": "${selectedPipeline.event_configs[0].event_type}",
    "topic": "${selectedPipeline.topic_id}",
    "data": {
      ${selectedPipeline.event_configs[0].fields.map((f) => `"${f.name}": ${f.type === "number" ? "0" : f.type === "boolean" ? "true" : `"example"`}`).join(",\n      ")}
    }
  }'`}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 pt-4 border-t flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deletePipeline(selectedPipeline.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Pipeline
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedPipeline(null)}>
                                    Close
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
