/**
 * Empty state component shown when no project is selected or exists
 */

import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";
import { FolderOpen, Plus, Loader2 } from "lucide-react";

interface EmptyProjectStateProps {
  title?: string;
  description?: string;
}

export function EmptyProjectState({
  title = "No Project Selected",
  description = "Create or select a project to get started with CartNudge.",
}: EmptyProjectStateProps) {
  const { projects, isLoading, setShowCreateDialog } = useProject();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasProjects = projects.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-6">
        <FolderOpen className="w-10 h-10 text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
        {hasProjects ? title : "Create Your First Project"}
      </h2>
      <p className="text-slate-500 text-center max-w-md mb-8">
        {hasProjects
          ? description
          : "Get started by creating a project. Projects help you organize your data, models, and nudge configurations."}
      </p>
      <Button
        size="lg"
        onClick={() => setShowCreateDialog(true)}
        className="gap-2"
      >
        <Plus className="h-5 w-5" />
        {hasProjects ? "Create New Project" : "Create Your First Project"}
      </Button>
    </div>
  );
}

export default EmptyProjectState;

