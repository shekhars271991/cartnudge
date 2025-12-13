import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Trash2,
    Loader2,
    AlertCircle,
    Play,
    Pause,
    ShoppingCart,
    Eye,
    CreditCard,
    Users,
    Settings2,
    Zap,
    Copy,
    Code,
    ChevronRight,
    ChevronDown,
    Check,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { pipelinesApi } from "@/lib/api/dataplatform";
import type { EventPipeline, EventTypeConfig } from "@/lib/api/dataplatform/types";

// Topic icons and colors
const TOPIC_ICONS: Record<string, typeof ShoppingCart> = {
    cart_events: ShoppingCart,
    page_events: Eye,
    order_events: CreditCard,
    user_events: Users,
    custom_events: Settings2,
};

const TOPIC_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
    cart_events: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" },
    page_events: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200", light: "bg-blue-50" },
    order_events: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", light: "bg-emerald-50" },
    user_events: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200", light: "bg-violet-50" },
    custom_events: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", light: "bg-slate-50" },
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
export default function DataPipelineDetail() {
    const navigate = useNavigate();
    const { id: pipelineId } = useParams<{ id: string }>();
    const { selectedProject } = useProject();

    // Pipeline state
    const [pipeline, setPipeline] = useState<EventPipeline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // Section states
    const [expandedEventTypes, setExpandedEventTypes] = useState<Set<string>>(new Set());
    const [showIntegration, setShowIntegration] = useState(true);

    // Load pipeline from API
    const loadPipeline = useCallback(async () => {
        if (!selectedProject || !pipelineId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await pipelinesApi.get(selectedProject.id, pipelineId);
            setPipeline(data);
            // Expand all event types by default
            setExpandedEventTypes(new Set(data.event_configs.map((ec) => ec.event_type)));
        } catch (err: unknown) {
            console.error("Failed to load pipeline:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to load pipeline";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject, pipelineId]);

    useEffect(() => {
        loadPipeline();
    }, [loadPipeline]);

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to view pipeline details."
            />
        );
    }

    const togglePipelineActive = async () => {
        if (!pipeline) return;

        setIsToggling(true);
        try {
            const updated = pipeline.is_active
                ? await pipelinesApi.deactivate(selectedProject.id, pipeline.id)
                : await pipelinesApi.activate(selectedProject.id, pipeline.id);
            setPipeline(updated);
        } catch (err) {
            console.error("Failed to toggle pipeline status:", err);
            alert("Failed to update pipeline status");
        } finally {
            setIsToggling(false);
        }
    };

    const deletePipeline = async () => {
        if (!pipeline) return;
        if (!confirm("Are you sure you want to delete this pipeline? This action cannot be undone.")) return;

        setIsDeleting(true);
        try {
            await pipelinesApi.delete(selectedProject.id, pipeline.id);
            navigate("/data-pipelines");
        } catch (err) {
            console.error("Failed to delete pipeline:", err);
            alert("Failed to delete pipeline");
            setIsDeleting(false);
        }
    };

    const toggleEventType = (eventType: string) => {
        setExpandedEventTypes((prev) => {
            const next = new Set(prev);
            if (next.has(eventType)) {
                next.delete(eventType);
            } else {
                next.add(eventType);
            }
            return next;
        });
    };

    const handleCopy = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error || !pipeline) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-slate-600">{error || "Pipeline not found"}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/data-pipelines")}>
                        Back to Pipelines
                    </Button>
                </div>
            </div>
        );
    }

    const TopicIcon = TOPIC_ICONS[pipeline.topic_id] || Zap;
    const colors = TOPIC_COLORS[pipeline.topic_id] || TOPIC_COLORS.custom_events;
    const topicName = TOPIC_NAMES[pipeline.topic_id] || "Custom";

    return (
        <div className="space-y-6 pb-8">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/data-pipelines")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Pipelines
                </Button>
            </div>

            {/* Pipeline Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center", colors.bg)}>
                            <TopicIcon className={cn("h-7 w-7", colors.text)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">{pipeline.display_name}</h1>
                                {pipeline.is_active ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-500">
                                        Inactive
                                    </Badge>
                                )}
                            </div>
                            <p className="text-slate-500 mb-3">{pipeline.description}</p>
                            <div className="flex items-center gap-3">
                                <span className={cn("px-3 py-1 rounded-full text-sm font-medium", colors.bg, colors.text)}>
                                    {topicName}
                                </span>
                                <span className="text-sm text-slate-400">
                                    Created {new Date(pipeline.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={pipeline.is_active ? "outline" : "default"}
                            onClick={togglePipelineActive}
                            disabled={isToggling}
                            className={cn(
                                pipeline.is_active
                                    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                            )}
                        >
                            {isToggling ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : pipeline.is_active ? (
                                <Pause className="h-4 w-4 mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            {pipeline.is_active ? "Deactivate" : "Activate"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-5">
                    <p className="text-3xl font-bold text-slate-900">{pipeline.events_count.toLocaleString()}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Events Received</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <p className="text-3xl font-bold text-slate-900">{pipeline.event_configs.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Event Types</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <p className="text-3xl font-bold text-slate-900">
                        {pipeline.event_configs.reduce((acc, ec) => acc + ec.fields.length, 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Total Fields</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <p className="text-3xl font-bold text-slate-900">
                        {pipeline.event_configs.filter((ec) => ec.fields.some((f) => f.required)).length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Required Fields</p>
                </div>
            </div>

            {/* Event Types Section */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Event Types & Fields</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure which events this pipeline accepts and their data schema
                    </p>
                </div>
                <div className="divide-y divide-slate-100">
                    {pipeline.event_configs.map((config: EventTypeConfig) => {
                        const isExpanded = expandedEventTypes.has(config.event_type);
                        return (
                            <div key={config.event_type}>
                                {/* Event Type Header */}
                                <div
                                    className={cn(
                                        "px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
                                        isExpanded && colors.light
                                    )}
                                    onClick={() => toggleEventType(config.event_type)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                            <Zap className={cn("h-5 w-5", colors.text)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border">
                                                    {config.event_type}
                                                </code>
                                                <span className="text-slate-500">{config.display_name}</span>
                                            </div>
                                            {config.description && (
                                                <p className="text-sm text-slate-400 mt-0.5">{config.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-xs">
                                            {config.fields.length} fields
                                        </Badge>
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Event Type Fields */}
                                {isExpanded && (
                                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                <div className="col-span-3">Field Name</div>
                                                <div className="col-span-2">Type</div>
                                                <div className="col-span-5">Description</div>
                                                <div className="col-span-2 text-center">Required</div>
                                            </div>
                                            {/* Table Body */}
                                            <div className="divide-y divide-slate-100">
                                                {config.fields.map((field) => (
                                                    <div
                                                        key={field.id || field.name}
                                                        className="grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-slate-50"
                                                    >
                                                        <div className="col-span-3">
                                                            <code className="font-mono text-slate-800">{field.name}</code>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <Badge variant="secondary" className="text-xs font-mono">
                                                                {field.type}
                                                            </Badge>
                                                        </div>
                                                        <div className="col-span-5 text-slate-500">
                                                            {field.description || "-"}
                                                        </div>
                                                        <div className="col-span-2 text-center">
                                                            {field.required ? (
                                                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                                                                    Required
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">Optional</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* API Integration Section */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                    onClick={() => setShowIntegration(!showIntegration)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Code className="h-5 w-5 text-violet-600" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-semibold text-slate-900">API Integration</h2>
                            <p className="text-sm text-slate-500">Send events to this pipeline via REST API</p>
                        </div>
                    </div>
                    {showIntegration ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                </button>

                {showIntegration && pipeline.event_configs.length > 0 && (
                    <div className="px-6 pb-6 space-y-6">
                        {/* Endpoint Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-violet-50 rounded-lg">
                                <p className="text-xs text-violet-600 font-medium uppercase tracking-wider mb-2">
                                    Endpoint
                                </p>
                                <div className="flex items-center justify-between">
                                    <code className="text-sm font-mono text-violet-900">POST /api/v1/events/ingest</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCopy("/api/v1/events/ingest", "endpoint")}
                                        className="h-8"
                                    >
                                        {copied === "endpoint" ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 bg-violet-50 rounded-lg">
                                <p className="text-xs text-violet-600 font-medium uppercase tracking-wider mb-2">
                                    Authentication
                                </p>
                                <code className="text-sm font-mono text-violet-900 block">
                                    X-API-Key: proj_{selectedProject.id}_{"<secret>"}
                                </code>
                                <p className="text-xs text-violet-600 mt-2">
                                    Create API keys in{" "}
                                    <button
                                        onClick={() => navigate("/settings")}
                                        className="underline hover:text-violet-800"
                                    >
                                        Settings → API Keys
                                    </button>
                                </p>
                            </div>
                        </div>

                        {/* cURL Examples for each event type */}
                        <div className="space-y-4">
                            <Label className="text-base">Example Requests</Label>
                            {pipeline.event_configs.map((config) => (
                                <div key={config.event_type} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                {config.event_type}
                                            </code>
                                            <span className="text-sm text-slate-500">{config.display_name}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const curl = `curl -X POST "http://localhost:8010/api/v1/events/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: proj_${selectedProject.id}_YOUR_SECRET" \\
  -d '{
    "event_type": "${config.event_type}",
    "topic": "${pipeline.topic_id}",
    "data": {
      ${config.fields.map((f) => `"${f.name}": ${f.type === "number" ? "0" : f.type === "boolean" ? "true" : `"example"`}`).join(",\n      ")}
    }
  }'`;
                                                handleCopy(curl, `curl-${config.event_type}`);
                                            }}
                                            className="h-7 text-xs"
                                        >
                                            {copied === `curl-${config.event_type}` ? (
                                                <>
                                                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy cURL
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
                                        <code>
{`curl -X POST "http://localhost:8010/api/v1/events/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: proj_${selectedProject.id}_YOUR_SECRET" \\
  -d '{
    "event_type": "${config.event_type}",
    "topic": "${pipeline.topic_id}",
    "data": {
      ${config.fields.map((f) => `"${f.name}": ${f.type === "number" ? "0" : f.type === "boolean" ? "true" : `"example"`}`).join(",\n      ")}
    }
  }'`}
                                        </code>
                                    </pre>
                                </div>
                            ))}
                        </div>

                        {/* Postman Link */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-orange-100 flex items-center justify-center">
                                    <ExternalLink className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Postman Collection</p>
                                    <p className="text-sm text-slate-500">Import our complete API collection for testing</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href="/postman_collection.json" download>
                                    Download Collection
                                </a>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                    <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                    <p className="text-sm text-red-600 mt-1">Irreversible and destructive actions</p>
                </div>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900">Delete this pipeline</p>
                            <p className="text-sm text-slate-500">
                                Once deleted, all configuration will be permanently removed. Events already ingested will remain in
                                storage.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={deletePipeline}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete Pipeline
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

