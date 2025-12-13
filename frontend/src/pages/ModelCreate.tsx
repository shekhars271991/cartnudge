import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Brain,
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronRight,
    ShoppingCart,
    AlertTriangle,
    DollarSign,
    Target,
    Clock,
    Zap,
    Settings,
    Database,
    Rocket,
    Loader2,
    Info,
    Layers,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";

// ============================================================================
// Model Types Configuration
// ============================================================================

interface ModelTypeConfig {
    id: string;
    name: string;
    description: string;
    longDescription: string;
    icon: typeof Brain;
    category: "conversion" | "retention" | "revenue" | "engagement";
    outputType: "probability" | "score" | "value" | "category";
    defaultParams: TrainingParams;
    recommendedFeatures: string[];
    useCases: string[];
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

interface FeatureSource {
    id: string;
    name: string;
    description: string;
    featureCount: number;
    type: "aggregated" | "real-time";
}

const MODEL_TYPES: ModelTypeConfig[] = [
    {
        id: "purchase_probability",
        name: "Purchase Probability",
        description: "Predict likelihood of purchase",
        longDescription: "Uses browsing behavior, cart activity, and historical purchase data to predict the probability that a user will complete a purchase in the current session or near future.",
        icon: ShoppingCart,
        category: "conversion",
        outputType: "probability",
        defaultParams: {
            learningRate: 0.001, epochs: 100, batchSize: 32, validationSplit: 0.2,
            earlyStoppingPatience: 10, l2Regularization: 0.01, dropoutRate: 0.3,
            hiddenLayers: [64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
        recommendedFeatures: ["page_views_30d", "cart_adds_7d", "avg_cart_value", "sessions_7d"],
        useCases: ["Trigger promotional nudges", "Personalized discounts", "Checkout reminders"],
    },
    {
        id: "churn_risk",
        name: "Churn Risk",
        description: "Identify users likely to churn",
        longDescription: "Analyzes engagement patterns, recency metrics, and behavioral trends to identify users who are at risk of becoming inactive or unsubscribing from your service.",
        icon: AlertTriangle,
        category: "retention",
        outputType: "probability",
        defaultParams: {
            learningRate: 0.0005, epochs: 150, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 15, l2Regularization: 0.02, dropoutRate: 0.4,
            hiddenLayers: [128, 64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
        recommendedFeatures: ["days_since_last_visit", "engagement_score", "sessions_30d", "orders_90d"],
        useCases: ["Win-back campaigns", "Loyalty rewards", "Re-engagement emails"],
    },
    {
        id: "ltv_prediction",
        name: "Lifetime Value",
        description: "Estimate customer lifetime value",
        longDescription: "Predicts the total revenue a customer is expected to generate over their entire relationship with your business, helping prioritize high-value customer acquisition and retention.",
        icon: DollarSign,
        category: "revenue",
        outputType: "value",
        defaultParams: {
            learningRate: 0.001, epochs: 200, batchSize: 32, validationSplit: 0.15,
            earlyStoppingPatience: 20, l2Regularization: 0.01, dropoutRate: 0.2,
            hiddenLayers: [128, 64], optimizer: "adam", lossFunction: "mse",
        },
        recommendedFeatures: ["total_revenue_90d", "avg_order_value", "purchase_frequency", "days_since_first_order"],
        useCases: ["Customer segmentation", "Ad spend optimization", "VIP identification"],
    },
    {
        id: "cart_abandonment",
        name: "Cart Abandonment",
        description: "Predict cart abandonment risk",
        longDescription: "Monitors real-time cart behavior and historical patterns to predict when a user is likely to abandon their cart, enabling timely intervention with targeted nudges.",
        icon: ShoppingCart,
        category: "conversion",
        outputType: "probability",
        defaultParams: {
            learningRate: 0.001, epochs: 80, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 8, l2Regularization: 0.015, dropoutRate: 0.35,
            hiddenLayers: [64, 32], optimizer: "adam", lossFunction: "binary_crossentropy",
        },
        recommendedFeatures: ["cart_value", "time_on_checkout", "cart_abandonment_rate", "previous_abandons"],
        useCases: ["Exit-intent popups", "Abandoned cart emails", "Live chat triggers"],
    },
    {
        id: "next_purchase_timing",
        name: "Next Purchase Timing",
        description: "Predict when user will buy next",
        longDescription: "Analyzes purchase history and behavioral patterns to predict the optimal time to engage with a user, maximizing the effectiveness of marketing communications.",
        icon: Clock,
        category: "engagement",
        outputType: "value",
        defaultParams: {
            learningRate: 0.0008, epochs: 120, batchSize: 32, validationSplit: 0.2,
            earlyStoppingPatience: 12, l2Regularization: 0.01, dropoutRate: 0.25,
            hiddenLayers: [96, 48], optimizer: "adam", lossFunction: "mse",
        },
        recommendedFeatures: ["avg_days_between_orders", "last_order_date", "purchase_frequency", "browsing_recency"],
        useCases: ["Send time optimization", "Replenishment reminders", "Promotional timing"],
    },
    {
        id: "product_affinity",
        name: "Product Affinity",
        description: "Predict product category interests",
        longDescription: "Learns user preferences from browsing and purchase history to predict which product categories a user is most likely to be interested in, enabling personalized recommendations.",
        icon: Target,
        category: "engagement",
        outputType: "category",
        defaultParams: {
            learningRate: 0.001, epochs: 100, batchSize: 64, validationSplit: 0.2,
            earlyStoppingPatience: 10, l2Regularization: 0.02, dropoutRate: 0.3,
            hiddenLayers: [128, 64, 32], optimizer: "adam", lossFunction: "categorical_crossentropy",
        },
        recommendedFeatures: ["product_views_by_category", "purchase_history_categories", "search_queries"],
        useCases: ["Product recommendations", "Email personalization", "Homepage customization"],
    },
];

const FEATURE_SOURCES: FeatureSource[] = [
    { id: "user_features", name: "User Features", description: "Aggregated user-level features from all event types", featureCount: 36, type: "aggregated" },
    { id: "cart_features", name: "Cart Features", description: "Cart-specific behavioral features", featureCount: 12, type: "aggregated" },
    { id: "page_features", name: "Page Features", description: "Browsing and engagement features", featureCount: 15, type: "aggregated" },
    { id: "order_features", name: "Order Features", description: "Purchase history features", featureCount: 10, type: "aggregated" },
];

const CATEGORY_COLORS = {
    conversion: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
    retention: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    revenue: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
    engagement: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
};

// ============================================================================
// Main Component
// ============================================================================

export default function ModelCreate() {
    const navigate = useNavigate();
    const { selectedProject } = useProject();
    
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [modelName, setModelName] = useState("");
    const [modelDescription, setModelDescription] = useState("");
    const [selectedModelType, setSelectedModelType] = useState<ModelTypeConfig | null>(null);
    const [selectedFeatureSources, setSelectedFeatureSources] = useState<string[]>(["user_features"]);
    const [trainingParams, setTrainingParams] = useState<TrainingParams | null>(null);
    const [useAdvancedParams, setUseAdvancedParams] = useState(false);
    const [autoTrain, setAutoTrain] = useState(true);
    const [autoRetrain, setAutoRetrain] = useState(false);
    const [retrainFrequency, setRetrainFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
    
    const steps = [
        { number: 1, title: "Model Type", description: "Choose prediction type" },
        { number: 2, title: "Data Source", description: "Select feature sources" },
        { number: 3, title: "Configuration", description: "Set training parameters" },
        { number: 4, title: "Review & Deploy", description: "Confirm and create" },
    ];
    
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to create prediction models."
            />
        );
    }
    
    const handleSelectModelType = (type: ModelTypeConfig) => {
        setSelectedModelType(type);
        setTrainingParams({ ...type.defaultParams });
        if (!modelName) {
            setModelName(`${type.name} Model`);
        }
    };
    
    const toggleFeatureSource = (sourceId: string) => {
        setSelectedFeatureSources((prev) =>
            prev.includes(sourceId)
                ? prev.filter((id) => id !== sourceId)
                : [...prev, sourceId]
        );
    };
    
    const canProceed = () => {
        switch (currentStep) {
            case 1: return selectedModelType !== null;
            case 2: return selectedFeatureSources.length > 0;
            case 3: return trainingParams !== null;
            case 4: return modelName.trim() !== "";
            default: return false;
        }
    };
    
    const handleNext = () => {
        if (canProceed() && currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };
    
    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const handleSubmit = async () => {
        if (!selectedModelType || !trainingParams) return;
        
        setIsSubmitting(true);
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // Navigate back to prediction page
        navigate("/prediction");
    };
    
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => navigate("/prediction")} className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900">Create Prediction Model</h1>
                                <p className="text-sm text-slate-500">Configure and deploy a new ML model</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            {selectedProject.name}
                        </Badge>
                    </div>
                </div>
            </div>
            
            {/* Progress Steps */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex items-center">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                        currentStep > step.number
                                            ? "bg-emerald-500 text-white"
                                            : currentStep === step.number
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-400"
                                    )}>
                                        {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className={cn(
                                            "text-sm font-medium",
                                            currentStep >= step.number ? "text-slate-900" : "text-slate-400"
                                        )}>
                                            {step.title}
                                        </p>
                                        <p className={cn(
                                            "text-xs",
                                            currentStep >= step.number ? "text-slate-500" : "text-slate-400"
                                        )}>
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <ChevronRight className="h-5 w-5 text-slate-300 mx-4" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Step 1: Select Model Type */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Select Model Type</h2>
                            <p className="text-slate-500 mt-1">Choose the type of prediction you want to make</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MODEL_TYPES.map((type) => {
                                const Icon = type.icon;
                                const colors = CATEGORY_COLORS[type.category];
                                const isSelected = selectedModelType?.id === type.id;
                                
                                return (
                                    <div
                                        key={type.id}
                                        onClick={() => handleSelectModelType(type)}
                                        className={cn(
                                            "p-5 rounded-xl border-2 cursor-pointer transition-all",
                                            isSelected
                                                ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                                isSelected ? "bg-slate-900" : colors.bg
                                            )}>
                                                <Icon className={cn("h-6 w-6", isSelected ? "text-white" : colors.text)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-slate-900">{type.name}</h3>
                                                    <Badge className={cn("text-xs", colors.bg, colors.text)}>
                                                        {type.category}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 mb-3">{type.description}</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {type.useCases.slice(0, 2).map((useCase, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {useCase}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="h-5 w-5 text-slate-900 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Selected Model Details */}
                        {selectedModelType && (
                            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-blue-900">{selectedModelType.name}</h4>
                                        <p className="text-sm text-blue-700 mt-1">{selectedModelType.longDescription}</p>
                                        <div className="mt-3">
                                            <p className="text-xs font-medium text-blue-900 mb-1.5">Recommended Features:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedModelType.recommendedFeatures.map((feature, i) => (
                                                    <Badge key={i} className="bg-blue-100 text-blue-700 text-xs">
                                                        {feature}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Step 2: Select Data Sources */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Select Feature Sources</h2>
                            <p className="text-slate-500 mt-1">Choose which feature sets to use for training</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {FEATURE_SOURCES.map((source) => {
                                const isSelected = selectedFeatureSources.includes(source.id);
                                
                                return (
                                    <div
                                        key={source.id}
                                        onClick={() => toggleFeatureSource(source.id)}
                                        className={cn(
                                            "p-5 rounded-xl border-2 cursor-pointer transition-all",
                                            isSelected
                                                ? "border-slate-900 bg-slate-50"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    isSelected ? "bg-slate-900" : "bg-blue-100"
                                                )}>
                                                    <Database className={cn("h-5 w-5", isSelected ? "text-white" : "text-blue-600")} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{source.name}</h3>
                                                    <p className="text-sm text-slate-500 mt-0.5">{source.description}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            <Layers className="h-3 w-3 mr-1" />
                                                            {source.featureCount} features
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {source.type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? "bg-slate-900 border-slate-900"
                                                    : "border-slate-300"
                                            )}>
                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Summary */}
                        <div className="p-4 bg-slate-100 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-slate-600" />
                                    <span className="font-medium text-slate-900">Total Features:</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">
                                    {FEATURE_SOURCES.filter((s) => selectedFeatureSources.includes(s.id))
                                        .reduce((acc, s) => acc + s.featureCount, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Step 3: Training Configuration */}
                {currentStep === 3 && trainingParams && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Training Configuration</h2>
                            <p className="text-slate-500 mt-1">Configure model training parameters</p>
                        </div>
                        
                        {/* Basic Settings */}
                        <div className="bg-white rounded-xl border p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-slate-900">Advanced Parameters</h3>
                                    <p className="text-sm text-slate-500">Customize training hyperparameters</p>
                                </div>
                                <Switch checked={useAdvancedParams} onCheckedChange={setUseAdvancedParams} />
                            </div>
                            
                            {!useAdvancedParams && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-emerald-600" />
                                        <p className="text-sm font-medium text-emerald-900">Using optimized defaults for {selectedModelType?.name}</p>
                                    </div>
                                </div>
                            )}
                            
                            {useAdvancedParams && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <Label className="text-sm font-medium">Learning Rate</Label>
                                        <p className="text-xs text-slate-500 mb-2">Controls step size during optimization</p>
                                        <Input
                                            type="number"
                                            step="0.0001"
                                            value={trainingParams.learningRate}
                                            onChange={(e) => setTrainingParams({ ...trainingParams, learningRate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Epochs</Label>
                                        <p className="text-xs text-slate-500 mb-2">Number of training iterations</p>
                                        <Input
                                            type="number"
                                            value={trainingParams.epochs}
                                            onChange={(e) => setTrainingParams({ ...trainingParams, epochs: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Batch Size</Label>
                                        <p className="text-xs text-slate-500 mb-2">Samples per training batch</p>
                                        <Select
                                            value={trainingParams.batchSize.toString()}
                                            onValueChange={(v) => setTrainingParams({ ...trainingParams, batchSize: parseInt(v) })}
                                        >
                                            <SelectTrigger>
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
                                        <Label className="text-sm font-medium">Validation Split</Label>
                                        <p className="text-xs text-slate-500 mb-2">Fraction held for validation</p>
                                        <Select
                                            value={trainingParams.validationSplit.toString()}
                                            onValueChange={(v) => setTrainingParams({ ...trainingParams, validationSplit: parseFloat(v) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0.1">10%</SelectItem>
                                                <SelectItem value="0.15">15%</SelectItem>
                                                <SelectItem value="0.2">20%</SelectItem>
                                                <SelectItem value="0.25">25%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Optimizer</Label>
                                        <p className="text-xs text-slate-500 mb-2">Optimization algorithm</p>
                                        <Select
                                            value={trainingParams.optimizer}
                                            onValueChange={(v) => setTrainingParams({ ...trainingParams, optimizer: v as TrainingParams["optimizer"] })}
                                        >
                                            <SelectTrigger>
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
                                        <Label className="text-sm font-medium">Early Stopping Patience</Label>
                                        <p className="text-xs text-slate-500 mb-2">Epochs to wait before stopping</p>
                                        <Input
                                            type="number"
                                            value={trainingParams.earlyStoppingPatience}
                                            onChange={(e) => setTrainingParams({ ...trainingParams, earlyStoppingPatience: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Dropout Rate</Label>
                                        <p className="text-xs text-slate-500 mb-2">Regularization dropout (0-1)</p>
                                        <Input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="0.8"
                                            value={trainingParams.dropoutRate}
                                            onChange={(e) => setTrainingParams({ ...trainingParams, dropoutRate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">L2 Regularization</Label>
                                        <p className="text-xs text-slate-500 mb-2">Weight decay coefficient</p>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={trainingParams.l2Regularization}
                                            onChange={(e) => setTrainingParams({ ...trainingParams, l2Regularization: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Automation Settings */}
                        <div className="bg-white rounded-xl border p-6 space-y-4">
                            <h3 className="font-medium text-slate-900">Automation Settings</h3>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Rocket className="h-5 w-5 text-violet-600" />
                                    <div>
                                        <p className="font-medium text-slate-900">Auto-train on creation</p>
                                        <p className="text-sm text-slate-500">Start training immediately after model creation</p>
                                    </div>
                                </div>
                                <Switch checked={autoTrain} onCheckedChange={setAutoTrain} />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <p className="font-medium text-slate-900">Auto-retrain on new data</p>
                                        <p className="text-sm text-slate-500">Automatically retrain when new training data is available</p>
                                    </div>
                                </div>
                                <Switch checked={autoRetrain} onCheckedChange={setAutoRetrain} />
                            </div>
                            
                            {autoRetrain && (
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <Label className="text-sm font-medium">Retraining Frequency</Label>
                                    <Select value={retrainFrequency} onValueChange={(v) => setRetrainFrequency(v as typeof retrainFrequency)}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Step 4: Review & Deploy */}
                {currentStep === 4 && selectedModelType && trainingParams && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Review & Deploy</h2>
                            <p className="text-slate-500 mt-1">Review your configuration and create the model</p>
                        </div>
                        
                        {/* Model Name & Description */}
                        <div className="bg-white rounded-xl border p-6 space-y-4">
                            <h3 className="font-medium text-slate-900">Model Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">Model Name *</Label>
                                    <Input
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        placeholder="Enter a name for this model"
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Description (Optional)</Label>
                                    <Textarea
                                        value={modelDescription}
                                        onChange={(e) => setModelDescription(e.target.value)}
                                        placeholder="Describe the purpose of this model"
                                        className="mt-1.5"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Configuration Summary */}
                        <div className="bg-white rounded-xl border p-6 space-y-4">
                            <h3 className="font-medium text-slate-900">Configuration Summary</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Model Type */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", CATEGORY_COLORS[selectedModelType.category].bg)}>
                                            {(() => {
                                                const Icon = selectedModelType.icon;
                                                return <Icon className={cn("h-5 w-5", CATEGORY_COLORS[selectedModelType.category].text)} />;
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Model Type</p>
                                            <p className="font-medium text-slate-900">{selectedModelType.name}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Feature Sources */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Database className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Feature Sources</p>
                                            <p className="font-medium text-slate-900">{selectedFeatureSources.length} selected</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Training Config */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                            <Settings className="h-5 w-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Parameters</p>
                                            <p className="font-medium text-slate-900">{useAdvancedParams ? "Custom" : "Default"}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Automation */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Zap className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Automation</p>
                                            <p className="font-medium text-slate-900">
                                                {autoTrain ? "Auto-train" : "Manual"}{autoRetrain ? `, ${retrainFrequency} retrain` : ""}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Parameter Details */}
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium text-slate-700 mb-3">Training Parameters</p>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="text-center p-3 bg-slate-100 rounded-lg">
                                        <p className="text-lg font-bold text-slate-900">{trainingParams.epochs}</p>
                                        <p className="text-xs text-slate-500">Epochs</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-100 rounded-lg">
                                        <p className="text-lg font-bold text-slate-900">{trainingParams.batchSize}</p>
                                        <p className="text-xs text-slate-500">Batch Size</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-100 rounded-lg">
                                        <p className="text-lg font-bold text-slate-900">{trainingParams.learningRate}</p>
                                        <p className="text-xs text-slate-500">Learning Rate</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-100 rounded-lg">
                                        <p className="text-lg font-bold text-slate-900">{(trainingParams.validationSplit * 100).toFixed(0)}%</p>
                                        <p className="text-xs text-slate-500">Val Split</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* What happens next */}
                        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Rocket className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-amber-900">What happens next?</h4>
                                    <ul className="text-sm text-amber-700 mt-2 space-y-1">
                                        <li>• Model will be created and saved to your project</li>
                                        {autoTrain && <li>• Training will start automatically with the latest dataset</li>}
                                        {!autoTrain && <li>• You can manually trigger training from the Models tab</li>}
                                        <li>• Once trained, the model will be available for inference via API</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => navigate("/prediction")}>
                                Cancel
                            </Button>
                            
                            {currentStep < 4 ? (
                                <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 bg-slate-900 hover:bg-slate-800">
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !modelName.trim()}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="h-4 w-4" />
                                            Create Model
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bottom padding for fixed footer */}
            <div className="h-20" />
        </div>
    );
}

