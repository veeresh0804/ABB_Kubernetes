import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';

const PHASES = [
  { label: 'DETECTION', color: '#F59E0B' },
  { label: 'ANALYSIS', color: '#3B82F6' },
  { label: 'DIAGNOSIS', color: '#EF4444' },
  { label: 'MITIGATION', color: '#22C55E' },
];

const STATIC_EVENTS = [
  { time: '14:04:12', color: '#22C55E', phase: 0, title: 'analytics-job started in namespace: batch', detail: 'Batch job launched — began sequential write operations to postgres-data PVC' },
  { time: '14:09:33', color: '#F59E0B', phase: 0, title: 'PVC write latency crossed warning threshold', detail: 'postgres-data latency: 48ms → 98ms. Storage/PVC Agent flagged anomaly.' },
  { time: '14:13:07', color: '#F59E0B', phase: 1, title: 'payment-service connection errors begin', detail: 'Log Agent detected first wave of "connection timeout to postgres" errors (rate: 4/min)' },
  { time: '14:18:22', color: '#EF4444', phase: 2, title: 'CPU SPIKE — payment-service hit 94%', detail: 'Retry storm triggered. Error rate 34%, 847 timeout messages in 10 min. CPU Agent: CRITICAL.' },
  { time: '14:21:44', color: '#EF4444', phase: 2, title: 'Frontend response time degraded', detail: 'api-gateway queue depth increased. frontend-svc P95 latency: 180ms → 520ms.' },
  { time: '14:24:01', color: '#3B82F6', phase: 3, title: 'AI Root Cause Report generated', detail: 'Recommendation Agent synthesized 5-agent findings. Full causal chain identified.' },
];

export function IncidentReplay({ state }: { state: ClusterState }) {
  const [liveEvents, setLiveEvents] = useState<typeof STATIC_EVENTS>([]);

  useEffect(() => {
    if (state.anomalies.length > 0) {
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      state.anomalies.forEach(a => {
        const color = a.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B';
        setLiveEvents(prev => {
          if (prev.find(e => e.title === a.message)) return prev;
          return [...prev.slice(-15), { time: now, color, phase: 0, title: a.message, detail: `${a.pod_name} · ${a.metric}` }];
        });
      });
    }
  }, [state.anomalies]);

  const allEvents = useMemo(() => [...STATIC_EVENTS, ...liveEvents], [liveEvents]);
  const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="phase-bar">
        {PHASES.map((p, i) => (
          <div key={i} className="phase-item">
            <span className="phase-item-dot" style={{ background: p.color }} />
            <span className="phase-item-label">{p.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ marginBottom: 0 }}><Clock size={12} /> Incident Timeline — AI-Reconstructed Event Chain</span>
          <span style={{ fontSize: 9, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>{allEvents.length} events</span>
        </div>
        <div className="timeline" style={{ marginTop: 8 }}>
          {allEvents.map((ev, i) => (
            <div key={i} className="tl-item">
              <div className="tl-dot" style={{ background: ev.color, borderColor: ev.color }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="tl-time">{ev.time}</div>
                <span style={{ fontFamily: 'var(--km-mono)', fontSize: 7, fontWeight: 700, color: PHASES[ev.phase]?.color || 'var(--km-dim)', letterSpacing: 0.3, opacity: 0.8 }}>
                  {PHASES[ev.phase]?.label}
                </span>
              </div>
              <div className="tl-title">{ev.title}</div>
              <div className="tl-detail">{ev.detail}</div>
            </div>
          ))}
          <div className="tl-item">
            <div className="tl-dot" style={{ background: 'var(--km-accent2)', borderColor: 'var(--km-accent2)' }} />
            <div className="tl-time">{nowTime} — NOW</div>
            <div className="tl-title">
              {state.anomaly_mode
                ? `Active scenario: ${state.anomaly_mode.replace(/_/g, ' ')} · ${state.health.anomaly_count} anomalies`
                : 'Awaiting operator action · monitoring continues'}
            </div>
            <div className="tl-detail">
              Health score: {state.health.score}/100 · {state.health.critical_count} critical, {state.health.warning_count} warnings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
