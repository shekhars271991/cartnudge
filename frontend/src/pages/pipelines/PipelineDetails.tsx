import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pause, Activity, FileText, RefreshCw } from "lucide-react";
import { WebhookConfig } from "@/components/pipelines/configs/WebhookConfig";
import { EventLog } from "@/components/pipelines/EventLog";

export default function PipelineDetails() {
    const { id } = useParams();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/integrations">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-slate-900">Webhook Events Stream</h1>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">ID: {id} • Source: Webhook • Target: Raw Data Hub</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline">
                        <Pause className="mr-2 h-4 w-4" /> Pause
                    </Button>
                    <Button>
                        <RefreshCw className="mr-2 h-4 w-4" /> Sync Now
                    </Button>
                </div>
            </div>

            {/* Content */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl border bg-white p-6 shadow-sm">
                            <div className="flex items-center space-x-2 text-slate-500 mb-2">
                                <Activity className="h-4 w-4" />
                                <span className="text-sm font-medium">Events (24h)</span>
                            </div>
                            <div className="text-3xl font-bold">12,450</div>
                            <div className="text-xs text-green-600 mt-1">+12% from yesterday</div>
                        </div>
                        <div className="rounded-xl border bg-white p-6 shadow-sm">
                            <div className="flex items-center space-x-2 text-slate-500 mb-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-medium">Data Volume</span>
                            </div>
                            <div className="text-3xl font-bold">45.2 MB</div>
                        </div>
                        <div className="rounded-xl border bg-white p-6 shadow-sm">
                            <div className="flex items-center space-x-2 text-slate-500 mb-2">
                                <Activity className="h-4 w-4" />
                                <span className="text-sm font-medium">Avg Latency</span>
                            </div>
                            <div className="text-3xl font-bold">240ms</div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">Event Received</span>
                                    </div>
                                    <span className="text-sm text-slate-500">{i * 2} mins ago</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="configuration" className="mt-6">
                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-medium mb-6">Source Configuration</h3>
                        <WebhookConfig />
                    </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                    <EventLog />
                </TabsContent>
            </Tabs>
        </div>
    );
}
