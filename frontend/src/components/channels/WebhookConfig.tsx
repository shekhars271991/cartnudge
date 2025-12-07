import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Code2 } from "lucide-react";

export function WebhookConfig() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Code2 className="mr-2 h-5 w-5 text-slate-500" />
                    Universal API (Developer Choice)
                </CardTitle>
                <CardDescription>Configure a custom webhook to receive nudge payloads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input id="webhook-url" placeholder="https://api.mystore.com/v1/apply-discount" />
                    <p className="text-xs text-slate-500">We will send a POST request to this URL when a nudge is triggered.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="payload">JSON Payload Template</Label>
                    <Textarea
                        id="payload"
                        className="font-mono text-sm h-48"
                        defaultValue={`{
  "event": "nudge_triggered",
  "user_id": "{{user.id}}",
  "prediction_score": {{prediction.score}},
  "strategy": "{{workflow.name}}",
  "action": {
    "type": "discount",
    "value": "10%"
  }
}`}
                    />
                    <p className="text-xs text-slate-500">Define the JSON structure using Mustache syntax for dynamic variables.</p>
                </div>

                <div className="flex justify-end">
                    <Button>Save Webhook Configuration</Button>
                </div>
            </CardContent>
        </Card>
    );
}
