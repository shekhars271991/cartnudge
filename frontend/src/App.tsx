import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// Page imports
import DataModeling from "./pages/DataModeling";
import FeaturePipelines from "./pages/FeaturePipelines";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-modeling" element={<DataModeling />} />
          <Route path="/data-pipelines" element={<FeaturePipelines />} />
          <Route path="/feature-store" element={<FeatureStore />} />
          <Route path="/pipelines/new" element={<NewPipeline />} />
          <Route path="/pipelines/:id" element={<PipelineDetails />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="/models" element={<Models />} />
          <Route path="/llm-config" element={<LLMConfig />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
