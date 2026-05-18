import React from 'react';
import { motion } from 'framer-motion';
import { 
  Microscope, Play, Pause, SkipForward, 
  Settings, Zap, ShieldCheck, History, 
  Target, Activity, Database, AlertCircle
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

export const DigitalTwinLab: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="digital-twin-page">
      <div className="page-header">
        <div className="title-area">
          <Microscope size={18} />
          <h1>DIGITAL TWIN LAB</h1>
        </div>
        <div className="sim-controls">
           <button className="ctrl-btn"><Play size={14} /> <span>START SIM</span></button>
           <button className="ctrl-btn"><Pause size={14} /></button>
           <button className="ctrl-btn"><SkipForward size={14} /></button>
           <div className="v-divider" />
           <div className="sim-clock">T+ 00:00:00</div>
        </div>
      </div>

      <div className="twin-grid">
        <div className="grid-left scenario-builder">
          <div className="panel-header">
            <Settings size={12} />
            <span>SCENARIO BUILDER</span>
          </div>
          <div className="panel-content">
             <div className="scenario-list">
                {[
                  { name: 'NODE_OUTAGE_CASCADE', risk: 'HIGH', icon: <Zap size={14} /> },
                  { name: 'RETRY_STORM_AMPLIFY', risk: 'MED', icon: <Activity size={14} /> },
                  { name: 'MEMORY_LEAK_SLOW', risk: 'LOW', icon: <Database size={14} /> },
                  { name: 'TRAFFIC_SPIKE_X10', risk: 'HIGH', icon: <Activity size={14} /> }
                ].map(s => (
                  <div key={s.name} className="scenario-item">
                     <div className="s-icon">{s.icon}</div>
                     <span className="s-name">{s.name}</span>
                     <span className={`s-risk ${s.risk.toLowerCase()}`}>{s.risk}</span>
                  </div>
                ))}
             </div>
             <button className="btn-primary" style={{ width: '100%', marginTop: 20 }}>CONFIGURE CUSTOM SCENARIO</button>
          </div>
        </div>

        <div className="grid-center simulation-viewport">
          <div className="panel-header">
            <Activity size={12} />
            <span>REAL-TIME SIMULATION VIEWPORT</span>
          </div>
          <div className="panel-content viewport-area">
             <div className="viewport-overlay">
                <div className="overlay-badge">PREDICTIVE STABILITY: 84%</div>
             </div>
             <div className="shimmer" style={{ height: '100%', borderRadius: 8 }} />
          </div>
        </div>

        <div className="grid-right outcomes-panel">
          <div className="panel-header">
             <Target size={12} />
             <span>MITIGATION OUTCOMES</span>
          </div>
          <div className="panel-content">
             <div className="outcome-stats">
                <div className="stat-row">
                   <span>SURVIVABILITY</span>
                   <span className="text-healthy">92%</span>
                </div>
                <div className="stat-row">
                   <span>RECOVERY TIME</span>
                   <span className="text-accent">140s</span>
                </div>
                <div className="stat-row">
                   <span>BLAST RADIUS</span>
                   <span className="text-warn">0.12m</span>
                </div>
             </div>
             <div className="strategy-comparison">
                <div className="label">RECOMMENDED STABILIZATION</div>
                <div className="strat-card active">
                   <div className="strat-head">
                      <span>AUTO-SCALE</span>
                      <ShieldCheck size={12} color="var(--km-healthy)" />
                   </div>
                   <p>Predicted survival increased by 24% with minimal resource overhead.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
