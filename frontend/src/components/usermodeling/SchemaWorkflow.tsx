import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Database, Cpu, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
    id: string;
    label: string;
    icon: React.ElementType;
    status: "pending" | "running" | "completed";
}

interface SchemaWorkflowProps {
    open: boolean;
    onComplete: () => void;
}

export function SchemaWorkflow({ open, onComplete }: SchemaWorkflowProps) {
    const [steps, setSteps] = useState<WorkflowStep[]>([
        { id: "validate", label: "Validating schema", icon: Shield, status: "pending" },
        { id: "update", label: "Updating data model", icon: Database, status: "pending" },
        { id: "index", label: "Rebuilding indexes", icon: Cpu, status: "pending" },
    ]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!open) {
            // Reset state when dialog closes
            setSteps((prev) =>
                prev.map((s) => ({ ...s, status: "pending" }))
            );
            setCurrentStep(0);
            setIsComplete(false);
            return;
        }

        // Start the workflow
        const runWorkflow = async () => {
            for (let i = 0; i < steps.length; i++) {
                // Set current step to running
                setSteps((prev) =>
                    prev.map((s, idx) =>
                        idx === i ? { ...s, status: "running" } : s
                    )
                );
                setCurrentStep(i);

                // Simulate work (random 500-1500ms)
                await new Promise((resolve) =>
                    setTimeout(resolve, 500 + Math.random() * 1000)
                );

                // Mark step as completed
                setSteps((prev) =>
                    prev.map((s, idx) =>
                        idx === i ? { ...s, status: "completed" } : s
                    )
                );
            }

            // All done
            setIsComplete(true);
            setTimeout(() => {
                onComplete();
            }, 1000);
        };

        runWorkflow();
    }, [open]);

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-md" hideClose={true}>
                <DialogHeader>
                    <DialogTitle className="text-center">
                        {isComplete ? "Schema Updated" : "Saving Schema"}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6">
                    {/* Progress indicator */}
                    <div className="relative">
                        {/* Connecting line */}
                        <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-slate-200" />
                        <div
                            className="absolute left-[19px] top-8 w-0.5 bg-emerald-500 transition-all duration-500"
                            style={{
                                height: `${(currentStep / (steps.length - 1)) * 100}%`,
                                maxHeight: isComplete ? "100%" : `${(currentStep / (steps.length - 1)) * 100}%`,
                            }}
                        />

                        {/* Steps */}
                        <div className="space-y-6 relative">
                            {steps.map((step) => {
                                const Icon = step.icon;
                                return (
                                    <div key={step.id} className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                step.status === "completed"
                                                    ? "bg-emerald-100"
                                                    : step.status === "running"
                                                    ? "bg-blue-100"
                                                    : "bg-slate-100"
                                            )}
                                        >
                                            {step.status === "completed" ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            ) : step.status === "running" ? (
                                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                                            ) : (
                                                <Icon className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p
                                                className={cn(
                                                    "font-medium transition-colors",
                                                    step.status === "completed"
                                                        ? "text-emerald-600"
                                                        : step.status === "running"
                                                        ? "text-slate-900"
                                                        : "text-slate-400"
                                                )}
                                            >
                                                {step.label}
                                            </p>
                                            {step.status === "running" && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Processing...
                                                </p>
                                            )}
                                            {step.status === "completed" && (
                                                <p className="text-xs text-emerald-600 mt-0.5">
                                                    Completed
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Completion message */}
                    {isComplete && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                            <p className="text-sm text-emerald-600 font-medium">
                                Schema saved successfully!
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

