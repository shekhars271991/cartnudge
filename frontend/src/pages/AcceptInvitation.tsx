import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { membersApi } from "@/lib/api";
import type { Invitation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
import type { ApiError } from "@/lib/api";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Users,
  ArrowRight,
} from "lucide-react";

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshProjects } = useProject();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setIsLoading(false);
        return;
      }

      try {
        const data = await membersApi.getInvitation(token);
        setInvitation(data);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        setError(
          axiosError.response?.data?.detail ||
            "This invitation is invalid or has expired."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !isAuthenticated) return;

    setIsAccepting(true);
    setError("");

    try {
      await membersApi.acceptInvitation(token);
      setIsAccepted(true);
      // Refresh projects list to include the new project
      await refreshProjects();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(
        axiosError.response?.data?.detail ||
          "Failed to accept invitation. Please try again."
      );
    } finally {
      setIsAccepting(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading invitation...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Invalid Invitation</h2>
          <p className="text-slate-500 mt-2 mb-8">{error}</p>
          <Link to="/">
            <Button className="bg-slate-900 hover:bg-slate-800">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome to {invitation?.project_name}!
          </h2>
          <p className="text-slate-500 mt-2 mb-8">
            You've successfully joined the project as a {invitation?.role}.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-slate-900 hover:bg-slate-800"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Not authenticated - prompt to login/register
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                CartNudge
              </span>
              <span className="text-xl font-bold text-cyan-500">.ai</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              You've been invited!
            </h2>
            <p className="text-slate-500 mt-2">
              <span className="font-medium text-slate-700">
                {invitation?.invited_by_name}
              </span>{" "}
              invited you to join{" "}
              <span className="font-medium text-slate-700">
                {invitation?.project_name}
              </span>{" "}
              as a <span className="capitalize">{invitation?.role}</span>.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                to={`/login?redirect=/invitation/${token}`}
                className="block"
              >
                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800">
                  Sign in to accept
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link
                to={`/register?redirect=/invitation/${token}`}
                className="block"
              >
                <Button variant="outline" className="w-full h-11">
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show accept button
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              CartNudge
            </span>
            <span className="text-xl font-bold text-cyan-500">.ai</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-violet-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Join {invitation?.project_name}
          </h2>
          <p className="text-slate-500 mt-2">
            <span className="font-medium text-slate-700">
              {invitation?.invited_by_name}
            </span>{" "}
            invited you to join as a{" "}
            <span className="capitalize font-medium text-slate-700">
              {invitation?.role}
            </span>
            .
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleAccept}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  Accept invitation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full h-11">
                Decline
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

