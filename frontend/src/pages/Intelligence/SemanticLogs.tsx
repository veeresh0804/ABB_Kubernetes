import React from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, Zap, Target, Share2, 
  Binary, Brain, Search, Filter,
  Clock, Activity, AlertCircle, Info
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

export const SemanticLogs: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="semantic-logs-page">
      <div className="page-header">
        <div className="title-area">
          <Terminal size={18} />
          <h1>SEMANTIC LOG INTELLIGENCE</h1>
        </div>
        <div className="log-filters">
           <div className="search-box">
              <Search size={14} />
              <input type="text" placeholder="Search cognitive logs..." />
           </div>
           <button className="btn"><Filter size={12} /> <span>SEMANTIC FILTER</span></button>
        </div>
      </div>

      <div className="logs-grid">
        <div className="grid-main log-stream">
          <div className="panel-header">
            <Terminal size={12} />
            <span>AI-HIGHLIGHTED OPERATIONAL STREAM</span>
          </div>
          <div className="panel-content stream-area">
             <div className="stream-content">
                {[
                  { time: '12:44:12', pod: 'payment-v1', msg: 'Connection timeout to redis-primary', type: 'ERROR', logic: 'POTENTIAL_NETWORK_PARTITION' },
                  { time: '12:44:10', pod: 'auth-v2', msg: 'Retrying handshake with identity-provider', type: 'WARN', logic: 'RETRY_AMPLIFICATION_DETECTED' },
                  { time: '12:44:08', pod: 'gateway', msg: 'Upstream request latency > 2s', type: 'INFO', logic: 'LATENCY_CASCADE_ORIGIN' }
                ].map((l, i) => (
                  <div key={i} className={`log-entry ${l.type.toLowerCase()}`}>
                     <span className="l-time">{l.time}</span>
                     <span className="l-pod">[{l.pod}]</span>
                     <span className="l-msg">{l.msg}</span>
                     <div className="l-logic">
                        <Brain size={10} />
                        <span>{l.logic}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="grid-side semantic-analysis">
          <div className="panel-header">
             <Brain size={12} />
             <span>NLP ROOT CAUSE EXTRACTION</span>
          </div>
          <div className="panel-content">
             <div className="nlp-analysis">
                <div className="keyword-cloud">
                   <div className="k-label">TOP OPERATIONAL KEYWORDS</div>
                   <div className="cloud-items">
                      {['TIMEOUT', 'RETRIES', 'HANDSHAKE', 'LATENCY', 'REDIS'].map(k => (
                        <span key={k} className="k-item">{k}</span>
                      ))}
                   </div>
                </div>
                <div className="causal-link">
                   <div className="k-label">COGNITIVE CORRELATION</div>
                   <div className="link-card">
                      <div className="link-head">LOGS ↔ TOPOLOGY</div>
                      <p>94% correlation between gateway latency logs and payment-v1 network events.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
