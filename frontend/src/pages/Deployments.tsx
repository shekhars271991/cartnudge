import { useState, useEffect, useCallback } from "react";
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
    Calendar,
    Trash2,
    Eye,
    Play,
    History,
    Loader2,
    GitBranch,
    Plus,
    Minus,
    Edit,
    RefreshCw,
    Database,
    Workflow,
    Sparkles,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { EmptyProjectState } from "@/components/EmptyProjectState";
import { deploymentsApi } from "@/lib/api/dataplatform";
import type {
    DeploymentBucket,
    DeploymentItem,
    Deployment,
    DeploymentStatusType,
    ChangeType,
    ComponentType,
    ConflictCheckResponse,
} from "@/lib/api/dataplatform/types";

export default function Deployments() {
    const { selectedProject } = useProject();
    
    // State
    const [bucket, setBucket] = useState<DeploymentBucket | null>(null);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeploying, setIsDeploying] = useState(false);
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
    const [showDeployDialog, setShowDeployDialog] = useState(false);
    const [showHistoryDetail, setShowHistoryDetail] = useState<Deployment | null>(null);
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [conflictCheck, setConflictCheck] = useState<ConflictCheckResponse | null>(null);
    const [deploymentNote, setDeploymentNote] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        if (!selectedProject) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Load active bucket (may be null if no active bucket)
            try {
                const activeBucket = await deploymentsApi.getActiveBucket(selectedProject.id);
                // Only set bucket if it's actually active
                if (activeBucket && activeBucket.status === "active") {
                    setBucket(activeBucket);
                } else {
                    setBucket(null);
                }
            } catch {
                // No active bucket found - this is normal
                setBucket(null);
            }
            
            // Load deployment history
            const historyResponse = await deploymentsApi.listDeployments(selectedProject.id, {
                limit: 20,
            });
            setDeployments(historyResponse.items);
        } catch (err) {
            console.error("Failed to load deployment data:", err);
            setError("Failed to load deployment data");
        } finally {
            setIsLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Show empty state if no project selected
    if (!selectedProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Select or create a project to manage deployments."
            />
        );
    }

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
                    <Button variant="outline" className="mt-4" onClick={loadData}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const removeItem = async (itemId: string) => {
        if (!bucket || !selectedProject) return;
        
        try {
            await deploymentsApi.removeItemFromBucket(
                selectedProject.id,
                bucket.id,
                itemId
            );
            
            // Update local state
            setBucket({
                ...bucket,
                items: bucket.items.filter(i => i.id !== itemId),
                item_count: bucket.item_count - 1,
            });
        } catch (err) {
            console.error("Failed to remove item:", err);
            alert("Failed to remove item from bucket.");
        }
    };

    const handleCheckConflicts = async () => {
        if (!bucket || !selectedProject) return;
        
        setIsCheckingConflicts(true);
        try {
            const result = await deploymentsApi.checkConflicts(
                selectedProject.id,
                bucket.id
            );
            setConflictCheck(result);
            
            if (result.has_conflicts) {
                setShowConflictDialog(true);
            } else {
                setShowDeployDialog(true);
            }
        } catch (err) {
            console.error("Failed to check conflicts:", err);
            alert("Failed to check for conflicts.");
        } finally {
            setIsCheckingConflicts(false);
        }
    };

    const handleDeploy = async () => {
        if (!bucket || !selectedProject) return;
        
        setIsDeploying(true);
        try {
            const result = await deploymentsApi.deploy(
                selectedProject.id,
                bucket.id,
                { dry_run: false }
            );
            
            if (result.success) {
                // Refresh data - bucket will be null after successful deployment
                setBucket(null);
                await loadData();
                setShowDeployDialog(false);
                setDeploymentNote("");
            } else {
                // Check if bucket was already deployed
                if (result.message?.includes("not active")) {
                    // Bucket was already deployed, just refresh
                    setBucket(null);
                    await loadData();
                    setShowDeployDialog(false);
                } else {
                    // Show detailed error info
                    const errorDetails = result.errors?.length > 0 
                        ? result.errors.map((e: { message?: string; component_name?: string }) => 
                            `${e.component_name || 'Unknown'}: ${e.message || 'Unknown error'}`
                          ).join('\n')
                        : '';
                    alert(`Deployment failed: ${result.message}\n\n${errorDetails}`);
                }
            }
        } catch (err: unknown) {
            console.error("Failed to deploy:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
            // Check if it's an axios error with response data
            const axiosError = err as { response?: { data?: { detail?: string } } };
            const detail = axiosError.response?.data?.detail || errorMessage;
            
            // Check if the error is because bucket was already deployed
            if (detail.includes("not active")) {
                setBucket(null);
                await loadData();
                setShowDeployDialog(false);
            } else {
                alert(`Failed to execute deployment: ${detail}`);
            }
        } finally {
            setIsDeploying(false);
        }
    };

    const handleDiscardBucket = async () => {
        if (!bucket || !selectedProject) return;
        
        if (!confirm("Are you sure you want to discard this deployment bucket? All pending changes will be lost.")) {
            return;
        }
        
        try {
            await deploymentsApi.discardBucket(selectedProject.id, bucket.id);
            setBucket(null);
            setShowConflictDialog(false);
        } catch (err) {
            console.error("Failed to discard bucket:", err);
            alert("Failed to discard bucket.");
        }
    };

    const getStatusIcon = (status: DeploymentStatusType) => {
        switch (status) {
            case "success":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "partial":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "rolled_back":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: DeploymentStatusType) => {
        const styles = {
            success: "bg-emerald-100 text-emerald-700",
            failed: "bg-red-100 text-red-700",
            partial: "bg-amber-100 text-amber-700",
            rolled_back: "bg-amber-100 text-amber-700",
        };
        const labels = {
            success: "Deployed",
            failed: "Failed",
            partial: "Partial",
            rolled_back: "Rolled Back",
        };
        return (
            <Badge className={cn("font-medium", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    const getChangeIcon = (type: ChangeType) => {
        switch (type) {
            case "create":
                return <Plus className="h-3.5 w-3.5 text-emerald-500" />;
            case "update":
                return <Edit className="h-3.5 w-3.5 text-blue-500" />;
            case "delete":
                return <Minus className="h-3.5 w-3.5 text-red-500" />;
        }
    };

    const getComponentIcon = (type: ComponentType) => {
        switch (type) {
            case "datablock":
                return <Database className="h-4 w-4" />;
            case "pipeline":
                return <Workflow className="h-4 w-4" />;
            case "feature":
                return <Sparkles className="h-4 w-4" />;
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
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
        ? deployments 
        : deployments.filter((d) => d.status === filterStatus);

    const bucketItems = bucket?.items || [];

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
                <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
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
                                <CardTitle className="text-lg">
                                    {bucket?.name || "Deployment Bucket"}
                                </CardTitle>
                                <CardDescription>
                                    {bucketItems.length} pending change{bucketItems.length !== 1 ? "s" : ""} ready to deploy
                                    {bucket?.has_conflicts && (
                                        <span className="text-red-500 ml-2">
                                            (Has conflicts!)
                                        </span>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {bucket && bucketItems.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleDiscardBucket}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Discard
                                </Button>
                            )}
                            <Button
                                onClick={handleCheckConflicts}
                                disabled={!bucket || bucketItems.length === 0 || isCheckingConflicts}
                                className="gap-2 bg-violet-600 hover:bg-violet-700"
                            >
                                {isCheckingConflicts ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Rocket className="h-4 w-4" />
                                )}
                                Deploy All Changes
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {bucketItems.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg">
                            <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">All caught up!</p>
                            <p className="text-sm text-slate-400 mt-1">
                                No pending changes to deploy. Make changes in Data Modeling, Pipelines, or Feature Store to add items here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bucketItems.map((item: DeploymentItem) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center",
                                        item.change_type === "create" && "bg-emerald-100",
                                        item.change_type === "update" && "bg-blue-100",
                                        item.change_type === "delete" && "bg-red-100"
                                    )}>
                                        {getChangeIcon(item.change_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900">
                                                {item.component_name}
                                            </span>
                                            <Badge variant="outline" className="text-xs gap-1">
                                                {getComponentIcon(item.component_type)}
                                                {item.component_type}
                                            </Badge>
                                            {item.status === "conflict" && (
                                                <Badge className="bg-red-100 text-red-700 text-xs">
                                                    Conflict
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {item.change_summary || `${item.change_type} ${item.component_type}`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-slate-400">
                                            {formatTimeAgo(item.created_at)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(item.id)}
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
                                <SelectItem value="partial">Partial</SelectItem>
                                <SelectItem value="rolled_back">Rolled back</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg">
                            <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">No deployments yet</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Your deployment history will appear here
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Version</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Changes</TableHead>
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
                                                    #{deployment.deployment_id}
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">
                                                    {deployment.items_succeeded}/{deployment.items_total} items
                                                </span>
                                                {deployment.items_failed > 0 && (
                                                    <Badge variant="outline" className="text-red-600 text-xs">
                                                        {deployment.items_failed} failed
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span className="text-sm">
                                                    {formatTimeAgo(deployment.created_at)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="text-sm">
                                                    {deployment.duration_ms ? `${Math.round(deployment.duration_ms / 1000)}s` : '-'}
                                                </span>
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
                    )}
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
                            You are about to deploy {bucketItems.length} change{bucketItems.length !== 1 ? "s" : ""} to production.
                            This action will update your live configurations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {conflictCheck && !conflictCheck.has_conflicts && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-emerald-800">No conflicts detected</p>
                                        <p className="text-emerald-700 mt-0.5">
                                            Safe to deploy. Current version: #{conflictCheck.current_deployment_id}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {bucketItems.map((item: DeploymentItem) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                                >
                                    {getChangeIcon(item.change_type)}
                                    <span className="font-medium">{item.component_name}</span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500">
                                        {item.change_summary || `${item.change_type} ${item.component_type}`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                Deployment Note (optional)
                            </label>
                            <Input
                                placeholder="e.g., Adding new user tracking features"
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

            {/* Conflict Dialog */}
            <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Deployment Conflicts Detected
                        </DialogTitle>
                        <DialogDescription>
                            Other changes have been deployed since you started. You must discard your bucket and recreate your changes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-red-800">
                                <strong>Current deployment:</strong> #{conflictCheck?.current_deployment_id}
                                <br />
                                <strong>Your bucket base:</strong> #{conflictCheck?.bucket_base_deployment_id || 0}
                            </p>
                        </div>

                        {conflictCheck?.conflicts && conflictCheck.conflicts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">Conflicting items:</p>
                                {conflictCheck.conflicts.map((conflict, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm"
                                    >
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <span className="text-red-700">{conflict.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowConflictDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDiscardBucket}
                            className="gap-2 bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            Discard & Start Fresh
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
                                    Deployment #{showHistoryDetail.deployment_id}
                                </DialogTitle>
                                <DialogDescription>
                                    Deployed on {new Date(showHistoryDetail.created_at).toLocaleDateString()} at{" "}
                                    {new Date(showHistoryDetail.created_at).toLocaleTimeString()}
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
                                        <p className="text-xs text-slate-500 mb-1">Duration</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-medium">
                                                {showHistoryDetail.duration_ms ? `${Math.round(showHistoryDetail.duration_ms / 1000)}s` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">
                                        Summary
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Total Items</span>
                                            <span className="font-medium">{showHistoryDetail.items_total}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Succeeded</span>
                                            <span className="font-medium text-emerald-600">{showHistoryDetail.items_succeeded}</span>
                                        </div>
                                        {showHistoryDetail.items_failed > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Failed</span>
                                                <span className="font-medium text-red-600">{showHistoryDetail.items_failed}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {showHistoryDetail.deployed_datablocks.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <Database className="h-4 w-4" />
                                            Datablocks ({showHistoryDetail.deployed_datablocks.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {showHistoryDetail.deployed_datablocks.map((id) => (
                                                <Badge key={id} variant="outline" className="text-xs">
                                                    {id.slice(0, 8)}...
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {showHistoryDetail.deployed_pipelines.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <Workflow className="h-4 w-4" />
                                            Pipelines ({showHistoryDetail.deployed_pipelines.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {showHistoryDetail.deployed_pipelines.map((id) => (
                                                <Badge key={id} variant="outline" className="text-xs">
                                                    {id.slice(0, 8)}...
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {showHistoryDetail.deployed_features.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            Features ({showHistoryDetail.deployed_features.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {showHistoryDetail.deployed_features.map((id) => (
                                                <Badge key={id} variant="outline" className="text-xs">
                                                    {id.slice(0, 8)}...
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {showHistoryDetail.errors.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-red-700 mb-2">
                                            Errors ({showHistoryDetail.errors.length})
                                        </p>
                                        <div className="space-y-2">
                                            {showHistoryDetail.errors.map((error, index) => (
                                                <div
                                                    key={index}
                                                    className="p-2 bg-red-50 rounded text-sm text-red-700"
                                                >
                                                    <span className="font-medium">{error.component_name}: </span>
                                                    {error.message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowHistoryDetail(null)}
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
