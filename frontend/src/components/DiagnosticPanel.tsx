import React, { useMemo } from 'react';
import type { ClusterState } from '../hooks/useCluster';

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 3, WARNING: 2, ERROR: 1, INFO: 0 };

interface DiagnosticPanelProps {
  agents: ClusterState['agents'];
  executeRemediation: (action: string, target: string) => Promise<any>;
  dataSource?: 'live' | 'simulated';
}

const ConfidenceRing = React.memo(function ConfidenceRing({ confidence, status }: { confidence: number; status: string }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence * circumference);

  return (
    <div className="conf-ring-wrap">
      <svg className="conf-ring-svg" width="26" height="26">
        <circle className="conf-ring-bg" cx="13" cy="13" r={radius} />
        <circle className="conf-ring-fill" cx="13" cy="13" r={radius}
          strokeDasharray={circumference} strokeDashoffset={offset}
          stroke={status === 'CRITICAL' ? 'var(--km-danger)' : status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-accent)'}
        />
      </svg>
      <div className="conf-ring-text" style={{ fontSize: 7 }}>{(confidence * 100).toFixed(0)}%</div>
    </div>
  );
});

const AgentCard = React.memo(function AgentCard({
  agent, onRemediate
}: {
  agent: ClusterState['agents'][0];
  onRemediate: (agent: any) => void;
}) {
  const isCritical = agent.status === 'CRITICAL';
  const isWarning = agent.status === 'WARNING';
  const className = `diag-agent ${isCritical ? 'alert-state' : isWarning ? 'warn-state' : ''}`;

  return (
    <div className={className}>
      <div className="diag-agent-head">
        <span className="diag-agent-icon">{agent.icon}</span>
        <div className="diag-agent-info">
          <div className="diag-agent-name">{agent.agent}</div>
          <div className="diag-agent-domain">{agent.domain}</div>
        </div>
        <ConfidenceRing confidence={agent.confidence} status={agent.status} />
      </div>
      <div className="diag-finding">&ldquo;{agent.finding}&rdquo;</div>
      <div className="diag-meta">
        <span className={`diag-agent-badge ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}>
          {agent.status === 'CRITICAL' ? 'CRITICAL' : agent.status === 'WARNING' ? 'WARNING' : 'MONITORING'}
        </span>
        {agent.recommendation && <span>{agent.recommendation.slice(0, 35)}</span>}
      </div>
      {agent.buffer_action && agent.buffer_action !== "monitor_only" && (
        <button className="diag-action-btn" onClick={() => onRemediate(agent)}>
          ⚡ Execute: {agent.buffer_action.replace(/_/g, ' ')}
        </button>
      )}
    </div>
  );
});

export const DiagnosticPanel = React.memo(function DiagnosticPanel({ agents, executeRemediation, dataSource }: DiagnosticPanelProps) {
  const sorted = useMemo(() => {
    return [...agents].sort((a, b) =>
      (SEVERITY_ORDER[b.status] || 0) - (SEVERITY_ORDER[a.status] || 0)
    );
  }, [agents]);

  const handleRemediate = React.useCallback((agent: any) => {
    const target = agent.detail?.pod || agent.detail?.hot_pod || 'unknown';
    let action = agent.buffer_action;
    if (action === 'restart_unhealthy_replica') action = 'restart_pod';
    executeRemediation(action, target);
  }, [executeRemediation]);

  const criticalCount = useMemo(() => agents.filter(a => a.status === 'CRITICAL').length, [agents]);
  const warningCount = useMemo(() => agents.filter(a => a.status === 'WARNING').length, [agents]);

  if (sorted.length === 0) {
    return (
      <div className="diag-empty">
        <div style={{ width: 22, height: 22, border: '2px solid var(--km-border)', borderTopColor: 'var(--km-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--km-text)' }}>Initializing AI Agents</div>
        <div>Telemetry pipeline connecting</div>
        <div style={{ fontSize: 8, color: 'var(--km-dim)', marginTop: 4 }}>7 diagnostic agents standby</div>
      </div>
    );
  }

  return (
    <>
      {/* Summary header */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--km-border)', display: 'flex', gap: 8, alignItems: 'center', fontSize: 8, fontFamily: 'var(--km-mono)' }}>
        <span style={{ color: criticalCount > 0 ? 'var(--km-danger)' : 'var(--km-muted)', fontWeight: 700 }}>
          {criticalCount} critical
        </span>
        <span style={{ color: 'var(--km-dim)' }}>·</span>
        <span style={{ color: warningCount > 0 ? 'var(--km-warn)' : 'var(--km-muted)', fontWeight: 700 }}>
          {warningCount} warnings
        </span>
        <span style={{ color: 'var(--km-dim)' }}>·</span>
        <span style={{ color: 'var(--km-muted)' }}>{agents.length} agents</span>
        <span style={{ marginLeft: 'auto' }}>
          <span className={`badge ${dataSource === 'live' ? 'badge-ok' : 'badge-warning'}`} style={{ fontSize: 7 }}>
            {dataSource === 'live' ? 'LIVE' : 'SIMULATED'}
          </span>
        </span>
      </div>
      {sorted.map(a => (
        <AgentCard key={a.agent} agent={a} onRemediate={handleRemediate} />
      ))}
    </>
  );
});
