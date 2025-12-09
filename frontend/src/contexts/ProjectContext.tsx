/**
 * Project Context - Global project state management
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/api";
import { useAuth } from "./AuthContext";

// Storage key for selected project
const SELECTED_PROJECT_KEY = "cartnudge_selected_project";

interface ProjectContextType {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  selectProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, name: string, description?: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects when authenticated
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await projectsApi.list();
      setProjects(response.items);

      // Restore selected project from localStorage or select first
      const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      const savedProject = response.items.find((p) => p.id === savedProjectId);
      
      if (savedProject) {
        setSelectedProject(savedProject);
      } else if (response.items.length > 0) {
        setSelectedProject(response.items[0]);
        localStorage.setItem(SELECTED_PROJECT_KEY, response.items[0].id);
      }
    } catch (err) {
      setError("Failed to load projects");
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    localStorage.setItem(SELECTED_PROJECT_KEY, project.id);
  };

  const refreshProjects = async () => {
    await loadProjects();
  };

  const createProject = async (name: string, description?: string): Promise<Project> => {
    const project = await projectsApi.create({ name, description });
    setProjects((prev) => [...prev, project]);
    
    // Auto-select newly created project
    selectProject(project);
    
    return project;
  };

  const updateProject = async (
    projectId: string,
    name: string,
    description?: string
  ): Promise<Project> => {
    const updated = await projectsApi.update(projectId, { name, description });
    
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? updated : p))
    );
    
    // Update selected project if it's the one being updated
    if (selectedProject?.id === projectId) {
      setSelectedProject(updated);
    }
    
    return updated;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    await projectsApi.delete(projectId);
    
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    
    // If deleted project was selected, select another one
    if (selectedProject?.id === projectId) {
      const remaining = projects.filter((p) => p.id !== projectId);
      if (remaining.length > 0) {
        selectProject(remaining[0]);
      } else {
        setSelectedProject(null);
        localStorage.removeItem(SELECTED_PROJECT_KEY);
      }
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isLoading,
        error,
        selectProject,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  
  return context;
}

export default ProjectContext;

