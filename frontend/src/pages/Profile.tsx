import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
    User,
    Mail,
    Phone,
    Building2,
    Shield,
    LogOut,
    Camera,
    Edit2,
    Check,
    X,
    Users,
    UserPlus,
    Trash2,
    Crown,
    Key,
    Clock,
    Globe,
    Bell,
    Moon,
    Sun,
} from "lucide-react";

// Types
interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: "owner" | "admin" | "editor" | "viewer";
    avatar?: string;
    lastActive: string;
    joinedAt: string;
}

// Sample data
const currentUser = {
    id: "user_1",
    name: "John Doe",
    email: "john@company.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Inc.",
    role: "owner" as const,
    avatar: null,
    timezone: "America/New_York",
    joinedAt: "November 2024",
};

const teamMembers: TeamMember[] = [
    {
        id: "user_1",
        name: "John Doe",
        email: "john@company.com",
        role: "owner",
        lastActive: "Now",
        joinedAt: "Nov 2024",
    },
    {
        id: "user_2",
        name: "Jane Smith",
        email: "jane@company.com",
        role: "admin",
        lastActive: "2 hours ago",
        joinedAt: "Nov 2024",
    },
    {
        id: "user_3",
        name: "Robert Wilson",
        email: "robert@company.com",
        role: "editor",
        lastActive: "1 day ago",
        joinedAt: "Dec 2024",
    },
    {
        id: "user_4",
        name: "Emily Chen",
        email: "emily@company.com",
        role: "viewer",
        lastActive: "3 days ago",
        joinedAt: "Dec 2024",
    },
];

const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-700",
    admin: "bg-violet-100 text-violet-700",
    editor: "bg-blue-100 text-blue-700",
    viewer: "bg-slate-100 text-slate-700",
};

export default function Profile() {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(currentUser);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<string>("viewer");
    const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        weeklyDigest: false,
    });

    const handleSaveProfile = () => {
        // In real app, save to API
        setIsEditing(false);
    };

    const handleInvite = () => {
        // In real app, send invite via API
        console.log("Inviting:", { email: inviteEmail, role: inviteRole });
        setShowInviteDialog(false);
        setInviteEmail("");
        setInviteRole("viewer");
    };

    const handleLogout = () => {
        // In real app, clear auth and redirect
        console.log("Logging out...");
        setShowLogoutDialog(false);
    };

    const getRoleBadge = (role: string) => {
        return (
            <Badge className={cn("capitalize", roleColors[role])}>
                {role === "owner" && <Crown className="h-3 w-3 mr-1" />}
                {role}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your account and team settings</p>
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
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Team
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
                            <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
                            {!isEditing ? (
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditedUser(currentUser); }}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSaveProfile}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Save
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-start gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={currentUser.avatar || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl">
                                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                {isEditing && (
                                    <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors">
                                        <Camera className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Full Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={editedUser.name}
                                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{currentUser.name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Email Address</Label>
                                    {isEditing ? (
                                        <Input
                                            type="email"
                                            value={editedUser.email}
                                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{currentUser.email}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Phone Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={editedUser.phone}
                                            onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{currentUser.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Company</Label>
                                    {isEditing ? (
                                        <Input
                                            value={editedUser.company}
                                            onChange={(e) => setEditedUser({ ...editedUser, company: e.target.value })}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{currentUser.company}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Role</Label>
                                    <div className="mt-1">{getRoleBadge(currentUser.role)}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Member Since</Label>
                                    <p className="text-sm font-medium mt-1">{currentUser.joinedAt}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team" className="space-y-6">
                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                                <p className="text-sm text-slate-500">{teamMembers.length} members in your team</p>
                            </div>
                            <Button onClick={() => setShowInviteDialog(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite Member
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">{member.name}</p>
                                                {member.id === currentUser.id && (
                                                    <Badge variant="outline" className="text-xs">You</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            {getRoleBadge(member.role)}
                                            <p className="text-xs text-slate-400 mt-1">Active {member.lastActive}</p>
                                        </div>
                                        {member.role !== "owner" && member.id !== currentUser.id && (
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="space-y-6">
                    <div className="bg-white rounded-xl border p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Display Preferences</h2>
                        
                        <div className="space-y-6">
                            {/* Theme */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Theme</p>
                                    <p className="text-xs text-slate-500">Choose your preferred color scheme</p>
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
                                    <p className="text-xs text-slate-500">Used for scheduling and reports</p>
                                </div>
                                <Select defaultValue="America/New_York">
                                    <SelectTrigger className="w-[240px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Notification Preferences</h2>
                        
                        <div className="space-y-4">
                            {[
                                { key: "email", label: "Email Notifications", description: "Receive alerts via email" },
                                { key: "push", label: "Push Notifications", description: "Browser push notifications" },
                                { key: "weeklyDigest", label: "Weekly Digest", description: "Summary of platform activity" },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-slate-500">{item.description}</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications({ 
                                            ...notifications, 
                                            [item.key]: !notifications[item.key as keyof typeof notifications] 
                                        })}
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
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Password & Authentication</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                        <Key className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Password</p>
                                        <p className="text-xs text-slate-500">Last changed 30 days ago</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">
                                    Change Password
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Two-Factor Authentication</p>
                                        <p className="text-xs text-emerald-600">Enabled</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">
                                    Manage
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Active Sessions</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <Globe className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">Chrome on macOS</p>
                                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Current</Badge>
                                        </div>
                                        <p className="text-xs text-slate-500">New York, US • Active now</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                        <Globe className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Safari on iPhone</p>
                                        <p className="text-xs text-slate-500">New York, US • 2 days ago</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    Revoke
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
                        <p className="text-sm text-red-700 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-100">
                            Delete Account
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Invite Member Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                            Send an invitation to join your team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="colleague@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleInvite}
                            disabled={!inviteEmail.trim()}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            Send Invitation
                        </Button>
                    </DialogFooter>
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
                        <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

