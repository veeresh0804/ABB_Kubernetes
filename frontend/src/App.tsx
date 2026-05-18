import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCluster } from './hooks/useCluster';
import { useTheme } from './hooks/useTheme';
import { Layout } from './components/Layout';
import { CommandCenter } from './pages/CommandCenter/CommandCenter';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Dependencies } from './pages/Dependencies';
import { NLPChat } from './pages/NLPChat';
import { IncidentReplay } from './pages/IncidentReplay';
import * as Pages from './pages/PageScaffolds';
import './index.css';

function LayoutWrapper() {
  const {
    state, mode, dataSource, events, selectedNamespace,
    triggerAnomaly, nlpQuery, executeRemediation,
    setStabilizationMode, setNamespace,
    simScenario, simProgress
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
        simScenario={simScenario}
        simProgress={simProgress}
      >
      <Routes>
        {/* COMMAND — main entry */}
        <Route path="/" element={<CommandCenter state={state} />} />
        <Route path="/dashboard" element={<Dashboard state={state} dataSource={dataSource} />} />
        <Route path="/executive" element={<Pages.ExecutiveOps state={state} />} />
        <Route path="/mission" element={<Pages.MissionControl state={state} />} />

        {/* COGNITION */}
        <Route path="/cognition/mesh" element={<Pages.AIMesh state={state} />} />
        <Route path="/cognition/prediction" element={<Pages.PredictionFabric state={state} />} />
        <Route path="/governance" element={<Pages.Governance state={state} />} />

        {/* INFRASTRUCTURE */}
        <Route path="/dependencies" element={<Dependencies state={state} />} />
        <Route path="/namespaces" element={<Pages.NamespaceIntelligence state={state} />} />

        {/* SIMULATION */}
        <Route path="/simulation/twin" element={<Pages.DigitalTwinLab state={state} />} />
        <Route path="/simulation/scenarios" element={<Pages.ScenarioSimulator state={state} />} />

        {/* MEMORY */}
        <Route path="/memory" element={<Pages.OperationalMemory state={state} />} />
        <Route path="/replay" element={<IncidentReplay state={state} />} />

        {/* INTELLIGENCE */}
        <Route path="/intelligence/logs" element={<Pages.SemanticLogs state={state} />} />
        <Route path="/intelligence/causal" element={<Pages.CausalAnalytics state={state} />} />

        {/* SYSTEM */}
        <Route path="/system/health" element={<Pages.CognitiveHealth state={state} />} />
        <Route path="/agents" element={<Agents state={state} executeRemediation={executeRemediation} />} />

        {/* NLP */}
        <Route path="/nlp" element={<NLPChat nlpQuery={nlpQuery} />} />
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
