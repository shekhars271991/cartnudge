import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { membersApi, apiKeysApi } from "@/lib/api";
import type { ProjectMember, ApiKey, ApiKeyCreated, ProjectRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AxiosError } from "axios";
import type { ApiError } from "@/lib/api";
import {
  FolderOpen,
  Key,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  Settings as SettingsIcon,
  Globe,
  AlertCircle,
  ExternalLink,
  Webhook,
  Shield,
  Zap,
  Database,
  Users,
  UserPlus,
  Crown,
  Loader2,
  Check,
} from "lucide-react";

// Role badge colors
const roleColors: Record<ProjectRole, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-violet-100 text-violet-700",
  member: "bg-blue-100 text-blue-700",
};

export default function Settings() {
  const {
    projects,
    selectedProject,
    isLoading: projectsLoading,
    createProject,
    updateProject,
    deleteProject,
  } = useProject();

  // Projects state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [editProject, setEditProject] = useState({ id: "", name: "", description: "" });
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [projectError, setProjectError] = useState("");

  // Members state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [memberError, setMemberError] = useState("");

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState({ name: "", type: "secret" as "public" | "secret" });
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // General settings state
  const [settings, setSettings] = useState({
    webhookRetries: true,
    rateLimiting: true,
    debugMode: false,
    dataRetention: "90",
  });

  // Load members when project changes
  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedProject) {
        setMembers([]);
        return;
      }

      setMembersLoading(true);
      try {
        const data = await membersApi.list(selectedProject.id);
        setMembers(data);
      } catch (error) {
        console.error("Failed to load members:", error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [selectedProject]);

  // Load API keys when project changes
  useEffect(() => {
    const loadApiKeys = async () => {
      if (!selectedProject) {
        setApiKeys([]);
        return;
      }

      setApiKeysLoading(true);
      try {
        const data = await apiKeysApi.list(selectedProject.id);
        setApiKeys(data.items);
      } catch (error) {
        console.error("Failed to load API keys:", error);
      } finally {
        setApiKeysLoading(false);
      }
    };

    loadApiKeys();
  }, [selectedProject]);

  // Project handlers
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    setIsCreatingProject(true);
    setProjectError("");

    try {
      await createProject(newProject.name.trim(), newProject.description.trim() || undefined);
      setShowCreateProject(false);
      setNewProject({ name: "", description: "" });
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setProjectError(axiosError.response?.data?.detail || "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editProject.name.trim()) return;

    setIsUpdatingProject(true);
    setProjectError("");

    try {
      await updateProject(
        editProject.id,
        editProject.name.trim(),
        editProject.description.trim() || undefined
      );
      setShowEditProject(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setProjectError(axiosError.response?.data?.detail || "Failed to update project");
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeletingProject(true);
    setProjectError("");

    try {
      await deleteProject(projectToDelete);
      setShowDeleteProject(false);
      setProjectToDelete(null);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setProjectError(axiosError.response?.data?.detail || "Failed to delete project");
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Member handlers
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedProject) return;

    setIsInviting(true);
    setMemberError("");

    try {
      await membersApi.invite(selectedProject.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setShowInviteMember(false);
      setInviteEmail("");
      setInviteRole("member");
      // Reload members
      const data = await membersApi.list(selectedProject.id);
      setMembers(data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setMemberError(axiosError.response?.data?.detail || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProject) return;

    try {
      await membersApi.remove(selectedProject.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  // API Key handlers
  const handleCreateApiKey = async () => {
    if (!newKey.name.trim() || !selectedProject) return;

    setIsCreatingKey(true);
    setApiKeyError("");

    try {
      const created = await apiKeysApi.create(selectedProject.id, {
        name: newKey.name.trim(),
        key_type: newKey.type,
      });
      setCreatedKey(created);
      // Reload API keys
      const data = await apiKeysApi.list(selectedProject.id);
      setApiKeys(data.items);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setApiKeyError(axiosError.response?.data?.detail || "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!selectedProject) return;

    try {
      await apiKeysApi.revoke(selectedProject.id, keyId);
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const copyToClipboard = async (text: string, keyId?: string) => {
    await navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const maskKey = (key: string) => {
    return key.slice(0, 12) + "..." + key.slice(-4);
  };

  const getRoleBadge = (role: ProjectRole) => (
    <Badge className={cn("capitalize", roleColors[role])}>
      {role === "owner" && <Crown className="h-3 w-3 mr-1" />}
      {role}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage projects, team members, API keys, and platform settings
        </p>
      </div>

      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <p className="text-sm text-slate-500">Manage your CartNudge projects</p>
            </div>
            <Button onClick={() => setShowCreateProject(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {projectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
              <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first project to get started.</p>
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project, index) => (
                <div key={project.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold bg-gradient-to-br",
                          [
                            "from-cyan-400 to-blue-500",
                            "from-violet-400 to-purple-500",
                            "from-amber-400 to-orange-500",
                            "from-emerald-400 to-green-500",
                          ][index % 4]
                        )}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{project.name}</h3>
                          {selectedProject?.id === project.id && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {project.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>
                            Created{" "}
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{project.members.length} members</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditProject({
                            id: project.id,
                            name: project.name,
                            description: project.description || "",
                          });
                          setShowEditProject(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setProjectToDelete(project.id);
                          setShowDeleteProject(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
              <p className="text-sm text-slate-500">
                {selectedProject
                  ? `Manage members of ${selectedProject.name}`
                  : "Select a project to manage team members"}
              </p>
            </div>
            <Button onClick={() => setShowInviteMember(true)} disabled={!selectedProject}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>

          {!selectedProject ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No project selected</h3>
              <p className="text-sm text-slate-500">Select a project from the sidebar to manage team members.</p>
            </div>
          ) : membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6">
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getRoleBadge(member.role)}
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
              <p className="text-sm text-slate-500">
                {selectedProject
                  ? `Manage API keys for ${selectedProject.name}`
                  : "Select a project to manage API keys"}
              </p>
            </div>
            <Button onClick={() => setShowCreateKey(true)} disabled={!selectedProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 text-sm">Keep your secret keys secure</p>
                <p className="text-xs text-amber-700 mt-1">
                  Never expose secret keys in client-side code. Use public keys for browser integrations.
                </p>
              </div>
            </div>
          </div>

          {!selectedProject ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
              <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No project selected</h3>
              <p className="text-sm text-slate-500">Select a project from the sidebar to manage API keys.</p>
            </div>
          ) : apiKeysLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
              <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No API keys yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create an API key to integrate with CartNudge.</p>
              <Button onClick={() => setShowCreateKey(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{key.name}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            key.key_type === "public" ? "text-blue-600" : "text-violet-600"
                          )}
                        >
                          {key.key_type}
                        </Badge>
                        {key.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-slate-100 px-3 py-1.5 rounded font-mono text-sm">
                          {showSecrets[key.id] ? key.key_prefix + "..." : maskKey(key.key_prefix + "...")}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setShowSecrets({ ...showSecrets, [key.id]: !showSecrets[key.id] })
                          }
                        >
                          {showSecrets[key.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(key.key_prefix, key.id)}
                        >
                          {copiedKey === key.id ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Last used {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRevokeApiKey(key.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Documentation Link */}
          <div className="bg-slate-50 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">API Documentation</p>
                  <p className="text-xs text-slate-500">
                    Learn how to integrate CartNudge into your application
                  </p>
                </div>
              </div>
              <Button variant="outline">
                View Docs
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Platform Settings</h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Webhook className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Webhook Retries</p>
                    <p className="text-xs text-slate-500">
                      Automatically retry failed webhook deliveries
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.webhookRetries}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, webhookRetries: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Rate Limiting</p>
                    <p className="text-xs text-slate-500">
                      Protect against excessive API requests
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.rateLimiting}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, rateLimiting: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Debug Mode</p>
                    <p className="text-xs text-slate-500">
                      Enable detailed logging for troubleshooting
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.debugMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, debugMode: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Data Retention</p>
                    <p className="text-xs text-slate-500">How long to keep event data</p>
                  </div>
                </div>
                <Select
                  value={settings.dataRetention}
                  onValueChange={(v) => setSettings({ ...settings, dataRetention: v })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new project to organize your nudge configurations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {projectError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {projectError}
              </div>
            )}
            <div>
              <Label>Project Name</Label>
              <Input
                placeholder="e.g., E-commerce Store"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What is this project for?"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProject(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || isCreatingProject}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditProject} onOpenChange={setShowEditProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {projectError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {projectError}
              </div>
            )}
            <div>
              <Label>Project Name</Label>
              <Input
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editProject.description}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProject(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProject}
              disabled={!editProject.name.trim() || isUpdatingProject}
            >
              {isUpdatingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={showDeleteProject} onOpenChange={setShowDeleteProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone
              and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          {projectError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {projectError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteProject(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeletingProject}>
              {isDeletingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {memberError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {memberError}
              </div>
            )}
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteMember(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={!inviteEmail.trim() || isInviting}>
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog
        open={showCreateKey}
        onOpenChange={(open) => {
          setShowCreateKey(open);
          if (!open) {
            setCreatedKey(null);
            setNewKey({ name: "", type: "secret" });
            setApiKeyError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Make sure to copy your API key now. You won't be able to see it again!"
                : "Generate a new API key for authentication."}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-900">Key created successfully!</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
                    {createdKey.key}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                This is the only time you'll see this key. Store it securely!
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {apiKeyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {apiKeyError}
                </div>
              )}
              <div>
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Production Server Key"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Key Type</Label>
                <Select
                  value={newKey.type}
                  onValueChange={(v) => setNewKey({ ...newKey, type: v as "public" | "secret" })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Client-side)</SelectItem>
                    <SelectItem value="secret">Secret (Server-side)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {newKey.type === "public"
                    ? "Safe to use in browser code"
                    : "Keep this key secure - never expose in client code"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button onClick={() => setShowCreateKey(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={!newKey.name.trim() || isCreatingKey}
                >
                  {isCreatingKey ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Generate Key"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
