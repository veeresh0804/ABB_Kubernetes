import React from 'react';
import { 
  Activity, Shield, Target, Zap, Cpu, Bell, Search, 
  Terminal, Globe, ShieldCheck, Clock, Settings,
  ChevronDown, User, Layers
} from 'lucide-react';

import type { ClusterState } from '../hooks/useCluster';

interface HeaderProps {
  state: ClusterState;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const ExecutiveMetric = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="header-metric">
    <span className="h-metric-label">{label}</span>
    <span className="h-metric-value" style={{ color }}>{value}</span>
  </div>
);

export const Header: React.FC<HeaderProps> = ({ state, theme, onToggleTheme }) => {
  return (
    <header className="aether-header">
      <div className="header-left">
        <div className="brand">
          <div className="brand-logo">
            <Cpu size={14} />
          </div>
          <span className="brand-name">KUBEMIND AI</span>
        </div>
        
        <div className="header-status">
          <div className="status-pill">
            <div className="status-indicator active" />
            <span>COGNITION ACTIVE</span>
          </div>
          <div className="status-pill">
            <span>PROD CLUSTER</span>
            <ChevronDown size={10} style={{ marginLeft: 4 }} />
          </div>
        </div>
      </div>

      <div className="header-center">
        <ExecutiveMetric label="STABILITY" value={`${state.health.score}%`} color="var(--km-healthy)" />
        <ExecutiveMetric label="INTEGRITY" value="98.2%" color="var(--km-accent)" />
        <ExecutiveMetric label="CONFIDENCE" value="94%" color="var(--km-warn)" />
        <ExecutiveMetric label="BLAST RADIUS" value="0.04m" color="var(--km-danger)" />
        <ExecutiveMetric label="AI CONSENSUS" value="CALIBRATED" color="var(--km-cyan)" />
      </div>

      <div className="header-right">
        <div className="h-action-btn"><Search size={16} /></div>
        <div className="h-action-btn"><Zap size={16} /></div>
        <div className="h-action-btn"><Clock size={16} /></div>
        <div className="h-action-btn"><Bell size={16} /></div>
        
        <div style={{ width: 1, height: 20, background: 'var(--km-border)', margin: '0 8px' }} />
        
        <div className="h-action-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? <Settings size={16} /> : <Layers size={16} />}
        </div>
        
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--km-surface-alt)', border: '1px solid var(--km-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="var(--km-muted)" />
          </div>
        </div>
      </div>
    </header>
  );
};
