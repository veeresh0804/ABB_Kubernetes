import React, { useState, useMemo, useCallback, useContext } from 'react';
import { ChevronUp, ChevronDown, Activity, Play, Bot } from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';
import { NamespaceContext } from '../components/Layout';

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

function ConfSparkline({ history }: { history: number[] }) {
  if (history.length < 2) return null;
  const W = 44, H = 18;
  const min = Math.min(...history, 0.6);
  const max = Math.max(...history, 1.0);
  const range = max - min || 0.01;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = history[history.length - 1];
  const color = last > 0.85 ? 'var(--km-healthy)' : last > 0.7 ? 'var(--km-warn)' : 'var(--km-danger)';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const AgentCard = React.memo(function AgentCard({ a, onRemediate, acting, confHistory }: { a: any; onRemediate: (agent: any) => void; acting: boolean; confHistory: number[] }) {
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
        <ConfSparkline history={confHistory} />
        {a.trust_score !== undefined && (
          <span style={{ 
            fontSize: 7, fontWeight: 700, fontFamily: 'var(--km-mono)', 
            color: a.trust_score > 0.9 ? 'var(--km-accent)' : 'var(--km-dim)',
            background: 'rgba(34,197,94,0.05)', padding: '1px 4px', borderRadius: 3,
            border: '0.5px solid rgba(34,197,94,0.1)'
          }}>
            REPUTATION: {Math.round(a.trust_score * 100)}%
          </span>
        )}
        {a.governance && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
             <span style={{ fontSize: 7, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', opacity: 0.8 }}>{a.governance.avg_latency_ms}ms</span>
             <span style={{ width: 4, height: 4, borderRadius: '50%', background: a.governance.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-danger)' }} />
          </div>
        )}
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

export function Agents({ state, executeRemediation }: { state: ClusterState; executeRemediation: (a: string, t: string, ns: string, r?: number) => Promise<any> }) {
  const [acting, setActing] = useState<string | null>(null);
  const agents = useMemo(() => state.agents, [state.agents]);
  const selectedNamespace = useContext(NamespaceContext);
  const confidenceHistory = React.useRef<Map<string, number[]>>(new Map());

  React.useEffect(() => {
    agents.forEach(a => {
      const history = confidenceHistory.current.get(a.agent) || [];
      history.push(a.confidence);
      if (history.length > 30) history.shift();
      confidenceHistory.current.set(a.agent, [...history]);
    });
  }, [agents]);

  const handleRemediate = useCallback(async (agent: any) => {
    setActing(agent.agent);
    try {
      let action = agent.buffer_action;
      if (action === 'restart_unhealthy_replica') action = 'restart_pod';
      const target = agent.detail?.pod || agent.detail?.hot_pod || agent.detail?.root_pod;
      if (target) {
        await executeRemediation(action, target, selectedNamespace);
      } else {
        console.error("Remediation action triggered without a valid target.", agent);
      }
    } finally { setActing(null); }
  }, [executeRemediation, selectedNamespace]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-muted)' }}>
        <Bot size={14} />
        <span>7 Specialized AI Agents · Continuous Diagnostic Analysis · Automated Mitigation</span>
      </div>
      <div className="agent-grid">
        {agents.length ? agents.map(a => (
          <AgentCard
            key={a.agent} a={a}
            onRemediate={handleRemediate}
            acting={acting === a.agent}
            confHistory={confidenceHistory.current.get(a.agent) || []}
          />
        )) : [...Array(7)].map((_, i) => <div key={i} className="shimmer" style={{ height: 140 }} />)}
      </div>
    </div>
  );
}
