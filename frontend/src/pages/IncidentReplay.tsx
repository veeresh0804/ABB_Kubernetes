import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, AlertTriangle, Info, Zap } from 'lucide-react';
import type { ClusterState } from '../hooks/useCluster';

const API_URL = import.meta.env.VITE_API_URL || '';

const PHASES = [
  { label: 'DETECTION',  color: '#F59E0B' },
  { label: 'ANALYSIS',   color: '#3B82F6' },
  { label: 'DIAGNOSIS',  color: '#EF4444' },
  { label: 'MITIGATION', color: '#22C55E' },
];

interface TimelineEvent {
  time: string;
  color: string;
  phase: number;
  title: string;
  detail: string;
  source: 'live' | 'anomaly' | 'incident';
}

function phaseFromSeverity(sev: string): number {
  if (sev === 'CRITICAL') return 2;
  if (sev === 'WARNING')  return 0;
  return 1;
}

function colorFromSeverity(sev: string): string {
  if (sev === 'CRITICAL') return '#EF4444';
  if (sev === 'WARNING')  return '#F59E0B';
  return '#3B82F6';
}

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function IncidentReplay({ state }: { state: ClusterState }) {
  const [persistedEvents, setPersistedEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState<string>('');

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/incident-log`);
      if (res.ok) {
        const data = await res.json();
        const events: TimelineEvent[] = (data.log || []).map((inc: any) => ({
          time:   fmtTime(inc.timestamp || Date.now() / 1000),
          color:  colorFromSeverity(inc.severity || 'WARNING'),
          phase:  phaseFromSeverity(inc.severity || 'WARNING'),
          title:  inc.name || inc.rule_id || 'Incident detected',
          detail: inc.summary || `Affected: ${(inc.affected_pods || []).join(', ')}`,
          source: 'incident' as const,
        }));
        setPersistedEvents(events);
        setLastFetch(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // Backend not reachable — use live state only
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLog();
    const id = setInterval(fetchLog, 15_000);
    return () => clearInterval(id);
  }, [fetchLog]);

  const liveEvents: TimelineEvent[] = [
    ...state.correlations.map(c => ({
      time:   new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      color:  colorFromSeverity(c.severity),
      phase:  2,
      title:  `AI Root Cause: ${c.name}`,
      detail: c.summary,
      source: 'incident' as const,
    })),
    ...state.anomalies.slice(0, 8).map(a => ({
      time:   fmtTime(a.timestamp),
      color:  colorFromSeverity(a.severity),
      phase:  phaseFromSeverity(a.severity),
      title:  a.message,
      detail: `${a.pod_name} · ${a.metric} = ${typeof a.value === 'number' ? a.value.toFixed(2) : a.value}`,
      source: 'anomaly' as const,
    })),
  ];

  const allTitlesSeen = new Set<string>();
  const allEvents: TimelineEvent[] = [];

  for (const ev of [...liveEvents, ...persistedEvents]) {
    if (!allTitlesSeen.has(ev.title)) {
      allTitlesSeen.add(ev.title);
      allEvents.push(ev);
    }
  }

  const nowTime = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const Icon = ({ ev }: { ev: TimelineEvent }) => {
    if (ev.source === 'incident') return <Zap size={10} />;
    if (PHASES[ev.phase]?.label === 'DIAGNOSIS') return <AlertTriangle size={10} />;
    return <Info size={10} />;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="phase-bar">
        {PHASES.map((p, i) => (
          <div key={i} className="phase-item">
            <span className="phase-item-dot" style={{ background: p.color }} />
            <span className="phase-item-label">{p.label}</span>
          </div>
        ))}
        <button
          onClick={fetchLog}
          disabled={loading}
          style={{
            marginLeft: 'auto', background: 'none', border: '0.5px solid var(--km-border)',
            borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 9,
            color: 'var(--km-muted)', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--km-mono)',
          }}
        >
          <RefreshCw size={9} className={loading ? 'spin' : ''} />
          {loading ? 'fetching...' : `refresh${lastFetch ? ` · ${lastFetch}` : ''}`}
        </button>
      </div>

      {state.correlations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.correlations.map(c => (
            <div
              key={c.rule_id}
              className="card"
              style={{ padding: 12, borderLeft: `2px solid ${colorFromSeverity(c.severity)}` }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={13} style={{ color: colorFromSeverity(c.severity), flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div className="alert-title" style={{ color: colorFromSeverity(c.severity) }}>
                    {c.name} — Root Cause Chain
                  </div>
                  <div className="alert-body" style={{ marginTop: 4 }}>
                    {c.causal_chain.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: 'var(--km-dim)', fontSize: 9, fontFamily: 'var(--km-mono)' }}>→</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  {c.recommendations.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--km-accent)', fontFamily: 'var(--km-mono)' }}>
                      Fix: {c.recommendations[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ marginBottom: 0 }}>
            <Clock size={12} /> Incident Timeline — AI-Reconstructed Event Chain
          </span>
          <span style={{ fontSize: 9, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>
            {allEvents.length} events · {persistedEvents.length} persisted · {liveEvents.length} live
          </span>
        </div>

        <div className="timeline" style={{ marginTop: 8 }}>
          {allEvents.length === 0 && (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-text">
                No incidents recorded yet. Trigger a scenario to see the timeline.
              </div>
            </div>
          )}

          {allEvents.map((ev, i) => (
            <div key={i} className="tl-item">
              <div className="tl-dot" style={{ background: ev.color, borderColor: ev.color }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="tl-time">{ev.time}</div>
                <span style={{
                  fontFamily: 'var(--km-mono)', fontSize: 7, fontWeight: 700,
                  color: PHASES[ev.phase]?.color || 'var(--km-dim)',
                  letterSpacing: 0.3, opacity: 0.8,
                }}>
                  {PHASES[ev.phase]?.label}
                </span>
                {ev.source === 'incident' && (
                  <span style={{
                    fontSize: 7, color: 'var(--km-accent)', fontFamily: 'var(--km-mono)',
                    background: 'rgba(34,197,94,0.08)', borderRadius: 3, padding: '1px 4px',
                  }}>
                    AI
                  </span>
                )}
              </div>
              <div className="tl-title">{ev.title}</div>
              <div className="tl-detail">{ev.detail}</div>
            </div>
          ))}

          <div className="tl-item">
            <div className="tl-dot" style={{
              background: 'var(--km-accent2)', borderColor: 'var(--km-accent2)',
              boxShadow: '0 0 6px var(--km-accent2)',
            }} />
            <div className="tl-time">{nowTime} — NOW</div>
            <div className="tl-title">
              {state.anomaly_mode
                ? `Active: ${state.anomaly_mode.replace(/_/g, ' ')} · ${state.health.anomaly_count} anomalies`
                : 'Monitoring active · awaiting operator action'}
            </div>
            <div className="tl-detail">
              Health score: {state.health.score}/100 ·{' '}
              {state.health.critical_count} critical, {state.health.warning_count} warnings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
