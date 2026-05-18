import React, { useCallback } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
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
  simScenario: string | null;
  simProgress: number;
}

export const NamespaceContext = React.createContext<string>('all');

export function Layout({
  state, theme, onToggleTheme, children,
  simulateAnomaly, executeRemediation, selectedNamespace, setNamespace,
  simScenario, simProgress
}: LayoutProps) {

  const handleScenario = useCallback(async (scenario: string) => {
    await simulateAnomaly(scenario);
  }, [simulateAnomaly]);

  const handleClear = useCallback(async () => {
    await simulateAnomaly('clear');
  }, [simulateAnomaly]);

  const barColor = simProgress > 0.7
    ? 'var(--km-danger)'
    : simProgress > 0.4
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

        {/* FIX DA-002: Simulation Mode Banner */}
        {dataSource === 'simulated' && (
            <div style={{
                background: 'var(--km-warn-glow)',
                color: 'var(--km-warn)',
                padding: '8px 20px',
                textAlign: 'center',
                fontFamily: 'var(--km-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--km-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
                <AlertTriangle size={14} />
                SIMULATION MODE ACTIVE — DATA IS NOT LIVE
                <AlertTriangle size={14} />
            </div>
        )}

        {/* Scenario Progress Bar */}
        {simScenario && (
          <div className="scenario-bar" style={{
            height: 32, background: 'var(--km-bg)', borderBottom: '1px solid var(--km-border)',
            display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16
          }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)', minWidth: 160 }}>
              ⚡ {simScenario.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div style={{ flex: 1, height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${simProgress * 100}%`, background: barColor, transition: 'width 2s linear' }} />
            </div>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-muted)', minWidth: 40 }}>
              {Math.round(simProgress * 100)}%
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'pvc_cascade', label: 'PVC Cascade', color: 'var(--km-danger)' },
              { key: 'memory_leak', label: 'Mem Leak', color: 'var(--km-warn)' },
              { key: 'cpu_storm', label: 'CPU Storm', color: 'var(--km-accent)' },
              { key: 'network_partition', label: 'Net Partition', color: 'var(--km-danger)' },
              { key: 'node_failure', label: 'Node Fail', color: 'var(--km-danger)' },
              { key: 'cert_expiry', label: 'Cert Expiry', color: 'var(--km-warn)' },
              { key: 'config_drift', label: 'Config Drift', color: 'var(--km-warn)' },
              { key: 'dns_failure', label: 'DNS Fail', color: 'var(--km-accent)' },
            ].map(s => (
              <button key={s.key} onClick={() => handleScenario(s.key)} style={{
                fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700,
                padding: '2px 8px', borderRadius: 3, border: `1px solid ${s.color}`,
                background: 'transparent', color: s.color, cursor: 'pointer',
                opacity: simScenario === s.key ? 1 : 0.65, transition: 'opacity 0.2s',
              }}>⚡ {s.label}</button>
            ))}
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
