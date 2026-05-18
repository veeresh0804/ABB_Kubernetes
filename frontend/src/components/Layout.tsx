import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DiagnosticPanel } from './DiagnosticPanel';
import { EventTimeline } from './EventTimeline';
import type { ClusterState, ConnectionMode, ConnectionEvent } from '../hooks/useCluster';

interface LayoutProps {
  state: ClusterState;
  mode: ConnectionMode;
  dataSource: 'live' | 'simulated';
  events: ConnectionEvent[];
  simulateAnomaly: (s: string) => Promise<any>;
  executeRemediation: (a: string, t: string, ns: string, r?: number) => Promise<any>;
  nlpQuery: (q: string) => Promise<any>;
  setStabilizationMode: (mode: string) => Promise<any>;
  setNamespace: (namespace: string) => void;
  selectedNamespace: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const NamespaceContext = React.createContext<string>('all');

export function Layout({
  state, theme, onToggleTheme, children,
  simulateAnomaly, executeRemediation, selectedNamespace, setNamespace
}: LayoutProps) {

  // Scenario progress bar state
  const [scenarioProgress, setScenarioProgress] = useState(0);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const pollRef = useRef<number | undefined>(undefined);
  const API = import.meta.env.VITE_API_URL || '';

  const stopPoll = useCallback(() => {
    if (pollRef.current !== undefined) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  }, []);

  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/simulate/status`);
        if (!res.ok) return;
        const data = await res.json();
        setScenarioProgress(data.progress || 0);
        setActiveScenario(data.anomaly_mode || null);
        if (!data.anomaly_mode) stopPoll();
      } catch { /* ignore */ }
    }, 2000);
  }, [API, stopPoll]);

  const handleScenario = useCallback(async (scenario: string) => {
    await simulateAnomaly(scenario);
    setActiveScenario(scenario);
    setScenarioProgress(0);
    startPoll();
  }, [simulateAnomaly, startPoll]);

  const handleClear = useCallback(async () => {
    await simulateAnomaly('clear');
    setActiveScenario(null);
    setScenarioProgress(0);
    stopPoll();
  }, [simulateAnomaly, stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const barColor = scenarioProgress > 0.7
    ? 'var(--km-danger)'
    : scenarioProgress > 0.4
    ? 'var(--km-warn)'
    : 'var(--km-healthy)';

  // Wrap executeRemediation to match DiagnosticPanel's 2-arg signature
  const handleRemediate = useCallback(
    (action: string, target: string) => executeRemediation(action, target, selectedNamespace),
    [executeRemediation, selectedNamespace]
  );

  return (
    <NamespaceContext.Provider value={selectedNamespace || 'all'}>
      <div className="aether-layout">

        {/* Header */}
        <Header state={state} theme={theme} onToggleTheme={onToggleTheme} />

        {/* Scenario Progress Bar */}
        {activeScenario && (
          <div className="scenario-bar" style={{
            height: 32, background: 'var(--km-bg)', borderBottom: '1px solid var(--km-border)',
            display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16
          }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)', minWidth: 160 }}>
              ⚡ {activeScenario.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div style={{ flex: 1, height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${scenarioProgress * 100}%`, background: barColor, transition: 'width 2s linear' }} />
            </div>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-muted)', minWidth: 40 }}>
              {Math.round(scenarioProgress * 100)}%
            </div>
            <button onClick={handleClear} className="btn" style={{ height: 20, padding: '0 8px', borderColor: 'var(--km-danger)', color: 'var(--km-danger)' }}>
              CLEAR
            </button>
          </div>
        )}

        {/* Namespace selector bar */}
        <div className="sub-header" style={{
          height: 40, borderBottom: '1px solid var(--km-border)', background: 'var(--km-bg-alt)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20
        }}>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)' }}>NAMESPACE</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'production', 'batch', 'monitoring'].map(ns => (
              <button
                key={ns}
                onClick={() => setNamespace(ns)}
                style={{
                  fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 3, border: '1px solid',
                  cursor: 'pointer', letterSpacing: 0.3, transition: 'all 0.15s',
                  borderColor: selectedNamespace === ns ? 'var(--km-accent)' : 'var(--km-border)',
                  background: selectedNamespace === ns ? 'var(--km-accent-glow)' : 'transparent',
                  color: selectedNamespace === ns ? 'var(--km-accent)' : 'var(--km-muted)',
                }}
              >{ns.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            {['pvc_cascade', 'memory_leak', 'cpu_storm'].map((s, i) => {
              const labels = ['PVC Cascade', 'Memory Leak', 'CPU Storm'];
              const colors = ['var(--km-danger)', 'var(--km-warn)', 'var(--km-accent)'];
              return (
                <button key={s} onClick={() => handleScenario(s)} style={{
                  fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 3, border: `1px solid ${colors[i]}`,
                  background: 'transparent', color: colors[i], cursor: 'pointer',
                  opacity: activeScenario === s ? 1 : 0.7, transition: 'opacity 0.2s',
                }}>⚡ {labels[i]}</button>
              );
            })}
          </div>
        </div>

        {/* Workspace */}
        <div className="aether-workspace">
          <Sidebar />

          <main className="aether-main">
            <div className="aether-content">
              {children}
            </div>
            <EventTimeline anomalies={state.anomalies} healthScore={state.health.score} />
          </main>

          {/* Right panel — DiagnosticPanel wired in */}
          <aside className="ai-side-hub" style={{ width: 340, display: 'flex', flexDirection: 'column' }}>
            <div className="hub-header" style={{ padding: '16px', borderBottom: '1px solid var(--km-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={14} className="text-accent" />
              <div style={{ fontFamily: 'var(--km-display)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                AI Diagnostic Console
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DiagnosticPanel
                agents={state.agents}
                executeRemediation={handleRemediate}
              />
            </div>
          </aside>
        </div>
      </div>
    </NamespaceContext.Provider>
  );
}
