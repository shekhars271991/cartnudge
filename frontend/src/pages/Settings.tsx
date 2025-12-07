import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    FolderOpen,
    Key,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Plus,
    Edit2,
    Trash2,
    Settings as SettingsIcon,
    Globe,
    AlertCircle,
    ExternalLink,
    Webhook,
    Shield,
    Zap,
    Database,
    CreditCard,
    Check,
    TrendingUp,
    Calendar,
    Receipt,
    Download,
} from "lucide-react";

// Types
interface Project {
    id: string;
    name: string;
    description: string;
    environment: "production" | "staging" | "development";
    createdAt: string;
    lastActivity: string;
    status: "active" | "inactive";
}

interface APIKey {
    id: string;
    name: string;
    key: string;
    type: "public" | "secret";
    createdAt: string;
    lastUsed: string | null;
    status: "active" | "revoked";
}

interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: "paid" | "pending" | "failed";
}

// Sample data
const projects: Project[] = [
    {
        id: "proj_1",
        name: "E-commerce Store",
        description: "Main production store for CartNudge implementation",
        environment: "production",
        createdAt: "Nov 1, 2024",
        lastActivity: "2 hours ago",
        status: "active",
    },
    {
        id: "proj_2",
        name: "Mobile App",
        description: "iOS and Android app integration",
        environment: "production",
        createdAt: "Nov 15, 2024",
        lastActivity: "1 day ago",
        status: "active",
    },
    {
        id: "proj_3",
        name: "Staging Environment",
        description: "Testing and QA environment",
        environment: "staging",
        createdAt: "Dec 1, 2024",
        lastActivity: "3 days ago",
        status: "active",
    },
];

const apiKeys: APIKey[] = [
    {
        id: "key_1",
        name: "Production Public Key",
        key: "cnk_pub_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
        type: "public",
        createdAt: "Nov 1, 2024",
        lastUsed: "2 minutes ago",
        status: "active",
    },
    {
        id: "key_2",
        name: "Production Secret Key",
        key: "cnk_sec_prod_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0",
        type: "secret",
        createdAt: "Nov 1, 2024",
        lastUsed: "5 minutes ago",
        status: "active",
    },
    {
        id: "key_3",
        name: "Staging Key",
        key: "cnk_sec_test_demo1234567890abcdefghijklmnopqrstuvwxyz",
        type: "secret",
        createdAt: "Dec 1, 2024",
        lastUsed: null,
        status: "active",
    },
];

const invoices: Invoice[] = [
    { id: "inv_001", date: "Dec 1, 2024", amount: 299, status: "paid" },
    { id: "inv_002", date: "Nov 1, 2024", amount: 299, status: "paid" },
    { id: "inv_003", date: "Oct 1, 2024", amount: 299, status: "paid" },
    { id: "inv_004", date: "Sep 1, 2024", amount: 199, status: "paid" },
];

const currentPlan = {
    name: "Growth",
    price: 299,
    billing: "monthly",
    features: [
        "Up to 100,000 MAU",
        "Unlimited workflows",
        "All prediction models",
        "Priority support",
        "Custom integrations",
    ],
    usage: {
        mau: 45230,
        mauLimit: 100000,
        predictions: 1200000,
        predictionsLimit: 5000000,
        nudges: 89420,
        nudgesLimit: 500000,
    },
};

export default function Settings() {
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [showCreateKey, setShowCreateKey] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // New project form
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        environment: "development",
    });

    // New API key form
    const [newKey, setNewKey] = useState({
        name: "",
        type: "secret",
    });

    // Settings state
    const [settings, setSettings] = useState({
        webhookRetries: true,
        rateLimiting: true,
        debugMode: false,
        dataRetention: "90",
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getEnvironmentBadge = (env: Project["environment"]) => {
        const colors = {
            production: "bg-emerald-100 text-emerald-700",
            staging: "bg-amber-100 text-amber-700",
            development: "bg-blue-100 text-blue-700",
        };
        return <Badge className={cn("capitalize", colors[env])}>{env}</Badge>;
    };

    const maskKey = (key: string) => {
        return key.slice(0, 12) + "..." + key.slice(-4);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getUsagePercentage = (used: number, limit: number) => {
        return Math.round((used / limit) * 100);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Manage projects, API keys, billing, and platform settings</p>
            </div>

            <Tabs defaultValue="projects" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="projects" className="gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Projects
                    </TabsTrigger>
                    <TabsTrigger value="api-keys" className="gap-2">
                        <Key className="h-4 w-4" />
                        API Keys
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Billing
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        General
                    </TabsTrigger>
                </TabsList>

                {/* Projects Tab */}
                <TabsContent value="projects" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                            <p className="text-sm text-slate-500">Manage your CartNudge projects</p>
                        </div>
                        <Button onClick={() => setShowCreateProject(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <div key={project.id} className="bg-white rounded-xl border p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold",
                                            project.environment === "production" ? "bg-gradient-to-br from-emerald-400 to-emerald-600" :
                                            project.environment === "staging" ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                                            "bg-gradient-to-br from-blue-400 to-blue-600"
                                        )}>
                                            {project.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{project.name}</h3>
                                                {getEnvironmentBadge(project.environment)}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                <span>Created {project.createdAt}</span>
                                                <span>•</span>
                                                <span>Active {project.lastActivity}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setShowDeleteConfirm(project.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* API Keys Tab */}
                <TabsContent value="api-keys" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
                            <p className="text-sm text-slate-500">Manage authentication keys for API access</p>
                        </div>
                        <Button onClick={() => setShowCreateKey(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create API Key
                        </Button>
                    </div>

                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-900 text-sm">Keep your secret keys secure</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Never expose secret keys in client-side code. Use public keys for browser integrations.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {apiKeys.map((key) => (
                            <div key={key.id} className="bg-white rounded-xl border p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900">{key.name}</h3>
                                            <Badge variant="outline" className={cn(
                                                key.type === "public" ? "text-blue-600" : "text-violet-600"
                                            )}>
                                                {key.type}
                                            </Badge>
                                            {key.status === "active" ? (
                                                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Revoked</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <code className="bg-slate-100 px-3 py-1.5 rounded font-mono text-sm">
                                                {showSecrets[key.id] ? key.key : maskKey(key.key)}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => setShowSecrets({ ...showSecrets, [key.id]: !showSecrets[key.id] })}
                                            >
                                                {showSecrets[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => copyToClipboard(key.key)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                            <span>Created {key.createdAt}</span>
                                            <span>•</span>
                                            <span>Last used {key.lastUsed || "Never"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm">
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Regenerate
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            Revoke
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* API Documentation Link */}
                    <div className="bg-slate-50 rounded-xl border p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                    <Globe className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">API Documentation</p>
                                    <p className="text-xs text-slate-500">Learn how to integrate CartNudge into your application</p>
                                </div>
                            </div>
                            <Button variant="outline">
                                View Docs
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-6">
                    {/* Current Plan */}
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-violet-200 text-sm font-medium">Current Plan</p>
                                <h2 className="text-3xl font-bold mt-1">{currentPlan.name}</h2>
                                <p className="text-violet-200 mt-2">
                                    {formatCurrency(currentPlan.price)}/month • Billed {currentPlan.billing}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    Change Plan
                                </Button>
                                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <p className="text-sm font-medium mb-3">Plan Features</p>
                            <div className="grid grid-cols-3 gap-2">
                                {currentPlan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 text-sm text-violet-100">
                                        <Check className="h-4 w-4" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Usage */}
                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Usage This Month</h3>
                                <p className="text-sm text-slate-500">Billing period: Dec 1 - Dec 31, 2024</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                On track
                            </Badge>
                        </div>

                        <div className="space-y-6">
                            {/* MAU */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Monthly Active Users</span>
                                    <span className="text-sm text-slate-500">
                                        {currentPlan.usage.mau.toLocaleString()} / {currentPlan.usage.mauLimit.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-violet-500 rounded-full"
                                        style={{ width: `${getUsagePercentage(currentPlan.usage.mau, currentPlan.usage.mauLimit)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {getUsagePercentage(currentPlan.usage.mau, currentPlan.usage.mauLimit)}% of limit
                                </p>
                            </div>

                            {/* Predictions */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">ML Predictions</span>
                                    <span className="text-sm text-slate-500">
                                        {(currentPlan.usage.predictions / 1000000).toFixed(1)}M / {(currentPlan.usage.predictionsLimit / 1000000).toFixed(0)}M
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${getUsagePercentage(currentPlan.usage.predictions, currentPlan.usage.predictionsLimit)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {getUsagePercentage(currentPlan.usage.predictions, currentPlan.usage.predictionsLimit)}% of limit
                                </p>
                            </div>

                            {/* Nudges */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Nudges Delivered</span>
                                    <span className="text-sm text-slate-500">
                                        {(currentPlan.usage.nudges / 1000).toFixed(1)}K / {(currentPlan.usage.nudgesLimit / 1000).toFixed(0)}K
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${getUsagePercentage(currentPlan.usage.nudges, currentPlan.usage.nudgesLimit)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {getUsagePercentage(currentPlan.usage.nudges, currentPlan.usage.nudgesLimit)}% of limit
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900">Payment Method</h3>
                            <Button variant="outline" size="sm">
                                Update
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="h-12 w-16 rounded bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-xs">
                                VISA
                            </div>
                            <div>
                                <p className="font-medium text-sm">•••• •••• •••• 4242</p>
                                <p className="text-xs text-slate-500">Expires 12/2026</p>
                            </div>
                        </div>
                    </div>

                    {/* Billing History */}
                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900">Billing History</h3>
                        </div>
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                            <Receipt className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{invoice.date}</p>
                                            <p className="text-xs text-slate-500">Invoice #{invoice.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{formatCurrency(invoice.amount)}</p>
                                            <Badge className={cn(
                                                "text-xs",
                                                invoice.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                                invoice.status === "pending" ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            )}>
                                                {invoice.status}
                                            </Badge>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* General Settings Tab */}
                <TabsContent value="general" className="space-y-6">
                    <div className="bg-white rounded-xl border p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Platform Settings</h2>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Webhook className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Webhook Retries</p>
                                        <p className="text-xs text-slate-500">Automatically retry failed webhook deliveries</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={settings.webhookRetries}
                                    onCheckedChange={(checked) => setSettings({ ...settings, webhookRetries: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Rate Limiting</p>
                                        <p className="text-xs text-slate-500">Protect against excessive API requests</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={settings.rateLimiting}
                                    onCheckedChange={(checked) => setSettings({ ...settings, rateLimiting: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                        <Zap className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Debug Mode</p>
                                        <p className="text-xs text-slate-500">Enable detailed logging for troubleshooting</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={settings.debugMode}
                                    onCheckedChange={(checked) => setSettings({ ...settings, debugMode: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Database className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Data Retention</p>
                                        <p className="text-xs text-slate-500">How long to keep event data</p>
                                    </div>
                                </div>
                                <Select 
                                    value={settings.dataRetention}
                                    onValueChange={(v) => setSettings({ ...settings, dataRetention: v })}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="60">60 days</SelectItem>
                                        <SelectItem value="90">90 days</SelectItem>
                                        <SelectItem value="180">180 days</SelectItem>
                                        <SelectItem value="365">1 year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Project Dialog */}
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Set up a new project to organize your nudge configurations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Project Name</Label>
                            <Input
                                placeholder="e.g., E-commerce Store"
                                value={newProject.name}
                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                placeholder="What is this project for?"
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                className="mt-1.5"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label>Environment</Label>
                            <Select 
                                value={newProject.environment}
                                onValueChange={(v) => setNewProject({ ...newProject, environment: v })}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="development">Development</SelectItem>
                                    <SelectItem value="staging">Staging</SelectItem>
                                    <SelectItem value="production">Production</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                            Cancel
                        </Button>
                        <Button 
                            disabled={!newProject.name.trim()}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            Create Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create API Key Dialog */}
            <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                            Generate a new API key for authentication.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Key Name</Label>
                            <Input
                                placeholder="e.g., Production Server Key"
                                value={newKey.name}
                                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Key Type</Label>
                            <Select 
                                value={newKey.type}
                                onValueChange={(v) => setNewKey({ ...newKey, type: v })}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public (Client-side)</SelectItem>
                                    <SelectItem value="secret">Secret (Server-side)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1.5">
                                {newKey.type === "public" 
                                    ? "Safe to use in browser code" 
                                    : "Keep this key secure - never expose in client code"}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                            Cancel
                        </Button>
                        <Button 
                            disabled={!newKey.name.trim()}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            Generate Key
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this project? This action cannot be undone and will remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive">
                            Delete Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
