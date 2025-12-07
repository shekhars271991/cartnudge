import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, ArrowLeft, Webhook, ShoppingBag, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebhookConfig } from "@/components/pipelines/configs/WebhookConfig";
import { ShopifyConfig } from "@/components/pipelines/configs/ShopifyConfig";
import { KafkaConfig } from "@/components/pipelines/configs/KafkaConfig";

const steps = [
    { id: 1, title: "Select Source" },
    { id: 2, title: "Configuration" },
    { id: 3, title: "Review & Deploy" },
];

export default function NewPipeline() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [source, setSource] = useState<string | null>(null);

    const nextStep = () => setStep((s) => Math.min(s + 1, steps.length));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const renderSourceSelection = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { id: "webhook", label: "Webhook", icon: Webhook, desc: "Receive JSON events via HTTP POST" },
                { id: "shopify", label: "Shopify", icon: ShoppingBag, desc: "Sync orders and customers", disabled: true },
                { id: "kafka", label: "Kafka", icon: Database, desc: "Stream events from Kafka topics", disabled: true },
            ].map((s) => (
                <Card
                    key={s.id}
                    className={cn(
                        "cursor-pointer transition-all hover:border-blue-600 hover:bg-blue-50",
                        source === s.id ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2" : "",
                        s.disabled ? "opacity-50 cursor-not-allowed hover:border-slate-200 hover:bg-white" : ""
                    )}
                    onClick={() => !s.disabled && setSource(s.id)}
                >
                    <CardHeader>
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white border shadow-sm">
                            <s.icon className="h-6 w-6 text-slate-700" />
                        </div>
                        <CardTitle className="text-lg">{s.label}</CardTitle>
                        <CardDescription>{s.desc}</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );

    const renderConfiguration = () => {
        switch (source) {
            case "webhook":
                return <WebhookConfig />;
            case "shopify":
                return <ShopifyConfig />;
            case "kafka":
                return <KafkaConfig />;
            default:
                return <div>Select a source first</div>;
        }
    };

    const renderReview = () => (
        <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Ready to Deploy</h3>
            <p className="mt-2 text-slate-500 max-w-md mx-auto">
                Your <strong>{source}</strong> pipeline is configured and ready to accept data.
            </p>

            <div className="mt-8 p-4 bg-slate-50 rounded-lg max-w-md mx-auto text-left border">
                <h4 className="font-medium text-sm text-slate-900 mb-2">Summary</h4>
                <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Source</dt>
                        <dd className="font-medium capitalize">{source}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Target</dt>
                        <dd className="font-medium">Raw Data Hub</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Status</dt>
                        <dd className="font-medium text-blue-600">Active upon deploy</dd>
                    </div>
                </dl>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto py-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Create New Pipeline</h1>
                <p className="text-slate-500 mt-2">Set up a new data ingestion flow in 3 simple steps.</p>
            </div>

            {/* Stepper */}
            <div className="mb-10">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10" />
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center bg-white px-4">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                                    step >= s.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                                )}
                            >
                                {s.id}
                            </div>
                            <span
                                className={cn(
                                    "mt-2 text-sm font-medium",
                                    step >= s.id ? "text-slate-900" : "text-slate-400"
                                )}
                            >
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="min-h-[400px]">
                {step === 1 && renderSourceSelection()}
                {step === 2 && renderConfiguration()}
                {step === 3 && renderReview()}
            </div>

            <div className="mt-10 flex justify-between pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={step === 1 ? () => navigate("/integrations") : prevStep}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {step === 1 ? "Cancel" : "Back"}
                </Button>

                {step < 3 ? (
                    <Button onClick={nextStep} disabled={step === 1 && !source}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={() => navigate("/integrations")} className="bg-green-600 hover:bg-green-700">
                        Deploy Pipeline
                    </Button>
                )}
            </div>
        </div>
    );
}
