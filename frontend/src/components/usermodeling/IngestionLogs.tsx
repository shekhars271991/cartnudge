import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    History,
    FileUp,
    Code,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface IngestionLogEntry {
    id: string;
    timestamp: string;
    source: "csv" | "api";
    status: "success" | "failed" | "processing";
    rowsProcessed: number;
    rowsFailed: number;
    duration: string;
    fileName?: string;
    errorMessage?: string;
}

interface IngestionLogsProps {
    logs: IngestionLogEntry[];
    onRefresh?: () => void;
}

// Sample data
const sampleLogs: IngestionLogEntry[] = [
    {
        id: "log_001",
        timestamp: "2025-12-07T14:32:15Z",
        source: "api",
        status: "success",
        rowsProcessed: 150,
        rowsFailed: 0,
        duration: "1.2s",
    },
    {
        id: "log_002",
        timestamp: "2025-12-07T12:15:00Z",
        source: "csv",
        status: "success",
        rowsProcessed: 2500,
        rowsFailed: 3,
        duration: "8.5s",
        fileName: "users_export_dec.csv",
    },
    {
        id: "log_003",
        timestamp: "2025-12-06T18:45:30Z",
        source: "api",
        status: "failed",
        rowsProcessed: 0,
        rowsFailed: 1,
        duration: "0.3s",
        errorMessage: "Invalid email format",
    },
    {
        id: "log_004",
        timestamp: "2025-12-06T10:20:00Z",
        source: "csv",
        status: "success",
        rowsProcessed: 5000,
        rowsFailed: 12,
        duration: "15.2s",
        fileName: "bulk_import.csv",
    },
    {
        id: "log_005",
        timestamp: "2025-12-05T09:00:00Z",
        source: "api",
        status: "success",
        rowsProcessed: 45,
        rowsFailed: 0,
        duration: "0.8s",
    },
];

export function IngestionLogs({ logs = sampleLogs, onRefresh }: IngestionLogsProps) {
    const [open, setOpen] = useState(false);

    const getStatusBadge = (status: IngestionLogEntry["status"]) => {
        switch (status) {
            case "success":
                return (
                    <Badge className="badge-success gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                    </Badge>
                );
            case "processing":
                return (
                    <Badge className="badge-info gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing
                    </Badge>
                );
        }
    };

    const getSourceIcon = (source: IngestionLogEntry["source"]) => {
        return source === "csv" ? (
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-emerald-100 flex items-center justify-center">
                    <FileUp className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-medium">CSV Upload</span>
            </div>
        ) : (
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-blue-100 flex items-center justify-center">
                    <Code className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">API Call</span>
            </div>
        );
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        } else {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
    };

    const successCount = logs.filter((l) => l.status === "success").length;
    const totalRows = logs.reduce((acc, l) => acc + l.rowsProcessed, 0);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    Ingestion Logs
                    {logs.length > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700">
                            {logs.length}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-xl font-semibold text-slate-900">
                                Ingestion Logs
                            </SheetTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                History of all data imports
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            className="gap-2"
                        >
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
                        <p className="text-2xl font-semibold text-emerald-600">{successCount}</p>
                        <p className="text-xs text-slate-500">Successful</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-semibold text-slate-900">
                            {totalRows.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">Rows Processed</p>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="py-4">
                    {logs.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">
                                No ingestion logs yet. Import data to see logs here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
                                        {getSourceIcon(log.source)}
                                        {getStatusBadge(log.status)}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs mb-0.5">Time</p>
                                            <p className="font-medium text-slate-700 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTimestamp(log.timestamp)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-0.5">Rows</p>
                                            <p className="font-medium text-slate-700">
                                                {log.rowsProcessed.toLocaleString()}
                                                {log.rowsFailed > 0 && (
                                                    <span className="text-red-500 ml-1">
                                                        ({log.rowsFailed} failed)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-0.5">Duration</p>
                                            <p className="font-medium text-slate-700">{log.duration}</p>
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
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

