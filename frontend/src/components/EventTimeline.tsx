import React from 'react';
import { Wifi, Activity, AlertCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Anomaly } from '../hooks/useCluster';

interface EventTimelineProps {
  anomalies: Anomaly[];
  healthScore: number;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ anomalies, healthScore }) => {
  return (
    <footer className="aether-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={12} color="var(--km-healthy)" />
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)' }}>GOVERNANCE: ENFORCED</span>
        </div>
        <div style={{ width: 1, height: 12, background: 'var(--km-border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} color="var(--km-accent)" />
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700, color: 'var(--km-dim)' }}>AUTO-STABILIZE: ON</span>
        </div>
      </div>

      <div className="timeline-stream">
        {anomalies.length === 0 ? (
          <div className="stream-item">
            <div className="item-status" style={{ background: 'var(--km-healthy)' }} />
            <span className="item-msg">SYSTEM COGNITION NOMINAL // ALL INFRASTRUCTURE DOMAINS STABLE // MONITORING CONTINUOUS</span>
          </div>
        ) : (
          anomalies.slice(-3).reverse().map((a, i) => (
            <div key={i} className="stream-item">
              <div className="item-status" style={{ background: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }} />
              <span className="item-time">{new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="item-msg" style={{ color: a.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)' }}>
                {a.pod_name.toUpperCase()} // {a.message.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>FABRIC STABILITY</span>
           <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-healthy)' }}>{healthScore}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>LATENCY</span>
           <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, color: 'var(--km-accent)' }}>12ms</span>
        </div>
      </div>
    </footer>
  );
};
