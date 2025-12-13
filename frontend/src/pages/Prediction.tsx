import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    Settings,
    Activity,
    Zap,
    Database,
    ChevronRight,
    ChevronDown,
    Calendar,
    Play,
    Pause,
    Download,
    Eye,
    Layers,
    Timer,
    CheckCircle,
    XCircle,
    MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

type ModelStatus = "draft" | "awaiting_deployment" | "training" | "active" | "failed" | "paused";
type PendingAction = "create" | "update" | "delete" | null;
type TrainingJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
type DatasetStatus = "generating" | "ready" | "expired" | "failed";

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

interface TrainingDataset {
    id: string;
    name: string;
    modelTypeId: string; // Which model type this dataset is for
    generatedAt: string;
    status: DatasetStatus;
    trigger: "scheduled" | "manual";
    dataWindow: {
        start: string;
        end: string;
    };
    stats: {
        totalUsers: number;
        totalEvents: number;
        positiveLabels: number;
        negativeLabels: number;
        featureCount: number;
    };
    labelType: string;
    expiresAt: string;
    size: string;
    usedInJobs: string[];
}

// Training data definition per model type
interface TrainingDataDefinition {
    modelTypeId: string;
    modelTypeName: string;
    icon: typeof ShoppingCart;
    category: "conversion" | "retention" | "revenue" | "engagement";
    label: {
        name: string;
        description: string;
        positiveCondition: string;
        negativeCondition: string;
        lookAheadWindow: string;
    };
    features: {
        groups: string[];
        totalCount: number;
        keyFeatures: string[];
    };
    dataRequirements: {
        minUsers: number;
        minEvents: number;
        lookbackDays: number;
    };
    scheduleEnabled: boolean;
}

interface TrainingJob {
    id: string;
    name: string;
    modelId: string;
    modelName: string;
    datasetId: string;
    datasetName: string;
    status: TrainingJobStatus;
    progress: number;
    startedAt: string;
    completedAt?: string;
    duration?: string;
    metrics?: {
        accuracy: number;
        auc: number;
        loss: number;
    };
    triggeredBy: "manual" | "automation";
    automationRule?: string;
}

interface AutomationConfig {
    enabled: boolean;
    trainOnNewDataset: boolean;
    minDatasetSize: number;
    maxConcurrentJobs: number;
    retryOnFailure: boolean;
    notifyOnCompletion: boolean;
}

// ============================================================================
// Sample Data
// ============================================================================

const modelTypes: ModelType[] = [
    {
        id: "purchase_probability",
        name: "Purchase Probability",
        description: "Predicts the likelihood of a user completing a purchase",
        icon: ShoppingCart,
        category: "conversion",
        defaultParams: {
            learningRate: 0.001, epochs: 100, batchSize: 32, validationSplit: 0.2,
            earlyStoppingPatience: 10, l2Regularization: 0.01, dropoutRate: 0.3,
            hiddenLayers: [64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "churn_risk",
        name: "Churn Risk",
        description: "Identifies users likely to churn",
        icon: AlertTriangle,
        category: "retention",
        defaultParams: {
            learningRate: 0.0005, epochs: 150, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 15, l2Regularization: 0.02, dropoutRate: 0.4,
            hiddenLayers: [128, 64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "ltv_prediction",
        name: "Lifetime Value",
        description: "Estimates customer lifetime value",
        icon: DollarSign,
        category: "revenue",
        defaultParams: {
            learningRate: 0.001, epochs: 200, batchSize: 32, validationSplit: 0.15,
            earlyStoppingPatience: 20, l2Regularization: 0.01, dropoutRate: 0.2,
            hiddenLayers: [128, 64], optimizer: "adam", lossFunction: "mse",
        },
    },
    {
        id: "cart_abandonment",
        name: "Cart Abandonment",
        description: "Predicts cart abandonment risk",
        icon: ShoppingCart,
        category: "conversion",
        defaultParams: {
            learningRate: 0.001, epochs: 80, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 8, l2Regularization: 0.015, dropoutRate: 0.35,
            hiddenLayers: [64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
    },
    {
        id: "next_purchase_timing",
        name: "Next Purchase Timing",
        description: "Predicts when user will purchase next",
        icon: Clock,
        category: "engagement",
        defaultParams: {
            learningRate: 0.0008, epochs: 120, batchSize: 32, validationSplit: 0.2,
            earlyStoppingPatience: 12, l2Regularization: 0.01, dropoutRate: 0.25,
            hiddenLayers: [96, 48], optimizer: "adam", lossFunction: "mse",
        },
    },
    {
        id: "product_affinity",
        name: "Product Affinity",
        description: "Predicts product category interests",
        icon: Target,
        category: "engagement",
        defaultParams: {
            learningRate: 0.001, epochs: 100, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 10, l2Regularization: 0.02, dropoutRate: 0.3,
            hiddenLayers: [128, 64, 32], optimizer: "adam", lossFunction: "categorical_crossentropy",
        },
    },
];

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
            accuracy: 0.847, precision: 0.823, recall: 0.791, f1Score: 0.807,
            auc: 0.892, logloss: 0.342, lastTrainedAt: "2 hours ago",
            trainingDuration: "45 mins", dataPoints: 125847,
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
            accuracy: 0.789, precision: 0.756, recall: 0.812, f1Score: 0.783,
            auc: 0.845, logloss: 0.412, lastTrainedAt: "1 day ago",
            trainingDuration: "32 mins", dataPoints: 89234,
        },
        version: 1,
        createdAt: "Dec 3, 2025",
        lastUpdated: "1 day ago",
        inferenceEndpoint: "https://api.cartnudge.ai/v1/predict/cart_abandonment",
        apiKey: "cnk_model_yyyyyyyyyyyyyyyy",
    },
];

// Training data definitions for each model type
const trainingDataDefinitions: TrainingDataDefinition[] = [
    {
        modelTypeId: "purchase_probability",
        modelTypeName: "Purchase Probability",
        icon: ShoppingCart,
        category: "conversion",
        label: {
            name: "Purchased Within 24 Hours",
            description: "Binary label indicating if user completed a purchase within 24 hours of feature snapshot",
            positiveCondition: "User placed an order within 24 hours",
            negativeCondition: "User did not place an order within 24 hours",
            lookAheadWindow: "24 hours",
        },
        features: {
            groups: ["Cart Behavior", "Page Engagement", "Purchase History", "Recency"],
            totalCount: 28,
            keyFeatures: ["cart_adds_7d", "page_views_30d", "avg_cart_value", "days_since_last_order"],
        },
        dataRequirements: { minUsers: 5000, minEvents: 100000, lookbackDays: 30 },
        scheduleEnabled: true,
    },
    {
        modelTypeId: "churn_risk",
        modelTypeName: "Churn Risk",
        icon: AlertTriangle,
        category: "retention",
        label: {
            name: "Churned Within 30 Days",
            description: "Binary label indicating if user became inactive (no activity) within 30 days",
            positiveCondition: "User had no activity in the following 30 days",
            negativeCondition: "User remained active within 30 days",
            lookAheadWindow: "30 days",
        },
        features: {
            groups: ["Engagement Scores", "Recency", "Page Engagement", "Purchase History"],
            totalCount: 24,
            keyFeatures: ["engagement_score", "days_since_last_visit", "sessions_30d", "orders_90d"],
        },
        dataRequirements: { minUsers: 10000, minEvents: 500000, lookbackDays: 90 },
        scheduleEnabled: true,
    },
    {
        modelTypeId: "cart_abandonment",
        modelTypeName: "Cart Abandonment",
        icon: ShoppingCart,
        category: "conversion",
        label: {
            name: "Abandoned Cart",
            description: "Binary label indicating if user abandoned their cart (added items but no checkout within 2 hours)",
            positiveCondition: "User added to cart but did not checkout within 2 hours",
            negativeCondition: "User completed checkout or removed items",
            lookAheadWindow: "2 hours",
        },
        features: {
            groups: ["Cart Behavior", "Page Engagement", "Recency"],
            totalCount: 18,
            keyFeatures: ["cart_value", "cart_item_count", "time_on_site", "previous_abandonment_rate"],
        },
        dataRequirements: { minUsers: 3000, minEvents: 50000, lookbackDays: 14 },
        scheduleEnabled: true,
    },
    {
        modelTypeId: "ltv_prediction",
        modelTypeName: "Lifetime Value",
        icon: DollarSign,
        category: "revenue",
        label: {
            name: "90-Day Revenue",
            description: "Continuous value representing total revenue from user in the next 90 days",
            positiveCondition: "Sum of order values in next 90 days (regression target)",
            negativeCondition: "N/A (continuous value)",
            lookAheadWindow: "90 days",
        },
        features: {
            groups: ["Purchase History", "Cart Behavior", "Engagement Scores"],
            totalCount: 22,
            keyFeatures: ["total_revenue_90d", "avg_order_value", "purchase_frequency", "customer_tenure"],
        },
        dataRequirements: { minUsers: 5000, minEvents: 200000, lookbackDays: 180 },
        scheduleEnabled: false,
    },
    {
        modelTypeId: "next_purchase_timing",
        modelTypeName: "Next Purchase Timing",
        icon: Clock,
        category: "engagement",
        label: {
            name: "Days Until Next Purchase",
            description: "Continuous value predicting days until user's next purchase",
            positiveCondition: "Number of days until next order (regression target)",
            negativeCondition: "N/A (continuous value)",
            lookAheadWindow: "60 days",
        },
        features: {
            groups: ["Purchase History", "Recency", "Engagement Scores"],
            totalCount: 20,
            keyFeatures: ["avg_days_between_orders", "days_since_last_order", "purchase_frequency"],
        },
        dataRequirements: { minUsers: 8000, minEvents: 300000, lookbackDays: 120 },
        scheduleEnabled: false,
    },
];

const sampleDatasets: TrainingDataset[] = [
    // Purchase Probability Datasets
    {
        id: "ds_pp_001",
        name: "Purchase - Dec 13",
        modelTypeId: "purchase_probability",
        generatedAt: "Dec 13, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Dec 12, 2025 00:00", end: "Dec 12, 2025 23:59" },
        stats: {
            totalUsers: 15234, totalEvents: 892456, positiveLabels: 3456,
            negativeLabels: 11778, featureCount: 28,
        },
        labelType: "purchase_24h",
        expiresAt: "Dec 20, 2025",
        size: "245 MB",
        usedInJobs: ["job_003"],
    },
    {
        id: "ds_pp_002",
        name: "Purchase - Dec 12",
        modelTypeId: "purchase_probability",
        generatedAt: "Dec 12, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Dec 11, 2025 00:00", end: "Dec 11, 2025 23:59" },
        stats: {
            totalUsers: 14892, totalEvents: 876234, positiveLabels: 3201,
            negativeLabels: 11691, featureCount: 28,
        },
        labelType: "purchase_24h",
        expiresAt: "Dec 19, 2025",
        size: "238 MB",
        usedInJobs: ["job_002"],
    },
    // Churn Risk Datasets
    {
        id: "ds_churn_001",
        name: "Churn - Dec 13",
        modelTypeId: "churn_risk",
        generatedAt: "Dec 13, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Nov 13, 2025 00:00", end: "Dec 12, 2025 23:59" },
        stats: {
            totalUsers: 28567, totalEvents: 2345678, positiveLabels: 4285,
            negativeLabels: 24282, featureCount: 24,
        },
        labelType: "churn_30d",
        expiresAt: "Dec 20, 2025",
        size: "412 MB",
        usedInJobs: [],
    },
    {
        id: "ds_churn_002",
        name: "Churn - Dec 6",
        modelTypeId: "churn_risk",
        generatedAt: "Dec 6, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Nov 6, 2025 00:00", end: "Dec 5, 2025 23:59" },
        stats: {
            totalUsers: 27890, totalEvents: 2189543, positiveLabels: 4045,
            negativeLabels: 23845, featureCount: 24,
        },
        labelType: "churn_30d",
        expiresAt: "Dec 13, 2025",
        size: "398 MB",
        usedInJobs: ["job_001"],
    },
    // Cart Abandonment Datasets
    {
        id: "ds_cart_001",
        name: "Cart Abandon - Dec 13",
        modelTypeId: "cart_abandonment",
        generatedAt: "Dec 13, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Dec 12, 2025 00:00", end: "Dec 12, 2025 23:59" },
        stats: {
            totalUsers: 8934, totalEvents: 156789, positiveLabels: 5672,
            negativeLabels: 3262, featureCount: 18,
        },
        labelType: "cart_abandon_2h",
        expiresAt: "Dec 20, 2025",
        size: "89 MB",
        usedInJobs: [],
    },
    {
        id: "ds_cart_002",
        name: "Cart Abandon - Dec 12",
        modelTypeId: "cart_abandonment",
        generatedAt: "Dec 12, 2025 00:05",
        status: "ready",
        trigger: "scheduled",
        dataWindow: { start: "Dec 11, 2025 00:00", end: "Dec 11, 2025 23:59" },
        stats: {
            totalUsers: 8456, totalEvents: 145632, positiveLabels: 5234,
            negativeLabels: 3222, featureCount: 18,
        },
        labelType: "cart_abandon_2h",
        expiresAt: "Dec 19, 2025",
        size: "84 MB",
        usedInJobs: ["job_005"],
    },
    // LTV Datasets
    {
        id: "ds_ltv_001",
        name: "LTV - Q4 2025",
        modelTypeId: "ltv_prediction",
        generatedAt: "Dec 10, 2025 14:30",
        status: "ready",
        trigger: "manual",
        dataWindow: { start: "Jun 1, 2025 00:00", end: "Nov 30, 2025 23:59" },
        stats: {
            totalUsers: 45678, totalEvents: 8765432, positiveLabels: 45678,
            negativeLabels: 0, featureCount: 22,
        },
        labelType: "revenue_90d",
        expiresAt: "Mar 10, 2026",
        size: "1.2 GB",
        usedInJobs: ["job_004"],
    },
    // Manual Dataset - purchase probability
    {
        id: "ds_pp_003",
        name: "Purchase Manual - Dec 11",
        modelTypeId: "purchase_probability",
        generatedAt: "Dec 11, 2025 14:30",
        status: "ready",
        trigger: "manual",
        dataWindow: { start: "Dec 4, 2025 00:00", end: "Dec 10, 2025 23:59" },
        stats: {
            totalUsers: 42567, totalEvents: 2456789, positiveLabels: 12456,
            negativeLabels: 30111, featureCount: 36,
        },
        labelType: "purchase_7d",
        expiresAt: "Dec 18, 2025",
        size: "892 MB",
        usedInJobs: ["job_001"],
    },
    {
        id: "ds_pp_004",
        name: "Purchase - Dec 11 (Expired)",
        modelTypeId: "purchase_probability",
        generatedAt: "Dec 11, 2025 00:05",
        status: "expired",
        trigger: "scheduled",
        dataWindow: { start: "Dec 10, 2025 00:00", end: "Dec 10, 2025 23:59" },
        stats: {
            totalUsers: 14567, totalEvents: 845678, positiveLabels: 3012,
            negativeLabels: 11555, featureCount: 28,
        },
        labelType: "purchase_24h",
        expiresAt: "Dec 11, 2025",
        size: "232 MB",
        usedInJobs: [],
    },
];

const sampleJobs: TrainingJob[] = [
    {
        id: "job_001",
        name: "Purchase Model Training",
        modelId: "model_1",
        modelName: "Purchase Intent v2",
        datasetId: "ds_003",
        datasetName: "Manual Dataset - Dec 11",
        status: "completed",
        progress: 100,
        startedAt: "Dec 11, 2025 15:00",
        completedAt: "Dec 11, 2025 15:45",
        duration: "45 mins",
        metrics: { accuracy: 0.847, auc: 0.892, loss: 0.342 },
        triggeredBy: "manual",
    },
    {
        id: "job_002",
        name: "Churn Model Training",
        modelId: "model_2",
        modelName: "Churn Predictor",
        datasetId: "ds_002",
        datasetName: "Daily Dataset - Dec 12",
        status: "running",
        progress: 67,
        startedAt: "Dec 13, 2025 09:30",
        triggeredBy: "automation",
        automationRule: "Train on new dataset",
    },
    {
        id: "job_003",
        name: "Cart Model Retrain",
        modelId: "model_3",
        modelName: "Cart Abandonment Detector",
        datasetId: "ds_001",
        datasetName: "Daily Dataset - Dec 13",
        status: "pending",
        progress: 0,
        startedAt: "Dec 13, 2025 10:00",
        triggeredBy: "automation",
        automationRule: "Train on new dataset",
    },
    {
        id: "job_004",
        name: "LTV Model Training",
        modelId: "model_4",
        modelName: "LTV Predictor",
        datasetId: "ds_002",
        datasetName: "Daily Dataset - Dec 12",
        status: "failed",
        progress: 34,
        startedAt: "Dec 12, 2025 12:00",
        completedAt: "Dec 12, 2025 12:23",
        duration: "23 mins",
        triggeredBy: "manual",
    },
];

// ============================================================================
// Helper Components
// ============================================================================

const getStatusBadge = (status: ModelStatus, pendingAction?: PendingAction) => {
    if (pendingAction === "create") {
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Create Pending</Badge>;
    }
    if (pendingAction === "delete") {
        return <Badge className="bg-red-100 text-red-700"><Clock className="h-3 w-3 mr-1" />Delete Pending</Badge>;
    }
    switch (status) {
        case "active": return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
        case "training": return <Badge className="bg-blue-100 text-blue-700"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Training</Badge>;
        case "failed": return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
        case "paused": return <Badge className="bg-slate-100 text-slate-600">Paused</Badge>;
        case "draft": return <Badge className="bg-slate-100 text-slate-600">Draft</Badge>;
        case "awaiting_deployment": return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        default: return null;
    }
};

const getJobStatusBadge = (status: TrainingJobStatus) => {
    switch (status) {
        case "pending": return <Badge className="bg-slate-100 text-slate-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        case "running": return <Badge className="bg-blue-100 text-blue-700"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
        case "completed": return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
        case "failed": return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
        case "cancelled": return <Badge className="bg-slate-100 text-slate-600">Cancelled</Badge>;
        default: return null;
    }
};

const getDatasetStatusBadge = (status: DatasetStatus) => {
    switch (status) {
        case "generating": return <Badge className="bg-blue-100 text-blue-700"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
        case "ready": return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
        case "expired": return <Badge className="bg-slate-100 text-slate-500">Expired</Badge>;
        case "failed": return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
        default: return null;
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

// ============================================================================
// Models Section
// ============================================================================

// Model type options for the empty state
const MODEL_TYPE_OPTIONS = [
    { id: "purchase_probability", name: "Purchase Probability", description: "Predict likelihood of purchase", icon: ShoppingCart, category: "conversion" as const },
    { id: "churn_risk", name: "Churn Risk", description: "Identify users likely to churn", icon: AlertTriangle, category: "retention" as const },
    { id: "ltv_prediction", name: "Lifetime Value", description: "Estimate customer lifetime value", icon: DollarSign, category: "revenue" as const },
    { id: "cart_abandonment", name: "Cart Abandonment", description: "Predict cart abandonment risk", icon: ShoppingCart, category: "conversion" as const },
    { id: "next_purchase_timing", name: "Next Purchase Timing", description: "Predict when user will buy next", icon: Clock, category: "engagement" as const },
    { id: "product_affinity", name: "Product Affinity", description: "Predict product category interests", icon: Target, category: "engagement" as const },
];

const CATEGORY_COLORS = {
    conversion: { bg: "bg-emerald-100", text: "text-emerald-700" },
    retention: { bg: "bg-orange-100", text: "text-orange-700" },
    revenue: { bg: "bg-violet-100", text: "text-violet-700" },
    engagement: { bg: "bg-blue-100", text: "text-blue-700" },
};

function ModelsSection() {
    const navigate = useNavigate();
    const [models, setModels] = useState<PredictionModel[]>([]); // Start with empty array for empty state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedModel, setSelectedModel] = useState<PredictionModel | null>(null);

    const filteredModels = models.filter(
        (model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.type.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Empty State
    if (models.length === 0) {
        return (
            <div className="space-y-8">
                {/* Hero Empty State */}
                <div className="text-center py-12 px-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                        <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Prediction Models Yet</h2>
                    <p className="text-slate-300 max-w-md mx-auto mb-8">
                        Create your first ML model to predict user behavior. Choose from purchase probability, 
                        churn risk, lifetime value, and more.
                    </p>
                    <Button onClick={() => navigate("/prediction/models/new")} size="lg" className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
                        <Plus className="h-5 w-5" />
                        Create Your First Model
                    </Button>
                </div>

                {/* Available Model Types */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Model Types</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MODEL_TYPE_OPTIONS.map((type) => {
                            const Icon = type.icon;
                            const colors = CATEGORY_COLORS[type.category];
                            return (
                                <Card 
                                    key={type.id} 
                                    className="cursor-pointer transition-all hover:shadow-md hover:border-slate-300"
                                    onClick={() => navigate("/prediction/models/new")}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
                                                <Icon className={cn("h-6 w-6", colors.text)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-slate-900">{type.name}</h4>
                                                </div>
                                                <p className="text-sm text-slate-500">{type.description}</p>
                                                <Badge className={cn("mt-2 text-xs", colors.bg, colors.text)}>
                                                    {type.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* How it Works */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">How Prediction Models Work</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                                    <Database className="h-6 w-6 text-blue-600" />
                                </div>
                                <h4 className="font-medium text-slate-900 mb-1">1. Select Features</h4>
                                <p className="text-sm text-slate-500">Choose feature sources from your aggregated user data</p>
                            </div>
                            <div className="text-center">
                                <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                                    <Settings className="h-6 w-6 text-violet-600" />
                                </div>
                                <h4 className="font-medium text-slate-900 mb-1">2. Configure</h4>
                                <p className="text-sm text-slate-500">Set training parameters or use optimized defaults</p>
                            </div>
                            <div className="text-center">
                                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                                    <RefreshCw className="h-6 w-6 text-amber-600" />
                                </div>
                                <h4 className="font-medium text-slate-900 mb-1">3. Train</h4>
                                <p className="text-sm text-slate-500">Model trains on your historical data automatically</p>
                            </div>
                            <div className="text-center">
                                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                    <Zap className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h4 className="font-medium text-slate-900 mb-1">4. Deploy</h4>
                                <p className="text-sm text-slate-500">Get predictions via API for real-time nudges</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Models List View (when models exist)
    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
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
                                <p className="text-2xl font-bold text-slate-900">{models.filter((m) => m.status === "active").length}</p>
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
                                <p className="text-2xl font-bold text-slate-900">{models.filter((m) => m.status === "training").length}</p>
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
                                <p className="text-sm text-slate-500">Data Points</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Create */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search models..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Button onClick={() => navigate("/prediction/models/new")} className="gap-2 bg-slate-900 hover:bg-slate-800">
                    <Plus className="h-4 w-4" />
                    Create Model
                </Button>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => {
                    const Icon = model.type.icon;
                    return (
                        <Card key={model.id} className={cn("cursor-pointer transition-all hover:shadow-md", model.status === "active" && "border-emerald-200")} onClick={() => setSelectedModel(model)}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", model.status === "active" ? "bg-emerald-100" : "bg-slate-100")}>
                                            <Icon className={cn("h-5 w-5", model.status === "active" ? "text-emerald-600" : "text-slate-500")} />
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
                                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{model.type.description}</p>
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

                {filteredModels.length === 0 && searchQuery && (
                    <div className="col-span-full text-center py-12">
                        <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No models matching "{searchQuery}"</p>
                    </div>
                )}
            </div>

            {/* Model Detail Sheet */}
            <Sheet open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    {selectedModel && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedModel.name}</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(selectedModel.status)}
                                    {getCategoryBadge(selectedModel.type.category)}
                                </div>
                                <p className="text-sm text-slate-600">{selectedModel.type.description}</p>
                                {selectedModel.metrics && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <p className="text-lg font-bold">{(selectedModel.metrics.accuracy * 100).toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500">Accuracy</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <p className="text-lg font-bold">{(selectedModel.metrics.auc * 100).toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500">AUC-ROC</p>
                                        </div>
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

// ============================================================================
// Training Data Section
// ============================================================================

// This represents configured models (would come from API in real app)
// Only models that the user has created will have training data generation enabled
interface ConfiguredModel {
    id: string;
    name: string;
    modelTypeId: string;
    status: ModelStatus;
    dataGeneration: {
        enabled: boolean;
        scheduleEnabled: boolean;
        lastGenerated?: string;
    };
}

// Sample configured models - only these will show training data
const configuredModels: ConfiguredModel[] = [
    {
        id: "model_1",
        name: "Purchase Intent v2",
        modelTypeId: "purchase_probability",
        status: "active",
        dataGeneration: { enabled: true, scheduleEnabled: true, lastGenerated: "Dec 13, 2025 00:05" },
    },
    {
        id: "model_2",
        name: "Churn Predictor",
        modelTypeId: "churn_risk",
        status: "training",
        dataGeneration: { enabled: true, scheduleEnabled: true, lastGenerated: "Dec 13, 2025 00:05" },
    },
    {
        id: "model_3",
        name: "Cart Abandonment Detector",
        modelTypeId: "cart_abandonment",
        status: "active",
        dataGeneration: { enabled: true, scheduleEnabled: true, lastGenerated: "Dec 13, 2025 00:05" },
    },
];

const CATEGORY_BADGE_COLORS = {
    conversion: { bg: "bg-emerald-100", text: "text-emerald-700" },
    retention: { bg: "bg-orange-100", text: "text-orange-700" },
    revenue: { bg: "bg-violet-100", text: "text-violet-700" },
    engagement: { bg: "bg-blue-100", text: "text-blue-700" },
};

function TrainingDataSection() {
    const navigate = useNavigate();
    const [datasets] = useState<TrainingDataset[]>(sampleDatasets);
    const [models] = useState<ConfiguredModel[]>(configuredModels);
    const [expandedModel, setExpandedModel] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [scheduleStates, setScheduleStates] = useState<Record<string, boolean>>(
        Object.fromEntries(models.map((m) => [m.id, m.dataGeneration.scheduleEnabled]))
    );

    const handleManualGenerate = (modelId: string) => {
        setIsGenerating(modelId);
        setTimeout(() => setIsGenerating(null), 2000);
    };

    const toggleSchedule = (modelId: string) => {
        setScheduleStates((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
    };

    // Get datasets for a specific model
    const getDatasetsForModel = (model: ConfiguredModel) => {
        return datasets.filter((d) => d.modelTypeId === model.modelTypeId);
    };

    // Get definition for a model type
    const getDefinition = (modelTypeId: string) => {
        return trainingDataDefinitions.find((d) => d.modelTypeId === modelTypeId);
    };

    // Calculate stats
    const totalDatasets = datasets.filter((d) => d.status === "ready").length;
    const scheduledModels = models.filter((m) => scheduleStates[m.id]).length;

    // Empty state - no models configured
    if (models.length === 0) {
        return (
            <div className="space-y-6">
                <div className="text-center py-16 px-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="h-16 w-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-6">
                        <Database className="h-8 w-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">No Models Configured</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                        Training data is generated for each model you create. Create a prediction model first, 
                        then training data generation will be automatically enabled.
                    </p>
                    <Button onClick={() => navigate("/prediction/models/new")} size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create Your First Model
                    </Button>
                    
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-500 mb-4">How it works:</p>
                        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                            <div className="text-center">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                                    <Brain className="h-5 w-5 text-blue-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">1. Create Model</p>
                                <p className="text-xs text-slate-500">Define what to predict</p>
                            </div>
                            <div className="text-center">
                                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center mx-auto mb-2">
                                    <Database className="h-5 w-5 text-violet-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">2. Generate Data</p>
                                <p className="text-xs text-slate-500">Auto-generates labeled data</p>
                            </div>
                            <div className="text-center">
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                                    <Zap className="h-5 w-5 text-emerald-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">3. Train & Deploy</p>
                                <p className="text-xs text-slate-500">Train model on data</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{models.length}</p>
                                <p className="text-sm text-slate-500">Configured Models</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{totalDatasets}</p>
                                <p className="text-sm text-slate-500">Ready Datasets</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{scheduledModels}</p>
                                <p className="text-sm text-slate-500">Auto-Scheduled</p>
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
                                <p className="text-2xl font-bold text-slate-900">00:05</p>
                                <p className="text-sm text-slate-500">Daily at UTC</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Configured Models with Training Data */}
            <div className="space-y-4">
                {models.map((model) => {
                    const definition = getDefinition(model.modelTypeId);
                    const modelDatasets = getDatasetsForModel(model);
                    const readyDatasets = modelDatasets.filter((d) => d.status === "ready");
                    const isExpanded = expandedModel === model.id;
                    const isCurrentlyGenerating = isGenerating === model.id;
                    
                    if (!definition) return null;
                    
                    const Icon = definition.icon;
                    const colors = CATEGORY_BADGE_COLORS[definition.category];
                    
                    return (
                        <Card key={model.id} className="overflow-hidden">
                            {/* Model Header */}
                            <div 
                                className={cn(
                                    "p-4 cursor-pointer transition-colors",
                                    isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"
                                )}
                                onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", colors.bg)}>
                                            <Icon className={cn("h-6 w-6", colors.text)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{model.name}</h3>
                                                {getStatusBadge(model.status)}
                                            </div>
                                            <p className="text-sm text-slate-500">{definition.modelTypeName}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        {/* Quick Stats */}
                                        <div className="flex items-center gap-6 text-center">
                                            <div>
                                                <p className="text-xl font-bold text-slate-900">{readyDatasets.length}</p>
                                                <p className="text-xs text-slate-500">Datasets</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-slate-900">{definition.features.totalCount}</p>
                                                <p className="text-xs text-slate-500">Features</p>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleManualGenerate(model.id); }}
                                                disabled={isCurrentlyGenerating}
                                                className="gap-2"
                                            >
                                                {isCurrentlyGenerating ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                                Generate Now
                                            </Button>
                                            <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t">
                                    {/* Training Data Definition */}
                                    <div className="p-4 bg-slate-50 border-b">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-900 mb-3">Training Data Definition</h4>
                                                <div className="grid grid-cols-3 gap-6">
                                                    {/* Label */}
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Label</p>
                                                        <div className="p-3 bg-white rounded-lg border">
                                                            <p className="font-medium text-slate-900 text-sm">{definition.label.name}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{definition.label.description}</p>
                                                            <div className="mt-2 pt-2 border-t space-y-1">
                                                                <div className="flex items-start gap-2 text-xs">
                                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                    <span className="text-slate-600">{definition.label.positiveCondition}</span>
                                                                </div>
                                                                {definition.label.negativeCondition !== "N/A (continuous value)" && (
                                                                    <div className="flex items-start gap-2 text-xs">
                                                                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                                                        <span className="text-slate-600">{definition.label.negativeCondition}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Badge variant="outline" className="mt-2 text-xs">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {definition.label.lookAheadWindow} look-ahead
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Features */}
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Features ({definition.features.totalCount})</p>
                                                        <div className="p-3 bg-white rounded-lg border">
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {definition.features.groups.map((group) => (
                                                                    <Badge key={group} variant="outline" className="text-xs">{group}</Badge>
                                                                ))}
                                                            </div>
                                                            <p className="text-xs text-slate-500 mb-2">Key features:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {definition.features.keyFeatures.map((f) => (
                                                                    <code key={f} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{f}</code>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Data Requirements & Schedule */}
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Requirements & Schedule</p>
                                                        <div className="p-3 bg-white rounded-lg border space-y-3">
                                                            <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                                                <div className="bg-slate-50 rounded p-2">
                                                                    <p className="font-medium">{(definition.dataRequirements.minUsers / 1000).toFixed(0)}K</p>
                                                                    <p className="text-slate-500">min users</p>
                                                                </div>
                                                                <div className="bg-slate-50 rounded p-2">
                                                                    <p className="font-medium">{(definition.dataRequirements.minEvents / 1000).toFixed(0)}K</p>
                                                                    <p className="text-slate-500">min events</p>
                                                                </div>
                                                                <div className="bg-slate-50 rounded p-2">
                                                                    <p className="font-medium">{definition.dataRequirements.lookbackDays}d</p>
                                                                    <p className="text-slate-500">lookback</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                                    <span className="text-sm text-slate-600">Daily generation</span>
                                                                </div>
                                                                <Switch 
                                                                    checked={scheduleStates[model.id]} 
                                                                    onCheckedChange={() => toggleSchedule(model.id)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Datasets Table */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-medium text-slate-900">Generated Datasets</h4>
                                            {modelDatasets.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {readyDatasets.length} ready • {modelDatasets.length} total
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        {modelDatasets.length > 0 ? (
                                            <div className="overflow-x-auto border rounded-lg">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
                                                            <th className="px-4 py-3 text-left font-medium">Dataset</th>
                                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                                            <th className="px-4 py-3 text-left font-medium">Data Window</th>
                                                            <th className="px-4 py-3 text-right font-medium">Users</th>
                                                            <th className="px-4 py-3 text-right font-medium">Events</th>
                                                            <th className="px-4 py-3 text-right font-medium">Label Ratio</th>
                                                            <th className="px-4 py-3 text-right font-medium">Size</th>
                                                            <th className="px-4 py-3 text-center font-medium">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {modelDatasets.map((dataset) => (
                                                            <tr key={dataset.id} className="hover:bg-slate-50">
                                                                <td className="px-4 py-3">
                                                                    <div>
                                                                        <p className="font-medium text-slate-900">{dataset.name}</p>
                                                                        <p className="text-xs text-slate-500">{dataset.generatedAt}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">{getDatasetStatusBadge(dataset.status)}</td>
                                                                <td className="px-4 py-3">
                                                                    <p className="text-sm text-slate-600">{dataset.dataWindow.start}</p>
                                                                    <p className="text-xs text-slate-400">to {dataset.dataWindow.end}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono text-sm">{dataset.stats.totalUsers.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right font-mono text-sm">{dataset.stats.totalEvents.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {dataset.stats.negativeLabels > 0 ? (
                                                                        <>
                                                                            <div className="text-sm">
                                                                                <span className="text-emerald-600">{dataset.stats.positiveLabels.toLocaleString()}</span>
                                                                                <span className="text-slate-400"> / </span>
                                                                                <span className="text-slate-600">{dataset.stats.negativeLabels.toLocaleString()}</span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-400">
                                                                                {((dataset.stats.positiveLabels / (dataset.stats.positiveLabels + dataset.stats.negativeLabels)) * 100).toFixed(1)}% positive
                                                                            </p>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-500">Regression</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-sm text-slate-600">{dataset.size}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                                                            <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 border rounded-lg bg-slate-50">
                                                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500 mb-3">No datasets generated yet</p>
                                                <Button onClick={() => handleManualGenerate(model.id)} variant="outline" className="gap-2">
                                                    <Play className="h-4 w-4" />
                                                    Generate First Dataset
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Add Model Prompt */}
            <Card className="border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Plus className="h-6 w-6 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Add Another Model</h3>
                                <p className="text-sm text-slate-500">Create a new prediction model to generate training data for it</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => navigate("/prediction/models/new")} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Model
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Training Jobs Section
// ============================================================================

// Available models for training job creation
const availableModelsForTraining = [
    { id: "model_1", name: "Purchase Intent v2", type: "Purchase Probability", status: "active", icon: ShoppingCart },
    { id: "model_2", name: "Churn Predictor", type: "Churn Risk", status: "training", icon: AlertTriangle },
    { id: "model_3", name: "Cart Abandonment Detector", type: "Cart Abandonment", status: "active", icon: ShoppingCart },
    { id: "model_4", name: "LTV Predictor", type: "Lifetime Value", status: "draft", icon: DollarSign },
];

// Available datasets for training
const availableDatasetsForTraining = sampleDatasets.filter((d) => d.status === "ready");

interface NewJobForm {
    jobName: string;
    modelId: string;
    datasetId: string;
    useCustomParams: boolean;
    epochs: number;
    batchSize: number;
    learningRate: number;
    validationSplit: number;
}

function TrainingJobsSection() {
    const [jobs, setJobs] = useState<TrainingJob[]>(sampleJobs);
    const [automation, setAutomation] = useState<AutomationConfig>({
        enabled: true,
        trainOnNewDataset: true,
        minDatasetSize: 10000,
        maxConcurrentJobs: 2,
        retryOnFailure: true,
        notifyOnCompletion: true,
    });

    // New Job Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
    const [newJob, setNewJob] = useState<NewJobForm>({
        jobName: "",
        modelId: "",
        datasetId: "",
        useCustomParams: false,
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        validationSplit: 0.2,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const runningJobs = jobs.filter((j) => j.status === "running").length;
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;

    const selectedModel = availableModelsForTraining.find((m) => m.id === newJob.modelId);
    const selectedDataset = availableDatasetsForTraining.find((d) => d.id === newJob.datasetId);

    const resetCreateForm = () => {
        setCreateStep(1);
        setNewJob({
            jobName: "",
            modelId: "",
            datasetId: "",
            useCustomParams: false,
            epochs: 100,
            batchSize: 32,
            learningRate: 0.001,
            validationSplit: 0.2,
        });
    };

    const handleCreateJob = () => {
        if (!selectedModel || !selectedDataset) return;
        
        setIsSubmitting(true);
        
        // Simulate API call
        setTimeout(() => {
            const newTrainingJob: TrainingJob = {
                id: `job_${Date.now()}`,
                name: newJob.jobName || `${selectedModel.name} Training`,
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                datasetId: selectedDataset.id,
                datasetName: selectedDataset.name,
                status: "pending",
                progress: 0,
                startedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                triggeredBy: "manual",
            };
            
            setJobs([newTrainingJob, ...jobs]);
            setIsSubmitting(false);
            setIsCreating(false);
            resetCreateForm();
        }, 1000);
    };

    const canProceedStep1 = newJob.modelId !== "";
    const canProceedStep2 = newJob.datasetId !== "";
    const canProceedStep3 = true; // Parameters are optional

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{runningJobs}</p>
                                <p className="text-sm text-slate-500">Running</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{completedJobs}</p>
                                <p className="text-sm text-slate-500">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{failedJobs}</p>
                                <p className="text-sm text-slate-500">Failed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Timer className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
                                <p className="text-sm text-slate-500">Total Jobs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Automation Controls */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Training Automation</CardTitle>
                            <CardDescription>Configure automatic model training rules</CardDescription>
                        </div>
                        <Switch checked={automation.enabled} onCheckedChange={(checked) => setAutomation({ ...automation, enabled: checked })} />
                    </div>
                </CardHeader>
                {automation.enabled && (
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="text-sm font-medium">Train on new dataset</p>
                                        <p className="text-xs text-slate-500">Auto-start training when new data is ready</p>
                                    </div>
                                </div>
                                <Switch checked={automation.trainOnNewDataset} onCheckedChange={(checked) => setAutomation({ ...automation, trainOnNewDataset: checked })} />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <RefreshCw className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium">Retry on failure</p>
                                        <p className="text-xs text-slate-500">Automatically retry failed jobs</p>
                                    </div>
                                </div>
                                <Switch checked={automation.retryOnFailure} onCheckedChange={(checked) => setAutomation({ ...automation, retryOnFailure: checked })} />
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <Layers className="h-5 w-5 text-violet-500" />
                                    <p className="text-sm font-medium">Min dataset size</p>
                                </div>
                                <Select value={automation.minDatasetSize.toString()} onValueChange={(v) => setAutomation({ ...automation, minDatasetSize: parseInt(v) })}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">1,000 users</SelectItem>
                                        <SelectItem value="5000">5,000 users</SelectItem>
                                        <SelectItem value="10000">10,000 users</SelectItem>
                                        <SelectItem value="50000">50,000 users</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <Activity className="h-5 w-5 text-emerald-500" />
                                    <p className="text-sm font-medium">Max concurrent jobs</p>
                                </div>
                                <Select value={automation.maxConcurrentJobs.toString()} onValueChange={(v) => setAutomation({ ...automation, maxConcurrentJobs: parseInt(v) })}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 job</SelectItem>
                                        <SelectItem value="2">2 jobs</SelectItem>
                                        <SelectItem value="3">3 jobs</SelectItem>
                                        <SelectItem value="5">5 jobs</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Jobs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Training Jobs</CardTitle>
                        <Button className="gap-2" onClick={() => setIsCreating(true)}>
                            <Plus className="h-4 w-4" />
                            New Training Job
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
                                    <th className="px-4 py-3 text-left font-medium">Job</th>
                                    <th className="px-4 py-3 text-left font-medium">Model</th>
                                    <th className="px-4 py-3 text-left font-medium">Dataset</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Progress</th>
                                    <th className="px-4 py-3 text-left font-medium">Started</th>
                                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                                    <th className="px-4 py-3 text-left font-medium">Trigger</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{job.name}</p>
                                            <p className="text-xs text-slate-500">{job.id}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-slate-700">{job.modelName}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-slate-700">{job.datasetName}</p>
                                        </td>
                                        <td className="px-4 py-3">{getJobStatusBadge(job.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="w-24">
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", job.status === "failed" ? "bg-red-500" : job.status === "completed" ? "bg-emerald-500" : "bg-blue-500")}
                                                        style={{ width: `${job.progress}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{job.progress}%</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{job.startedAt}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{job.duration || "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="text-xs">
                                                {job.triggeredBy === "automation" ? <Zap className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                                                {job.triggeredBy}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Logs</DropdownMenuItem>
                                                    {job.status === "running" && <DropdownMenuItem><Pause className="h-4 w-4 mr-2" />Cancel</DropdownMenuItem>}
                                                    {job.status === "failed" && <DropdownMenuItem><RefreshCw className="h-4 w-4 mr-2" />Retry</DropdownMenuItem>}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* New Training Job Sheet */}
            <Sheet open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) resetCreateForm(); }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>New Training Job</SheetTitle>
                    </SheetHeader>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mt-6 mb-8">
                        {[
                            { step: 1, label: "Model" },
                            { step: 2, label: "Dataset" },
                            { step: 3, label: "Parameters" },
                            { step: 4, label: "Review" },
                        ].map(({ step, label }) => (
                            <div key={step} className="flex items-center gap-2 flex-1">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                    createStep >= step
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-400"
                                )}>
                                    {createStep > step ? <Check className="h-4 w-4" /> : step}
                                </div>
                                <span className={cn(
                                    "text-sm hidden sm:block",
                                    createStep >= step ? "text-slate-900" : "text-slate-400"
                                )}>
                                    {label}
                                </span>
                                {step < 4 && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Select Model */}
                    {createStep === 1 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Select Model to Train</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-3">
                                    Choose which model you want to train with new data
                                </p>
                                <div className="space-y-2">
                                    {availableModelsForTraining.map((model) => {
                                        const Icon = model.icon;
                                        return (
                                            <div
                                                key={model.id}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                                                    newJob.modelId === model.id
                                                        ? "border-slate-900 bg-slate-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => setNewJob({ ...newJob, modelId: model.id, jobName: `${model.name} Training` })}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                                        newJob.modelId === model.id ? "bg-slate-900" : "bg-slate-100"
                                                    )}>
                                                        <Icon className={cn("h-5 w-5", newJob.modelId === model.id ? "text-white" : "text-slate-600")} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{model.name}</p>
                                                        <p className="text-sm text-slate-500">{model.type}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn(
                                                        "text-xs",
                                                        model.status === "active" ? "bg-emerald-100 text-emerald-700" :
                                                        model.status === "training" ? "bg-blue-100 text-blue-700" :
                                                        "bg-slate-100 text-slate-600"
                                                    )}>
                                                        {model.status}
                                                    </Badge>
                                                    {newJob.modelId === model.id && <Check className="h-5 w-5 text-slate-900" />}
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
                                <Button onClick={() => setCreateStep(2)} disabled={!canProceedStep1} className="flex-1 bg-slate-900">
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Dataset */}
                    {createStep === 2 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Select Training Dataset</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-3">
                                    Choose which dataset to use for training
                                </p>
                                {availableDatasetsForTraining.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed rounded-lg">
                                        <Database className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-600 font-medium">No datasets available</p>
                                        <p className="text-xs text-slate-400 mt-1">Generate a training dataset first</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {availableDatasetsForTraining.map((dataset) => (
                                            <div
                                                key={dataset.id}
                                                className={cn(
                                                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                                    newJob.datasetId === dataset.id
                                                        ? "border-slate-900 bg-slate-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => setNewJob({ ...newJob, datasetId: dataset.id })}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                                            newJob.datasetId === dataset.id ? "bg-slate-900" : "bg-blue-100"
                                                        )}>
                                                            <Layers className={cn("h-5 w-5", newJob.datasetId === dataset.id ? "text-white" : "text-blue-600")} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{dataset.name}</p>
                                                            <p className="text-xs text-slate-500">{dataset.generatedAt}</p>
                                                        </div>
                                                    </div>
                                                    {newJob.datasetId === dataset.id && <Check className="h-5 w-5 text-slate-900" />}
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-slate-900">{dataset.stats.totalUsers.toLocaleString()}</p>
                                                        <p className="text-xs text-slate-500">Users</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-slate-900">{(dataset.stats.totalEvents / 1000).toFixed(0)}K</p>
                                                        <p className="text-xs text-slate-500">Events</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-slate-900">{dataset.stats.featureCount}</p>
                                                        <p className="text-xs text-slate-500">Features</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-slate-900">{dataset.size}</p>
                                                        <p className="text-xs text-slate-500">Size</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep(1)} className="flex-1">
                                    Back
                                </Button>
                                <Button onClick={() => setCreateStep(3)} disabled={!canProceedStep2} className="flex-1 bg-slate-900">
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Training Parameters */}
                    {createStep === 3 && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-slate-600" />
                                        <span className="text-sm font-medium">Custom Training Parameters</span>
                                    </div>
                                    <Switch
                                        checked={newJob.useCustomParams}
                                        onCheckedChange={(checked) => setNewJob({ ...newJob, useCustomParams: checked })}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {newJob.useCustomParams
                                        ? "Configure custom training parameters below"
                                        : "Using default parameters optimized for this model type"}
                                </p>
                            </div>

                            {newJob.useCustomParams && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Epochs</Label>
                                        <Input
                                            type="number"
                                            value={newJob.epochs}
                                            onChange={(e) => setNewJob({ ...newJob, epochs: parseInt(e.target.value) || 100 })}
                                            className="mt-1 h-9"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Batch Size</Label>
                                        <Select
                                            value={newJob.batchSize.toString()}
                                            onValueChange={(v) => setNewJob({ ...newJob, batchSize: parseInt(v) })}
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
                                        <Label className="text-xs">Learning Rate</Label>
                                        <Input
                                            type="number"
                                            step="0.0001"
                                            value={newJob.learningRate}
                                            onChange={(e) => setNewJob({ ...newJob, learningRate: parseFloat(e.target.value) || 0.001 })}
                                            className="mt-1 h-9"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Validation Split</Label>
                                        <Select
                                            value={newJob.validationSplit.toString()}
                                            onValueChange={(v) => setNewJob({ ...newJob, validationSplit: parseFloat(v) })}
                                        >
                                            <SelectTrigger className="mt-1 h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0.1">10%</SelectItem>
                                                <SelectItem value="0.15">15%</SelectItem>
                                                <SelectItem value="0.2">20%</SelectItem>
                                                <SelectItem value="0.25">25%</SelectItem>
                                                <SelectItem value="0.3">30%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {!newJob.useCustomParams && (
                                <div className="p-6 text-center border border-dashed rounded-lg">
                                    <Zap className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-900">Default Parameters</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Epochs: 100, Batch Size: 32, Learning Rate: 0.001
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep(2)} className="flex-1">
                                    Back
                                </Button>
                                <Button onClick={() => setCreateStep(4)} disabled={!canProceedStep3} className="flex-1 bg-slate-900">
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review & Start */}
                    {createStep === 4 && selectedModel && selectedDataset && (
                        <div className="space-y-6">
                            <div>
                                <Label className="text-sm font-medium">Job Name</Label>
                                <Input
                                    value={newJob.jobName}
                                    onChange={(e) => setNewJob({ ...newJob, jobName: e.target.value })}
                                    placeholder="Enter a name for this training job"
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-slate-700">Review Configuration</h4>
                                
                                {/* Model Summary */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Brain className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Model</p>
                                            <p className="font-medium text-slate-900">{selectedModel.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dataset Summary */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Layers className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">Dataset</p>
                                            <p className="font-medium text-slate-900">{selectedDataset.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">{selectedDataset.stats.totalUsers.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">users</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Parameters Summary */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                            <Settings className="h-5 w-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Parameters</p>
                                            <p className="font-medium text-slate-900">{newJob.useCustomParams ? "Custom" : "Default"}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200">
                                        <div className="text-center">
                                            <p className="text-sm font-mono font-medium">{newJob.epochs}</p>
                                            <p className="text-xs text-slate-500">Epochs</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-mono font-medium">{newJob.batchSize}</p>
                                            <p className="text-xs text-slate-500">Batch</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-mono font-medium">{newJob.learningRate}</p>
                                            <p className="text-xs text-slate-500">LR</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-mono font-medium">{(newJob.validationSplit * 100).toFixed(0)}%</p>
                                            <p className="text-xs text-slate-500">Val Split</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Estimated Time */}
                            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <Timer className="h-5 w-5 text-amber-600" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">Estimated Training Time</p>
                                    <p className="text-xs text-amber-700">~30-45 minutes based on dataset size</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep(3)} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateJob}
                                    disabled={isSubmitting || !newJob.jobName}
                                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                    Start Training
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function Prediction() {
    const { selectedProject } = useProject();
    const [activeTab, setActiveTab] = useState("models");

    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to manage prediction models and training."
            />
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Prediction</h1>
                <p className="text-slate-500 mt-1">
                    Train and deploy ML models for user behavior prediction
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="models" className="gap-2">
                        <Brain className="h-4 w-4" />
                        Models
                    </TabsTrigger>
                    <TabsTrigger value="datasets" className="gap-2">
                        <Database className="h-4 w-4" />
                        Training Data
                    </TabsTrigger>
                    <TabsTrigger value="jobs" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Training Jobs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="models">
                    <ModelsSection />
                </TabsContent>

                <TabsContent value="datasets">
                    <TrainingDataSection />
                </TabsContent>

                <TabsContent value="jobs">
                    <TrainingJobsSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}

