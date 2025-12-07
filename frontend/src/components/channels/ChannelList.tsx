import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Mail, MessageSquare } from "lucide-react";

export function ChannelList() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Channels</CardTitle>
                <CardDescription>Manage where your nudges are delivered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <Label htmlFor="sdk" className="text-base font-medium">Client-Side SDK</Label>
                            <p className="text-sm text-slate-500">Enable the browser overlay widget on your site.</p>
                        </div>
                    </div>
                    <Switch id="sdk" defaultChecked />
                </div>

                <div className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-4">
                        <div className="bg-green-100 p-2 rounded-full">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <Label htmlFor="whatsapp" className="text-base font-medium">WhatsApp</Label>
                            <p className="text-sm text-slate-500">Send messages via Twilio integration.</p>
                        </div>
                    </div>
                    <Switch id="whatsapp" />
                </div>

                <div className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-4">
                        <div className="bg-purple-100 p-2 rounded-full">
                            <Mail className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-base font-medium">Email</Label>
                            <p className="text-sm text-slate-500">Send emails via SendGrid integration.</p>
                        </div>
                    </div>
                    <Switch id="email" defaultChecked />
                </div>
            </CardContent>
        </Card>
    );
}
