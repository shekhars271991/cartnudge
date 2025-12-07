import { useState } from "react";
import { WorkflowTable } from "../components/workflows/WorkflowTable";
import { WorkflowBuilder } from "../components/workflows/WorkflowBuilder";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";

export default function Workflows() {
    const [isCreating, setIsCreating] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nudge Workflows</h1>
                    <p className="text-slate-500">Define the rules of engagement for your AI predictions.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    {isCreating ? (
                        <>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" /> New Workflow
                        </>
                    )}
                </Button>
            </div>

            {isCreating ? (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <h2 className="text-lg font-semibold mb-4">Workflow Logic Builder</h2>
                        <WorkflowBuilder />
                    </div>
                </div>
            ) : (
                <WorkflowTable />
            )}
        </div>
    );
}
