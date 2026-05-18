import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AISideHub } from './AISideHub';
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
  state, theme, onToggleTheme, children, nlpQuery, selectedNamespace
}: LayoutProps) {
  return (
    <NamespaceContext.Provider value={selectedNamespace || 'all'}>
      <div className="aether-layout">
        <Header state={state} theme={theme} onToggleTheme={onToggleTheme} />
        
        <div className="aether-workspace">
          <Sidebar />
          
          <main className="aether-main">
            <div className="aether-content">
              {children}
            </div>
            <EventTimeline anomalies={state.anomalies} healthScore={state.health.score} />
          </main>

          <AISideHub agents={state.agents} onQuery={nlpQuery} />
        </div>
      </div>
    </NamespaceContext.Provider>
  );
}
