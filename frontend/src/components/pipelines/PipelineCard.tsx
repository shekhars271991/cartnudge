import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Search,
    ShoppingCart,
    Monitor,
    Receipt,
    Tag,
    CreditCard,
    Package,
    Truck,
    Clock,
    Megaphone,
    Shield,
    Bell,
    Zap,
    Settings,
    CheckCircle2,
    Circle,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineTemplate } from "./types";

const iconMap: Record<string, React.ElementType> = {
    Search,
    ShoppingCart,
    Monitor,
    Receipt,
    Tag,
    CreditCard,
    Package,
    Truck,
    Clock,
    Megaphone,
    Shield,
    Bell,
    Zap,
};

interface PipelineCardProps {
    pipeline: PipelineTemplate;
    onConfigure: (pipeline: PipelineTemplate) => void;
}

export function PipelineCard({ pipeline, onConfigure }: PipelineCardProps) {
    const Icon = iconMap[pipeline.icon] || Circle;
    const isActive = pipeline.status === "active";
    const enabledEvents = pipeline.events.filter((e) => e.enabled).length;
    const enabledFeatures = pipeline.computedFeatures.filter((f) => f.enabled).length;

    return (
        <div
            className={cn(
                "group relative bg-white rounded-xl border p-5 transition-all card-hover",
                isActive
                    ? "border-emerald-200 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
            )}
        >
            {/* Status indicator */}
            {isActive && (
                <div className="absolute top-4 right-4">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                </div>
            )}

            {/* Icon and Title */}
            <div className="flex items-start gap-4 mb-4">
                <div
                    className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                        isActive
                            ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100"
                            : "bg-slate-100 border border-slate-200"
                    )}
                >
                    <Icon
                        className={cn(
                            "h-6 w-6",
                            isActive ? "text-emerald-600" : "text-slate-500"
                        )}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1">
                        {pipeline.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2">
                        {pipeline.description}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">
                        {enabledEvents} event{enabledEvents !== 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">
                        {enabledFeatures} feature{enabledFeatures !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* Active Pipeline Stats */}
            {isActive && pipeline.eventsToday !== undefined && (
                <div className="bg-emerald-50/50 rounded-lg p-3 mb-4 border border-emerald-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-700">Events today</span>
                        <span className="font-semibold text-emerald-800">
                            {pipeline.eventsToday.toLocaleString()}
                        </span>
                    </div>
                    {pipeline.lastEventAt && (
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-emerald-600">Last event</span>
                            <span className="text-emerald-700">{pipeline.lastEventAt}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Badge & Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Badge
                    variant="secondary"
                    className={cn(
                        "font-medium",
                        isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                    )}
                >
                    {isActive ? "Active" : "Not configured"}
                </Badge>
                <Button
                    variant={isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => onConfigure(pipeline)}
                    className={cn(
                        "gap-1.5",
                        !isActive && "bg-slate-900 hover:bg-slate-800"
                    )}
                >
                    <Settings className="h-3.5 w-3.5" />
                    {isActive ? "Manage" : "Configure"}
                </Button>
            </div>
        </div>
    );
}

