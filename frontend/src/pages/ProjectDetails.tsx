import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { membersApi, projectsApi } from "@/lib/api";
import type { ProjectMember, ProjectRole, Project } from "@/lib/api";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AxiosError } from "axios";
import type { ApiError } from "@/lib/api";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  UserPlus,
  Crown,
  Loader2,
  Users,
  Calendar,
  Save,
  X,
} from "lucide-react";

// Role badge colors
const roleColors: Record<ProjectRole, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-violet-100 text-violet-700",
  developer: "bg-blue-100 text-blue-700",
  viewer: "bg-slate-100 text-slate-700",
};

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, selectProject, updateProject, deleteProject } = useProject();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Contributors state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("developer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Load project from local state or fetch
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        navigate("/settings");
        return;
      }

      setIsLoading(true);

      // First try to find from local state
      const localProject = projects.find((p) => p.id === projectId);
      if (localProject) {
        setProject(localProject);
        setEditedName(localProject.name);
        setEditedDescription(localProject.description || "");
        setIsLoading(false);
      } else {
        // Fetch from API
        try {
          const fetched = await projectsApi.get(projectId);
          setProject(fetched);
          setEditedName(fetched.name);
          setEditedDescription(fetched.description || "");
        } catch (error) {
          console.error("Failed to load project:", error);
          navigate("/settings");
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProject();
  }, [projectId, projects, navigate]);

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!projectId) return;

      setMembersLoading(true);
      try {
        const data = await membersApi.list(projectId);
        setMembers(data);
      } catch (error) {
        console.error("Failed to load members:", error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [projectId]);

  const handleSave = async () => {
    if (!projectId || !editedName.trim()) return;

    setIsSaving(true);
    setSaveError("");

    try {
      const updated = await updateProject(
        projectId,
        editedName.trim(),
        editedDescription.trim() || undefined
      );
      setProject(updated);
      setIsEditing(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setSaveError(axiosError.response?.data?.detail || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;

    setIsDeleting(true);

    try {
      await deleteProject(projectId);
      navigate("/settings");
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !projectId) return;

    setIsInviting(true);
    setInviteError("");

    try {
      await membersApi.invite(projectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("developer");
      // Reload members
      const data = await membersApi.list(projectId);
      setMembers(data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setInviteError(axiosError.response?.data?.detail || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;

    try {
      await membersApi.remove(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const getRoleBadge = (role: ProjectRole) => (
    <Badge className={cn("capitalize", roleColors[role])}>
      {role === "owner" && <Crown className="h-3 w-3 mr-1" />}
      {role}
    </Badge>
  );

  const handleSelectProject = () => {
    if (project) {
      selectProject(project);
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Project not found</h2>
        <Link to="/settings" className="text-blue-600 hover:underline mt-2 block">
          Back to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Project Details</h1>
          <p className="text-slate-500 mt-1">
            View and manage project information and contributors
          </p>
        </div>
        <Button onClick={handleSelectProject} variant="outline">
          Open Project
        </Button>
      </div>

      {/* Project Info Card */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Project Information</h2>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {saveError}
              </div>
            )}
            <div>
              <Label>Project Name</Label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="mt-1.5"
                placeholder="My Project"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="mt-1.5"
                placeholder="Describe your project..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={!editedName.trim() || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditedName(project.name);
                  setEditedDescription(project.description || "");
                  setSaveError("");
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-cyan-400 to-blue-500">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900">{project.name}</h3>
                <p className="text-slate-500 mt-1">
                  {project.description || "No description provided"}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {members.length} contributor{members.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contributors Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contributors</h2>
            <p className="text-sm text-slate-500">
              People who have access to this project
            </p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Contributor
          </Button>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No contributors yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Invite people to collaborate on this project.
            </p>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Contributor
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
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
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Once you delete a project, there is no going back. Please be certain.
        </p>
        <Button
          variant="outline"
          className="text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Contributor</DialogTitle>
            <DialogDescription>
              Invite someone to contribute to {project.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {inviteError}
              </div>
            )}
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="contributor@company.com"
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
                  <SelectItem value="admin">Admin - Can manage project settings</SelectItem>
                  <SelectItem value="developer">Developer - Can edit data and pipelines</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
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
    </div>
  );
}

