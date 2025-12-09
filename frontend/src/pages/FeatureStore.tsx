import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Database,
    Plus,
    Search,
    Layers,
    ArrowRight,
    Check,
    Trash2,
    BarChart3,
    RefreshCw,
    Calendar,
    ExternalLink,
    Rocket,
    Link2,
    Clock,
    Calculator,
    Pencil,
    AlertTriangle,
    Undo2,
    Brain,
    FileSpreadsheet,
    Target,
    ShoppingCart,
    DollarSign,
    AlertCircle,
    X,
    ChevronRight,
    Sparkles,
    Tag,
    ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";

// Types
interface PipelineField {
    name: string;
    type: "string" | "number" | "boolean" | "timestamp" | "object";
    description: string;
}

interface Pipeline {
    id: string;
    name: string;
    eventTypes?: string[]; // Event types available in this pipeline (for event pipelines)
    fields: PipelineField[];
}

// Direct Mapping Datablock
interface DirectMappingField {
    id: string;
    targetName: string;
    type: "string" | "number" | "boolean" | "timestamp" | "object";
    sourcePipeline: string;
    sourceFieldName: string;
    description?: string;
    enabled: boolean;
}

type DatablockStatus = "active" | "inactive" | "building" | "awaiting_deployment";
type PendingAction = "create" | "update" | "delete" | null;

interface DirectMappingDatablock {
    id: string;
    name: string;
    description: string;
    type: "direct";
    sourcePipelines: string[];
    eventTypes: string[]; // Event types captured from the source pipeline(s)
    fields: DirectMappingField[];
    status: DatablockStatus;
    pendingAction: PendingAction;
    rowCount: number;
    lastUpdated: string;
}

// Aggregated Datablock
interface AggregatedField {
    id: string;
    targetName: string;
    sourceDatablock: string;
    sourceField: string;
    aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT";
    timeWindow: string;
    schedule: string;
    description?: string;
    lastRun?: string;
}

interface AggregatedDatablock {
    id: string;
    name: string;
    description: string;
    type: "aggregated";
    sourceDatablocks: string[];
    fields: AggregatedField[];
    status: DatablockStatus;
    pendingAction: PendingAction;
    rowCount: number;
    lastUpdated: string;
}

// Training Datablock - for ML model training with labeled data
interface PredictionModelType {
    id: string;
    name: string;
    description: string;
    icon: typeof Brain;
    outputLabel: {
        name: string;
        type: "binary" | "multiclass" | "regression";
        description: string;
    };
    mlModel: "xgboost" | "random_forest" | "gradient_boosting" | "neural_network";
}

interface TrainingFeature {
    id: string;
    name: string;
    type: "string" | "number" | "boolean" | "timestamp";
    sourceDatablock: string;
    sourceField: string;
    enabled: boolean;
}

interface TrainingDatablock {
    id: string;
    name: string;
    description: string;
    type: "training";
    predictionModelType: PredictionModelType;
    inputDatablocks: string[];
    features: TrainingFeature[];
    outputLabel: {
        name: string;
        type: "binary" | "multiclass" | "regression";
    };
    dataSource: "csv" | "pipeline";
    status: DatablockStatus;
    pendingAction: PendingAction;
    rowCount: number;
    positiveLabels?: number;
    negativeLabels?: number;
    lastUpdated: string;
    csvFileName?: string;
}

// Prediction Model Types for Training Datablocks
const predictionModelTypes: PredictionModelType[] = [
    {
        id: "purchase_probability",
        name: "Purchase Probability",
        description: "Train a model to predict likelihood of purchase",
        icon: ShoppingCart,
        outputLabel: {
            name: "purchased",
            type: "binary",
            description: "1 if user purchased, 0 otherwise",
        },
        mlModel: "xgboost",
    },
    {
        id: "churn_risk",
        name: "Churn Risk",
        description: "Train a model to predict user churn",
        icon: AlertCircle,
        outputLabel: {
            name: "churned",
            type: "binary",
            description: "1 if user churned, 0 otherwise",
        },
        mlModel: "random_forest",
    },
    {
        id: "ltv_prediction",
        name: "Lifetime Value",
        description: "Train a model to predict customer lifetime value",
        icon: DollarSign,
        outputLabel: {
            name: "ltv_value",
            type: "regression",
            description: "Predicted lifetime value in dollars",
        },
        mlModel: "gradient_boosting",
    },
    {
        id: "cart_abandonment",
        name: "Cart Abandonment",
        description: "Train a model to predict cart abandonment",
        icon: ShoppingCart,
        outputLabel: {
            name: "abandoned",
            type: "binary",
            description: "1 if cart was abandoned, 0 if converted",
        },
        mlModel: "xgboost",
    },
    {
        id: "product_affinity",
        name: "Product Affinity",
        description: "Train a model to predict product category preferences",
        icon: Target,
        outputLabel: {
            name: "category_id",
            type: "multiclass",
            description: "Product category the user will purchase",
        },
        mlModel: "neural_network",
    },
];

type Datablock = DirectMappingDatablock | AggregatedDatablock | TrainingDatablock;

// Available pipelines with their fields
const availablePipelines: Pipeline[] = [
    {
        id: "user_modeling",
        name: "User Modeling",
        fields: [
            { name: "user_id", type: "string", description: "Unique user identifier" },
            { name: "email", type: "string", description: "User email address" },
            { name: "created_at", type: "timestamp", description: "Account creation date" },
            { name: "last_login", type: "timestamp", description: "Last login timestamp" },
        ],
    },
    {
        id: "browsing_events",
        name: "Browsing Events",
        eventTypes: ["page_view", "product_view", "category_view", "search", "scroll"],
        fields: [
            { name: "event_type", type: "string", description: "Type of browsing event" },
            { name: "user_id", type: "string", description: "Unique user identifier" },
            { name: "session_id", type: "string", description: "Session identifier" },
            { name: "page_url", type: "string", description: "Page URL visited" },
            { name: "product_id", type: "string", description: "Product ID viewed" },
            { name: "category", type: "string", description: "Product category" },
            { name: "view_duration", type: "number", description: "Time spent on page (seconds)" },
            { name: "timestamp", type: "timestamp", description: "Event timestamp" },
        ],
    },
    {
        id: "cart_events",
        name: "Cart Events",
        eventTypes: ["add_to_cart", "remove_from_cart", "update_quantity", "checkout_started", "payment_selected", "address_added", "payment_completed"],
        fields: [
            { name: "event_type", type: "string", description: "Type of cart event" },
            { name: "user_id", type: "string", description: "Unique user identifier" },
            { name: "cart_id", type: "string", description: "Cart/session identifier" },
            { name: "product_id", type: "string", description: "Product added/removed" },
            { name: "quantity", type: "number", description: "Quantity changed" },
            { name: "price", type: "number", description: "Item price" },
            { name: "cart_value", type: "number", description: "Total cart value" },
            { name: "timestamp", type: "timestamp", description: "Event timestamp" },
        ],
    },
    {
        id: "transaction_events",
        name: "Transaction Events",
        eventTypes: ["order_created", "payment_initiated", "payment_success", "payment_failed", "order_confirmed", "order_shipped", "order_delivered"],
        fields: [
            { name: "event_type", type: "string", description: "Type of transaction event" },
            { name: "user_id", type: "string", description: "Unique user identifier" },
            { name: "order_id", type: "string", description: "Order identifier" },
            { name: "cart_id", type: "string", description: "Cart identifier" },
            { name: "total_amount", type: "number", description: "Transaction total" },
            { name: "discount_amount", type: "number", description: "Discount applied" },
            { name: "items_count", type: "number", description: "Number of items" },
            { name: "payment_method", type: "string", description: "Payment method used" },
            { name: "timestamp", type: "timestamp", description: "Transaction timestamp" },
        ],
    },
];

// Sample datablocks
const sampleDatablocks: Datablock[] = [
    {
        id: "db_users",
        name: "user_profiles",
        description: "Direct mapping of user profile data",
        type: "direct",
        sourcePipelines: ["User Modeling"],
        eventTypes: [], // No event types - this is profile data, not events
        fields: [
            { id: "f1", targetName: "user_id", type: "string", sourcePipeline: "User Modeling", sourceFieldName: "user_id", description: "Unique user identifier", enabled: true },
            { id: "f2", targetName: "email", type: "string", sourcePipeline: "User Modeling", sourceFieldName: "email", description: "User email", enabled: true },
            { id: "f3", targetName: "signup_date", type: "timestamp", sourcePipeline: "User Modeling", sourceFieldName: "created_at", description: "Account creation date", enabled: true },
        ],
        status: "active",
        pendingAction: null,
        rowCount: 125847,
        lastUpdated: "5 mins ago",
    },
    {
        id: "db_browsing",
        name: "browsing_events",
        description: "Direct mapping of browsing event data",
        type: "direct",
        sourcePipelines: ["Browsing Events"],
        eventTypes: ["page_view", "product_view", "category_view", "search", "scroll"],
        fields: [
            { id: "f0", targetName: "event_type", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "event_type", description: "Type of browsing event", enabled: true },
            { id: "f1", targetName: "user_id", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "user_id", description: "Unique user identifier", enabled: true },
            { id: "f1b", targetName: "session_id", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "session_id", description: "Session identifier", enabled: true },
            { id: "f2", targetName: "page_url", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "page_url", enabled: true },
            { id: "f3", targetName: "product_id", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "product_id", enabled: true },
            { id: "f4", targetName: "view_duration", type: "number", sourcePipeline: "Browsing Events", sourceFieldName: "view_duration", enabled: true },
            { id: "f5", targetName: "timestamp", type: "timestamp", sourcePipeline: "Browsing Events", sourceFieldName: "timestamp", enabled: true },
        ],
        status: "active",
        pendingAction: null,
        rowCount: 2450000,
        lastUpdated: "1 min ago",
    },
    {
        id: "db_cart",
        name: "cart_events",
        description: "Direct mapping of cart event data",
        type: "direct",
        sourcePipelines: ["Cart Events"],
        eventTypes: ["add_to_cart", "remove_from_cart", "update_quantity", "checkout_started", "payment_selected", "address_added", "payment_completed"],
        fields: [
            { id: "f0", targetName: "event_type", type: "string", sourcePipeline: "Cart Events", sourceFieldName: "event_type", description: "Type of cart event", enabled: true },
            { id: "f1", targetName: "user_id", type: "string", sourcePipeline: "Cart Events", sourceFieldName: "user_id", enabled: true },
            { id: "f1b", targetName: "cart_id", type: "string", sourcePipeline: "Cart Events", sourceFieldName: "cart_id", description: "Cart/session identifier", enabled: true },
            { id: "f2", targetName: "quantity", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "quantity", enabled: true },
            { id: "f3", targetName: "price", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "price", enabled: true },
            { id: "f4", targetName: "cart_value", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "cart_value", enabled: true },
            { id: "f5", targetName: "timestamp", type: "timestamp", sourcePipeline: "Cart Events", sourceFieldName: "timestamp", enabled: true },
        ],
        status: "active",
        pendingAction: null,
        rowCount: 890000,
        lastUpdated: "2 mins ago",
    },
    {
        id: "db_user_features",
        name: "user_features",
        description: "Aggregated user behavior features from browsing and cart",
        type: "aggregated",
        sourceDatablocks: ["browsing_events", "cart_events"],
        fields: [
            { id: "af1", targetName: "total_page_views_30d", sourceDatablock: "browsing_events", sourceField: "page_url", aggregation: "COUNT", timeWindow: "30d", schedule: "0 * * * *", description: "Total page views in 30 days", lastRun: "45 mins ago" },
            { id: "af2", targetName: "avg_view_duration_7d", sourceDatablock: "browsing_events", sourceField: "view_duration", aggregation: "AVG", timeWindow: "7d", schedule: "0 * * * *", description: "Average view duration", lastRun: "45 mins ago" },
            { id: "af3", targetName: "unique_products_viewed_24h", sourceDatablock: "browsing_events", sourceField: "product_id", aggregation: "COUNT_DISTINCT", timeWindow: "24h", schedule: "*/15 * * * *", description: "Unique products viewed", lastRun: "10 mins ago" },
            { id: "af4", targetName: "total_cart_value_7d", sourceDatablock: "cart_events", sourceField: "cart_value", aggregation: "SUM", timeWindow: "7d", schedule: "0 * * * *", description: "Total cart value in 7 days", lastRun: "45 mins ago" },
        ],
        status: "active",
        pendingAction: null,
        rowCount: 125847,
        lastUpdated: "10 mins ago",
    },
    {
        id: "db_cart_features",
        name: "cart_features",
        description: "Aggregated cart behavior features",
        type: "aggregated",
        sourceDatablocks: ["cart_events"],
        fields: [
            { id: "af1", targetName: "cart_additions_24h", sourceDatablock: "cart_events", sourceField: "quantity", aggregation: "SUM", timeWindow: "24h", schedule: "*/15 * * * *", description: "Total items added to cart", lastRun: "5 mins ago" },
            { id: "af2", targetName: "avg_cart_value_7d", sourceDatablock: "cart_events", sourceField: "cart_value", aggregation: "AVG", timeWindow: "7d", schedule: "0 * * * *", description: "Average cart value", lastRun: "30 mins ago" },
            { id: "af3", targetName: "max_cart_value_30d", sourceDatablock: "cart_events", sourceField: "cart_value", aggregation: "MAX", timeWindow: "30d", schedule: "0 2 * * *", description: "Maximum cart value", lastRun: "2 hours ago" },
        ],
        status: "active",
        pendingAction: null,
        rowCount: 89234,
        lastUpdated: "5 mins ago",
    },
    {
        id: "db_purchase_training",
        name: "purchase_training_data",
        description: "Training data for purchase probability model",
        type: "training",
        predictionModelType: predictionModelTypes[0],
        inputDatablocks: ["user_features", "cart_features"],
        features: [
            { id: "tf1", name: "total_page_views_30d", type: "number", sourceDatablock: "user_features", sourceField: "total_page_views_30d", enabled: true },
            { id: "tf2", name: "avg_view_duration_7d", type: "number", sourceDatablock: "user_features", sourceField: "avg_view_duration_7d", enabled: true },
            { id: "tf3", name: "cart_additions_24h", type: "number", sourceDatablock: "cart_features", sourceField: "cart_additions_24h", enabled: true },
            { id: "tf4", name: "avg_cart_value_7d", type: "number", sourceDatablock: "cart_features", sourceField: "avg_cart_value_7d", enabled: true },
        ],
        outputLabel: {
            name: "purchased",
            type: "binary",
        },
        dataSource: "csv",
        status: "active",
        pendingAction: null,
        rowCount: 50000,
        positiveLabels: 12500,
        negativeLabels: 37500,
        lastUpdated: "1 day ago",
        csvFileName: "purchase_history_2024.csv",
    },
];

export default function FeatureStore() {
    const { selectedProject } = useProject();
    const [datablocks, setDatablocks] = useState<Datablock[]>(sampleDatablocks);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDatablock, setSelectedDatablock] = useState<Datablock | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [savedToBucket, setSavedToBucket] = useState(false);
    
    // Edit and delete state
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Create datablock state
    const [createStep, setCreateStep] = useState<"type" | "config">("type");
    const [newDatablockType, setNewDatablockType] = useState<"direct" | "aggregated" | "training" | null>(null);
    const [newDatablock, setNewDatablock] = useState({
        name: "",
        description: "",
        selectedPipelines: [] as string[],
        selectedDatablocks: [] as string[],
    });

    // Training datablock specific state
    const [trainingStep, setTrainingStep] = useState<1 | 2 | 3>(1);
    
    // Step 1: Cart Events Datablock (mandatory source)
    const [trainingConfig, setTrainingConfig] = useState({
        cartEventsDatablock: "", // Required: direct mapping datablock with cart events
        eventTypeField: "", // Field that contains the event type (e.g., "event_type")
        timestampField: "", // Field that contains the timestamp (e.g., "timestamp")
        userIdField: "", // Field for user identification
        cartIdField: "", // Field for cart/session identification  
        snapshotEventTypes: [] as string[], // Which event type values create prediction snapshots
        successEventType: "", // The event type value that means conversion happened
    });
    
    // Step 2: Label & Job configuration
    const [labelConfig, setLabelConfig] = useState({
        predictionWindow: "30m", // ΔT - how long after snapshot to look for success
        jobFrequency: "hourly", // How often to generate training data
    });
    
    // Step 3: Feature datablocks to attach at snapshot time
    const [featureDatablocks, setFeatureDatablocks] = useState<string[]>([]);

    // Generated fields for direct mapping
    const [generatedFields, setGeneratedFields] = useState<DirectMappingField[]>([]);

    // Fields for aggregated datablock
    const [aggregatedFields, setAggregatedFields] = useState<AggregatedField[]>([]);
    const [isAddingAggField, setIsAddingAggField] = useState(false);
    const [newAggField, setNewAggField] = useState({
        targetName: "",
        sourceDatablock: "",
        sourceField: "",
        aggregation: "COUNT" as AggregatedField["aggregation"],
        timeWindow: "24h",
        schedule: "0 * * * *",
        description: "",
    });

    // Get direct mapping datablocks for aggregation source
    const directDatablocks = datablocks.filter((db): db is DirectMappingDatablock => db.type === "direct");

    // Get all fields from source datablock
    const getAllFields = (datablockName: string) => {
        const db = directDatablocks.find((d) => d.name === datablockName);
        if (!db) return [];
        return db.fields.map((f) => ({ name: f.targetName, type: f.type }));
    };

    // Get the type of selected source field
    const getSelectedFieldType = () => {
        if (!newAggField.sourceDatablock || !newAggField.sourceField) return null;
        const fields = getAllFields(newAggField.sourceDatablock);
        const field = fields.find((f) => f.name === newAggField.sourceField);
        return field?.type || null;
    };

    // Get available aggregations based on field type
    const getAggregationsForType = (fieldType: string | null) => {
        const allAggregations = [
            { value: "COUNT", label: "COUNT", types: ["string", "number", "boolean", "timestamp", "object"] },
            { value: "COUNT_DISTINCT", label: "COUNT_DISTINCT", types: ["string", "number", "boolean", "timestamp", "object"] },
            { value: "SUM", label: "SUM", types: ["number"] },
            { value: "AVG", label: "AVG", types: ["number"] },
            { value: "MIN", label: "MIN", types: ["number", "timestamp"] },
            { value: "MAX", label: "MAX", types: ["number", "timestamp"] },
        ];

        if (!fieldType) return allAggregations;
        return allAggregations.filter((agg) => agg.types.includes(fieldType));
    };

    const selectedFieldType = getSelectedFieldType();
    const availableAggregations = getAggregationsForType(selectedFieldType);

    // Generate fields when pipelines are selected
    useEffect(() => {
        if (newDatablockType !== "direct") return;

        const fields: DirectMappingField[] = [];
        const seenFields = new Set<string>();

        newDatablock.selectedPipelines.forEach((pipelineName) => {
            const pipeline = availablePipelines.find((p) => p.name === pipelineName);
            if (pipeline) {
                pipeline.fields.forEach((field) => {
                    if (field.name === "user_id" && seenFields.has("user_id")) return;
                    if (field.name === "user_id") seenFields.add("user_id");

                    fields.push({
                        id: `f_${pipelineName}_${field.name}`,
                        targetName: field.name,
                        type: field.type,
                        sourcePipeline: pipelineName,
                        sourceFieldName: field.name,
                        description: field.description,
                        enabled: true,
                    });
                });
            }
        });

        setGeneratedFields(fields);
    }, [newDatablock.selectedPipelines, newDatablockType]);

    const filteredDatablocks = datablocks.filter(
        (db) =>
            db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            db.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to view and manage your feature store."
            />
        );
    }

    const togglePipeline = (pipelineName: string) => {
        setNewDatablock((prev) => ({
            ...prev,
            selectedPipelines: prev.selectedPipelines.includes(pipelineName)
                ? prev.selectedPipelines.filter((p) => p !== pipelineName)
                : [...prev.selectedPipelines, pipelineName],
        }));
    };

    const toggleFieldEnabled = (fieldId: string) => {
        setGeneratedFields((prev) =>
            prev.map((f) => (f.id === fieldId ? { ...f, enabled: !f.enabled } : f))
        );
    };

    const updateFieldTargetName = (fieldId: string, newName: string) => {
        setGeneratedFields((prev) =>
            prev.map((f) => (f.id === fieldId ? { ...f, targetName: newName } : f))
        );
    };

    const resetCreateForm = () => {
        setCreateStep("type");
        setNewDatablockType(null);
        setNewDatablock({ name: "", description: "", selectedPipelines: [], selectedDatablocks: [] });
        setGeneratedFields([]);
        setAggregatedFields([]);
        setIsAddingAggField(false);
        setNewAggField({
            targetName: "",
            sourceDatablock: "",
            sourceField: "",
            aggregation: "COUNT",
            timeWindow: "24h",
            schedule: "0 * * * *",
            description: "",
        });
        // Reset training datablock state
        setTrainingStep(1);
        setTrainingConfig({
            cartEventsDatablock: "",
            eventTypeField: "",
            timestampField: "",
            userIdField: "",
            cartIdField: "",
            snapshotEventTypes: [],
            successEventType: "",
        });
        setLabelConfig({
            predictionWindow: "30m",
            jobFrequency: "hourly",
        });
        setFeatureDatablocks([]);
    };

    const handleCreateDatablock = () => {
        if (!newDatablock.name) return;

        if (newDatablockType === "direct") {
            const enabledFields = generatedFields.filter((f) => f.enabled);
            if (enabledFields.length === 0) return;

            // Collect event types from selected pipelines
            const eventTypes: string[] = [];
            newDatablock.selectedPipelines.forEach(pipelineName => {
                const pipeline = availablePipelines.find(p => p.name === pipelineName);
                if (pipeline?.eventTypes) {
                    eventTypes.push(...pipeline.eventTypes);
                }
            });

            const datablock: DirectMappingDatablock = {
                id: `db_${Date.now()}`,
                name: newDatablock.name.toLowerCase().replace(/\s+/g, "_"),
                description: newDatablock.description,
                type: "direct",
                sourcePipelines: newDatablock.selectedPipelines,
                eventTypes: [...new Set(eventTypes)], // Remove duplicates
                fields: enabledFields,
                status: "awaiting_deployment",
                pendingAction: "create",
                rowCount: 0,
                lastUpdated: "Never",
            };

            setDatablocks([...datablocks, datablock]);
            setSelectedDatablock(datablock);
            setSavedToBucket(true);
            setTimeout(() => setSavedToBucket(false), 5000);
        } else if (newDatablockType === "aggregated") {
            if (aggregatedFields.length === 0 || newDatablock.selectedDatablocks.length === 0) return;

            const datablock: AggregatedDatablock = {
                id: `db_${Date.now()}`,
                name: newDatablock.name.toLowerCase().replace(/\s+/g, "_"),
                description: newDatablock.description,
                type: "aggregated",
                sourceDatablocks: newDatablock.selectedDatablocks,
                fields: aggregatedFields,
                status: "awaiting_deployment",
                pendingAction: "create",
                rowCount: 0,
                lastUpdated: "Never",
            };

            setDatablocks([...datablocks, datablock]);
            setSelectedDatablock(datablock);
            setSavedToBucket(true);
            setTimeout(() => setSavedToBucket(false), 5000);
        } else if (newDatablockType === "training") {
            if (!trainingConfig.cartEventsDatablock || featureDatablocks.length === 0) return;

            // Build features from selected datablocks
            const features: TrainingFeature[] = featureDatablocks.flatMap(dbName => {
                const db = datablocks.find(d => d.name === dbName);
                if (!db) return [];
                
                const fields = db.type === "direct" 
                    ? (db as DirectMappingDatablock).fields 
                    : (db as AggregatedDatablock).fields;
                
                return fields.map(field => ({
                    id: `tf_${dbName}_${field.targetName}`,
                    name: field.targetName,
                    type: "number" as const, // Simplified for now
                    sourceDatablock: dbName,
                    sourceField: field.targetName,
                    enabled: true,
                }));
            });

            // Get purchase probability model type
            const purchaseModel = predictionModelTypes.find(m => m.id === "purchase_probability")!;

            const datablock: TrainingDatablock = {
                id: `db_${Date.now()}`,
                name: newDatablock.name.toLowerCase().replace(/\s+/g, "_"),
                description: newDatablock.description || "Training data for purchase probability prediction",
                type: "training",
                predictionModelType: purchaseModel,
                inputDatablocks: featureDatablocks,
                features,
                outputLabel: {
                    name: purchaseModel.outputLabel.name,
                    type: purchaseModel.outputLabel.type,
                },
                dataSource: "pipeline", // Changed from "csv" to "pipeline"
                status: "awaiting_deployment",
                pendingAction: "create",
                rowCount: 0, // Will be computed after deployment
                positiveLabels: 0,
                negativeLabels: 0,
                lastUpdated: "Never",
            };

            setDatablocks([...datablocks, datablock]);
            setSelectedDatablock(datablock);
            setSavedToBucket(true);
            setTimeout(() => setSavedToBucket(false), 5000);
        }

        setIsCreating(false);
        resetCreateForm();
    };

    const toggleSourceDatablock = (datablockName: string) => {
        setNewDatablock((prev) => ({
            ...prev,
            selectedDatablocks: prev.selectedDatablocks.includes(datablockName)
                ? prev.selectedDatablocks.filter((d) => d !== datablockName)
                : [...prev.selectedDatablocks, datablockName],
        }));
    };

    const handleAddAggField = () => {
        if (!newAggField.targetName || !newAggField.sourceField || !newAggField.sourceDatablock) return;

        const field: AggregatedField = {
            id: `af_${Date.now()}`,
            targetName: newAggField.targetName.toLowerCase().replace(/\s+/g, "_"),
            sourceDatablock: newAggField.sourceDatablock,
            sourceField: newAggField.sourceField,
            aggregation: newAggField.aggregation,
            timeWindow: newAggField.timeWindow,
            schedule: newAggField.schedule,
            description: newAggField.description,
        };

        setAggregatedFields([...aggregatedFields, field]);
        setNewAggField({
            targetName: "",
            sourceDatablock: "",
            sourceField: "",
            aggregation: "COUNT",
            timeWindow: "24h",
            schedule: "0 * * * *",
            description: "",
        });
        setIsAddingAggField(false);
    };

    const handleRemoveAggField = (fieldId: string) => {
        setAggregatedFields(aggregatedFields.filter((f) => f.id !== fieldId));
    };

    const handleDeleteToBucket = () => {
        if (!selectedDatablock) return;
        
        const updatedDatablock = {
            ...selectedDatablock,
            status: "awaiting_deployment" as DatablockStatus,
            pendingAction: "delete" as PendingAction,
        };
        
        setDatablocks(datablocks.map((db) => (db.id === selectedDatablock.id ? updatedDatablock : db)));
        setSelectedDatablock(updatedDatablock);
        setShowDeleteConfirm(false);
        setIsEditing(false);
        setSavedToBucket(true);
        setTimeout(() => setSavedToBucket(false), 5000);
    };

    const handleRevertChanges = () => {
        if (!selectedDatablock) return;
        
        if (selectedDatablock.pendingAction === "create") {
            // Remove the datablock entirely if it was a pending create
            setDatablocks(datablocks.filter((db) => db.id !== selectedDatablock.id));
            setSelectedDatablock(null);
        } else {
            // Revert to active status for update/delete
            const updatedDatablock = {
                ...selectedDatablock,
                status: "active" as DatablockStatus,
                pendingAction: null as PendingAction,
            };
            setDatablocks(datablocks.map((db) => (db.id === selectedDatablock.id ? updatedDatablock : db)));
            setSelectedDatablock(updatedDatablock);
        }
    };

    const handleCloseDrawer = () => {
        setSelectedDatablock(null);
        setIsEditing(false);
        setSavedToBucket(false);
    };

    const getStatusBadge = (status: DatablockStatus, pendingAction?: PendingAction) => {
        if (status === "awaiting_deployment") {
            const actionLabel = pendingAction === "create" ? "Create" : pendingAction === "update" ? "Update" : "Delete";
            const actionColor = pendingAction === "delete" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
            return (
                <Badge className={actionColor}>
                    <Clock className="h-3 w-3 mr-1" />
                    {actionLabel} Pending
                </Badge>
            );
        }
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
            case "inactive":
                return <Badge className="bg-slate-100 text-slate-600">Inactive</Badge>;
            case "building":
                return (
                    <Badge className="bg-blue-100 text-blue-700">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Building
                    </Badge>
                );
        }
    };

    const getTypeBadge = (type: "direct" | "aggregated" | "training") => {
        if (type === "direct") {
            return (
                <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50">
                    <Link2 className="h-3 w-3" />
                    Direct
                </Badge>
            );
        }
        if (type === "aggregated") {
            return (
                <Badge variant="outline" className="text-xs gap-1 border-violet-200 text-violet-700 bg-violet-50">
                    <Calculator className="h-3 w-3" />
                    Aggregated
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-xs gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
                <Brain className="h-3 w-3" />
                Training
            </Badge>
        );
    };

    const cronToText = (cron: string) => {
        const cronMap: Record<string, string> = {
            "*/15 * * * *": "Every 15 mins",
            "0 * * * *": "Hourly",
            "0 */6 * * *": "Every 6 hours",
            "0 2 * * *": "Daily at 2 AM",
            "0 0 * * *": "Daily at midnight",
        };
        return cronMap[cron] || cron;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Feature Store</h1>
                    <p className="text-slate-500 mt-1">
                        Configure datablocks for direct mappings and aggregations
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreating(true)}
                    className="gap-2 bg-slate-900 hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" />
                    Create Datablock
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Link2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {datablocks.filter((db) => db.type === "direct").length}
                                </p>
                                <p className="text-sm text-slate-500">Direct Mapping</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {datablocks.filter((db) => db.type === "aggregated").length}
                                </p>
                                <p className="text-sm text-slate-500">Aggregated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {datablocks.filter((db) => db.type === "training").length}
                                </p>
                                <p className="text-sm text-slate-500">Training</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {datablocks.reduce((acc, db) => acc + (db.type === "training" ? (db as TrainingDatablock).features.length : db.fields.length), 0)}
                                </p>
                                <p className="text-sm text-slate-500">Total Fields</p>
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
                        placeholder="Search datablocks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Datablocks by Type */}
            {filteredDatablocks.length === 0 ? (
                <div className="text-center py-12">
                    <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">No datablocks found</p>
                    <Button variant="outline" onClick={() => setIsCreating(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first datablock
                    </Button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Direct Mapping Section */}
                    {filteredDatablocks.filter(db => db.type === "direct").length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Link2 className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Direct Mapping</h3>
                                    <p className="text-xs text-slate-500">Fields mapped directly from source pipelines</p>
                                </div>
                                <Badge variant="secondary" className="ml-auto">
                                    {filteredDatablocks.filter(db => db.type === "direct").length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDatablocks.filter(db => db.type === "direct").map((datablock) => (
                                    <Card
                                        key={datablock.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-blue-500",
                                            datablock.status === "active" && "border-t-emerald-200 border-r-emerald-200 border-b-emerald-200"
                                        )}
                                        onClick={() => setSelectedDatablock(datablock)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-semibold">
                                                        <code className="font-mono">{datablock.name}</code>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-0.5">
                                                        {(datablock as DirectMappingDatablock).sourcePipelines.join(", ")}
                                                    </CardDescription>
                                                </div>
                                                {getStatusBadge(datablock.status, datablock.pendingAction)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                                {datablock.description}
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span>
                                                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                                                    {datablock.fields.length} fields
                                                </span>
                                                <span>
                                                    <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                                                    {datablock.rowCount.toLocaleString()} rows
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Aggregated Section */}
                    {filteredDatablocks.filter(db => db.type === "aggregated").length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Calculator className="h-4 w-4 text-violet-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Aggregated</h3>
                                    <p className="text-xs text-slate-500">Computed aggregations over time windows</p>
                                </div>
                                <Badge variant="secondary" className="ml-auto">
                                    {filteredDatablocks.filter(db => db.type === "aggregated").length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDatablocks.filter(db => db.type === "aggregated").map((datablock) => (
                                    <Card
                                        key={datablock.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-violet-500",
                                            datablock.status === "active" && "border-t-emerald-200 border-r-emerald-200 border-b-emerald-200"
                                        )}
                                        onClick={() => setSelectedDatablock(datablock)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-semibold">
                                                        <code className="font-mono">{datablock.name}</code>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-0.5">
                                                        From {(datablock as AggregatedDatablock).sourceDatablocks.join(", ")}
                                                    </CardDescription>
                                                </div>
                                                {getStatusBadge(datablock.status, datablock.pendingAction)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                                {datablock.description}
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span>
                                                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                                                    {datablock.fields.length} fields
                                                </span>
                                                <span>
                                                    <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                                                    {datablock.rowCount.toLocaleString()} rows
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Training Data Section */}
                    {filteredDatablocks.filter(db => db.type === "training").length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Brain className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Training Data</h3>
                                    <p className="text-xs text-slate-500">Labeled datasets for ML model training</p>
                                </div>
                                <Badge variant="secondary" className="ml-auto">
                                    {filteredDatablocks.filter(db => db.type === "training").length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDatablocks.filter(db => db.type === "training").map((datablock) => (
                                    <Card
                                        key={datablock.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-emerald-500",
                                            datablock.status === "active" && "border-t-emerald-200 border-r-emerald-200 border-b-emerald-200"
                                        )}
                                        onClick={() => setSelectedDatablock(datablock)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-semibold">
                                                        <code className="font-mono">{datablock.name}</code>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-0.5">
                                                        {(datablock as TrainingDatablock).predictionModelType.name}
                                                    </CardDescription>
                                                </div>
                                                {getStatusBadge(datablock.status, datablock.pendingAction)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                                {datablock.description}
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                                <span>
                                                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                                                    {(datablock as TrainingDatablock).features.length} features
                                                </span>
                                                <span>
                                                    <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                                                    {datablock.rowCount.toLocaleString()} rows
                                                </span>
                                            </div>
                                            {(datablock as TrainingDatablock).positiveLabels !== undefined && (
                                                <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-100">
                                                    <span className="text-emerald-600 font-medium">
                                                        +{(datablock as TrainingDatablock).positiveLabels?.toLocaleString()}
                                                    </span>
                                                    <span className="text-slate-300">/</span>
                                                    <span className="text-red-600 font-medium">
                                                        -{(datablock as TrainingDatablock).negativeLabels?.toLocaleString()}
                                                    </span>
                                                    <span className="text-slate-400 ml-1">labels</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Datablock Sheet */}
            <Sheet open={isCreating && !(createStep === "config" && newDatablockType === "training")} onOpenChange={(open) => { setIsCreating(open); if (!open) resetCreateForm(); }}>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Create Datablock</SheetTitle>
                    </SheetHeader>

                    {/* Step 1: Select Type */}
                    {createStep === "type" && (
                        <div className="mt-6 space-y-6">
                            <div>
                                <Label className="text-sm font-medium">Select Datablock Type</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-4">
                                    Choose how this datablock will source its data
                                </p>
                                <div className="space-y-3">
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            newDatablockType === "direct" && "ring-2 ring-blue-500 border-blue-200"
                                        )}
                                        onClick={() => setNewDatablockType("direct")}
                                    >
                                        <CardContent className="py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                                    <Link2 className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Direct Mapping</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Map fields directly from source pipelines. No aggregation.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            newDatablockType === "aggregated" && "ring-2 ring-violet-500 border-violet-200"
                                        )}
                                        onClick={() => setNewDatablockType("aggregated")}
                                    >
                                        <CardContent className="py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                                    <Calculator className="h-6 w-6 text-violet-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Aggregated</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Aggregate fields from another datablock with time windows.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            newDatablockType === "training" && "ring-2 ring-emerald-500 border-emerald-200"
                                        )}
                                        onClick={() => setNewDatablockType("training")}
                                    >
                                        <CardContent className="py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <Brain className="h-6 w-6 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Training Data</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Labeled data for ML model training. Upload CSV with features and labels.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => setCreateStep("config")}
                                    disabled={!newDatablockType}
                                    className="flex-1 bg-slate-900"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configure Direct Mapping */}
                    {createStep === "config" && newDatablockType === "direct" && (
                        <div className="mt-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">Datablock Name</Label>
                                    <Input
                                        placeholder="e.g., user_profiles"
                                        value={newDatablock.name}
                                        onChange={(e) => setNewDatablock({ ...newDatablock, name: e.target.value })}
                                        className="mt-1.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Description</Label>
                                    <Input
                                        placeholder="What data does this datablock contain?"
                                        value={newDatablock.description}
                                        onChange={(e) => setNewDatablock({ ...newDatablock, description: e.target.value })}
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Source Pipelines</Label>
                                <p className="text-xs text-slate-500 mt-1 mb-3">
                                    Select pipelines to map fields from
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {availablePipelines.map((pipeline) => {
                                        const hasEventTypes = pipeline.eventTypes && pipeline.eventTypes.length > 0;
                                        return (
                                            <div
                                                key={pipeline.id}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition-colors",
                                                    newDatablock.selectedPipelines.includes(pipeline.name)
                                                        ? "border-blue-300 bg-blue-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => togglePipeline(pipeline.name)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox checked={newDatablock.selectedPipelines.includes(pipeline.name)} />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{pipeline.name}</p>
                                                        <p className="text-xs text-slate-500">{pipeline.fields.length} fields</p>
                                                    </div>
                                                </div>
                                                {hasEventTypes && newDatablock.selectedPipelines.includes(pipeline.name) && (
                                                    <div className="mt-2 pt-2 border-t border-blue-200">
                                                        <p className="text-xs font-medium text-blue-700 mb-1">Event Types:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {pipeline.eventTypes!.slice(0, 4).map(et => (
                                                                <Badge key={et} variant="secondary" className="text-xs font-mono">
                                                                    {et}
                                                                </Badge>
                                                            ))}
                                                            {pipeline.eventTypes!.length > 4 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{pipeline.eventTypes!.length - 4}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {generatedFields.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-sm font-medium">Field Mappings</Label>
                                        <Badge variant="secondary">{generatedFields.filter((f) => f.enabled).length} selected</Badge>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50">
                                                    <TableHead className="w-10"></TableHead>
                                                    <TableHead className="text-xs">Source</TableHead>
                                                    <TableHead className="text-xs w-8"></TableHead>
                                                    <TableHead className="text-xs">Target Name</TableHead>
                                                    <TableHead className="text-xs">Type</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {generatedFields.map((field) => (
                                                    <TableRow key={field.id} className={cn(!field.enabled && "opacity-50")}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={field.enabled}
                                                                onCheckedChange={() => toggleFieldEnabled(field.id)}
                                                                disabled={field.sourceFieldName === "user_id"}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-xs">{field.sourceFieldName}</code>
                                                            <p className="text-xs text-slate-400">{field.sourcePipeline}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <ArrowRight className="h-3 w-3 text-slate-300" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={field.targetName}
                                                                onChange={(e) => updateFieldTargetName(field.id, e.target.value)}
                                                                className="h-7 text-xs font-mono"
                                                                disabled={!field.enabled}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep("type")} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateDatablock}
                                    disabled={!newDatablock.name || generatedFields.filter((f) => f.enabled).length === 0}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    Create Direct Datablock
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configure Aggregated */}
                    {createStep === "config" && newDatablockType === "aggregated" && (
                        <div className="mt-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">Datablock Name</Label>
                                    <Input
                                        placeholder="e.g., user_features"
                                        value={newDatablock.name}
                                        onChange={(e) => setNewDatablock({ ...newDatablock, name: e.target.value })}
                                        className="mt-1.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Description</Label>
                                    <Input
                                        placeholder="What aggregated features does this contain?"
                                        value={newDatablock.description}
                                        onChange={(e) => setNewDatablock({ ...newDatablock, description: e.target.value })}
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Source Datablocks</Label>
                                    <p className="text-xs text-slate-500 mt-1 mb-2">
                                        Select one or more direct mapping datablocks to aggregate from
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {directDatablocks.map((db) => (
                                            <div
                                                key={db.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                                    newDatablock.selectedDatablocks.includes(db.name)
                                                        ? "border-violet-300 bg-violet-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => toggleSourceDatablock(db.name)}
                                            >
                                                <Checkbox checked={newDatablock.selectedDatablocks.includes(db.name)} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium font-mono">{db.name}</p>
                                                    <p className="text-xs text-slate-500">{db.fields.length} fields</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Aggregated Fields */}
                            {newDatablock.selectedDatablocks.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-sm font-medium">Aggregation Fields</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsAddingAggField(true)}
                                            className="gap-1 h-8"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Field
                                        </Button>
                                    </div>

                                    {/* Add Aggregation Field Form */}
                                    {isAddingAggField && (
                                        <div className="p-4 rounded-lg border border-dashed border-violet-300 bg-violet-50/30 space-y-3 mb-4">
                                            <div>
                                                <Label className="text-xs">Source Datablock</Label>
                                                <Select
                                                    value={newAggField.sourceDatablock}
                                                    onValueChange={(v) => setNewAggField({ ...newAggField, sourceDatablock: v, sourceField: "", aggregation: "COUNT" })}
                                                >
                                                    <SelectTrigger className="mt-1 h-9">
                                                        <SelectValue placeholder="Select datablock" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {newDatablock.selectedDatablocks.map((name) => (
                                                            <SelectItem key={name} value={name}>
                                                                {name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Source Field</Label>
                                                    <Select
                                                        value={newAggField.sourceField}
                                                        onValueChange={(v) => setNewAggField({ ...newAggField, sourceField: v, aggregation: "COUNT" })}
                                                        disabled={!newAggField.sourceDatablock}
                                                    >
                                                        <SelectTrigger className="mt-1 h-9">
                                                            <SelectValue placeholder={newAggField.sourceDatablock ? "Select field" : "Select datablock first"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {getAllFields(newAggField.sourceDatablock).map((f) => (
                                                                <SelectItem key={f.name} value={f.name}>
                                                                    {f.name} ({f.type})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Aggregation</Label>
                                                    <Select
                                                        value={newAggField.aggregation}
                                                        onValueChange={(v) => setNewAggField({ ...newAggField, aggregation: v as AggregatedField["aggregation"] })}
                                                        disabled={!newAggField.sourceField}
                                                    >
                                                        <SelectTrigger className="mt-1 h-9">
                                                            <SelectValue placeholder={!newAggField.sourceField ? "Select field first" : "Select aggregation"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableAggregations.map((agg) => (
                                                                <SelectItem key={agg.value} value={agg.value}>
                                                                    {agg.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Time Window</Label>
                                                    <Select
                                                        value={newAggField.timeWindow}
                                                        onValueChange={(v) => setNewAggField({ ...newAggField, timeWindow: v })}
                                                    >
                                                        <SelectTrigger className="mt-1 h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1h">1 hour</SelectItem>
                                                            <SelectItem value="24h">24 hours</SelectItem>
                                                            <SelectItem value="7d">7 days</SelectItem>
                                                            <SelectItem value="30d">30 days</SelectItem>
                                                            <SelectItem value="90d">90 days</SelectItem>
                                                            <SelectItem value="lifetime">Lifetime</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Schedule</Label>
                                                    <Select
                                                        value={newAggField.schedule}
                                                        onValueChange={(v) => setNewAggField({ ...newAggField, schedule: v })}
                                                    >
                                                        <SelectTrigger className="mt-1 h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="*/15 * * * *">Every 15 mins</SelectItem>
                                                            <SelectItem value="0 * * * *">Hourly</SelectItem>
                                                            <SelectItem value="0 */6 * * *">Every 6 hours</SelectItem>
                                                            <SelectItem value="0 2 * * *">Daily</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs">Target Field Name</Label>
                                                <Input
                                                    placeholder="e.g., total_purchases_30d"
                                                    value={newAggField.targetName}
                                                    onChange={(e) => setNewAggField({ ...newAggField, targetName: e.target.value })}
                                                    className="mt-1 h-9 font-mono text-sm"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="ghost" size="sm" onClick={() => setIsAddingAggField(false)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddAggField}
                                                    disabled={!newAggField.targetName || !newAggField.sourceField}
                                                    className="bg-violet-600 hover:bg-violet-700"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Aggregated Fields List */}
                                    {aggregatedFields.length > 0 ? (
                                        <div className="space-y-2">
                                            {aggregatedFields.map((field) => (
                                                <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-white group">
                                                    <div>
                                                        <code className="text-sm font-mono font-semibold text-slate-800">
                                                            {field.targetName}
                                                        </code>
                                                        <div className="flex items-center flex-wrap gap-1.5 mt-1 text-xs text-slate-500">
                                                            <Badge className="bg-violet-100 text-violet-700 text-xs">{field.aggregation}</Badge>
                                                            <span>of</span>
                                                            <code className="bg-slate-100 px-1 rounded">{field.sourceDatablock}.{field.sourceField}</code>
                                                            <span>over</span>
                                                            <Badge variant="secondary" className="text-xs">{field.timeWindow}</Badge>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{cronToText(field.schedule)}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveAggField(field.id)}
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : !isAddingAggField && (
                                        <div className="text-center py-8 border border-dashed rounded-lg">
                                            <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No aggregation fields yet</p>
                                            <p className="text-xs text-slate-400">Add fields to define aggregations</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setCreateStep("type")} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateDatablock}
                                    disabled={!newDatablock.name || newDatablock.selectedDatablocks.length === 0 || aggregatedFields.length === 0}
                                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                                >
                                    Create Aggregated Datablock
                                </Button>
                            </div>
                        </div>
                    )}

                </SheetContent>
            </Sheet>

            {/* Full-Page Training Datablock Wizard */}
            {createStep === "config" && newDatablockType === "training" && (
                <div className="fixed inset-0 z-50 bg-white">
                    {/* Header */}
                    <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
                        <div className="max-w-6xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setCreateStep("type"); resetCreateForm(); }}
                                        className="shrink-0"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <h1 className="text-lg font-semibold text-slate-900">Create Training Datablock</h1>
                                        <p className="text-sm text-slate-500">Build labeled training data from event streams</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {[
                                        { step: 1, label: "Snapshots" },
                                        { step: 2, label: "Labels" },
                                        { step: 3, label: "Features" },
                                    ].map(({ step, label }) => (
                                        <div key={step} className="flex items-center">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                                        trainingStep === step
                                                            ? "bg-emerald-500 text-white"
                                                            : trainingStep > step
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-slate-100 text-slate-400"
                                                    )}
                                                >
                                                    {trainingStep > step ? <Check className="h-4 w-4" /> : step}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    trainingStep === step ? "text-emerald-700" : "text-slate-400"
                                                )}>{label}</span>
                                            </div>
                                            {step < 3 && (
                                                <div className={cn(
                                                    "w-8 h-0.5 mx-2",
                                                    trainingStep > step ? "bg-emerald-300" : "bg-slate-200"
                                                )} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-w-6xl mx-auto px-6 py-8 overflow-y-auto" style={{ height: "calc(100vh - 140px)" }}>
                        {/* Step 1: Select Cart Events Datablock */}
                        {trainingStep === 1 && (
                            <div className="space-y-8">
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                        <Database className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Step 1: Select Cart Events Datablock</h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Select the cart events datablock that contains your checkout funnel events. This is required for generating training labels.
                                        </p>
                                    </div>
                                </div>

                                {/* Important Notice */}
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-amber-900">Prerequisite: Cart Events Datablock</p>
                                            <p className="text-sm text-amber-700 mt-1">
                                                You need a Direct Mapping datablock with cart/checkout events. This datablock should contain events like:
                                                Add to Cart, Checkout Started, Payment Selected, and Payment Completed.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    {/* Cart Events Datablock Selection */}
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">
                                            Cart Events Datablock <span className="text-red-500">*</span>
                                        </Label>
                                        <p className="text-xs text-slate-500 mb-3">Select your cart events direct mapping datablock</p>
                                        <div className="space-y-2">
                                            {datablocks.filter(db => db.type === "direct" && db.status === "active").length === 0 ? (
                                                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center">
                                                    <p className="text-sm text-slate-500">No direct mapping datablocks found.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Create a cart events datablock first.</p>
                                                </div>
                                            ) : (
                                                datablocks.filter(db => db.type === "direct" && db.status === "active").map((db) => (
                                                    <div
                                                        key={db.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                            trainingConfig.cartEventsDatablock === db.name
                                                                ? "border-blue-500 bg-blue-50"
                                                                : "border-slate-200 hover:border-slate-300"
                                                        )}
                                                        onClick={() => setTrainingConfig({ ...trainingConfig, cartEventsDatablock: db.name })}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                            trainingConfig.cartEventsDatablock === db.name
                                                                ? "border-blue-500 bg-blue-500"
                                                                : "border-slate-300"
                                                        )}>
                                                            {trainingConfig.cartEventsDatablock === db.name && (
                                                                <Check className="h-3 w-3 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium font-mono">{db.name}</p>
                                                            <p className="text-xs text-slate-500">{(db as DirectMappingDatablock).fields.length} fields</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">Direct</Badge>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Field Mapping & Event Configuration */}
                                    <div className="space-y-5">
                                        {/* Show fields only when a datablock is selected */}
                                        {trainingConfig.cartEventsDatablock ? (
                                            <>
                                                {/* Field Mappings */}
                                                <div className="p-4 border rounded-xl bg-slate-50">
                                                    <Label className="text-sm font-medium mb-3 block">Field Mappings</Label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label className="text-xs text-slate-500">Event Type Field</Label>
                                                            <Select
                                                                value={trainingConfig.eventTypeField}
                                                                onValueChange={(v) => setTrainingConfig({ ...trainingConfig, eventTypeField: v, snapshotEventTypes: [], successEventType: "" })}
                                                            >
                                                                <SelectTrigger className="mt-1 text-sm">
                                                                    <SelectValue placeholder="Select field" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined)?.fields.map(f => (
                                                                        <SelectItem key={f.id} value={f.targetName}>
                                                                            <span className="font-mono">{f.targetName}</span>
                                                                            <span className="text-slate-400 ml-2">({f.type})</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-slate-500">Timestamp Field</Label>
                                                            <Select
                                                                value={trainingConfig.timestampField}
                                                                onValueChange={(v) => setTrainingConfig({ ...trainingConfig, timestampField: v })}
                                                            >
                                                                <SelectTrigger className="mt-1 text-sm">
                                                                    <SelectValue placeholder="Select field" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined)?.fields.map(f => (
                                                                        <SelectItem key={f.id} value={f.targetName}>
                                                                            <span className="font-mono">{f.targetName}</span>
                                                                            <span className="text-slate-400 ml-2">({f.type})</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-slate-500">User ID Field</Label>
                                                            <Select
                                                                value={trainingConfig.userIdField}
                                                                onValueChange={(v) => setTrainingConfig({ ...trainingConfig, userIdField: v })}
                                                            >
                                                                <SelectTrigger className="mt-1 text-sm">
                                                                    <SelectValue placeholder="Select field" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined)?.fields.map(f => (
                                                                        <SelectItem key={f.id} value={f.targetName}>
                                                                            <span className="font-mono">{f.targetName}</span>
                                                                            <span className="text-slate-400 ml-2">({f.type})</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-slate-500">Cart/Session ID Field</Label>
                                                            <Select
                                                                value={trainingConfig.cartIdField}
                                                                onValueChange={(v) => setTrainingConfig({ ...trainingConfig, cartIdField: v })}
                                                            >
                                                                <SelectTrigger className="mt-1 text-sm">
                                                                    <SelectValue placeholder="Select field" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined)?.fields.map(f => (
                                                                        <SelectItem key={f.id} value={f.targetName}>
                                                                            <span className="font-mono">{f.targetName}</span>
                                                                            <span className="text-slate-400 ml-2">({f.type})</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Snapshot Events - show actual event types from the selected datablock */}
                                                {trainingConfig.eventTypeField && (() => {
                                                    const selectedDb = datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined;
                                                    const availableEventTypes = selectedDb?.eventTypes || [];
                                                    
                                                    return (
                                                        <div>
                                                            <Label className="text-sm font-medium mb-2 block">Snapshot Event Types</Label>
                                                            <p className="text-xs text-slate-500 mb-3">
                                                                Select which events trigger a prediction snapshot
                                                            </p>
                                                            {availableEventTypes.length > 0 ? (
                                                                <div className="space-y-2 p-4 border rounded-xl bg-slate-50">
                                                                    {availableEventTypes.filter(et => et !== trainingConfig.successEventType).map((eventType) => (
                                                                        <div key={eventType} className="flex items-center gap-3">
                                                                            <Checkbox
                                                                                checked={trainingConfig.snapshotEventTypes.includes(eventType)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        setTrainingConfig({
                                                                                            ...trainingConfig,
                                                                                            snapshotEventTypes: [...trainingConfig.snapshotEventTypes, eventType]
                                                                                        });
                                                                                    } else {
                                                                                        setTrainingConfig({
                                                                                            ...trainingConfig,
                                                                                            snapshotEventTypes: trainingConfig.snapshotEventTypes.filter(e => e !== eventType)
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <code className="text-sm font-mono">{eventType}</code>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 border-2 border-dashed border-amber-200 bg-amber-50 rounded-xl">
                                                                    <p className="text-sm text-amber-700">
                                                                        No event types defined for this datablock. 
                                                                        Event types should be captured when creating the direct mapping.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Success Event - show actual event types from the selected datablock */}
                                                {trainingConfig.eventTypeField && (() => {
                                                    const selectedDb = datablocks.find(db => db.name === trainingConfig.cartEventsDatablock) as DirectMappingDatablock | undefined;
                                                    const availableEventTypes = selectedDb?.eventTypes || [];
                                                    
                                                    return (
                                                        <div>
                                                            <Label className="text-sm font-medium mb-2 block">Success Event (Label = 1)</Label>
                                                            <p className="text-xs text-slate-500 mb-3">
                                                                Which event indicates a successful conversion?
                                                            </p>
                                                            {availableEventTypes.length > 0 ? (
                                                                <div className="space-y-2 p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                                                                    {availableEventTypes.map((eventType) => (
                                                                        <div 
                                                                            key={eventType} 
                                                                            className={cn(
                                                                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                                                                trainingConfig.successEventType === eventType 
                                                                                    ? "bg-emerald-200" 
                                                                                    : "hover:bg-emerald-100"
                                                                            )}
                                                                            onClick={() => {
                                                                                setTrainingConfig({
                                                                                    ...trainingConfig,
                                                                                    successEventType: eventType,
                                                                                    // Remove from snapshot events if selected as success
                                                                                    snapshotEventTypes: trainingConfig.snapshotEventTypes.filter(e => e !== eventType)
                                                                                });
                                                                            }}
                                                                        >
                                                                            <div className={cn(
                                                                                "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                                                                trainingConfig.successEventType === eventType 
                                                                                    ? "border-emerald-600 bg-emerald-600" 
                                                                                    : "border-emerald-400"
                                                                            )}>
                                                                                {trainingConfig.successEventType === eventType && (
                                                                                    <Check className="h-3 w-3 text-white" />
                                                                                )}
                                                                            </div>
                                                                            <code className="text-sm font-mono">{eventType}</code>
                                                                        </div>
                                                                    ))}
                                                                    <p className="text-xs text-emerald-600 mt-2">
                                                                        <Check className="h-3 w-3 inline mr-1" />
                                                                        Events matching this value within ΔT will set label = 1
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                                                                    <Input
                                                                        placeholder="e.g., payment_completed"
                                                                        className="text-sm font-mono bg-white"
                                                                        value={trainingConfig.successEventType}
                                                                        onChange={(e) => setTrainingConfig({ ...trainingConfig, successEventType: e.target.value })}
                                                                    />
                                                                    <p className="text-xs text-emerald-600 mt-2">
                                                                        <Check className="h-3 w-3 inline mr-1" />
                                                                        Events matching this value within ΔT will set label = 1
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                                <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500">Select a cart events datablock to configure fields</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                                    <div>
                                        <Label className="text-sm font-medium">Training Datablock Name</Label>
                                        <Input
                                            placeholder="e.g., purchase_probability_training"
                                            value={newDatablock.name}
                                            onChange={(e) => setNewDatablock({ ...newDatablock, name: e.target.value })}
                                            className="mt-1.5 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Description</Label>
                                        <Input
                                            placeholder="Training data for purchase prediction..."
                                            value={newDatablock.description}
                                            onChange={(e) => setNewDatablock({ ...newDatablock, description: e.target.value })}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Configure Labels & Job */}
                        {trainingStep === 2 && (
                            <div className="space-y-8">
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                        <Tag className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Step 2: Label Generation & Job Configuration</h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Configure the prediction window and how often the training data job should run.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    {/* Prediction Window */}
                                    <div className="space-y-6">
                                        <div>
                                            <Label className="text-sm font-medium mb-3 block">Prediction Window (ΔT)</Label>
                                            <p className="text-xs text-slate-500 mb-3">
                                                How long after a snapshot event to check for payment completion?
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {["15m", "30m", "1h", "2h", "6h", "24h"].map((window) => (
                                                    <div
                                                        key={window}
                                                        className={cn(
                                                            "p-4 rounded-xl border-2 cursor-pointer transition-all text-center",
                                                            labelConfig.predictionWindow === window
                                                                ? "border-violet-500 bg-violet-50"
                                                                : "border-slate-200 hover:border-slate-300"
                                                        )}
                                                        onClick={() => setLabelConfig({ ...labelConfig, predictionWindow: window })}
                                                    >
                                                        <span className={cn(
                                                            "font-mono text-lg font-semibold",
                                                            labelConfig.predictionWindow === window ? "text-violet-700" : "text-slate-700"
                                                        )}>
                                                            {window}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Job Frequency */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 block">Job Frequency</Label>
                                            <p className="text-xs text-slate-500 mb-3">
                                                How often should the training data generation job run?
                                            </p>
                                            <div className="space-y-2">
                                                {[
                                                    { id: "hourly", label: "Hourly", desc: "Run every hour" },
                                                    { id: "daily", label: "Daily", desc: "Run once per day" },
                                                    { id: "weekly", label: "Weekly", desc: "Run once per week" },
                                                ].map((freq) => (
                                                    <div
                                                        key={freq.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                                            labelConfig.jobFrequency === freq.id
                                                                ? "border-blue-500 bg-blue-50"
                                                                : "border-slate-200 hover:border-slate-300"
                                                        )}
                                                        onClick={() => setLabelConfig({ ...labelConfig, jobFrequency: freq.id })}
                                                    >
                                                        <div className={cn(
                                                            "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                                            labelConfig.jobFrequency === freq.id
                                                                ? "border-blue-500 bg-blue-500"
                                                                : "border-slate-300"
                                                        )}>
                                                            {labelConfig.jobFrequency === freq.id && (
                                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{freq.label}</p>
                                                            <p className="text-xs text-slate-500">{freq.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Label Logic Explanation */}
                                    <div className="space-y-6">
                                        {/* Configuration Summary */}
                                        <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                                            <p className="text-xs font-medium text-slate-700 mb-2">Configuration from Step 1:</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Source:</span>
                                                    <code className="font-mono text-blue-600">{trainingConfig.cartEventsDatablock}</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Timestamp:</span>
                                                    <code className="font-mono text-blue-600">{trainingConfig.timestampField}</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">User ID:</span>
                                                    <code className="font-mono text-blue-600">{trainingConfig.userIdField}</code>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Cart ID:</span>
                                                    <code className="font-mono text-blue-600">{trainingConfig.cartIdField || "—"}</code>
                                                </div>
                                            </div>
                                        </div>

                                        {/* How Labels Work */}
                                        <div className="p-6 bg-slate-900 rounded-xl">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="h-6 w-6 rounded bg-amber-500 flex items-center justify-center">
                                                    <Tag className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-sm font-medium text-white">Auto Label Generation</span>
                                            </div>
                                            <div className="font-mono text-sm space-y-2">
                                                <div className="text-slate-400">
                                                    <span className="text-violet-400">FOR EACH</span> row <span className="text-violet-400">WHERE</span> <span className="text-blue-400">{trainingConfig.eventTypeField}</span> <span className="text-violet-400">IN</span> [{trainingConfig.snapshotEventTypes.map(e => `"${e}"`).join(", ")}]:
                                                </div>
                                                <div className="text-slate-400 ml-4">
                                                    snapshot_time = <span className="text-blue-400">{trainingConfig.timestampField}</span>
                                                </div>
                                                <div className="text-slate-400 ml-4">
                                                    <span className="text-violet-400">IF EXISTS</span> row <span className="text-violet-400">WHERE</span>:
                                                </div>
                                                <div className="text-slate-400 ml-8">
                                                    <span className="text-blue-400">{trainingConfig.eventTypeField}</span> = <span className="text-emerald-400">"{trainingConfig.successEventType}"</span>
                                                </div>
                                                <div className="text-slate-400 ml-8">
                                                    <span className="text-violet-400">AND</span> <span className="text-blue-400">{trainingConfig.timestampField}</span> <span className="text-violet-400">BETWEEN</span> snapshot_time <span className="text-violet-400">AND</span> snapshot_time + <span className="text-amber-400">{labelConfig.predictionWindow}</span>
                                                </div>
                                                <div className="text-slate-400 ml-8">
                                                    <span className="text-violet-400">AND</span> <span className="text-blue-400">{trainingConfig.userIdField}</span> = snapshot.<span className="text-blue-400">{trainingConfig.userIdField}</span>
                                                </div>
                                                {trainingConfig.cartIdField && (
                                                    <div className="text-slate-400 ml-8">
                                                        <span className="text-violet-400">AND</span> <span className="text-blue-400">{trainingConfig.cartIdField}</span> = snapshot.<span className="text-blue-400">{trainingConfig.cartIdField}</span>
                                                    </div>
                                                )}
                                                <div className="text-slate-400 ml-4">
                                                    <span className="text-violet-400">THEN</span> label = <span className="text-emerald-400">1</span>
                                                </div>
                                                <div className="text-slate-400 ml-4">
                                                    <span className="text-violet-400">ELSE</span> label = <span className="text-red-400">0</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Label Preview */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                                        <span className="text-white font-bold">1</span>
                                                    </div>
                                                    <span className="font-semibold text-emerald-900">Positive</span>
                                                </div>
                                                <p className="text-xs text-emerald-700">
                                                    <code className="bg-emerald-100 px-1 rounded">{trainingConfig.successEventType}</code> found within {labelConfig.predictionWindow}
                                                </p>
                                            </div>
                                            <div className="p-4 border-2 border-red-200 bg-red-50 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                                                        <span className="text-white font-bold">0</span>
                                                    </div>
                                                    <span className="font-semibold text-red-900">Negative</span>
                                                </div>
                                                <p className="text-xs text-red-700">
                                                    No <code className="bg-red-100 px-1 rounded">{trainingConfig.successEventType}</code> within {labelConfig.predictionWindow}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Job Info */}
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                            <div className="flex items-start gap-3">
                                                <RefreshCw className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-blue-900">Incremental Processing</p>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        The job reads new events from <code className="bg-blue-100 px-1 rounded font-mono">{trainingConfig.cartEventsDatablock}</code> since the last run, 
                                                        fetches features at each snapshot time, and appends training rows.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Select Feature Datablocks */}
                        {trainingStep === 3 && (
                            <div className="space-y-8">
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                        <Sparkles className="h-6 w-6 text-violet-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Step 3: Select Feature Datablocks</h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Select which datablocks to pull user features from at each snapshot time. All fields from selected datablocks will be included.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature Datablocks Selection */}
                                <div>
                                    <Label className="text-sm font-medium mb-4 block">Available Feature Datablocks</Label>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Select one or more datablocks. Features will be fetched at snapshot_time (no future data leakage).
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {datablocks.filter(db => db.type !== "training" && db.status === "active").map((db) => {
                                            const isSelected = featureDatablocks.includes(db.name);
                                            const fieldCount = db.type === "direct" 
                                                ? (db as DirectMappingDatablock).fields.length 
                                                : (db as AggregatedDatablock).fields.length;
                                            
                                            return (
                                                <div
                                                    key={db.id}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                        isSelected
                                                            ? "border-violet-500 bg-violet-50"
                                                            : "border-slate-200 hover:border-slate-300"
                                                    )}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setFeatureDatablocks(featureDatablocks.filter(d => d !== db.name));
                                                        } else {
                                                            setFeatureDatablocks([...featureDatablocks, db.name]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox checked={isSelected} />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium font-mono">{db.name}</p>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {db.type === "direct" ? "Direct" : "Aggregated"}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">{fieldCount} fields • {db.description}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Show fields preview when selected */}
                                                    {isSelected && (
                                                        <div className="mt-3 pt-3 border-t border-violet-200">
                                                            <p className="text-xs font-medium text-violet-700 mb-2">Fields included:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(db.type === "direct" 
                                                                    ? (db as DirectMappingDatablock).fields.slice(0, 5).map(f => f.targetName)
                                                                    : (db as AggregatedDatablock).fields.slice(0, 5).map(f => f.targetName)
                                                                ).map(fieldName => (
                                                                    <Badge key={fieldName} variant="secondary" className="text-xs font-mono">
                                                                        {fieldName}
                                                                    </Badge>
                                                                ))}
                                                                {fieldCount > 5 && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        +{fieldCount - 5} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Final Training Row Preview */}
                                {featureDatablocks.length > 0 && (
                                    <div className="p-6 bg-slate-900 rounded-xl">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-6 w-6 rounded bg-violet-500 flex items-center justify-center">
                                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-white">Training Row Schema</span>
                                            <Badge className="bg-violet-600 text-white text-xs ml-2">
                                                {featureDatablocks.length} datablock{featureDatablocks.length > 1 ? "s" : ""} selected
                                            </Badge>
                                        </div>
                                        <div className="font-mono text-sm text-slate-400">
                                            [<span className="text-blue-400">{trainingConfig.userIdField || "user_id"}</span>, 
                                            {trainingConfig.cartIdField && <><span className="text-blue-400">{trainingConfig.cartIdField}</span>, </>}
                                            <span className="text-blue-400">{trainingConfig.timestampField || "timestamp"}</span>, 
                                            <span className="text-blue-400">{trainingConfig.eventTypeField || "event_type"}</span>,{" "}
                                            {featureDatablocks.map((dbName, idx) => (
                                                <span key={dbName}>
                                                    <span className="text-violet-300">{dbName}.*</span>
                                                    {idx < featureDatablocks.length - 1 && ", "}
                                                </span>
                                            ))},{" "}
                                            <span className="text-emerald-400">label</span>]
                                        </div>
                                    </div>
                                )}

                                {/* Summary Info */}
                                <div className="p-4 bg-slate-50 border rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <Database className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900">Training Data Generation</p>
                                            <p className="text-sm text-slate-600 mt-1">
                                                When deployed, a job will run <span className="font-medium">{labelConfig.jobFrequency}</span> to:
                                            </p>
                                            <ol className="text-sm text-slate-600 mt-2 ml-4 list-decimal space-y-1">
                                                <li>Read new events from <code className="bg-slate-200 px-1 rounded font-mono text-blue-600">{trainingConfig.cartEventsDatablock}</code> where <code className="bg-slate-200 px-1 rounded font-mono">{trainingConfig.eventTypeField}</code> in [{trainingConfig.snapshotEventTypes.join(", ")}]</li>
                                                <li>For each snapshot event at <code className="bg-slate-200 px-1 rounded font-mono">{trainingConfig.timestampField}</code>, fetch features from selected datablocks</li>
                                                <li>Check if <code className="bg-slate-200 px-1 rounded font-mono text-emerald-600">{trainingConfig.successEventType}</code> exists within <span className="font-mono text-violet-600">{labelConfig.predictionWindow}</span> → set label</li>
                                                <li>Append training row to this datablock</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 bg-white sticky bottom-0">
                        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (trainingStep === 1) {
                                        setCreateStep("type");
                                        resetCreateForm();
                                    } else {
                                        setTrainingStep((trainingStep - 1) as 1 | 2 | 3);
                                    }
                                }}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {trainingStep === 1 ? "Cancel" : "Back"}
                            </Button>

                            <div className="flex items-center gap-3">
                                {trainingStep < 3 ? (
                                    <Button
                                        onClick={() => setTrainingStep((trainingStep + 1) as 1 | 2 | 3)}
                                        disabled={
                                            trainingStep === 1 && (
                                                !trainingConfig.cartEventsDatablock || 
                                                !newDatablock.name || 
                                                !trainingConfig.eventTypeField ||
                                                !trainingConfig.timestampField ||
                                                !trainingConfig.userIdField ||
                                                trainingConfig.snapshotEventTypes.length === 0 ||
                                                !trainingConfig.successEventType
                                            )
                                        }
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Continue
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleCreateDatablock}
                                        disabled={featureDatablocks.length === 0}
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Rocket className="h-4 w-4" />
                                        Create Training Datablock
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Datablock Detail Sheet */}
            <Sheet open={!!selectedDatablock} onOpenChange={handleCloseDrawer}>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
                    {selectedDatablock && (
                        <>
                            <SheetHeader className="p-6 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                        selectedDatablock.type === "direct" ? "bg-blue-100" : 
                                        selectedDatablock.type === "aggregated" ? "bg-violet-100" : "bg-emerald-100"
                                    )}>
                                        {selectedDatablock.type === "direct" ? (
                                            <Link2 className="h-6 w-6 text-blue-600" />
                                        ) : selectedDatablock.type === "aggregated" ? (
                                            <Calculator className="h-6 w-6 text-violet-600" />
                                        ) : (
                                            <Brain className="h-6 w-6 text-emerald-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <SheetTitle className="text-xl font-mono">{selectedDatablock.name}</SheetTitle>
                                            {getTypeBadge(selectedDatablock.type)}
                                            {getStatusBadge(selectedDatablock.status, selectedDatablock.pendingAction)}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{selectedDatablock.description}</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {selectedDatablock.type === "direct"
                                                ? `Source: ${(selectedDatablock as DirectMappingDatablock).sourcePipelines.join(", ")}`
                                                : selectedDatablock.type === "aggregated"
                                                ? `Source: ${(selectedDatablock as AggregatedDatablock).sourceDatablocks.join(", ")}`
                                                : `Model: ${(selectedDatablock as TrainingDatablock).predictionModelType.name}`}
                                        </p>
                                    </div>
                                    {/* Edit icon button - only for active datablocks */}
                                    {selectedDatablock.status === "active" && !isEditing && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsEditing(true)}
                                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-slate-900">
                                            {selectedDatablock.type === "training" 
                                                ? (selectedDatablock as TrainingDatablock).features.length 
                                                : selectedDatablock.fields.length}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {selectedDatablock.type === "training" ? "Features" : "Fields"}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-slate-900">{selectedDatablock.rowCount.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">Rows</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-slate-900">{selectedDatablock.lastUpdated}</p>
                                        <p className="text-xs text-slate-500">Updated</p>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="p-6">
                                <h4 className="text-sm font-semibold text-slate-900 mb-4">
                                    {selectedDatablock.type === "direct" 
                                        ? "Field Mappings" 
                                        : selectedDatablock.type === "aggregated"
                                        ? "Aggregation Fields"
                                        : "Training Configuration"}
                                </h4>

                                {selectedDatablock.type === "direct" ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50">
                                                    <TableHead>Source</TableHead>
                                                    <TableHead className="w-8"></TableHead>
                                                    <TableHead>Target</TableHead>
                                                    <TableHead>Type</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedDatablock as DirectMappingDatablock).fields.map((field) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell>
                                                            <code className="text-sm">{field.sourceFieldName}</code>
                                                            <p className="text-xs text-slate-400">{field.sourcePipeline}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <ArrowRight className="h-4 w-4 text-slate-300" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-sm font-semibold">{field.targetName}</code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : selectedDatablock.type === "aggregated" ? (
                                    <div className="space-y-3">
                                        {(selectedDatablock as AggregatedDatablock).fields.map((field) => (
                                            <div key={field.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <code className="text-sm font-mono font-semibold text-slate-800">
                                                        {field.targetName}
                                                    </code>
                                                    {field.lastRun && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {field.lastRun}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center flex-wrap gap-2 text-sm">
                                                    <Badge className="bg-violet-100 text-violet-700">{field.aggregation}</Badge>
                                                    <span className="text-slate-400">of</span>
                                                    <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {field.sourceDatablock}.{field.sourceField}
                                                    </code>
                                                    <span className="text-slate-400">over</span>
                                                    <Badge variant="secondary">{field.timeWindow}</Badge>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{cronToText(field.schedule)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Model & Output Label */}
                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <div className="flex items-center gap-3 mb-3">
                                                {(() => {
                                                    const Icon = (selectedDatablock as TrainingDatablock).predictionModelType.icon;
                                                    return (
                                                        <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                            <Icon className="h-5 w-5 text-white" />
                                                        </div>
                                                    );
                                                })()}
                                                <div>
                                                    <p className="font-medium text-emerald-900">
                                                        {(selectedDatablock as TrainingDatablock).predictionModelType.name}
                                                    </p>
                                                    <p className="text-xs text-emerald-600">
                                                        {(selectedDatablock as TrainingDatablock).predictionModelType.mlModel.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-emerald-600" />
                                                <span className="text-sm text-emerald-800">Output Label:</span>
                                                <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-sm font-mono">
                                                    {(selectedDatablock as TrainingDatablock).outputLabel.name}
                                                </code>
                                                <Badge className="bg-emerald-200 text-emerald-800 text-xs">
                                                    {(selectedDatablock as TrainingDatablock).outputLabel.type}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Label Distribution */}
                                        {(selectedDatablock as TrainingDatablock).outputLabel.type === "binary" && (
                                            <div className="p-4 border rounded-lg">
                                                <h5 className="text-sm font-medium mb-3">Label Distribution</h5>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between text-sm mb-1">
                                                            <span className="text-emerald-600">Positive</span>
                                                            <span className="font-medium">
                                                                {((selectedDatablock as TrainingDatablock).positiveLabels || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-emerald-500 rounded-full"
                                                                style={{
                                                                    width: `${((selectedDatablock as TrainingDatablock).positiveLabels || 0) / 
                                                                        (((selectedDatablock as TrainingDatablock).positiveLabels || 0) + 
                                                                        ((selectedDatablock as TrainingDatablock).negativeLabels || 0)) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between text-sm mb-1">
                                                            <span className="text-red-600">Negative</span>
                                                            <span className="font-medium">
                                                                {((selectedDatablock as TrainingDatablock).negativeLabels || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-red-500 rounded-full"
                                                                style={{
                                                                    width: `${((selectedDatablock as TrainingDatablock).negativeLabels || 0) / 
                                                                        (((selectedDatablock as TrainingDatablock).positiveLabels || 0) + 
                                                                        ((selectedDatablock as TrainingDatablock).negativeLabels || 0)) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Data Source */}
                                        <div className="p-4 border rounded-lg">
                                            <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                                                Data Source
                                            </h5>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">CSV</Badge>
                                                {(selectedDatablock as TrainingDatablock).csvFileName && (
                                                    <code className="text-sm text-slate-600">
                                                        {(selectedDatablock as TrainingDatablock).csvFileName}
                                                    </code>
                                                )}
                                            </div>
                                        </div>

                                        {/* Input Features */}
                                        <div>
                                            <h5 className="text-sm font-medium mb-3">
                                                Input Features ({(selectedDatablock as TrainingDatablock).features.length})
                                            </h5>
                                            <div className="border rounded-lg overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50">
                                                            <TableHead>Feature</TableHead>
                                                            <TableHead>Source</TableHead>
                                                            <TableHead>Type</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(selectedDatablock as TrainingDatablock).features.map((feature) => (
                                                            <TableRow key={feature.id}>
                                                                <TableCell>
                                                                    <code className="text-sm font-semibold">{feature.name}</code>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <code className="text-sm text-slate-600">
                                                                        {feature.sourceDatablock}.{feature.sourceField}
                                                                    </code>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="text-xs">{feature.type}</Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

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

                            {/* Footer - Dynamic based on status */}
                            <div className="sticky bottom-0 p-6 border-t border-slate-200 bg-white">
                                {/* Awaiting Deployment - Show revert option */}
                                {selectedDatablock.status === "awaiting_deployment" ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-amber-700">
                                            <AlertTriangle className="h-4 w-4" />
                                            {selectedDatablock.pendingAction === "delete" 
                                                ? "Deletion pending deployment"
                                                : selectedDatablock.pendingAction === "create"
                                                ? "Creation pending deployment"
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
                                ) : selectedDatablock.status === "active" && !isEditing ? (
                                    /* Active - Read-only mode */
                                    <div className="flex items-center justify-end">
                                        <Button variant="outline" onClick={handleCloseDrawer}>
                                            Close
                                        </Button>
                                    </div>
                                ) : selectedDatablock.status === "active" && isEditing ? (
                                    /* Active - Edit mode (only delete available) */
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Datablock
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    /* Inactive - can delete or close */
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete Datablock
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <code className="font-mono bg-slate-100 px-1 rounded">{selectedDatablock?.name}</code>? 
                            This action will be added to the deployment bucket and will take effect after deployment.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteToBucket}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Datablock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}