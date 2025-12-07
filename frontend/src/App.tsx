import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";

// Page imports
import UserModeling from "./pages/UserModeling";
import FeaturePipelines from "./pages/FeaturePipelines";
import FeatureStore from "./pages/FeatureStore";
import NewPipeline from "./pages/pipelines/NewPipeline";
import PipelineDetails from "./pages/pipelines/PipelineDetails";
import Deployments from "./pages/Deployments";
import Models from "./pages/Models";
import Workflows from "./pages/Workflows";
import Channels from "./pages/Channels";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/user-modeling" element={<UserModeling />} />
          <Route path="/feature-pipelines" element={<FeaturePipelines />} />
          <Route path="/feature-store" element={<FeatureStore />} />
          <Route path="/pipelines/new" element={<NewPipeline />} />
          <Route path="/pipelines/:id" element={<PipelineDetails />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="/models" element={<Models />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
