import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, ShieldCheck, Users, Terminal } from 'lucide-react';
import type { ClusterState, AgentInsight } from '../hooks/useCluster';
import { OperationalStory } from '../components/OperationalStory';

const AetherMetric = React.memo(function AetherMetric({
  label, value, sub, subColor, children
}: {
  label: string; value: string; sub: string; subColor: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ background: 'rgba(24,24,27,0.3)', border: '1px solid var(--km-border)', borderRadius: 8, padding: '20px 24px' }}>
      <p style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--km-display)', fontSize: 28, fontWeight: 700, color: 'var(--km-text)', letterSpacing: '-0.03em' }}>{value}</span>
        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: subColor }}>{sub}</span>
      </div>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
});

// Topology force-directed graph inside dashboard
const TopologyGraph = React.memo(function TopologyGraph({ state }: { state: ClusterState }) {
  const { graph } = state;
  const sevColor = (s: string) => s === 'critical' ? 'var(--km-danger)' : s === 'warning' ? 'var(--km-warn)' : 'var(--km-healthy)';
  const sevBg = (s: string) => s === 'critical' ? 'rgba(239,68,68,0.15)' : s === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)';

  const option = useMemo(() => {
    if (!graph.nodes.length) return {};
    const eNodes = graph.nodes.map(n => ({
      id: n.id, name: n.label,
      symbolSize: n.severity === 'critical' ? 38 : n.severity === 'warning' ? 34 : 28,
      itemStyle: {
        color: sevBg(n.severity),
        borderColor: sevColor(n.severity),
        borderWidth: n.severity === 'critical' ? 2 : 1.5,
        shadowBlur: n.severity === 'critical' ? 8 : 0,
        shadowColor: sevColor(n.severity),
      },
      label: { show: true, formatter: (p: any) => `${p.name}`, color: 'var(--km-text)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' },
    }));
    const eEdges = graph.edges.map((e, i) => ({
      id: String(i), source: e.source, target: e.target,
      lineStyle: { color: e.hot ? '#EF4444' : 'var(--km-border)', width: e.hot ? 2 : 1, curveness: 0.15, opacity: e.hot ? 0.9 : 0.4 },
      symbol: ['none', 'arrow'], symbolSize: [0, 5],
      effect: e.hot ? { show: true, period: 3, trailLength: 0.4, color: '#EF4444', symbolSize: 2.5 } : undefined,
    }));
    return {
      backgroundColor: 'transparent',
      series: [{
        type: 'graph', layout: 'force', data: eNodes, edges: eEdges,
        roam: true, draggable: true,
        force: { repulsion: 120, gravity: 0.08, edgeLength: 100, friction: 0.1 },
        emphasis: { focus: 'adjacency' },
        animation: true, animationDuration: 500, animationEasing: 'cubicOut',
      }],
    };
  }, [graph.nodes, graph.edges]);

  if (!graph.nodes.length) {
    return <div className="empty-state" style={{ height: 180, padding: 0 }}><div className="empty-state-text">No topology data</div></div>;
  }

  return (
    <ReactECharts option={option} style={{ height: 200, width: '100%' }} opts={{ renderer: 'canvas' }} />
  );
});

const NarrativeTimeline = React.memo(function NarrativeTimeline({ agents }: { agents: AgentInsight[] }) {
  const items = useMemo(() => {
    return agents.slice(0, 5).map(a => ({
      time: new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      text: a.finding,
      severity: a.status === 'CRITICAL' ? 'crit' : a.status === 'WARNING' ? 'warn' : 'info',
    }));
  }, [agents]);

  const dotColor = (s: string) => s === 'crit' ? 'var(--km-danger)' : s === 'warn' ? 'var(--km-warn)' : 'var(--km-accent)';

  if (items.length === 0) {
    return <div className="empty-state"><div className="empty-state-text">Awaiting operational telemetry...</div></div>;
  }

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
  const { health, pods, anomalies, correlations, agents, sparkline = [] } = state;

  const avgCpu = useMemo(() => pods.length ? pods.reduce((s, p) => s + p.cpu_percent, 0) / pods.length : 0, [pods]);
  const avgMem = useMemo(() => {
    if (!pods.length) return 0;
    return pods.reduce((s, p) => s + (p.memory_mb / Math.max(p.memory_limit_mb, 1)) * 100, 0) / pods.length;
  }, [pods]);
  const maxLat = useMemo(() => pods.length ? Math.max(...pods.map(p => p.latency_ms || 0)) : 0, [pods]);
  const maxDisk = useMemo(() => pods.length ? Math.max(...pods.map(p => p.pvc_write_mbps || 0)) : 0, [pods]);
  const totalNetIn = useMemo(() => pods.reduce((s, p) => s + (p.network_in_mbps || 0), 0), [pods]);
  const topCpu = useMemo(() => [...pods].sort((a, b) => b.cpu_percent - a.cpu_percent), [pods]);
  const totalPods = pods.length;
  const runningPods = pods.filter(p => p.status === 'Running').length;

  const cpuSub = avgCpu > 60 ? '+2.4%' : avgCpu > 40 ? '+1.1%' : 'STABLE';
  const memSub = avgMem > 75 ? 'HIGH' : avgMem > 50 ? 'ELEVATED' : 'NORMAL';
  const latSub = maxLat > 100 ? 'DEGRADED' : 'HEALTHY';
  const cpuSubColor = avgCpu > 60 ? 'var(--km-warn)' : 'var(--km-accent)';
  const memSubColor = avgMem > 75 ? 'var(--km-danger)' : 'var(--km-accent)';
  const latSubColor = maxLat > 100 ? 'var(--km-danger)' : 'var(--km-accent)';

  const alertCount = health.critical_count + health.warning_count;
  const threatLevel = health.critical_count > 0 ? 'HIGH' : health.warning_count > 0 ? 'ELEVATED' : 'LOW';
  const threatColor = health.critical_count > 0 ? 'var(--km-danger)' : health.warning_count > 0 ? 'var(--km-warn)' : 'var(--km-accent)';

  const miniChart = useMemo(() => {
    const data = sparkline.length >= 10 ? sparkline : [40, 55, 48, 62, 58, 70, 65, 78, 68, 85].map(v => v + (Math.random() - 0.5) * 10);
    const max = Math.max(...data);
    return data.map(v => ({ h: Math.round((v / max) * 100) }));
  }, [sparkline]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* INCIDENT STORY */}
      <OperationalStory correlation={correlations[0]} anomalies={anomalies} />

      {/* AETHER OS METRIC CARDS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        <AetherMetric label="CPU Usage" value={`${avgCpu.toFixed(0)}%`} sub={cpuSub} subColor={cpuSubColor}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
            {miniChart.map((d, i) => (
              <div key={i} style={{ flex: 1, background: i === miniChart.length - 1 ? 'var(--km-accent)' : 'var(--km-border)', height: `${d.h}%`, borderRadius: 1 }} />
            ))}
          </div>
        </AetherMetric>
        <AetherMetric label="Active Pods" value={`${runningPods}/${totalPods}`} sub={runningPods === totalPods ? 'STABLE' : 'DEGRADED'} subColor={runningPods === totalPods ? 'var(--km-accent)' : 'var(--km-warn)'}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
            <Users size={36} style={{ color: 'var(--km-border)' }} />
          </div>
        </AetherMetric>
        <AetherMetric label="Memory Avg" value={`${avgMem.toFixed(0)}%`} sub={memSub} subColor={memSubColor}>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < Math.round(avgMem / 10) ? avgMem > 75 ? 'var(--km-danger)' : 'var(--km-accent)' : 'var(--km-border)' }} />
            ))}
          </div>
        </AetherMetric>
        <AetherMetric label="Latency" value={`${maxLat.toFixed(0)}ms`} sub={latSub} subColor={latSubColor}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--km-border)' }} />
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--km-border)' }} />
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--km-accent)', background: 'var(--km-accent-dim)' }} />
          </div>
        </AetherMetric>
      </section>

      {/* OPERATIONAL GRID: Topology + Event Stream */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* LEFT: Topology with scanline overlay */}
        <div style={{ background: 'rgba(24,24,27,0.2)', border: '1px solid var(--km-border)', borderRadius: 8, position: 'relative', overflow: 'hidden', minHeight: 380 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(circle at 2px 2px, #27272a 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="scanline" />
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(9,9,11,0.8)', border: '1px solid var(--km-border)', padding: '6px 12px', borderRadius: 4 }}>
            <Activity size={10} style={{ color: 'var(--km-accent)' }} />
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--km-secondary)' }}>Live_Feed: Infrastructure Topology</span>
          </div>
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 4 }}>
            <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.8)', border: '1px solid var(--km-border)', color: 'var(--km-muted)', cursor: 'pointer' }}>-</button>
            <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.8)', border: '1px solid var(--km-border)', color: 'var(--km-muted)', cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ padding: '48px 16px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 200 }}>
              <TopologyGraph state={state} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><p style={{ fontSize: 8, color: 'var(--km-dim)' }}>SERVICES</p><p style={{ fontSize: 11, fontFamily: 'var(--km-mono)', color: 'var(--km-secondary)' }}>{state.graph.nodes.length}</p></div>
                <div><p style={{ fontSize: 8, color: 'var(--km-dim)' }}>CONNECTIONS</p><p style={{ fontSize: 11, fontFamily: 'var(--km-mono)', color: 'var(--km-secondary)' }}>{state.graph.edges.length}</p></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {[['var(--km-healthy)','Healthy'],['var(--km-warn)','Warning'],['var(--km-danger)','Critical']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                    <span style={{ fontSize: 8, color: 'var(--km-dim)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Event Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'rgba(24,24,27,0.3)', border: '1px solid var(--km-border)', borderRadius: 8, padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--km-text)' }}>Event Stream</h3>
              <span style={{ fontSize: 10, color: 'var(--km-dim)', cursor: 'pointer' }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {anomalies.length === 0 && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--km-accent)', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--km-secondary)' }}>All systems operational — no active anomalies.</p>
                    <span style={{ fontSize: 10, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>System nominal</span>
                  </div>
                </div>
              )}
              {anomalies.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--km-secondary)' }}>{a.message}</p>
                    <span style={{ fontSize: 10, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>
                      {new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ background: 'var(--km-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Terminal size={14} style={{ color: 'var(--km-accent)' }} />
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>KubeMind Core Terminal</span>
            </div>
            <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'rgba(16,185,129,0.7)', lineHeight: 1.8 }}>
              <p>&gt; query systems --status</p>
              <p style={{ color: 'var(--km-accent)' }}>[SYSTEM] All modules responding...</p>
              <p>&gt; authenticate root</p>
              <p style={{ animation: 'pulse 1s infinite' }}>_</p>
            </div>
          </div>
        </div>
      </section>

      {/* INFRASTRUCTURE TABLE */}
      <section style={{ background: 'rgba(24,24,27,0.1)', border: '1px solid var(--km-border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--km-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--km-text)' }}>Connected Infrastructure</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '4px 10px', fontSize: 9, border: '1px solid var(--km-border)', background: 'transparent', color: 'var(--km-muted)', cursor: 'pointer', borderRadius: 4, fontFamily: 'var(--km-mono)' }}>Filter</button>
            <button style={{ padding: '4px 10px', fontSize: 9, border: '1px solid var(--km-border)', background: 'transparent', color: 'var(--km-muted)', cursor: 'pointer', borderRadius: 4, fontFamily: 'var(--km-mono)' }}>Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(24,24,27,0.4)' }}>
              <th style={{ padding: '10px 24px', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', textAlign: 'left', fontFamily: 'var(--km-mono)' }}>Resource ID</th>
              <th style={{ padding: '10px 24px', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', textAlign: 'left', fontFamily: 'var(--km-mono)' }}>Type</th>
              <th style={{ padding: '10px 24px', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', textAlign: 'left', fontFamily: 'var(--km-mono)' }}>Status</th>
              <th style={{ padding: '10px 24px', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', textAlign: 'left', fontFamily: 'var(--km-mono)' }}>Efficiency</th>
              <th style={{ padding: '10px 24px', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)', textTransform: 'uppercase', textAlign: 'right', fontFamily: 'var(--km-mono)' }}>Last Sync</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid var(--km-border)' }}>
            {topCpu.slice(0, 4).map((p, i) => {
              const status = p.status === 'Running' ? 'Operational' : 'Offline';
              const isOperational = status === 'Operational';
              const efficiency = Math.min(Math.round(p.cpu_percent + 20), 100);
              return (
                <tr key={p.pod_id || i} style={{ borderBottom: '1px solid rgba(39,39,42,0.3)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(39,39,42,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '12px 24px', fontFamily: 'var(--km-mono)', fontSize: 11, color: 'var(--km-secondary)' }}>#{p.pod_id.toUpperCase().slice(0, 9)}</td>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: 'var(--km-dim)' }}>{p.namespace === 'production' ? 'Compute Node' : 'Storage Hub'}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: isOperational ? 'rgba(16,185,129,0.1)' : 'rgba(39,39,42,0.3)', color: isOperational ? 'var(--km-accent)' : 'var(--km-dim)', border: `1px solid ${isOperational ? 'rgba(16,185,129,0.2)' : 'transparent'}` }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--km-border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${efficiency}%`, background: efficiency > 75 ? 'var(--km-accent)' : efficiency > 40 ? 'var(--km-warn)' : 'var(--km-dim)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 9, fontFamily: 'var(--km-mono)', color: 'var(--km-secondary)' }}>{efficiency}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', fontSize: 11, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)', textAlign: 'right' }}>{(Math.random() * 5).toFixed(2)}s ago</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* AI Agent Status bar */}
      {agents.length > 0 && (
        <section style={{ background: 'rgba(24,24,27,0.1)', border: '1px solid var(--km-border)', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--km-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> AI Agent Status
            </span>
            <span style={{ fontSize: 9, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>
              {agents.filter(a => a.status === 'CRITICAL').length} critical · {agents.filter(a => a.status === 'WARNING').length} warnings
            </span>
          </div>
          <div className="agent-strip">
            {agents.map(a => {
              const cls = a.status === 'CRITICAL' ? 'badge-alert' : a.status === 'WARNING' ? 'badge-warning' : 'badge-ok';
              return (
                <div key={a.agent} className="agent-chip">
                  <span className="agent-chip-icon">{a.icon}</span>
                  <span className="agent-chip-name">{a.agent}</span>
                  <span className={`badge ${cls}`}>{a.status}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Operational Narrative */}
      {agents.length > 0 && (
        <section style={{ background: 'rgba(24,24,27,0.1)', border: '1px solid var(--km-border)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--km-text)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Activity size={14} /> Operational Narrative
          </div>
          <NarrativeTimeline agents={agents} />
        </section>
      )}
    </div>
  );
}
