import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Users,
    Package,
    Database,
    ShoppingCart,
    MousePointer,
    CreditCard,
    Plus,
    Trash2,
    Edit2,
    Upload,
    Copy,
    Check,
    FileUp,
    CheckCircle2,
    Clock,
    Zap,
    FileSpreadsheet,
    RefreshCw,
    Settings2,
    ChevronRight,
    Layers,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { datablocksApi } from "@/lib/api/dataplatform";
import type {
    Datablock,
    DatablockTemplate,
    DatablockCreate,
    DatablockUpdate,
    DataSourceType,
    DatablockStatus,
    SchemaField,
    IconType,
} from "@/lib/api/dataplatform/types";

// Source type config
const sourceTypeConfig: Record<DataSourceType, { label: string; description: string; icon: typeof Zap; color: string }> = {
    event: {
        label: "Real-time Events",
        description: "Stream data via events",
        icon: Zap,
        color: "text-amber-600 bg-amber-50",
    },
    csv: {
        label: "CSV Import",
        description: "One-time file upload",
        icon: FileSpreadsheet,
        color: "text-blue-600 bg-blue-50",
    },
    api: {
        label: "API Sync",
        description: "Pull from external API",
        icon: RefreshCw,
        color: "text-violet-600 bg-violet-50",
    },
    hybrid: {
        label: "Hybrid",
        description: "Import + event updates",
        icon: Layers,
        color: "text-emerald-600 bg-emerald-50",
    },
};

export default function DataModeling() {
    const { selectedProject } = useProject();
    
    // Data state
    const [templates, setTemplates] = useState<DatablockTemplate[]>([]);
    const [datablocks, setDatablocks] = useState<Datablock[]>([]);
    
    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDatablock, setSelectedDatablock] = useState<Datablock | null>(null);
    const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingSchema, setEditingSchema] = useState<SchemaField[]>([]);
    const [isEditingSchema, setIsEditingSchema] = useState(false);
    const [activeTab, setActiveTab] = useState<"schema" | "ingest">("schema");
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // New datablock state
    const [newDatablock, setNewDatablock] = useState({
        name: "",
        displayName: "",
        description: "",
        sourceType: "event" as DataSourceType,
    });

    // Load templates on mount
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const templatesData = await datablocksApi.listTemplates();
                setTemplates(templatesData);
            } catch (err) {
                console.error("Failed to load templates:", err);
            }
        };
        loadTemplates();
    }, []);

    // Load datablocks when project changes
    const loadDatablocks = useCallback(async () => {
        if (!selectedProject) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await datablocksApi.list(selectedProject.id);
            setDatablocks(response.items);
        } catch (err: unknown) {
            console.error("Failed to load datablocks:", err);
            setError("Failed to load datablocks");
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        loadDatablocks();
    }, [loadDatablocks]);

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to configure your data models and schemas."
            />
        );
    }

    const getIcon = (icon: IconType) => {
        const iconMap = {
            users: Users,
            package: Package,
            cart: ShoppingCart,
            cursor: MousePointer,
            "credit-card": CreditCard,
            database: Database,
        };
        const Icon = iconMap[icon] || Database;
        return <Icon className="h-5 w-5" />;
    };

    const getStatusBadge = (status: DatablockStatus) => {
        const config = {
            not_configured: { label: "Not Configured", class: "bg-slate-100 text-slate-600" },
            configured: { label: "Configured", class: "bg-blue-100 text-blue-700" },
            ready_for_deployment: { label: "Ready to Deploy", class: "bg-amber-100 text-amber-700" },
            deployed: { label: "Deployed", class: "bg-emerald-100 text-emerald-700" },
            error: { label: "Error", class: "bg-red-100 text-red-700" },
        };
        const statusConfig = config[status] || config.not_configured;
        return <Badge className={statusConfig.class}>{statusConfig.label}</Badge>;
    };

    const handleOpenConfig = (datablock: Datablock) => {
        setSelectedDatablock(datablock);
        setEditingSchema([...datablock.schema_fields]);
        setIsEditingSchema(false);
        setActiveTab("schema");
        setIsConfigDrawerOpen(true);
    };

    const handleSaveSchema = async () => {
        if (!selectedDatablock || !selectedProject) return;
        
        setIsSaving(true);
        try {
            const updateData: DatablockUpdate = {
                schema_fields: editingSchema.map(f => ({
                    name: f.name,
                    type: f.type,
                    required: f.required,
                    description: f.description,
                    is_primary_key: f.is_primary_key,
                })),
            };
            
            const updated = await datablocksApi.update(
                selectedProject.id,
                selectedDatablock.id,
                updateData
            );
            
            setDatablocks(datablocks.map(db =>
                db.id === updated.id ? updated : db
            ));
            setSelectedDatablock(updated);
            setIsEditingSchema(false);
        } catch (err) {
            console.error("Failed to save schema:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkReady = async (datablockId: string) => {
        if (!selectedProject) return;
        
        setIsSaving(true);
        try {
            const updated = await datablocksApi.markReady(selectedProject.id, datablockId);
            setDatablocks(datablocks.map(db =>
                db.id === updated.id ? updated : db
            ));
            if (selectedDatablock?.id === datablockId) {
                setSelectedDatablock(updated);
            }
        } catch (err) {
            console.error("Failed to mark ready:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddField = () => {
        setEditingSchema([
            ...editingSchema,
            {
                id: `field_${Date.now()}`,
                name: "",
                type: "string",
                required: false,
                description: "",
                is_primary_key: false,
            },
        ]);
    };

    const handleRemoveField = (fieldId: string) => {
        setEditingSchema(editingSchema.filter(f => f.id !== fieldId));
    };

    const handleCreateFromTemplate = async (templateId: string) => {
        if (!selectedProject) return;
        
        setIsSaving(true);
        try {
            const newDatablock = await datablocksApi.createFromTemplate(
                selectedProject.id,
                templateId
            );
            setDatablocks([newDatablock, ...datablocks]);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create datablock";
            console.error("Failed to create from template:", err);
            alert(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateCustomDatablock = async () => {
        if (!selectedProject) return;
        
        setIsSaving(true);
        try {
            const createData: DatablockCreate = {
                name: newDatablock.name.toLowerCase().replace(/\s+/g, "_"),
                display_name: newDatablock.displayName,
                description: newDatablock.description,
                source_type: newDatablock.sourceType,
                icon: "database",
                schema_fields: [
                    { name: "id", type: "string", required: true, description: "Primary key", is_primary_key: true },
                ],
            };
            
            const created = await datablocksApi.create(selectedProject.id, createData);
            setDatablocks([created, ...datablocks]);
            setIsCreateDialogOpen(false);
            setNewDatablock({ name: "", displayName: "", description: "", sourceType: "event" });
        } catch (err) {
            console.error("Failed to create datablock:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDatablock = async (datablockId: string) => {
        if (!selectedProject) return;
        
        if (!confirm("Are you sure you want to delete this datablock?")) return;
        
        try {
            await datablocksApi.delete(selectedProject.id, datablockId);
            setDatablocks(datablocks.filter(db => db.id !== datablockId));
            setIsConfigDrawerOpen(false);
        } catch (err) {
            console.error("Failed to delete datablock:", err);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const generateEventSnippet = (datablock: Datablock) => {
        return `// Send ${datablock.display_name} event
fetch('https://api.cartnudge.ai/v1/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    topic: '${datablock.event_topic || datablock.name}',
    data: {
${datablock.schema_fields.map(f => `      ${f.name}: ${f.type === 'string' ? '"value"' : f.type === 'number' ? '0' : f.type === 'boolean' ? 'true' : '"value"'}`).join(',\n')}
    }
  })
});`;
    };

    // Get templates that haven't been activated yet
    const availableTemplates = templates.filter(
        template => !datablocks.some(db => db.template_id === template.template_id)
    );

    const deployedDatablocks = datablocks.filter(db => db.status === "deployed");
    const readyDatablocks = datablocks.filter(db => db.status === "ready_for_deployment");
    const configuredDatablocks = datablocks.filter(db => db.status === "configured" || db.status === "not_configured");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-slate-600">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={loadDatablocks}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Modeling</h1>
                    <p className="text-slate-500 mt-1">
                        Define and configure your data schemas. Activate predefined models or create custom ones.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Datablock
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{deployedDatablocks.length}</p>
                            <p className="text-sm text-slate-500">Deployed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{readyDatablocks.length}</p>
                            <p className="text-sm text-slate-500">Ready to Deploy</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Database className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{configuredDatablocks.length}</p>
                            <p className="text-sm text-slate-500">Configuring</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {datablocks.filter(db => db.source_type === "event").length}
                            </p>
                            <p className="text-sm text-slate-500">Event Streams</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deployed Datablocks */}
            {deployedDatablocks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Deployed Datablocks</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {deployedDatablocks.map((datablock) => {
                            const sourceConfig = sourceTypeConfig[datablock.source_type];
                            const SourceIcon = sourceConfig.icon;
                            return (
                                <div
                                    key={datablock.id}
                                    className="bg-white rounded-xl border p-5 hover:border-slate-300 transition-colors cursor-pointer"
                                    onClick={() => handleOpenConfig(datablock)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                                                {getIcon(datablock.icon)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">{datablock.display_name}</h3>
                                                    {getStatusBadge(datablock.status)}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{datablock.description}</p>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", sourceConfig.color)}>
                                                        <SourceIcon className="h-3 w-3" />
                                                        {sourceConfig.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {datablock.record_count.toLocaleString()} records
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Ready to Deploy */}
            {readyDatablocks.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Ready to Deploy</h2>
                            <p className="text-sm text-slate-500">These datablocks are configured and can be added to a deployment</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {readyDatablocks.map((datablock) => {
                            const sourceConfig = sourceTypeConfig[datablock.source_type];
                            const SourceIcon = sourceConfig.icon;
                            return (
                                <div
                                    key={datablock.id}
                                    className="bg-white rounded-xl border border-amber-200 p-5 hover:border-amber-300 transition-colors cursor-pointer"
                                    onClick={() => handleOpenConfig(datablock)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white">
                                                {getIcon(datablock.icon)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">{datablock.display_name}</h3>
                                                    {getStatusBadge(datablock.status)}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{datablock.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", sourceConfig.color)}>
                                                        <SourceIcon className="h-3 w-3" />
                                                        {sourceConfig.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Active Datablocks (configured but not ready) */}
            {configuredDatablocks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Active Datablocks</h2>
                    <p className="text-sm text-slate-500">Configure these datablocks and mark them ready for deployment</p>
                    <div className="grid grid-cols-2 gap-4">
                        {configuredDatablocks.map((datablock) => {
                            const sourceConfig = sourceTypeConfig[datablock.source_type];
                            const SourceIcon = sourceConfig.icon;
                            return (
                                <div
                                    key={datablock.id}
                                    className="bg-white rounded-xl border p-5 hover:border-slate-400 transition-colors cursor-pointer"
                                    onClick={() => handleOpenConfig(datablock)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                                {getIcon(datablock.icon)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">{datablock.display_name}</h3>
                                                    {datablock.is_predefined && (
                                                        <Badge variant="outline" className="text-xs">Predefined</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{datablock.description}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", sourceConfig.color)}>
                                                        <SourceIcon className="h-3 w-3" />
                                                        {sourceConfig.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenConfig(datablock);
                                            }}
                                        >
                                            <Settings2 className="h-3 w-3 mr-1" />
                                            Configure
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Available Templates */}
            {availableTemplates.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Available Templates</h2>
                    <p className="text-sm text-slate-500">Predefined data models ready to activate</p>
                    <div className="grid grid-cols-2 gap-4">
                        {availableTemplates.map((template) => {
                            const sourceConfig = sourceTypeConfig[template.source_type];
                            const SourceIcon = sourceConfig.icon;
                            return (
                                <div
                                    key={template.template_id}
                                    className="bg-white rounded-xl border border-dashed p-5 hover:border-slate-400 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                {getIcon(template.icon)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">{template.display_name}</h3>
                                                    <Badge variant="outline" className="text-xs">Template</Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", sourceConfig.color)}>
                                                        <SourceIcon className="h-3 w-3" />
                                                        {sourceConfig.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {template.default_schema.length} fields
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleCreateFromTemplate(template.template_id)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Activate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Configuration Drawer */}
            <Sheet open={isConfigDrawerOpen} onOpenChange={setIsConfigDrawerOpen}>
                <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
                    {selectedDatablock && (
                        <>
                            <SheetHeader>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                        selectedDatablock.status === "deployed"
                                            ? "bg-emerald-100 text-emerald-600"
                                            : "bg-slate-100 text-slate-600"
                                    )}>
                                        {getIcon(selectedDatablock.icon)}
                                    </div>
                                    <div>
                                        <SheetTitle>{selectedDatablock.display_name}</SheetTitle>
                                        <p className="text-sm text-slate-500">{selectedDatablock.description}</p>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="mt-6">
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "schema" | "ingest")}>
                                    <TabsList className="w-full">
                                        <TabsTrigger value="schema" className="flex-1">Schema</TabsTrigger>
                                        <TabsTrigger value="ingest" className="flex-1">Data Ingestion</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="schema" className="mt-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-500">
                                                {editingSchema.length} fields defined
                                            </p>
                                            {isEditingSchema ? (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => {
                                                        setEditingSchema([...selectedDatablock.schema_fields]);
                                                        setIsEditingSchema(false);
                                                    }}>
                                                        Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={handleSaveSchema} disabled={isSaving}>
                                                        {isSaving ? (
                                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                        ) : (
                                                            <Check className="h-3 w-3 mr-1" />
                                                        )}
                                                        Save
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => setIsEditingSchema(true)}>
                                                    <Edit2 className="h-3 w-3 mr-1" />
                                                    Edit Schema
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {editingSchema.map((field, index) => (
                                                <div
                                                    key={field.id || index}
                                                    className={cn(
                                                        "p-3 rounded-lg border",
                                                        isEditingSchema ? "bg-white" : "bg-slate-50"
                                                    )}
                                                >
                                                    {isEditingSchema ? (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={field.name}
                                                                    onChange={(e) => {
                                                                        const updated = [...editingSchema];
                                                                        updated[index] = { ...field, name: e.target.value };
                                                                        setEditingSchema(updated);
                                                                    }}
                                                                    placeholder="Field name"
                                                                    className="flex-1"
                                                                />
                                                                <Select
                                                                    value={field.type}
                                                                    onValueChange={(v) => {
                                                                        const updated = [...editingSchema];
                                                                        updated[index] = { ...field, type: v as SchemaField["type"] };
                                                                        setEditingSchema(updated);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="w-32">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="string">String</SelectItem>
                                                                        <SelectItem value="number">Number</SelectItem>
                                                                        <SelectItem value="boolean">Boolean</SelectItem>
                                                                        <SelectItem value="date">Date</SelectItem>
                                                                        <SelectItem value="email">Email</SelectItem>
                                                                        <SelectItem value="array">Array</SelectItem>
                                                                        <SelectItem value="object">Object</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="text-red-500"
                                                                    onClick={() => handleRemoveField(field.id!)}
                                                                    disabled={field.is_primary_key}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <label className="flex items-center gap-2 text-sm">
                                                                    <Switch
                                                                        checked={field.required}
                                                                        onCheckedChange={(checked) => {
                                                                            const updated = [...editingSchema];
                                                                            updated[index] = { ...field, required: checked };
                                                                            setEditingSchema(updated);
                                                                        }}
                                                                    />
                                                                    Required
                                                                </label>
                                                                <label className="flex items-center gap-2 text-sm">
                                                                    <Switch
                                                                        checked={field.is_primary_key}
                                                                        onCheckedChange={(checked) => {
                                                                            const updated = editingSchema.map((f, i) => ({
                                                                                ...f,
                                                                                is_primary_key: i === index ? checked : false,
                                                                            }));
                                                                            setEditingSchema(updated);
                                                                        }}
                                                                    />
                                                                    Primary Key
                                                                </label>
                                                            </div>
                                                            <Input
                                                                value={field.description || ""}
                                                                onChange={(e) => {
                                                                    const updated = [...editingSchema];
                                                                    updated[index] = { ...field, description: e.target.value };
                                                                    setEditingSchema(updated);
                                                                }}
                                                                placeholder="Description"
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <code className="text-sm font-mono text-slate-700">{field.name}</code>
                                                                <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                                                {field.required && <Badge className="bg-amber-100 text-amber-700 text-xs">Required</Badge>}
                                                                {field.is_primary_key && <Badge className="bg-violet-100 text-violet-700 text-xs">PK</Badge>}
                                                            </div>
                                                            <span className="text-xs text-slate-400">{field.description}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {isEditingSchema && (
                                            <Button variant="outline" className="w-full" onClick={handleAddField}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Field
                                            </Button>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="ingest" className="mt-4 space-y-6">
                                        {/* Source Type Info */}
                                        <div className="p-4 rounded-lg bg-slate-50 border">
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const config = sourceTypeConfig[selectedDatablock.source_type];
                                                    const Icon = config.icon;
                                                    return (
                                                        <>
                                                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.color)}>
                                                                <Icon className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{config.label}</p>
                                                                <p className="text-sm text-slate-500">{config.description}</p>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Event-based ingestion */}
                                        {(selectedDatablock.source_type === "event" || selectedDatablock.source_type === "hybrid") && (
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-slate-900">Event Integration</h4>
                                                <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-slate-400">// JavaScript SDK</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-white h-6"
                                                            onClick={() => copyToClipboard(generateEventSnippet(selectedDatablock), "event")}
                                                        >
                                                            {copiedSnippet === "event" ? (
                                                                <Check className="h-3 w-3" />
                                                            ) : (
                                                                <Copy className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <pre className="whitespace-pre-wrap">{generateEventSnippet(selectedDatablock)}</pre>
                                                </div>
                                            </div>
                                        )}

                                        {/* CSV Upload */}
                                        {(selectedDatablock.source_type === "csv" || selectedDatablock.source_type === "hybrid") && (
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-slate-900">CSV Import</h4>
                                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                                    <FileUp className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                                    <p className="text-sm text-slate-600 mb-2">
                                                        Drag and drop a CSV file, or click to browse
                                                    </p>
                                                    <p className="text-xs text-slate-400 mb-4">
                                                        Supported: CSV files up to 100MB
                                                    </p>
                                                    <Button variant="outline">
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload CSV
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* API Sync */}
                                        {selectedDatablock.source_type === "api" && (
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-slate-900">API Configuration</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label>API Endpoint URL</Label>
                                                        <Input
                                                            placeholder="https://api.example.com/data"
                                                            className="mt-1.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Authentication Header</Label>
                                                        <Input
                                                            placeholder="Bearer your-api-key"
                                                            className="mt-1.5"
                                                        />
                                                    </div>
                                                    <Button className="w-full">
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Test & Sync
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-6 pt-4 border-t flex items-center justify-between">
                                {!selectedDatablock.is_predefined && (
                                    <Button
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteDatablock(selectedDatablock.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                )}
                                <div className="flex gap-2 ml-auto">
                                    {(selectedDatablock.status === "not_configured" || selectedDatablock.status === "configured") && (
                                        <Button
                                            onClick={() => {
                                                handleMarkReady(selectedDatablock.id);
                                            }}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4 mr-2" />
                                            )}
                                            Mark Ready for Deployment
                                        </Button>
                                    )}
                                    {selectedDatablock.status === "ready_for_deployment" && (
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-slate-500">
                                                Go to Deployments to deploy this datablock
                                            </p>
                                            <Button variant="outline" onClick={() => setIsConfigDrawerOpen(false)}>
                                                Close
                                            </Button>
                                        </div>
                                    )}
                                    {selectedDatablock.status === "deployed" && (
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-emerald-600">
                                                This datablock is deployed and receiving data
                                            </p>
                                            <Button variant="outline" onClick={() => setIsConfigDrawerOpen(false)}>
                                                Close
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Create Datablock Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Custom Datablock</DialogTitle>
                        <DialogDescription>
                            Define a new data model for your specific needs.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Display Name</Label>
                            <Input
                                value={newDatablock.displayName}
                                onChange={(e) => setNewDatablock({ ...newDatablock, displayName: e.target.value, name: e.target.value })}
                                placeholder="e.g., Wishlist Items"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={newDatablock.description}
                                onChange={(e) => setNewDatablock({ ...newDatablock, description: e.target.value })}
                                placeholder="Describe what data this datablock will hold..."
                                className="mt-1.5"
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label>Data Source Type</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                                {(Object.keys(sourceTypeConfig) as DataSourceType[]).map((type) => {
                                    const config = sourceTypeConfig[type];
                                    const Icon = config.icon;
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setNewDatablock({ ...newDatablock, sourceType: type })}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-colors",
                                                newDatablock.sourceType === type
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "hover:border-slate-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                <span className="font-medium text-sm">{config.label}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{config.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCustomDatablock}
                            disabled={!newDatablock.displayName.trim() || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Create Datablock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
