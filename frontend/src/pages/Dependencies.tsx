import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronRight, GitBranch } from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';

const SEV_COLOR: Record<string, string> = { normal: '#22C55E', warning: '#F59E0B', critical: '#EF4444' };
const SEV_BG: Record<string, string> = { normal: 'rgba(34,197,94,0.08)', warning: 'rgba(245,158,11,0.08)', critical: 'rgba(239,68,68,0.08)' };

export function Dependencies({ state }: { state: ClusterState }) {
  const { graph, pods, correlations } = state;

  const option = React.useMemo(() => {
    if (!graph.nodes.length) return {};
    const eNodes = graph.nodes.map(n => ({
      id: n.id, name: n.label, cpu: n.cpu,
      symbolSize: n.severity === 'critical' ? 46 : n.severity === 'warning' ? 40 : 34,
      itemStyle: {
        color: SEV_BG[n.severity],
        borderColor: SEV_COLOR[n.severity],
        borderWidth: n.severity === 'critical' ? 2.5 : 1.5,
        shadowBlur: n.severity === 'critical' ? 10 : 0,
        shadowColor: SEV_COLOR[n.severity],
      },
      label: {
        show: true,
        formatter: (p: any) => `${p.name}\n${(p.data?.cpu ?? 0).toFixed(0)}% CPU`,
        color: '#475569', fontSize: 9,
        fontFamily: 'JetBrains Mono, monospace',
      },
    }));
    const eEdges = graph.edges.map((e, i) => ({
      id: String(i), source: e.source, target: e.target,
      lineStyle: {
        color: e.hot ? '#EF4444' : '#CBD5E1',
        width: e.hot ? 2.5 : 1,
        type: e.hot ? 'solid' as const : 'dashed' as const,
        curveness: 0.15,
        opacity: e.hot ? 1 : 0.5,
      },
      symbol: ['none', 'arrow'],
      symbolSize: [0, 6],
      effect: e.hot ? {
        show: true,
        period: 4,
        trailLength: 0.6,
        color: '#EF4444',
        symbolSize: 3,
      } : undefined,
    }));
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        textStyle: { color: '#0F172A', fontSize: 11 },
      },
      series: [{
        type: 'graph', layout: 'force', data: eNodes, edges: eEdges,
        roam: true, draggable: true,
        force: { repulsion: 180, gravity: 0.06, edgeLength: 140 },
        emphasis: { focus: 'adjacency' as const },
      }],
    };
  }, [graph.nodes, graph.edges]);

  const barClass = (pct: number) => pct > 80 ? 'high' : pct > 50 ? 'mid' : 'low';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ marginBottom: 0 }}><GitBranch size={14} /> Service Dependency Topology</span>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 10, color: 'var(--km-muted)', fontFamily: 'var(--km-mono)' }}>
          {[['#EF4444','Anomalous'],['#F59E0B','Warning'],['#22C55E','Healthy']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 3, background: c, borderRadius: 1 }}/>{l}
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--km-dim)' }}>Drag nodes to explore · Arrow = traffic</span>
        </div>

        <ReactECharts option={option} style={{ height: 340, width: '100%' }} opts={{ renderer: 'canvas' }}/>
      </div>

      {correlations.map(c => (
        <div key={c.rule_id} className="card" style={{ padding: 12, borderLeft: '2px solid var(--km-danger)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <ChevronRight size={14} style={{ color: 'var(--km-danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="alert-title" style={{ color: 'var(--km-danger)' }}>
                AI Root Cause Chain: {c.causal_chain.join(' → ')}
              </div>
              <div className="alert-body">{c.summary}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="card-title">Pod Details</div>
        {pods.length === 0 && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-text">No pod data available</div>
          </div>
        )}
        {pods.map(pod => {
          const memPct = pod.memory_mb / Math.max(pod.memory_limit_mb, 1) * 100;
          const severity = pod.status !== 'Running' ? 'critical' : pod.cpu_percent > 70 ? 'warning' : 'normal';
          return (
            <div key={pod.pod_id} className="pod-row" style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[severity], flexShrink: 0 }}/>
                <div>
                  <div className="pod-name">{pod.pod_name}</div>
                  <div className="pod-ns">CPU {pod.cpu_percent.toFixed(0)}% · MEM {memPct.toFixed(0)}% · {pod.status}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="bar-wrap">
                  <div className={`bar-fill ${barClass(pod.cpu_percent)}`} style={{ width: `${Math.min(pod.cpu_percent, 100)}%` }}/>
                </div>
                <div className="pod-pct">{pod.cpu_percent.toFixed(0)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
