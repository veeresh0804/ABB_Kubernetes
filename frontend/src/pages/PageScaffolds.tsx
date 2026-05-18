import React from 'react';
import {
  Network, Share2, Activity, Zap,
  Binary, Database, Microscope,
  ShieldCheck, Heart, Terminal, Search,
  Target, Fingerprint, History, Cpu, Globe, Brain,
  BarChart3, Radar, Settings, MessageSquare, TestTube2,
  AlertTriangle, Clock, TrendingUp, Shield
} from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';

/* ─── Shared scaffold primitives ─── */

function PageWorkspace({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="page-workspace" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 8, background: 'var(--km-surface)', border: '1px solid var(--km-border)', borderRadius: 6, color: 'var(--km-accent)' }}>
          <Icon size={18} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--km-display)', fontSize: '18px', fontWeight: 700 }}>{title}</h1>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: '9px', color: 'var(--km-dim)', letterSpacing: '0.05em' }}>COGNITIVE DOMAIN ACTIVE</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children?: React.ReactNode }) {
  return (
    <div className="fabric-panel" style={{ background: 'var(--km-surface)', border: '1px solid var(--km-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="panel-header" style={{ height: 36, padding: '0 12px', borderBottom: '1px solid var(--km-border)', background: 'var(--km-surface-alt)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={12} className="text-accent" />
        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-muted)', letterSpacing: 0.5 }}>{title}</span>
      </div>
      <div className="panel-content" style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {children || (
          <div className="shimmer" style={{ height: '100%', borderRadius: 8, opacity: 0.1 }} />
        )}
      </div>
    </div>
  );
}

/* ─── Shared live sub-components ─── */

function AgentList({ agents }: { agents: ClusterState['agents'] }) {
  if (!agents?.length) return <div className="empty-state-text">Connecting to agent mesh...</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {agents.map(a => (
        <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'var(--km-surface-alt)', borderRadius: 5, borderLeft: `2px solid ${a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-border)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>{a.icon}</span>
            <span>{a.agent}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-healthy)' }}>
              {a.status}
            </span>
            <span style={{ fontSize: 9, color: 'var(--km-dim)' }}>{Math.round(a.confidence * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionList({ predictions }: { predictions: any[] }) {
  if (!predictions?.length) return <div className="empty-state-text">No active predictions — system stable</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {predictions.map((p: any, i: number) => (
        <div key={i} style={{ padding: '8px 10px', background: 'var(--km-surface-alt)', borderRadius: 6, borderLeft: `2px solid ${p.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700 }}>{p.pod_id}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: p.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }}>
              {p.severity === 'CRITICAL' ? '⚠ IMMINENT' : `~${p.ttf_minutes}m`}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.round((p.current / p.threshold) * 100))}%`, background: p.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--km-dim)', textAlign: 'right' }}>{p.current?.toFixed(1)} / {p.threshold}</div>
        </div>
      ))}
    </div>
  );
}

function CorrelationList({ correlations }: { correlations: ClusterState['correlations'] }) {
  if (!correlations?.length) return <div className="empty-state-text">No active incidents — topology stable</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {correlations.map((c: any, i: number) => (
        <div key={i} style={{ padding: '8px 10px', background: 'var(--km-surface-alt)', borderRadius: 6, borderLeft: `2px solid ${c.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
          <div style={{ fontSize: 10, color: 'var(--km-secondary)', marginBottom: 6 }}>{c.summary}</div>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>{c.causal_chain?.join(' → ')}</div>
        </div>
      ))}
    </div>
  );
}

function PodTable({ pods }: { pods: ClusterState['pods'] }) {
  if (!pods?.length) return <div className="empty-state-text">No pod data</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pods.map(p => (
        <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700 }}>{p.pod_name}</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: p.cpu_percent > 80 ? 'var(--km-danger)' : 'var(--km-muted)' }}>CPU {p.cpu_percent.toFixed(0)}%</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{p.namespace}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthStats({ state }: { state: ClusterState }) {
  const { health, agents, anomalies, predictions } = state;
  const avgConf = agents?.length ? Math.round(agents.reduce((s, a) => s + a.confidence, 0) / agents.length * 100) : 0;
  const items = [
    { label: 'Health Score', value: `${health.score}%`, color: health.score > 80 ? 'var(--km-healthy)' : 'var(--km-warn)' },
    { label: 'Anomalies', value: String(health.anomaly_count), color: health.anomaly_count > 0 ? 'var(--km-danger)' : 'var(--km-healthy)' },
    { label: 'AI Agents', value: `${agents?.length || 0}/8`, color: 'var(--km-accent)' },
    { label: 'Avg Confidence', value: `${avgConf}%`, color: 'var(--km-accent)' },
    { label: 'Predictions', value: String(predictions?.length || 0), color: predictions?.length ? 'var(--km-warn)' : 'var(--km-healthy)' },
    { label: 'Pod Count', value: String(health.pod_count), color: 'var(--km-muted)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map(it => (
        <div key={it.label} style={{ padding: 10, background: 'var(--km-surface-alt)', borderRadius: 8, border: '1px solid var(--km-border)' }}>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{it.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: it.color }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── EXPORTED PAGES — all receive { state: ClusterState } ─── */

export const AIMesh = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="AI Mesh Workspace" icon={Network}>
    <Panel title="ACTIVE ENSEMBLE REASONING" icon={Brain}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.agents || []).filter(a => a.status !== 'INFO').map(a => (
          <div key={a.agent} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 5, borderLeft: `2px solid ${a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-border)'}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{a.icon} {a.agent}</div>
            <div style={{ fontSize: 10, color: 'var(--km-secondary)' }}>{a.finding}</div>
          </div>
        ))}
        {!(state?.agents || []).filter(a => a.status !== 'INFO').length && (
          <div className="empty-state-text">All agents nominal</div>
        )}
      </div>
    </Panel>
    <Panel title="AGENT CONFIDENCE LEVELS" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
              <span>{a.agent.split(' ')[0]}</span>
              <span style={{ fontWeight: 700 }}>{Math.round(a.confidence * 100)}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--km-border)', borderRadius: 1.5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${a.confidence * 100}%`, background: a.confidence > 0.85 ? 'var(--km-healthy)' : 'var(--km-warn)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="AGENT TRUST SCORES" icon={ShieldCheck}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: (a.trust_score ?? 1) > 0.9 ? 'var(--km-healthy)' : 'var(--km-warn)' }}>
              {Math.round((a.trust_score ?? 1) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="REASONING LATENCY" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => a.governance && (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{a.governance.avg_latency_ms}ms</div>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.governance.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-danger)' }}>{a.governance.health}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="COGNITIVE CYCLES" icon={Terminal}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => a.governance && (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'var(--km-muted)' }}>×{a.governance.cycle_count}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="CONSENSUS MATRIX" icon={Target}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>{a.agent.split(' ')[0]}</span>
            <span style={{ fontWeight: 700, color: a.confidence > 0.85 ? 'var(--km-healthy)' : 'var(--km-warn)' }}>
              {Math.round(a.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Panel>
  </PageWorkspace>
);

export const PredictionFabric = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Prediction Fabric" icon={Binary}>
    <Panel title="INSTABILITY PREDICTIONS" icon={Zap}>
      <PredictionList predictions={state?.predictions || []} />
    </Panel>
    <Panel title="HIGH RISK PODS" icon={Activity}>
      <PodTable pods={(state?.pods || []).filter(p => p.cpu_percent > 60 || (p.memory_mb / Math.max(p.memory_limit_mb, 1)) > 0.7)} />
    </Panel>
    <Panel title="PREDICTIVE ANOMALIES" icon={AlertTriangle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.anomalies || []).slice(0, 8).map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4, borderLeft: `2px solid ${a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}` }}>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)', fontWeight: 700 }}>{a.severity}</span>
            <div style={{ fontSize: 9 }}>{a.pod_name}: {a.message}</div>
          </div>
        ))}
        {!(state?.anomalies?.length) && <div className="empty-state-text">No anomalies</div>}
      </div>
    </Panel>
    <Panel title="FUTURE BLAST RADIUS" icon={Radar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.predictions || []).map((p: any, i: number) => (
          <div key={i}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{p.pod_id}</div>
            <div style={{ fontSize: 9, color: p.estimated_blast_radius > 2 ? 'var(--km-danger)' : 'var(--km-warn)' }}>
              Blast radius: {p.estimated_blast_radius} service{p.estimated_blast_radius !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
        {!(state?.predictions?.length) && <div className="empty-state-text">No predictions active</div>}
      </div>
    </Panel>
    <Panel title="CONFIDENCE DRIFT" icon={TrendingUp}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).slice(0, 4).map(a => (
          <div key={a.agent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
              <span>{a.agent.split(' ')[0]}</span>
              <span>δ {((a.trust_score ?? 1) - a.confidence).toFixed(2)}</span>
            </div>
            <div style={{ height: 2, background: 'var(--km-border)', borderRadius: 1 }}>
              <div style={{ height: '100%', width: `${Math.abs(((a.trust_score ?? 1) - a.confidence)) * 100}%`, background: (a.trust_score ?? 1) < a.confidence ? 'var(--km-warn)' : 'var(--km-healthy)', borderRadius: 1 }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="PROBABILITY EVOLUTION" icon={BarChart3}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.predictions || []).slice(0, 3).map((p: any, i: number) => (
          <div key={i}>
            <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>{p.pod_id}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>
              Current: {p.current?.toFixed(1)} / Threshold: {p.threshold}
            </div>
          </div>
        ))}
        {!(state?.predictions?.length) && <div className="empty-state-text">Awaiting prediction data</div>}
      </div>
    </Panel>
  </PageWorkspace>
);

export const Governance = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Trust & Governance" icon={Fingerprint}>
    <Panel title="TRUST CALIBRATION" icon={ShieldCheck}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
              <span>{a.icon} {a.agent}</span>
              <span style={{ fontWeight: 700 }}>{Math.round((a.trust_score ?? 1) * 100)}%</span>
            </div>
            <div style={{ height: 2, background: 'var(--km-border)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(a.trust_score ?? 1) * 100}%`, background: (a.trust_score ?? 1) > 0.85 ? 'var(--km-healthy)' : 'var(--km-warn)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="AUTONOMY CONTROLS" icon={Settings}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.agents || []).map(a => {
          const risk = a.confidence < 0.7 ? 'HIGH' : a.confidence < 0.85 ? 'MEDIUM' : 'LOW';
          return (
            <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: risk === 'HIGH' ? 'var(--km-danger)' : risk === 'MEDIUM' ? 'var(--km-warn)' : 'var(--km-healthy)' }}>{risk}</span>
            </div>
          );
        })}
      </div>
    </Panel>
    <Panel title="GOVERNANCE POLICIES" icon={Fingerprint}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { policy: 'Max agent confidence', value: '1.0', status: 'ENFORCED' },
          { policy: 'Trust floor', value: '0.60', status: 'ENFORCED' },
          { policy: 'Evidence decay', value: '300s', status: 'ACTIVE' },
          { policy: 'Blast radius limit', value: '5 svcs', status: 'ACTIVE' },
          { policy: 'Auto-stabilize mode', value: state?.stabilization_mode || 'RECOMMEND', status: 'LIVE' },
        ].map(p => (
          <div key={p.policy} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>{p.policy}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-accent)' }}>{p.value}</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)' }}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="REMEDIATION PERMISSIONS" icon={Shield}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['OBSERVE', 'RECOMMEND', 'APPROVE', 'STABILIZE'].map(m => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: state?.stabilization_mode === m ? 'var(--km-accent-glow)' : 'var(--km-surface-alt)', borderRadius: 4, marginBottom: 4, border: state?.stabilization_mode === m ? '1px solid var(--km-accent)' : '1px solid transparent' }}>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: state?.stabilization_mode === m ? 'var(--km-accent)' : 'var(--km-muted)' }}>{m}</span>
            {state?.stabilization_mode === m && <span style={{ fontSize: 8, color: 'var(--km-accent)' }}>● ACTIVE</span>}
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="DECISION AUDIT TRAILS" icon={History}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--km-accent)' }}>v{c.version || 1} — {c.name?.slice(0, 30)}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{c.root_cause_pod} → {c.affected_pods?.slice(1).join(', ')}</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No decision trails logged</div>}
      </div>
    </Panel>
    <Panel title="UNCERTAINTY VISUAL" icon={Microscope}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>{a.agent.split(' ')[0]}</span>
            <span style={{ color: a.confidence < 0.7 ? 'var(--km-danger)' : a.confidence < 0.85 ? 'var(--km-warn)' : 'var(--km-healthy)' }}>
              {a.confidence < 0.7 ? 'HIGH UNCERTAINTY' : a.confidence < 0.85 ? 'MEDIUM' : 'LOW'}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  </PageWorkspace>
);

export const InfrastructureFabric = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Infrastructure Fabric" icon={Network}>
    <Panel title="TOPOLOGY INTELLIGENCE" icon={Globe}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.pods || []).slice(0, 8).map(p => (
          <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700 }}>{p.pod_name}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 7, color: p.status === 'Running' ? 'var(--km-healthy)' : 'var(--km-danger)' }}>{p.status}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="DEPENDENCY FLOW" icon={Share2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-muted)' }}>
            {c.causal_chain?.join(' → ') || c.root_cause_pod}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No active dependency flows</div>}
      </div>
    </Panel>
    <Panel title="RISK HEATMAP" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.pods || []).filter(p => p.cpu_percent > 50 || (p.memory_mb / Math.max(p.memory_limit_mb, 1)) > 0.6).slice(0, 8).map(p => {
          const risk = Math.max(p.cpu_percent, (p.memory_mb / Math.max(p.memory_limit_mb, 1)) * 100);
          return (
            <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: risk > 80 ? 'var(--km-danger-glow)' : 'var(--km-surface-alt)', borderRadius: 3 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: risk > 80 ? 'var(--km-danger)' : 'inherit' }}>{p.pod_name}</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 7 }}>{risk.toFixed(0)}%</span>
            </div>
          );
        })}
        {!((state?.pods || []).filter(p => p.cpu_percent > 50).length) && <div className="empty-state-text">All pods within safe limits</div>}
      </div>
    </Panel>
    <Panel title="ACTIVE BLAST RADIUS" icon={Radar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.correlations || []).map((c: any, i: number) => (
          <div key={i} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--km-danger)' }}>Root: {c.root_cause_pod}</div>
            <div style={{ fontSize: 9, color: 'var(--km-secondary)', margin: '4px 0' }}>
              Blast radius: {c.affected_pods?.length || 0} services
            </div>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)' }}>
              {c.affected_pods?.join(' → ')}
            </div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No active blast radius</div>}
      </div>
    </Panel>
    <Panel title="PROPAGATION PATHS" icon={Activity}>
      {state?.correlations?.map((c: any, i: number) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(c.causal_chain || []).map((step: string, j: number) => (
              <React.Fragment key={j}>
                <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, padding: '1px 5px', background: j === 0 ? 'var(--km-danger-glow)' : 'var(--km-surface)', borderRadius: 3, color: j === 0 ? 'var(--km-danger)' : 'var(--km-muted)' }}>{step}</span>
                {j < c.causal_chain.length - 1 && <span style={{ color: 'var(--km-dim)', fontSize: 10 }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      {!(state?.correlations?.length) && <div className="empty-state-text">No causal chains</div>}
    </Panel>
    <Panel title="CAUSAL REPLAY" icon={History}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 3).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 7, color: 'var(--km-dim)' }}>
              {c.causal_chain?.join(' ← ')}
            </div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No causal chains to replay</div>}
      </div>
    </Panel>
  </PageWorkspace>
);

export const NamespaceIntelligence = ({ state }: { state: ClusterState }) => {
  const namespaces = [...new Set((state?.pods || []).map(p => p.namespace))];
  return (
    <PageWorkspace title="Namespace Intelligence" icon={Globe}>
      <Panel title="NAMESPACE TOPOLOGY" icon={Globe}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {namespaces.map(ns => {
            const nsPods = (state?.pods || []).filter(p => p.namespace === ns);
            const avgCpu = nsPods.length ? nsPods.reduce((s, p) => s + p.cpu_percent, 0) / nsPods.length : 0;
            return (
              <div key={ns} style={{ padding: '8px 10px', background: 'var(--km-surface-alt)', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 11 }}>{ns}</span>
                  <span style={{ fontSize: 9, color: 'var(--km-muted)' }}>{nsPods.length} pods</span>
                </div>
                <div style={{ height: 3, background: 'var(--km-border)', borderRadius: 1.5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${avgCpu}%`, background: avgCpu > 70 ? 'var(--km-danger)' : 'var(--km-accent)', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 8, color: 'var(--km-dim)', marginTop: 4, textAlign: 'right' }}>CPU {avgCpu.toFixed(0)}%</div>
              </div>
            );
          })}
          {!namespaces.length && <div className="empty-state-text">Loading namespace data...</div>}
        </div>
      </Panel>
      <Panel title="RESOURCE ISOLATION" icon={ShieldCheck}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(state?.pods || []).reduce((acc: any[], p) => {
            const existing = acc.find(a => a.ns === p.namespace);
            if (existing) existing.count++; else acc.push({ ns: p.namespace, count: 1 });
            return acc;
          }, []).map((ns: any) => (
            <div key={ns.ns} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '3px 6px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
              <span>{ns.ns}</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontWeight: 700 }}>{ns.count} pods</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="CROSS-NAMESPACE FLOW" icon={Share2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
            <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-muted)' }}>
              {c.root_cause_pod} → {c.affected_pods?.slice(1, 4).join(', ')}
            </div>
          ))}
          {!(state?.correlations?.length) && <div className="empty-state-text">No cross-namespace flows</div>}
        </div>
      </Panel>
      <Panel title="LOGICAL BOUNDARIES" icon={Fingerprint}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(state?.pods || []).reduce((acc: any[], p) => {
            const existing = acc.find(a => a.ns === p.namespace);
            if (existing) existing.anomalies += (state?.anomalies || []).filter(a => a.pod_id === p.pod_id).length;
            else acc.push({ ns: p.namespace, anomalies: (state?.anomalies || []).filter(a => a.pod_id === p.pod_id).length });
            return acc;
          }, []).map((ns: any) => (
            <div key={ns.ns} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
              <span>{ns.ns}</span>
              <span style={{ color: ns.anomalies > 0 ? 'var(--km-warn)' : 'var(--km-dim)' }}>{ns.anomalies} anomalies</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="TENANT RISK" icon={Target}>
        {namespaces.map(ns => {
          const nsAnomalies = (state?.anomalies || []).filter(a => (state?.pods || []).find(p => p.pod_id === a.pod_id)?.namespace === ns);
          return nsAnomalies.length > 0 ? (
            <div key={ns} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0' }}>
              <span>{ns}</span>
              <span style={{ color: 'var(--km-danger)', fontWeight: 700 }}>{nsAnomalies.length} anomalies</span>
            </div>
          ) : null;
        })}
        {!(state?.anomalies?.length) && <div className="empty-state-text">No anomalies by namespace</div>}
      </Panel>
      <Panel title="QUOTA PREDICTION" icon={Activity}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(state?.predictions || []).slice(0, 4).map((p: any, i: number) => (
            <div key={i} style={{ fontSize: 9 }}>
              <span style={{ fontWeight: 700 }}>{p.metric}</span> on {p.pod_id}
              <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>
                {p.current?.toFixed(1)} / {p.threshold} — ~{p.ttf_minutes}m remaining
              </div>
            </div>
          ))}
          {!(state?.predictions?.length) && <div className="empty-state-text">No quota predictions</div>}
        </div>
      </Panel>
    </PageWorkspace>
  );
};

export const DigitalTwinLab = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Digital Twin Lab" icon={Microscope}>
    <Panel title="SCENARIO STATUS" icon={Settings}>
      <div style={{ padding: 12, background: 'var(--km-accent-glow)', border: '1px solid var(--km-accent)', borderRadius: 8 }}>
        <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)', marginBottom: 8 }}>
          {state?.anomaly_mode ? `⚡ ${state.anomaly_mode.replace(/_/g, ' ').toUpperCase()}` : '✓ NOMINAL — NO ACTIVE SCENARIO'}
        </div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>Health Score: {state?.health?.score}/100</div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>Active Anomalies: {state?.health?.anomaly_count || 0}</div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>Predictions: {state?.predictions?.length || 0}</div>
      </div>
    </Panel>
    <Panel title="SIMULATION VIEWPORT" icon={Activity}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--km-accent)' }}>Digital Twin Active</div>
        <div style={{ fontSize: 9, color: 'var(--km-dim)', marginTop: 4 }}>{state?.pods?.length || 0} pods · {state?.anomalies?.length || 0} anomalies</div>
      </div>
    </Panel>
    <Panel title="PROPAGATION ENGINE" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 3).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-muted)' }}>
            {c.causal_chain?.join(' → ')}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No propagation active</div>}
      </div>
    </Panel>
    <Panel title="SURVIVABILITY ANALYSIS" icon={ShieldCheck}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px', background: (state?.health?.score ?? 100) > 80 ? 'var(--km-surface-alt)' : 'var(--km-warn-glow)', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: (state?.health?.score ?? 100) > 80 ? 'var(--km-healthy)' : 'var(--km-warn)' }}>
            {(state?.health?.score ?? 100)}%
          </div>
          <div style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)' }}>Survivability Score</div>
        </div>
      </div>
    </Panel>
    <Panel title="FUTURE STATE REPLAY" icon={History}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.predictions || []).slice(0, 3).map((p: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700 }}>{p.pod_id} — ~{p.ttf_minutes}m</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>Severity: {p.severity}</div>
          </div>
        ))}
        {!(state?.predictions?.length) && <div className="empty-state-text">No future states queued</div>}
      </div>
    </Panel>
    <Panel title="MITIGATION OUTCOME" icon={Target}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--km-secondary)' }}>
          {(state?.agents || []).filter(a => a.recommendation).length > 0
            ? `${(state?.agents || []).filter(a => a.recommendation).length} recommendations active`
            : 'No mitigations in progress'}
        </div>
      </div>
    </Panel>
  </PageWorkspace>
);

export const ScenarioSimulator = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Scenario Simulator" icon={TestTube2}>
    <Panel title="ACTIVE ANOMALIES" icon={AlertTriangle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.anomalies || []).slice(0, 8).map((a, i) => (
          <div key={i} style={{ padding: '5px 7px', background: 'var(--km-surface-alt)', borderRadius: 4, borderLeft: `2px solid ${a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}` }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }}>{a.pod_name} · {a.metric}</div>
            <div style={{ fontSize: 9 }}>{a.message}</div>
          </div>
        ))}
        {!(state?.anomalies?.length) && <div className="empty-state-text">No active anomalies. Trigger a scenario.</div>}
      </div>
    </Panel>
    <Panel title="TRAFFIC SPIKE SIM" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.pods || []).filter(p => p.network_in_mbps > 3).slice(0, 5).map(p => (
          <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '3px 6px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
            <span>{p.pod_name}</span>
            <span style={{ fontFamily: 'var(--km-mono)', color: p.network_in_mbps > 5 ? 'var(--km-warn)' : 'var(--km-dim)' }}>{p.network_in_mbps?.toFixed(1)} MB/s</span>
          </div>
        ))}
        {!(state?.pods || []).filter(p => p.network_in_mbps > 3).length && <div className="empty-state-text">Traffic normal — no spike</div>}
      </div>
    </Panel>
    <Panel title="MEMORY LEAK SIM" icon={Database}>
      <AgentList agents={(state?.agents || []).filter(a => a.domain?.includes('Memory'))} />
    </Panel>
    <Panel title="RETRY STORM SIM" icon={Share2}>
      <AgentList agents={(state?.agents || []).filter(a => a.domain?.includes('Network') || a.domain?.includes('Traffic'))} />
    </Panel>
    <Panel title="PARTITION SIM" icon={Network}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 3).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{c.affected_pods?.length} pods affected</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No partition scenarios active</div>}
      </div>
    </Panel>
    <Panel title="ROLLBACK SIM" icon={History}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--km-secondary)' }}>
          {(state?.agents || []).filter(a => a.domain?.includes('Stabilization')).length > 0
            ? 'Stabilization agent available for rollback'
            : 'No rollback scenarios active'}
        </div>
      </div>
    </Panel>
  </PageWorkspace>
);

export const OperationalMemory = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Operational Memory" icon={History}>
    <Panel title="FINGERPRINT EXPLORER" icon={Fingerprint}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--km-accent)' }}>v{c.version || 1}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{c.rule_id} · {c.causal_evidence?.evidence_count || 0} evidence items</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No fingerprints recorded</div>}
      </div>
    </Panel>
    <Panel title="INCIDENT LINEAGE" icon={History}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).map((c: any, i: number) => (
          <div key={i} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700 }}>v{c.version || 1} — {c.name}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>
              {c.previous_version_id ? `Prev: ${c.previous_version_id.slice(0, 8)}...` : 'First occurrence'}
            </div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No incident lineage</div>}
      </div>
    </Panel>
    <Panel title="REMEDIATION MEMORY" icon={ShieldCheck}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700 }}>{c.root_cause_pod}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{(c.recommendations || [])[0] || 'No recs'}</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No remediation history</div>}
      </div>
    </Panel>
    <Panel title="RECURRING PATTERNS" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).filter(a => a.status !== 'INFO').slice(0, 4).map(a => (
          <div key={a.agent} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: a.status === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }}>
              {a.icon} {a.finding?.slice(0, 40)}
            </div>
          </div>
        ))}
        {!(state?.agents || []).filter(a => a.status !== 'INFO').length && <div className="empty-state-text">No recurring patterns</div>}
      </div>
    </Panel>
    <Panel title="CAUSAL CHAINS" icon={Binary}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-muted)' }}>
            {c.causal_chain?.join(' → ')}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No causal chains recorded</div>}
      </div>
    </Panel>
    <Panel title="EVIDENCE REPOSITORY" icon={Database}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).map((c: any, i: number) => (
          <div key={i}>
            {(c.reasoning_audit_trail || []).slice(0, 3).map((t: any, j: number) => (
              <div key={j} style={{ fontSize: 9, color: 'var(--km-secondary)' }}>
                → {t.type}: {t.pod} ({t.metric})
              </div>
            ))}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No evidence chains</div>}
      </div>
    </Panel>
  </PageWorkspace>
);

export const SemanticLogs = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Semantic Log Intelligence" icon={Terminal}>
    <Panel title="SEMANTIC LOG STREAM" icon={Terminal}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.agents || []).filter(a => a.domain?.includes('Log') || a.domain?.includes('Linguistic')).map(a => (
          <div key={a.agent} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 5, borderLeft: `2px solid ${a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-border)'}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{a.icon} {a.agent}</div>
            <div style={{ fontSize: 10, color: 'var(--km-secondary)' }}>{a.finding}</div>
          </div>
        ))}
        {!(state?.agents || []).filter(a => a.domain?.includes('Log')).length && (
          <div className="empty-state-text">Log agent monitoring...</div>
        )}
      </div>
    </Panel>
    <Panel title="LOG ANOMALY DETECTION" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.anomalies || []).map((a, i) => (
          <div key={i} style={{ padding: '5px 8px', background: 'var(--km-surface-alt)', borderRadius: 4, borderLeft: `2px solid ${a.severity === 'CRITICAL' ? 'var(--km-danger)' : a.severity === 'WARNING' ? 'var(--km-warn)' : 'var(--km-border)'}` }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }}>{a.pod_name}</div>
            <div style={{ fontSize: 9 }}>{a.message}</div>
          </div>
        ))}
        {!(state?.anomalies?.length) && <div className="empty-state-text">No anomalies</div>}
      </div>
    </Panel>
    <Panel title="NLP ROOT CAUSE" icon={Target}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 9 }}>
            <span style={{ fontWeight: 700, color: 'var(--km-danger)' }}>{c.root_cause_pod}</span>: {c.summary?.slice(0, 60)}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No NLP root cause data</div>}
      </div>
    </Panel>
    <Panel title="CORRELATION GRAPH" icon={Share2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-muted)' }}>
            {c.root_cause_pod} ↔ {c.affected_pods?.slice(1, 4).join(', ')}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No correlations to graph</div>}
      </div>
    </Panel>
    <Panel title="KEYWORD EXTRACTION" icon={Binary}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.anomalies || []).slice(0, 6).map((a, i) => (
          <div key={i} style={{ fontSize: 8, padding: '2px 4px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
            <span style={{ fontWeight: 700 }}>{a.metric}</span> {a.message?.slice(0, 40)}
          </div>
        ))}
        {!(state?.anomalies?.length) && <div className="empty-state-text">No keywords extracted</div>}
      </div>
    </Panel>
    <Panel title="REASONING LINKS" icon={Brain}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => a.reasoning?.length > 0 ? (
          <div key={a.agent} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--km-accent)', marginBottom: 4 }}>{a.agent.split(' ')[0]}</div>
            {a.reasoning.slice(0, 2).map((r, j) => (
              <div key={j} style={{ fontSize: 9, color: 'var(--km-muted)' }}>↳ {r}</div>
            ))}
          </div>
        ) : null)}
      </div>
    </Panel>
  </PageWorkspace>
);

export const CausalAnalytics = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Causal Analytics" icon={Zap}>
    <Panel title="CAUSAL INFERENCE" icon={Binary}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(state?.correlations || []).map((c: any, i: number) => (
          <div key={i} style={{ padding: '6px 8px', background: 'var(--km-surface-alt)', borderRadius: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--km-danger)' }}>
              ROOT: {c.root_cause_pod}
            </div>
            <div style={{ fontSize: 9, color: 'var(--km-secondary)', marginTop: 4 }}>
              Centrality: {c.causal_evidence?.centrality_score ?? 'N/A'} · Evidence: {c.causal_evidence?.evidence_count ?? 0}
            </div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No causal data</div>}
      </div>
    </Panel>
    <Panel title="EFFECT ESTIMATION" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700 }}>{c.root_cause_pod}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>Effect: {c.affected_pods?.length} services</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No effects to estimate</div>}
      </div>
    </Panel>
    <Panel title="COUNTERFACTUALS" icon={Microscope}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).slice(0, 4).map(a => (
          <div key={a.agent} style={{ fontSize: 9 }}>
            <span style={{ fontWeight: 700 }}>{a.agent.split(' ')[0]}</span>
            <span style={{ color: 'var(--km-dim)', marginLeft: 4 }}>
              {a.confidence > 0.85 ? 'Stable inference' : 'Need more evidence'}
            </span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="INTERVENTION ANALYSIS" icon={Target}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.correlations || []).slice(0, 4).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 9 }}>
            <span style={{ fontWeight: 700, color: 'var(--km-accent)' }}>Intervene on {c.root_cause_pod}</span>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>{(c.recommendations || [])[0]}</div>
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No interventions to analyze</div>}
      </div>
    </Panel>
    <Panel title="CAUSAL GRAPH" icon={Network}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.correlations || []).slice(0, 3).map((c: any, i: number) => (
          <div key={i} style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)' }}>
            {c.causal_chain?.join(' ↔ ')}
          </div>
        ))}
        {!(state?.correlations?.length) && <div className="empty-state-text">No causal graph data</div>}
      </div>
    </Panel>
    <Panel title="PROPAGATION PATHS" icon={Share2}>
      {state?.correlations?.map((c: any, i: number) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(c.causal_chain || []).map((step: string, j: number) => (
              <React.Fragment key={j}>
                <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, padding: '1px 5px', background: j === 0 ? 'var(--km-danger-glow)' : 'var(--km-surface)', borderRadius: 3, color: j === 0 ? 'var(--km-danger)' : 'var(--km-muted)' }}>{step}</span>
                {j < c.causal_chain.length - 1 && <span style={{ color: 'var(--km-dim)', fontSize: 10 }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      {!(state?.correlations?.length) && <div className="empty-state-text">No propagation paths</div>}
    </Panel>
  </PageWorkspace>
);

export const CognitiveHealth = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Cognitive Health" icon={Heart}>
    <Panel title="EVENT FABRIC BUS" icon={Network}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { queue: 'TelemetryMetricsEvent', est: 'Low — 2s cadence', color: 'var(--km-healthy)' },
          { queue: 'AnomalyEvent', est: state?.health?.anomaly_count > 0 ? 'Active' : 'Idle', color: state?.health?.anomaly_count > 0 ? 'var(--km-warn)' : 'var(--km-healthy)' },
          { queue: 'AgentInsightEvent', est: `${state?.agents?.length || 0} msgs/cycle`, color: 'var(--km-accent)' },
          { queue: 'PredictionEvent', est: `${state?.predictions?.length || 0} active`, color: (state?.predictions?.length ?? 0) > 0 ? 'var(--km-warn)' : 'var(--km-healthy)' },
          { queue: 'CorrelationEvent', est: `${state?.correlations?.length || 0} active`, color: (state?.correlations?.length ?? 0) > 0 ? 'var(--km-danger)' : 'var(--km-healthy)' },
        ].map(q => (
          <div key={q.queue} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--km-muted)' }}>{q.queue}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: q.color }}>{q.est}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="AGENT RUNTIME MONITOR" icon={Cpu}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => a.governance ? (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>{a.governance.avg_latency_ms}ms avg</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 8, color: 'var(--km-dim)' }}>×{a.governance.cycle_count}</span>
                <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.governance.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-danger)' }}>{a.governance.health}</span>
              </div>
            </div>
          </div>
        ) : null)}
      </div>
    </Panel>
    <Panel title="COGNITION STABILITY" icon={ShieldCheck}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: state?.health?.score > 80 ? 'var(--km-healthy)' : state?.health?.score > 50 ? 'var(--km-warn)' : 'var(--km-danger)', marginBottom: 4 }}>
          {state?.health?.score}/100
        </div>
        <div style={{ fontSize: 9, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', textTransform: 'uppercase' }}>Fabric Stability Score</div>
        <div style={{ height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
          <div style={{ height: '100%', width: `${state?.health?.score}%`, background: state?.health?.score > 80 ? 'var(--km-healthy)' : state?.health?.score > 50 ? 'var(--km-warn)' : 'var(--km-danger)', borderRadius: 2, transition: 'width 1s ease' }} />
        </div>
      </div>
    </Panel>
    <Panel title="LATENCY CASCADES" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.pods || []).filter(p => p.latency_ms > 50).slice(0, 5).map(p => (
          <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '3px 6px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
            <span>{p.pod_name}</span>
            <span style={{ fontFamily: 'var(--km-mono)', color: p.latency_ms > 100 ? 'var(--km-danger)' : 'var(--km-warn)' }}>{p.latency_ms.toFixed(0)}ms</span>
          </div>
        ))}
        {!(state?.pods || []).filter(p => p.latency_ms > 50).length && <div className="empty-state-text">No latency cascades</div>}
      </div>
    </Panel>
    <Panel title="INTEGRITY MONITOR" icon={Fingerprint}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>{a.agent.split(' ')[0]}</span>
            <span style={{ color: a.governance?.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-warn)' }}>
              {a.governance?.health || 'MONITORING'}
            </span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="RUNTIME HEALTH" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.pods || []).slice(0, 6).map(p => (
          <div key={p.pod_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, padding: '2px 4px', background: p.status === 'Running' ? 'transparent' : 'var(--km-warn-glow)', borderRadius: 2 }}>
            <span style={{ fontWeight: 700 }}>{p.pod_name}</span>
            <span style={{ color: p.status === 'Running' ? 'var(--km-healthy)' : 'var(--km-warn)' }}>{p.status}</span>
          </div>
        ))}
      </div>
    </Panel>
  </PageWorkspace>
);

export const AgentLifecycle = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Agent Lifecycle" icon={Cpu}>
    <Panel title="AGENT ORCHESTRATION" icon={Cpu}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).filter(a => a.governance).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)' }}>
              {a.governance!.avg_latency_ms}ms
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="MEMORY ALLOCATION" icon={Database}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
              <span>{a.icon} {a.agent.split(' ')[0]}</span>
              <span style={{ fontWeight: 700 }}>{Math.round((a.trust_score ?? 1) * 100)}%</span>
            </div>
            <div style={{ height: 2, background: 'var(--km-border)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(a.trust_score ?? 1) * 100}%`, background: (a.trust_score ?? 1) > 0.85 ? 'var(--km-healthy)' : 'var(--km-warn)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="LIFECYCLE STATUS" icon={Settings}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: a.governance?.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-danger)' }}>
              {a.governance?.health || 'UNKNOWN'}
            </span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="COMMUNICATION FLOW" icon={Share2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).filter(a => a.governance).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10 }}>{a.agent.split(' ')[0]}</span>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'var(--km-muted)' }}>×{a.governance!.cycle_count}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="REASONING LATENCY" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).filter(a => a.governance).slice(0, 5).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>{a.agent.split(' ')[0]}</span>
            <span style={{ fontFamily: 'var(--km-mono)', color: (a.governance?.avg_latency_ms || 0) > 100 ? 'var(--km-warn)' : 'var(--km-dim)' }}>
              {a.governance?.avg_latency_ms}ms
            </span>
          </div>
        ))}
        {!(state?.agents || []).filter(a => a.governance).length && <div className="empty-state-text">No latency data</div>}
      </div>
    </Panel>
    <Panel title="AGENT DEPLOYMENT" icon={Zap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.agents || []).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
            <span style={{ fontWeight: 700 }}>{a.agent}</span>
            <span style={{ color: a.governance?.health === 'HEALTHY' ? 'var(--km-healthy)' : 'var(--km-dim)' }}>
              {a.governance?.cycle_count || 0} cycles
            </span>
          </div>
        ))}
      </div>
    </Panel>
  </PageWorkspace>
);

export const ExecutiveOps = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Executive Operations" icon={Target}>
    <Panel title="STRATEGIC RISK" icon={Radar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: (state?.health?.critical_count || 0) > 0 ? 'var(--km-danger)' : 'var(--km-healthy)' }}>
            {state?.health?.critical_count || 0} critical
          </div>
          <div style={{ fontSize: 9, color: 'var(--km-dim)' }}>Strategic risk indicators</div>
        </div>
        <div style={{ fontSize: 8, color: 'var(--km-muted)', textAlign: 'center' }}>
          {(state?.predictions?.length || 0) > 0 ? `${state?.predictions?.length} predicted failure(s)` : 'No strategic risks identified'}
        </div>
      </div>
    </Panel>
    <Panel title="ENTERPRISE STABILITY" icon={ShieldCheck}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.agents || []).slice(0, 5).map(a => (
          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '3px 6px', background: 'var(--km-surface-alt)', borderRadius: 3 }}>
            <span>{a.agent.split(' ')[0]}</span>
            <span style={{ color: a.status === 'CRITICAL' ? 'var(--km-danger)' : a.status === 'WARNING' ? 'var(--km-warn)' : 'var(--km-healthy)' }}>{a.status}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="LONG-TERM FORECAST" icon={Activity}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(state?.predictions || []).slice(0, 4).map((p: any, i: number) => (
          <div key={i} style={{ padding: '4px 6px', background: 'var(--km-surface-alt)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontWeight: 700 }}>{p.pod_id}</div>
            <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>TTF: ~{p.ttf_minutes}m</div>
          </div>
        ))}
        {!(state?.predictions?.length) && <div className="empty-state-text">No long-term forecasts</div>}
      </div>
    </Panel>
    <Panel title="RESILIENCE POSTURE" icon={Heart}>
      <div style={{ padding: 12, background: (state?.health?.score ?? 100) > 80 ? 'var(--km-healthy-glow)' : 'var(--km-warn-glow)', borderRadius: 8, textAlign: 'center', border: `1px solid ${(state?.health?.score ?? 100) > 80 ? 'var(--km-healthy)' : 'var(--km-warn)'}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: (state?.health?.score ?? 100) > 80 ? 'var(--km-healthy)' : 'var(--km-warn)' }}>
          {(state?.health?.score ?? 100) > 80 ? 'RESILIENT' : (state?.health?.score ?? 100) > 50 ? 'DEGRADED' : 'CRITICAL'}
        </div>
        <div style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', marginTop: 4 }}>{(state?.health?.score ?? 100)}/100</div>
      </div>
    </Panel>
    <Panel title="INFRASTRUCTURE POSTURE" icon={Globe}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.pods || []).slice(0, 6).map(p => (
          <div key={p.pod_id} style={{ fontSize: 8, display: 'flex', justifyContent: 'space-between', padding: '2px 4px', borderLeft: `2px solid ${p.status === 'Running' ? 'var(--km-healthy)' : 'var(--km-warn)'}` }}>
            <span>{p.pod_name}</span>
            <span style={{ fontFamily: 'var(--km-mono)' }}>{p.node}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="ORG RISK ANALYTICS" icon={Target}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: state?.health?.score > 80 ? 'var(--km-healthy)' : 'var(--km-danger)', marginBottom: 4 }}>{state?.health?.score}%</div>
        <div style={{ fontSize: 9, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', textTransform: 'uppercase' }}>Overall Risk Score</div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)', marginTop: 12 }}>
          {state?.health?.critical_count} critical · {state?.health?.warning_count} warnings · {state?.health?.pod_count} pods
        </div>
      </div>
    </Panel>
  </PageWorkspace>
);

export const MissionControl = ({ state }: { state: ClusterState }) => (
  <PageWorkspace title="Live Mission Control" icon={Activity}>
    <Panel title="CLUSTER FABRIC" icon={Network}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)', marginBottom: 4 }}>
          {state?.pods?.length || 0} pods across {
            new Set((state?.pods || []).map(p => p.namespace)).size
          } namespaces
        </div>
        {(state?.pods || []).slice(0, 6).map(p => (
          <div key={p.pod_id} style={{ fontSize: 8, display: 'flex', justifyContent: 'space-between', padding: '2px 4px', background: 'var(--km-surface-alt)', borderRadius: 2 }}>
            <span>{p.pod_name}</span>
            <span style={{ color: p.status === 'Running' ? 'var(--km-healthy)' : 'var(--km-warn)' }}>{p.status}</span>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="ACTIVE INCIDENTS" icon={Zap}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', border: '1px solid var(--km-border)', borderRadius: 8 }}>
        <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)', marginBottom: 8 }}>
          {state?.anomaly_mode ? `SCENARIO: ${state.anomaly_mode.replace(/_/g, ' ').toUpperCase()}` : 'NO ACTIVE SCENARIO'}
        </div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>Tick: {state?.tick || 0}</div>
        <div style={{ fontSize: 9, color: 'var(--km-secondary)' }}>Status: {state?.health?.status?.toUpperCase()}</div>
      </div>
    </Panel>
    <Panel title="SIMULATION STREAM" icon={Microscope}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: 8, background: 'var(--km-surface-alt)', borderRadius: 6, fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-muted)' }}>
          {state?.anomaly_mode ? `Anomaly: ${state.anomaly_mode.replace(/_/g, ' ')}` : 'No active simulation'}
        </div>
        <div style={{ fontSize: 8, color: 'var(--km-dim)' }}>Tick: {state?.tick || 0} · Items: {state?.anomalies?.length || 0}</div>
      </div>
    </Panel>
    <Panel title="GOVERNANCE MODE" icon={ShieldCheck}>
      <div style={{ padding: 12, background: 'var(--km-accent-glow)', border: '1px solid var(--km-accent)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--km-accent)' }}>{state?.stabilization_mode || 'RECOMMEND'}</div>
        <div style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', marginTop: 4 }}>Current autonomy level</div>
      </div>
    </Panel>
    <Panel title="COMMAND INPUT" icon={Terminal}>
      <div style={{ padding: 12, background: 'var(--km-surface-alt)', borderRadius: 8, fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>
        <div>{'>'} kubemind analyze --deep</div>
        <div style={{ color: 'var(--km-accent)', marginTop: 4 }}>
          ✓ {state?.agents?.length || 0} agents · {state?.correlations?.length || 0} incidents
        </div>
      </div>
    </Panel>
    <Panel title="COGNITIVE FEED" icon={Brain}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(state?.agents || []).slice(0, 5).map(a => (
          <div key={a.agent} style={{ fontSize: 8, padding: '3px 6px', borderLeft: `2px solid ${a.status === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-accent)'}` }}>
            <span style={{ fontWeight: 700 }}>{a.icon} {a.agent.split(' ')[0]}: </span>
            <span style={{ color: 'var(--km-dim)' }}>{a.finding?.slice(0, 50)}</span>
          </div>
        ))}
        {!(state?.agents?.length) && <div className="empty-state-text">Waiting for cognitive feed...</div>}
      </div>
    </Panel>
  </PageWorkspace>
);
