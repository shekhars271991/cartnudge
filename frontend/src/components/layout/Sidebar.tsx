import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Plug,
    Database,
    BrainCircuit,
    Workflow,
    Radio,
    Settings,
    ChevronRight,
    Rocket,
} from "lucide-react";
import ProjectSwitcher from "./ProjectSwitcher";

export function Sidebar() {
    const location = useLocation();

    const dataLinks = [
        { href: "/user-modeling", label: "User Modeling", icon: Users },
        { href: "/feature-pipelines", label: "Feature Pipelines", icon: Plug },
        { href: "/feature-store", label: "Feature Store", icon: Database },
    ];

    const aiLinks = [
        { href: "/models", label: "Prediction Models", icon: BrainCircuit },
        { href: "/workflows", label: "Nudge Workflows", icon: Workflow },
        { href: "/channels", label: "Output Channels", icon: Radio },
    ];

    const operationsLinks = [
        { href: "/deployments", label: "Deployments", icon: Rocket },
    ];

    const otherLinks = [
        { href: "/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-[hsl(222,47%,6%)] border-r border-[hsl(217,33%,15%)]">
            {/* Logo */}
            <div className="p-6 pb-4">
                <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <div>
                        <span className="text-lg font-semibold text-white tracking-tight">CartNudge</span>
                        <span className="text-lg font-semibold text-cyan-400">.ai</span>
                    </div>
                </div>
            </div>

            {/* Project Switcher */}
            <div className="px-4 pb-4">
                <ProjectSwitcher />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto sidebar-scroll py-2">
                <nav className="px-3 space-y-6">
                    {/* Dashboard */}
                    <div>
                        <Link
                            to="/"
                            className={cn(
                                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-sidebar",
                                location.pathname === "/"
                                    ? "bg-[hsl(217,33%,12%)] text-white"
                                    : "text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,10%)] hover:text-white"
                            )}
                        >
                            <div className={cn(
                                "mr-3 flex h-8 w-8 items-center justify-center rounded-md transition-sidebar",
                                location.pathname === "/"
                                    ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-400" 
                                    : "text-[hsl(215,20%,55%)] group-hover:text-white"
                            )}>
                                <LayoutDashboard className="h-[18px] w-[18px]" />
                            </div>
                            <span className="flex-1">Dashboard</span>
                            {location.pathname === "/" && (
                                <ChevronRight className="h-4 w-4 text-cyan-400 opacity-60" />
                            )}
                        </Link>
                    </div>

                    {/* Data Platform Section */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(215,20%,40%)]">
                            Data Platform
                        </p>
                        <div className="space-y-1">
                            {dataLinks.map((item) => {
                                const isActive = location.pathname === item.href || 
                                    (item.href !== "/" && location.pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.href}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-sidebar",
                                            isActive
                                                ? "bg-[hsl(217,33%,12%)] text-white"
                                                : "text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,10%)] hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "mr-3 flex h-8 w-8 items-center justify-center rounded-md transition-sidebar",
                                            isActive 
                                                ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-400" 
                                                : "text-[hsl(215,20%,55%)] group-hover:text-white"
                                        )}>
                                            <item.icon className="h-[18px] w-[18px]" />
                                        </div>
                                        <span className="flex-1">{item.label}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 text-cyan-400 opacity-60" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI & Automation Section */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(215,20%,40%)]">
                            AI & Automation
                        </p>
                        <div className="space-y-1">
                            {aiLinks.map((item) => {
                                const isActive = location.pathname === item.href || 
                                    (item.href !== "/" && location.pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.href}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-sidebar",
                                            isActive
                                                ? "bg-[hsl(217,33%,12%)] text-white"
                                                : "text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,10%)] hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "mr-3 flex h-8 w-8 items-center justify-center rounded-md transition-sidebar",
                                            isActive 
                                                ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-400" 
                                                : "text-[hsl(215,20%,55%)] group-hover:text-white"
                                        )}>
                                            <item.icon className="h-[18px] w-[18px]" />
                                        </div>
                                        <span className="flex-1">{item.label}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 text-cyan-400 opacity-60" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Operations Section */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(215,20%,40%)]">
                            Operations
                        </p>
                        <div className="space-y-1">
                            {operationsLinks.map((item) => {
                                const isActive = location.pathname === item.href || 
                                    (item.href !== "/" && location.pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.href}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-sidebar",
                                            isActive
                                                ? "bg-[hsl(217,33%,12%)] text-white"
                                                : "text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,10%)] hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "mr-3 flex h-8 w-8 items-center justify-center rounded-md transition-sidebar",
                                            isActive 
                                                ? "bg-gradient-to-br from-violet-400/20 to-purple-500/20 text-violet-400" 
                                                : "text-[hsl(215,20%,55%)] group-hover:text-white"
                                        )}>
                                            <item.icon className="h-[18px] w-[18px]" />
                                        </div>
                                        <span className="flex-1">{item.label}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 text-violet-400 opacity-60" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Settings */}
                    <div>
                        {otherLinks.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.href}
                                    className={cn(
                                        "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-sidebar",
                                        isActive
                                            ? "bg-[hsl(217,33%,12%)] text-white"
                                            : "text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,10%)] hover:text-white"
                                    )}
                                >
                                    <div className={cn(
                                        "mr-3 flex h-8 w-8 items-center justify-center rounded-md transition-sidebar",
                                        isActive 
                                            ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-400" 
                                            : "text-[hsl(215,20%,55%)] group-hover:text-white"
                                    )}>
                                        <item.icon className="h-[18px] w-[18px]" />
                                    </div>
                                    <span className="flex-1">{item.label}</span>
                                    {isActive && (
                                        <ChevronRight className="h-4 w-4 text-cyan-400 opacity-60" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* User Profile */}
            <div className="border-t border-[hsl(217,33%,15%)] p-4">
                <div className="flex items-center rounded-lg p-2 hover:bg-[hsl(217,33%,10%)] transition-sidebar cursor-pointer">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        JD
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">John Doe</p>
                        <p className="text-xs text-[hsl(215,20%,55%)] truncate">john@company.com</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[hsl(215,20%,45%)]" />
                </div>
            </div>
        </div>
    );
}
