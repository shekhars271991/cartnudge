import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaField } from "./SchemaBuilder";

export interface UserRecord {
    id: string;
    data: Record<string, string | number | boolean | null>;
    status: "complete" | "partial" | "invalid";
    createdAt: string;
    updatedAt: string;
}

interface UserDirectoryProps {
    schema: SchemaField[];
    users: UserRecord[];
    onUserClick: (user: UserRecord) => void;
    onRefresh?: () => void;
    onExport?: () => void;
}

export function UserDirectory({
    schema,
    users,
    onUserClick,
    onRefresh,
    onExport,
}: UserDirectoryProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Get display columns (first 4 fields + status)
    const displayFields = schema.slice(0, 4);

    // Filter users
    const filteredUsers = users.filter((user) => {
        // Search filter
        const matchesSearch = searchQuery === "" || 
            Object.values(user.data).some((value) =>
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            );

        // Status filter
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const getStatusBadge = (status: UserRecord["status"]) => {
        switch (status) {
            case "complete":
                return (
                    <Badge className="badge-success gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                    </Badge>
                );
            case "partial":
                return (
                    <Badge className="badge-warning gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Partial
                    </Badge>
                );
            case "invalid":
                return (
                    <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Invalid
                    </Badge>
                );
        }
    };

    const formatCellValue = (value: string | number | boolean | null) => {
        if (value === null || value === undefined) {
            return <span className="text-slate-300">—</span>;
        }
        if (typeof value === "boolean") {
            return value ? "Yes" : "No";
        }
        return String(value);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 h-10"
                        />
                    </div>

                    {/* Status Filter */}
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                            setStatusFilter(v);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[150px] h-10">
                            <Filter className="h-4 w-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="invalid">Invalid</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Column Settings */}
                    <Button variant="outline" className="h-10 gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Columns
                    </Button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="h-10 gap-2"
                        onClick={onRefresh}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        className="h-10 gap-2"
                        onClick={onExport}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            {displayFields.map((field) => (
                                <TableHead
                                    key={field.id}
                                    className="font-semibold text-slate-700"
                                >
                                    {field.name}
                                    {field.isPrimaryKey && (
                                        <Badge
                                            variant="outline"
                                            className="ml-2 text-[10px] py-0 px-1"
                                        >
                                            PK
                                        </Badge>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead className="font-semibold text-slate-700 w-[120px]">
                                Status
                            </TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={displayFields.length + 2}
                                    className="h-32 text-center text-slate-500"
                                >
                                    {searchQuery || statusFilter !== "all"
                                        ? "No users match your filters"
                                        : "No users found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="cursor-pointer data-table-row"
                                    onClick={() => onUserClick(user)}
                                >
                                    {displayFields.map((field) => (
                                        <TableCell key={field.id}>
                                            {field.type === "email" ? (
                                                <span className="text-blue-600 font-medium">
                                                    {formatCellValue(user.data[field.name])}
                                                </span>
                                            ) : (
                                                formatCellValue(user.data[field.name])
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing{" "}
                        <span className="font-medium text-slate-900">
                            {(currentPage - 1) * pageSize + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-slate-900">
                            {Math.min(currentPage * pageSize, filteredUsers.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-slate-900">
                            {filteredUsers.length.toLocaleString()}
                        </span>{" "}
                        users
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0",
                                            currentPage === pageNum &&
                                                "bg-slate-900 hover:bg-slate-800"
                                        )}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

