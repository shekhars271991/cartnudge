import { Card, Title, AreaChart, BarChart, DonutChart } from "@tremor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    TrendingUp,
    TrendingDown,
    Users,
    Zap,
    DollarSign,
    Target,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowRight,
    AlertTriangle,
    Rocket,
    Settings,
    Database,
    Brain,
    Mail,
    MessageSquare,
    Smartphone,
    Activity,
    Server,
    Wifi,
    RefreshCw,
    ShoppingCart,
    UserX,
    Gift,
    ChevronRight,
    Sparkles,
    BarChart3,
    PieChart,
    Layers,
} from "lucide-react";
import { Link } from "react-router-dom";

// KPI Data
const platformKPIs = [
    {
        title: "Total Users Tracked",
        value: "124,847",
        change: "+12.3%",
        trend: "up",
        icon: Users,
        color: "blue",
    },
    {
        title: "Predictions Served (24h)",
        value: "45,230",
        change: "+8.7%",
        trend: "up",
        icon: Brain,
        color: "violet",
    },
    {
        title: "Nudges Delivered (24h)",
        value: "12,456",
        change: "+15.2%",
        trend: "up",
        icon: Zap,
        color: "amber",
    },
    {
        title: "Revenue Attributed",
        value: "$89,420",
        change: "+23.1%",
        trend: "up",
        icon: DollarSign,
        color: "emerald",
    },
];

// Action Items
const actionItems = [
    {
        id: 1,
        type: "warning",
        title: "3 pending deployments",
        description: "Schema changes and 2 pipeline configs awaiting deployment",
        action: "Review & Deploy",
        link: "/deployments",
        priority: "high",
    },
    {
        id: 2,
        type: "info",
        title: "Complete Cart Events pipeline",
        description: "Cart Events pipeline needs field configuration",
        action: "Configure",
        link: "/feature-pipelines",
        priority: "medium",
    },
    {
        id: 3,
        type: "success",
        title: "Purchase Probability model ready",
        description: "Training completed, model available for deployment",
        action: "Deploy Model",
        link: "/models",
        priority: "medium",
    },
    {
        id: 4,
        type: "warning",
        title: "WhatsApp channel errors",
        description: "12% delivery failure rate in the last 24 hours",
        action: "View Logs",
        link: "/channels",
        priority: "high",
    },
];

// Conversion chart data
const conversionData = [
    { date: "Dec 1", Treatment: 3.2, Control: 2.4 },
    { date: "Dec 2", Treatment: 3.5, Control: 2.5 },
    { date: "Dec 3", Treatment: 3.8, Control: 2.4 },
    { date: "Dec 4", Treatment: 4.1, Control: 2.6 },
    { date: "Dec 5", Treatment: 3.9, Control: 2.5 },
    { date: "Dec 6", Treatment: 4.3, Control: 2.7 },
    { date: "Dec 7", Treatment: 4.5, Control: 2.6 },
];

// Channel performance
const channelPerformance = [
    { channel: "Email", sent: 12450, delivered: 12123, converted: 892, rate: 7.4 },
    { channel: "WhatsApp", sent: 4532, delivered: 4389, converted: 456, rate: 10.4 },
    { channel: "SMS", sent: 2341, delivered: 2298, converted: 187, rate: 8.1 },
    { channel: "Push", sent: 8921, delivered: 8654, converted: 523, rate: 6.0 },
];

// Workflow performance
const workflowPerformance = [
    { name: "Cart Abandonment", impressions: 4567, conversions: 892, rate: 19.5 },
    { name: "Churn Prevention", impressions: 1890, conversions: 234, rate: 12.4 },
    { name: "Welcome Series", impressions: 3200, conversions: 1456, rate: 45.5 },
    { name: "Win Back", impressions: 2100, conversions: 189, rate: 9.0 },
];

// Segment lift data
const segmentLiftData = [
    { name: "High Value Carts", "Lift %": 25.6 },
    { name: "Returning Visitors", "Lift %": 22.1 },
    { name: "Mobile Users", "Lift %": 18.2 },
    { name: "Desktop Users", "Lift %": 10.5 },
    { name: "New Visitors", "Lift %": 8.4 },
];

// Nudge type distribution
const nudgeTypeData = [
    { name: "Discount Offer", value: 35 },
    { name: "Urgency Message", value: 28 },
    { name: "Social Proof", value: 18 },
    { name: "Free Shipping", value: 12 },
    { name: "Personalized", value: 7 },
];

// System status
const systemStatus = [
    { name: "Data Ingestion", status: "healthy", latency: "45ms", uptime: "99.9%" },
    { name: "Feature Pipelines", status: "healthy", latency: "120ms", uptime: "99.8%" },
    { name: "ML Inference", status: "healthy", latency: "85ms", uptime: "99.7%" },
    { name: "Channel Delivery", status: "degraded", latency: "230ms", uptime: "98.2%" },
    { name: "Webhook API", status: "healthy", latency: "32ms", uptime: "99.9%" },
];

// Recent activity
const recentActivity = [
    { time: "2 min ago", event: "Workflow triggered", detail: "Cart Abandonment - High Value", icon: Zap },
    { time: "5 min ago", event: "Model prediction", detail: "12,450 users scored", icon: Brain },
    { time: "12 min ago", event: "Email batch sent", detail: "2,340 emails delivered", icon: Mail },
    { time: "18 min ago", event: "Data sync completed", detail: "User profiles updated", icon: RefreshCw },
    { time: "25 min ago", event: "WhatsApp campaign", detail: "450 messages sent", icon: MessageSquare },
];

export default function Dashboard() {
    const dataFormatter = (number: number) => `${number.toFixed(1)}%`;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "degraded":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "down":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "healthy":
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Healthy</Badge>;
            case "degraded":
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Degraded</Badge>;
            case "down":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Down</Badge>;
            default:
                return <Badge variant="secondary">Unknown</Badge>;
        }
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case "warning":
                return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case "info":
                return <AlertCircle className="h-5 w-5 text-blue-500" />;
            case "success":
                return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            default:
                return <Clock className="h-5 w-5 text-slate-400" />;
        }
    };

    const getWorkflowIcon = (name: string) => {
        if (name.includes("Cart")) return ShoppingCart;
        if (name.includes("Churn")) return UserX;
        if (name.includes("Welcome")) return Sparkles;
        if (name.includes("Win")) return Gift;
        return Zap;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Platform overview and performance metrics</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span>Live</span>
                    <span className="text-slate-300">•</span>
                    <span>Last updated: Just now</span>
                </div>
            </div>

            {/* Action Items */}
            <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">Action Items</h2>
                            <p className="text-xs text-slate-500">{actionItems.length} items need attention</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    {actionItems.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                item.priority === "high" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {getActionIcon(item.type)}
                                <div>
                                    <p className="font-medium text-sm text-slate-900">{item.title}</p>
                                    <p className="text-xs text-slate-500">{item.description}</p>
                                </div>
                            </div>
                            <Link to={item.link}>
                                <Button size="sm" variant={item.priority === "high" ? "default" : "outline"} className="h-8">
                                    {item.action}
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform KPIs */}
            <div className="grid grid-cols-4 gap-4">
                {platformKPIs.map((kpi) => {
                    const Icon = kpi.icon;
                    const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
                        blue: { bg: "bg-blue-100", text: "text-blue-600", icon: "text-blue-600" },
                        violet: { bg: "bg-violet-100", text: "text-violet-600", icon: "text-violet-600" },
                        amber: { bg: "bg-amber-100", text: "text-amber-600", icon: "text-amber-600" },
                        emerald: { bg: "bg-emerald-100", text: "text-emerald-600", icon: "text-emerald-600" },
                    };
                    const colors = colorClasses[kpi.color];
                    return (
                        <div key={kpi.title} className="bg-white rounded-xl border p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg)}>
                                    <Icon className={cn("h-5 w-5", colors.icon)} />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 text-sm font-medium",
                                    kpi.trend === "up" ? "text-emerald-600" : "text-red-600"
                                )}>
                                    {kpi.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {kpi.change}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                            <p className="text-sm text-slate-500 mt-1">{kpi.title}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Conversion Chart */}
                <Card className="p-0">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <Title>Conversion Rate: Treatment vs Control</Title>
                                <p className="text-sm text-slate-500 mt-1">7-day comparison</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">+1.9% lift</Badge>
                        </div>
                    </div>
                    <div className="p-4">
                        <AreaChart
                            className="h-64"
                            data={conversionData}
                            index="date"
                            categories={["Treatment", "Control"]}
                            colors={["blue", "slate"]}
                            valueFormatter={dataFormatter}
                            showAnimation
                        />
                    </div>
                </Card>

                {/* Segment Lift */}
                <Card className="p-0">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <Title>Conversion Lift by Segment</Title>
                                <p className="text-sm text-slate-500 mt-1">A/B test results</p>
                            </div>
                            <Badge variant="outline">Last 30 days</Badge>
                        </div>
                    </div>
                    <div className="p-4">
                        <BarChart
                            className="h-64"
                            data={segmentLiftData}
                            index="name"
                            categories={["Lift %"]}
                            colors={["blue"]}
                            valueFormatter={dataFormatter}
                            showAnimation
                        />
                    </div>
                </Card>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* Channel Performance */}
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-violet-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Channel Performance</h3>
                            <p className="text-xs text-slate-500">Last 24 hours</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {channelPerformance.map((channel) => (
                            <div key={channel.channel} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {channel.channel === "Email" && <Mail className="h-4 w-4 text-violet-500" />}
                                    {channel.channel === "WhatsApp" && <MessageSquare className="h-4 w-4 text-green-500" />}
                                    {channel.channel === "SMS" && <Smartphone className="h-4 w-4 text-blue-500" />}
                                    {channel.channel === "Push" && <Zap className="h-4 w-4 text-amber-500" />}
                                    <span className="text-sm font-medium">{channel.channel}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-emerald-600">{channel.rate}%</p>
                                    <p className="text-xs text-slate-500">{channel.converted.toLocaleString()} conv.</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link to="/channels">
                        <Button variant="ghost" className="w-full mt-4 text-sm" size="sm">
                            View All Channels
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Workflow Performance */}
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Workflow Performance</h3>
                            <p className="text-xs text-slate-500">Active workflows</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {workflowPerformance.map((workflow) => {
                            const WorkflowIcon = getWorkflowIcon(workflow.name);
                            return (
                                <div key={workflow.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <WorkflowIcon className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium truncate max-w-[120px]">{workflow.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-blue-600">{workflow.rate}%</p>
                                        <p className="text-xs text-slate-500">{workflow.conversions.toLocaleString()} conv.</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <Link to="/workflows">
                        <Button variant="ghost" className="w-full mt-4 text-sm" size="sm">
                            View All Workflows
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Nudge Type Distribution */}
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <PieChart className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Nudge Distribution</h3>
                            <p className="text-xs text-slate-500">By type</p>
                        </div>
                    </div>
                    <DonutChart
                        className="h-40"
                        data={nudgeTypeData}
                        category="value"
                        index="name"
                        colors={["blue", "cyan", "violet", "amber", "emerald"]}
                        showAnimation
                    />
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {nudgeTypeData.slice(0, 4).map((item, idx) => (
                            <div key={item.name} className="flex items-center gap-2 text-xs">
                                <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    idx === 0 ? "bg-blue-500" :
                                    idx === 1 ? "bg-cyan-500" :
                                    idx === 2 ? "bg-violet-500" :
                                    "bg-amber-500"
                                )} />
                                <span className="text-slate-600 truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* System Status */}
                <div className="col-span-2 bg-white rounded-xl border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Server className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">System Status</h3>
                                <p className="text-xs text-slate-500">Real-time health monitoring</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <Wifi className="h-3 w-3 mr-1" />
                            All Systems Operational
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-slate-500 border-b">
                                    <th className="text-left pb-3 font-medium">Service</th>
                                    <th className="text-left pb-3 font-medium">Status</th>
                                    <th className="text-left pb-3 font-medium">Latency</th>
                                    <th className="text-left pb-3 font-medium">Uptime</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {systemStatus.map((service) => (
                                    <tr key={service.name} className="border-b last:border-0">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(service.status)}
                                                <span className="font-medium">{service.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">{getStatusBadge(service.status)}</td>
                                        <td className="py-3 font-mono text-slate-600">{service.latency}</td>
                                        <td className="py-3">
                                            <span className={cn(
                                                "font-medium",
                                                parseFloat(service.uptime) >= 99.5 ? "text-emerald-600" :
                                                parseFloat(service.uptime) >= 98 ? "text-amber-600" : "text-red-600"
                                            )}>
                                                {service.uptime}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                            <p className="text-xs text-slate-500">Live feed</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {recentActivity.map((activity, idx) => {
                            const ActivityIcon = activity.icon;
                            return (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <ActivityIcon className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900">{activity.event}</p>
                                        <p className="text-xs text-slate-500 truncate">{activity.detail}</p>
                                    </div>
                                    <span className="text-xs text-slate-400 flex-shrink-0">{activity.time}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">Quick Actions</h3>
                        <p className="text-slate-400 text-sm mt-1">Common tasks and shortcuts</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/deployments">
                            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                                <Rocket className="h-4 w-4 mr-2" />
                                Deploy Changes
                            </Button>
                        </Link>
                        <Link to="/workflows">
                            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                                <Zap className="h-4 w-4 mr-2" />
                                New Workflow
                            </Button>
                        </Link>
                        <Link to="/feature-pipelines">
                            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                                <Database className="h-4 w-4 mr-2" />
                                Configure Pipeline
                            </Button>
                        </Link>
                        <Link to="/settings">
                            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
