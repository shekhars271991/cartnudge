import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Users,
    Package,
    Database,
    Settings2,
    Plus,
    Trash2,
    Edit2,
    ChevronDown,
    ChevronRight,
    Upload,
    Code,
    Copy,
    Check,
    FileUp,
    FileText,
    X,
    AlertCircle,
    CheckCircle2,
    History,
    RefreshCw,
    Clock,
    XCircle,
    Activity,
    Layers,
    Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";

// Types
interface SchemaField {
    id: string;
    name: string;
    type: "string" | "number" | "boolean" | "date" | "email" | "enum" | "array" | "object";
    required: boolean;
    description: string;
    isPrimaryKey: boolean;
    enumValues?: string[];
}

interface DataModel {
    id: string;
    name: string;
    displayName: string;
    icon: "users" | "package" | "database";
    description: string;
    isMandatory: boolean;
    isConfigured: boolean;
    schema: SchemaField[];
    recordCount: number;
    lastSync: string | null;
}

interface IngestionLog {
    id: string;
    modelId: string;
    modelName: string;
    timestamp: string;
    source: "csv" | "api" | "bulk_api";
    status: "success" | "failed" | "processing";
    rowsProcessed: number;
    rowsFailed: number;
    duration: string;
    fileName?: string;
    errorMessage?: string;
}

// Sample data models
const initialModels: DataModel[] = [
    {
        id: "user",
        name: "user",
        displayName: "User",
        icon: "users",
        description: "Customer profiles and attributes",
        isMandatory: true,
        isConfigured: true,
        schema: [
            { id: "f1", name: "user_id", type: "string", required: true, description: "Unique user identifier", isPrimaryKey: true },
            { id: "f2", name: "email", type: "email", required: true, description: "User email address", isPrimaryKey: false },
            { id: "f3", name: "name", type: "string", required: true, description: "Full name", isPrimaryKey: false },
            { id: "f4", name: "phone", type: "string", required: false, description: "Phone number", isPrimaryKey: false },
            { id: "f5", name: "created_at", type: "date", required: true, description: "Account creation date", isPrimaryKey: false },
            { id: "f6", name: "segment", type: "enum", required: false, description: "Customer segment", isPrimaryKey: false, enumValues: ["new", "regular", "vip", "churned"] },
        ],
        recordCount: 12847,
        lastSync: "2 mins ago",
    },
    {
        id: "product",
        name: "product",
        displayName: "Product",
        icon: "package",
        description: "Product catalog and inventory",
        isMandatory: true,
        isConfigured: true,
        schema: [
            { id: "p1", name: "product_id", type: "string", required: true, description: "Unique product identifier", isPrimaryKey: true },
            { id: "p2", name: "name", type: "string", required: true, description: "Product name", isPrimaryKey: false },
            { id: "p3", name: "category", type: "string", required: true, description: "Product category", isPrimaryKey: false },
            { id: "p4", name: "price", type: "number", required: true, description: "Current price", isPrimaryKey: false },
            { id: "p5", name: "stock_quantity", type: "number", required: false, description: "Available stock", isPrimaryKey: false },
            { id: "p6", name: "is_active", type: "boolean", required: true, description: "Product availability", isPrimaryKey: false },
        ],
        recordCount: 3542,
        lastSync: "15 mins ago",
    },
];

const sampleLogs: IngestionLog[] = [
    {
        id: "log_001",
        modelId: "user",
        modelName: "User",
        timestamp: "2025-12-08T14:32:15Z",
        source: "bulk_api",
        status: "success",
        rowsProcessed: 1500,
        rowsFailed: 0,
        duration: "3.2s",
    },
    {
        id: "log_002",
        modelId: "product",
        modelName: "Product",
        timestamp: "2025-12-08T12:15:00Z",
        source: "csv",
        status: "success",
        rowsProcessed: 2500,
        rowsFailed: 3,
        duration: "8.5s",
        fileName: "products_catalog.csv",
    },
    {
        id: "log_003",
        modelId: "user",
        modelName: "User",
        timestamp: "2025-12-07T18:45:30Z",
        source: "api",
        status: "failed",
        rowsProcessed: 0,
        rowsFailed: 1,
        duration: "0.3s",
        errorMessage: "Invalid email format",
    },
    {
        id: "log_004",
        modelId: "user",
        modelName: "User",
        timestamp: "2025-12-07T10:20:00Z",
        source: "bulk_api",
        status: "success",
        rowsProcessed: 5000,
        rowsFailed: 12,
        duration: "15.2s",
    },
];

export default function DataModeling() {
    const { selectedProject } = useProject();
    const [models, setModels] = useState<DataModel[]>(initialModels);
    const [selectedModel, setSelectedModel] = useState<DataModel | null>(null);
    const [isSchemaDrawerOpen, setIsSchemaDrawerOpen] = useState(false);
    const [isIngestionDrawerOpen, setIsIngestionDrawerOpen] = useState(false);
    const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);
    const [isAddModelDialogOpen, setIsAddModelDialogOpen] = useState(false);
    const [logs] = useState<IngestionLog[]>(sampleLogs);

    // Schema editing state
    const [editingSchema, setEditingSchema] = useState<SchemaField[]>([]);
    const [isEditingMode, setIsEditingMode] = useState(false);

    // Ingestion state
    const [ingestionTab, setIngestionTab] = useState<"api" | "csv">("api");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    // New model state
    const [newModelName, setNewModelName] = useState("");
    const [newModelDescription, setNewModelDescription] = useState("");

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to configure your data models and schemas."
            />
        );
    }

    const getModelIcon = (icon: DataModel["icon"]) => {
        switch (icon) {
            case "users":
                return <Users className="h-5 w-5" />;
            case "package":
                return <Package className="h-5 w-5" />;
            default:
                return <Database className="h-5 w-5" />;
        }
    };

    const handleOpenSchema = (model: DataModel) => {
        setSelectedModel(model);
        setEditingSchema([...model.schema]);
        setIsEditingMode(false);
        setIsSchemaDrawerOpen(true);
    };

    const handleOpenIngestion = (model: DataModel) => {
        setSelectedModel(model);
        setUploadedFile(null);
        setIsIngestionDrawerOpen(true);
    };

    const handleSaveSchema = () => {
        if (selectedModel) {
            setModels(models.map(m => 
                m.id === selectedModel.id 
                    ? { ...m, schema: editingSchema, isConfigured: true }
                    : m
            ));
            setIsEditingMode(false);
        }
    };

    const handleAddField = () => {
        const newField: SchemaField = {
            id: `field_${Date.now()}`,
            name: "",
            type: "string",
            required: false,
            description: "",
            isPrimaryKey: false,
        };
        setEditingSchema([...editingSchema, newField]);
    };

    const handleRemoveField = (fieldId: string) => {
        setEditingSchema(editingSchema.filter(f => f.id !== fieldId));
    };

    const handleFieldChange = (fieldId: string, updates: Partial<SchemaField>) => {
        setEditingSchema(editingSchema.map(f => 
            f.id === fieldId ? { ...f, ...updates } : f
        ));
    };

    const handleAddModel = () => {
        if (!newModelName.trim()) return;
        
        const newModel: DataModel = {
            id: `model_${Date.now()}`,
            name: newModelName.toLowerCase().replace(/\s+/g, "_"),
            displayName: newModelName,
            icon: "database",
            description: newModelDescription || `Custom ${newModelName} data model`,
            isMandatory: false,
            isConfigured: false,
            schema: [],
            recordCount: 0,
            lastSync: null,
        };
        
        setModels([...models, newModel]);
        setNewModelName("");
        setNewModelDescription("");
        setIsAddModelDialogOpen(false);
    };

    const handleDeleteModel = (modelId: string) => {
        const model = models.find(m => m.id === modelId);
        if (model?.isMandatory) return;
        setModels(models.filter(m => m.id !== modelId));
    };

    // API endpoint configurations
    const apiBaseUrl = import.meta.env.VITE_WEBHOOK_BASE_URL || "https://api.cartnudge.ai/v1";
    const apiKey = import.meta.env.VITE_DEMO_SECRET_KEY || "cnk_sec_xxxxxxxxxxxxxxxxxxxx";

    const generateSingleApiSnippet = () => {
        if (!selectedModel) return "";
        const sampleData = selectedModel.schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string": value = `"sample_${field.name}"`; break;
                case "email": value = `"user@example.com"`; break;
                case "number": value = 0; break;
                case "boolean": value = true; break;
                case "date": value = `"2025-01-01"`; break;
                default: value = `"value"`;
            }
            return acc + `\n    "${field.name}": ${typeof value === "string" ? value : JSON.stringify(value)},`;
        }, "");

        return `curl -X POST "${apiBaseUrl}/${selectedModel.name}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{${sampleData.slice(0, -1)}
  }'`;
    };

    const generateBulkApiSnippet = () => {
        if (!selectedModel) return "";
        const sampleRecord = selectedModel.schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string": value = `"sample_${field.name}"`; break;
                case "email": value = `"user@example.com"`; break;
                case "number": value = 0; break;
                case "boolean": value = true; break;
                case "date": value = `"2025-01-01"`; break;
                default: value = `"value"`;
            }
            return acc + `\n      "${field.name}": ${typeof value === "string" ? value : JSON.stringify(value)},`;
        }, "");

        return `curl -X POST "${apiBaseUrl}/${selectedModel.name}/bulk" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "records": [
      {${sampleRecord.slice(0, -1)}
      },
      {${sampleRecord.slice(0, -1)}
      }
    ],
    "options": {
      "upsert": true,
      "batch_size": 1000
    }
  }'`;
    };

    const generatePythonBulkSnippet = () => {
        if (!selectedModel) return "";
        const sampleRecord = selectedModel.schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string": value = `sample_${field.name}`; break;
                case "email": value = "user@example.com"; break;
                case "number": value = 0; break;
                case "boolean": value = true; break;
                case "date": value = "2025-01-01"; break;
                default: value = "value";
            }
            acc[field.name] = value;
            return acc;
        }, {} as Record<string, string | number | boolean>);

        return `import requests

# Bulk load ${selectedModel.displayName} records
records = [
    ${JSON.stringify(sampleRecord, null, 4).replace(/"/g, "'").replace(/true/g, "True").replace(/false/g, "False")},
    # ... more records
]

response = requests.post(
    "${apiBaseUrl}/${selectedModel.name}/bulk",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    },
    json={
        "records": records,
        "options": {
            "upsert": True,
            "batch_size": 1000
        }
    }
)

result = response.json()
print(f"Processed: {result['processed']}, Failed: {result['failed']}")`;
    };

    const handleCopy = async (snippet: string, type: string) => {
        await navigator.clipboard.writeText(snippet);
        setCopiedSnippet(type);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === "text/csv") {
            setUploadedFile(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const getSourceBadge = (source: IngestionLog["source"]) => {
        switch (source) {
            case "api":
                return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">API</Badge>;
            case "bulk_api":
                return <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">Bulk API</Badge>;
            case "csv":
                return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">CSV</Badge>;
        }
    };

    const getStatusIcon = (status: IngestionLog["status"]) => {
        switch (status) {
            case "success":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "processing":
                return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
        }
    };

    const totalRecords = models.reduce((acc, m) => acc + m.recordCount, 0);
    const configuredModels = models.filter(m => m.isConfigured).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Data Modeling
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Configure your data models and ingest data via API or CSV
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsLogsDrawerOpen(true)}
                    >
                        <History className="h-4 w-4" />
                        Ingestion Logs
                        <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700">
                            {logs.length}
                        </Badge>
                    </Button>
                    <Button
                        className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                        onClick={() => setIsAddModelDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Add Data Model
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Data Models</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{models.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Configured</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{configuredModels}/{models.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Records</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{totalRecords.toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Database className="h-5 w-5 text-violet-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Ingestions Today</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{logs.filter(l => l.status === "success").length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-cyan-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Models Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Data Models</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {models.map((model) => (
                        <Card key={model.id} className={cn(
                            "relative overflow-hidden transition-all hover:shadow-md",
                            model.isMandatory && "ring-1 ring-cyan-200"
                        )}>
                            {model.isMandatory && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-cyan-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-bl-md">
                                        Required
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                            model.icon === "users" && "bg-blue-100 text-blue-600",
                                            model.icon === "package" && "bg-amber-100 text-amber-600",
                                            model.icon === "database" && "bg-violet-100 text-violet-600"
                                        )}>
                                            {getModelIcon(model.icon)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{model.displayName}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {model.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {!model.isMandatory && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={() => handleDeleteModel(model.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-6 mb-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Fields:</span>{" "}
                                        <span className="font-medium text-slate-700">{model.schema.length}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Records:</span>{" "}
                                        <span className="font-medium text-slate-700">{model.recordCount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Last sync:</span>{" "}
                                        <span className="font-medium text-slate-700">{model.lastSync || "Never"}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => handleOpenSchema(model)}
                                    >
                                        <Settings2 className="h-4 w-4" />
                                        {model.isConfigured ? "View Schema" : "Configure Schema"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => handleOpenIngestion(model)}
                                        disabled={!model.isConfigured}
                                    >
                                        <Upload className="h-4 w-4" />
                                        Ingest Data
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Schema Drawer */}
            <Sheet open={isSchemaDrawerOpen} onOpenChange={setIsSchemaDrawerOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {selectedModel && (
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                        selectedModel.icon === "users" && "bg-blue-100 text-blue-600",
                                        selectedModel.icon === "package" && "bg-amber-100 text-amber-600",
                                        selectedModel.icon === "database" && "bg-violet-100 text-violet-600"
                                    )}>
                                        {getModelIcon(selectedModel.icon)}
                                    </div>
                                )}
                                <div>
                                    <SheetTitle className="text-xl font-semibold text-slate-900">
                                        {selectedModel?.displayName} Schema
                                    </SheetTitle>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {selectedModel?.schema.length} fields defined
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditingMode ? (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setEditingSchema([...selectedModel!.schema]);
                                            setIsEditingMode(false);
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleSaveSchema}>
                                            Save Changes
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditingMode(true)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Schema
                                    </Button>
                                )}
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="py-6 space-y-4">
                        {editingSchema.map((field, index) => (
                            <div key={field.id} className={cn(
                                "p-4 rounded-lg border",
                                isEditingMode ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"
                            )}>
                                {isEditingMode ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">#{index + 1}</span>
                                                {field.isPrimaryKey && (
                                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                                        <Key className="h-3 w-3" />
                                                        Primary Key
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={() => handleRemoveField(field.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs">Field Name</Label>
                                                <Input
                                                    value={field.name}
                                                    onChange={(e) => handleFieldChange(field.id, { name: e.target.value })}
                                                    placeholder="field_name"
                                                    className="mt-1 font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Data Type</Label>
                                                <Select
                                                    value={field.type}
                                                    onValueChange={(v) => handleFieldChange(field.id, { type: v as SchemaField["type"] })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="string">String</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                        <SelectItem value="boolean">Boolean</SelectItem>
                                                        <SelectItem value="date">Date</SelectItem>
                                                        <SelectItem value="email">Email</SelectItem>
                                                        <SelectItem value="enum">Enum</SelectItem>
                                                        <SelectItem value="array">Array</SelectItem>
                                                        <SelectItem value="object">Object</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Description</Label>
                                            <Input
                                                value={field.description}
                                                onChange={(e) => handleFieldChange(field.id, { description: e.target.value })}
                                                placeholder="Field description"
                                                className="mt-1"
                                            />
                                        </div>

                                        {field.type === "enum" && (
                                            <div>
                                                <Label className="text-xs">Enum Values (comma-separated)</Label>
                                                <Input
                                                    value={field.enumValues?.join(", ") || ""}
                                                    onChange={(e) => handleFieldChange(field.id, { 
                                                        enumValues: e.target.value.split(",").map(v => v.trim()).filter(Boolean) 
                                                    })}
                                                    placeholder="value1, value2, value3"
                                                    className="mt-1 font-mono text-sm"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={field.required}
                                                    onCheckedChange={(v) => handleFieldChange(field.id, { required: v })}
                                                />
                                                <Label className="text-sm">Required</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={field.isPrimaryKey}
                                                    onCheckedChange={(v) => handleFieldChange(field.id, { isPrimaryKey: v })}
                                                />
                                                <Label className="text-sm">Primary Key</Label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <code className="text-sm font-medium text-slate-900">{field.name}</code>
                                            <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                            {field.required && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Required</Badge>
                                            )}
                                            {field.isPrimaryKey && (
                                                <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs gap-1">
                                                    <Key className="h-3 w-3" />
                                                    PK
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{field.description}</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isEditingMode && (
                            <Button
                                variant="outline"
                                className="w-full gap-2 border-dashed"
                                onClick={handleAddField}
                            >
                                <Plus className="h-4 w-4" />
                                Add Field
                            </Button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Ingestion Drawer */}
            <Sheet open={isIngestionDrawerOpen} onOpenChange={setIsIngestionDrawerOpen}>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            {selectedModel && (
                                <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                    selectedModel.icon === "users" && "bg-blue-100 text-blue-600",
                                    selectedModel.icon === "package" && "bg-amber-100 text-amber-600",
                                    selectedModel.icon === "database" && "bg-violet-100 text-violet-600"
                                )}>
                                    {getModelIcon(selectedModel.icon)}
                                </div>
                            )}
                            <div>
                                <SheetTitle className="text-xl font-semibold text-slate-900">
                                    Ingest {selectedModel?.displayName} Data
                                </SheetTitle>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Import data via API (single or bulk) or CSV upload
                                </p>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="py-6">
                        <Tabs value={ingestionTab} onValueChange={(v) => setIngestionTab(v as "api" | "csv")}>
                            <TabsList className="grid grid-cols-2 w-full max-w-[400px] mb-6">
                                <TabsTrigger value="api" className="gap-2">
                                    <Code className="h-4 w-4" />
                                    API Endpoint
                                </TabsTrigger>
                                <TabsTrigger value="csv" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    CSV Upload
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="api" className="space-y-6">
                                {/* Single Record API */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-900">Single Record</h3>
                                        <Badge variant="outline" className="text-xs">POST</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">POST</Badge>
                                        <code className="text-sm font-mono text-slate-700 flex-1">
                                            {apiBaseUrl}/{selectedModel?.name}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(`${apiBaseUrl}/${selectedModel?.name}`, "endpoint")}
                                            className="h-8"
                                        >
                                            {copiedSnippet === "endpoint" ? (
                                                <Check className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <div className="relative">
                                        <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                                            {generateSingleApiSnippet()}
                                        </pre>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                            onClick={() => handleCopy(generateSingleApiSnippet(), "single")}
                                        >
                                            {copiedSnippet === "single" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Bulk API */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-900">Bulk Load</h3>
                                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">Recommended</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">POST</Badge>
                                        <code className="text-sm font-mono text-slate-700 flex-1">
                                            {apiBaseUrl}/{selectedModel?.name}/bulk
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(`${apiBaseUrl}/${selectedModel?.name}/bulk`, "bulk_endpoint")}
                                            className="h-8"
                                        >
                                            {copiedSnippet === "bulk_endpoint" ? (
                                                <Check className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    <Tabs defaultValue="curl" className="w-full">
                                        <TabsList className="h-9 p-1">
                                            <TabsTrigger value="curl" className="text-xs px-3">cURL</TabsTrigger>
                                            <TabsTrigger value="python" className="text-xs px-3">Python</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="curl">
                                            <div className="relative">
                                                <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                                                    {generateBulkApiSnippet()}
                                                </pre>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                                    onClick={() => handleCopy(generateBulkApiSnippet(), "bulk_curl")}
                                                >
                                                    {copiedSnippet === "bulk_curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="python">
                                            <div className="relative">
                                                <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                                                    {generatePythonBulkSnippet()}
                                                </pre>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                                    onClick={() => handleCopy(generatePythonBulkSnippet(), "bulk_python")}
                                                >
                                                    {copiedSnippet === "bulk_python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>

                                    <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
                                        <h4 className="text-sm font-medium text-violet-900 mb-2">Bulk Load Options</h4>
                                        <ul className="text-xs text-violet-700 space-y-1">
                                            <li>• <code className="bg-violet-100 px-1 rounded">upsert: true</code> - Updates existing records if primary key matches</li>
                                            <li>• <code className="bg-violet-100 px-1 rounded">batch_size: 1000</code> - Process records in batches (max 10,000)</li>
                                            <li>• Maximum 100,000 records per request</li>
                                        </ul>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="csv" className="space-y-4">
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                        isDragging ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById("csv-upload")?.click()}
                                >
                                    <input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    {uploadedFile ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                                <FileText className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 mb-1">{uploadedFile.name}</p>
                                            <p className="text-xs text-slate-500 mb-3">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                                                    className="text-slate-500 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                                <Button size="sm" onClick={(e) => e.stopPropagation()}>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Start Import
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <FileUp className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 mb-1">Drop your CSV file here</p>
                                            <p className="text-xs text-slate-500 mb-3">or click to browse</p>
                                            <Badge variant="outline" className="text-xs">Supports .csv files up to 50MB</Badge>
                                        </>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs font-medium text-slate-600 mb-2">Expected CSV columns:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedModel?.schema.map((field) => (
                                            <Badge
                                                key={field.id}
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    field.required && "border-amber-300 bg-amber-50 text-amber-700"
                                                )}
                                            >
                                                {field.name}
                                                {field.required && " *"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Logs Drawer */}
            <Sheet open={isLogsDrawerOpen} onOpenChange={setIsLogsDrawerOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl font-semibold text-slate-900">
                                    Ingestion Logs
                                </SheetTitle>
                                <p className="text-sm text-slate-500 mt-1">
                                    History of all data imports across models
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </SheetHeader>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-100">
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-slate-900">{logs.length}</p>
                            <p className="text-xs text-slate-500">Total Imports</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-emerald-600">
                                {logs.filter(l => l.status === "success").length}
                            </p>
                            <p className="text-xs text-slate-500">Successful</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-slate-900">
                                {logs.reduce((acc, l) => acc + l.rowsProcessed, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">Rows Processed</p>
                        </div>
                    </div>

                    <div className="py-4 space-y-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className={cn(
                                    "p-4 rounded-lg border transition-colors",
                                    log.status === "failed"
                                        ? "bg-red-50/50 border-red-100"
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(log.status)}
                                        <span className="font-medium text-slate-900">{log.modelName}</span>
                                        {getSourceBadge(log.source)}
                                    </div>
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimestamp(log.timestamp)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Rows Processed</p>
                                        <p className="font-medium text-slate-700">
                                            {log.rowsProcessed.toLocaleString()}
                                            {log.rowsFailed > 0 && (
                                                <span className="text-red-500 ml-1">({log.rowsFailed} failed)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Duration</p>
                                        <p className="font-medium text-slate-700">{log.duration}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Status</p>
                                        <p className={cn(
                                            "font-medium capitalize",
                                            log.status === "success" && "text-emerald-600",
                                            log.status === "failed" && "text-red-600",
                                            log.status === "processing" && "text-blue-600"
                                        )}>
                                            {log.status}
                                        </p>
                                    </div>
                                </div>

                                {log.fileName && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-xs text-slate-500">
                                            File: <span className="font-mono">{log.fileName}</span>
                                        </p>
                                    </div>
                                )}

                                {log.errorMessage && (
                                    <div className="mt-2 pt-2 border-t border-red-100">
                                        <p className="text-xs text-red-600">
                                            Error: {log.errorMessage}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Add Model Dialog */}
            <Dialog open={isAddModelDialogOpen} onOpenChange={setIsAddModelDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Data Model</DialogTitle>
                        <DialogDescription>
                            Create a custom data model to store additional entity types.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="modelName">Model Name</Label>
                            <Input
                                id="modelName"
                                value={newModelName}
                                onChange={(e) => setNewModelName(e.target.value)}
                                placeholder="e.g., Order, Cart, Session"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="modelDescription">Description (optional)</Label>
                            <Textarea
                                id="modelDescription"
                                value={newModelDescription}
                                onChange={(e) => setNewModelDescription(e.target.value)}
                                placeholder="Brief description of what this model represents"
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModelDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddModel} disabled={!newModelName.trim()}>
                            Create Model
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

