import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Rocket,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Package,
    User,
    Calendar,
    ChevronRight,
    Trash2,
    Eye,
    Play,
    History,
    Shield,
    Loader2,
    GitBranch,
    Plus,
    Minus,
    Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface DeploymentChange {
    id: string;
    type: "create" | "update" | "delete";
    resourceType: "pipeline" | "event" | "field";
    resourceName: string;
    pipelineName: string;
    description: string;
    addedAt: Date;
    addedBy: string;
}

interface Deployment {
    id: string;
    version: string;
    status: "success" | "failed" | "in_progress" | "rolled_back";
    deployedAt: Date;
    deployedBy: string;
    changes: DeploymentChange[];
    duration: number; // in seconds
    environment: "production" | "staging";
}

// Sample data
const pendingChanges: DeploymentChange[] = [
    {
        id: "chg_1",
        type: "create",
        resourceType: "pipeline",
        resourceName: "Cart Events",
        pipelineName: "Cart Events",
        description: "New pipeline created with 3 event types",
        addedAt: new Date(Date.now() - 1000 * 60 * 30),
        addedBy: "john@company.com",
    },
    {
        id: "chg_2",
        type: "update",
        resourceType: "event",
        resourceName: "add_to_cart",
        pipelineName: "Cart Events",
        description: "Added 2 new fields: discount_code, cart_value",
        addedAt: new Date(Date.now() - 1000 * 60 * 20),
        addedBy: "john@company.com",
    },
    {
        id: "chg_3",
        type: "create",
        resourceType: "event",
        resourceName: "checkout_started",
        pipelineName: "Cart Events",
        description: "New event type with 5 fields",
        addedAt: new Date(Date.now() - 1000 * 60 * 15),
        addedBy: "sarah@company.com",
    },
    {
        id: "chg_4",
        type: "update",
        resourceType: "field",
        resourceName: "price → sale_price",
        pipelineName: "Browsing Events",
        description: "Renamed field from price to sale_price",
        addedAt: new Date(Date.now() - 1000 * 60 * 5),
        addedBy: "john@company.com",
    },
];

const deploymentHistory: Deployment[] = [
    {
        id: "dep_5",
        version: "v1.4.0",
        status: "success",
        deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        deployedBy: "sarah@company.com",
        changes: [
            {
                id: "chg_10",
                type: "update",
                resourceType: "pipeline",
                resourceName: "Browsing Events",
                pipelineName: "Browsing Events",
                description: "Updated 3 event types",
                addedAt: new Date(),
                addedBy: "sarah@company.com",
            },
        ],
        duration: 45,
        environment: "production",
    },
    {
        id: "dep_4",
        version: "v1.3.0",
        status: "success",
        deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        deployedBy: "john@company.com",
        changes: [
            {
                id: "chg_9",
                type: "create",
                resourceType: "pipeline",
                resourceName: "Transaction Events",
                pipelineName: "Transaction Events",
                description: "New pipeline for transaction tracking",
                addedAt: new Date(),
                addedBy: "john@company.com",
            },
            {
                id: "chg_8",
                type: "create",
                resourceType: "event",
                resourceName: "purchase_completed",
                pipelineName: "Transaction Events",
                description: "New event type",
                addedAt: new Date(),
                addedBy: "john@company.com",
            },
        ],
        duration: 62,
        environment: "production",
    },
    {
        id: "dep_3",
        version: "v1.2.1",
        status: "rolled_back",
        deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        deployedBy: "mike@company.com",
        changes: [
            {
                id: "chg_7",
                type: "delete",
                resourceType: "field",
                resourceName: "legacy_user_id",
                pipelineName: "Browsing Events",
                description: "Removed deprecated field",
                addedAt: new Date(),
                addedBy: "mike@company.com",
            },
        ],
        duration: 38,
        environment: "production",
    },
    {
        id: "dep_2",
        version: "v1.2.0",
        status: "success",
        deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        deployedBy: "sarah@company.com",
        changes: [
            {
                id: "chg_6",
                type: "update",
                resourceType: "event",
                resourceName: "page_view",
                pipelineName: "Browsing Events",
                description: "Added referrer field",
                addedAt: new Date(),
                addedBy: "sarah@company.com",
            },
        ],
        duration: 41,
        environment: "production",
    },
    {
        id: "dep_1",
        version: "v1.1.0",
        status: "success",
        deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 168),
        deployedBy: "john@company.com",
        changes: [
            {
                id: "chg_5",
                type: "create",
                resourceType: "pipeline",
                resourceName: "Browsing Events",
                pipelineName: "Browsing Events",
                description: "Initial pipeline setup",
                addedAt: new Date(),
                addedBy: "john@company.com",
            },
        ],
        duration: 55,
        environment: "production",
    },
];

export default function Deployments() {
    const [changes, setChanges] = useState(pendingChanges);
    const [history] = useState(deploymentHistory);
    const [isDeploying, setIsDeploying] = useState(false);
    const [showDeployDialog, setShowDeployDialog] = useState(false);
    const [showHistoryDetail, setShowHistoryDetail] = useState<Deployment | null>(null);
    const [deploymentNote, setDeploymentNote] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const removeChange = (changeId: string) => {
        setChanges((prev) => prev.filter((c) => c.id !== changeId));
    };

    const handleDeploy = async () => {
        setIsDeploying(true);
        // Simulate deployment
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setIsDeploying(false);
        setShowDeployDialog(false);
        setChanges([]);
        setDeploymentNote("");
    };

    const getStatusIcon = (status: Deployment["status"]) => {
        switch (status) {
            case "success":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "in_progress":
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case "rolled_back":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        }
    };

    const getStatusBadge = (status: Deployment["status"]) => {
        const styles = {
            success: "bg-emerald-100 text-emerald-700",
            failed: "bg-red-100 text-red-700",
            in_progress: "bg-blue-100 text-blue-700",
            rolled_back: "bg-amber-100 text-amber-700",
        };
        const labels = {
            success: "Deployed",
            failed: "Failed",
            in_progress: "Deploying",
            rolled_back: "Rolled Back",
        };
        return (
            <Badge className={cn("font-medium", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    const getChangeIcon = (type: DeploymentChange["type"]) => {
        switch (type) {
            case "create":
                return <Plus className="h-3.5 w-3.5 text-emerald-500" />;
            case "update":
                return <Edit className="h-3.5 w-3.5 text-blue-500" />;
            case "delete":
                return <Minus className="h-3.5 w-3.5 text-red-500" />;
        }
    };

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const filteredHistory = filterStatus === "all" 
        ? history 
        : history.filter((d) => d.status === filterStatus);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Deployments</h1>
                    <p className="text-slate-500 mt-1">
                        Review pending changes and deploy to production
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                        <Shield className="h-3.5 w-3.5" />
                        Admin Access
                    </Badge>
                </div>
            </div>

            {/* Deployment Bucket */}
            <Card className="mb-8 border-2 border-dashed border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center">
                                <Package className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Deployment Bucket</CardTitle>
                                <CardDescription>
                                    {changes.length} pending change{changes.length !== 1 ? "s" : ""} ready to deploy
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowDeployDialog(true)}
                            disabled={changes.length === 0}
                            className="gap-2 bg-violet-600 hover:bg-violet-700"
                        >
                            <Rocket className="h-4 w-4" />
                            Deploy All Changes
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {changes.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg">
                            <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">All caught up!</p>
                            <p className="text-sm text-slate-400 mt-1">
                                No pending changes to deploy
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {changes.map((change) => (
                                <div
                                    key={change.id}
                                    className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center",
                                        change.type === "create" && "bg-emerald-100",
                                        change.type === "update" && "bg-blue-100",
                                        change.type === "delete" && "bg-red-100"
                                    )}>
                                        {getChangeIcon(change.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900">
                                                {change.resourceName}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {change.resourceType}
                                            </Badge>
                                            <ChevronRight className="h-3 w-3 text-slate-300" />
                                            <span className="text-sm text-slate-500">
                                                {change.pipelineName}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {change.description}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-slate-400">
                                            {formatTimeAgo(change.addedAt)}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            by {change.addedBy.split("@")[0]}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeChange(change.id)}
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Deployment History */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <History className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Deployment History</CardTitle>
                                <CardDescription>
                                    Track all past deployments and their status
                                </CardDescription>
                            </div>
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All deployments</SelectItem>
                                <SelectItem value="success">Deployed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="rolled_back">Rolled back</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Version</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Changes</TableHead>
                                <TableHead>Deployed By</TableHead>
                                <TableHead>When</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.map((deployment) => (
                                <TableRow key={deployment.id} className="cursor-pointer hover:bg-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="h-4 w-4 text-slate-400" />
                                            <code className="text-sm font-mono font-medium">
                                                {deployment.version}
                                            </code>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(deployment.status)}
                                            {getStatusBadge(deployment.status)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-slate-600">
                                            {deployment.changes.length} change{deployment.changes.length !== 1 ? "s" : ""}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                            <span className="text-sm text-slate-600">
                                                {deployment.deployedBy.split("@")[0]}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="text-sm">
                                                {formatTimeAgo(deployment.deployedAt)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-sm">{deployment.duration}s</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowHistoryDetail(deployment)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Deploy Confirmation Dialog */}
            <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-violet-600" />
                            Deploy to Production
                        </DialogTitle>
                        <DialogDescription>
                            You are about to deploy {changes.length} change{changes.length !== 1 ? "s" : ""} to production.
                            This action will update your live pipeline configurations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-800">Production deployment</p>
                                    <p className="text-amber-700 mt-0.5">
                                        These changes will affect live data collection immediately.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {changes.map((change) => (
                                <div
                                    key={change.id}
                                    className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                                >
                                    {getChangeIcon(change.type)}
                                    <span className="font-medium">{change.resourceName}</span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500">{change.description}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                Deployment Note (optional)
                            </label>
                            <Input
                                placeholder="e.g., Adding cart tracking for Q4 campaign"
                                value={deploymentNote}
                                onChange={(e) => setDeploymentNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeployDialog(false)}
                            disabled={isDeploying}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeploy}
                            disabled={isDeploying}
                            className="gap-2 bg-violet-600 hover:bg-violet-700"
                        >
                            {isDeploying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deploying...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    Deploy Now
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deployment Detail Dialog */}
            <Dialog open={!!showHistoryDetail} onOpenChange={() => setShowHistoryDetail(null)}>
                <DialogContent className="sm:max-w-lg">
                    {showHistoryDetail && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <GitBranch className="h-5 w-5 text-slate-500" />
                                    Deployment {showHistoryDetail.version}
                                </DialogTitle>
                                <DialogDescription>
                                    Deployed on {showHistoryDetail.deployedAt.toLocaleDateString()} at{" "}
                                    {showHistoryDetail.deployedAt.toLocaleTimeString()}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(showHistoryDetail.status)}
                                            {getStatusBadge(showHistoryDetail.status)}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 mb-1">Deployed By</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center">
                                                <User className="h-3 w-3 text-slate-500" />
                                            </div>
                                            <span className="text-sm font-medium">
                                                {showHistoryDetail.deployedBy}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">
                                        Changes ({showHistoryDetail.changes.length})
                                    </p>
                                    <div className="space-y-2">
                                        {showHistoryDetail.changes.map((change) => (
                                            <div
                                                key={change.id}
                                                className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                                            >
                                                {getChangeIcon(change.type)}
                                                <span className="font-medium">{change.resourceName}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {change.resourceType}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowHistoryDetail(null)}
                                >
                                    Close
                                </Button>
                                {showHistoryDetail.status === "success" && (
                                    <Button
                                        variant="outline"
                                        className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        Rollback
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

