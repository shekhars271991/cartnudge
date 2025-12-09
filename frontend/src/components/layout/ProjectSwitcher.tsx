import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Project colors for visual identification
const projectColors = [
  "from-cyan-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-blue-500",
];

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>;

interface ProjectSwitcherProps extends PopoverTriggerProps {}

export default function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const {
    projects,
    selectedProject,
    isLoading,
    selectProject,
    createProject,
  } = useProject();

  const [open, setOpen] = React.useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectDescription, setNewProjectDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState("");

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    setCreateError("");

    try {
      await createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      setShowNewProjectDialog(false);
      setNewProjectName("");
      setNewProjectDescription("");
    } catch (error) {
      setCreateError("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getProjectColor = (index: number) => {
    return projectColors[index % projectColors.length];
  };

  const getProjectInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        className={cn(
          "w-full justify-center bg-[hsl(217,33%,10%)] border-[hsl(217,33%,18%)] text-white",
          className
        )}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // No projects state
  if (projects.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setShowNewProjectDialog(true)}
          className={cn(
            "w-full justify-center gap-2 bg-[hsl(217,33%,10%)] border-[hsl(217,33%,18%)] text-white hover:bg-[hsl(217,33%,14%)] hover:text-white hover:border-[hsl(217,33%,22%)]",
            className
          )}
        >
          <Plus className="h-4 w-4" />
          Create Project
        </Button>

        <CreateProjectDialog
          open={showNewProjectDialog}
          onOpenChange={setShowNewProjectDialog}
          name={newProjectName}
          setName={setNewProjectName}
          description={newProjectDescription}
          setDescription={setNewProjectDescription}
          onCreate={handleCreateProject}
          isCreating={isCreating}
          error={createError}
        />
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a project"
            className={cn(
              "w-full justify-between bg-[hsl(217,33%,10%)] border-[hsl(217,33%,18%)] text-white hover:bg-[hsl(217,33%,14%)] hover:text-white hover:border-[hsl(217,33%,22%)]",
              className
            )}
          >
            {selectedProject ? (
              <>
                <div
                  className={cn(
                    "mr-2 h-5 w-5 rounded flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br",
                    getProjectColor(
                      projects.findIndex((p) => p.id === selectedProject.id)
                    )
                  )}
                >
                  {getProjectInitial(selectedProject.name)}
                </div>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="truncate text-sm font-medium">
                    {selectedProject.name}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-[hsl(215,20%,55%)]">Select project</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[hsl(215,20%,55%)]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0 bg-[hsl(222,47%,8%)] border-[hsl(217,33%,18%)]">
          <Command className="bg-transparent">
            <CommandList>
              <CommandInput
                placeholder="Search projects..."
                className="text-white placeholder:text-[hsl(215,20%,45%)]"
              />
              <CommandEmpty className="text-[hsl(215,20%,55%)] text-sm py-6 text-center">
                No project found.
              </CommandEmpty>
              <CommandGroup
                heading="Projects"
                className="text-[hsl(215,20%,45%)] [&_[cmdk-group-heading]]:text-[hsl(215,20%,45%)] [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {projects.map((project, index) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => {
                      selectProject(project);
                      setOpen(false);
                    }}
                    className="text-sm text-white hover:bg-[hsl(217,33%,14%)] aria-selected:bg-[hsl(217,33%,14%)] px-2 py-2"
                  >
                    <div
                      className={cn(
                        "mr-2 h-6 w-6 rounded flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br",
                        getProjectColor(index)
                      )}
                    >
                      {getProjectInitial(project.name)}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate font-medium">{project.name}</span>
                      {project.description && (
                        <span className="truncate text-xs text-[hsl(215,20%,50%)]">
                          {project.description}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 text-cyan-400 shrink-0",
                        selectedProject?.id === project.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator className="bg-[hsl(217,33%,18%)]" />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewProjectDialog(true);
                  }}
                  className="text-sm text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,14%)] hover:text-white aria-selected:bg-[hsl(217,33%,14%)] px-2 py-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Project
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        name={newProjectName}
        setName={setNewProjectName}
        description={newProjectDescription}
        setDescription={setNewProjectDescription}
        onCreate={handleCreateProject}
        isCreating={isCreating}
        error={createError}
      />
    </>
  );
}

// Extracted dialog component
function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  setName,
  description,
  setDescription,
  onCreate,
  isCreating,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  error: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your nudge workflows and
            configurations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., E-commerce Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="project-description">Description (optional)</Label>
            <Textarea
              id="project-description"
              placeholder="What is this project for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={!name.trim() || isCreating}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
