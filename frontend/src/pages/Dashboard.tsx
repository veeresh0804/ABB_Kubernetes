import React, { useMemo, useContext, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, ShieldCheck, Users, Terminal, Zap, TrendingUp, AlertOctagon, Target, History, Database, ArrowRight } from 'lucide-react';
import type { ClusterState, AgentInsight } from '../hooks/useCluster';
import { OperationalStory } from '../components/OperationalStory';
import { NamespaceContext } from '../components/Layout';

const AetherMetric = React.memo(function AetherMetric({
  label, value, sub, subColor, children, icon: Icon
}: {
  label: string; value: string; sub: string; subColor: string; children?: React.ReactNode; icon?: any;
}) {
  return (
    <div className="card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.03 }}>
        {Icon && <Icon size={80} />}
      </div>
      <p style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--km-display)', fontSize: 28, fontWeight: 700, color: 'var(--km-text)', letterSpacing: '-0.03em' }}>{value}</span>
        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: subColor }}>{sub}</span>
      </div>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
});

// Advanced Topology Engine with Predictive Overlays
const TopologyMesh = React.memo(function TopologyMesh({ state }: { state: ClusterState }) {
  const { graph } = state;
  const sevColor = (s: string) => s === 'critical' ? 'var(--km-danger)' : s === 'warning' ? 'var(--km-warn)' : 'var(--km-healthy)';
  const sevBg = (s: string) => s === 'critical' ? 'rgba(239,68,68,0.15)' : s === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)';

  const option = useMemo(() => {
    if (!graph.nodes.length) return {};
    const eNodes = graph.nodes.map(n => ({
      id: n.id, name: n.label,
      symbolSize: n.severity === 'critical' ? 42 : n.severity === 'warning' ? 36 : 30,
      itemStyle: {
        color: sevBg(n.severity),
        borderColor: sevColor(n.severity),
        borderWidth: n.severity === 'critical' ? 2.5 : 1.5,
        shadowBlur: n.severity === 'critical' ? 12 : 0,
        shadowColor: sevColor(n.severity),
      },
      label: { show: true, formatter: (p: any) => `${p.name}`, color: 'var(--km-text)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', position: 'bottom', distance: 5 },
    }));
    const eEdges = graph.edges.map((e, i) => ({
      id: String(i), source: e.source, target: e.target,
      lineStyle: { color: e.hot ? '#EF4444' : 'var(--km-border)', width: e.hot ? 2.5 : 1.2, curveness: 0.15, opacity: e.hot ? 0.9 : 0.4 },
      symbol: ['none', 'arrow'], symbolSize: [0, 6],
      effect: e.hot ? { show: true, period: 4, trailLength: 0.5, color: '#EF4444', symbolSize: 3 } : undefined,
    }));
    return {
      backgroundColor: 'transparent',
      series: [{
        type: 'graph', layout: 'force', data: eNodes, edges: eEdges,
        roam: true, draggable: true,
        force: { repulsion: 150, gravity: 0.1, edgeLength: 120, friction: 0.15 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        animation: true, animationDuration: 800, animationEasing: 'exponentialOut',
      }],
    };
  }, [graph.nodes, graph.edges]);

  if (!graph.nodes.length) return <div className="empty-state" style={{ height: 380 }}><div className="empty-state-text">Initializing topology mesh...</div></div>;

  return <ReactECharts option={option} style={{ height: 380, width: '100%' }} opts={{ renderer: 'canvas' }} />;
});

// Priority 9: Operational Memory Explorer
function MemoryExplorer({ namespace }: { namespace: string }) {
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/incident-log?namespace=${namespace}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.log || []);
        }
      } catch { /* ignore */ }
    };
    fetchHistory();
  }, [namespace]);

  if (history.length === 0) return null;

  return (
    <div className="card" style={{ padding: 20 }}>
       <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--km-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
         <Database size={12} className="text-accent" /> Operational Memory Patterns
       </div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
         {history.slice(0, 3).map((item, i) => (
           <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
             <div style={{ padding: '2px 6px', background: 'var(--km-surface)', borderRadius: 4, fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)' }}>
               {new Date(item.timestamp * 1000).toLocaleDateString()}
             </div>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--km-text)' }}>{item.name}</div>
               <div style={{ fontSize: 9, color: 'var(--km-muted)' }}>{item.summary}</div>
             </div>
             <div style={{ fontSize: 8, color: 'var(--km-healthy)', fontWeight: 700 }}>✓ MATCH</div>
           </div>
         ))}
       </div>
    </div>
  );
}

// Cognitive Prediction Mesh (Phase 6)
function PredictionMesh({ predictions }: { predictions: any[] }) {
  if (predictions.length === 0) return null;

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--km-danger)' }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div className="card-title">
          <Zap size={14} className="text-danger" /> Cognitive Failure Forecast
        </div>
        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>
          {predictions.length} risks detected
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {predictions.map((p, i) => {
          const pct = Math.min(100, Math.round((p.current / p.threshold) * 100));
          const isCrit = p.severity === 'CRITICAL';
          return (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < predictions.length - 1 ? '1px solid var(--km-border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, color: 'var(--km-text)' }}>{p.pod_name}</span>
                  <span style={{ fontSize: 9, color: 'var(--km-muted)', background: 'var(--km-surface)', padding: '1px 4px', borderRadius: 3 }}>{p.metric.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: isCrit ? 'var(--km-danger)' : 'var(--km-warn)' }}>
                    {isCrit ? 'IMMINENT' : `~${p.ttf_minutes}m`}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--km-dim)' }}>{Math.round(p.confidence * 100)}% conf</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 3, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isCrit ? 'var(--km-danger)' : 'var(--km-warn)', borderRadius: 2, transition: 'width 1s ease' }} />
                </div>
                {p.estimated_blast_radius && (
                   <span style={{ fontSize: 8, color: 'var(--km-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                     <Target size={8} /> Radius: {p.estimated_blast_radius}
                   </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NarrativeTimeline = React.memo(function NarrativeTimeline({ agents }: { agents: AgentInsight[] }) {
  const items = useMemo(() => {
    return agents.slice(0, 6).map(a => ({
      time: new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      text: a.finding,
      severity: a.status === 'CRITICAL' ? 'crit' : a.status === 'WARNING' ? 'warn' : 'info',
    }));
  }, [agents]);

  const dotColor = (s: string) => s === 'crit' ? 'var(--km-danger)' : s === 'warn' ? 'var(--km-warn)' : 'var(--km-accent)';

  if (items.length === 0) return <div className="empty-state"><div className="empty-state-text">Awaiting operational telemetry...</div></div>;

  return (
    <div className="narrative-timeline">
      {items.map((item, i) => (
        <div key={i} className="narrative-item">
          <span className="narrative-time">{item.time}</span>
          <span className="narrative-dot" style={{ background: dotColor(item.severity) }} />
          <span className="narrative-text">{item.text}</span>
        </div>
      ))}
    </div>
  );
});

export function Dashboard({ state, dataSource }: { state: ClusterState; dataSource?: 'live' | 'simulated' }) {
  const { health, pods, anomalies, correlations, agents, predictions = [], sparkline = [] } = state;
  const selectedNamespace = useContext(NamespaceContext);
  const filteredPods = selectedNamespace === 'all' ? pods : pods.filter(p => p.namespace === selectedNamespace);

  const avgCpu = useMemo(() => filteredPods.length ? filteredPods.reduce((s, p) => s + p.cpu_percent, 0) / filteredPods.length : 0, [filteredPods]);
  const avgMem = useMemo(() => {
    if (!filteredPods.length) return 0;
    return filteredPods.reduce((s, p) => s + (p.memory_mb / Math.max(p.memory_limit_mb, 1)) * 100, 0) / filteredPods.length;
  }, [filteredPods]);
  const maxLat = useMemo(() => filteredPods.length ? Math.max(...filteredPods.map(p => p.latency_ms || 0)) : 0, [filteredPods]);
  
  const riskScore = useMemo(() => {
    const pRisk = predictions.reduce((s, p) => s + (p.severity === 'CRITICAL' ? 20 : 5), 0);
    const aRisk = anomalies.reduce((s, a) => s + (a.severity === 'CRITICAL' ? 10 : 2), 0);
    return Math.min(100, pRisk + aRisk);
  }, [predictions, anomalies]);

  const riskColor = riskScore > 50 ? 'var(--km-danger)' : riskScore > 20 ? 'var(--km-warn)' : 'var(--km-healthy)';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Top Layer: Executive Intelligence */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <AetherMetric label="Operational Score" value={`${health.score}%`} sub={health.status.toUpperCase()} subColor={health.status === 'healthy' ? 'var(--km-healthy)' : 'var(--km-warn)'} icon={Activity}>
           <div style={{ height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
             <div style={{ height: '100%', width: `${health.score}%`, background: 'var(--km-healthy)', transition: 'width 1s ease' }} />
           </div>
        </AetherMetric>
        <AetherMetric label="Instability Risk" value={`${riskScore}%`} sub={riskScore > 40 ? 'HIGH' : 'STABLE'} subColor={riskColor} icon={TrendingUp}>
           <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
             {Array.from({ length: 12 }).map((_, i) => (
               <div key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < (riskScore / 8) ? riskColor : 'var(--km-border)' }} />
             ))}
           </div>
        </AetherMetric>
        <AetherMetric label="Active Incidents" value={String(correlations.length)} sub={correlations.length > 0 ? 'CRITICAL' : 'NOMINAL'} subColor={correlations.length > 0 ? 'var(--km-danger)' : 'var(--km-healthy)'} icon={AlertOctagon} />
        <AetherMetric label="AI Confidence" value={`${Math.round(state.agents.reduce((s, a) => s + a.confidence, 0) / Math.max(state.agents.length, 1) * 100)}%`} sub="AGGREGATED" subColor="var(--km-accent)" icon={ShieldCheck} />
      </section>

      {/* Middle Layer: Cognitive Analysis */}
      <section className="responsive-grid">
        {/* Topology Intelligence */}
        <div className="card" style={{ minHeight: 450, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={12} className="text-accent" />
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--km-text)' }}>Infrastructure Topology Fabric</span>
          </div>
          <TopologyMesh state={state} />
        </div>

        {/* Predictive & Story Layer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PredictionMesh predictions={predictions} />
          <MemoryExplorer namespace={selectedNamespace} />
          <OperationalStory correlation={correlations[0]} anomalies={anomalies} />
          
          <div className="card" style={{ flex: 1, padding: 20 }}>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--km-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={12} /> Intelligence Stream
            </div>
            <NarrativeTimeline agents={agents} />
          </div>
        </div>
      </section>

      {/* Lower Layer: Engineering Telemetry */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--km-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(24,24,27,0.2)' }}>
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-text)' }}>POD ANALYTICS ({filteredPods.length})</span>
          <Terminal size={14} style={{ color: 'var(--km-dim)' }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'rgba(9,9,11,0.4)', color: 'var(--km-dim)' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>RESOURCE</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>NAMESPACE</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>CPU %</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>MEMORY</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>LATENCY</th>
            </tr>
          </thead>
          <tbody>
            {filteredPods.map((p, i) => (
              <tr key={p.pod_id || i} style={{ borderBottom: '1px solid rgba(39,39,42,0.3)', transition: 'background 0.1s' }}>
                <td style={{ padding: '10px 20px', fontFamily: 'var(--km-mono)', color: 'var(--km-text)' }}>{p.pod_name}</td>
                <td style={{ padding: '10px 20px', color: 'var(--km-muted)' }}>{p.namespace}</td>
                <td style={{ padding: '10px 20px' }}>
                  <span className={`status-badge ${p.status === 'Running' ? 'badge-ok' : 'badge-alert'}`}>{p.status.toUpperCase()}</span>
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: 'var(--km-mono)' }}>{p.cpu_percent.toFixed(1)}%</td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: 'var(--km-mono)' }}>{p.memory_pct.toFixed(1)}%</td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: 'var(--km-mono)', color: p.latency_ms > 50 ? 'var(--km-warn)' : 'var(--km-accent)' }}>{p.latency_ms.toFixed(1)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
