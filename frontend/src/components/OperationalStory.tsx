import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import type { Correlation, Anomaly } from '../hooks/useCluster';

interface OperationalStoryProps {
  correlation: Correlation | undefined;
  anomalies?: Anomaly[];
}

export function OperationalStory({ correlation, anomalies }: OperationalStoryProps) {
  if (!correlation) {
    const hasIssues = anomalies && anomalies.length > 0;
    return (
      <div className={`story-panel ${hasIssues ? 'incident' : ''}`}>
        {hasIssues ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="nominal-icon" style={{ background: 'var(--km-warn-dim)', color: 'var(--km-warn)' }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <div className="nominal-title">{anomalies!.length} Active Anomalies</div>
              <div className="nominal-sub">
                Monitoring {anomalies!.filter(a => a.severity === 'CRITICAL').length} critical, {anomalies!.filter(a => a.severity === 'WARNING').length} warning events
              </div>
            </div>
          </div>
        ) : (
          <div className="story-panel-nominal">
            <div className="nominal-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="nominal-title">System Operational</div>
              <div className="nominal-sub">
                Continuous monitoring active. All services within nominal performance envelopes.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="story-panel incident fade-in">
      <div className="story-header">
        <div>
          <div className="story-severity">
            <AlertCircle size={9} /> {correlation.severity} INCIDENT DETECTED
          </div>
          <h2 className="story-title">{correlation.name}</h2>
        </div>
        <div className="badge badge-alert" style={{ fontSize: 9 }}>MTTD: 42s</div>
      </div>

      <div className="story-grid">
        <div>
          <div className="story-item-label">Root Cause Analysis</div>
          <p className="story-text" style={{ fontWeight: 600, color: 'var(--km-text)' }}>{correlation.root_cause_pod}</p>
          <p className="story-text">{correlation.summary}</p>
        </div>
        <div>
          <div className="story-item-label">Impact Assessment</div>
          <div className="blast-radius">
            <div className="blast-dot" />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--km-danger)' }}>
              BLAST RADIUS: {correlation.affected_pods.length} SERVICES
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
            {correlation.affected_pods.map(p => (
              <span key={p} className="svc-tag">{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="story-footer">
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)' }}>CAUSAL CHAIN:</span>
          <div className="story-chain">
            {correlation.causal_chain.map((step, i) => (
              <React.Fragment key={step}>
                <span className={`story-chain-item ${i === 0 ? 'root' : ''}`}>{step}</span>
                {i < correlation.causal_chain.length - 1 && (
                  <span style={{ color: 'var(--km-dim)', fontSize: 9 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <button className="btn" style={{ fontSize: 8, padding: '2px 8px' }}>RUNBOOK</button>
      </div>

      {correlation.recommendations.length > 0 && (
        <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--km-surface)', borderRadius: 'var(--r)', border: '1px solid var(--km-border)' }}>
          <span style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', letterSpacing: 0.3 }}>RECOMMENDATION</span>
          <div style={{ fontSize: 10, color: 'var(--km-secondary)', marginTop: 3 }}>{correlation.recommendations[0]}</div>
        </div>
      )}
    </div>
  );
}
