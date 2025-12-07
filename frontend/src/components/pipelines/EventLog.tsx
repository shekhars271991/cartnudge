import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Eye, CheckCircle, AlertCircle } from "lucide-react";

const events = [
    {
        id: "evt_1",
        timestamp: "2023-10-27 10:45:23",
        type: "order.created",
        status: "processed",
        latency: "120ms",
        payload: {
            id: 1001,
            total: 129.99,
            currency: "USD",
            customer: {
                id: "cust_55",
                email: "alice@example.com"
            },
            items: [
                { sku: "SKU-123", quantity: 1, price: 129.99 }
            ]
        }
    },
    {
        id: "evt_2",
        timestamp: "2023-10-27 10:42:10",
        type: "customer.updated",
        status: "processed",
        latency: "95ms",
        payload: {
            id: "cust_55",
            first_name: "Alice",
            last_name: "Smith",
            tags: ["vip", "repeat_buyer"]
        }
    },
    {
        id: "evt_3",
        timestamp: "2023-10-27 10:30:05",
        type: "order.cancelled",
        status: "error",
        latency: "450ms",
        error: "Schema validation failed: missing 'reason'",
        payload: {
            id: 1000,
            status: "cancelled"
        }
    },
    {
        id: "evt_4",
        timestamp: "2023-10-27 10:15:00",
        type: "cart.abandoned",
        status: "processed",
        latency: "110ms",
        payload: {
            cart_id: "cart_888",
            value: 45.00,
            url: "https://store.com/checkout?token=..."
        }
    }
];

export function EventLog() {
    const [selectedEvent, setSelectedEvent] = useState<typeof events[0] | null>(null);

    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {events.map((event) => (
                        <TableRow key={event.id}>
                            <TableCell className="text-slate-500 font-mono text-xs">{event.timestamp}</TableCell>
                            <TableCell className="font-mono text-xs">{event.id}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-mono font-normal">
                                    {event.type}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {event.status === "processed" ? (
                                    <div className="flex items-center text-green-600 text-xs font-medium">
                                        <CheckCircle className="mr-1 h-3 w-3" /> Processed
                                    </div>
                                ) : (
                                    <div className="flex items-center text-red-600 text-xs font-medium">
                                        <AlertCircle className="mr-1 h-3 w-3" /> Error
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">{event.latency}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedEvent(event)}
                                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    <Eye className="mr-1 h-3 w-3" /> View Payload
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Event Details</SheetTitle>
                        <SheetDescription>
                            Viewing payload for event <span className="font-mono text-slate-900">{selectedEvent?.id}</span>
                        </SheetDescription>
                    </SheetHeader>

                    {selectedEvent && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="text-slate-500 block mb-1">Timestamp</label>
                                    <div className="font-medium">{selectedEvent.timestamp}</div>
                                </div>
                                <div>
                                    <label className="text-slate-500 block mb-1">Type</label>
                                    <Badge variant="outline">{selectedEvent.type}</Badge>
                                </div>
                                <div>
                                    <label className="text-slate-500 block mb-1">Status</label>
                                    <div className={cn(
                                        "font-medium inline-flex items-center",
                                        selectedEvent.status === "processed" ? "text-green-600" : "text-red-600"
                                    )}>
                                        {selectedEvent.status === "processed" ? (
                                            <><CheckCircle className="mr-1 h-3 w-3" /> Processed</>
                                        ) : (
                                            <><AlertCircle className="mr-1 h-3 w-3" /> Error</>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-slate-500 block mb-1">Latency</label>
                                    <div className="font-medium">{selectedEvent.latency}</div>
                                </div>
                            </div>

                            {selectedEvent.error && (
                                <div className="rounded-md bg-red-50 p-4 border border-red-100">
                                    <h4 className="text-red-800 font-medium text-sm mb-1">Error Details</h4>
                                    <p className="text-red-600 text-sm">{selectedEvent.error}</p>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-medium mb-2">JSON Payload</h4>
                                <div className="rounded-md bg-slate-950 p-4 overflow-x-auto">
                                    <pre className="text-xs font-mono text-blue-300">
                                        {JSON.stringify(selectedEvent.payload, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Helper for cn if not imported (though it usually is in my setup)
import { cn } from "@/lib/utils";
