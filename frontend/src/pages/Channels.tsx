import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    Plus,
    Search,
    MessageSquare,
    Mail,
    Smartphone,
    Webhook,
    Check,
    X,
    Edit2,
    Trash2,
    Copy,
    ExternalLink,
    Zap,
    Send,
    Gift,
    ShoppingBag,
    User,
    Tag,
    Settings,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Clock,
    BarChart3,
    ChevronRight,
    Sparkles,
    ArrowRight,
} from "lucide-react";

// Types
type ChannelType = "whatsapp" | "sms" | "email" | "webhook";
type ChannelStatus = "active" | "inactive" | "error";

interface Channel {
    id: string;
    name: string;
    description: string;
    type: ChannelType;
    status: ChannelStatus;
    config: ChannelConfig;
    capabilities: ChannelCapability[];
    stats: {
        sent: number;
        delivered: number;
        failed: number;
    };
    lastUsed: string | null;
    createdAt: string;
}

interface ChannelConfig {
    // WhatsApp/SMS
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
    phoneNumberField?: string;
    messageTemplate?: string;
    // Email
    emailProvider?: "sendgrid" | "ses" | "smtp" | "resend";
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
    emailField?: string;
    subjectTemplate?: string;
    bodyTemplate?: string;
    // Webhook
    webhookUrl?: string;
    httpMethod?: "POST" | "PUT" | "PATCH";
    headers?: { key: string; value: string }[];
    payloadTemplate?: string;
    // Common
    retryEnabled?: boolean;
    retryCount?: number;
}

interface ChannelCapability {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    config?: Record<string, unknown>;
}

interface ChannelTypeOption {
    id: ChannelType;
    name: string;
    description: string;
    icon: typeof Mail;
    color: string;
    bgColor: string;
}

// Channel type configurations
const channelTypes: ChannelTypeOption[] = [
    {
        id: "whatsapp",
        name: "WhatsApp",
        description: "Send messages via WhatsApp Business API",
        icon: MessageSquare,
        color: "text-green-600",
        bgColor: "bg-green-100",
    },
    {
        id: "sms",
        name: "SMS / Text",
        description: "Send text messages via SMS gateway",
        icon: Smartphone,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
    },
    {
        id: "email",
        name: "Email",
        description: "Send emails via email service provider",
        icon: Mail,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
    },
    {
        id: "webhook",
        name: "Custom Webhook",
        description: "Send data to any HTTP endpoint",
        icon: Webhook,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
    },
];

// Available capabilities
const availableCapabilities = [
    {
        id: "coupon_generation",
        name: "Coupon Generation",
        description: "Generate unique discount codes on-the-fly",
        icon: Tag,
    },
    {
        id: "product_recommendation",
        name: "Product Recommendation",
        description: "Include personalized product suggestions",
        icon: ShoppingBag,
    },
    {
        id: "personalization",
        name: "Dynamic Personalization",
        description: "Use user data for personalized content",
        icon: User,
    },
    {
        id: "ai_content",
        name: "AI-Generated Content",
        description: "Use LLM to generate message content",
        icon: Sparkles,
    },
];

// Sample channels data
const sampleChannels: Channel[] = [
    {
        id: "ch_1",
        name: "Cart Recovery WhatsApp",
        description: "WhatsApp messages for cart abandonment nudges",
        type: "whatsapp",
        status: "active",
        config: {
            twilioAccountSid: "AC***************",
            twilioAuthToken: "••••••••",
            twilioPhoneNumber: "+1234567890",
            phoneNumberField: "user.phone",
            messageTemplate: "Hi {{user.name}}! Your cart is waiting 🛒\n\nYou left {{cart.item_count}} items worth {{cart.total}}.\n\n{{coupon_message}}\n\nComplete your purchase: {{cart.checkout_url}}",
            retryEnabled: true,
            retryCount: 3,
        },
        capabilities: [
            { id: "coupon_generation", name: "Coupon Generation", description: "", enabled: true },
            { id: "personalization", name: "Dynamic Personalization", description: "", enabled: true },
        ],
        stats: { sent: 4532, delivered: 4389, failed: 143 },
        lastUsed: "2 hours ago",
        createdAt: "2025-11-01",
    },
    {
        id: "ch_2",
        name: "Promotional Emails",
        description: "Email channel for promotional and marketing nudges",
        type: "email",
        status: "active",
        config: {
            emailProvider: "sendgrid",
            apiKey: "SG.***************",
            fromEmail: "offers@mystore.com",
            fromName: "MyStore",
            emailField: "user.email",
            subjectTemplate: "{{user.first_name}}, don't miss out! {{offer.headline}}",
            bodyTemplate: "<html>...</html>",
            retryEnabled: true,
            retryCount: 2,
        },
        capabilities: [
            { id: "coupon_generation", name: "Coupon Generation", description: "", enabled: true },
            { id: "product_recommendation", name: "Product Recommendation", description: "", enabled: true },
            { id: "ai_content", name: "AI-Generated Content", description: "", enabled: true },
        ],
        stats: { sent: 12450, delivered: 12123, failed: 327 },
        lastUsed: "30 mins ago",
        createdAt: "2025-10-15",
    },
    {
        id: "ch_3",
        name: "Win-back SMS",
        description: "SMS for re-engaging dormant users",
        type: "sms",
        status: "active",
        config: {
            twilioAccountSid: "AC***************",
            twilioAuthToken: "••••••••",
            twilioPhoneNumber: "+1987654321",
            phoneNumberField: "user.phone",
            messageTemplate: "Hey {{user.first_name}}! We miss you 💙 Come back and enjoy {{discount}}% off your next order. Shop now: {{short_url}}",
            retryEnabled: false,
        },
        capabilities: [
            { id: "coupon_generation", name: "Coupon Generation", description: "", enabled: true },
        ],
        stats: { sent: 2341, delivered: 2298, failed: 43 },
        lastUsed: "1 day ago",
        createdAt: "2025-11-10",
    },
    {
        id: "ch_4",
        name: "Internal CRM Webhook",
        description: "Push nudge events to internal CRM system",
        type: "webhook",
        status: "inactive",
        config: {
            webhookUrl: "https://api.internal.mystore.com/crm/nudge-events",
            httpMethod: "POST",
            headers: [
                { key: "Authorization", value: "Bearer ***" },
                { key: "Content-Type", value: "application/json" },
            ],
            payloadTemplate: `{
  "event": "nudge_triggered",
  "user_id": "{{user.id}}",
  "nudge_type": "{{workflow.type}}",
  "prediction_score": {{prediction.score}},
  "timestamp": "{{timestamp}}"
}`,
        },
        capabilities: [],
        stats: { sent: 0, delivered: 0, failed: 0 },
        lastUsed: null,
        createdAt: "2025-12-01",
    },
];

// User fields for mapping
const userFields = [
    { value: "user.email", label: "Email (user.email)" },
    { value: "user.phone", label: "Phone (user.phone)" },
    { value: "user.first_name", label: "First Name (user.first_name)" },
    { value: "user.last_name", label: "Last Name (user.last_name)" },
    { value: "user.name", label: "Full Name (user.name)" },
    { value: "user.id", label: "User ID (user.id)" },
];

export default function Channels() {
    const [channels, setChannels] = useState<Channel[]>(sampleChannels);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    // Create channel state
    const [isCreating, setIsCreating] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
    const [newChannel, setNewChannel] = useState<Partial<Channel>>({
        name: "",
        description: "",
        config: {},
        capabilities: [],
    });

    // View/Edit channel state
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Password visibility
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    // Filter channels
    const filteredChannels = channels.filter(ch => {
        const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ch.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || ch.type === typeFilter;
        return matchesSearch && matchesType;
    });

    // Stats
    const totalSent = channels.reduce((acc, ch) => acc + ch.stats.sent, 0);
    const totalDelivered = channels.reduce((acc, ch) => acc + ch.stats.delivered, 0);
    const totalFailed = channels.reduce((acc, ch) => acc + ch.stats.failed, 0);
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;

    // Handlers
    const handleStartCreate = () => {
        setIsCreating(true);
        setCreateStep(1);
        setSelectedType(null);
        setNewChannel({
            name: "",
            description: "",
            config: {},
            capabilities: [],
        });
    };

    const handleSelectType = (type: ChannelType) => {
        setSelectedType(type);
        setNewChannel({
            ...newChannel,
            type,
            config: getDefaultConfig(type),
        });
    };

    const getDefaultConfig = (type: ChannelType): ChannelConfig => {
        switch (type) {
            case "whatsapp":
            case "sms":
                return {
                    twilioAccountSid: "",
                    twilioAuthToken: "",
                    twilioPhoneNumber: "",
                    phoneNumberField: "user.phone",
                    messageTemplate: "",
                    retryEnabled: true,
                    retryCount: 3,
                };
            case "email":
                return {
                    emailProvider: "sendgrid",
                    apiKey: "",
                    fromEmail: "",
                    fromName: "",
                    emailField: "user.email",
                    subjectTemplate: "",
                    bodyTemplate: "",
                    retryEnabled: true,
                    retryCount: 2,
                };
            case "webhook":
                return {
                    webhookUrl: "",
                    httpMethod: "POST",
                    headers: [{ key: "Content-Type", value: "application/json" }],
                    payloadTemplate: `{
  "event": "nudge_triggered",
  "user_id": "{{user.id}}",
  "data": {}
}`,
                };
        }
    };

    const handleCreateChannel = () => {
        const channel: Channel = {
            id: `ch_${Date.now()}`,
            name: newChannel.name || "",
            description: newChannel.description || "",
            type: selectedType!,
            status: "inactive",
            config: newChannel.config || {},
            capabilities: newChannel.capabilities || [],
            stats: { sent: 0, delivered: 0, failed: 0 },
            lastUsed: null,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setChannels([channel, ...channels]);
        setIsCreating(false);
        setCreateStep(1);
    };

    const handleToggleStatus = (channelId: string) => {
        setChannels(channels.map(ch => {
            if (ch.id === channelId) {
                return {
                    ...ch,
                    status: ch.status === "active" ? "inactive" : "active",
                };
            }
            return ch;
        }));
    };

    const handleDeleteChannel = () => {
        if (selectedChannel) {
            setChannels(channels.filter(ch => ch.id !== selectedChannel.id));
            setSelectedChannel(null);
            setShowDeleteConfirm(false);
        }
    };

    const toggleCapability = (capId: string) => {
        const currentCaps = newChannel.capabilities || [];
        const exists = currentCaps.find(c => c.id === capId);
        if (exists) {
            setNewChannel({
                ...newChannel,
                capabilities: currentCaps.filter(c => c.id !== capId),
            });
        } else {
            const cap = availableCapabilities.find(c => c.id === capId)!;
            setNewChannel({
                ...newChannel,
                capabilities: [...currentCaps, { ...cap, enabled: true }],
            });
        }
    };

    const getChannelIcon = (type: ChannelType) => {
        const config = channelTypes.find(t => t.id === type);
        return config?.icon || Webhook;
    };

    const getChannelColor = (type: ChannelType) => {
        const config = channelTypes.find(t => t.id === type);
        return { color: config?.color || "text-slate-600", bg: config?.bgColor || "bg-slate-100" };
    };

    const getStatusBadge = (status: ChannelStatus) => {
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
            case "inactive":
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactive</Badge>;
            case "error":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Output Channels</h1>
                    <p className="text-slate-500 mt-1">Configure delivery channels for your nudges</p>
                </div>
                <Button onClick={handleStartCreate} className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" />
                    New Channel
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Send className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{channels.length}</p>
                            <p className="text-xs text-slate-500">Configured Channels</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalSent.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Messages Sent</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalDelivered.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Delivered</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{deliveryRate}%</p>
                            <p className="text-xs text-slate-500">Delivery Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search channels..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-2 gap-4">
                {filteredChannels.map((channel) => {
                    const Icon = getChannelIcon(channel.type);
                    const colors = getChannelColor(channel.type);
                    return (
                        <div
                            key={channel.id}
                            className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedChannel(channel)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                        <Icon className={cn("h-5 w-5", colors.color)} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{channel.name}</h3>
                                        <p className="text-sm text-slate-500">{channel.description}</p>
                                    </div>
                                </div>
                                {getStatusBadge(channel.status)}
                            </div>

                            {/* Capabilities */}
                            {channel.capabilities.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {channel.capabilities.map(cap => {
                                        const capConfig = availableCapabilities.find(c => c.id === cap.id);
                                        const CapIcon = capConfig?.icon || Zap;
                                        return (
                                            <span key={cap.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                                                <CapIcon className="h-3 w-3" />
                                                {cap.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 py-3 border-t border-b mb-4">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{channel.stats.sent.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">Sent</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-emerald-600">{channel.stats.delivered.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">Delivered</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-red-500">{channel.stats.failed.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">Failed</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {channel.lastUsed ? `Last used ${channel.lastUsed}` : "Never used"}
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Channel Sheet */}
            <Sheet open={isCreating} onOpenChange={(open) => { if (!open) setIsCreating(false); }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {/* Step Indicator */}
                    <div className="p-6 border-b bg-slate-50">
                        <SheetHeader>
                            <SheetTitle>Create New Channel</SheetTitle>
                        </SheetHeader>
                        <div className="flex items-center gap-2 mt-4">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                            createStep === step
                                                ? "bg-slate-900 text-white"
                                                : createStep > step
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-200 text-slate-500"
                                        )}
                                    >
                                        {createStep > step ? <Check className="h-4 w-4" /> : step}
                                    </div>
                                    {step < 3 && (
                                        <div className={cn(
                                            "w-16 h-0.5 mx-1",
                                            createStep > step ? "bg-emerald-500" : "bg-slate-200"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500 px-1">
                            <span>Type</span>
                            <span>Configuration</span>
                            <span>Capabilities</span>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Step 1: Select Type */}
                        {createStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Select channel type</h3>
                                    <p className="text-sm text-slate-500">Choose how you want to deliver nudges</p>
                                </div>

                                <div className="space-y-3">
                                    {channelTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <div
                                                key={type.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    selectedType === type.id
                                                        ? "border-slate-900 bg-slate-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => handleSelectType(type.id)}
                                            >
                                                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", type.bgColor)}>
                                                    <Icon className={cn("h-6 w-6", type.color)} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{type.name}</p>
                                                    <p className="text-sm text-slate-500">{type.description}</p>
                                                </div>
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                    selectedType === type.id
                                                        ? "border-slate-900 bg-slate-900"
                                                        : "border-slate-300"
                                                )}>
                                                    {selectedType === type.id && (
                                                        <Check className="h-3 w-3 text-white" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Configuration */}
                        {createStep === 2 && selectedType && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Configure channel</h3>
                                    <p className="text-sm text-slate-500">Set up the connection and message templates</p>
                                </div>

                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium">Channel Name</Label>
                                        <Input
                                            placeholder="e.g., Cart Recovery WhatsApp"
                                            value={newChannel.name}
                                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Description</Label>
                                        <Input
                                            placeholder="What is this channel used for?"
                                            value={newChannel.description}
                                            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp/SMS Config */}
                                {(selectedType === "whatsapp" || selectedType === "sms") && (
                                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border">
                                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                            <Settings className="h-4 w-4" />
                                            Twilio Configuration
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium">Account SID</Label>
                                                <Input
                                                    placeholder="AC..."
                                                    value={newChannel.config?.twilioAccountSid || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, twilioAccountSid: e.target.value }
                                                    })}
                                                    className="mt-1 font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium">Auth Token</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={newChannel.config?.twilioAuthToken || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, twilioAuthToken: e.target.value }
                                                    })}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium">From Phone Number</Label>
                                                <Input
                                                    placeholder="+1234567890"
                                                    value={newChannel.config?.twilioPhoneNumber || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, twilioPhoneNumber: e.target.value }
                                                    })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium">User Phone Number Field</Label>
                                                <Select
                                                    value={newChannel.config?.phoneNumberField || "user.phone"}
                                                    onValueChange={(v) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, phoneNumberField: v }
                                                    })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {userFields.filter(f => f.value.includes("phone")).map(field => (
                                                            <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">Message Template</Label>
                                            <Textarea
                                                placeholder={selectedType === "whatsapp" 
                                                    ? "Hi {{user.name}}! 🛒\n\nYour cart is waiting with {{cart.item_count}} items.\n\n{{coupon_message}}"
                                                    : "Hi {{user.name}}! Your cart is waiting. Use code {{coupon}} for {{discount}}% off: {{short_url}}"
                                                }
                                                value={newChannel.config?.messageTemplate || ""}
                                                onChange={(e) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, messageTemplate: e.target.value }
                                                })}
                                                className="mt-1"
                                                rows={4}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Use {'{{variable}}'} syntax for dynamic content</p>
                                        </div>
                                    </div>
                                )}

                                {/* Email Config */}
                                {selectedType === "email" && (
                                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border">
                                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                            <Settings className="h-4 w-4" />
                                            Email Provider Configuration
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium">Email Provider</Label>
                                                <Select
                                                    value={newChannel.config?.emailProvider || "sendgrid"}
                                                    onValueChange={(v: "sendgrid" | "ses" | "smtp" | "resend") => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, emailProvider: v }
                                                    })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                                                        <SelectItem value="ses">Amazon SES</SelectItem>
                                                        <SelectItem value="resend">Resend</SelectItem>
                                                        <SelectItem value="smtp">Custom SMTP</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium">API Key</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="SG.••••••••"
                                                    value={newChannel.config?.apiKey || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, apiKey: e.target.value }
                                                    })}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium">From Email</Label>
                                                <Input
                                                    placeholder="noreply@yourstore.com"
                                                    value={newChannel.config?.fromEmail || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, fromEmail: e.target.value }
                                                    })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium">From Name</Label>
                                                <Input
                                                    placeholder="Your Store"
                                                    value={newChannel.config?.fromName || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, fromName: e.target.value }
                                                    })}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">User Email Field</Label>
                                            <Select
                                                value={newChannel.config?.emailField || "user.email"}
                                                onValueChange={(v) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, emailField: v }
                                                })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {userFields.filter(f => f.value.includes("email")).map(field => (
                                                        <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">Subject Template</Label>
                                            <Input
                                                placeholder="{{user.first_name}}, your cart is waiting!"
                                                value={newChannel.config?.subjectTemplate || ""}
                                                onChange={(e) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, subjectTemplate: e.target.value }
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">Body Template (HTML)</Label>
                                            <Textarea
                                                placeholder="<html>...</html>"
                                                value={newChannel.config?.bodyTemplate || ""}
                                                onChange={(e) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, bodyTemplate: e.target.value }
                                                })}
                                                className="mt-1 font-mono text-xs"
                                                rows={6}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Webhook Config */}
                                {selectedType === "webhook" && (
                                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border">
                                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                            <Settings className="h-4 w-4" />
                                            Webhook Configuration
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <Label className="text-xs font-medium">Webhook URL</Label>
                                                <Input
                                                    placeholder="https://api.yourservice.com/nudge"
                                                    value={newChannel.config?.webhookUrl || ""}
                                                    onChange={(e) => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, webhookUrl: e.target.value }
                                                    })}
                                                    className="mt-1 font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium">HTTP Method</Label>
                                                <Select
                                                    value={newChannel.config?.httpMethod || "POST"}
                                                    onValueChange={(v: "POST" | "PUT" | "PATCH") => setNewChannel({
                                                        ...newChannel,
                                                        config: { ...newChannel.config, httpMethod: v }
                                                    })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="POST">POST</SelectItem>
                                                        <SelectItem value="PUT">PUT</SelectItem>
                                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">Headers</Label>
                                            <div className="space-y-2 mt-1">
                                                {(newChannel.config?.headers || []).map((header, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <Input
                                                            placeholder="Header name"
                                                            value={header.key}
                                                            onChange={(e) => {
                                                                const headers = [...(newChannel.config?.headers || [])];
                                                                headers[idx].key = e.target.value;
                                                                setNewChannel({
                                                                    ...newChannel,
                                                                    config: { ...newChannel.config, headers }
                                                                });
                                                            }}
                                                            className="flex-1"
                                                        />
                                                        <Input
                                                            placeholder="Value"
                                                            value={header.value}
                                                            onChange={(e) => {
                                                                const headers = [...(newChannel.config?.headers || [])];
                                                                headers[idx].value = e.target.value;
                                                                setNewChannel({
                                                                    ...newChannel,
                                                                    config: { ...newChannel.config, headers }
                                                                });
                                                            }}
                                                            className="flex-1"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                const headers = (newChannel.config?.headers || []).filter((_, i) => i !== idx);
                                                                setNewChannel({
                                                                    ...newChannel,
                                                                    config: { ...newChannel.config, headers }
                                                                });
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const headers = [...(newChannel.config?.headers || []), { key: "", value: "" }];
                                                        setNewChannel({
                                                            ...newChannel,
                                                            config: { ...newChannel.config, headers }
                                                        });
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Header
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium">Payload Template (JSON)</Label>
                                            <Textarea
                                                value={newChannel.config?.payloadTemplate || ""}
                                                onChange={(e) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, payloadTemplate: e.target.value }
                                                })}
                                                className="mt-1 font-mono text-xs"
                                                rows={8}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Use {'{{variable}}'} syntax for dynamic content</p>
                                        </div>
                                    </div>
                                )}

                                {/* Retry Config */}
                                {selectedType !== "webhook" && (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                                        <div>
                                            <p className="font-medium text-sm">Enable Retry</p>
                                            <p className="text-xs text-slate-500">Automatically retry failed deliveries</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Select
                                                value={String(newChannel.config?.retryCount || 3)}
                                                onValueChange={(v) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, retryCount: parseInt(v) }
                                                })}
                                                disabled={!newChannel.config?.retryEnabled}
                                            >
                                                <SelectTrigger className="w-20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1x</SelectItem>
                                                    <SelectItem value="2">2x</SelectItem>
                                                    <SelectItem value="3">3x</SelectItem>
                                                    <SelectItem value="5">5x</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Switch
                                                checked={newChannel.config?.retryEnabled || false}
                                                onCheckedChange={(checked) => setNewChannel({
                                                    ...newChannel,
                                                    config: { ...newChannel.config, retryEnabled: checked }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Capabilities */}
                        {createStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Enable capabilities</h3>
                                    <p className="text-sm text-slate-500">Select additional features for this channel</p>
                                </div>

                                <div className="space-y-3">
                                    {availableCapabilities.map((cap) => {
                                        const Icon = cap.icon;
                                        const isEnabled = newChannel.capabilities?.some(c => c.id === cap.id);
                                        return (
                                            <div
                                                key={cap.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    isEnabled
                                                        ? "border-emerald-500 bg-emerald-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => toggleCapability(cap.id)}
                                            >
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    isEnabled ? "bg-emerald-500 text-white" : "bg-slate-100"
                                                )}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{cap.name}</p>
                                                    <p className="text-sm text-slate-500">{cap.description}</p>
                                                </div>
                                                <div className={cn(
                                                    "h-5 w-5 rounded border-2 flex items-center justify-center",
                                                    isEnabled
                                                        ? "border-emerald-500 bg-emerald-500"
                                                        : "border-slate-300"
                                                )}>
                                                    {isEnabled && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Capability-specific config */}
                                {newChannel.capabilities?.some(c => c.id === "coupon_generation") && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                        <h4 className="font-medium text-amber-900 flex items-center gap-2 mb-3">
                                            <Tag className="h-4 w-4" />
                                            Coupon Generation Settings
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium text-amber-900">Default Discount</Label>
                                                <Select defaultValue="10">
                                                    <SelectTrigger className="mt-1 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="5">5%</SelectItem>
                                                        <SelectItem value="10">10%</SelectItem>
                                                        <SelectItem value="15">15%</SelectItem>
                                                        <SelectItem value="20">20%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium text-amber-900">Expiry</Label>
                                                <Select defaultValue="24h">
                                                    <SelectTrigger className="mt-1 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1h">1 hour</SelectItem>
                                                        <SelectItem value="24h">24 hours</SelectItem>
                                                        <SelectItem value="7d">7 days</SelectItem>
                                                        <SelectItem value="30d">30 days</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-amber-700 mt-2">
                                            Use <code className="bg-amber-100 px-1 rounded">{'{{coupon}}'}</code> in your template
                                        </p>
                                    </div>
                                )}

                                {newChannel.capabilities?.some(c => c.id === "product_recommendation") && (
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                        <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-3">
                                            <ShoppingBag className="h-4 w-4" />
                                            Product Recommendation Settings
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-medium text-blue-900">Strategy</Label>
                                                <Select defaultValue="similar">
                                                    <SelectTrigger className="mt-1 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="similar">Similar Products</SelectItem>
                                                        <SelectItem value="complementary">Frequently Bought Together</SelectItem>
                                                        <SelectItem value="trending">Trending Now</SelectItem>
                                                        <SelectItem value="personalized">ML Personalized</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-medium text-blue-900">Max Products</Label>
                                                <Select defaultValue="3">
                                                    <SelectTrigger className="mt-1 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">1</SelectItem>
                                                        <SelectItem value="3">3</SelectItem>
                                                        <SelectItem value="5">5</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-700 mt-2">
                                            Use <code className="bg-blue-100 px-1 rounded">{'{{recommendations}}'}</code> in your template
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-white sticky bottom-0">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (createStep === 1) {
                                        setIsCreating(false);
                                    } else {
                                        setCreateStep((createStep - 1) as 1 | 2);
                                    }
                                }}
                            >
                                {createStep === 1 ? "Cancel" : "Back"}
                            </Button>
                            <Button
                                onClick={() => {
                                    if (createStep < 3) {
                                        setCreateStep((createStep + 1) as 2 | 3);
                                    } else {
                                        handleCreateChannel();
                                    }
                                }}
                                disabled={
                                    (createStep === 1 && !selectedType) ||
                                    (createStep === 2 && !newChannel.name)
                                }
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {createStep === 3 ? (
                                    <>
                                        Create Channel
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Channel Detail Sheet */}
            <Sheet open={!!selectedChannel} onOpenChange={(open) => { if (!open) { setSelectedChannel(null); setIsEditing(false); } }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {selectedChannel && (
                        <>
                            <div className="p-6 border-b bg-slate-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const Icon = getChannelIcon(selectedChannel.type);
                                            const colors = getChannelColor(selectedChannel.type);
                                            return (
                                                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", colors.bg)}>
                                                    <Icon className={cn("h-6 w-6", colors.color)} />
                                                </div>
                                            );
                                        })()}
                                        <div>
                                            <SheetHeader>
                                                <SheetTitle className="text-left">{selectedChannel.name}</SheetTitle>
                                            </SheetHeader>
                                            <p className="text-sm text-slate-500">{selectedChannel.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(selectedChannel.status)}
                                        {!isEditing && (
                                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Tabs defaultValue="config" className="p-6">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="config">Configuration</TabsTrigger>
                                    <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                                </TabsList>

                                <TabsContent value="config" className="space-y-6">
                                    {/* WhatsApp/SMS Config View */}
                                    {(selectedChannel.type === "whatsapp" || selectedChannel.type === "sms") && (
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-slate-900">Twilio Settings</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs text-slate-500">Account SID</Label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                                                            {selectedChannel.config.twilioAccountSid}
                                                        </code>
                                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(selectedChannel.config.twilioAccountSid || "")}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-500">Auth Token</Label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                                                            {showSecrets[selectedChannel.id] ? selectedChannel.config.twilioAuthToken : "••••••••"}
                                                        </code>
                                                        <Button variant="ghost" size="icon" onClick={() => setShowSecrets({ ...showSecrets, [selectedChannel.id]: !showSecrets[selectedChannel.id] })}>
                                                            {showSecrets[selectedChannel.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-500">From Phone Number</Label>
                                                <p className="font-mono text-sm mt-1">{selectedChannel.config.twilioPhoneNumber}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-500">User Phone Field</Label>
                                                <p className="font-mono text-sm mt-1">{selectedChannel.config.phoneNumberField}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-500">Message Template</Label>
                                                <pre className="mt-1 p-3 bg-slate-100 rounded text-sm whitespace-pre-wrap">{selectedChannel.config.messageTemplate}</pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email Config View */}
                                    {selectedChannel.type === "email" && (
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-slate-900">Email Provider Settings</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs text-slate-500">Provider</Label>
                                                    <p className="text-sm mt-1 capitalize">{selectedChannel.config.emailProvider}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-500">API Key</Label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono truncate">
                                                            {showSecrets[selectedChannel.id] ? selectedChannel.config.apiKey : "••••••••"}
                                                        </code>
                                                        <Button variant="ghost" size="icon" onClick={() => setShowSecrets({ ...showSecrets, [selectedChannel.id]: !showSecrets[selectedChannel.id] })}>
                                                            {showSecrets[selectedChannel.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs text-slate-500">From Email</Label>
                                                    <p className="text-sm mt-1">{selectedChannel.config.fromEmail}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-500">From Name</Label>
                                                    <p className="text-sm mt-1">{selectedChannel.config.fromName}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-500">Subject Template</Label>
                                                <p className="font-mono text-sm mt-1 bg-slate-100 px-3 py-2 rounded">{selectedChannel.config.subjectTemplate}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Webhook Config View */}
                                    {selectedChannel.type === "webhook" && (
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-slate-900">Webhook Settings</h4>
                                            <div>
                                                <Label className="text-xs text-slate-500">Endpoint</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="font-mono">{selectedChannel.config.httpMethod}</Badge>
                                                    <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono truncate">
                                                        {selectedChannel.config.webhookUrl}
                                                    </code>
                                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(selectedChannel.config.webhookUrl || "")}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {selectedChannel.config.headers && selectedChannel.config.headers.length > 0 && (
                                                <div>
                                                    <Label className="text-xs text-slate-500">Headers</Label>
                                                    <div className="mt-1 space-y-1">
                                                        {selectedChannel.config.headers.map((h, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 font-mono text-sm">
                                                                <span className="text-slate-600">{h.key}:</span>
                                                                <span>{h.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <Label className="text-xs text-slate-500">Payload Template</Label>
                                                <pre className="mt-1 p-3 bg-slate-100 rounded text-sm font-mono overflow-x-auto">{selectedChannel.config.payloadTemplate}</pre>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="capabilities" className="space-y-4">
                                    {selectedChannel.capabilities.length > 0 ? (
                                        selectedChannel.capabilities.map(cap => {
                                            const capConfig = availableCapabilities.find(c => c.id === cap.id);
                                            const CapIcon = capConfig?.icon || Zap;
                                            return (
                                                <div key={cap.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                                    <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                                        <CapIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{cap.name}</p>
                                                        <p className="text-xs text-emerald-700">{capConfig?.description}</p>
                                                    </div>
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-slate-500">
                                            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No capabilities enabled</p>
                                            <p className="text-sm">Edit this channel to add capabilities</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="stats" className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-slate-900">{selectedChannel.stats.sent.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Total Sent</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-emerald-600">{selectedChannel.stats.delivered.toLocaleString()}</p>
                                            <p className="text-xs text-emerald-700">Delivered</p>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-red-600">{selectedChannel.stats.failed.toLocaleString()}</p>
                                            <p className="text-xs text-red-700">Failed</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-600">Delivery Rate</span>
                                            <span className="font-semibold">
                                                {selectedChannel.stats.sent > 0 
                                                    ? ((selectedChannel.stats.delivered / selectedChannel.stats.sent) * 100).toFixed(1) 
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ 
                                                    width: `${selectedChannel.stats.sent > 0 
                                                        ? (selectedChannel.stats.delivered / selectedChannel.stats.sent) * 100 
                                                        : 0}%` 
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        <p>Created: {selectedChannel.createdAt}</p>
                                        <p>Last used: {selectedChannel.lastUsed || "Never"}</p>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {/* Footer */}
                            <div className="p-6 border-t bg-white sticky bottom-0">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => setSelectedChannel(null)}>
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => handleToggleStatus(selectedChannel.id)}
                                            className={selectedChannel.status === "active" 
                                                ? "bg-amber-500 hover:bg-amber-600" 
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                            }
                                        >
                                            {selectedChannel.status === "active" ? (
                                                <>Deactivate</>
                                            ) : (
                                                <>Activate</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Channel</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedChannel?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteChannel}>
                            Delete Channel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
