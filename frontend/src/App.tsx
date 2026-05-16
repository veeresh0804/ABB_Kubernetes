import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCluster } from './hooks/useCluster';
import { useTheme } from './hooks/useTheme';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Dependencies } from './pages/Dependencies';
import { Agents } from './pages/Agents';
import { NLPChat } from './pages/NLPChat';
import { IncidentReplay } from './pages/IncidentReplay';
import './index.css';

function LayoutWrapper() {
  const { state, mode, dataSource, events, triggerAnomaly, nlpQuery, executeRemediation, setStabilizationMode } = useCluster();
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout
      state={state}
      mode={mode}
      dataSource={dataSource}
      events={events}
      simulateAnomaly={triggerAnomaly}
      executeRemediation={executeRemediation}
      setStabilizationMode={setStabilizationMode}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <Routes>
        <Route path="/" element={<Dashboard state={state} dataSource={dataSource} />} />
        <Route path="/dependencies" element={<Dependencies state={state} />} />
        <Route path="/agents" element={<Agents state={state} executeRemediation={executeRemediation} />} />
        <Route path="/nlp" element={<NLPChat nlpQuery={nlpQuery} />} />
        <Route path="/replay" element={<IncidentReplay state={state} />} />
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
