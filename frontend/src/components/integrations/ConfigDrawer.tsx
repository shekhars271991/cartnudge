import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, PlayCircle } from "lucide-react";
import { useState } from "react";

interface ConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    connectorName: string;
}

interface MappingRow {
    id: string;
    source: string;
    system: string;
}

export function ConfigDrawer({ isOpen, onClose, connectorName }: ConfigDrawerProps) {
    const [profileMappings, setProfileMappings] = useState<MappingRow[]>([
        { id: "1", source: "customer.email", system: "user.email" },
        { id: "2", source: "customer.first_name", system: "user.first_name" },
        { id: "3", source: "customer.id", system: "user.id" },
    ]);

    const [orderMappings, setOrderMappings] = useState<MappingRow[]>([
        { id: "1", source: "order.total_price", system: "order.amount" },
        { id: "2", source: "order.currency", system: "order.currency" },
        { id: "3", source: "order.created_at", system: "order.timestamp" },
    ]);

    const addMapping = (setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>) => {
        setMappings((prev) => [
            ...prev,
            { id: Math.random().toString(), source: "", system: "" },
        ]);
    };

    const removeMapping = (
        id: string,
        setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>
    ) => {
        setMappings((prev) => prev.filter((row) => row.id !== id));
    };

    const updateMapping = (
        id: string,
        field: "source" | "system",
        value: string,
        setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>
    ) => {
        setMappings((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );
    };

    const renderMappingTable = (
        mappings: MappingRow[],
        setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>
    ) => (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Source Field (External)</TableHead>
                            <TableHead>System Field (Internal)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mappings.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Input
                                        value={row.source}
                                        onChange={(e) =>
                                            updateMapping(row.id, "source", e.target.value, setMappings)
                                        }
                                        placeholder="e.g. customer.email"
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={row.system}
                                        onChange={(e) =>
                                            updateMapping(row.id, "system", e.target.value, setMappings)
                                        }
                                        placeholder="e.g. user.email"
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                        onClick={() => removeMapping(row.id, setMappings)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => addMapping(setMappings)}
            >
                <Plus className="mr-2 h-4 w-4" /> Add Field Mapping
            </Button>
        </div>
    );

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Configure {connectorName}</SheetTitle>
                    <SheetDescription>
                        Map your incoming data fields to CartNudge's internal schema.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-900">Connection Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">API Key</Label>
                                <Input id="api-key" type="password" placeholder="sk_live_..." />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="store-url">Store URL</Label>
                                <Input id="store-url" placeholder="https://..." />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button variant="secondary" size="sm">
                                <PlayCircle className="mr-2 h-4 w-4" /> Test Connection
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profile">User Profile</TabsTrigger>
                            <TabsTrigger value="orders">Orders</TabsTrigger>
                            <TabsTrigger value="events">Custom Events</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="mt-4 space-y-4">
                            <div className="text-sm text-slate-500">
                                Map user identity fields. Required for user unification.
                            </div>
                            {renderMappingTable(profileMappings, setProfileMappings)}
                        </TabsContent>

                        <TabsContent value="orders" className="mt-4 space-y-4">
                            <div className="text-sm text-slate-500">
                                Map transaction fields. Required for LTV and revenue attribution.
                            </div>
                            {renderMappingTable(orderMappings, setOrderMappings)}
                        </TabsContent>

                        <TabsContent value="events" className="mt-4 space-y-4">
                            <div className="text-sm text-slate-500">
                                Map custom behavioral events (e.g. "Added to Wishlist").
                            </div>
                            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-slate-400">
                                Event mapping configuration coming soon...
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="pt-4 flex justify-end space-x-2 sticky bottom-0 bg-white py-4 border-t">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={onClose}>Save Configuration</Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
