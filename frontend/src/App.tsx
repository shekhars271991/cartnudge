import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// App Pages
import Dashboard from "./pages/Dashboard";
import DataPipelines from "./pages/DataPipelines";
import DataPipelineCreate from "./pages/DataPipelineCreate";
import DataPipelineDetail from "./pages/DataPipelineDetail";
import FeatureStore from "./pages/FeatureStore";
import NewPipeline from "./pages/pipelines/NewPipeline";
import PipelineDetails from "./pages/pipelines/PipelineDetails";
import Deployments from "./pages/Deployments";
import Models from "./pages/Models";
import LLMConfig from "./pages/LLMConfig";
import Workflows from "./pages/Workflows";
import Channels from "./pages/Channels";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import AcceptInvitation from "./pages/AcceptInvitation";
import ProjectDetails from "./pages/ProjectDetails";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invitation/:token" element={<AcceptInvitation />} />

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/data-pipelines" element={<DataPipelines />} />
              <Route path="/data-pipelines/new" element={<DataPipelineCreate />} />
              <Route path="/data-pipelines/:id" element={<DataPipelineDetail />} />
              <Route path="/feature-store" element={<FeatureStore />} />
              <Route path="/pipelines/new" element={<NewPipeline />} />
              <Route path="/pipelines/:id" element={<PipelineDetails />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route path="/models" element={<Models />} />
              <Route path="/llm-config" element={<LLMConfig />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/project/:projectId" element={<ProjectDetails />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
