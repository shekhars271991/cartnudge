import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    Sparkles,
    TrendingUp,
    Zap,
    Shield,
} from "lucide-react";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Simulate login
        await new Promise(resolve => setTimeout(resolve, 1500));

        // For demo, accept any credentials
        if (email && password) {
            navigate("/");
        } else {
            setError("Please enter your email and password");
        }
        setIsLoading(false);
    };

    const features = [
        {
            icon: Sparkles,
            title: "AI-Powered Nudges",
            description: "Personalized interventions at the perfect moment",
        },
        {
            icon: TrendingUp,
            title: "Increase Conversions",
            description: "Up to 25% lift in purchase completion rates",
        },
        {
            icon: Zap,
            title: "Real-time Predictions",
            description: "ML models scoring users in milliseconds",
        },
        {
            icon: Shield,
            title: "Enterprise Ready",
            description: "SOC 2 compliant with 99.9% uptime SLA",
        },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px',
                    }} />
                </div>
                
                {/* Gradient Orbs */}
                <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

                {/* Content */}
                <div className="relative z-10">
                    {/* Logo */}
                    <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="text-white font-bold text-2xl">C</span>
                        </div>
                        <div>
                            <span className="text-2xl font-bold text-white tracking-tight">CartNudge</span>
                            <span className="text-2xl font-bold text-cyan-400">.ai</span>
                        </div>
                    </div>

                    <div className="mt-16">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Turn hesitation into<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                conversion
                            </span>
                        </h1>
                        <p className="mt-6 text-lg text-slate-400 max-w-md">
                            The AI-powered platform that predicts purchase intent and delivers 
                            personalized nudges to maximize your conversion rates.
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="relative z-10 grid grid-cols-2 gap-6 mt-auto">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div key={feature.title} className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm">{feature.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Testimonial */}
                <div className="relative z-10 mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-slate-300 italic">
                        "CartNudge increased our checkout completion rate by 23% in the first month. 
                        The AI predictions are incredibly accurate."
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            SM
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">Sarah Mitchell</p>
                            <p className="text-slate-400 text-xs">Head of E-commerce, TechStyle</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">CartNudge</span>
                            <span className="text-xl font-bold text-cyan-500">.ai</span>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                        <p className="text-slate-500 mt-2">Sign in to your account to continue</p>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Button variant="outline" className="h-11">
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" className="h-11">
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </Button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-slate-50 text-slate-500">or continue with email</span>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-11"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                <a href="#" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative mt-1.5">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10 h-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="remember" 
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            />
                            <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                                Remember me for 30 days
                            </label>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Don't have an account?{" "}
                        <a href="#" className="text-cyan-600 hover:text-cyan-700 font-medium">
                            Start your free trial
                        </a>
                    </p>

                    {/* Trust badges */}
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <p className="text-xs text-slate-400 text-center mb-4">Trusted by leading e-commerce brands</p>
                        <div className="flex items-center justify-center gap-8 opacity-50">
                            <div className="text-slate-400 font-bold text-lg">SHOPIFY</div>
                            <div className="text-slate-400 font-bold text-lg">WOO</div>
                            <div className="text-slate-400 font-bold text-lg">MAGENTO</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

