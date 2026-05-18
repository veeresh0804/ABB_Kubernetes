import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Brain, Zap, Target, Activity, 
  Radar, Globe, Cpu, Network, TrendingUp,
  AlertTriangle, Database, Info
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

interface CognitiveCardProps {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: React.ReactNode;
  confidence: number;
}

const CognitiveCard: React.FC<CognitiveCardProps> = ({ label, value, trend, color, icon, confidence }) => (
  <motion.div 
    className="cognitive-card"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="c-card-top">
      <div className="c-card-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="c-card-trend" style={{ color: trend === 'up' ? 'var(--km-healthy)' : trend === 'down' ? 'var(--km-danger)' : 'var(--km-dim)' }}>
        <TrendingUp size={10} style={{ transform: trend === 'down' ? 'rotate(180deg)' : 'none' }} />
        <span>{trend.toUpperCase()}</span>
      </div>
    </div>
    <div className="c-card-body">
      <div className="c-card-label">{label}</div>
      <div className="c-card-value" style={{ color }}>{value}</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <div style={{ flex: 1, height: 2, background: 'var(--km-border)', borderRadius: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${confidence * 100}%`, background: color, borderRadius: 1 }} />
      </div>
      <span style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)', marginLeft: 8 }}>{(confidence * 100).toFixed(0)}% CONF</span>
    </div>
  </motion.div>
);

export const CommandCenter: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="command-center">
      <div className="executive-strip">
        <CognitiveCard label="OPERATIONAL STABILITY" value={`${state.health.score}%`} trend="stable" color="var(--km-healthy)" icon={<Shield size={16} />} confidence={0.98} />
        <CognitiveCard label="COGNITIVE INTEGRITY" value="OPTIMAL" trend="up" color="var(--km-accent)" icon={<Brain size={16} />} confidence={0.94} />
        <CognitiveCard label="PREDICTION CONFIDENCE" value="92.4%" trend="up" color="var(--km-warn)" icon={<Target size={16} />} confidence={0.89} />
        <CognitiveCard label="BLAST RADIUS" value="0.04m" trend="down" color="var(--km-danger)" icon={<Radar size={16} />} confidence={0.96} />
      </div>

      <div className="workspace-fabric">
        <div className="fabric-panel topology-fabric">
          <div className="panel-header">
            <Globe size={14} />
            <span>INFRASTRUCTURE FABRIC</span>
          </div>
          <div className="panel-content">
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
               <div className="status-pill">
                  <div className="status-indicator active" />
                  <span>LIVE REASONING</span>
               </div>
            </div>
            
            <div className="shimmer" style={{ height: '100%', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ textAlign: 'center' }}>
                  <Network size={48} style={{ color: 'var(--km-accent)', opacity: 0.2, marginBottom: 16 }} className="pulse-active" />
                  <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'var(--km-dim)', letterSpacing: '0.2em' }}>TOPOLOGY INTELLIGENCE FABRIC ACTIVE</div>
               </div>
            </div>
          </div>
        </div>

        <div className="fabric-panel reasoning-cortex">
          <div className="panel-header">
            <Brain size={14} />
            <span>AI REASONING CORTEX</span>
          </div>
          <div className="panel-content">
            <div className="reasoning-timeline">
              {['DETECT', 'CORRELATE', 'INFER', 'PREDICT', 'SIMULATE', 'STABILIZE'].map((step, i) => (
                <div key={step} className="r-step">
                  <div className={`r-node ${i < 3 ? 'completed' : i === 3 ? 'active' : ''}`} />
                  <span className="r-label">{step}</span>
                  {i < 5 && <div className={`r-connector ${i < 2 ? 'completed' : ''}`} />}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)', fontWeight: 700 }}>ACTIVE HYPOTHESES</div>
              {state.agents.filter(a => a.status !== 'INFO').slice(0, 3).map((a, i) => (
                <div key={i} className="feed-item" style={{ background: 'var(--km-surface-alt)' }}>
                   <div className="feed-item-header">
                      <span>{a.agent}</span>
                      <span style={{ color: 'var(--km-accent)' }}>{(a.confidence * 100).toFixed(0)}% CONF</span>
                   </div>
                   <div className="feed-item-body">{a.finding}</div>
                </div>
              ))}
              {state.agents.filter(a => a.status !== 'INFO').length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, border: '1px dashed var(--km-border)', borderRadius: 8 }}>
                   <Info size={24} style={{ color: 'var(--km-dim)', marginBottom: 8 }} />
                   <div style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'var(--km-dim)' }}>ALL SYSTEMS NOMINAL // NO ACTIVE ANOMALIES</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fabric-panel digital-twin">
          <div className="panel-header">
            <Database size={14} />
            <span>DIGITAL TWIN PREVIEW</span>
          </div>
          <div className="panel-content">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ flex: 1, border: '1px solid var(--km-border)', borderRadius: 8, padding: 12, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)' }}>SIMULATED FUTURE STATE</div>
                  <div className="shimmer" style={{ height: '100%', width: '100%', opacity: 0.1 }} />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="status-pill" style={{ justifyContent: 'center' }}>NODE FAILURE</div>
                  <div className="status-pill" style={{ justifyContent: 'center' }}>TRAFFIC SPIKE</div>
               </div>
            </div>
          </div>
        </div>

        <div className="fabric-panel decision-intelligence">
          <div className="panel-header">
            <Target size={14} />
            <span>DECISION INTELLIGENCE</span>
          </div>
          <div className="panel-content">
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'AUTO-SCALE (PROD)', recovery: '96%', risk: 'LOW' },
                  { name: 'POD RESTART', recovery: '72%', risk: 'MED' },
                  { name: 'DEPLOY ROLLBACK', recovery: '84%', risk: 'LOW' }
                ].map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--km-surface-alt)', borderRadius: 6, border: '1px solid var(--km-border)' }}>
                     <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700 }}>{p.name}</span>
                     <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: 'var(--km-healthy)' }}>{p.recovery} REC</span>
                        <span style={{ fontFamily: 'var(--km-mono)', fontSize: 10, color: p.risk === 'LOW' ? 'var(--km-accent)' : 'var(--km-warn)' }}>{p.risk} RISK</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
