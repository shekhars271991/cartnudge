import { Users, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
    label: string;
    value: string | number;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
}

interface OverviewStatsProps {
    totalUsers: number;
    lastSyncTime: string;
    dataQualityScore: number;
    incompleteProfiles: number;
}

export function OverviewStats({
    totalUsers,
    lastSyncTime,
    dataQualityScore,
    incompleteProfiles,
}: OverviewStatsProps) {
    const stats: Stat[] = [
        {
            label: "Total Users",
            value: totalUsers.toLocaleString(),
            icon: Users,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-100",
        },
        {
            label: "Last Sync",
            value: lastSyncTime,
            icon: Clock,
            iconColor: "text-slate-600",
            iconBg: "bg-slate-100",
        },
        {
            label: "Data Quality",
            value: `${dataQualityScore}%`,
            change: dataQualityScore >= 90 ? "Excellent" : dataQualityScore >= 70 ? "Good" : "Needs attention",
            changeType: dataQualityScore >= 90 ? "positive" : dataQualityScore >= 70 ? "neutral" : "negative",
            icon: CheckCircle,
            iconColor: dataQualityScore >= 70 ? "text-emerald-600" : "text-amber-600",
            iconBg: dataQualityScore >= 70 ? "bg-emerald-100" : "bg-amber-100",
        },
        {
            label: "Incomplete Profiles",
            value: incompleteProfiles.toLocaleString(),
            icon: AlertTriangle,
            iconColor: incompleteProfiles > 0 ? "text-amber-600" : "text-emerald-600",
            iconBg: incompleteProfiles > 0 ? "bg-amber-100" : "bg-emerald-100",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white rounded-xl border border-slate-200 p-5 card-hover"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-semibold text-slate-900 mt-1">
                                {stat.value}
                            </p>
                            {stat.change && (
                                <p
                                    className={cn(
                                        "text-xs font-medium mt-1",
                                        stat.changeType === "positive" && "text-emerald-600",
                                        stat.changeType === "negative" && "text-red-600",
                                        stat.changeType === "neutral" && "text-slate-500"
                                    )}
                                >
                                    {stat.change}
                                </p>
                            )}
                        </div>
                        <div
                            className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                stat.iconBg
                            )}
                        >
                            <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

