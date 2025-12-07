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
    Sparkles,
    Check,
    X,
    Edit2,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Clock,
    BarChart3,
    ChevronRight,
    Play,
    Loader2,
    Settings,
    Key,
    Zap,
    FileText,
    MessageSquare,
    RefreshCw,
    Bot,
    Cpu,
    ExternalLink,
} from "lucide-react";

// Types
type LLMProvider = "openai" | "anthropic" | "cohere" | "custom";
type ProviderStatus = "active" | "inactive" | "error";

interface LLMProviderConfig {
    id: string;
    name: string;
    provider: LLMProvider;
    status: ProviderStatus;
    apiKey: string;
    baseUrl?: string;
    defaultModel: string;
    availableModels: string[];
    maxTokens: number;
    temperature: number;
    stats: {
        requests: number;
        tokens: number;
        avgLatency: number;
    };
    lastUsed: string | null;
    createdAt: string;
}

interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: "cart_abandonment" | "churn_prevention" | "upsell" | "general";
    prompt: string;
    variables: string[];
    provider: string;
    model: string;
    isDefault: boolean;
    usageCount: number;
    lastUsed: string | null;
    createdAt: string;
}

interface ProviderOption {
    id: LLMProvider;
    name: string;
    description: string;
    icon: string;
    color: string;
    bgColor: string;
    models: string[];
}

// Provider configurations
const providerOptions: ProviderOption[] = [
    {
        id: "openai",
        name: "OpenAI",
        description: "GPT-4, GPT-3.5, and other models",
        icon: "🤖",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        models: ["gpt-4-turbo", "gpt-4", "gpt-4-32k", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"],
    },
    {
        id: "anthropic",
        name: "Anthropic",
        description: "Claude 3 Opus, Sonnet, and Haiku",
        icon: "🧠",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "claude-2.1", "claude-instant"],
    },
    {
        id: "cohere",
        name: "Cohere",
        description: "Command and other enterprise models",
        icon: "⚡",
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        models: ["command", "command-light", "command-nightly"],
    },
    {
        id: "custom",
        name: "Custom / Self-Hosted",
        description: "Your own LLM endpoint (OpenAI compatible)",
        icon: "🔧",
        color: "text-slate-600",
        bgColor: "bg-slate-100",
        models: ["custom"],
    },
];

// Sample providers
const sampleProviders: LLMProviderConfig[] = [
    {
        id: "llm_1",
        name: "Primary OpenAI",
        provider: "openai",
        status: "active",
        apiKey: "sk-***************************",
        defaultModel: "gpt-4-turbo",
        availableModels: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
        maxTokens: 4096,
        temperature: 0.7,
        stats: { requests: 45230, tokens: 12450000, avgLatency: 850 },
        lastUsed: "2 minutes ago",
        createdAt: "2025-11-01",
    },
    {
        id: "llm_2",
        name: "Anthropic Claude",
        provider: "anthropic",
        status: "active",
        apiKey: "sk-ant-***************************",
        defaultModel: "claude-3-sonnet",
        availableModels: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        maxTokens: 4096,
        temperature: 0.5,
        stats: { requests: 12340, tokens: 4560000, avgLatency: 920 },
        lastUsed: "1 hour ago",
        createdAt: "2025-11-15",
    },
];

// Sample prompt templates
const sampleTemplates: PromptTemplate[] = [
    {
        id: "pt_1",
        name: "Cart Abandonment - Urgency",
        description: "Creates urgency-based nudge messages for abandoned carts",
        category: "cart_abandonment",
        prompt: `You are a conversion copywriter. Generate a short, compelling nudge message for a user who abandoned their cart.

User context:
- Name: {{user_name}}
- Cart value: {{cart_value}}
- Items in cart: {{item_count}}
- Time since abandonment: {{time_elapsed}}

Requirements:
- Create urgency without being pushy
- Mention the specific cart value
- Keep it under 160 characters for SMS compatibility
- Include a clear CTA

Generate only the message, no explanations.`,
        variables: ["user_name", "cart_value", "item_count", "time_elapsed"],
        provider: "llm_1",
        model: "gpt-4-turbo",
        isDefault: true,
        usageCount: 12450,
        lastUsed: "5 minutes ago",
        createdAt: "2025-11-01",
    },
    {
        id: "pt_2",
        name: "Cart Abandonment - Discount Offer",
        description: "Generates personalized discount offers based on cart value",
        category: "cart_abandonment",
        prompt: `Generate a personalized discount offer message for an abandoned cart.

Context:
- User: {{user_name}}
- Cart value: {{cart_value}}
- Discount code: {{coupon_code}}
- Discount percentage: {{discount_percent}}
- Expiry: {{coupon_expiry}}

Create a friendly, conversion-focused message that:
1. Addresses the user by name
2. Mentions their cart value
3. Clearly states the discount
4. Creates urgency with the expiry
5. Stays under 200 characters`,
        variables: ["user_name", "cart_value", "coupon_code", "discount_percent", "coupon_expiry"],
        provider: "llm_1",
        model: "gpt-4-turbo",
        isDefault: false,
        usageCount: 8920,
        lastUsed: "15 minutes ago",
        createdAt: "2025-11-05",
    },
    {
        id: "pt_3",
        name: "Churn Prevention - Re-engagement",
        description: "Win-back messages for users showing churn signals",
        category: "churn_prevention",
        prompt: `Create a re-engagement message for a user showing churn signals.

User profile:
- Name: {{user_name}}
- Days since last purchase: {{days_inactive}}
- Lifetime value: {{ltv}}
- Favorite category: {{favorite_category}}
- Churn risk score: {{churn_score}}

Generate a warm, personalized message that:
1. Acknowledges they've been away
2. References their preferences
3. Offers value to return
4. Doesn't sound desperate`,
        variables: ["user_name", "days_inactive", "ltv", "favorite_category", "churn_score"],
        provider: "llm_2",
        model: "claude-3-sonnet",
        isDefault: true,
        usageCount: 3450,
        lastUsed: "1 hour ago",
        createdAt: "2025-11-10",
    },
    {
        id: "pt_4",
        name: "Upsell - Product Recommendation",
        description: "Suggests complementary products based on purchase history",
        category: "upsell",
        prompt: `Generate a product recommendation message.

Context:
- User: {{user_name}}
- Recent purchase: {{recent_product}}
- Recommended products: {{recommendations}}
- User preferences: {{preferences}}

Create a helpful, non-pushy message that:
1. References their recent purchase
2. Suggests 1-2 complementary items
3. Explains why they might like them
4. Includes a soft CTA`,
        variables: ["user_name", "recent_product", "recommendations", "preferences"],
        provider: "llm_1",
        model: "gpt-3.5-turbo",
        isDefault: false,
        usageCount: 5670,
        lastUsed: "30 minutes ago",
        createdAt: "2025-11-12",
    },
];

// Category options
const categoryOptions = [
    { value: "cart_abandonment", label: "Cart Abandonment", color: "bg-orange-100 text-orange-700" },
    { value: "churn_prevention", label: "Churn Prevention", color: "bg-red-100 text-red-700" },
    { value: "upsell", label: "Upsell / Cross-sell", color: "bg-emerald-100 text-emerald-700" },
    { value: "general", label: "General", color: "bg-slate-100 text-slate-700" },
];

export default function LLMConfig() {
    const [providers, setProviders] = useState<LLMProviderConfig[]>(sampleProviders);
    const [templates, setTemplates] = useState<PromptTemplate[]>(sampleTemplates);
    const [activeTab, setActiveTab] = useState<"providers" | "templates">("providers");
    const [searchQuery, setSearchQuery] = useState("");

    // Provider state
    const [isAddingProvider, setIsAddingProvider] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<LLMProviderConfig | null>(null);
    const [newProvider, setNewProvider] = useState<Partial<LLMProviderConfig>>({
        name: "",
        provider: undefined,
        apiKey: "",
        baseUrl: "",
        defaultModel: "",
        maxTokens: 4096,
        temperature: 0.7,
    });

    // Template state
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [newTemplate, setNewTemplate] = useState<Partial<PromptTemplate>>({
        name: "",
        description: "",
        category: "general",
        prompt: "",
        provider: "",
        model: "",
    });

    // Test state
    const [testPrompt, setTestPrompt] = useState("");
    const [testVariables, setTestVariables] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState("");
    const [isTesting, setIsTesting] = useState(false);

    // UI state
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: "provider" | "template"; id: string } | null>(null);

    // Stats
    const totalRequests = providers.reduce((acc, p) => acc + p.stats.requests, 0);
    const totalTokens = providers.reduce((acc, p) => acc + p.stats.tokens, 0);
    const avgLatency = providers.length > 0 
        ? Math.round(providers.reduce((acc, p) => acc + p.stats.avgLatency, 0) / providers.length)
        : 0;

    // Handlers
    const handleCreateProvider = () => {
        const providerConfig = providerOptions.find(p => p.id === newProvider.provider);
        const provider: LLMProviderConfig = {
            id: `llm_${Date.now()}`,
            name: newProvider.name || "",
            provider: newProvider.provider!,
            status: "inactive",
            apiKey: newProvider.apiKey || "",
            baseUrl: newProvider.baseUrl,
            defaultModel: newProvider.defaultModel || providerConfig?.models[0] || "",
            availableModels: providerConfig?.models || [],
            maxTokens: newProvider.maxTokens || 4096,
            temperature: newProvider.temperature || 0.7,
            stats: { requests: 0, tokens: 0, avgLatency: 0 },
            lastUsed: null,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setProviders([provider, ...providers]);
        setIsAddingProvider(false);
        resetProviderForm();
    };

    const handleCreateTemplate = () => {
        const variables = extractVariables(newTemplate.prompt || "");
        const template: PromptTemplate = {
            id: `pt_${Date.now()}`,
            name: newTemplate.name || "",
            description: newTemplate.description || "",
            category: newTemplate.category as PromptTemplate["category"] || "general",
            prompt: newTemplate.prompt || "",
            variables,
            provider: newTemplate.provider || "",
            model: newTemplate.model || "",
            isDefault: false,
            usageCount: 0,
            lastUsed: null,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setTemplates([template, ...templates]);
        setIsAddingTemplate(false);
        resetTemplateForm();
    };

    const handleToggleProviderStatus = (providerId: string) => {
        setProviders(providers.map(p => {
            if (p.id === providerId) {
                return { ...p, status: p.status === "active" ? "inactive" : "active" };
            }
            return p;
        }));
    };

    const handleDelete = () => {
        if (deleteTarget) {
            if (deleteTarget.type === "provider") {
                setProviders(providers.filter(p => p.id !== deleteTarget.id));
                if (selectedProvider?.id === deleteTarget.id) setSelectedProvider(null);
            } else {
                setTemplates(templates.filter(t => t.id !== deleteTarget.id));
                if (selectedTemplate?.id === deleteTarget.id) setSelectedTemplate(null);
            }
            setDeleteTarget(null);
            setShowDeleteConfirm(false);
        }
    };

    const handleTestPrompt = async () => {
        setIsTesting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let result = testPrompt;
        Object.entries(testVariables).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        
        setTestResult(`[Simulated LLM Response]\n\nBased on the prompt:\n"${result.slice(0, 200)}..."\n\nGenerated message:\n"Hey ${testVariables.user_name || 'there'}! 👋 Your cart with ${testVariables.item_count || 'items'} worth ${testVariables.cart_value || '$X'} is waiting. Complete your purchase now!"`);
        setIsTesting(false);
    };

    const extractVariables = (prompt: string): string[] => {
        const matches = prompt.match(/{{(\w+)}}/g) || [];
        return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
    };

    const resetProviderForm = () => {
        setNewProvider({
            name: "",
            provider: undefined,
            apiKey: "",
            baseUrl: "",
            defaultModel: "",
            maxTokens: 4096,
            temperature: 0.7,
        });
    };

    const resetTemplateForm = () => {
        setNewTemplate({
            name: "",
            description: "",
            category: "general",
            prompt: "",
            provider: "",
            model: "",
        });
    };

    const getProviderIcon = (provider: LLMProvider) => {
        const config = providerOptions.find(p => p.id === provider);
        return config?.icon || "🤖";
    };

    const getProviderColors = (provider: LLMProvider) => {
        const config = providerOptions.find(p => p.id === provider);
        return { color: config?.color || "text-slate-600", bg: config?.bgColor || "bg-slate-100" };
    };

    const getStatusBadge = (status: ProviderStatus) => {
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
            case "inactive":
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactive</Badge>;
            case "error":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
        }
    };

    const getCategoryBadge = (category: PromptTemplate["category"]) => {
        const config = categoryOptions.find(c => c.value === category);
        return <Badge className={cn("hover:opacity-90", config?.color)}>{config?.label}</Badge>;
    };

    const formatTokens = (tokens: number) => {
        if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
        if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
        return tokens.toString();
    };

    // Filter data
    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">LLM Configuration</h1>
                    <p className="text-slate-500 mt-1">Configure AI models and prompt templates for nudge generation</p>
                </div>
                <Button 
                    onClick={() => activeTab === "providers" ? setIsAddingProvider(true) : setIsAddingTemplate(true)} 
                    className="bg-slate-900 hover:bg-slate-800"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {activeTab === "providers" ? "Add Provider" : "New Template"}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{providers.length}</p>
                            <p className="text-xs text-slate-500">Configured Providers</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalRequests.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Requests</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{formatTokens(totalTokens)}</p>
                            <p className="text-xs text-slate-500">Tokens Used</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{avgLatency}ms</p>
                            <p className="text-xs text-slate-500">Avg. Latency</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "providers" | "templates")}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="providers" className="gap-2">
                            <Key className="h-4 w-4" />
                            Providers
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Prompt Templates
                        </TabsTrigger>
                    </TabsList>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Providers Tab */}
                <TabsContent value="providers" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                        {filteredProviders.map((provider) => {
                            const colors = getProviderColors(provider.provider);
                            return (
                                <div
                                    key={provider.id}
                                    className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setSelectedProvider(provider)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-2xl", colors.bg)}>
                                                {getProviderIcon(provider.provider)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                                                <p className="text-sm text-slate-500">{providerOptions.find(p => p.id === provider.provider)?.name}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(provider.status)}
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant="outline" className="font-mono text-xs">{provider.defaultModel}</Badge>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-xs text-slate-500">Temp: {provider.temperature}</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 py-3 border-t border-b mb-4">
                                        <div>
                                            <p className="text-lg font-semibold text-slate-900">{provider.stats.requests.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Requests</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-blue-600">{formatTokens(provider.stats.tokens)}</p>
                                            <p className="text-xs text-slate-500">Tokens</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-amber-600">{provider.stats.avgLatency}ms</p>
                                            <p className="text-xs text-slate-500">Avg. Latency</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">
                                            {provider.lastUsed ? `Last used ${provider.lastUsed}` : "Never used"}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                        {filteredTemplates.map((template) => {
                            const provider = providers.find(p => p.id === template.provider);
                            return (
                                <div
                                    key={template.id}
                                    className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setSelectedTemplate(template)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                                                {template.isDefault && (
                                                    <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{template.description}</p>
                                        </div>
                                        {getCategoryBadge(template.category)}
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-lg mb-4 font-mono text-xs text-slate-600 line-clamp-3">
                                        {template.prompt.slice(0, 150)}...
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-lg">{getProviderIcon(provider?.provider || "openai")}</span>
                                            <span className="text-xs text-slate-500">{template.model}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-xs text-slate-500">{template.variables.length} variables</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>{template.usageCount.toLocaleString()} uses</span>
                                            <span>{template.lastUsed || "Never used"}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add Provider Sheet */}
            <Sheet open={isAddingProvider} onOpenChange={setIsAddingProvider}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
                    <div className="p-6 border-b bg-slate-50">
                        <SheetHeader>
                            <SheetTitle>Add LLM Provider</SheetTitle>
                        </SheetHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Provider Selection */}
                        <div>
                            <Label className="text-sm font-medium mb-3 block">Select Provider</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {providerOptions.map((option) => (
                                    <div
                                        key={option.id}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            newProvider.provider === option.id
                                                ? "border-slate-900 bg-slate-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                        onClick={() => setNewProvider({ 
                                            ...newProvider, 
                                            provider: option.id,
                                            defaultModel: option.models[0],
                                        })}
                                    >
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-xl", option.bgColor)}>
                                            {option.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{option.name}</p>
                                            <p className="text-xs text-slate-500">{option.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {newProvider.provider && (
                            <>
                                <div>
                                    <Label className="text-sm font-medium">Configuration Name</Label>
                                    <Input
                                        placeholder="e.g., Primary OpenAI"
                                        value={newProvider.name}
                                        onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-sm font-medium">API Key</Label>
                                    <Input
                                        type="password"
                                        placeholder={newProvider.provider === "openai" ? "sk-..." : "Enter API key"}
                                        value={newProvider.apiKey}
                                        onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                                        className="mt-1 font-mono"
                                    />
                                </div>

                                {newProvider.provider === "custom" && (
                                    <div>
                                        <Label className="text-sm font-medium">Base URL</Label>
                                        <Input
                                            placeholder="https://api.your-llm.com/v1"
                                            value={newProvider.baseUrl}
                                            onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                                            className="mt-1 font-mono"
                                        />
                                    </div>
                                )}

                                <div>
                                    <Label className="text-sm font-medium">Default Model</Label>
                                    <Select
                                        value={newProvider.defaultModel}
                                        onValueChange={(v) => setNewProvider({ ...newProvider, defaultModel: v })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providerOptions.find(p => p.id === newProvider.provider)?.models.map(model => (
                                                <SelectItem key={model} value={model}>{model}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium">Max Tokens</Label>
                                        <Input
                                            type="number"
                                            value={newProvider.maxTokens}
                                            onChange={(e) => setNewProvider({ ...newProvider, maxTokens: parseInt(e.target.value) })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Temperature</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={newProvider.temperature}
                                            onChange={(e) => setNewProvider({ ...newProvider, temperature: parseFloat(e.target.value) })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-6 border-t bg-white sticky bottom-0">
                        <div className="flex items-center justify-between">
                            <Button variant="outline" onClick={() => setIsAddingProvider(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateProvider}
                                disabled={!newProvider.provider || !newProvider.name || !newProvider.apiKey}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                Add Provider
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Add Template Sheet */}
            <Sheet open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    <div className="p-6 border-b bg-slate-50">
                        <SheetHeader>
                            <SheetTitle>Create Prompt Template</SheetTitle>
                        </SheetHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium">Template Name</Label>
                                <Input
                                    placeholder="e.g., Cart Abandonment - Urgency"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Category</Label>
                                <Select
                                    value={newTemplate.category}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v as PromptTemplate["category"] })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <Input
                                placeholder="What does this template do?"
                                value={newTemplate.description}
                                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium">LLM Provider</Label>
                                <Select
                                    value={newTemplate.provider}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, provider: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.filter(p => p.status === "active").map(provider => (
                                            <SelectItem key={provider.id} value={provider.id}>
                                                {getProviderIcon(provider.provider)} {provider.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Model</Label>
                                <Select
                                    value={newTemplate.model}
                                    onValueChange={(v) => setNewTemplate({ ...newTemplate, model: v })}
                                    disabled={!newTemplate.provider}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.find(p => p.id === newTemplate.provider)?.availableModels.map(model => (
                                            <SelectItem key={model} value={model}>{model}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Prompt Template</Label>
                            <Textarea
                                placeholder="Write your prompt here. Use {{variable_name}} for dynamic content..."
                                value={newTemplate.prompt}
                                onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                                className="mt-1 font-mono text-sm"
                                rows={12}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-slate-500">
                                    Use <code className="bg-slate-100 px-1 rounded">{'{{variable}}'}</code> for dynamic content
                                </p>
                                {newTemplate.prompt && (
                                    <p className="text-xs text-slate-500">
                                        {extractVariables(newTemplate.prompt).length} variables detected
                                    </p>
                                )}
                            </div>
                        </div>

                        {newTemplate.prompt && extractVariables(newTemplate.prompt).length > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-2">Detected Variables:</p>
                                <div className="flex flex-wrap gap-1">
                                    {extractVariables(newTemplate.prompt).map(v => (
                                        <Badge key={v} variant="outline" className="font-mono text-xs">
                                            {v}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t bg-white sticky bottom-0">
                        <div className="flex items-center justify-between">
                            <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateTemplate}
                                disabled={!newTemplate.name || !newTemplate.prompt || !newTemplate.provider}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                Create Template
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Provider Detail Sheet */}
            <Sheet open={!!selectedProvider} onOpenChange={(open) => { if (!open) setSelectedProvider(null); }}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
                    {selectedProvider && (
                        <>
                            <div className="p-6 border-b bg-slate-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-2xl", getProviderColors(selectedProvider.provider).bg)}>
                                            {getProviderIcon(selectedProvider.provider)}
                                        </div>
                                        <div>
                                            <SheetHeader>
                                                <SheetTitle className="text-left">{selectedProvider.name}</SheetTitle>
                                            </SheetHeader>
                                            <p className="text-sm text-slate-500">
                                                {providerOptions.find(p => p.id === selectedProvider.provider)?.name}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(selectedProvider.status)}
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* API Key */}
                                <div>
                                    <Label className="text-xs text-slate-500">API Key</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 bg-slate-100 px-3 py-2 rounded font-mono text-sm">
                                            {showSecrets[selectedProvider.id] ? selectedProvider.apiKey : "••••••••••••••••••••"}
                                        </code>
                                        <Button variant="ghost" size="icon" onClick={() => setShowSecrets({ ...showSecrets, [selectedProvider.id]: !showSecrets[selectedProvider.id] })}>
                                            {showSecrets[selectedProvider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(selectedProvider.apiKey)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-500">Default Model</Label>
                                        <p className="font-mono text-sm mt-1">{selectedProvider.defaultModel}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">Available Models</Label>
                                        <p className="text-sm mt-1">{selectedProvider.availableModels.length} models</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">Max Tokens</Label>
                                        <p className="text-sm mt-1">{selectedProvider.maxTokens.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">Temperature</Label>
                                        <p className="text-sm mt-1">{selectedProvider.temperature}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div>
                                    <Label className="text-xs text-slate-500 mb-3 block">Usage Statistics</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-slate-900">{selectedProvider.stats.requests.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Requests</p>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-blue-600">{formatTokens(selectedProvider.stats.tokens)}</p>
                                            <p className="text-xs text-blue-700">Tokens</p>
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-amber-600">{selectedProvider.stats.avgLatency}ms</p>
                                            <p className="text-xs text-amber-700">Avg. Latency</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Test Connection */}
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">Test Connection</p>
                                            <p className="text-xs text-slate-500">Verify API key and connectivity</p>
                                        </div>
                                        <Button size="sm" variant="outline">
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Test
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t bg-white sticky bottom-0">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => { setDeleteTarget({ type: "provider", id: selectedProvider.id }); setShowDeleteConfirm(true); }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => setSelectedProvider(null)}>
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => handleToggleProviderStatus(selectedProvider.id)}
                                            className={selectedProvider.status === "active" 
                                                ? "bg-amber-500 hover:bg-amber-600" 
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                            }
                                        >
                                            {selectedProvider.status === "active" ? "Deactivate" : "Activate"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Template Detail Sheet */}
            <Sheet open={!!selectedTemplate} onOpenChange={(open) => { if (!open) { setSelectedTemplate(null); setTestResult(""); } }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {selectedTemplate && (
                        <>
                            <div className="p-6 border-b bg-slate-50">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <SheetHeader>
                                                <SheetTitle className="text-left">{selectedTemplate.name}</SheetTitle>
                                            </SheetHeader>
                                            {selectedTemplate.isDefault && (
                                                <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
                                    </div>
                                    {getCategoryBadge(selectedTemplate.category)}
                                </div>
                            </div>

                            <Tabs defaultValue="details" className="p-6">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="test">Test Prompt</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="space-y-6">
                                    {/* Provider Info */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <span className="text-xl">{getProviderIcon(providers.find(p => p.id === selectedTemplate.provider)?.provider || "openai")}</span>
                                        <div>
                                            <p className="text-sm font-medium">{providers.find(p => p.id === selectedTemplate.provider)?.name}</p>
                                            <p className="text-xs text-slate-500">{selectedTemplate.model}</p>
                                        </div>
                                    </div>

                                    {/* Prompt */}
                                    <div>
                                        <Label className="text-xs text-slate-500">Prompt Template</Label>
                                        <pre className="mt-1 p-4 bg-slate-50 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                                            {selectedTemplate.prompt}
                                        </pre>
                                    </div>

                                    {/* Variables */}
                                    <div>
                                        <Label className="text-xs text-slate-500">Variables ({selectedTemplate.variables.length})</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedTemplate.variables.map(v => (
                                                <Badge key={v} variant="outline" className="font-mono">
                                                    {v}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <p className="text-2xl font-bold text-slate-900">{selectedTemplate.usageCount.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Total Uses</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <p className="text-sm font-medium text-slate-900">{selectedTemplate.lastUsed || "Never"}</p>
                                            <p className="text-xs text-slate-500">Last Used</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="test" className="space-y-6">
                                    {/* Variable Inputs */}
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">Test Variables</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedTemplate.variables.map(v => (
                                                <div key={v}>
                                                    <Label className="text-xs text-slate-500">{v}</Label>
                                                    <Input
                                                        placeholder={`Enter ${v}`}
                                                        value={testVariables[v] || ""}
                                                        onChange={(e) => setTestVariables({ ...testVariables, [v]: e.target.value })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div>
                                        <Label className="text-xs text-slate-500">Preview (with variables replaced)</Label>
                                        <pre className="mt-1 p-4 bg-slate-50 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {(() => {
                                                let preview = selectedTemplate.prompt;
                                                Object.entries(testVariables).forEach(([key, value]) => {
                                                    preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
                                                });
                                                return preview;
                                            })()}
                                        </pre>
                                    </div>

                                    {/* Test Button */}
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            setTestPrompt(selectedTemplate.prompt);
                                            handleTestPrompt();
                                        }}
                                        disabled={isTesting}
                                    >
                                        {isTesting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4 mr-2" />
                                                Test Prompt
                                            </>
                                        )}
                                    </Button>

                                    {/* Result */}
                                    {testResult && (
                                        <div>
                                            <Label className="text-xs text-slate-500">LLM Response</Label>
                                            <div className="mt-1 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                                <pre className="text-sm whitespace-pre-wrap text-emerald-900">{testResult}</pre>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <div className="p-6 border-t bg-white sticky bottom-0">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => { setDeleteTarget({ type: "template", id: selectedTemplate.id }); setShowDeleteConfirm(true); }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                                            Close
                                        </Button>
                                        <Button className="bg-slate-900 hover:bg-slate-800">
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Edit Template
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
                        <DialogTitle>Delete {deleteTarget?.type === "provider" ? "Provider" : "Template"}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

