import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-[hsl(210,20%,98%)]">
                <div className="container mx-auto px-8 py-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
