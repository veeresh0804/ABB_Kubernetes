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
          <div className="story-severity" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={9} /> {correlation.severity} INCIDENT DETECTED
            {correlation.version && (
              <span style={{ 
                fontSize: 7, background: 'var(--km-border)', padding: '1px 4px', 
                borderRadius: 3, fontWeight: 700, color: 'var(--km-dim)' 
              }}>
                MODEL v{correlation.version}
              </span>
            )}
          </div>
          <h2 className="story-title">{correlation.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div className="badge badge-alert" style={{ fontSize: 9 }}>MTTD: 42s</div>
           {(correlation as any).causal_evidence && (
             <div style={{ 
               fontSize: 7, fontFamily: 'var(--km-mono)', color: 'var(--km-accent)', 
               marginTop: 4, letterSpacing: 0.3 
             }}>
               CAUSAL CONFIDENCE: {Math.round((correlation as any).causal_evidence.centrality_score * 10)}%
             </div>
           )}
        </div>
      </div>

      <div className="story-grid">
        <div>
          <div className="story-item-label">Root Cause Analysis</div>
          <p className="story-text" style={{ fontWeight: 600, color: 'var(--km-text)' }}>{correlation.root_cause_pod}</p>
          <p className="story-text">{correlation.summary}</p>
          
          {(correlation as any).reasoning_audit_trail && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--km-border)', paddingTop: 8 }}>
               <div style={{ fontSize: 7, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Reasoning Trace</div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                 {(correlation as any).reasoning_audit_trail.slice(0, 4).map((t: any, i: number) => (
                   <span key={i} style={{ fontSize: 7, color: 'var(--km-muted)', background: 'var(--km-surface)', padding: '1px 4px', borderRadius: 2 }}>
                     {t.metric}@{t.pod.split('-')[0]}
                   </span>
                 ))}
               </div>
            </div>
          )}
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
          <span style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', letterSpacing: 0.3 }}>PRIMARY RECOMMENDATION</span>
          <div style={{ fontSize: 10, color: 'var(--km-secondary)', marginTop: 3 }}>{correlation.recommendations[0]}</div>
        </div>
      )}

      {/* Phase 11: Stabilization Planning & Counterfactuals */}
      {(correlation as any).strategies && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
           <div style={{ fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stabilization Options (Counterfactual Simulation)</div>
           {(correlation as any).strategies.map((s: any, idx: number) => (
             <div key={idx} style={{ 
               padding: '8px 12px', background: idx === 0 ? 'rgba(34,197,94,0.05)' : 'var(--km-surface)',
               border: `1px solid ${idx === 0 ? 'rgba(34,197,94,0.2)' : 'var(--km-border)'}`,
               borderRadius: 6
             }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                 <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--km-text)' }}>{s.action.replace(/_/g, ' ').toUpperCase()}</span>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 8, color: 'var(--km-healthy)', fontWeight: 700 }}>RECOVERY: {Math.round(s.predicted_recovery_prob * 100)}%</span>
                    <span style={{ fontSize: 8, color: 'var(--km-danger)', fontWeight: 700 }}>RISK: {Math.round(s.risk_score * 100)}%</span>
                 </div>
               </div>
               <div style={{ fontSize: 9, color: 'var(--km-muted)', fontStyle: 'italic' }}>{s.reasoning}</div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
