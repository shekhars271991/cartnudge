import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function ShopifyConfig() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <Label>Store URL</Label>
                <Input placeholder="https://your-store.myshopify.com" />
                <p className="text-sm text-slate-500">The URL of your Shopify store.</p>
            </div>

            <div className="space-y-2">
                <Label>Admin API Access Token</Label>
                <Input type="password" placeholder="shpat_..." />
                <p className="text-sm text-slate-500">Generated from a Custom App in Shopify Admin.</p>
            </div>

            <div className="space-y-3">
                <Label>Sync Scopes</Label>
                <div className="flex items-center space-x-2">
                    <Checkbox id="orders" defaultChecked />
                    <Label htmlFor="orders" className="font-normal">Orders (read_orders)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="customers" defaultChecked />
                    <Label htmlFor="customers" className="font-normal">Customers (read_customers)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="products" />
                    <Label htmlFor="products" className="font-normal">Products (read_products)</Label>
                </div>
            </div>
        </div>
    );
}
