import { useState } from "react";
import { ConnectorCard, type SyncStatus } from "../components/integrations/ConnectorCard";
import { ConfigDrawer } from "../components/integrations/ConfigDrawer";
import { ShoppingBag, Database, BarChart3, Snowflake, Webhook } from "lucide-react";

const connectors = [
    {
        id: "shopify",
        title: "Shopify",
        description: "Sync orders, customers, and cart events in real-time.",
        icon: ShoppingBag,
        status: "connected" as const,
        syncStatus: "synced" as SyncStatus,
        lastSync: "2 mins ago",
    },
    {
        id: "segment",
        title: "Segment.com",
        description: "Ingest clickstream data from your existing CDP.",
        icon: Database,
        status: "connected" as const,
        syncStatus: "syncing" as SyncStatus,
        lastSync: "Syncing now...",
    },
    {
        id: "ga4",
        title: "Google Analytics 4",
        description: "Import session data and user behavior metrics.",
        icon: BarChart3,
        status: "disconnected" as const,
        syncStatus: "error" as SyncStatus,
        lastSync: "Failed 1 hour ago",
    },
    {
        id: "snowflake",
        title: "Snowflake",
        description: "Batch sync historical data for model training.",
        icon: Snowflake,
        status: "disconnected" as const,
        syncStatus: "disconnected" as SyncStatus,
    },
    {
        id: "custom",
        title: "Custom Webhook",
        description: "POST JSON events to a dedicated endpoint.",
        icon: Webhook,
        status: "connected" as const,
        syncStatus: "synced" as SyncStatus,
        lastSync: "Real-time",
    },
];

export default function Integrations() {
    const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Data Integrations</h1>
                <p className="text-slate-500">Connect your data sources to feed the prediction models.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map((connector) => (
                    <ConnectorCard
                        key={connector.id}
                        title={connector.title}
                        description={connector.description}
                        icon={connector.icon}
                        status={connector.status}
                        syncStatus={connector.syncStatus}
                        lastSync={connector.lastSync}
                        onConfigure={() => setSelectedConnector(connector.title)}
                    />
                ))}
            </div>

            <ConfigDrawer
                isOpen={!!selectedConnector}
                onClose={() => setSelectedConnector(null)}
                connectorName={selectedConnector || ""}
            />
        </div>
    );
}
