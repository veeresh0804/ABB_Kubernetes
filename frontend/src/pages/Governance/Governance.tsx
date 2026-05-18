import React from 'react';
import { motion } from 'framer-motion';
import { 
  Fingerprint, ShieldCheck, Activity, 
  Microscope, Settings, History, 
  Shield, Target, Brain, Zap, AlertTriangle
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

export const Governance: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="governance-page">
      <div className="page-header">
        <div className="title-area">
          <Fingerprint size={18} />
          <h1>TRUST & GOVERNANCE</h1>
        </div>
        <div className="gov-status">
           <ShieldCheck size={14} color="var(--km-healthy)" />
           <span>GOVERNANCE PROTOCOL ACTIVE</span>
        </div>
      </div>

      <div className="gov-grid">
        <div className="grid-top trust-calibration">
           <div className="panel-header">
              <Activity size={12} />
              <span>COGNITIVE TRUST CALIBRATION</span>
           </div>
           <div className="panel-content">
              <div className="trust-metrics">
                 <div className="t-card">
                    <span className="t-label">HALLUCINATION RISK</span>
                    <span className="t-val" style={{ color: 'var(--km-healthy)' }}>LOW (0.02)</span>
                 </div>
                 <div className="t-card">
                    <span className="t-label">CONFIDENCE ACCURACY</span>
                    <span className="t-val">94.8%</span>
                 </div>
                 <div className="t-card">
                    <span className="t-label">CALIBRATION ERROR</span>
                    <span className="t-val">1.2%</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid-left policies">
           <div className="panel-header">
              <Settings size={12} />
              <span>GOVERNANCE POLICIES</span>
           </div>
           <div className="panel-content">
              <div className="policy-list">
                 {[
                   { name: 'AUTO_STABILIZATION', status: 'ENABLED', desc: 'Allows AI to execute low-risk recovery plans.' },
                   { name: 'AUTONOMY_THRESHOLD', status: '0.90', desc: 'Confidence required for autonomous action.' },
                   { name: 'REMEDIATION_QUOTA', status: '3/HR', desc: 'Max automated actions per hour per namespace.' }
                 ].map(p => (
                   <div key={p.name} className="policy-item">
                      <div className="p-head">
                         <span className="p-name">{p.name}</span>
                         <span className="p-status">{p.status}</span>
                      </div>
                      <p className="p-desc">{p.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid-right audits">
           <div className="panel-header">
              <History size={12} />
              <span>DECISION AUDIT TRAILS</span>
           </div>
           <div className="panel-content">
              <div className="audit-list">
                 {[
                   { time: '12:20', action: 'AUTO_SCALE', agent: 'Stabilizer', auth: 'POLICY_A2' },
                   { time: '11:45', action: 'ALERT_ONLY', agent: 'Supervisor', auth: 'POLICY_LOW_CONF' },
                   { time: '10:30', action: 'RESTART_POD', agent: 'Stabilizer', auth: 'MANUAL_OVERRIDE' }
                 ].map((a, i) => (
                   <div key={i} className="audit-row">
                      <span className="a-time">{a.time}</span>
                      <span className="a-action">{a.action}</span>
                      <span className="a-meta">{a.agent} // {a.auth}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
