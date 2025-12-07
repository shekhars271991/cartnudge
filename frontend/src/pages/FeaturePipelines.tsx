import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Search,
    Plus,
    Activity,
    CheckCircle2,
    Layers,
} from "lucide-react";
import { PipelineCard } from "@/components/pipelines/PipelineCard";
import { PipelineConfigDrawer } from "@/components/pipelines/PipelineConfigDrawer";
import {
    PIPELINE_TEMPLATES,
    PIPELINE_CATEGORIES,
    type PipelineTemplate,
    type PipelineCategory,
} from "@/components/pipelines/types";

export default function FeaturePipelines() {
    const [pipelines, setPipelines] = useState<PipelineTemplate[]>(PIPELINE_TEMPLATES);
    const [selectedPipeline, setSelectedPipeline] = useState<PipelineTemplate | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Group pipelines by category
    const groupedPipelines = useMemo(() => {
        const filtered = pipelines.filter(
            (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const grouped: Record<PipelineCategory, PipelineTemplate[]> = {
            behavioral: [],
            transaction: [],
            context: [],
            marketing: [],
            trust: [],
            realtime: [],
        };

        filtered.forEach((p) => {
            grouped[p.category].push(p);
        });

        return grouped;
    }, [pipelines, searchQuery]);

    // Stats
    const activePipelines = pipelines.filter((p) => p.status === "active").length;
    const totalEvents = pipelines
        .filter((p) => p.status === "active")
        .reduce((acc, p) => acc + (p.eventsToday || 0), 0);
    const totalFeatures = pipelines
        .filter((p) => p.status === "active")
        .reduce((acc, p) => acc + p.computedFeatures.filter((f) => f.enabled).length, 0);

    const handleConfigure = (pipeline: PipelineTemplate) => {
        setSelectedPipeline(pipeline);
        setIsDrawerOpen(true);
    };

    const handleSavePipeline = (updatedPipeline: PipelineTemplate) => {
        setPipelines((prev) =>
            prev.map((p) => (p.id === updatedPipeline.id ? updatedPipeline : p))
        );
        setIsDrawerOpen(false);
        setSelectedPipeline(null);
    };

    const categoryOrder: PipelineCategory[] = [
        "behavioral",
        "transaction",
        "context",
        "marketing",
        "trust",
        "realtime",
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Feature Pipelines
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Configure data pipelines to build rich user profiles
                    </p>
                </div>
                <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
                    <Plus className="h-4 w-4" />
                    Custom Pipeline
                </Button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-slate-900">{activePipelines}</p>
                        <p className="text-sm text-slate-500">Active Pipelines</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-slate-900">
                            {totalEvents.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500">Events Today</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Layers className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-slate-900">{totalFeatures}</p>
                        <p className="text-sm text-slate-500">Computed Features</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search pipelines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                />
            </div>

            {/* Pipeline Categories */}
            <div className="space-y-8">
                {categoryOrder.map((category) => {
                    const categoryPipelines = groupedPipelines[category];
                    if (categoryPipelines.length === 0 && searchQuery) return null;

                    const categoryInfo = PIPELINE_CATEGORIES[category];
                    const activeCount = categoryPipelines.filter(
                        (p) => p.status === "active"
                    ).length;

                    return (
                        <div key={category}>
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {categoryInfo.label}
                                        </h2>
                                        {activeCount > 0 && (
                                            <Badge className="badge-success">
                                                {activeCount} active
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {categoryInfo.description}
                                    </p>
                                </div>
                            </div>

                            {/* Pipeline Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryPipelines.map((pipeline) => (
                                    <PipelineCard
                                        key={pipeline.id}
                                        pipeline={pipeline}
                                        onConfigure={handleConfigure}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No Results */}
            {searchQuery &&
                Object.values(groupedPipelines).every((p) => p.length === 0) && (
                    <div className="text-center py-12">
                        <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">
                            No pipelines found matching "{searchQuery}"
                        </p>
                    </div>
                )}

            {/* Config Drawer */}
            <PipelineConfigDrawer
                pipeline={selectedPipeline}
                open={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedPipeline(null);
                }}
                onSave={handleSavePipeline}
            />
        </div>
    );
}
