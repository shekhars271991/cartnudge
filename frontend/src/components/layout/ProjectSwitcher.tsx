import * as React from "react"
import { Check, ChevronsUpDown, Plus, FolderOpen, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const projects = [
    {
        id: "proj_1",
        name: "E-commerce Store",
        description: "Main production store",
        color: "from-cyan-400 to-blue-500",
        initial: "E",
    },
    {
        id: "proj_2",
        name: "Mobile App",
        description: "iOS and Android app",
        color: "from-violet-400 to-purple-500",
        initial: "M",
    },
    {
        id: "proj_3",
        name: "Staging Environment",
        description: "Testing and QA",
        color: "from-amber-400 to-orange-500",
        initial: "S",
    },
]

type Project = typeof projects[number]

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface ProjectSwitcherProps extends PopoverTriggerProps { }

export default function ProjectSwitcher({ className }: ProjectSwitcherProps) {
    const [open, setOpen] = React.useState(false)
    const [showNewProjectDialog, setShowNewProjectDialog] = React.useState(false)
    const [selectedProject, setSelectedProject] = React.useState<Project>(projects[0])
    const [newProjectName, setNewProjectName] = React.useState("")
    const [newProjectDescription, setNewProjectDescription] = React.useState("")

    const handleCreateProject = () => {
        // In a real app, this would create the project via API
        console.log("Creating project:", { name: newProjectName, description: newProjectDescription })
        setShowNewProjectDialog(false)
        setNewProjectName("")
        setNewProjectDescription("")
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
                        <div className={cn(
                            "mr-2 h-5 w-5 rounded flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br",
                            selectedProject.color
                        )}>
                            {selectedProject.initial}
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className="truncate text-sm font-medium">{selectedProject.name}</span>
                        </div>
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
                                {projects.map((project) => (
                                    <CommandItem
                                        key={project.id}
                                        onSelect={() => {
                                            setSelectedProject(project)
                                            setOpen(false)
                                        }}
                                        className="text-sm text-white hover:bg-[hsl(217,33%,14%)] aria-selected:bg-[hsl(217,33%,14%)] px-2 py-2"
                                    >
                                        <div className={cn(
                                            "mr-2 h-6 w-6 rounded flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br",
                                            project.color
                                        )}>
                                            {project.initial}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate font-medium">{project.name}</span>
                                            <span className="truncate text-xs text-[hsl(215,20%,50%)]">{project.description}</span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-2 h-4 w-4 text-cyan-400 shrink-0",
                                                selectedProject.id === project.id
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
                                        setOpen(false)
                                        setShowNewProjectDialog(true)
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

            {/* Create Project Dialog */}
            <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Create a new project to organize your nudge workflows and configurations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                placeholder="e.g., E-commerce Store"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="project-description">Description (optional)</Label>
                            <Textarea
                                id="project-description"
                                placeholder="What is this project for?"
                                value={newProjectDescription}
                                onChange={(e) => setNewProjectDescription(e.target.value)}
                                className="mt-1.5"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            Create Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
