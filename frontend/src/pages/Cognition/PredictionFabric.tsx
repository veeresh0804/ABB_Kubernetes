import React from 'react';
import { motion } from 'framer-motion';
import { 
  Binary, Activity, Zap, Globe, 
  BarChart3, Radar, Target, TrendingUp,
  Clock, Shield, AlertTriangle
} from 'lucide-react';
import type { ClusterState } from '../../hooks/useCluster';

const ForecastCard = ({ horizon, risk, trend }: { horizon: string, risk: number, trend: 'up' | 'down' | 'stable' }) => (
  <div className="forecast-card">
    <div className="f-horizon">{horizon}</div>
    <div className="f-risk" style={{ color: risk > 60 ? 'var(--km-danger)' : risk > 30 ? 'var(--km-warn)' : 'var(--km-healthy)' }}>
      {risk}% RISK
    </div>
    <div className="f-trend">
      <TrendingUp size={10} style={{ transform: trend === 'down' ? 'rotate(180deg)' : 'none' }} />
      <span>{trend.toUpperCase()}</span>
    </div>
  </div>
);

export const PredictionFabric: React.FC<{ state: ClusterState }> = ({ state }) => {
  return (
    <div className="prediction-fabric-page">
      <div className="page-header">
        <div className="title-area">
          <Binary size={18} />
          <h1>PREDICTION FABRIC</h1>
        </div>
        <div className="horizon-strip">
          <ForecastCard horizon="5M HORIZON" risk={12} trend="stable" />
          <ForecastCard horizon="1H HORIZON" risk={24} trend="up" />
          <ForecastCard horizon="6H HORIZON" risk={38} trend="up" />
          <ForecastCard horizon="24H HORIZON" risk={15} trend="down" />
        </div>
      </div>

      <div className="prediction-grid">
        <div className="grid-main temporal-forecast">
          <div className="panel-header">
            <Clock size={12} />
            <span>TEMPORAL STABILITY FORECAST</span>
          </div>
          <div className="panel-content">
             <div className="forecast-graph-scaffold">
                <div className="graph-y-axis">
                   <span>STABLE</span>
                   <span>NOMINAL</span>
                   <span>FRAGILE</span>
                </div>
                <div className="graph-area">
                   <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <motion.path 
                        d="M0,50 Q100,20 200,60 T400,40"
                        fill="none"
                        stroke="var(--km-accent)"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2 }}
                      />
                      <path d="M0,50 Q100,20 200,60 T400,40" fill="url(#grad)" opacity="0.1" />
                      <defs>
                         <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--km-accent)', stopOpacity: 0.5 }} />
                            <stop offset="100%" style={{ stopColor: 'var(--km-accent)', stopOpacity: 0 }} />
                         </linearGradient>
                      </defs>
                   </svg>
                   <div className="graph-markers">
                      <div className="marker" style={{ left: '25%' }}><div className="m-line" /><span>1H</span></div>
                      <div className="marker" style={{ left: '50%' }}><div className="m-line" /><span>6H</span></div>
                      <div className="marker" style={{ left: '75%' }}><div className="m-line" /><span>12H</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="grid-side">
          <div className="panel-header">
             <Radar size={12} />
             <span>FUTURE BLAST RADIUS ESTIMATOR</span>
          </div>
          <div className="panel-content">
             <div className="radius-estimator">
                <div className="r-visual">
                   <div className="r-circle" style={{ width: 40, height: 40, opacity: 0.8 }} />
                   <div className="r-circle" style={{ width: 80, height: 80, opacity: 0.4 }} />
                   <div className="r-circle" style={{ width: 120, height: 120, opacity: 0.1 }} />
                   <Target size={20} className="r-center" />
                </div>
                <div className="r-data">
                   <div className="d-item">
                      <span className="d-label">PROJECTED IMPACT</span>
                      <span className="d-val">4 NODES</span>
                   </div>
                   <div className="d-item">
                      <span className="d-label">PROPAGATION RISK</span>
                      <span className="d-val text-warn">HIGH</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="grid-bottom probability-matrix">
           <div className="panel-header">
              <BarChart3 size={12} />
              <span>PROBABILITY EVOLUTION MATRIX</span>
           </div>
           <div className="panel-content">
              <div className="prob-matrix">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="prob-row">
                      <span className="row-label">SERVICE {String.fromCharCode(65 + i)}</span>
                      <div className="row-cells">
                         {[...Array(10)].map((_, j) => (
                           <div key={j} className="p-cell" style={{ background: j > 7 ? 'var(--km-danger)' : j > 5 ? 'var(--km-warn)' : 'var(--km-healthy)', opacity: 0.1 + (Math.random() * 0.4) }} />
                         ))}
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
