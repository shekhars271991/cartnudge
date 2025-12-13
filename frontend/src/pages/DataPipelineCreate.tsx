import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Plus,
    Trash2,
    Loader2,
    ArrowRight,
    ArrowLeft,
    Check,
    ChevronRight,
    ChevronDown,
    ShoppingCart,
    Eye,
    CreditCard,
    Users,
    Settings2,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import type { EventTopic, EventField, EventTypeConfig } from "@/lib/api/dataplatform/types";

// ============================================================================
// Static Event Topics Configuration (from backend event_topics.json)
// ============================================================================
const EVENT_TOPICS: EventTopic[] = [
    {
        topic_id: "cart_events",
        name: "cart_events",
        display_name: "Cart Events",
        description: "Shopping cart activity - add, remove, checkout events",
        partitions: 6,
        replication_factor: 1,
        retention_ms: 604800000,
        event_patterns: ["cart.*"],
        mapped_templates: ["cart_events"],
    },
    {
        topic_id: "page_events",
        name: "page_events",
        display_name: "Page Events",
        description: "Page views, clicks, and browsing behavior",
        partitions: 6,
        replication_factor: 1,
        retention_ms: 604800000,
        event_patterns: ["page.*"],
        mapped_templates: ["page_views"],
    },
    {
        topic_id: "order_events",
        name: "order_events",
        display_name: "Order Events",
        description: "Order creation, updates, and fulfillment events",
        partitions: 3,
        replication_factor: 1,
        retention_ms: 604800000,
        event_patterns: ["order.*"],
        mapped_templates: ["orders"],
    },
    {
        topic_id: "user_events",
        name: "user_events",
        display_name: "User Events",
        description: "User profile updates and lifecycle events",
        partitions: 3,
        replication_factor: 1,
        retention_ms: 604800000,
        event_patterns: ["user.*"],
        mapped_templates: ["users"],
    },
    {
        topic_id: "custom_events",
        name: "custom_events",
        display_name: "Custom Events",
        description: "Custom events that don't fit predefined categories",
        partitions: 3,
        replication_factor: 1,
        retention_ms: 604800000,
        event_patterns: ["custom.*"],
        mapped_templates: [],
    },
];

// Event types for each topic with their default fields
const EVENT_TYPES_CONFIG: Record<string, { value: string; label: string; description: string; defaultFields: EventField[] }[]> = {
    cart_events: [
        {
            value: "cart.add",
            label: "Cart Add",
            description: "Item added to cart",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "product_id", type: "string", required: true, description: "Product identifier" },
                { id: "f4", name: "product_name", type: "string", required: false, description: "Product name" },
                { id: "f5", name: "quantity", type: "number", required: true, description: "Quantity added" },
                { id: "f6", name: "price", type: "number", required: true, description: "Unit price" },
                { id: "f7", name: "currency", type: "string", required: false, description: "Currency code (USD, EUR)" },
            ],
        },
        {
            value: "cart.remove",
            label: "Cart Remove",
            description: "Item removed from cart",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "product_id", type: "string", required: true, description: "Product removed" },
                { id: "f4", name: "quantity", type: "number", required: true, description: "Quantity removed" },
            ],
        },
        {
            value: "cart.update",
            label: "Cart Update",
            description: "Cart quantity changed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "product_id", type: "string", required: true, description: "Product updated" },
                { id: "f4", name: "old_quantity", type: "number", required: false, description: "Previous quantity" },
                { id: "f5", name: "new_quantity", type: "number", required: true, description: "New quantity" },
            ],
        },
        {
            value: "cart.checkout",
            label: "Cart Checkout",
            description: "Checkout initiated",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "cart_total", type: "number", required: true, description: "Total cart value" },
                { id: "f4", name: "item_count", type: "number", required: true, description: "Number of items" },
                { id: "f5", name: "currency", type: "string", required: false, description: "Currency code" },
            ],
        },
    ],
    page_events: [
        {
            value: "page.view",
            label: "Page View",
            description: "Page was viewed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "page_url", type: "string", required: true, description: "Page URL" },
                { id: "f4", name: "page_title", type: "string", required: false, description: "Page title" },
                { id: "f5", name: "page_type", type: "string", required: false, description: "Page type (home, product, category)" },
                { id: "f6", name: "referrer", type: "string", required: false, description: "Referrer URL" },
                { id: "f7", name: "product_id", type: "string", required: false, description: "Product ID (for product pages)" },
            ],
        },
        {
            value: "page.click",
            label: "Page Click",
            description: "Element clicked",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "element_id", type: "string", required: false, description: "Clicked element ID" },
                { id: "f4", name: "element_type", type: "string", required: false, description: "Element type (button, link, etc)" },
                { id: "f5", name: "page_url", type: "string", required: true, description: "Current page URL" },
            ],
        },
        {
            value: "page.search",
            label: "Page Search",
            description: "Search performed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "search_query", type: "string", required: true, description: "Search query" },
                { id: "f4", name: "results_count", type: "number", required: false, description: "Number of results" },
            ],
        },
    ],
    order_events: [
        {
            value: "order.created",
            label: "Order Created",
            description: "New order placed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "order_id", type: "string", required: true, description: "Order identifier" },
                { id: "f3", name: "total_amount", type: "number", required: true, description: "Order total" },
                { id: "f4", name: "currency", type: "string", required: false, description: "Currency code" },
                { id: "f5", name: "status", type: "string", required: true, description: "Order status" },
                { id: "f6", name: "item_count", type: "number", required: false, description: "Number of items" },
                { id: "f7", name: "payment_method", type: "string", required: false, description: "Payment method" },
            ],
        },
        {
            value: "order.updated",
            label: "Order Updated",
            description: "Order status changed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "order_id", type: "string", required: true, description: "Order identifier" },
                { id: "f3", name: "old_status", type: "string", required: false, description: "Previous status" },
                { id: "f4", name: "new_status", type: "string", required: true, description: "New status" },
            ],
        },
        {
            value: "order.cancelled",
            label: "Order Cancelled",
            description: "Order cancelled",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "order_id", type: "string", required: true, description: "Order identifier" },
                { id: "f3", name: "cancel_reason", type: "string", required: false, description: "Cancellation reason" },
                { id: "f4", name: "refund_amount", type: "number", required: false, description: "Refund amount" },
            ],
        },
        {
            value: "order.fulfilled",
            label: "Order Fulfilled",
            description: "Order shipped/delivered",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "order_id", type: "string", required: true, description: "Order identifier" },
                { id: "f3", name: "tracking_number", type: "string", required: false, description: "Tracking number" },
                { id: "f4", name: "carrier", type: "string", required: false, description: "Shipping carrier" },
            ],
        },
    ],
    user_events: [
        {
            value: "user.signup",
            label: "User Signup",
            description: "New user registered",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "email", type: "string", required: false, description: "User email" },
                { id: "f3", name: "name", type: "string", required: false, description: "User name" },
                { id: "f4", name: "signup_source", type: "string", required: false, description: "Registration source" },
            ],
        },
        {
            value: "user.login",
            label: "User Login",
            description: "User logged in",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "session_id", type: "string", required: false, description: "Session identifier" },
                { id: "f3", name: "login_method", type: "string", required: false, description: "Login method (email, social)" },
            ],
        },
        {
            value: "user.updated",
            label: "Profile Updated",
            description: "User profile changed",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "updated_fields", type: "array", required: false, description: "Fields that were updated" },
            ],
        },
    ],
    custom_events: [
        {
            value: "custom.event",
            label: "Custom Event",
            description: "Define your own event type",
            defaultFields: [
                { id: "f1", name: "user_id", type: "string", required: true, description: "User identifier" },
                { id: "f2", name: "event_name", type: "string", required: true, description: "Custom event name" },
                { id: "f3", name: "event_data", type: "object", required: false, description: "Custom event data" },
            ],
        },
    ],
};

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

// Wizard steps
type WizardStep = "type" | "events" | "fields" | "review";

// ============================================================================
// Field Row Component
// ============================================================================
interface FieldRowProps {
    field: EventField;
    onUpdate: (field: EventField) => void;
    onRemove: () => void;
    canRemove: boolean;
}

function FieldRow({ field, onUpdate, onRemove, canRemove }: FieldRowProps) {
    return (
        <div className="grid grid-cols-12 gap-2 items-center p-2 bg-white rounded border border-slate-100">
            <div className="col-span-3">
                <Input
                    value={field.name}
                    onChange={(e) => onUpdate({ ...field, name: e.target.value })}
                    placeholder="field_name"
                    className="font-mono text-sm h-8"
                />
            </div>
            <div className="col-span-2">
                <select
                    value={field.type}
                    onChange={(e) => onUpdate({ ...field, type: e.target.value as EventField["type"] })}
                    className="w-full h-8 px-2 rounded border border-slate-200 text-sm bg-white"
                >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                </select>
            </div>
            <div className="col-span-4">
                <Input
                    value={field.description || ""}
                    onChange={(e) => onUpdate({ ...field, description: e.target.value })}
                    placeholder="Description"
                    className="text-sm h-8"
                />
            </div>
            <div className="col-span-2 flex items-center">
                <label className="flex items-center gap-1 text-xs">
                    <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => onUpdate({ ...field, required: checked })}
                        className="scale-75"
                    />
                    Required
                </label>
            </div>
            <div className="col-span-1 flex justify-end">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                    onClick={onRemove}
                    disabled={!canRemove}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// Event Type Card with Expandable Fields
// ============================================================================
interface EventTypeCardProps {
    eventType: string;
    config: EventTypeConfig;
    colors: { bg: string; text: string; border: string; light: string };
    onUpdate: (config: EventTypeConfig) => void;
    onRemove: () => void;
}

function EventTypeCard({ eventType, config, colors, onUpdate, onRemove }: EventTypeCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleUpdateField = (index: number, field: EventField) => {
        const updated = [...config.fields];
        updated[index] = field;
        onUpdate({ ...config, fields: updated });
    };

    const handleRemoveField = (index: number) => {
        onUpdate({ ...config, fields: config.fields.filter((_, i) => i !== index) });
    };

    const handleAddField = () => {
        onUpdate({
            ...config,
            fields: [
                ...config.fields,
                { id: `f${Date.now()}`, name: "", type: "string", required: false, description: "" },
            ],
        });
    };

    return (
        <div className={cn("rounded-xl border-2 overflow-hidden", colors.border)}>
            {/* Header */}
            <div
                className={cn("p-4 flex items-center justify-between cursor-pointer", colors.light)}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colors.bg)}>
                        <Zap className={cn("h-4 w-4", colors.text)} />
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-900">{config.display_name}</h4>
                        <p className="text-xs text-slate-500">{config.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {config.fields.length} fields
                    </Badge>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Fields */}
            {isExpanded && (
                <div className="p-4 bg-white space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 px-2">
                        <div className="col-span-3">Field Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-2">Options</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Field rows */}
                    <div className="space-y-1">
                        {config.fields.map((field, index) => (
                            <FieldRow
                                key={field.id || index}
                                field={field}
                                onUpdate={(f) => handleUpdateField(index, f)}
                                onRemove={() => handleRemoveField(index)}
                                canRemove={config.fields.length > 1}
                            />
                        ))}
                    </div>

                    {/* Add field button */}
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-slate-500" onClick={handleAddField}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Field
                    </Button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================
export default function DataPipelineCreate() {
    const navigate = useNavigate();
    const { selectedProject } = useProject();

    // Wizard state
    const [step, setStep] = useState<WizardStep>("type");
    const [isSaving, setIsSaving] = useState(false);

    // Pipeline data
    const [topicId, setTopicId] = useState("");
    const [pipelineName, setPipelineName] = useState("");
    const [pipelineDisplayName, setPipelineDisplayName] = useState("");
    const [pipelineDescription, setPipelineDescription] = useState("");
    const [eventConfigs, setEventConfigs] = useState<EventTypeConfig[]>([]);

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to configure your event pipelines."
            />
        );
    }

    const selectedTopic = EVENT_TOPICS.find((t) => t.topic_id === topicId);
    const availableEventTypes = EVENT_TYPES_CONFIG[topicId] || [];
    const colors = TOPIC_COLORS[topicId] || TOPIC_COLORS.custom_events;
    const TopicIcon = TOPIC_ICONS[topicId] || Zap;

    // Handlers
    const handleSelectTopic = (id: string) => {
        const topic = EVENT_TOPICS.find((t) => t.topic_id === id);
        setTopicId(id);
        setPipelineDisplayName(topic?.display_name || "");
        setPipelineName(id.replace(/_events$/, "_pipeline"));
        setPipelineDescription(topic?.description || "");
        setEventConfigs([]);
    };

    const handleToggleEventType = (eventTypeValue: string) => {
        const existing = eventConfigs.find((ec) => ec.event_type === eventTypeValue);
        if (existing) {
            setEventConfigs(eventConfigs.filter((ec) => ec.event_type !== eventTypeValue));
        } else {
            const eventTypeConfig = availableEventTypes.find((et) => et.value === eventTypeValue);
            if (eventTypeConfig) {
                setEventConfigs([
                    ...eventConfigs,
                    {
                        event_type: eventTypeValue,
                        display_name: eventTypeConfig.label,
                        description: eventTypeConfig.description,
                        fields: eventTypeConfig.defaultFields.map((f, i) => ({ ...f, id: `f${Date.now()}_${i}` })),
                    },
                ]);
            }
        }
    };

    const handleUpdateEventConfig = (eventType: string, config: EventTypeConfig) => {
        setEventConfigs(eventConfigs.map((ec) => (ec.event_type === eventType ? config : ec)));
    };

    const handleRemoveEventConfig = (eventType: string) => {
        setEventConfigs(eventConfigs.filter((ec) => ec.event_type !== eventType));
    };

    const handleCreate = async () => {
        setIsSaving(true);
        try {
            // Simulated API call - in production, this would save to backend
            await new Promise((resolve) => setTimeout(resolve, 1000));
            navigate("/data-pipelines");
        } catch (err) {
            console.error("Failed to create pipeline:", err);
            alert("Failed to create pipeline");
        } finally {
            setIsSaving(false);
        }
    };

    // Step validation
    const canProceedFromType = !!topicId;
    const canProceedFromEvents = eventConfigs.length > 0;
    const canProceedFromFields = eventConfigs.every((ec) => ec.fields.length > 0 && ec.fields.every((f) => f.name.trim()));

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate("/data-pipelines")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Pipelines
                </Button>
            </div>

            {/* Progress indicator */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h1 className="text-2xl font-bold text-slate-900">Create Event Pipeline</h1>
                </div>
                <div className="flex items-center gap-2">
                    {(["type", "events", "fields", "review"] as WizardStep[]).map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                    step === s
                                        ? "bg-blue-100 text-blue-700"
                                        : (["type", "events", "fields", "review"] as WizardStep[]).indexOf(step) > i
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-100 text-slate-500"
                                )}
                            >
                                <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs">
                                    {i + 1}
                                </span>
                                {s === "type" && "Pipeline Type"}
                                {s === "events" && "Event Types"}
                                {s === "fields" && "Configure Fields"}
                                {s === "review" && "Review"}
                            </div>
                            {i < 3 && <ChevronRight className="h-4 w-4 text-slate-300 mx-2" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                {/* Step 1: Choose Type */}
                {step === "type" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-2">Choose Pipeline Type</h2>
                            <p className="text-slate-500">Select the type of events this pipeline will handle</p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {EVENT_TOPICS.filter((t) => t.topic_id !== "dlq_events").map((topic) => {
                                const Icon = TOPIC_ICONS[topic.topic_id] || Zap;
                                const topicColors = TOPIC_COLORS[topic.topic_id] || TOPIC_COLORS.custom_events;
                                const isSelected = topicId === topic.topic_id;

                                return (
                                    <div
                                        key={topic.topic_id}
                                        onClick={() => handleSelectTopic(topic.topic_id)}
                                        className={cn(
                                            "p-5 rounded-xl border-2 cursor-pointer transition-all",
                                            isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", topicColors.bg)}>
                                                <Icon className={cn("h-6 w-6", topicColors.text)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900">{topic.display_name}</h3>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{topic.description}</p>
                                                <div className="mt-2 text-xs text-slate-400">
                                                    {(EVENT_TYPES_CONFIG[topic.topic_id] || []).length} event types available
                                                </div>
                                            </div>
                                            {isSelected && <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Event Types */}
                {step === "events" && selectedTopic && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                <TopicIcon className={cn("h-5 w-5", colors.text)} />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">{selectedTopic.display_name}</h3>
                                <p className="text-sm text-slate-500">{selectedTopic.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Pipeline Name</Label>
                                <Input
                                    value={pipelineDisplayName}
                                    onChange={(e) => {
                                        setPipelineDisplayName(e.target.value);
                                        setPipelineName(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                                    }}
                                    placeholder="e.g., Cart Events Pipeline"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label>Internal Name</Label>
                                <Input
                                    value={pipelineName}
                                    onChange={(e) => setPipelineName(e.target.value)}
                                    placeholder="e.g., cart_pipeline"
                                    className="mt-1.5 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={pipelineDescription}
                                onChange={(e) => setPipelineDescription(e.target.value)}
                                placeholder="What data will this pipeline handle?"
                                className="mt-1.5"
                                rows={2}
                            />
                        </div>

                        <div>
                            <Label className="mb-3 block">Select Event Types to Track</Label>
                            <p className="text-sm text-slate-500 mb-4">
                                Each event type will have its own set of fields that you can customize in the next step
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {availableEventTypes.map((eventType) => {
                                    const isSelected = eventConfigs.some((ec) => ec.event_type === eventType.value);
                                    return (
                                        <div
                                            key={eventType.value}
                                            onClick={() => handleToggleEventType(eventType.value)}
                                            className={cn(
                                                "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                                isSelected ? cn("border-blue-500", colors.light) : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={cn(
                                                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                            isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                                                        )}
                                                    >
                                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{eventType.label}</p>
                                                        <p className="text-xs text-slate-500">{eventType.description}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {eventType.defaultFields.length} fields
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {eventConfigs.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>{eventConfigs.length} event type{eventConfigs.length > 1 ? "s" : ""} selected.</strong> You'll
                                    configure the fields for each in the next step.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Configure Fields */}
                {step === "fields" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-2">Configure Event Fields</h2>
                            <p className="text-slate-500">Define the data fields for each event type</p>
                        </div>

                        <div className="space-y-4">
                            {eventConfigs.map((config) => (
                                <EventTypeCard
                                    key={config.event_type}
                                    eventType={config.event_type}
                                    config={config}
                                    colors={colors}
                                    onUpdate={(updated) => handleUpdateEventConfig(config.event_type, updated)}
                                    onRemove={() => handleRemoveEventConfig(config.event_type)}
                                />
                            ))}
                        </div>

                        {eventConfigs.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <p>No event types selected. Go back to select event types.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Review */}
                {step === "review" && selectedTopic && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-2">Review Pipeline Configuration</h2>
                            <p className="text-slate-500">Verify your settings before creating the pipeline</p>
                        </div>

                        {/* Summary */}
                        <div className="p-6 bg-slate-50 rounded-xl">
                            <div className="flex items-start gap-4">
                                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", colors.bg)}>
                                    <TopicIcon className={cn("h-6 w-6", colors.text)} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900">{pipelineDisplayName}</h3>
                                    <p className="text-slate-500">{pipelineDescription}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <Badge variant="outline">{selectedTopic.display_name}</Badge>
                                        <span className="text-sm text-slate-500">{eventConfigs.length} event types</span>
                                        <span className="text-sm text-slate-500">
                                            {eventConfigs.reduce((acc, ec) => acc + ec.fields.length, 0)} total fields
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Event Types Summary */}
                        <div>
                            <Label className="text-base mb-3 block">Event Types</Label>
                            <div className="space-y-3">
                                {eventConfigs.map((config) => (
                                    <div key={config.event_type} className="p-4 bg-white border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
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
                                                    {f.required && <span className="text-amber-600 ml-0.5">*</span>}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <p className="text-sm text-emerald-800">
                                <strong>Ready to create.</strong> Your pipeline will be created in inactive state. Activate it when you're
                                ready to receive events.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pb-6">
                <div>
                    {step !== "type" && (
                        <Button
                            variant="outline"
                            onClick={() =>
                                setStep(step === "events" ? "type" : step === "fields" ? "events" : step === "review" ? "fields" : "type")
                            }
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {step === "type" && (
                        <Button onClick={() => setStep("events")} disabled={!canProceedFromType}>
                            Next: Select Events
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                    {step === "events" && (
                        <Button onClick={() => setStep("fields")} disabled={!canProceedFromEvents}>
                            Next: Configure Fields
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                    {step === "fields" && (
                        <Button onClick={() => setStep("review")} disabled={!canProceedFromFields}>
                            Next: Review
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                    {step === "review" && (
                        <Button onClick={handleCreate} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            Create Pipeline
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

