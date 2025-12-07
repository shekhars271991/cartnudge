import { ChannelList } from "../components/channels/ChannelList";
import { WebhookConfig } from "../components/channels/WebhookConfig";

export default function Channels() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Output Channels</h1>
                <p className="text-slate-500">Configure how and where your nudges are delivered.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChannelList />
                <WebhookConfig />
            </div>
        </div>
    );
}
