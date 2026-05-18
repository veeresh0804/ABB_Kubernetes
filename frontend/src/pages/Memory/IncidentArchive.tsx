import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, History, Zap, Target,
  ShieldCheck, Terminal, Search, Clock,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

export const IncidentArchive: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="incident-archive-page">
      <div className="page-header">
        <div className="title-area">
          <Activity size={18} />
          <h1>INCIDENT ARCHIVE</h1>
        </div>
        <div className="archive-stats">
           <div className="stat"><span>AVG RECOVERY:</span> 184s</div>
           <div className="v-divider" />
           <div className="stat"><span>TOTAL INCIDENTS:</span> 124</div>
        </div>
      </div>

      <div className="archive-grid">
        <div className="grid-main history-list">
           <div className="panel-header">
              <History size={12} />
              <span>HISTORICAL OPERATIONAL INCIDENTS</span>
           </div>
           <div className="panel-content">
              <div className="incident-table">
                 <div className="table-row header">
                    <span>INCIDENT ID</span>
                    <span>TIMESTAMP</span>
                    <span>TYPE</span>
                    <span>RESOLUTION</span>
                 </div>
                 {[
                   { id: 'INC-2401', time: '2026-05-16 14:20', type: 'CASCADE_FAILURE', res: 'AUTO_SCALE' },
                   { id: 'INC-2398', time: '2026-05-15 09:12', type: 'OOM_KILL', res: 'RESTART' },
                   { id: 'INC-2384', time: '2026-05-12 18:44', type: 'RETRY_STORM', res: 'ROLLBACK' }
                 ].map(i => (
                   <div key={i.id} className="table-row">
                      <span className="i-id">{i.id}</span>
                      <span className="i-time">{i.time}</span>
                      <span className="i-type">{i.type}</span>
                      <span className="i-res">{i.res}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid-side root-cause-repo">
           <div className="panel-header">
              <Target size={12} />
              <span>ROOT CAUSE REPOSITORY</span>
           </div>
           <div className="panel-content">
              <div className="rc-repo">
                 <div className="label">TOP ROOT CAUSES</div>
                 <div className="rc-list">
                    {[
                      { name: 'MISCONFIGURED_RETRY', pct: 42 },
                      { name: 'RESOURCE_CONTENTION', pct: 28 },
                      { name: 'UPSTREAM_TIMEOUT', pct: 15 }
                    ].map(rc => (
                      <div key={rc.name} className="rc-item">
                         <span>{rc.name}</span>
                         <span className="rc-pct">{rc.pct}%</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
