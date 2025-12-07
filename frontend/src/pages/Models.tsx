import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Brain,
    Plus,
    Search,
    AlertTriangle,
    DollarSign,
    ShoppingCart,
    Target,
    Clock,
    Check,
    RefreshCw,
    Rocket,
    ExternalLink,
    Copy,
    Settings,
    BarChart3,
    Activity,
    Zap,
    Database,
    Code,
    ChevronRight,
    Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// Types
type ModelStatus = "draft" | "awaiting_deployment" | "training" | "active" | "failed" | "paused";
type PendingAction = "create" | "update" | "delete" | null;

interface ModelType {
    id: string;
    name: string;
    description: string;
    icon: typeof Brain;
    category: "conversion" | "retention" | "revenue" | "engagement";
    defaultParams: TrainingParams;
}

interface TrainingParams {
    learningRate: number;
    epochs: number;
    batchSize: number;
    validationSplit: number;
    earlyStoppingPatience: number;
    l2Regularization: number;
    dropoutRate: number;
    hiddenLayers: number[];
    optimizer: "adam" | "sgd" | "rmsprop";
    lossFunction: "binary_crossentropy" | "mse" | "categorical_crossentropy";
}

interface TrainingMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    logloss: number;
    lastTrainedAt: string;
    trainingDuration: string;
    dataPoints: number;
}

interface PredictionModel {
    id: string;
    name: string;
    type: ModelType;
    sourceDatablock: string;
    trainingParams: TrainingParams;
    status: ModelStatus;
    pendingAction: PendingAction;
    metrics?: TrainingMetrics;
    version: number;
    createdAt: string;
    lastUpdated: string;
    inferenceEndpoint?: string;
    apiKey?: string;
}

// Model Types/Templates
const modelTypes: ModelType[] = [
    {
        id: "purchase_probability",
        name: "Purchase Probability",
        description: "Predicts the likelihood of a user completing a purchase in the current session",
        icon: ShoppingCart,
        category: "conversion",
        defaultParams: {
            learningRate: 0.001,
            epochs: 100,
            batchSize: 32,
            validationSplit: 0.2,
            earlyStoppingPatience: 10,
            l2Regularization: 0.01,
            dropoutRate: 0.3,
            hiddenLayers: [64, 32],
            optimizer: "adam",
            lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "churn_risk",
        name: "Churn Risk",
        description: "Identifies users likely to stop using the platform or unsubscribe",
        icon: AlertTriangle,
        category: "retention",
        defaultParams: {
            learningRate: 0.0005,
            epochs: 150,
            batchSize: 64,
            validationSplit: 0.2,
            earlyStoppingPatience: 15,
            l2Regularization: 0.02,
            dropoutRate: 0.4,
            hiddenLayers: [128, 64, 32],
            optimizer: "adam",
            lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "ltv_prediction",
        name: "Lifetime Value",
        description: "Estimates the total lifetime value of a customer based on early signals",
        icon: DollarSign,
        category: "revenue",
        defaultParams: {
            learningRate: 0.001,
            epochs: 200,
            batchSize: 32,
            validationSplit: 0.15,
            earlyStoppingPatience: 20,
            l2Regularization: 0.01,
            dropoutRate: 0.2,
            hiddenLayers: [128, 64],
            optimizer: "adam",
            lossFunction: "mse",
        },
    },
    {
        id: "cart_abandonment",
        name: "Cart Abandonment",
        description: "Predicts if a user will abandon their cart before checkout",
        icon: ShoppingCart,
        category: "conversion",
        defaultParams: {
            learningRate: 0.001,
            epochs: 80,
            batchSize: 64,
            validationSplit: 0.2,
            earlyStoppingPatience: 8,
            l2Regularization: 0.015,
            dropoutRate: 0.35,
            hiddenLayers: [64, 32],
            optimizer: "adam",
            lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "next_purchase_timing",
        name: "Next Purchase Timing",
        description: "Predicts when a user is most likely to make their next purchase",
        icon: Clock,
        category: "engagement",
        defaultParams: {
            learningRate: 0.0008,
            epochs: 120,
            batchSize: 32,
            validationSplit: 0.2,
            earlyStoppingPatience: 12,
            l2Regularization: 0.01,
            dropoutRate: 0.25,
            hiddenLayers: [96, 48],
            optimizer: "adam",
            lossFunction: "mse",
        },
    },
    {
        id: "product_affinity",
        name: "Product Affinity",
        description: "Predicts which product categories a user is most interested in",
        icon: Target,
        category: "engagement",
        defaultParams: {
            learningRate: 0.001,
            epochs: 100,
            batchSize: 64,
            validationSplit: 0.2,
            earlyStoppingPatience: 10,
            l2Regularization: 0.02,
            dropoutRate: 0.3,
            hiddenLayers: [128, 64, 32],
            optimizer: "adam",
            lossFunction: "categorical_crossentropy",
        },
    },
];

// Available datablocks for training
const availableDatablocks = [
    { id: "user_features", name: "user_features", type: "aggregated", fields: 12 },
    { id: "cart_features", name: "cart_features", type: "aggregated", fields: 8 },
    { id: "browsing_events", name: "browsing_events", type: "direct", fields: 6 },
    { id: "user_profiles", name: "user_profiles", type: "direct", fields: 4 },
];

// Sample models
const sampleModels: PredictionModel[] = [
    {
        id: "model_1",
        name: "Purchase Intent v2",
        type: modelTypes[0],
        sourceDatablock: "user_features",
        trainingParams: modelTypes[0].defaultParams,
        status: "active",
        pendingAction: null,
        metrics: {
            accuracy: 0.847,
            precision: 0.823,
            recall: 0.791,
            f1Score: 0.807,
            auc: 0.892,
            logloss: 0.342,
            lastTrainedAt: "2 hours ago",
            trainingDuration: "45 mins",
            dataPoints: 125847,
        },
        version: 2,
        createdAt: "Dec 1, 2025",
        lastUpdated: "2 hours ago",
        inferenceEndpoint: "https://api.cartnudge.ai/v1/predict/purchase_intent",
        apiKey: "cnk_model_xxxxxxxxxxxxxxxx",
    },
    {
        id: "model_2",
        name: "Churn Predictor",
        type: modelTypes[1],
        sourceDatablock: "user_features",
        trainingParams: modelTypes[1].defaultParams,
        status: "training",
        pendingAction: null,
        version: 1,
        createdAt: "Dec 5, 2025",
        lastUpdated: "30 mins ago",
    },
    {
        id: "model_3",
        name: "Cart Abandonment Detector",
        type: modelTypes[3],
        sourceDatablock: "cart_features",
        trainingParams: modelTypes[3].defaultParams,
        status: "active",
        pendingAction: null,
        metrics: {
            accuracy: 0.789,
            precision: 0.756,
            recall: 0.812,
            f1Score: 0.783,
            auc: 0.845,
            logloss: 0.412,
            lastTrainedAt: "1 day ago",
            trainingDuration: "32 mins",
            dataPoints: 89234,
        },
        version: 1,
        createdAt: "Dec 3, 2025",
        lastUpdated: "1 day ago",
        inferenceEndpoint: "https://api.cartnudge.ai/v1/predict/cart_abandonment",
        apiKey: "cnk_model_yyyyyyyyyyyyyyyy",
    },
];

export default function Models() {
    const [models, setModels] = useState<PredictionModel[]>(sampleModels);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedModel, setSelectedModel] = useState<PredictionModel | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [savedToBucket, setSavedToBucket] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "params" | "inference">("overview");

    // Create model state
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [newModel, setNewModel] = useState({
        name: "",
        type: null as ModelType | null,
        sourceDatablock: "",
        trainingParams: null as TrainingParams | null,
    });

    const filteredModels = models.filter(
        (model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.type.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const resetCreateForm = () => {
        setCreateStep(1);
        setNewModel({
            name: "",
            type: null,
            sourceDatablock: "",
            trainingParams: null,
        });
    };

    const handleSelectModelType = (type: ModelType) => {
        setNewModel({
            ...newModel,
            type,
            trainingParams: { ...type.defaultParams },
        });
    };

    const handleCreateModel = () => {
        if (!newModel.name || !newModel.type || !newModel.sourceDatablock || !newModel.trainingParams) return;

        const model: PredictionModel = {
            id: `model_${Date.now()}`,
            name: newModel.name,
            type: newModel.type,
            sourceDatablock: newModel.sourceDatablock,
            trainingParams: newModel.trainingParams,
            status: "awaiting_deployment",
            pendingAction: "create",
            version: 1,
            createdAt: "Just now",
            lastUpdated: "Just now",
        };

        setModels([...models, model]);
        setSelectedModel(model);
        setIsCreating(false);
        resetCreateForm();
        setSavedToBucket(true);
        setTimeout(() => setSavedToBucket(false), 5000);
    };

    const handleCopy = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedSnippet(type);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const handleCloseDrawer = () => {
        setSelectedModel(null);
        setActiveTab("overview");
        setSavedToBucket(false);
    };

    const handleRevertChanges = () => {
        if (!selectedModel) return;

        if (selectedModel.pendingAction === "create") {
            setModels(models.filter((m) => m.id !== selectedModel.id));
            setSelectedModel(null);
        } else {
            const updatedModel = {
                ...selectedModel,
                status: "active" as ModelStatus,
                pendingAction: null as PendingAction,
            };
            setModels(models.map((m) => (m.id === selectedModel.id ? updatedModel : m)));
            setSelectedModel(updatedModel);
        }
    };

    const getStatusBadge = (status: ModelStatus, pendingAction?: PendingAction) => {
        if (pendingAction === "create") {
            return (
                <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Create Pending
                </Badge>
            );
        }
        if (pendingAction === "delete") {
            return (
                <Badge className="bg-red-100 text-red-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Delete Pending
                </Badge>
            );
        }
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
            case "training":
                return (
                    <Badge className="bg-blue-100 text-blue-700">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Training
                    </Badge>
                );
            case "failed":
                return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
            case "paused":
                return <Badge className="bg-slate-100 text-slate-600">Paused</Badge>;
            case "draft":
                return <Badge className="bg-slate-100 text-slate-600">Draft</Badge>;
            case "awaiting_deployment":
                return (
                    <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getCategoryBadge = (category: ModelType["category"]) => {
        const colors = {
            conversion: "bg-emerald-100 text-emerald-700",
            retention: "bg-orange-100 text-orange-700",
            revenue: "bg-violet-100 text-violet-700",
            engagement: "bg-blue-100 text-blue-700",
        };
        return <Badge className={cn("text-xs capitalize", colors[category])}>{category}</Badge>;
    };

    const generateCurlSnippet = (model: PredictionModel) => {
        return `curl -X POST "${model.inferenceEndpoint}" \\
  -H "Authorization: Bearer ${model.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_123",
    "features": {
      "total_page_views_30d": 45,
      "avg_cart_value_7d": 89.50,
      "purchase_count_90d": 3
    }
  }'`;
    };

    const generateJsSnippet = (model: PredictionModel) => {
        return `const response = await fetch("${model.inferenceEndpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${model.apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    user_id: "user_123",
    features: {
      total_page_views_30d: 45,
      avg_cart_value_7d: 89.50,
      purchase_count_90d: 3
    }
  })
});

const prediction = await response.json();
console.log(prediction);
// { "probability": 0.73, "confidence": "high", "factors": [...] }`;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Prediction Models</h1>
                    <p className="text-slate-500 mt-1">
                        Train and deploy ML models to predict user behavior
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreating(true)}
                    className="gap-2 bg-slate-900 hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" />
                    Create Model
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{models.length}</p>
                                <p className="text-sm text-slate-500">Total Models</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {models.filter((m) => m.status === "active").length}
                                </p>
                                <p className="text-sm text-slate-500">Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {models.filter((m) => m.status === "training").length}
                                </p>
                                <p className="text-sm text-slate-500">Training</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {models.filter((m) => m.metrics).reduce((acc, m) => acc + (m.metrics?.dataPoints || 0), 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-slate-500">Predictions Made</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => {
                    const Icon = model.type.icon;
                    return (
                        <Card
                            key={model.id}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                model.status === "active" && "border-emerald-200"
                            )}
                            onClick={() => setSelectedModel(model)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                            model.status === "active" ? "bg-emerald-100" : "bg-slate-100"
                                        )}>
                                            <Icon className={cn(
                                                "h-5 w-5",
                                                model.status === "active" ? "text-emerald-600" : "text-slate-500"
                                            )} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{model.name}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">{model.type.name}</CardDescription>
                                        </div>
                                    </div>
                                    {getStatusBadge(model.status, model.pendingAction)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                    {model.type.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <Database className="h-3.5 w-3.5" />
                                    <code className="bg-slate-100 px-1.5 py-0.5 rounded">{model.sourceDatablock}</code>
                                </div>
                                {model.metrics && (
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-900">{(model.metrics.accuracy * 100).toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500">Accuracy</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-900">{(model.metrics.auc * 100).toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500">AUC</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-900">v{model.version}</p>
                                            <p className="text-xs text-slate-500">Version</p>
                                        </div>
                                    </div>
                                )}
                                {!model.metrics && model.status === "training" && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-sm text-blue-600">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Training in progress...
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {filteredModels.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Brain className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-2">No models found</p>
                        <Button variant="outline" onClick={() => setIsCreating(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first model
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Model Dialog */}
            <Sheet open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) resetCreateForm(); }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Create Prediction Model</SheetTitle>
                    </SheetHeader>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mt-6 mb-8">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2 flex-1">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                                    createStep >= step
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-400"
                                )}>
                                    {step}
                                </div>
                                <span className={cn(
                                    "text-sm",
                                    createStep >= step ? "text-slate-900" : "text-slate-400"
                                )}>
                                    {step === 1 ? "Model Type" : step === 2 ? "Data Source" : "Parameters"}
                                </span>
                                {step < 3 && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Select Model Type */}
                    {createStep === 1 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Model Name</Label>
                                <Input
                                    placeholder="e.g., Purchase Intent v1"
                                    value={newModel.name}
                                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Select Model Type</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-3">
                                    Choose the type of prediction you want to make
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {modelTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <div
                                                key={type.id}
                                                className={cn(
                                                    "p-4 rounded-lg border cursor-pointer transition-all",
                                                    newModel.type?.id === type.id
                                                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => handleSelectModelType(type)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                                        newModel.type?.id === type.id ? "bg-slate-900" : "bg-slate-100"
                                                    )}>
                                                        <Icon className={cn(
                                                            "h-5 w-5",
                                                            newModel.type?.id === type.id ? "text-white" : "text-slate-600"
                                                        )} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-slate-900">{type.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{type.description}</p>
                                                        <div className="mt-2">
                                                            {getCategoryBadge(type.category)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => setCreateStep(2)}
                                    disabled={!newModel.name || !newModel.type}
                                    className="flex-1 bg-slate-900"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Data Source */}
                    {createStep === 2 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Source Datablock</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-3">
                                    Select the datablock containing features for training
                                </p>
                                <div className="space-y-2">
                                    {availableDatablocks.map((db) => (
                                        <div
                                            key={db.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                                                newModel.sourceDatablock === db.name
                                                    ? "border-slate-900 bg-slate-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                            onClick={() => setNewModel({ ...newModel, sourceDatablock: db.name })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    newModel.sourceDatablock === db.name ? "bg-slate-900" : "bg-slate-100"
                                                )}>
                                                    <Database className={cn(
                                                        "h-5 w-5",
                                                        newModel.sourceDatablock === db.name ? "text-white" : "text-slate-600"
                                                    )} />
                                                </div>
                                                <div>
                                                    <code className="font-mono text-sm font-medium">{db.name}</code>
                                                    <p className="text-xs text-slate-500">{db.fields} features • {db.type}</p>
                                                </div>
                                            </div>
                                            {newModel.sourceDatablock === db.name && (
                                                <Check className="h-5 w-5 text-slate-900" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep(1)} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={() => setCreateStep(3)}
                                    disabled={!newModel.sourceDatablock}
                                    className="flex-1 bg-slate-900"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Training Parameters */}
                    {createStep === 3 && newModel.trainingParams && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium">Training Configuration</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Default parameters are optimized for {newModel.type?.name}. Adjust as needed.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Learning Rate</Label>
                                    <Input
                                        type="number"
                                        step="0.0001"
                                        value={newModel.trainingParams.learningRate}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, learningRate: parseFloat(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Epochs</Label>
                                    <Input
                                        type="number"
                                        value={newModel.trainingParams.epochs}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, epochs: parseInt(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Batch Size</Label>
                                    <Select
                                        value={newModel.trainingParams.batchSize.toString()}
                                        onValueChange={(v) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, batchSize: parseInt(v) }
                                        })}
                                    >
                                        <SelectTrigger className="mt-1 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[16, 32, 64, 128, 256].map((size) => (
                                                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Validation Split</Label>
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0.1"
                                        max="0.4"
                                        value={newModel.trainingParams.validationSplit}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, validationSplit: parseFloat(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Early Stopping Patience</Label>
                                    <Input
                                        type="number"
                                        value={newModel.trainingParams.earlyStoppingPatience}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, earlyStoppingPatience: parseInt(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Optimizer</Label>
                                    <Select
                                        value={newModel.trainingParams.optimizer}
                                        onValueChange={(v) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, optimizer: v as TrainingParams["optimizer"] }
                                        })}
                                    >
                                        <SelectTrigger className="mt-1 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="adam">Adam</SelectItem>
                                            <SelectItem value="sgd">SGD</SelectItem>
                                            <SelectItem value="rmsprop">RMSprop</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Dropout Rate</Label>
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0"
                                        max="0.8"
                                        value={newModel.trainingParams.dropoutRate}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, dropoutRate: parseFloat(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">L2 Regularization</Label>
                                    <Input
                                        type="number"
                                        step="0.005"
                                        min="0"
                                        value={newModel.trainingParams.l2Regularization}
                                        onChange={(e) => setNewModel({
                                            ...newModel,
                                            trainingParams: { ...newModel.trainingParams!, l2Regularization: parseFloat(e.target.value) }
                                        })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Hidden Layers</Label>
                                <p className="text-xs text-slate-500 mb-2">Network architecture (neurons per layer)</p>
                                <div className="flex items-center gap-2">
                                    {newModel.trainingParams.hiddenLayers.map((layer, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-sm">
                                            {layer}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep(2)} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateModel}
                                    className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
                                >
                                    <Rocket className="h-4 w-4" />
                                    Create & Deploy
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Model Detail Sheet */}
            <Sheet open={!!selectedModel} onOpenChange={handleCloseDrawer}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {selectedModel && (
                        <>
                            <SheetHeader className="p-6 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                        selectedModel.status === "active" ? "bg-emerald-100" : "bg-slate-100"
                                    )}>
                                        {(() => {
                                            const Icon = selectedModel.type.icon;
                                            return <Icon className={cn(
                                                "h-6 w-6",
                                                selectedModel.status === "active" ? "text-emerald-600" : "text-slate-500"
                                            )} />;
                                        })()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <SheetTitle className="text-xl">{selectedModel.name}</SheetTitle>
                                            {getStatusBadge(selectedModel.status, selectedModel.pendingAction)}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{selectedModel.type.name}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                            <span>v{selectedModel.version}</span>
                                            <span>•</span>
                                            <span>Created {selectedModel.createdAt}</span>
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>

                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
                                <div className="px-6 pt-4 border-b border-slate-100">
                                    <TabsList className="bg-slate-100/80 p-1">
                                        <TabsTrigger value="overview" className="gap-2 text-sm">
                                            <BarChart3 className="h-4 w-4" />
                                            Overview
                                        </TabsTrigger>
                                        <TabsTrigger value="params" className="gap-2 text-sm">
                                            <Settings className="h-4 w-4" />
                                            Parameters
                                        </TabsTrigger>
                                        {selectedModel.status === "active" && (
                                            <TabsTrigger value="inference" className="gap-2 text-sm">
                                                <Code className="h-4 w-4" />
                                                Inference API
                                            </TabsTrigger>
                                        )}
                                    </TabsList>
                                </div>

                                {/* Overview Tab */}
                                <TabsContent value="overview" className="p-6 pt-4 m-0">
                                    <div className="space-y-6">
                                        {/* Source */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Data Source</h4>
                                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                                <Database className="h-4 w-4 text-slate-500" />
                                                <code className="font-mono text-sm">{selectedModel.sourceDatablock}</code>
                                            </div>
                                        </div>

                                        {/* Metrics */}
                                        {selectedModel.metrics ? (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Model Performance</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {(selectedModel.metrics.accuracy * 100).toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">Accuracy</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {(selectedModel.metrics.precision * 100).toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">Precision</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {(selectedModel.metrics.recall * 100).toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">Recall</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {(selectedModel.metrics.f1Score * 100).toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">F1 Score</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {(selectedModel.metrics.auc * 100).toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">AUC-ROC</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                        <p className="text-2xl font-bold text-slate-900">
                                                            {selectedModel.metrics.logloss.toFixed(3)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">Log Loss</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
                                                    <span>Last trained: {selectedModel.metrics.lastTrainedAt}</span>
                                                    <span>{selectedModel.metrics.dataPoints.toLocaleString()} data points</span>
                                                </div>
                                            </div>
                                        ) : selectedModel.status === "training" ? (
                                            <div className="p-8 text-center border border-dashed rounded-lg">
                                                <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
                                                <p className="text-sm font-medium text-slate-900">Training in Progress</p>
                                                <p className="text-xs text-slate-500 mt-1">Metrics will be available after training completes</p>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center border border-dashed rounded-lg">
                                                <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                                <p className="text-sm text-slate-500">No metrics available</p>
                                                <p className="text-xs text-slate-400 mt-1">Deploy and train the model to see metrics</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Parameters Tab */}
                                <TabsContent value="params" className="p-6 pt-4 m-0">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-slate-900">Training Parameters</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(selectedModel.trainingParams).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                    <span className="text-sm text-slate-600 capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                    <span className="text-sm font-mono font-medium">
                                                        {Array.isArray(value) ? `[${value.join(', ')}]` : value.toString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Inference API Tab */}
                                {selectedModel.status === "active" && (
                                    <TabsContent value="inference" className="p-6 pt-4 m-0">
                                        <div className="space-y-6">
                                            {/* Endpoint */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Inference Endpoint</h4>
                                                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg">
                                                    <code className="flex-1 text-sm text-emerald-400 font-mono">
                                                        POST {selectedModel.inferenceEndpoint}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCopy(selectedModel.inferenceEndpoint || "", "endpoint")}
                                                        className="text-slate-400 hover:text-white"
                                                    >
                                                        {copiedSnippet === "endpoint" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* API Key */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-2">API Key</h4>
                                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                                                    <code className="flex-1 text-sm font-mono text-slate-600">
                                                        {selectedModel.apiKey}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCopy(selectedModel.apiKey || "", "apikey")}
                                                    >
                                                        {copiedSnippet === "apikey" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Code Snippets */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Code Examples</h4>
                                                <Tabs defaultValue="curl">
                                                    <TabsList className="bg-slate-100">
                                                        <TabsTrigger value="curl">cURL</TabsTrigger>
                                                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="curl" className="mt-3">
                                                        <div className="relative">
                                                            <pre className="p-4 bg-slate-900 rounded-lg overflow-x-auto">
                                                                <code className="text-sm text-slate-300">
                                                                    {generateCurlSnippet(selectedModel)}
                                                                </code>
                                                            </pre>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCopy(generateCurlSnippet(selectedModel), "curl")}
                                                                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                                            >
                                                                {copiedSnippet === "curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </TabsContent>
                                                    <TabsContent value="javascript" className="mt-3">
                                                        <div className="relative">
                                                            <pre className="p-4 bg-slate-900 rounded-lg overflow-x-auto">
                                                                <code className="text-sm text-slate-300">
                                                                    {generateJsSnippet(selectedModel)}
                                                                </code>
                                                            </pre>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCopy(generateJsSnippet(selectedModel), "js")}
                                                                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                                            >
                                                                {copiedSnippet === "js" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </div>

                                            {/* Response Format */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Response Format</h4>
                                                <pre className="p-4 bg-slate-50 rounded-lg border overflow-x-auto">
                                                    <code className="text-sm text-slate-600">
{`{
  "prediction": {
    "probability": 0.73,
    "confidence": "high",
    "threshold": 0.5
  },
  "factors": [
    { "feature": "total_page_views_30d", "importance": 0.32 },
    { "feature": "avg_cart_value_7d", "importance": 0.28 },
    { "feature": "purchase_count_90d", "importance": 0.21 }
  ],
  "model_version": "${selectedModel.version}",
  "latency_ms": 12
}`}
                                                    </code>
                                                </pre>
                                            </div>
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>

                            {/* Saved to Bucket Message */}
                            {savedToBucket && (
                                <div className="mx-6 mb-0 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                                <Check className="h-4 w-4 text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-violet-900">Saved to deployment bucket</p>
                                                <p className="text-xs text-violet-600">Go to Deployments to deploy</p>
                                            </div>
                                        </div>
                                        <Link to="/deployments">
                                            <Button size="sm" variant="outline" className="gap-1.5 text-violet-700 border-violet-300">
                                                <Rocket className="h-3.5 w-3.5" />
                                                View
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="sticky bottom-0 p-6 border-t border-slate-200 bg-white">
                                {selectedModel.pendingAction ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-amber-700">
                                            <AlertTriangle className="h-4 w-4" />
                                            {selectedModel.pendingAction === "create"
                                                ? "Creation pending deployment"
                                                : selectedModel.pendingAction === "delete"
                                                ? "Deletion pending deployment"
                                                : "Changes pending deployment"}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" onClick={handleCloseDrawer}>
                                                Close
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleRevertChanges}
                                                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                                            >
                                                <Undo2 className="h-4 w-4" />
                                                Revert Changes
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-end">
                                        <Button variant="outline" onClick={handleCloseDrawer}>
                                            Close
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
