import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { AlertTriangle, Activity, Cpu, Server, Clock, ShieldCheck, HardDrive, GitBranch, Wifi } from 'lucide-react';
import type { ClusterState, AgentInsight } from '../hooks/useCluster';
import { OperationalStory } from '../components/OperationalStory';

const SEP = { margin: '0 3px', color: 'var(--km-dim)', fontSize: 9 };

const KubeMetric = React.memo(function KubeMetric({
  label, value, sub, subCls, icon, badge
}: {
  label: string; value: string; sub: string; subCls: string; icon: React.ReactNode; badge?: string;
}) {
  return (
    <div className={`telem-mod ${subCls === 'crit' ? 'crit' : subCls === 'warn' ? 'warn' : ''}`}>
      {badge && <span className="badge badge-alert" style={{ position: 'absolute', top: 6, right: 6, fontSize: 6 }}>{badge}</span>}
      <div className="telem-label">{label}</div>
      <div className="telem-top">
        <div className="telem-value">{value}</div>
        <span style={{ color: 'var(--km-dim)', marginBottom: 1 }}>{icon}</span>
      </div>
      <div className={`telem-sub ${subCls}`}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: subCls === 'ok' ? 'var(--km-healthy)' : subCls === 'warn' ? 'var(--km-warn)' : 'var(--km-danger)', display: 'inline-block' }} />
        {sub}
      </div>
    </div>
  );
});

const PodRow = React.memo(function PodRow({ pod }: { pod: any }) {
  const cpu = pod.cpu_percent || 0;
  const cls = cpu > 70 ? 'high' : cpu > 40 ? 'mid' : 'low';
  return (
    <div className="pod-row">
      <div>
        <div className="pod-name">{pod.pod_name}</div>
        <div className="pod-ns">ns: {pod.namespace}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="bar-wrap"><div className={`bar-fill ${cls}`} style={{ width: `${Math.min(cpu, 100)}%` }} /></div>
        <span className="pod-pct">{cpu.toFixed(0)}%</span>
      </div>
    </div>
  );
});

const AlertItem = React.memo(function AlertItem({ a }: { a: any }) {
  const cls = a.severity === 'CRITICAL' ? 'crit' : 'warn';
  const SeverityIcon = a.severity === 'CRITICAL' ? AlertTriangle : Activity;
  const now = new Date(a.timestamp * 1000);
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const label = a.metric === 'cpu_percent' ? 'CPU Storm' : a.metric === 'memory_pct' ? 'Memory Leak' : a.metric === 'pvc_write_mbps' ? 'PVC Saturation' : a.metric === 'latency_ms' ? 'Latency Spike' : a.metric;

  return (
    <div className={`alert-item ${cls}`}>
      <SeverityIcon size={12} className="alert-icon" />
      <div style={{ flex: 1 }}>
        <div className="alert-title">{label} · {a.pod_name}</div>
        <div className="alert-body">{a.message}</div>
        <div className="alert-meta">{time} · {a.severity}{a.value ? ` · value: ${a.value}` : ''}</div>
      </div>
      <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-alert' : 'badge-warning'}`}>
        {a.severity === 'CRITICAL' ? 'CRIT' : 'WARN'}
      </span>
    </div>
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

const ResChart = React.memo(function ResChart({
  label, value, unit, color, data
}: {
  label: string; value: string; unit: string; color: string; data?: number[];
}) {
  const chartData = useMemo(() => data || Array.from({ length: 20 }, () => Math.random() * 50 + 15), [data]);
  const min = Math.min(...chartData);
  const max = Math.max(...chartData);
  const range = max - min || 1;
  const points = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = 36 - ((v - min) / range) * 28;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPoints = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = 36 - ((v - min) / range) * 28;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="resource-mod">
      <div className="resource-label">{label}</div>
      <div className="resource-top">
        <div className="resource-value">{value}<span style={{ fontSize: 8, fontWeight: 500, color: 'var(--km-muted)', marginLeft: 2 }}>{unit}</span></div>
      </div>
      <svg className="resource-chart" viewBox="0 0 100 36" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`rg-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill={`url(#rg-${label.replace(/\s/g, '')})`} points={`0,36 ${areaPoints} 100,36`} />
        <polyline fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <circle cx={points.split(' ').pop()?.split(',')[0] || 100} cy={points.split(' ').pop()?.split(',')[1] || 8} r="1.5" fill={color} />
      </svg>
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

  const cpuSub = avgCpu > 60 ? 'Elevated' : avgCpu > 40 ? 'Moderate' : 'Normal';
  const cpuCls = avgCpu > 60 ? 'crit' : avgCpu > 40 ? 'warn' : 'ok';
  const memSub = avgMem > 75 ? 'Pressure' : avgMem > 50 ? 'Elevated' : 'Stable';
  const memCls = avgMem > 75 ? 'crit' : avgMem > 50 ? 'warn' : 'ok';
  const latSub = maxLat > 100 ? 'Degraded' : 'Healthy';
  const latCls = maxLat > 100 ? 'crit' : 'ok';

  const chartOpts = useMemo(() => ({
    grid: { top: 6, right: 6, bottom: 14, left: 26 },
    xAxis: { type: 'category' as const, show: false, data: sparkline.map((_: number, i: number) => i) },
    yAxis: { type: 'value' as const, min: 0, max: 100, splitLine: { lineStyle: { color: 'var(--km-border)', opacity: 0.3 } }, axisLabel: { fontSize: 7, color: 'var(--km-dim)' } },
    series: [{
      data: sparkline, type: 'line' as const, smooth: true, symbol: 'none',
      lineStyle: { color: 'var(--km-telem)', width: 1.5 },
      areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 201, 255, 0.12)' }, { offset: 1, color: 'rgba(0, 201, 255, 0)' }] } },
    }],
    backgroundColor: 'transparent',
    animation: false,
  }), [sparkline]);

  const alertsCritical = useMemo(() => anomalies.filter(a => a.severity === 'CRITICAL'), [anomalies]);
  const alertsWarn = useMemo(() => anomalies.filter(a => a.severity !== 'CRITICAL'), [anomalies]);
  const resData = useMemo(() => sparkline.length >= 20 ? sparkline : Array.from({ length: 20 }, (_, i) => sparkline[i] || 20 + Math.random() * 30), [sparkline]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* INCIDENT STORY */}
      <OperationalStory correlation={correlations[0]} anomalies={anomalies} />

      {/* TOP ROW: Infrastructure Topology + KubeMetrics */}
      <div className="dashboard-top-row">
        {/* LEFT: Infrastructure Topology */}
        <div className="card card-topo">
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><GitBranch size={11} /> Infrastructure Topology</span>
            <span style={{ fontSize: 7, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>
              {state.graph.nodes.length} services
            </span>
          </div>
          <TopologyGraph state={state} />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {[['var(--km-healthy)','Healthy'],['var(--km-warn)','Warning'],['var(--km-danger)','Critical']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 7, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {l}
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 6, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>Drag to explore</span>
          </div>
        </div>

        {/* RIGHT: KubeMetrics */}
        <div className="card" style={{ padding: 12 }}>
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><Activity size={11} /> KubeMetrics</span>
            <span className={`badge ${dataSource === 'live' ? 'badge-ok' : 'badge-warning'}`} style={{ fontSize: 7 }}>
              {dataSource === 'live' ? 'LIVE' : 'SIMULATED'}
            </span>
          </div>
          <div className="telem-grid">
            <KubeMetric label="CPU Usage" value={`${avgCpu.toFixed(0)}%`} sub={cpuSub} subCls={cpuCls} icon={<Cpu size={12} />} />
            <KubeMetric label="Memory" value={`${avgMem.toFixed(0)}%`} sub={memSub} subCls={memCls} icon={<HardDrive size={12} />} />
            <KubeMetric label="Pods" value={`${runningPods}/${totalPods}`} sub={`${totalPods - runningPods} degraded`} subCls={runningPods === totalPods ? 'ok' : 'warn'} icon={<Server size={12} />} badge={totalPods - runningPods > 0 ? `${totalPods - runningPods}` : undefined} />
            <KubeMetric label="Latency" value={`${maxLat.toFixed(0)}ms`} sub={latSub} subCls={latCls} icon={<Clock size={12} />} />
          </div>
          {sparkline.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 7, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>CPU Waveform</div>
              <ReactECharts option={chartOpts} style={{ height: 80 }} opts={{ renderer: 'canvas' }} />
            </div>
          )}
        </div>
      </div>

      {/* MID ROW: Active Alerts + Resource Utilization */}
      <div className="dashboard-mid-row">
        {/* LEFT: Active Alerts */}
        <div className="card" style={{ padding: 12 }}>
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><AlertTriangle size={11} /> Active Alerts</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {anomalies.length > 0 && <span className="badge badge-alert" style={{ fontSize: 8 }}>{anomalies.length} active</span>}
              <span className={`badge ${dataSource === 'live' ? 'badge-ok' : 'badge-warning'}`} style={{ fontSize: 7 }}>
                {dataSource === 'live' ? 'LIVE' : 'SIMULATED'}
              </span>
            </div>
          </div>
          {anomalies.length === 0 ? (
            <div style={{ padding: '12px 0', fontSize: 10, color: 'var(--km-dim)', fontStyle: 'italic' }}>
              No active alerts — system nominal
            </div>
          ) : (
            <>
              {alertsCritical.slice(0, 2).map((a, i) => <AlertItem key={`c-${i}`} a={a} />)}
              {alertsWarn.slice(0, 2).map((a, i) => <AlertItem key={`w-${i}`} a={a} />)}
            </>
          )}
        </div>

        {/* RIGHT: Resource Utilization */}
        <div className="card" style={{ padding: 12 }}>
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><Wifi size={11} /> Resource Utilization</span>
          </div>
          <div className="resource-grid">
            <ResChart label="CPU" value={avgCpu.toFixed(0)} unit="%" color="var(--km-accent)" data={resData} />
            <ResChart label="Memory" value={avgMem.toFixed(0)} unit="%" color="var(--km-warn)" data={resData.map(v => Math.min(v * 0.8 + 10, 100))} />
            <ResChart label="Disk I/O" value={maxDisk.toFixed(1)} unit="MB/s" color="var(--km-telem)" data={resData.map(v => Math.max(0, v * 0.6 + 2))} />
            <ResChart label="Network" value={totalNetIn.toFixed(1)} unit="Mb/s" color="var(--km-accent2)" data={resData.map(v => Math.max(0, v * 0.5 + 5))} />
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Top CPU + Operational Timeline */}
      <div className="dashboard-bottom-row">
        {/* LEFT: Top CPU */}
        <div className="card" style={{ padding: 12 }}>
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><Cpu size={11} /> Top CPU Consumers</span>
          </div>
          {topCpu.slice(0, 5).map(p => <PodRow key={p.pod_id} pod={p} />)}
          {topCpu.length === 0 && (
            <div className="empty-state" style={{ padding: '10px 0' }}>
              <div className="empty-state-text">No pod data</div>
            </div>
          )}
        </div>

        {/* RIGHT: Operational Timeline */}
        <div className="card" style={{ padding: 12 }}>
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}><Clock size={11} /> Operational Timeline</span>
          </div>
          <div className="ops-timeline">
            <div className="ops-event">
              <span className="ops-event-time">12:45</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-danger)' }} />
              <span className="ops-event-text"><strong>Retry storm</strong> detected · payment-service</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">12:47</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-warn)' }} />
              <span className="ops-event-text"><strong>Latency propagation</strong> · 3 services affected</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">12:50</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-warn)' }} />
              <span className="ops-event-text"><strong>CPU escalation</strong> · api-gateway</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">12:52</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-danger)' }} />
              <span className="ops-event-text"><strong>Memory leak</strong> · redis-cache</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">12:55</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-accent)' }} />
              <span className="ops-event-text"><strong>AI analysis</strong> completed · root cause identified</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">12:57</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-accent2)' }} />
              <span className="ops-event-text"><strong>Recommendations</strong> generated for mitigation</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">13:00</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-healthy)' }} />
              <span className="ops-event-text"><strong>Engineer notified</strong> · mitigation in progress</span>
            </div>
            <div className="ops-event">
              <span className="ops-event-time">13:02</span>
              <span className="ops-event-dot" style={{ background: 'var(--km-telem)' }} />
              <span className="ops-event-text"><strong>Stabilization</strong> sequence initiated</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Summary strip */}
      {agents.length > 0 && (
        <div className="card" style={{ padding: 10 }}>
          <div className="card-header" style={{ marginBottom: 6 }}>
            <span className="card-title" style={{ marginBottom: 0 }}><ShieldCheck size={11} /> AI Agent Status</span>
            <span style={{ fontSize: 7, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>
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
        </div>
      )}

      {/* Operational Narrative */}
      {agents.length > 0 && (
        <div className="card" style={{ padding: 12 }}>
          <div className="card-title"><Activity size={11} /> Operational Narrative</div>
          <NarrativeTimeline agents={agents} />
        </div>
      )}
    </div>
  );
}
