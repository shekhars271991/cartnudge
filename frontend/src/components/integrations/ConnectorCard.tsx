import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Settings2, RefreshCw, AlertCircle } from "lucide-react";

export type SyncStatus = "synced" | "syncing" | "error" | "disconnected";

interface ConnectorCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    status: "connected" | "disconnected"; // Keep for backward compatibility or general connection state
    syncStatus?: SyncStatus;
    lastSync?: string;
    onConfigure: () => void;
}

export function ConnectorCard({
    title,
    description,
    icon: Icon,
    syncStatus = "disconnected",
    lastSync,
    onConfigure,
}: ConnectorCardProps) {
    const getStatusBadge = (s: SyncStatus) => {
        switch (s) {
            case "synced":
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Synced
                    </Badge>
                );
            case "syncing":
                return (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Syncing
                    </Badge>
                );
            case "error":
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
                        <AlertCircle className="mr-1 h-3 w-3" /> Error
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-slate-500">
                        <Circle className="mr-1 h-3 w-3" /> Disconnected
                    </Badge>
                );
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-slate-600" />
                </div>
                {getStatusBadge(syncStatus)}
            </CardHeader>
            <CardContent className="flex-1 pt-4">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
                {lastSync && (
                    <p className="mt-4 text-xs text-slate-400">Last synced: {lastSync}</p>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={onConfigure}>
                    <Settings2 className="mr-2 h-4 w-4" /> Configure
                </Button>
            </CardFooter>
        </Card>
    );
}
