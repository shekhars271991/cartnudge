import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    GripVertical,
    Trash2,
    Key,
    ChevronDown,
    ChevronRight,
    X,
    Check,
    Pencil,
    Lock,
    Rocket,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldType = "string" | "number" | "boolean" | "date" | "email" | "enum";

export interface SchemaField {
    id: string;
    name: string;
    type: FieldType;
    required: boolean;
    description: string;
    isPrimaryKey: boolean;
    enumValues?: string[];
}

interface SchemaBuilderProps {
    fields: SchemaField[];
    onFieldsChange: (fields: SchemaField[]) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    isEditing: boolean;
    onEditToggle: () => void;
    onSave: () => void;
}

const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "date", label: "Date" },
    { value: "email", label: "Email" },
    { value: "enum", label: "Enum" },
];

const getTypeColor = (type: FieldType) => {
    const colors: Record<FieldType, string> = {
        string: "bg-emerald-50 text-emerald-700 border-emerald-200",
        number: "bg-blue-50 text-blue-700 border-blue-200",
        boolean: "bg-amber-50 text-amber-700 border-amber-200",
        date: "bg-purple-50 text-purple-700 border-purple-200",
        email: "bg-cyan-50 text-cyan-700 border-cyan-200",
        enum: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return colors[type];
};

export function SchemaBuilder({
    fields,
    onFieldsChange,
    isCollapsed = false,
    onToggleCollapse,
    isEditing,
    onEditToggle,
    onSave,
}: SchemaBuilderProps) {
    const [isAddingField, setIsAddingField] = useState(false);
    const [savedToBucket, setSavedToBucket] = useState(false);
    const [newField, setNewField] = useState<Partial<SchemaField>>({
        name: "",
        type: "string",
        required: false,
        description: "",
        isPrimaryKey: false,
    });

    const handleAddField = () => {
        if (!newField.name?.trim()) return;

        const field: SchemaField = {
            id: `field_${Date.now()}`,
            name: newField.name.trim().toLowerCase().replace(/\s+/g, "_"),
            type: newField.type || "string",
            required: newField.required || false,
            description: newField.description || "",
            isPrimaryKey: newField.isPrimaryKey || false,
            enumValues: newField.type === "enum" ? newField.enumValues : undefined,
        };

        // If this is set as primary key, remove primary key from other fields
        let updatedFields = fields;
        if (field.isPrimaryKey) {
            updatedFields = fields.map((f) => ({ ...f, isPrimaryKey: false }));
        }

        onFieldsChange([...updatedFields, field]);
        setNewField({
            name: "",
            type: "string",
            required: false,
            description: "",
            isPrimaryKey: false,
        });
        setIsAddingField(false);
    };

    const handleDeleteField = (id: string) => {
        onFieldsChange(fields.filter((f) => f.id !== id));
    };

    const handleSetPrimaryKey = (id: string) => {
        onFieldsChange(
            fields.map((f) => ({
                ...f,
                isPrimaryKey: f.id === id,
                required: f.id === id ? true : f.required, // Primary key must be required
            }))
        );
    };

    const handleSaveClick = () => {
        setIsAddingField(false);
        onSave();
        setSavedToBucket(true);
        setTimeout(() => setSavedToBucket(false), 5000);
    };

    const handleCancelEdit = () => {
        setIsAddingField(false);
        setSavedToBucket(false);
        onEditToggle();
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                <button
                    onClick={onToggleCollapse}
                    className="flex items-center gap-3 flex-1"
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900">
                            Schema Definition
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Define the attributes for your user profiles
                        </p>
                    </div>
                </button>
                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 gap-1">
                            <Lock className="h-3 w-3" />
                            Read-only
                        </Badge>
                    )}
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        {fields.length} fields
                    </Badge>
                    {!isCollapsed && (
                        isEditing ? (
                            <div className="flex items-center gap-2 ml-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="h-8"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveClick}
                                    className="h-8 bg-violet-600 hover:bg-violet-700 gap-1"
                                >
                                    <Rocket className="h-3.5 w-3.5" />
                                    Save to Bucket
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditToggle}
                                className="h-8 ml-2 gap-1"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* Saved to Bucket Success Message */}
            {savedToBucket && (
                <div className="mx-5 mb-0 mt-0 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-violet-900">
                                    Schema changes saved to deployment bucket
                                </p>
                                <p className="text-xs text-violet-600">
                                    Go to Deployments to review and deploy
                                </p>
                            </div>
                        </div>
                        <Link to="/deployments">
                            <Button size="sm" variant="outline" className="gap-1.5 text-violet-700 border-violet-300 hover:bg-violet-100">
                                <Rocket className="h-3.5 w-3.5" />
                                View Deployments
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Content */}
            {!isCollapsed && (
                <div className="border-t border-slate-100">
                    {/* Field Table */}
                    {fields.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                        {isEditing && <TableHead className="w-10"></TableHead>}
                                        <TableHead className="font-semibold text-slate-700">
                                            Field Name
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700">
                                            Type
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">
                                            Required
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700">
                                            Description
                                        </TableHead>
                                        {isEditing && <TableHead className="w-24"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field) => (
                                        <TableRow
                                            key={field.id}
                                            className={cn(
                                                "group",
                                                isEditing && "data-table-row"
                                            )}
                                        >
                                            {isEditing && (
                                                <TableCell className="text-center">
                                                    <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                                        {field.name}
                                                    </code>
                                                    {field.isPrimaryKey && (
                                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                                            <Key className="h-3 w-3" />
                                                            Primary
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-medium",
                                                        getTypeColor(field.type)
                                                    )}
                                                >
                                                    {field.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {field.required ? (
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                                                {field.description || "—"}
                                            </TableCell>
                                            {isEditing && (
                                                <TableCell>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!field.isPrimaryKey && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                                                                onClick={() =>
                                                                    handleSetPrimaryKey(field.id)
                                                                }
                                                                title="Set as primary key"
                                                            >
                                                                <Key className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                                            onClick={() => handleDeleteField(field.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Empty State */}
                    {fields.length === 0 && !isAddingField && (
                        <div className="p-8 text-center">
                            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Plus className="h-6 w-6 text-slate-400" />
                            </div>
                            <h4 className="text-sm font-medium text-slate-900 mb-1">
                                No fields defined
                            </h4>
                            <p className="text-sm text-slate-500 mb-4">
                                Start by adding fields to define your user schema
                            </p>
                            {isEditing && (
                                <Button
                                    onClick={() => setIsAddingField(true)}
                                    className="bg-slate-900 hover:bg-slate-800"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Field
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Add Field Form - Only show in edit mode */}
                    {isEditing && isAddingField && (
                        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-3">
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Field Name
                                    </Label>
                                    <Input
                                        placeholder="e.g., email"
                                        value={newField.name}
                                        onChange={(e) =>
                                            setNewField({ ...newField, name: e.target.value })
                                        }
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Type
                                    </Label>
                                    <Select
                                        value={newField.type}
                                        onValueChange={(v: FieldType) =>
                                            setNewField({ ...newField, type: v })
                                        }
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fieldTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Description
                                    </Label>
                                    <Input
                                        placeholder="Optional description"
                                        value={newField.description}
                                        onChange={(e) =>
                                            setNewField({
                                                ...newField,
                                                description: e.target.value,
                                            })
                                        }
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-2 flex items-end gap-4">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="required"
                                            checked={newField.required}
                                            onCheckedChange={(checked) =>
                                                setNewField({ ...newField, required: checked })
                                            }
                                        />
                                        <Label htmlFor="required" className="text-sm text-slate-600">
                                            Required
                                        </Label>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-end gap-2">
                                    <Button
                                        onClick={handleAddField}
                                        className="bg-slate-900 hover:bg-slate-800 h-9"
                                        disabled={!newField.name?.trim()}
                                    >
                                        <Check className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsAddingField(false);
                                            setNewField({
                                                name: "",
                                                type: "string",
                                                required: false,
                                                description: "",
                                                isPrimaryKey: false,
                                            });
                                        }}
                                        className="h-9"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Field Button - Only show in edit mode */}
                    {isEditing && fields.length > 0 && !isAddingField && (
                        <div className="p-4 border-t border-slate-100">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddingField(true)}
                                className="w-full border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
