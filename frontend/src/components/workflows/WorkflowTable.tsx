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
import { Edit2, Play, Pause } from "lucide-react";

const workflows = [
    {
        id: 1,
        name: "Whale Retention",
        trigger: "LTV > $500",
        action: "VIP Email",
        status: "active",
        conversions: 124,
    },
    {
        id: 2,
        name: "Cart Abandonment Defense",
        trigger: "Exit Intent & Cart > $50",
        action: "10% Discount Popup",
        status: "active",
        conversions: 892,
    },
    {
        id: 3,
        name: "Churn Prevention",
        trigger: "Churn Risk > 80%",
        action: "Re-engagement SMS",
        status: "paused",
        conversions: 45,
    },
];

export function WorkflowTable() {
    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Strategy Name</TableHead>
                        <TableHead>Trigger Logic</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workflows.map((workflow) => (
                        <TableRow key={workflow.id}>
                            <TableCell className="font-medium">{workflow.name}</TableCell>
                            <TableCell>{workflow.trigger}</TableCell>
                            <TableCell>{workflow.action}</TableCell>
                            <TableCell>
                                {workflow.status === "active" ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                                ) : (
                                    <Badge variant="secondary">Paused</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">{workflow.conversions}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon">
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                    {workflow.status === "active" ? (
                                        <Pause className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <Play className="h-4 w-4 text-green-600" />
                                    )}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
