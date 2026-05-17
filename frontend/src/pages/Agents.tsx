import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Activity, Play, Bot } from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';

const ICON_BG: Record<string, string> = {
  'CPU Contention Agent': 'rgba(239,68,68,0.08)',
  'Memory Leak Agent': 'rgba(245,158,11,0.08)',
  'PVC Saturation Agent': 'rgba(245,158,11,0.08)',
  'Retry Storm Agent': 'rgba(34,197,94,0.08)',
  'Cluster SRE Supervisor Agent': 'rgba(34,197,94,0.08)',
  'Stabilization Recommendation Agent': 'rgba(59,130,246,0.08)',
  'Dependency Impact Analysis Agent': 'rgba(239,68,68,0.08)',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#64748B',
};

const ACTION_TEXT: Record<string, string> = {
  CRITICAL: 'Scale or audit code',
  WARNING: 'Add circuit breaker',
  INFO: 'No action required',
};

const badgeCls = (s: string) => s === 'CRITICAL' ? 'badge-alert' : s === 'WARNING' ? 'badge-warning' : 'badge-ok';
const cardBorder = (s: string) => s === 'CRITICAL' ? 'alert-state' : s === 'WARNING' ? 'warn-state' : 'info-state';
const actionCls = (s: string) => s === 'CRITICAL' ? 'alert' : s === 'WARNING' ? 'warn' : 'ok';
const confBarCls = (pct: number) => pct > 80 ? 'high' : pct > 60 ? 'med' : 'low';

const AgentCard = React.memo(function AgentCard({ a, onRemediate, acting }: { a: any; onRemediate: (agent: any) => void; acting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = SEVERITY_COLORS[a.status] || '#64748B';
  const pct = (a.confidence * 100).toFixed(0);

  return (
    <div className={`agent-card ${cardBorder(a.status)}`}>
      <div className="agent-card-header">
        <div className="agent-title-group">
          <div className="agent-icon" style={{ background: ICON_BG[a.agent] || 'var(--km-surface)', color: sevColor }}>{a.icon}</div>
          <div className="agent-text">
            <div className="agent-name">{a.agent}</div>
            <div className="agent-status-text">{a.domain}</div>
          </div>
        </div>
        <span className={`status-badge ${badgeCls(a.status)}`}>{a.status}</span>
      </div>
      <div className="agent-insight" style={{ color: a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-secondary)' }}>"{a.finding}"</div>
      <div className="agent-meta">
        <div className="conf-bar-wrap"><div className={`conf-bar ${confBarCls(a.confidence * 100)}`} style={{ width: `${pct}%` }} /></div>
        <span className="conf-val">{pct}%</span>
        <span className={`agent-action ${actionCls(a.status)}`}>{ACTION_TEXT[a.status] || 'Monitoring'}</span>
      </div>
      {a.reasoning?.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--km-border)', paddingTop: 8 }}>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--km-dim)', fontSize: 9, fontFamily: 'var(--km-mono)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0, letterSpacing: 0.3 }}>
            {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} AI REASONING LOG
          </button>
          {expanded && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {a.reasoning.map((r: string, i: number) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--km-secondary)', display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--km-accent2)', flexShrink: 0 }}>↳</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {a.buffer_action && a.buffer_action !== "monitor_only" && (
        <button className="btn-primary" disabled={acting} onClick={() => onRemediate(a)}
          style={{ width: '100%', marginTop: 10, fontSize: 9, padding: '5px 0', justifyContent: 'center', letterSpacing: 0.3, background: a.status === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-accent)' }}>
          {acting ? <Activity size={10} className="spin" /> : <Play size={10} />} EXECUTE: {a.buffer_action.replace(/_/g, ' ').toUpperCase()}
        </button>
      )}
    </div>
  );
});

export function Agents({ state, executeRemediation }: { state: ClusterState; executeRemediation: (a: string, t: string, r?: number) => Promise<any> }) {
  const [acting, setActing] = useState<string | null>(null);
  const agents = useMemo(() => state.agents, [state.agents]);

  const handleRemediate = useCallback(async (agent: any) => {
    setActing(agent.agent);
    try {
      let action = agent.buffer_action;
      if (action === 'restart_unhealthy_replica') action = 'restart_pod';
      const target = agent.detail?.pod || agent.detail?.hot_pod || agent.detail?.root_pod || 'frontend-service';
      await executeRemediation(action, target);
    } finally { setActing(null); }
  }, [executeRemediation]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-muted)' }}>
        <Bot size={14} />
        <span>7 Specialized AI Agents · Continuous Diagnostic Analysis · Automated Mitigation</span>
      </div>
      <div className="agent-grid">
        {agents.length ? agents.map(a => (
          <AgentCard key={a.agent} a={a} onRemediate={handleRemediate} acting={acting === a.agent} />
        )) : [...Array(7)].map((_, i) => <div key={i} className="shimmer" style={{ height: 140 }} />)}
      </div>
    </div>
  );
}
