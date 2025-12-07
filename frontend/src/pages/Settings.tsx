import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";

export default function Settings() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your workspace and API keys.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Use these keys to authenticate your requests to the CartNudge API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="public-key">Public Key (Client-Side)</Label>
                        <div className="flex space-x-2">
                            <Input id="public-key" value="pk_live_51M..." readOnly className="font-mono bg-slate-50" />
                            <Button variant="outline" size="icon">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="secret-key">Secret Key (Server-Side)</Label>
                        <div className="flex space-x-2">
                            <Input id="secret-key" value="sk_live_51M..." type="password" readOnly className="font-mono bg-slate-50" />
                            <Button variant="outline" size="icon">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to this workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar>
                                <AvatarImage src="/avatars/01.png" alt="John Doe" />
                                <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-none">John Doe</p>
                                <p className="text-sm text-slate-500">john@example.com</p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500">Owner</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar>
                                <AvatarFallback>JS</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-none">Jane Smith</p>
                                <p className="text-sm text-slate-500">jane@example.com</p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500">Admin</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar>
                                <AvatarFallback>RW</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-none">Robert Wilson</p>
                                <p className="text-sm text-slate-500">robert@example.com</p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500">Viewer</div>
                    </div>

                    <div className="pt-4">
                        <Button variant="outline">Invite Team Member</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
