import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    Calendar,
    Copy,
    Check,
    ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaField } from "./SchemaBuilder";
import type { UserRecord } from "./UserDirectory";
import { useState } from "react";

interface UserDetailDrawerProps {
    user: UserRecord | null;
    schema: SchemaField[];
    open: boolean;
    onClose: () => void;
}

export function UserDetailDrawer({
    user,
    schema,
    open,
    onClose,
}: UserDetailDrawerProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!user) return null;

    const handleCopy = async (value: string, fieldName: string) => {
        await navigator.clipboard.writeText(value);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getStatusInfo = () => {
        switch (user.status) {
            case "complete":
                return {
                    label: "Complete",
                    description: "All required fields are filled",
                    icon: CheckCircle2,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50",
                    border: "border-emerald-200",
                };
            case "partial":
                return {
                    label: "Partial",
                    description: "Some required fields are missing",
                    icon: AlertCircle,
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                    border: "border-amber-200",
                };
            case "invalid":
                return {
                    label: "Invalid",
                    description: "Contains validation errors",
                    icon: AlertCircle,
                    color: "text-red-600",
                    bg: "bg-red-50",
                    border: "border-red-200",
                };
        }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    // Find missing required fields
    const missingFields = schema.filter(
        (field) =>
            field.required &&
            (user.data[field.name] === null ||
                user.data[field.name] === undefined ||
                user.data[field.name] === "")
    );

    const formatValue = (value: string | number | boolean | null, type: string) => {
        if (value === null || value === undefined || value === "") {
            return <span className="text-slate-400 italic">Not provided</span>;
        }
        if (typeof value === "boolean") {
            return value ? "Yes" : "No";
        }
        if (type === "date" && typeof value === "string") {
            return new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }
        return String(value);
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <SheetTitle className="text-xl font-semibold text-slate-900">
                                User Profile
                            </SheetTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                ID: {user.id}
                            </p>
                        </div>
                    </div>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {/* Status Card */}
                    <div
                        className={cn(
                            "p-4 rounded-lg border",
                            statusInfo.bg,
                            statusInfo.border
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <StatusIcon className={cn("h-5 w-5 mt-0.5", statusInfo.color)} />
                            <div>
                                <p className={cn("font-medium", statusInfo.color)}>
                                    {statusInfo.label}
                                </p>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {statusInfo.description}
                                </p>
                                {missingFields.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {missingFields.map((field) => (
                                            <Badge
                                                key={field.id}
                                                variant="outline"
                                                className="text-xs border-amber-300 text-amber-700"
                                            >
                                                {field.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* User Attributes */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">
                            Attributes
                        </h4>
                        <div className="space-y-3">
                            {schema.map((field) => {
                                const value = user.data[field.name];
                                const hasValue =
                                    value !== null && value !== undefined && value !== "";

                                return (
                                    <div
                                        key={field.id}
                                        className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {field.name}
                                                </span>
                                                {field.isPrimaryKey && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] py-0 px-1 bg-amber-50 border-amber-200 text-amber-700"
                                                    >
                                                        Primary
                                                    </Badge>
                                                )}
                                                {field.required && !hasValue && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] py-0 px-1 bg-red-50 border-red-200 text-red-600"
                                                    >
                                                        Required
                                                    </Badge>
                                                )}
                                            </div>
                                            <p
                                                className={cn(
                                                    "text-sm mt-0.5",
                                                    hasValue ? "text-slate-900" : "text-slate-400"
                                                )}
                                            >
                                                {formatValue(value, field.type)}
                                            </p>
                                        </div>
                                        {hasValue && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                                                onClick={() =>
                                                    handleCopy(String(value), field.name)
                                                }
                                            >
                                                {copiedField === field.name ? (
                                                    <Check className="h-4 w-4 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">
                            Timestamps
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-500">Created:</span>
                                <span className="text-slate-900">
                                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-500">Updated:</span>
                                <span className="text-slate-900">
                                    {new Date(user.updatedAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Shopping Profile Placeholder */}
                    <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                <ShoppingCart className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">
                                    Shopping Profile
                                </p>
                                <p className="text-xs text-slate-500">
                                    Coming soon - Purchase history and behavior analytics
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

