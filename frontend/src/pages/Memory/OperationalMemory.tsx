import React from 'react';
import { motion } from 'framer-motion';
import { 
  History, Fingerprint, Activity, 
  Zap, Binary, Network, ShieldCheck,
  Search, Filter, Clock, AlertTriangle
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

export const OperationalMemory: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="operational-memory-page">
      <div className="page-header">
        <div className="title-area">
          <History size={18} />
          <h1>OPERATIONAL MEMORY</h1>
        </div>
        <div className="memory-search">
           <Search size={14} className="s-icon" />
           <input type="text" placeholder="Search operational fingerprints..." />
        </div>
      </div>

      <div className="memory-grid">
        <div className="grid-top fingerprint-explorer">
           <div className="panel-header">
              <Fingerprint size={12} />
              <span>INCIDENT FINGERPRINT EXPLORER</span>
           </div>
           <div className="panel-content">
              <div className="fingerprint-list">
                 {[
                   { id: '#42', name: 'RETRY_STORM_CASCADE', similarity: '91%', time: '2d ago' },
                   { id: '#38', name: 'PVC_THRESHOLD_EXCEEDED', similarity: '45%', time: '5d ago' },
                   { id: '#29', name: 'NODE_LATENCY_SPIKE', similarity: '12%', time: '1w ago' }
                 ].map(f => (
                   <div key={f.id} className="f-item">
                      <div className="f-meta">
                         <span className="f-id">{f.id}</span>
                         <span className="f-time">{f.time}</span>
                      </div>
                      <div className="f-name">{f.name}</div>
                      <div className="f-similarity">
                         <div className="s-bar" style={{ width: f.similarity }} />
                         <span>{f.similarity} SIMILARITY</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid-left lineage-graph">
           <div className="panel-header">
              <Network size={12} />
              <span>CAUSAL LINEAGE GRAPH</span>
           </div>
           <div className="panel-content">
              <div className="shimmer" style={{ height: '100%', borderRadius: 8 }} />
           </div>
        </div>

        <div className="grid-right remediation-history">
           <div className="panel-header">
              <ShieldCheck size={12} />
              <span>REMEDIATION MEMORY</span>
           </div>
           <div className="panel-content">
              <div className="history-list">
                 {[
                   { action: 'AUTO_SCALE', result: 'SUCCESS', count: 12 },
                   { action: 'POD_RESTART', result: 'FAILURE', count: 4 },
                   { action: 'ROLLBACK', result: 'SUCCESS', count: 2 }
                 ].map(h => (
                   <div key={h.action} className="h-row">
                      <span className="h-action">{h.action}</span>
                      <span className={`h-result ${h.result.toLowerCase()}`}>{h.result}</span>
                      <span className="h-count">x{h.count}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
