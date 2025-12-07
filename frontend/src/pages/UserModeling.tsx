import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Settings2,
} from "lucide-react";
import { SchemaBuilder, type SchemaField } from "@/components/usermodeling/SchemaBuilder";
import { DataIngestion } from "@/components/usermodeling/DataIngestion";
import { OverviewStats } from "@/components/usermodeling/OverviewStats";
import { UserDirectory, type UserRecord } from "@/components/usermodeling/UserDirectory";
import { UserDetailDrawer } from "@/components/usermodeling/UserDetailDrawer";
import { IngestionLogs } from "@/components/usermodeling/IngestionLogs";
import { SchemaWorkflow } from "@/components/usermodeling/SchemaWorkflow";

// Sample data for demonstration
const sampleSchema: SchemaField[] = [
    {
        id: "field_1",
        name: "email",
        type: "email",
        required: true,
        description: "Primary email address",
        isPrimaryKey: true,
    },
    {
        id: "field_2",
        name: "name",
        type: "string",
        required: true,
        description: "Full name",
        isPrimaryKey: false,
    },
    {
        id: "field_3",
        name: "company",
        type: "string",
        required: false,
        description: "Company or organization",
        isPrimaryKey: false,
    },
    {
        id: "field_4",
        name: "plan",
        type: "enum",
        required: true,
        description: "Subscription plan",
        isPrimaryKey: false,
        enumValues: ["free", "starter", "pro", "enterprise"],
    },
    {
        id: "field_5",
        name: "signup_date",
        type: "date",
        required: true,
        description: "Account creation date",
        isPrimaryKey: false,
    },
    {
        id: "field_6",
        name: "is_verified",
        type: "boolean",
        required: false,
        description: "Email verification status",
        isPrimaryKey: false,
    },
];

const sampleUsers: UserRecord[] = [
    {
        id: "usr_001",
        data: {
            email: "john.doe@acme.com",
            name: "John Doe",
            company: "Acme Inc.",
            plan: "pro",
            signup_date: "2025-01-15",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-01-15T10:30:00Z",
        updatedAt: "2025-12-01T14:22:00Z",
    },
    {
        id: "usr_002",
        data: {
            email: "jane.smith@techcorp.io",
            name: "Jane Smith",
            company: "TechCorp",
            plan: "enterprise",
            signup_date: "2025-02-20",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-02-20T08:15:00Z",
        updatedAt: "2025-11-28T16:45:00Z",
    },
    {
        id: "usr_003",
        data: {
            email: "mike.johnson@startup.co",
            name: "Mike Johnson",
            company: null,
            plan: "starter",
            signup_date: "2025-03-10",
            is_verified: false,
        },
        status: "partial",
        createdAt: "2025-03-10T11:00:00Z",
        updatedAt: "2025-11-30T09:12:00Z",
    },
    {
        id: "usr_004",
        data: {
            email: "sarah.wilson@bigco.com",
            name: "Sarah Wilson",
            company: "BigCo International",
            plan: "enterprise",
            signup_date: "2025-04-05",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-04-05T14:30:00Z",
        updatedAt: "2025-12-02T10:18:00Z",
    },
    {
        id: "usr_005",
        data: {
            email: "alex.chen@devshop.io",
            name: "Alex Chen",
            company: "DevShop",
            plan: "pro",
            signup_date: "2025-05-12",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-05-12T09:45:00Z",
        updatedAt: "2025-11-25T15:33:00Z",
    },
    {
        id: "usr_006",
        data: {
            email: "emma.brown@freelance.me",
            name: "Emma Brown",
            company: null,
            plan: "free",
            signup_date: "2025-06-18",
            is_verified: false,
        },
        status: "partial",
        createdAt: "2025-06-18T16:20:00Z",
        updatedAt: "2025-06-18T16:20:00Z",
    },
    {
        id: "usr_007",
        data: {
            email: "david.lee@enterprise.org",
            name: "David Lee",
            company: "Enterprise Solutions",
            plan: "enterprise",
            signup_date: "2025-07-22",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-07-22T13:10:00Z",
        updatedAt: "2025-12-05T11:55:00Z",
    },
    {
        id: "usr_008",
        data: {
            email: "lisa.garcia@creative.studio",
            name: "Lisa Garcia",
            company: "Creative Studio",
            plan: "starter",
            signup_date: "2025-08-30",
            is_verified: true,
        },
        status: "complete",
        createdAt: "2025-08-30T10:05:00Z",
        updatedAt: "2025-11-20T14:40:00Z",
    },
];

export default function UserModeling() {
    const [activeTab, setActiveTab] = useState<"schema" | "directory">("schema");
    const [schema, setSchema] = useState<SchemaField[]>(sampleSchema);
    const [users] = useState<UserRecord[]>(sampleUsers);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Edit mode for schema
    const [isSchemaEditing, setIsSchemaEditing] = useState(false);
    const [showWorkflow, setShowWorkflow] = useState(false);

    // Collapsible states
    const [isSchemaCollapsed, setIsSchemaCollapsed] = useState(false);
    const [isIngestionCollapsed, setIsIngestionCollapsed] = useState(false);

    const hasUsers = users.length > 0;
    const completeUsers = users.filter((u) => u.status === "complete").length;
    const incompleteUsers = users.filter((u) => u.status !== "complete").length;
    const dataQuality = hasUsers ? Math.round((completeUsers / users.length) * 100) : 0;

    const handleUserClick = (user: UserRecord) => {
        setSelectedUser(user);
        setIsDrawerOpen(true);
    };

    const handleSchemaSave = () => {
        setShowWorkflow(true);
    };

    const handleWorkflowComplete = () => {
        setShowWorkflow(false);
        setIsSchemaEditing(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        User Modeling
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Define your user schema and manage user profiles
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <IngestionLogs logs={[]} onRefresh={() => console.log("Refresh logs")} />
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "schema" | "directory")}
                className="w-full"
            >
                <TabsList className="bg-slate-100/80 p-1">
                    <TabsTrigger
                        value="schema"
                        className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <Settings2 className="h-4 w-4" />
                        Schema & Ingestion
                    </TabsTrigger>
                    <TabsTrigger
                        value="directory"
                        className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        disabled={!hasUsers}
                    >
                        <Users className="h-4 w-4" />
                        User Directory
                        {hasUsers && (
                            <Badge
                                variant="secondary"
                                className="ml-1 bg-slate-200 text-slate-700"
                            >
                                {users.length.toLocaleString()}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Schema & Ingestion Tab */}
                <TabsContent value="schema" className="mt-6 space-y-6">
                    {/* Overview Stats */}
                    {hasUsers && (
                        <OverviewStats
                            totalUsers={users.length}
                            lastSyncTime="2 mins ago"
                            dataQualityScore={dataQuality}
                            incompleteProfiles={incompleteUsers}
                        />
                    )}

                    {/* Schema Builder */}
                    <SchemaBuilder
                        fields={schema}
                        onFieldsChange={setSchema}
                        isCollapsed={isSchemaCollapsed}
                        onToggleCollapse={() => setIsSchemaCollapsed(!isSchemaCollapsed)}
                        isEditing={isSchemaEditing}
                        onEditToggle={() => setIsSchemaEditing(!isSchemaEditing)}
                        onSave={handleSchemaSave}
                    />

                    {/* Data Ingestion */}
                    <DataIngestion
                        schema={schema}
                        isCollapsed={isIngestionCollapsed}
                        onToggleCollapse={() => setIsIngestionCollapsed(!isIngestionCollapsed)}
                    />
                </TabsContent>

                {/* User Directory Tab */}
                <TabsContent value="directory" className="mt-6">
                    <UserDirectory
                        schema={schema}
                        users={users}
                        onUserClick={handleUserClick}
                        onRefresh={() => console.log("Refresh")}
                        onExport={() => console.log("Export")}
                    />
                </TabsContent>
            </Tabs>

            {/* User Detail Drawer */}
            <UserDetailDrawer
                user={selectedUser}
                schema={schema}
                open={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedUser(null);
                }}
            />

            {/* Schema Save Workflow */}
            <SchemaWorkflow
                open={showWorkflow}
                onComplete={handleWorkflowComplete}
            />
        </div>
    );
}
