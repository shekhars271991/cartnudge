import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Search,
    ShoppingCart,
    Monitor,
    Receipt,
    Tag,
    CreditCard,
    Package as PackageIcon,
    Truck,
    Clock,
    Megaphone,
    Shield,
    Bell,
    Zap,
    Circle,
    Copy,
    Check,
    Code,
    Activity,
    Database,
    ChevronRight,
    Pause,
    Plus,
    Trash2,
    Settings,
    BarChart3,
    TrendingUp,
    AlertCircle,
    Rocket,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineTemplate, PipelineEvent } from "./types";

const iconMap: Record<string, React.ElementType> = {
    Search,
    ShoppingCart,
    Monitor,
    Receipt,
    Tag,
    CreditCard,
    Package: PackageIcon,
    Truck,
    Clock,
    Megaphone,
    Shield,
    Bell,
    Zap,
};

interface EventField {
    name: string;
    type: "string" | "number" | "boolean" | "timestamp" | "object";
    required: boolean;
    description: string;
}

interface PipelineConfigDrawerProps {
    pipeline: PipelineTemplate | null;
    open: boolean;
    onClose: () => void;
    onSave: (pipeline: PipelineTemplate) => void;
}

export function PipelineConfigDrawer({
    pipeline,
    open,
    onClose,
    onSave,
}: PipelineConfigDrawerProps) {
    const [mode, setMode] = useState<"stats" | "configure">("stats");
    const [activeTab, setActiveTab] = useState<"events" | "features" | "integration">("events");
    const [events, setEvents] = useState<PipelineEvent[]>([]);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [isAddingField, setIsAddingField] = useState<string | null>(null);
    const [newEventName, setNewEventName] = useState("");
    const [newField, setNewField] = useState<EventField>({
        name: "",
        type: "string",
        required: false,
        description: "",
    });
    const [savedToBucket, setSavedToBucket] = useState(false);

    // Reset state when pipeline changes
    useEffect(() => {
        if (pipeline && open) {
            setEvents([...pipeline.events]);
            // Show configure mode if not active, stats mode if active
            setMode(pipeline.status === "active" ? "stats" : "configure");
            setActiveTab("events");
            setIsAddingEvent(false);
            setIsAddingField(null);
            setSavedToBucket(false);
        }
    }, [pipeline?.id, open]);

    if (!pipeline) return null;

    const Icon = iconMap[pipeline.icon] || Circle;
    const isActive = pipeline.status === "active";
    const webhookEndpoint = `https://api.cartnudge.ai/v1/events/${pipeline.id}`;
    const apiKey = "sk_live_xxxxxxxxxxxxxxxx";

    const enabledEvents = events.filter((e) => e.enabled).length;

    const handleCopy = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedSnippet(type);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const addEventType = () => {
        if (!newEventName.trim()) return;
        
        const eventId = newEventName.trim().toLowerCase().replace(/\s+/g, "_");
        const newEvent: PipelineEvent = {
            id: eventId,
            name: eventId,
            description: `${newEventName} event`,
            enabled: true,
            fields: [
                { name: "user_id", type: "string", required: true, description: "Unique user identifier" },
                { name: "timestamp", type: "timestamp", required: true, description: "Event timestamp" },
            ],
        };
        
        setEvents((prev) => [...prev, newEvent]);
        setNewEventName("");
        setIsAddingEvent(false);
    };

    const removeEvent = (eventId: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const addFieldToEvent = (eventId: string) => {
        if (!newField.name.trim()) return;
        
        setEvents((prev) =>
            prev.map((e) => {
                if (e.id === eventId) {
                    return {
                        ...e,
                        fields: [
                            ...e.fields,
                            {
                                ...newField,
                                name: newField.name.trim().toLowerCase().replace(/\s+/g, "_"),
                            },
                        ],
                    };
                }
                return e;
            })
        );
        
        setNewField({
            name: "",
            type: "string",
            required: false,
            description: "",
        });
        setIsAddingField(null);
    };

    const removeFieldFromEvent = (eventId: string, fieldName: string) => {
        setEvents((prev) =>
            prev.map((e) => {
                if (e.id === eventId) {
                    return {
                        ...e,
                        fields: e.fields.filter((f) => f.name !== fieldName),
                    };
                }
                return e;
            })
        );
    };

    const generatePayloadExample = (event: PipelineEvent) => {
        const payload: Record<string, unknown> = {
            event: event.name,
        };
        
        event.fields.forEach((field) => {
            switch (field.type) {
                case "string":
                    payload[field.name] = field.name === "user_id" 
                        ? "user_123" 
                        : field.name.includes("id") 
                            ? `${field.name.replace("_id", "")}_456`
                            : `example_${field.name}`;
                    break;
                case "number":
                    payload[field.name] = field.name.includes("price") || field.name.includes("value") 
                        ? 99.99 
                        : 100;
                    break;
                case "timestamp":
                    payload[field.name] = Date.now();
                    break;
                case "boolean":
                    payload[field.name] = true;
                    break;
                case "object":
                    payload[field.name] = { key: "value" };
                    break;
            }
        });

        return JSON.stringify(payload, null, 2);
    };

    const handleSaveChanges = () => {
        // Save changes to deployment bucket (not directly deploying)
        onSave({
            ...pipeline,
            events,
            webhookEndpoint,
        });
        setSavedToBucket(true);
        setTimeout(() => setSavedToBucket(false), 5000);
    };

    const handlePauseAndEdit = () => {
        setMode("configure");
    };

    const handleDeactivate = () => {
        onSave({
            ...pipeline,
            status: "inactive",
            events,
        });
        onClose();
    };

    // STATS VIEW - When pipeline is active
    const renderStatsView = () => (
        <div className="p-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">Events Today</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {pipeline.eventsToday?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +12.5% from yesterday
                    </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-medium text-slate-600">Success Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">98.5%</p>
                    <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
                </div>
            </div>

            {/* Event Type Stats */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Event Types</h4>
                <div className="space-y-2">
                    {events.filter(e => e.enabled).map((event) => (
                        <div
                            key={event.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-lg"
                        >
                    <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <div>
                                    <code className="text-sm font-mono font-medium text-slate-800">
                                        {event.name}
                                    </code>
                                    <p className="text-xs text-slate-500">{event.fields.length} fields</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                    {Math.floor(Math.random() * 5000 + 500).toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">events</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Activity</h4>
                <div className="space-y-2">
                    {[
                        { time: "2 mins ago", event: events[0]?.name || "page_view", status: "success" },
                        { time: "3 mins ago", event: events[1]?.name || events[0]?.name || "product_view", status: "success" },
                        { time: "5 mins ago", event: events[0]?.name || "page_view", status: "success" },
                        { time: "8 mins ago", event: events[0]?.name || "page_view", status: "error" },
                        { time: "10 mins ago", event: events[1]?.name || events[0]?.name || "search", status: "success" },
                    ].map((activity, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <div className={cn(
                                "h-2 w-2 rounded-full",
                                activity.status === "success" ? "bg-emerald-500" : "bg-red-500"
                            )} />
                            <code className="text-xs font-mono text-slate-700">{activity.event}</code>
                            <span className="flex-1" />
                            <span className="text-xs text-slate-400">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
                    </div>
    );

    // CONFIGURE VIEW - When setting up or editing
    const renderConfigureView = () => (
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex-1"
        >
            <div className="px-6 pt-4 border-b border-slate-100">
                <TabsList className="bg-slate-100/80 p-1">
                    <TabsTrigger value="events" className="gap-2 text-sm">
                        <Activity className="h-4 w-4" />
                        Event Types
                        <Badge variant="secondary" className="ml-1 bg-white">
                            {events.length}
                        </Badge>
                            </TabsTrigger>
                    <TabsTrigger value="features" className="gap-2 text-sm">
                        <Database className="h-4 w-4" />
                        Fields
                            </TabsTrigger>
                    <TabsTrigger value="integration" className="gap-2 text-sm">
                                <Code className="h-4 w-4" />
                                Integration
                            </TabsTrigger>
                        </TabsList>
            </div>

            {/* Event Types Tab - Create/Delete Events Only */}
            <TabsContent value="events" className="p-6 pt-4 m-0">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Define the event types you want to track.
                        </p>
                        {!isAddingEvent && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingEvent(true)}
                                className="gap-1 h-8"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Event Type
                            </Button>
                        )}
                    </div>

                    {/* Add Event Form */}
                    {isAddingEvent && (
                        <div className="p-4 rounded-lg border border-dashed border-blue-300 bg-blue-50/30">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Event Name
                                    </Label>
                                    <Input
                                        placeholder="e.g., page_view, add_to_cart"
                                        value={newEventName}
                                        onChange={(e) => setNewEventName(e.target.value)}
                                        className="h-9 font-mono text-sm"
                                        onKeyDown={(e) => e.key === "Enter" && addEventType()}
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsAddingEvent(false);
                                            setNewEventName("");
                                        }}
                                        className="h-9"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={addEventType}
                                        disabled={!newEventName.trim()}
                                        className="h-9 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Event Types List - Simple View */}
                    <div className="space-y-2">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border flex items-center justify-center">
                                        <Activity className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <code className="text-sm font-mono font-semibold text-slate-800">
                                            {event.name}
                                        </code>
                                        <p className="text-xs text-slate-500">
                                            {event.fields.length} fields · Go to Fields tab to configure
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEvent(event.id)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        {events.length === 0 && !isAddingEvent && (
                            <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
                                <Activity className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm text-slate-500 mb-1">No event types defined</p>
                                <p className="text-xs text-slate-400 mb-4">
                                    Add event types to start tracking user actions
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAddingEvent(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Event Type
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>

            {/* Fields Tab - Add/Remove Fields */}
            <TabsContent value="features" className="p-6 pt-4 m-0">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Configure metadata fields for each event type. These map to the webhook POST request body.
                    </p>

                    {events.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
                            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm text-slate-500">Define event types first</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Go to the Event Types tab to create events
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {events.map((event) => (
                                <div key={event.id} className="border rounded-lg overflow-hidden">
                                    {/* Event Header */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono font-semibold text-slate-800">
                                                {event.name}
                                            </code>
                                            <Badge variant="secondary" className="text-xs">
                                                {event.fields.length} fields
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsAddingField(isAddingField === event.id ? null : event.id)}
                                            className="h-7 text-xs gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Field
                                        </Button>
                                    </div>

                                    {/* Fields List */}
                                    <div className="p-3 space-y-2">
                                        {event.fields.map((field) => (
                                            <div
                                                key={field.name}
                                                className="flex items-center justify-between p-3 rounded-lg bg-white border"
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <code className="text-sm font-mono text-slate-700 min-w-[120px]">
                                                        {field.name}
                                                    </code>
                                                    <Badge variant="outline" className="text-xs">
                                                        {field.type}
                                                    </Badge>
                                                    {field.required && (
                                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                            required
                                                        </Badge>
                                                    )}
                                                    {field.description && (
                                                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                                            {field.description}
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFieldFromEvent(event.id, field.name)}
                                                    className="h-7 w-7 p-0 text-slate-300 hover:text-red-500"
                                                    disabled={field.name === "user_id" || field.name === "timestamp"}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}

                                        {/* Add Field Form */}
                                        {isAddingField === event.id && (
                                            <div className="p-4 rounded-lg border border-dashed border-blue-300 bg-blue-50/30 mt-2">
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <Label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                                            Field Name
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g., product_id, category"
                                                            value={newField.name}
                                                            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                                            className="h-9 text-sm font-mono"
                                                        />
                                                </div>
                                                <div>
                                                        <Label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                                            Data Type
                                                        </Label>
                                                        <Select
                                                            value={newField.type}
                                                            onValueChange={(v) => setNewField({ ...newField, type: v as EventField["type"] })}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="string">string</SelectItem>
                                                                <SelectItem value="number">number</SelectItem>
                                                                <SelectItem value="boolean">boolean</SelectItem>
                                                                <SelectItem value="timestamp">timestamp</SelectItem>
                                                                <SelectItem value="object">object</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div>
                                                        <Label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                                            Required?
                                                        </Label>
                                                        <Select
                                                            value={newField.required ? "yes" : "no"}
                                                            onValueChange={(v) => setNewField({ ...newField, required: v === "yes" })}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="no">Optional</SelectItem>
                                                                <SelectItem value="yes">Required</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                            </div>
                                                    <div>
                                                        <Label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                                            Description
                                                        </Label>
                                                        <Input
                                                            placeholder="What this field represents"
                                                            value={newField.description}
                                                            onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                                                            className="h-9 text-sm"
                                                        />
                                            </div>
                                        </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setIsAddingField(null)}
                                                        className="h-8"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => addFieldToEvent(event.id)}
                                                        disabled={!newField.name.trim()}
                                                        className="h-8 bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add Field
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                                    </div>
                                                        ))}
                                                    </div>
                    )}
                            </div>
                        </TabsContent>

                        {/* Integration Tab */}
            <TabsContent value="integration" className="p-6 pt-4 m-0">
                <div className="space-y-6">
                    {events.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
                            <Code className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm text-slate-500">Define event types first</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Webhook details will appear after you create events
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Webhook Endpoint */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                    Webhook Endpoint
                                </h4>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        POST
                                    </Badge>
                                    <code className="text-sm font-mono text-slate-700 flex-1 truncate">
                                        {webhookEndpoint}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopy(webhookEndpoint, "endpoint")}
                                        className="h-8 shrink-0"
                                    >
                                        {copiedSnippet === "endpoint" ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                    API Key
                                </h4>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                                    <code className="text-sm font-mono text-slate-700 flex-1">
                                        {apiKey}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopy(apiKey, "apikey")}
                                        className="h-8 shrink-0"
                                    >
                                        {copiedSnippet === "apikey" ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Request Payloads */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                    Request Payload Examples
                                </h4>
                                <p className="text-sm text-slate-500 mb-3">
                                    Send events as JSON with the metadata fields you defined:
                                </p>
                                <div className="space-y-3">
                                    {events.map((event) => {
                                        const payload = generatePayloadExample(event);
                                        return (
                                            <div key={event.id}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <code className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                        {event.name}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => handleCopy(payload, `payload-${event.id}`)}
                                                    >
                                                        {copiedSnippet === `payload-${event.id}` ? (
                                                            <>
                                                                <Check className="h-3 w-3 mr-1 text-emerald-500" />
                                                                Copied
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-3 w-3 mr-1" />
                                                                Copy
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                                                    {payload}
                                                </pre>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* cURL Example */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                    cURL Example
                                </h4>
                                {events[0] && (
                                                    <div className="relative">
                                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`curl -X POST "${webhookEndpoint}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${generatePayloadExample(events[0])}'`}
                                                        </pre>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                            onClick={() => handleCopy(
                                                `curl -X POST "${webhookEndpoint}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${generatePayloadExample(events[0])}'`,
                                                "curl"
                                            )}
                                        >
                                            {copiedSnippet === "curl" ? (
                                                                <Check className="h-4 w-4" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                {/* Header */}
                <SheetHeader className="p-6 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                isActive
                                    ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100"
                                    : "bg-slate-100 border border-slate-200"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-6 w-6",
                                    isActive ? "text-emerald-600" : "text-slate-500"
                                )}
                            />
                                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <SheetTitle className="text-xl">{pipeline.name}</SheetTitle>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        isActive
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                    )}
                                >
                                    {isActive ? "Active" : mode === "configure" ? "Configuring" : "Inactive"}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                {pipeline.description}
                            </p>
                        </div>
                </div>

                    {/* Mode Toggle for Active Pipelines */}
                    {isActive && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <Button
                                variant={mode === "stats" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setMode("stats")}
                                className={cn(
                                    "gap-1.5",
                                    mode === "stats" && "bg-slate-900"
                                )}
                            >
                                <BarChart3 className="h-4 w-4" />
                                Stats
                            </Button>
                            <Button
                                variant={mode === "configure" ? "default" : "outline"}
                                size="sm"
                                onClick={handlePauseAndEdit}
                                className={cn(
                                    "gap-1.5",
                                    mode === "configure" && "bg-amber-600 hover:bg-amber-700"
                                )}
                            >
                                <Settings className="h-4 w-4" />
                                Edit Configuration
                            </Button>
                        </div>
                    )}
                </SheetHeader>

                {/* Content */}
                {mode === "stats" ? renderStatsView() : renderConfigureView()}

                {/* Saved to Bucket Success Message */}
                {savedToBucket && (
                    <div className="mx-6 mb-0 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-violet-900">
                                        Changes saved to deployment bucket
                                    </p>
                                    <p className="text-xs text-violet-600">
                                        Go to Deployments to review and deploy
                                    </p>
                                </div>
                            </div>
                            <Link to="/deployments">
                                <Button size="sm" variant="outline" className="gap-1.5 text-violet-700 border-violet-300 hover:bg-violet-100">
                                    <Rocket className="h-3.5 w-3.5" />
                                    View Deployments
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                </div>
                )}

                {/* Footer Actions */}
                <div className="sticky bottom-0 p-6 border-t border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                        {isActive ? (
                            <Button
                                variant="outline"
                                onClick={handleDeactivate}
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                                <Pause className="h-4 w-4" />
                                Deactivate
                            </Button>
                        ) : (
                            <div />
                        )}
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            {events.length > 0 && mode === "configure" && (
                            <Button
                                    onClick={handleSaveChanges}
                                    className="gap-2 bg-violet-600 hover:bg-violet-700"
                            >
                                    <Rocket className="h-4 w-4" />
                                    Save to Deployment Bucket
                            </Button>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
