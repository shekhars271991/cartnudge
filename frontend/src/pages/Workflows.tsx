import { useState, useCallback } from "react";
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    Plus,
    Search,
    Play,
    Pause,
    Edit2,
    Trash2,
    ShoppingCart,
    UserX,
    TrendingUp,
    Gift,
    Zap,
    Clock,
    Bell,
    Check,
    X,
    Brain,
    Sparkles,
    Mail,
    Smartphone,
    Send,
    Filter,
    GitBranch,
    Timer,
    Target,
    ChevronRight,
    ArrowLeft,
    Rocket,
    BarChart3,
    Settings,
    AlertCircle,
} from "lucide-react";

// Types
interface Workflow {
    id: string;
    name: string;
    description: string;
    type: WorkflowType;
    triggerType: "event" | "scheduled";
    trigger: string;
    status: "active" | "paused" | "draft";
    conversions: number;
    impressions: number;
    createdAt: string;
    lastEdited: string;
}

type WorkflowType = "cart_abandonment" | "churn_prevention" | "upsell" | "win_back" | "welcome" | "custom";

interface WorkflowTypeOption {
    id: WorkflowType;
    name: string;
    description: string;
    icon: typeof ShoppingCart;
    color: string;
    defaultTrigger: string;
}

// Workflow types configuration
const workflowTypes: WorkflowTypeOption[] = [
    {
        id: "cart_abandonment",
        name: "Cart Abandonment",
        description: "Recover abandoned carts with timely nudges",
        icon: ShoppingCart,
        color: "bg-orange-500",
        defaultTrigger: "checkout_started && !payment_completed within 30m",
    },
    {
        id: "churn_prevention",
        name: "Churn Prevention",
        description: "Re-engage users showing churn signals",
        icon: UserX,
        color: "bg-red-500",
        defaultTrigger: "churn_risk_score > 0.7",
    },
    {
        id: "upsell",
        name: "Upsell / Cross-sell",
        description: "Recommend products based on behavior",
        icon: TrendingUp,
        color: "bg-emerald-500",
        defaultTrigger: "purchase_completed && purchase_probability > 0.6",
    },
    {
        id: "win_back",
        name: "Win Back",
        description: "Re-activate dormant users",
        icon: Gift,
        color: "bg-violet-500",
        defaultTrigger: "last_activity > 30 days",
    },
    {
        id: "welcome",
        name: "Welcome Series",
        description: "Onboard new users with personalized content",
        icon: Bell,
        color: "bg-blue-500",
        defaultTrigger: "user_created",
    },
    {
        id: "custom",
        name: "Custom Workflow",
        description: "Build from scratch with custom logic",
        icon: Zap,
        color: "bg-slate-500",
        defaultTrigger: "",
    },
];

// Block types for workflow builder
const blockTypes = [
    { id: "trigger", name: "Trigger", icon: Zap, color: "bg-amber-500", description: "Start the workflow" },
    { id: "ml_predict", name: "ML Prediction", icon: Brain, color: "bg-violet-500", description: "Call predictive model" },
    { id: "llm_generate", name: "LLM Generate", icon: Sparkles, color: "bg-pink-500", description: "Generate personalized content" },
    { id: "condition", name: "Condition", icon: GitBranch, color: "bg-blue-500", description: "Branch based on logic" },
    { id: "filter", name: "Filter", icon: Filter, color: "bg-cyan-500", description: "Filter users" },
    { id: "delay", name: "Delay", icon: Timer, color: "bg-slate-500", description: "Wait before next step" },
    { id: "email", name: "Send Email", icon: Mail, color: "bg-emerald-500", description: "Email channel" },
    { id: "sms", name: "Send SMS", icon: Smartphone, color: "bg-green-500", description: "SMS channel" },
    { id: "push", name: "Push Notification", icon: Bell, color: "bg-orange-500", description: "Push notification" },
    { id: "webhook", name: "Webhook", icon: Send, color: "bg-indigo-500", description: "Call external API" },
];

// Sample workflows data
const sampleWorkflows: Workflow[] = [
    {
        id: "wf_1",
        name: "Cart Abandonment - High Value",
        description: "Target users with cart value > $100",
        type: "cart_abandonment",
        triggerType: "event",
        trigger: "checkout_started && cart_value > 100",
        status: "active",
        conversions: 892,
        impressions: 4567,
        createdAt: "2025-11-15",
        lastEdited: "2 days ago",
    },
    {
        id: "wf_2",
        name: "Churn Prevention - VIP Users",
        description: "Re-engage VIP users showing churn signals",
        type: "churn_prevention",
        triggerType: "scheduled",
        trigger: "Daily at 9:00 AM",
        status: "active",
        conversions: 234,
        impressions: 1890,
        createdAt: "2025-11-10",
        lastEdited: "5 days ago",
    },
    {
        id: "wf_3",
        name: "Welcome Series",
        description: "3-step onboarding for new users",
        type: "welcome",
        triggerType: "event",
        trigger: "user_created",
        status: "paused",
        conversions: 1456,
        impressions: 3200,
        createdAt: "2025-10-20",
        lastEdited: "1 week ago",
    },
    {
        id: "wf_4",
        name: "Win Back Campaign",
        description: "Re-activate users inactive for 30+ days",
        type: "win_back",
        triggerType: "scheduled",
        trigger: "Weekly on Monday",
        status: "draft",
        conversions: 0,
        impressions: 0,
        createdAt: "2025-12-01",
        lastEdited: "Just now",
    },
];

// Custom node components for ReactFlow
const TriggerNode = ({ data }: { data: { label: string; sublabel?: string } }) => (
    <div className="px-4 py-3 bg-amber-500 text-white rounded-lg shadow-lg min-w-[180px]">
        <Handle type="source" position={Position.Bottom} className="!bg-amber-700" />
        <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.sublabel && <p className="text-xs text-amber-100 mt-1">{data.sublabel}</p>}
    </div>
);

const MLNode = ({ data }: { data: { label: string; model?: string } }) => (
    <div className="px-4 py-3 bg-violet-500 text-white rounded-lg shadow-lg min-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-violet-700" />
        <Handle type="source" position={Position.Bottom} className="!bg-violet-700" />
        <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.model && <p className="text-xs text-violet-200 mt-1">{data.model}</p>}
    </div>
);

const LLMNode = ({ data }: { data: { label: string; prompt?: string } }) => (
    <div className="px-4 py-3 bg-pink-500 text-white rounded-lg shadow-lg min-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-pink-700" />
        <Handle type="source" position={Position.Bottom} className="!bg-pink-700" />
        <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.prompt && <p className="text-xs text-pink-200 mt-1 truncate max-w-[160px]">{data.prompt}</p>}
    </div>
);

const ConditionNode = ({ data }: { data: { label: string; condition?: string } }) => (
    <div className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg min-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-blue-700" />
        <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !left-[30%]" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 !left-[70%]" />
        <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.condition && <p className="text-xs text-blue-200 mt-1">{data.condition}</p>}
        <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-300">Yes</span>
            <span className="text-red-300">No</span>
        </div>
    </div>
);

const ChannelNode = ({ data }: { data: { label: string; channel?: string; icon?: typeof Mail } }) => {
    const Icon = data.icon || Send;
    return (
        <div className="px-4 py-3 bg-emerald-500 text-white rounded-lg shadow-lg min-w-[180px]">
            <Handle type="target" position={Position.Top} className="!bg-emerald-700" />
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{data.label}</span>
            </div>
            {data.channel && <p className="text-xs text-emerald-200 mt-1">{data.channel}</p>}
        </div>
    );
};

const DelayNode = ({ data }: { data: { label: string; duration?: string } }) => (
    <div className="px-4 py-3 bg-slate-500 text-white rounded-lg shadow-lg min-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-slate-700" />
        <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
        <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.duration && <p className="text-xs text-slate-300 mt-1">{data.duration}</p>}
    </div>
);

const nodeTypes = {
    trigger: TriggerNode,
    ml_predict: MLNode,
    llm_generate: LLMNode,
    condition: ConditionNode,
    channel: ChannelNode,
    delay: DelayNode,
};

// Generate initial workflow nodes based on type
const getInitialNodes = (workflowType: WorkflowType): Node[] => {
    const baseNodes: Node[] = [
        {
            id: '1',
            type: 'trigger',
            position: { x: 250, y: 0 },
            data: { label: 'Trigger', sublabel: workflowTypes.find(t => t.id === workflowType)?.defaultTrigger || 'Custom trigger' },
        },
    ];

    switch (workflowType) {
        case 'cart_abandonment':
            return [
                ...baseNodes,
                { id: '2', type: 'ml_predict', position: { x: 250, y: 100 }, data: { label: 'Get Purchase Probability', model: 'purchase_probability_model' } },
                { id: '3', type: 'condition', position: { x: 250, y: 200 }, data: { label: 'High Intent?', condition: 'score > 0.5' } },
                { id: '4', type: 'llm_generate', position: { x: 100, y: 320 }, data: { label: 'Generate Nudge', prompt: 'Create urgency message...' } },
                { id: '5', type: 'channel', position: { x: 100, y: 420 }, data: { label: 'Send Email', channel: 'Transactional Email', icon: Mail } },
                { id: '6', type: 'delay', position: { x: 400, y: 320 }, data: { label: 'Wait', duration: '2 hours' } },
                { id: '7', type: 'channel', position: { x: 400, y: 420 }, data: { label: 'Send SMS', channel: 'SMS Reminder', icon: Smartphone } },
            ];
        case 'churn_prevention':
            return [
                ...baseNodes,
                { id: '2', type: 'ml_predict', position: { x: 250, y: 100 }, data: { label: 'Get Churn Score', model: 'churn_prediction_model' } },
                { id: '3', type: 'condition', position: { x: 250, y: 200 }, data: { label: 'High Risk?', condition: 'churn_score > 0.7' } },
                { id: '4', type: 'llm_generate', position: { x: 250, y: 320 }, data: { label: 'Personalize Offer', prompt: 'Generate re-engagement offer...' } },
                { id: '5', type: 'channel', position: { x: 250, y: 420 }, data: { label: 'Send Email', channel: 'Win-back Campaign', icon: Mail } },
            ];
        default:
            return [
                ...baseNodes,
                { id: '2', type: 'ml_predict', position: { x: 250, y: 100 }, data: { label: 'ML Prediction', model: 'Select model...' } },
                { id: '3', type: 'llm_generate', position: { x: 250, y: 200 }, data: { label: 'Generate Content', prompt: 'Configure prompt...' } },
                { id: '4', type: 'channel', position: { x: 250, y: 300 }, data: { label: 'Output Channel', channel: 'Select channel...' } },
            ];
    }
};

const getInitialEdges = (workflowType: WorkflowType): Edge[] => {
    switch (workflowType) {
        case 'cart_abandonment':
            return [
                { id: 'e1-2', source: '1', target: '2', animated: true },
                { id: 'e2-3', source: '2', target: '3', animated: true },
                { id: 'e3-4', source: '3', target: '4', sourceHandle: 'yes', animated: true },
                { id: 'e4-5', source: '4', target: '5', animated: true },
                { id: 'e3-6', source: '3', target: '6', sourceHandle: 'no', animated: true },
                { id: 'e6-7', source: '6', target: '7', animated: true },
            ];
        case 'churn_prevention':
            return [
                { id: 'e1-2', source: '1', target: '2', animated: true },
                { id: 'e2-3', source: '2', target: '3', animated: true },
                { id: 'e3-4', source: '3', target: '4', sourceHandle: 'yes', animated: true },
                { id: 'e4-5', source: '4', target: '5', animated: true },
            ];
        default:
            return [
                { id: 'e1-2', source: '1', target: '2', animated: true },
                { id: 'e2-3', source: '2', target: '3', animated: true },
                { id: 'e3-4', source: '3', target: '4', animated: true },
            ];
    }
};

export default function Workflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>(sampleWorkflows);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Creation wizard state
    const [isCreating, setIsCreating] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
    const [newWorkflow, setNewWorkflow] = useState({
        name: "",
        description: "",
        type: null as WorkflowType | null,
        triggerType: "event" as "event" | "scheduled",
        trigger: "",
        scheduleTime: "",
        scheduleFrequency: "daily",
    });

    // Workflow builder state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Edit state
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [showBlockPalette, setShowBlockPalette] = useState(false);

    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const updateNodeData = useCallback((nodeId: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...newData,
                        },
                    };
                }
                return node;
            })
        );
        // Update selected node too
        setSelectedNode((prev) => {
            if (prev && prev.id === nodeId) {
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        ...newData,
                    },
                };
            }
            return prev;
        });
    }, [setNodes]);

    const deleteSelectedNode = useCallback(() => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
            setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
            setSelectedNode(null);
        }
    }, [selectedNode, setNodes, setEdges]);

    // Filter workflows
    const filteredWorkflows = workflows.filter(wf => {
        const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            wf.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || wf.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handlers
    const handleStartCreate = () => {
        setIsCreating(true);
        setCreateStep(1);
        setNewWorkflow({
            name: "",
            description: "",
            type: null,
            triggerType: "event",
            trigger: "",
            scheduleTime: "",
            scheduleFrequency: "daily",
        });
    };

    const handleSelectType = (type: WorkflowType) => {
        const typeConfig = workflowTypes.find(t => t.id === type);
        setNewWorkflow({
            ...newWorkflow,
            type,
            trigger: typeConfig?.defaultTrigger || "",
        });
    };

    const handleContinueToBuilder = () => {
        if (newWorkflow.type) {
            const initialNodes = getInitialNodes(newWorkflow.type);
            const initialEdges = getInitialEdges(newWorkflow.type);
            setNodes(initialNodes);
            setEdges(initialEdges);
            setCreateStep(4);
        }
    };

    const handleSaveWorkflow = () => {
        const workflow: Workflow = {
            id: `wf_${Date.now()}`,
            name: newWorkflow.name,
            description: newWorkflow.description,
            type: newWorkflow.type!,
            triggerType: newWorkflow.triggerType,
            trigger: newWorkflow.triggerType === "event" ? newWorkflow.trigger : `${newWorkflow.scheduleFrequency} at ${newWorkflow.scheduleTime}`,
            status: "draft",
            conversions: 0,
            impressions: 0,
            createdAt: new Date().toISOString().split('T')[0],
            lastEdited: "Just now",
        };
        setWorkflows([workflow, ...workflows]);
        setIsCreating(false);
        setCreateStep(1);
    };

    const handleToggleStatus = (workflowId: string) => {
        setWorkflows(workflows.map(wf => {
            if (wf.id === workflowId) {
                return {
                    ...wf,
                    status: wf.status === "active" ? "paused" : "active",
                };
            }
            return wf;
        }));
    };

    const handleDeleteWorkflow = (workflowId: string) => {
        setWorkflows(workflows.filter(wf => wf.id !== workflowId));
    };

    const handleEditWorkflow = (workflow: Workflow) => {
        setEditingWorkflow(workflow);
        const initialNodes = getInitialNodes(workflow.type);
        const initialEdges = getInitialEdges(workflow.type);
        setNodes(initialNodes);
        setEdges(initialEdges);
    };

    const addBlockToCanvas = (blockType: string) => {
        const newNode: Node = {
            id: `node_${Date.now()}`,
            type: blockType === 'email' || blockType === 'sms' || blockType === 'push' || blockType === 'webhook' ? 'channel' : blockType,
            position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
            data: {
                label: blockTypes.find(b => b.id === blockType)?.name || 'New Block',
                icon: blockTypes.find(b => b.id === blockType)?.icon,
            },
        };
        setNodes((nds) => [...nds, newNode]);
        setShowBlockPalette(false);
    };

    const getTypeIcon = (type: WorkflowType) => {
        const config = workflowTypes.find(t => t.id === type);
        return config?.icon || Zap;
    };

    const getTypeColor = (type: WorkflowType) => {
        const config = workflowTypes.find(t => t.id === type);
        return config?.color || "bg-slate-500";
    };

    const getStatusBadge = (status: Workflow["status"]) => {
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
            case "paused":
                return <Badge variant="secondary">Paused</Badge>;
            case "draft":
                return <Badge variant="outline" className="text-slate-500">Draft</Badge>;
        }
    };

    // Properties Panel Component
    const renderPropertiesPanel = () => {
        if (!selectedNode) return null;

        const nodeType = selectedNode.type;
        const nodeData = selectedNode.data;

        return (
            <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Block Properties</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNode(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Common Properties */}
                    <div>
                        <Label className="text-xs text-slate-500">Block Type</Label>
                        <p className="text-sm font-medium capitalize">{nodeType?.replace('_', ' ')}</p>
                    </div>

                    <div>
                        <Label className="text-xs font-medium">Label</Label>
                        <Input
                            value={nodeData.label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    {/* Trigger Block Properties */}
                    {nodeType === 'trigger' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">Trigger Condition</Label>
                                <Textarea
                                    value={nodeData.sublabel || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { sublabel: e.target.value })}
                                    placeholder="e.g., checkout_started && cart_value > 100"
                                    className="mt-1 font-mono text-xs"
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    {/* ML Prediction Block Properties */}
                    {nodeType === 'ml_predict' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">Prediction Model</Label>
                                <Select
                                    value={nodeData.model || ''}
                                    onValueChange={(v) => updateNodeData(selectedNode.id, { model: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="purchase_probability_model">Purchase Probability</SelectItem>
                                        <SelectItem value="churn_prediction_model">Churn Prediction</SelectItem>
                                        <SelectItem value="ltv_prediction_model">LTV Prediction</SelectItem>
                                        <SelectItem value="upsell_propensity_model">Upsell Propensity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Output Variable</Label>
                                <Input
                                    value={nodeData.outputVar || 'prediction_score'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { outputVar: e.target.value })}
                                    className="mt-1 font-mono text-sm"
                                    placeholder="prediction_score"
                                />
                            </div>
                            <div className="p-3 bg-violet-50 rounded-lg">
                                <p className="text-xs text-violet-700">
                                    <AlertCircle className="h-3 w-3 inline mr-1" />
                                    Output will be available as <code className="bg-violet-100 px-1 rounded">{'{'}${nodeData.outputVar || 'prediction_score'}{'}'}</code>
                                </p>
                            </div>
                        </>
                    )}

                    {/* LLM Generate Block Properties */}
                    {nodeType === 'llm_generate' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">LLM Model</Label>
                                <Select
                                    value={nodeData.llmModel || 'gpt-4'}
                                    onValueChange={(v) => updateNodeData(selectedNode.id, { llmModel: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                        <SelectItem value="claude-3">Claude 3</SelectItem>
                                        <SelectItem value="custom">Custom Model</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Prompt Template</Label>
                                <Textarea
                                    value={nodeData.prompt || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                                    placeholder="Generate a personalized nudge message for {{user_name}} based on their cart value of {{cart_value}}..."
                                    className="mt-1 text-sm"
                                    rows={5}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Output Variable</Label>
                                <Input
                                    value={nodeData.outputVar || 'generated_message'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { outputVar: e.target.value })}
                                    className="mt-1 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Temperature</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={nodeData.temperature || 0.7}
                                    onChange={(e) => updateNodeData(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                                    className="mt-1"
                                />
                            </div>
                        </>
                    )}

                    {/* Condition Block Properties */}
                    {nodeType === 'condition' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">Condition Expression</Label>
                                <Textarea
                                    value={nodeData.condition || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                                    placeholder="e.g., prediction_score > 0.5"
                                    className="mt-1 font-mono text-xs"
                                    rows={2}
                                />
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                                <p className="text-xs text-blue-700 font-medium">Available operators:</p>
                                <div className="flex flex-wrap gap-1">
                                    {['>', '<', '>=', '<=', '==', '!=', '&&', '||'].map(op => (
                                        <code key={op} className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">{op}</code>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Delay Block Properties */}
                    {nodeType === 'delay' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">Delay Duration</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={nodeData.delayValue || 1}
                                        onChange={(e) => updateNodeData(selectedNode.id, { 
                                            delayValue: parseInt(e.target.value),
                                            duration: `${e.target.value} ${nodeData.delayUnit || 'hours'}`
                                        })}
                                        className="w-20"
                                    />
                                    <Select
                                        value={nodeData.delayUnit || 'hours'}
                                        onValueChange={(v) => updateNodeData(selectedNode.id, { 
                                            delayUnit: v,
                                            duration: `${nodeData.delayValue || 1} ${v}`
                                        })}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="minutes">Minutes</SelectItem>
                                            <SelectItem value="hours">Hours</SelectItem>
                                            <SelectItem value="days">Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Channel Block Properties */}
                    {nodeType === 'channel' && (
                        <>
                            <div>
                                <Label className="text-xs font-medium">Channel Type</Label>
                                <Select
                                    value={nodeData.channelType || 'email'}
                                    onValueChange={(v) => updateNodeData(selectedNode.id, { channelType: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="sms">SMS</SelectItem>
                                        <SelectItem value="push">Push Notification</SelectItem>
                                        <SelectItem value="webhook">Webhook</SelectItem>
                                        <SelectItem value="in_app">In-App Message</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Channel Configuration</Label>
                                <Input
                                    value={nodeData.channel || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { channel: e.target.value })}
                                    placeholder="e.g., Transactional Email"
                                    className="mt-1"
                                />
                            </div>
                            {nodeData.channelType === 'email' && (
                                <>
                                    <div>
                                        <Label className="text-xs font-medium">Subject Line</Label>
                                        <Input
                                            value={nodeData.subject || ''}
                                            onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                                            placeholder="Your cart is waiting..."
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium">From Name</Label>
                                        <Input
                                            value={nodeData.fromName || ''}
                                            onChange={(e) => updateNodeData(selectedNode.id, { fromName: e.target.value })}
                                            placeholder="Your Store"
                                            className="mt-1"
                                        />
                                    </div>
                                </>
                            )}
                            {nodeData.channelType === 'webhook' && (
                                <>
                                    <div>
                                        <Label className="text-xs font-medium">Webhook URL</Label>
                                        <Input
                                            value={nodeData.webhookUrl || ''}
                                            onChange={(e) => updateNodeData(selectedNode.id, { webhookUrl: e.target.value })}
                                            placeholder="https://api.example.com/nudge"
                                            className="mt-1 font-mono text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium">HTTP Method</Label>
                                        <Select
                                            value={nodeData.httpMethod || 'POST'}
                                            onValueChange={(v) => updateNodeData(selectedNode.id, { httpMethod: v })}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="POST">POST</SelectItem>
                                                <SelectItem value="PUT">PUT</SelectItem>
                                                <SelectItem value="PATCH">PATCH</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Delete Button */}
                    <div className="pt-4 border-t">
                        <Button
                            variant="outline"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={deleteSelectedNode}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Block
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // Full-page workflow builder
    if (isCreating && createStep === 4) {
        return (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Header */}
                <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setCreateStep(3); setSelectedNode(null); }}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">{newWorkflow.name || "New Workflow"}</h1>
                            <p className="text-sm text-slate-500">
                                {workflowTypes.find(t => t.id === newWorkflow.type)?.name} • {newWorkflow.triggerType === "event" ? "Event Triggered" : "Scheduled"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowBlockPalette(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Block
                        </Button>
                        <Button variant="outline" onClick={() => { setIsCreating(false); setSelectedNode(null); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveWorkflow} className="bg-emerald-600 hover:bg-emerald-700">
                            <Rocket className="h-4 w-4 mr-2" />
                            Save & Deploy
                        </Button>
                    </div>
                </div>

                {/* Canvas + Properties Panel */}
                <div className="flex-1 flex">
                    <div className="flex-1 bg-slate-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
                            className="bg-slate-50"
                        >
                            <Controls />
                            <MiniMap />
                            <Background gap={20} size={1} color="#e2e8f0" />
                        </ReactFlow>
                    </div>

                    {/* Properties Panel */}
                    {renderPropertiesPanel()}
                </div>

                {/* Block Palette Dialog */}
                <Dialog open={showBlockPalette} onOpenChange={setShowBlockPalette}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Block</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3 py-4">
                            {blockTypes.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <div
                                        key={block.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        onClick={() => addBlockToCanvas(block.id)}
                                    >
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", block.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{block.name}</p>
                                            <p className="text-xs text-slate-500">{block.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Edit workflow builder
    if (editingWorkflow) {
        return (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Header */}
                <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingWorkflow(null); setSelectedNode(null); }}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">{editingWorkflow.name}</h1>
                            <p className="text-sm text-slate-500">
                                {workflowTypes.find(t => t.id === editingWorkflow.type)?.name} • {editingWorkflow.triggerType === "event" ? "Event Triggered" : "Scheduled"}
                            </p>
                        </div>
                        {getStatusBadge(editingWorkflow.status)}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowBlockPalette(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Block
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingWorkflow(null); setSelectedNode(null); }}>
                            Cancel
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Check className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Canvas + Properties Panel */}
                <div className="flex-1 flex">
                    <div className="flex-1 bg-slate-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ maxZoom: 0.85, padding: 0.2 }}
                            className="bg-slate-50"
                        >
                            <Controls />
                            <MiniMap />
                            <Background gap={20} size={1} color="#e2e8f0" />
                        </ReactFlow>
                    </div>

                    {/* Properties Panel */}
                    {renderPropertiesPanel()}
                </div>

                {/* Block Palette Dialog */}
                <Dialog open={showBlockPalette} onOpenChange={setShowBlockPalette}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Block</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3 py-4">
                            {blockTypes.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <div
                                        key={block.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        onClick={() => addBlockToCanvas(block.id)}
                                    >
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", block.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{block.name}</p>
                                            <p className="text-xs text-slate-500">{block.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nudge Workflows</h1>
                    <p className="text-slate-500 mt-1">Create and manage intelligent nudge workflows powered by ML predictions</p>
                </div>
                <Button onClick={handleStartCreate} className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" />
                    New Workflow
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Play className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{workflows.filter(w => w.status === "active").length}</p>
                            <p className="text-xs text-slate-500">Active Workflows</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{workflows.reduce((acc, w) => acc + w.impressions, 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Impressions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{workflows.reduce((acc, w) => acc + w.conversions, 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Conversions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {workflows.reduce((acc, w) => acc + w.impressions, 0) > 0 
                                    ? ((workflows.reduce((acc, w) => acc + w.conversions, 0) / workflows.reduce((acc, w) => acc + w.impressions, 0)) * 100).toFixed(1)
                                    : 0}%
                            </p>
                            <p className="text-xs text-slate-500">Avg. Conversion Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search workflows..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Workflows Grid */}
            <div className="grid grid-cols-2 gap-4">
                {filteredWorkflows.map((workflow) => {
                    const TypeIcon = getTypeIcon(workflow.type);
                    return (
                        <div
                            key={workflow.id}
                            className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", getTypeColor(workflow.type))}>
                                        <TypeIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                                        <p className="text-sm text-slate-500">{workflow.description}</p>
                                    </div>
                                </div>
                                {getStatusBadge(workflow.status)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-1">
                                    {workflow.triggerType === "event" ? (
                                        <Zap className="h-4 w-4 text-amber-500" />
                                    ) : (
                                        <Clock className="h-4 w-4 text-blue-500" />
                                    )}
                                    <span className="font-mono text-xs">{workflow.trigger}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-3 border-t border-b mb-4">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{workflow.impressions.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">Impressions</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-emerald-600">{workflow.conversions.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">Conversions</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Edited {workflow.lastEdited}</span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditWorkflow(workflow)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleToggleStatus(workflow.id)}
                                    >
                                        {workflow.status === "active" ? (
                                            <Pause className="h-4 w-4 text-slate-500" />
                                        ) : (
                                            <Play className="h-4 w-4 text-emerald-600" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteWorkflow(workflow.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Workflow Sheet (Steps 1-3) */}
            <Sheet open={isCreating && createStep < 4} onOpenChange={(open) => { if (!open) setIsCreating(false); }}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
                    {/* Step Indicator */}
                    <div className="p-6 border-b bg-slate-50">
                        <SheetHeader>
                            <SheetTitle>Create New Workflow</SheetTitle>
                        </SheetHeader>
                        <div className="flex items-center gap-2 mt-4">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                            createStep === step
                                                ? "bg-slate-900 text-white"
                                                : createStep > step
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-200 text-slate-500"
                                        )}
                                    >
                                        {createStep > step ? <Check className="h-4 w-4" /> : step}
                                    </div>
                                    {step < 3 && (
                                        <div className={cn(
                                            "w-12 h-0.5 mx-1",
                                            createStep > step ? "bg-emerald-500" : "bg-slate-200"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span>Name</span>
                            <span>Type</span>
                            <span>Trigger</span>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Step 1: Name & Description */}
                        {createStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Name your workflow</h3>
                                    <p className="text-sm text-slate-500">Give your workflow a descriptive name</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium">Workflow Name</Label>
                                        <Input
                                            placeholder="e.g., Cart Abandonment - High Value"
                                            value={newWorkflow.name}
                                            onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Description (optional)</Label>
                                        <Input
                                            placeholder="What does this workflow do?"
                                            value={newWorkflow.description}
                                            onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Workflow Type */}
                        {createStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Select workflow type</h3>
                                    <p className="text-sm text-slate-500">Choose a template to get started</p>
                                </div>

                                <div className="space-y-3">
                                    {workflowTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <div
                                                key={type.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    newWorkflow.type === type.id
                                                        ? "border-slate-900 bg-slate-50"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                                onClick={() => handleSelectType(type.id)}
                                            >
                                                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white", type.color)}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{type.name}</p>
                                                    <p className="text-sm text-slate-500">{type.description}</p>
                                                </div>
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                    newWorkflow.type === type.id
                                                        ? "border-slate-900 bg-slate-900"
                                                        : "border-slate-300"
                                                )}>
                                                    {newWorkflow.type === type.id && (
                                                        <Check className="h-3 w-3 text-white" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Trigger Configuration */}
                        {createStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Configure trigger</h3>
                                    <p className="text-sm text-slate-500">How should this workflow be triggered?</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Trigger Type */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                newWorkflow.triggerType === "event"
                                                    ? "border-amber-500 bg-amber-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                            onClick={() => setNewWorkflow({ ...newWorkflow, triggerType: "event" })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    newWorkflow.triggerType === "event" ? "bg-amber-500 text-white" : "bg-slate-100"
                                                )}>
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Event-based</p>
                                                    <p className="text-xs text-slate-500">Trigger on user action</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                newWorkflow.triggerType === "scheduled"
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                            onClick={() => setNewWorkflow({ ...newWorkflow, triggerType: "scheduled" })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    newWorkflow.triggerType === "scheduled" ? "bg-blue-500 text-white" : "bg-slate-100"
                                                )}>
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Scheduled</p>
                                                    <p className="text-xs text-slate-500">Run on a schedule</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Event Trigger Configuration */}
                                    {newWorkflow.triggerType === "event" && (
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                            <Label className="text-sm font-medium text-amber-900">Trigger Condition</Label>
                                            <Input
                                                placeholder="e.g., checkout_started && cart_value > 100"
                                                value={newWorkflow.trigger}
                                                onChange={(e) => setNewWorkflow({ ...newWorkflow, trigger: e.target.value })}
                                                className="mt-2 font-mono text-sm bg-white"
                                            />
                                            <p className="text-xs text-amber-700 mt-2">
                                                Use event names and conditions from your data pipelines
                                            </p>
                                        </div>
                                    )}

                                    {/* Scheduled Trigger Configuration */}
                                    {newWorkflow.triggerType === "scheduled" && (
                                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium text-blue-900">Frequency</Label>
                                                <Select
                                                    value={newWorkflow.scheduleFrequency}
                                                    onValueChange={(v) => setNewWorkflow({ ...newWorkflow, scheduleFrequency: v })}
                                                >
                                                    <SelectTrigger className="mt-2 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hourly">Hourly</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-blue-900">Time</Label>
                                                <Input
                                                    type="time"
                                                    value={newWorkflow.scheduleTime}
                                                    onChange={(e) => setNewWorkflow({ ...newWorkflow, scheduleTime: e.target.value })}
                                                    className="mt-2 bg-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-white sticky bottom-0">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (createStep === 1) {
                                        setIsCreating(false);
                                    } else {
                                        setCreateStep((createStep - 1) as 1 | 2 | 3);
                                    }
                                }}
                            >
                                {createStep === 1 ? "Cancel" : "Back"}
                            </Button>
                            <Button
                                onClick={() => {
                                    if (createStep < 3) {
                                        setCreateStep((createStep + 1) as 1 | 2 | 3);
                                    } else {
                                        handleContinueToBuilder();
                                    }
                                }}
                                disabled={
                                    (createStep === 1 && !newWorkflow.name) ||
                                    (createStep === 2 && !newWorkflow.type) ||
                                    (createStep === 3 && newWorkflow.triggerType === "event" && !newWorkflow.trigger) ||
                                    (createStep === 3 && newWorkflow.triggerType === "scheduled" && !newWorkflow.scheduleTime)
                                }
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {createStep === 3 ? (
                                    <>
                                        Open Builder
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
