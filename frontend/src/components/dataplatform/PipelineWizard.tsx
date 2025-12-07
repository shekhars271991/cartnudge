import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ShoppingBag, Database, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
    { id: 1, title: "Source" },
    { id: 2, title: "Configuration" },
    { id: 3, title: "Schema" },
    { id: 4, title: "Target" },
    { id: 5, title: "Review" },
];

export function PipelineWizard({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [source, setSource] = useState("");

    const nextStep = () => setStep((s) => Math.min(s + 1, steps.length));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {["Shopify", "Segment", "CSV Upload"].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "cursor-pointer rounded-lg border-2 p-4 hover:border-blue-600 hover:bg-blue-50 transition-all",
                                    source === s ? "border-blue-600 bg-blue-50" : "border-slate-200"
                                )}
                                onClick={() => setSource(s)}
                            >
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                                    {s === "Shopify" && <ShoppingBag className="h-6 w-6 text-green-600" />}
                                    {s === "Segment" && <Database className="h-6 w-6 text-blue-600" />}
                                    {s === "CSV Upload" && <FileText className="h-6 w-6 text-slate-600" />}
                                </div>
                                <div className="font-medium text-slate-900">{s}</div>
                            </div>
                        ))}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Pipeline Name</Label>
                            <Input placeholder="e.g. North America Orders" />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input type="password" placeholder="sk_live_..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Store URL</Label>
                            <Input placeholder="https://..." />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="py-4 text-center text-slate-500">
                        <p>Schema mapping UI would go here (reusing ConfigDrawer logic).</p>
                        <div className="mt-4 border rounded-md p-4 bg-slate-50">
                            <div className="flex justify-between text-sm mb-2">
                                <span>source.id</span>
                                <ArrowRight className="h-4 w-4" />
                                <span>target.user_id</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>source.email</span>
                                <ArrowRight className="h-4 w-4" />
                                <span>target.email</span>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Target Data Hub</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a hub" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="raw">Raw Data Hub</SelectItem>
                                    <SelectItem value="behavioral">Behavioral Hub</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Ready to Deploy</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Pipeline "North America Orders" configured successfully.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create New Pipeline</DialogTitle>
                    <DialogDescription>
                        Step {step} of {steps.length}: {steps[step - 1].title}
                    </DialogDescription>
                </DialogHeader>

                {/* Stepper Indicator */}
                <div className="flex items-center space-x-2 py-2">
                    {steps.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                "h-2 flex-1 rounded-full transition-all",
                                s.id <= step ? "bg-blue-600" : "bg-slate-200"
                            )}
                        />
                    ))}
                </div>

                {renderStepContent()}

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={step === 1}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    {step < steps.length ? (
                        <Button onClick={nextStep}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={() => setOpen(false)} className="bg-green-600 hover:bg-green-700">
                            Deploy Pipeline
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
