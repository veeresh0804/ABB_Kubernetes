import React from 'react';
import { motion } from 'framer-motion';
import { 
  Network, Share2, Activity, Zap, 
  Binary, Database, Microscope,
  ShieldCheck, Heart, Terminal, Search,
  Target, Fingerprint, History, Cpu, Globe, Brain,
  Info, BarChart3, Radar, Settings
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

const AgentNode = ({ agent, x, y, active }: { agent: any, x: number, y: number, active: boolean }) => (
  <motion.div 
    className={`agent-node ${active ? 'active' : ''}`}
    initial={{ scale: 0 }}
    animate={{ scale: 1, x, y }}
    style={{ position: 'absolute' }}
  >
    <div className="node-icon">{agent.icon}</div>
    <div className="node-label">{agent.agent}</div>
    {active && <div className="node-ripple" />}
  </motion.div>
);

export const AIMesh: React.FC<{ state: ClusterState }> = ({ state }) => {
  const activeAgents = state.agents.filter(a => a.status !== 'INFO');

  return (
    <div className="ai-mesh-page">
      <div className="mesh-header">
        <div className="mesh-title">
          <Network size={18} />
          <h1>AI MESH WORKSPACE</h1>
        </div>
        <div className="mesh-meta">
          <div className="meta-item">
            <span className="label">ACTIVE AGENTS</span>
            <span className="val">{state.agents.length}</span>
          </div>
          <div className="meta-divider" />
          <div className="meta-item">
            <span className="label">MESH INTEGRITY</span>
            <span className="val" style={{ color: 'var(--km-healthy)' }}>98.4%</span>
          </div>
        </div>
      </div>

      <div className="mesh-grid">
        <div className="mesh-main-graph">
          <div className="graph-header">
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={12} />
                <span>COGNITIVE NEURAL MESH</span>
             </div>
             <div className="graph-legend">
                <div className="legend-item"><div className="dot active" /> <span>ANALYZING</span></div>
                <div className="legend-item"><div className="dot idle" /> <span>IDLE</span></div>
             </div>
          </div>
          <div className="graph-canvas">
             <div className="canvas-nodes">
                {state.agents.map((a, i) => {
                  const angle = (i / state.agents.length) * Math.PI * 2;
                  const r = 180;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  return <AgentNode key={a.agent} agent={a} x={x} y={y} active={a.status !== 'INFO'} />;
                })}
                <div className="mesh-center">
                   <div className="center-core">
                      <Brain size={32} />
                   </div>
                   <div className="core-orbit" />
                   <div className="core-orbit slow" />
                </div>
             </div>
          </div>
        </div>

        <div className="mesh-stats-panel">
          <div className="mesh-sub-panel">
            <div className="p-header">AGENT CONSENSUS MATRIX</div>
            <div className="p-content">
              <div className="consensus-matrix">
                 <div className="matrix-row header">
                    <span>AGENT</span>
                    <span>CONFIDENCE</span>
                    <span>TRUST</span>
                 </div>
                 {state.agents.slice(0, 5).map(a => (
                   <div key={a.agent} className="matrix-row">
                      <span className="a-name">{a.agent}</span>
                      <div className="a-bar-wrap">
                         <div className="a-bar" style={{ width: `${a.confidence * 100}%`, background: 'var(--km-accent)' }} />
                      </div>
                      <span className="a-val">{(a.trust_score || 0.92).toFixed(2)}</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="mesh-sub-panel">
             <div className="p-header">COGNITIVE LOAD HEATMAP</div>
             <div className="p-content">
                <div className="load-heatmap">
                   {[...Array(24)].map((_, i) => (
                     <div key={i} className="heat-cell" style={{ opacity: 0.1 + (Math.random() * 0.9) }} />
                   ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                   <span style={{ fontSize: 8, color: 'var(--km-dim)' }}>0.0ms LATENCY</span>
                   <span style={{ fontSize: 8, color: 'var(--km-dim)' }}>100ms LATENCY</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
