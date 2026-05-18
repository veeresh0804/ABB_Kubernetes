import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCluster } from './hooks/useCluster';
import { useTheme } from './hooks/useTheme';
import { Layout } from './components/Layout';
import { CommandCenter } from './pages/CommandCenter/CommandCenter';
import { AIMesh } from './pages/Cognition/AIMesh';
import { PredictionFabric } from './pages/Cognition/PredictionFabric';
import { DigitalTwinLab } from './pages/Simulation/DigitalTwinLab';
import { OperationalMemory } from './pages/Memory/OperationalMemory';
import { SemanticLogs } from './pages/Intelligence/SemanticLogs';
import { Governance } from './pages/Governance/Governance';
import { ExecutiveOps } from './pages/Executive/ExecutiveOps';
import { IncidentArchive } from './pages/Memory/IncidentArchive';
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
        <Route path="/executive" element={<ExecutiveOps state={state} />} />
        <Route path="/mission" element={<Pages.MissionControl />} />

        {/* COGNITION */}
        <Route path="/cognition/mesh" element={<AIMesh state={state} />} />
        <Route path="/cognition/prediction" element={<PredictionFabric state={state} />} />
        <Route path="/governance" element={<Governance state={state} />} />

        {/* INFRASTRUCTURE */}
        <Route path="/dependencies" element={<Pages.InfrastructureFabric state={state} />} />
        <Route path="/namespaces" element={<Pages.NamespaceIntelligence />} />

        {/* SIMULATION */}
        <Route path="/simulation/twin" element={<DigitalTwinLab state={state} />} />
        <Route path="/simulation/scenarios" element={<Pages.ScenarioSimulator />} />

        {/* MEMORY */}
        <Route path="/memory" element={<OperationalMemory state={state} />} />
        <Route path="/replay" element={<IncidentArchive state={state} />} />

        {/* INTELLIGENCE */}
        <Route path="/intelligence/logs" element={<SemanticLogs state={state} />} />
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
