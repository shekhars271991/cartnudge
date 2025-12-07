import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function WebhookConfig() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-900">Webhook URL</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-blue-600">
                        <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
                    </Button>
                </div>
                <div className="flex space-x-2">
                    <Input value="https://api.cartnudge.ai/v1/hooks/pl_123456" readOnly className="font-mono bg-white" />
                    <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    Send POST requests to this URL. We support JSON payloads up to 1MB.
                </p>
            </div>

            <div className="space-y-2">
                <Label>Secret Key (HMAC)</Label>
                <div className="flex space-x-2">
                    <Input type="password" value="whsec_..." readOnly className="font-mono" />
                    <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-sm text-slate-500">Used to sign requests for security verification.</p>
            </div>

            <div className="space-y-2">
                <Label>Expected Payload Schema (JSON)</Label>
                <Textarea
                    className="font-mono h-32"
                    placeholder={`{
  "event_type": "order.created",
  "data": { ... }
}`}
                />
            </div>
        </div>
    );
}
