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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    CheckCircle2,
    Clock,
    Zap,
    FileSpreadsheet,
    RefreshCw,
    Layers,
    Loader2,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Check,
    ChevronRight,
    Sparkles,
    LayoutTemplate,
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
    SchemaField,
    IconType,
} from "@/lib/api/dataplatform/types";

// Source type config
const sourceTypeConfig: Record<DataSourceType, { label: string; description: string; icon: typeof Zap; color: string; bgColor: string }> = {
    event: {
        label: "Real-time Events",
        description: "Stream data via events",
        icon: Zap,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
    },
    csv: {
        label: "CSV Import",
        description: "Bulk file upload",
        icon: FileSpreadsheet,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
    },
    api: {
        label: "API Sync",
        description: "Pull from external API",
        icon: RefreshCw,
        color: "text-violet-600",
        bgColor: "bg-violet-50",
    },
    hybrid: {
        label: "Hybrid",
        description: "Import + event updates",
        icon: Layers,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
    },
};

// Wizard steps
type WizardStep = "choose" | "configure" | "review";

export default function DataModeling() {
    const { selectedProject } = useProject();
    
    // Data state
    const [templates, setTemplates] = useState<DatablockTemplate[]>([]);
    const [datablocks, setDatablocks] = useState<Datablock[]>([]);
    
    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Wizard state
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStep>("choose");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isCustom, setIsCustom] = useState(false);
    const [wizardData, setWizardData] = useState({
        name: "",
        displayName: "",
        description: "",
        sourceType: "event" as DataSourceType,
        schema: [] as SchemaField[],
    });
    
    // Edit state
    const [editingDatablock, setEditingDatablock] = useState<Datablock | null>(null);
    const [editSchema, setEditSchema] = useState<SchemaField[]>([]);

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
        return Icon;
    };

    // Wizard handlers
    const openWizard = () => {
        setIsWizardOpen(true);
        setWizardStep("choose");
        setSelectedTemplateId(null);
        setIsCustom(false);
        setWizardData({
            name: "",
            displayName: "",
            description: "",
            sourceType: "event",
            schema: [],
        });
    };

    const closeWizard = () => {
        setIsWizardOpen(false);
        setWizardStep("choose");
        setSelectedTemplateId(null);
        setIsCustom(false);
    };

    const selectTemplate = (templateId: string) => {
        const template = templates.find(t => t.template_id === templateId);
        if (template) {
            setSelectedTemplateId(templateId);
            setIsCustom(false);
            setWizardData({
                name: template.name,
                displayName: template.display_name,
                description: template.description,
                sourceType: template.source_type,
                schema: template.default_schema.map((f, i) => ({
                    ...f,
                    id: f.id || `field_${i}`,
                })),
            });
        }
    };

    const selectCustom = () => {
        setIsCustom(true);
        setSelectedTemplateId(null);
        setWizardData({
            name: "",
            displayName: "",
            description: "",
            sourceType: "event",
            schema: [
                { id: "f1", name: "id", type: "string", required: true, description: "Primary key", is_primary_key: true },
            ],
        });
    };

    const handleAddSchemaField = () => {
        setWizardData({
            ...wizardData,
            schema: [
                ...wizardData.schema,
                {
                    id: `field_${Date.now()}`,
                    name: "",
                    type: "string",
                    required: false,
                    description: "",
                    is_primary_key: false,
                },
            ],
        });
    };

    const handleRemoveSchemaField = (fieldId: string) => {
        setWizardData({
            ...wizardData,
            schema: wizardData.schema.filter(f => f.id !== fieldId),
        });
    };

    const handleCreateDatablock = async () => {
        if (!selectedProject) return;
        
        setIsSaving(true);
        try {
            let newDatablock: Datablock;
            
            if (selectedTemplateId) {
                // Create from template first
                newDatablock = await datablocksApi.createFromTemplate(
                    selectedProject.id,
                    selectedTemplateId
                );
                
                // Update with customized schema
                const updateData: DatablockUpdate = {
                    schema_fields: wizardData.schema.map(f => ({
                        name: f.name,
                        type: f.type,
                        required: f.required,
                        description: f.description,
                        is_primary_key: f.is_primary_key,
                    })),
                };
                newDatablock = await datablocksApi.update(
                    selectedProject.id,
                    newDatablock.id,
                    updateData
                );
            } else {
                // Create custom datablock
                const createData: DatablockCreate = {
                    name: wizardData.name.toLowerCase().replace(/\s+/g, "_"),
                    display_name: wizardData.displayName,
                    description: wizardData.description,
                    source_type: wizardData.sourceType,
                    icon: "database",
                    schema_fields: wizardData.schema.map(f => ({
                        name: f.name,
                        type: f.type,
                        required: f.required,
                        description: f.description,
                        is_primary_key: f.is_primary_key,
                    })),
                };
                newDatablock = await datablocksApi.create(selectedProject.id, createData);
            }
            
            // Mark as ready for deployment
            const readyDatablock = await datablocksApi.markReady(selectedProject.id, newDatablock.id);
            
            setDatablocks([readyDatablock, ...datablocks]);
            closeWizard();
        } catch (err: unknown) {
            console.error("Failed to create datablock:", err);
            alert("Failed to create datablock");
        } finally {
            setIsSaving(false);
        }
    };

    // Edit handlers
    const openEdit = (datablock: Datablock) => {
        setEditingDatablock(datablock);
        setEditSchema([...datablock.schema_fields]);
    };

    const closeEdit = () => {
        setEditingDatablock(null);
        setEditSchema([]);
    };

    const handleSaveEdit = async () => {
        if (!selectedProject || !editingDatablock) return;
        
        setIsSaving(true);
        try {
            const updateData: DatablockUpdate = {
                schema_fields: editSchema.map(f => ({
                    name: f.name,
                    type: f.type,
                    required: f.required,
                    description: f.description,
                    is_primary_key: f.is_primary_key,
                })),
            };
            
            const updated = await datablocksApi.update(
                selectedProject.id,
                editingDatablock.id,
                updateData
            );
            
            setDatablocks(datablocks.map(db => db.id === updated.id ? updated : db));
            closeEdit();
        } catch (err) {
            console.error("Failed to save:", err);
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
            closeEdit();
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    const handleAddEditField = () => {
        setEditSchema([
            ...editSchema,
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

    // Categorize datablocks
    const deployedDatablocks = datablocks.filter(db => db.status === "deployed");
    const bucketDatablocks = datablocks.filter(db => db.status === "ready_for_deployment");
    const activeDatablocks = datablocks.filter(db => db.status === "configured" || db.status === "not_configured");
    
    // Available templates (not yet activated)
    const availableTemplates = templates.filter(
        template => !datablocks.some(db => db.template_id === template.template_id)
    );

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

    // Schema field editor component
    const SchemaFieldRow = ({ 
        field, 
        index, 
        schema, 
        setSchema,
        onRemove 
    }: { 
        field: SchemaField;
        index: number;
        schema: SchemaField[];
        setSchema: (s: SchemaField[]) => void;
        onRemove: () => void;
    }) => (
        <div className="grid grid-cols-12 gap-3 items-start p-3 bg-slate-50 rounded-lg">
            <div className="col-span-3">
                <Input
                    value={field.name}
                    onChange={(e) => {
                        const updated = [...schema];
                        updated[index] = { ...field, name: e.target.value };
                        setSchema(updated);
                    }}
                    placeholder="field_name"
                    className="font-mono text-sm"
                />
            </div>
            <div className="col-span-2">
                <Select
                    value={field.type}
                    onValueChange={(v) => {
                        const updated = [...schema];
                        updated[index] = { ...field, type: v as SchemaField["type"] };
                        setSchema(updated);
                    }}
                >
                    <SelectTrigger className="text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                        <SelectItem value="object">Object</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="col-span-4">
                <Input
                    value={field.description || ""}
                    onChange={(e) => {
                        const updated = [...schema];
                        updated[index] = { ...field, description: e.target.value };
                        setSchema(updated);
                    }}
                    placeholder="Description"
                    className="text-sm"
                />
            </div>
            <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => {
                            const updated = [...schema];
                            updated[index] = { ...field, required: checked };
                            setSchema(updated);
                        }}
                        className="scale-75"
                    />
                    Req
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                        checked={field.is_primary_key}
                        onCheckedChange={(checked) => {
                            const updated = schema.map((f, i) => ({
                                ...f,
                                is_primary_key: i === index ? checked : false,
                            }));
                            setSchema(updated);
                        }}
                        className="scale-75"
                    />
                    PK
                </label>
            </div>
            <div className="col-span-1 flex justify-end">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                    onClick={onRemove}
                    disabled={field.is_primary_key}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Modeling</h1>
                    <p className="text-slate-500 mt-1">
                        Define your data schemas and add them to the deployment bucket
                    </p>
                </div>
                <Button onClick={openWizard} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Datablock
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
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
                            <p className="text-2xl font-bold text-slate-900">{bucketDatablocks.length}</p>
                            <p className="text-sm text-slate-500">In Deployment Bucket</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{activeDatablocks.length}</p>
                            <p className="text-sm text-slate-500">Active (Configuring)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deployed Datablocks */}
            {deployedDatablocks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Deployed
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {deployedDatablocks.map((datablock) => {
                            const sourceConfig = sourceTypeConfig[datablock.source_type];
                            const Icon = getIcon(datablock.icon);
                            return (
                                <div
                                    key={datablock.id}
                                    className="bg-white rounded-xl border-2 border-emerald-200 p-4 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => openEdit(datablock)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{datablock.display_name}</h3>
                                            <p className="text-sm text-slate-500 truncate">{datablock.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full", sourceConfig.bgColor, sourceConfig.color)}>
                                                    {sourceConfig.label}
                                                </span>
                                                <span className="text-xs text-slate-400">{datablock.schema_fields.length} fields</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Deployment Bucket */}
            {bucketDatablocks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Deployment Bucket
                        <Badge className="bg-amber-100 text-amber-700">{bucketDatablocks.length}</Badge>
                    </h2>
                    <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4">
                        <div className="grid grid-cols-3 gap-4">
                            {bucketDatablocks.map((datablock) => {
                                const sourceConfig = sourceTypeConfig[datablock.source_type];
                                const Icon = getIcon(datablock.icon);
                                return (
                                    <div
                                        key={datablock.id}
                                        className="bg-white rounded-lg border border-amber-200 p-4 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => openEdit(datablock)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900 truncate">{datablock.display_name}</h3>
                                                <p className="text-sm text-slate-500 truncate">{datablock.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full", sourceConfig.bgColor, sourceConfig.color)}>
                                                        {sourceConfig.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{datablock.schema_fields.length} fields</span>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-amber-600 hover:text-amber-700">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Active Datablocks */}
            {activeDatablocks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-500" />
                        Active (Configuring)
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {activeDatablocks.map((datablock) => {
                            const sourceConfig = sourceTypeConfig[datablock.source_type];
                            const Icon = getIcon(datablock.icon);
                            return (
                                <div
                                    key={datablock.id}
                                    className="bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => openEdit(datablock)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{datablock.display_name}</h3>
                                            <p className="text-sm text-slate-500 truncate">{datablock.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full", sourceConfig.bgColor, sourceConfig.color)}>
                                                    {sourceConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {datablocks.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed">
                    <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No datablocks yet</h3>
                    <p className="text-slate-500 mb-6">Create your first datablock to start defining your data schema</p>
                    <Button onClick={openWizard}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Datablock
                    </Button>
                </div>
            )}

            {/* ===== CREATE WIZARD DIALOG ===== */}
            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl">Create Datablock</DialogTitle>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className={cn("px-2 py-1 rounded", wizardStep === "choose" ? "bg-blue-100 text-blue-700" : "")}>
                                    1. Choose
                                </span>
                                <ChevronRight className="h-4 w-4" />
                                <span className={cn("px-2 py-1 rounded", wizardStep === "configure" ? "bg-blue-100 text-blue-700" : "")}>
                                    2. Configure
                                </span>
                                <ChevronRight className="h-4 w-4" />
                                <span className={cn("px-2 py-1 rounded", wizardStep === "review" ? "bg-blue-100 text-blue-700" : "")}>
                                    3. Add to Bucket
                                </span>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4">
                        {/* Step 1: Choose template or custom */}
                        {wizardStep === "choose" && (
                            <div className="space-y-6">
                                <p className="text-slate-600">Choose a predefined template or create a custom datablock</p>
                                
                                {/* Custom option */}
                                <div
                                    onClick={selectCustom}
                                    className={cn(
                                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                        isCustom 
                                            ? "border-blue-500 bg-blue-50" 
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-lg flex items-center justify-center",
                                            isCustom ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900">Custom Datablock</h3>
                                            <p className="text-sm text-slate-500">Create from scratch with your own schema</p>
                                        </div>
                                        {isCustom && <Check className="h-5 w-5 text-blue-600" />}
                                    </div>
                                </div>

                                {/* Templates */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <LayoutTemplate className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">Templates</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableTemplates.map((template) => {
                                            const isSelected = selectedTemplateId === template.template_id;
                                            const sourceConfig = sourceTypeConfig[template.source_type];
                                            const Icon = getIcon(template.icon);
                                            return (
                                                <div
                                                    key={template.template_id}
                                                    onClick={() => selectTemplate(template.template_id)}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                        isSelected 
                                                            ? "border-blue-500 bg-blue-50" 
                                                            : "border-slate-200 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                                            isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-slate-900">{template.display_name}</h4>
                                                            <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className={cn("text-xs px-2 py-0.5 rounded-full", sourceConfig.bgColor, sourceConfig.color)}>
                                                                    {sourceConfig.label}
                                                                </span>
                                                                <span className="text-xs text-slate-400">{template.default_schema.length} fields</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Configure */}
                        {wizardStep === "configure" && (
                            <div className="space-y-6">
                                {/* Basic info for custom */}
                                {isCustom && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Display Name</Label>
                                            <Input
                                                value={wizardData.displayName}
                                                onChange={(e) => setWizardData({
                                                    ...wizardData,
                                                    displayName: e.target.value,
                                                    name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                                                })}
                                                placeholder="e.g., Wishlist Items"
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <Label>Source Type</Label>
                                            <Select
                                                value={wizardData.sourceType}
                                                onValueChange={(v) => setWizardData({ ...wizardData, sourceType: v as DataSourceType })}
                                            >
                                                <SelectTrigger className="mt-1.5">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(sourceTypeConfig).map(([type, config]) => (
                                                        <SelectItem key={type} value={type}>
                                                            <div className="flex items-center gap-2">
                                                                <config.icon className="h-4 w-4" />
                                                                {config.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={wizardData.description}
                                                onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                                                placeholder="What data will this datablock hold?"
                                                className="mt-1.5"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Schema fields */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-base">Schema Fields</Label>
                                        <span className="text-sm text-slate-500">{wizardData.schema.length} fields</span>
                                    </div>
                                    
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-500 px-3 mb-2">
                                        <div className="col-span-3">Field Name</div>
                                        <div className="col-span-2">Type</div>
                                        <div className="col-span-4">Description</div>
                                        <div className="col-span-2">Options</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {wizardData.schema.map((field, index) => (
                                            <SchemaFieldRow
                                                key={field.id}
                                                field={field}
                                                index={index}
                                                schema={wizardData.schema}
                                                setSchema={(s) => setWizardData({ ...wizardData, schema: s })}
                                                onRemove={() => handleRemoveSchemaField(field.id!)}
                                            />
                                        ))}
                                    </div>
                                    
                                    <Button
                                        variant="outline"
                                        className="w-full mt-3"
                                        onClick={handleAddSchemaField}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Field
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {wizardStep === "review" && (
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-xl">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            {isCustom ? <Sparkles className="h-6 w-6" /> : (() => {
                                                const template = templates.find(t => t.template_id === selectedTemplateId);
                                                if (template) {
                                                    const Icon = getIcon(template.icon);
                                                    return <Icon className="h-6 w-6" />;
                                                }
                                                return <Database className="h-6 w-6" />;
                                            })()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{wizardData.displayName}</h3>
                                            <p className="text-slate-500">{wizardData.description}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={cn(
                                                    "text-xs px-2 py-1 rounded-full",
                                                    sourceTypeConfig[wizardData.sourceType].bgColor,
                                                    sourceTypeConfig[wizardData.sourceType].color
                                                )}>
                                                    {sourceTypeConfig[wizardData.sourceType].label}
                                                </span>
                                                <span className="text-sm text-slate-500">{wizardData.schema.length} fields</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base mb-3 block">Schema Preview</Label>
                                    <div className="border rounded-lg divide-y">
                                        {wizardData.schema.map((field) => (
                                            <div key={field.id} className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <code className="text-sm font-mono text-slate-700">{field.name}</code>
                                                    <Badge variant="outline">{field.type}</Badge>
                                                    {field.required && <Badge className="bg-amber-100 text-amber-700">Required</Badge>}
                                                    {field.is_primary_key && <Badge className="bg-violet-100 text-violet-700">PK</Badge>}
                                                </div>
                                                <span className="text-sm text-slate-400">{field.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800">
                                        <strong>Ready to add to deployment bucket.</strong> Once added, you can deploy this datablock from the Deployments page.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 pt-4 border-t flex items-center justify-between">
                        <Button variant="ghost" onClick={closeWizard}>
                            Cancel
                        </Button>
                        <div className="flex gap-2">
                            {wizardStep !== "choose" && (
                                <Button
                                    variant="outline"
                                    onClick={() => setWizardStep(wizardStep === "review" ? "configure" : "choose")}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            )}
                            {wizardStep === "choose" && (
                                <Button
                                    onClick={() => setWizardStep("configure")}
                                    disabled={!isCustom && !selectedTemplateId}
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                            {wizardStep === "configure" && (
                                <Button
                                    onClick={() => setWizardStep("review")}
                                    disabled={isCustom && !wizardData.displayName.trim()}
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                            {wizardStep === "review" && (
                                <Button
                                    onClick={handleCreateDatablock}
                                    disabled={isSaving}
                                    className="bg-amber-500 hover:bg-amber-600"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Add to Deployment Bucket
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== EDIT DIALOG ===== */}
            <Dialog open={!!editingDatablock} onOpenChange={() => closeEdit()}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {editingDatablock && (
                        <>
                            <DialogHeader className="flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                            editingDatablock.status === "deployed" 
                                                ? "bg-emerald-100 text-emerald-600"
                                                : editingDatablock.status === "ready_for_deployment"
                                                ? "bg-amber-100 text-amber-600"
                                                : "bg-blue-100 text-blue-600"
                                        )}>
                                            {(() => {
                                                const Icon = getIcon(editingDatablock.icon);
                                                return <Icon className="h-5 w-5" />;
                                            })()}
                                        </div>
                                        <div>
                                            <DialogTitle>{editingDatablock.display_name}</DialogTitle>
                                            <p className="text-sm text-slate-500">{editingDatablock.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {editingDatablock.status === "deployed" && (
                                            <Badge className="bg-emerald-100 text-emerald-700">Deployed</Badge>
                                        )}
                                        {editingDatablock.status === "ready_for_deployment" && (
                                            <Badge className="bg-amber-100 text-amber-700">In Bucket</Badge>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto py-4 space-y-6">
                                {/* Source type info */}
                                <div className="p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                                    {(() => {
                                        const config = sourceTypeConfig[editingDatablock.source_type];
                                        const Icon = config.icon;
                                        return (
                                            <>
                                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bgColor)}>
                                                    <Icon className={cn("h-5 w-5", config.color)} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{config.label}</p>
                                                    <p className="text-sm text-slate-500">{config.description}</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Schema fields */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-base">Schema Fields</Label>
                                        <span className="text-sm text-slate-500">{editSchema.length} fields</span>
                                    </div>
                                    
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-500 px-3 mb-2">
                                        <div className="col-span-3">Field Name</div>
                                        <div className="col-span-2">Type</div>
                                        <div className="col-span-4">Description</div>
                                        <div className="col-span-2">Options</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {editSchema.map((field, index) => (
                                            <SchemaFieldRow
                                                key={field.id || index}
                                                field={field}
                                                index={index}
                                                schema={editSchema}
                                                setSchema={setEditSchema}
                                                onRemove={() => setEditSchema(editSchema.filter(f => f.id !== field.id))}
                                            />
                                        ))}
                                    </div>
                                    
                                    <Button
                                        variant="outline"
                                        className="w-full mt-3"
                                        onClick={handleAddEditField}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Field
                                    </Button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 pt-4 border-t flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteDatablock(editingDatablock.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={closeEdit}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveEdit} disabled={isSaving}>
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4 mr-2" />
                                        )}
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
