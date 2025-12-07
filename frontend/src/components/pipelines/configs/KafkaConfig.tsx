import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function KafkaConfig() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <Label>Bootstrap Servers</Label>
                <Input placeholder="broker1:9092,broker2:9092" />
                <p className="text-sm text-slate-500">Comma-separated list of broker addresses.</p>
            </div>

            <div className="space-y-2">
                <Label>Topic Name</Label>
                <Input placeholder="user-events" />
            </div>

            <div className="space-y-2">
                <Label>Consumer Group ID</Label>
                <Input placeholder="cartnudge-consumer-group" />
            </div>

            <div className="space-y-2">
                <Label>Authentication Protocol</Label>
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Select protocol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="plaintext">PLAINTEXT</SelectItem>
                        <SelectItem value="sasl_ssl">SASL_SSL</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
