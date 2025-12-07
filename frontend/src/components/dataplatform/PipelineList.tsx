import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";

const pipelines = [
    {
        id: "pl_1",
        name: "Shopify Orders Stream",
        source: "Shopify",
        target: "Raw Data Hub",
        status: "active",
        version: "v1.2.0",
        lastRun: "2 mins ago",
    },
    {
        id: "pl_2",
        name: "Segment Clickstream",
        source: "Segment",
        target: "Behavioral Hub",
        status: "active",
        version: "v2.0.1",
        lastRun: "Syncing...",
    },
    {
        id: "pl_3",
        name: "Legacy CSV Import",
        source: "CSV Upload",
        target: "Historical Hub",
        status: "inactive",
        version: "v1.0.0",
        lastRun: "3 days ago",
    },
];

export function PipelineList() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pipeline Name</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Target Hub</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pipelines.map((pipeline) => (
                        <TableRow key={pipeline.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                    <GitBranch className="h-4 w-4 text-slate-400" />
                                    <Link to={`/pipelines/${pipeline.id}`} className="hover:underline text-blue-600">
                                        {pipeline.name}
                                    </Link>
                                </div>
                            </TableCell>
                            <TableCell>{pipeline.source}</TableCell>
                            <TableCell>{pipeline.target}</TableCell>
                            <TableCell>
                                {pipeline.status === "active" ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                        Active
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                                        Inactive
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{pipeline.version}</TableCell>
                            <TableCell className="text-slate-500">{pipeline.lastRun}</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
