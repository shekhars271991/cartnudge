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
    Table2,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// Types
interface PipelineField {
    name: string;
    type: "string" | "number" | "boolean" | "timestamp" | "object";
    description: string;
}

interface Pipeline {
    id: string;
    name: string;
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

type Datablock = DirectMappingDatablock | AggregatedDatablock;

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
        fields: [
            { name: "user_id", type: "string", description: "Unique user identifier" },
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
        fields: [
            { name: "user_id", type: "string", description: "Unique user identifier" },
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
        fields: [
            { name: "user_id", type: "string", description: "Unique user identifier" },
            { name: "order_id", type: "string", description: "Order identifier" },
            { name: "total_amount", type: "number", description: "Transaction total" },
            { name: "discount_amount", type: "number", description: "Discount applied" },
            { name: "items_count", type: "number", description: "Number of items" },
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
        fields: [
            { id: "f1", targetName: "user_id", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "user_id", description: "Unique user identifier", enabled: true },
            { id: "f2", targetName: "page_url", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "page_url", enabled: true },
            { id: "f3", targetName: "product_id", type: "string", sourcePipeline: "Browsing Events", sourceFieldName: "product_id", enabled: true },
            { id: "f4", targetName: "view_duration", type: "number", sourcePipeline: "Browsing Events", sourceFieldName: "view_duration", enabled: true },
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
        fields: [
            { id: "f1", targetName: "user_id", type: "string", sourcePipeline: "Cart Events", sourceFieldName: "user_id", enabled: true },
            { id: "f2", targetName: "quantity", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "quantity", enabled: true },
            { id: "f3", targetName: "price", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "price", enabled: true },
            { id: "f4", targetName: "cart_value", type: "number", sourcePipeline: "Cart Events", sourceFieldName: "cart_value", enabled: true },
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
];

export default function FeatureStore() {
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
    const [newDatablockType, setNewDatablockType] = useState<"direct" | "aggregated" | null>(null);
    const [newDatablock, setNewDatablock] = useState({
        name: "",
        description: "",
        selectedPipelines: [] as string[],
        selectedDatablocks: [] as string[],
    });

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
    };

    const handleCreateDatablock = () => {
        if (!newDatablock.name) return;

        if (newDatablockType === "direct") {
            const enabledFields = generatedFields.filter((f) => f.enabled);
            if (enabledFields.length === 0) return;

            const datablock: DirectMappingDatablock = {
                id: `db_${Date.now()}`,
                name: newDatablock.name.toLowerCase().replace(/\s+/g, "_"),
                description: newDatablock.description,
                type: "direct",
                sourcePipelines: newDatablock.selectedPipelines,
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

    const getTypeBadge = (type: "direct" | "aggregated") => {
        if (type === "direct") {
            return (
                <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50">
                    <Link2 className="h-3 w-3" />
                    Direct
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-xs gap-1 border-violet-200 text-violet-700 bg-violet-50">
                <Calculator className="h-3 w-3" />
                Aggregated
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
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Table2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{datablocks.length}</p>
                                <p className="text-sm text-slate-500">Datablocks</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {datablocks.reduce((acc, db) => acc + db.fields.length, 0)}
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

            {/* Datablocks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDatablocks.map((datablock) => (
                    <Card
                        key={datablock.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            datablock.status === "active" && "border-emerald-200"
                        )}
                        onClick={() => setSelectedDatablock(datablock)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                            datablock.type === "direct" ? "bg-blue-100" : "bg-violet-100"
                                        )}
                                    >
                                        {datablock.type === "direct" ? (
                                            <Link2 className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <Calculator className="h-5 w-5 text-violet-600" />
                                        )}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            <code className="font-mono">{datablock.name}</code>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            {datablock.type === "direct"
                                                ? (datablock as DirectMappingDatablock).sourcePipelines.join(", ")
                                                : `From ${(datablock as AggregatedDatablock).sourceDatablocks.join(", ")}`}
                                        </CardDescription>
                                    </div>
                                </div>
                                {getTypeBadge(datablock.type)}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                {datablock.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">
                                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                                    {datablock.fields.length} fields
                                </span>
                                <span className="text-slate-600">
                                    <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                                    {datablock.rowCount.toLocaleString()} rows
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                {getStatusBadge(datablock.status, datablock.pendingAction)}
                                <span className="text-xs text-slate-400">
                                    Updated {datablock.lastUpdated}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredDatablocks.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-2">No datablocks found</p>
                        <Button variant="outline" onClick={() => setIsCreating(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first datablock
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Datablock Sheet */}
            <Sheet open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) resetCreateForm(); }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
                                <div className="grid grid-cols-2 gap-4">
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            newDatablockType === "direct" && "ring-2 ring-blue-500 border-blue-200"
                                        )}
                                        onClick={() => setNewDatablockType("direct")}
                                    >
                                        <CardContent className="pt-6 text-center">
                                            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                                                <Link2 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <h3 className="font-semibold text-slate-900">Direct Mapping</h3>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Map fields directly from source pipelines. No aggregation.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            newDatablockType === "aggregated" && "ring-2 ring-violet-500 border-violet-200"
                                        )}
                                        onClick={() => setNewDatablockType("aggregated")}
                                    >
                                        <CardContent className="pt-6 text-center">
                                            <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                                                <Calculator className="h-6 w-6 text-violet-600" />
                                            </div>
                                            <h3 className="font-semibold text-slate-900">Aggregated</h3>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Aggregate fields from another datablock with time windows.
                                            </p>
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
                                    {availablePipelines.map((pipeline) => (
                                        <div
                                            key={pipeline.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                                newDatablock.selectedPipelines.includes(pipeline.name)
                                                    ? "border-blue-300 bg-blue-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                            onClick={() => togglePipeline(pipeline.name)}
                                        >
                                            <Checkbox checked={newDatablock.selectedPipelines.includes(pipeline.name)} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{pipeline.name}</p>
                                                <p className="text-xs text-slate-500">{pipeline.fields.length} fields</p>
                                            </div>
                                        </div>
                                    ))}
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

            {/* Datablock Detail Sheet */}
            <Sheet open={!!selectedDatablock} onOpenChange={handleCloseDrawer}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {selectedDatablock && (
                        <>
                            <SheetHeader className="p-6 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                        selectedDatablock.type === "direct" ? "bg-blue-100" : "bg-violet-100"
                                    )}>
                                        {selectedDatablock.type === "direct" ? (
                                            <Link2 className="h-6 w-6 text-blue-600" />
                                        ) : (
                                            <Calculator className="h-6 w-6 text-violet-600" />
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
                                                : `Source: ${(selectedDatablock as AggregatedDatablock).sourceDatablocks.join(", ")}`}
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
                                        <p className="text-lg font-semibold text-slate-900">{selectedDatablock.fields.length}</p>
                                        <p className="text-xs text-slate-500">Fields</p>
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
                                    {selectedDatablock.type === "direct" ? "Field Mappings" : "Aggregation Fields"}
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
                                ) : (
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