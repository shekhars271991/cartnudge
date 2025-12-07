import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function TrainingConfig() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Training Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Model Source</Label>
                    <Select defaultValue="proprietary">
                        <SelectTrigger>
                            <SelectValue placeholder="Select model source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="proprietary">Proprietary Small Model (Fast)</SelectItem>
                            <SelectItem value="gpt4">OpenAI GPT-4 (High Accuracy)</SelectItem>
                            <SelectItem value="huggingface">Custom HuggingFace Path</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Training Frequency</Label>
                    <RadioGroup defaultValue="nightly">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="nightly" id="nightly" />
                            <Label htmlFor="nightly">Nightly Batch</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="realtime" id="realtime" />
                            <Label htmlFor="realtime">Real-time Online Learning</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <Label htmlFor="manual">Manual Retrain</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <Label>Feature Selection</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="clickstream" defaultChecked />
                            <Label htmlFor="clickstream">Include Clickstream Data</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="orders" defaultChecked />
                            <Label htmlFor="orders">Include Past Orders</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="device" defaultChecked />
                            <Label htmlFor="device">Include Device Type</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="demographics" />
                            <Label htmlFor="demographics">Include Demographics</Label>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button className="w-full">Start Training</Button>
                </div>
            </CardContent>
        </Card>
    );
}
