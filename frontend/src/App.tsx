import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCluster } from './hooks/useCluster';
import { useTheme } from './hooks/useTheme';
import { Layout } from './components/Layout';
import { CommandCenter } from './pages/CommandCenter/CommandCenter';
import * as Pages from './pages/PageScaffolds';
import './index.css';

function LayoutWrapper() {
  const { 
    state, mode, dataSource, events, selectedNamespace, 
    triggerAnomaly, nlpQuery, executeRemediation, 
    setStabilizationMode, setNamespace 
  } = useCluster();
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout
      state={state}
      mode={mode}
      dataSource={dataSource}
      events={events}
      simulateAnomaly={triggerAnomaly}
      executeRemediation={executeRemediation}
      nlpQuery={nlpQuery}
      setStabilizationMode={setStabilizationMode}
      selectedNamespace={selectedNamespace}
      setNamespace={setNamespace}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <Routes>
        {/* COMMAND */}
        <Route path="/" element={<CommandCenter state={state} />} />
        <Route path="/executive" element={<Pages.ExecutiveOps />} />
        <Route path="/mission" element={<Pages.MissionControl />} />

        {/* COGNITION */}
        <Route path="/cognition/mesh" element={<Pages.AIMesh />} />
        <Route path="/cognition/prediction" element={<Pages.PredictionFabric />} />
        <Route path="/governance" element={<Pages.Governance />} />

        {/* INFRASTRUCTURE */}
        <Route path="/dependencies" element={<Pages.InfrastructureFabric />} />
        <Route path="/namespaces" element={<Pages.NamespaceIntelligence />} />

        {/* SIMULATION */}
        <Route path="/simulation/twin" element={<Pages.DigitalTwinLab />} />
        <Route path="/simulation/scenarios" element={<Pages.ScenarioSimulator />} />

        {/* MEMORY */}
        <Route path="/memory" element={<Pages.OperationalMemory />} />
        <Route path="/replay" element={<Pages.IncidentArchive />} />

        {/* INTELLIGENCE */}
        <Route path="/intelligence/logs" element={<Pages.SemanticLogs />} />
        <Route path="/intelligence/causal" element={<Pages.CausalAnalytics />} />

        {/* SYSTEM */}
        <Route path="/system/health" element={<Pages.CognitiveHealth />} />
        <Route path="/agents" element={<Pages.AgentLifecycle />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<LayoutWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}
