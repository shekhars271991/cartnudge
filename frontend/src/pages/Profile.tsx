import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  User,
  Shield,
  LogOut,
  Edit2,
  Check,
  X,
  Key,
  Globe,
  Bell,
  Moon,
  Sun,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Logout
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Preferences (local only for now)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyDigest: false,
  });

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      setProfileError("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    setProfileError("");

    try {
      await usersApi.updateMe({ name: editedName.trim() });
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setProfileError(
        axiosError.response?.data?.detail || "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setPasswordError(
        axiosError.response?.data?.detail || "Failed to change password"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      await usersApi.deleteAccount();
      await logout();
      navigate("/login");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setDeleteError(
        axiosError.response?.data?.detail || "Failed to delete account"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Personal Information
              </h2>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedName(user.name);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileError("");
                    }}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>

            {profileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {profileError}
              </div>
            )}

            <div className="flex items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {/* Details */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Full Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{user.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email Address</Label>
                  <p className="text-sm font-medium mt-1">{user.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Account Status</Label>
                  <p className="text-sm font-medium mt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Member Since</Label>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Display Preferences
            </h2>

            <div className="space-y-6">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Theme</p>
                  <p className="text-xs text-slate-500">
                    Choose your preferred color scheme
                  </p>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: "light", icon: Sun, label: "Light" },
                    { value: "dark", icon: Moon, label: "Dark" },
                    { value: "system", icon: Globe, label: "System" },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as typeof theme)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                          theme === option.value
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Timezone</p>
                  <p className="text-xs text-slate-500">
                    Used for scheduling and reports
                  </p>
                </div>
                <Select defaultValue="America/New_York">
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time (CT)
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time (MT)
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Notification Preferences
            </h2>

            <div className="space-y-4">
              {[
                {
                  key: "email",
                  label: "Email Notifications",
                  description: "Receive alerts via email",
                },
                {
                  key: "push",
                  label: "Push Notifications",
                  description: "Browser push notifications",
                },
                {
                  key: "weeklyDigest",
                  label: "Weekly Digest",
                  description: "Summary of platform activity",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        [item.key]:
                          !notifications[item.key as keyof typeof notifications],
                      })
                    }
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications[item.key as keyof typeof notifications]
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        notifications[item.key as keyof typeof notifications]
                          ? "translate-x-6"
                          : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Password
            </h2>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                  <Key className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Password</p>
                  <p className="text-xs text-slate-500">
                    Change your account password
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
              >
                Change Password
              </Button>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Danger Zone
            </h2>
            <p className="text-sm text-red-700 mb-4">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-100"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>

          {passwordSuccess ? (
            <div className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600">
                Password changed successfully!
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {passwordError}
                </div>
              )}

              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="newPassword"
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  {showPasswords ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide passwords
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show passwords
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!passwordSuccess && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordError("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all associated data.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
