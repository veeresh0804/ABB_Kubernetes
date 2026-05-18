import React from 'react';
import { motion } from 'framer-motion';
import { 
  Network, Share2, Activity, Zap, 
  Binary, Database, Microscope,
  ShieldCheck, Heart, Terminal, Search,
  Target, Fingerprint, History, Cpu, Globe, Brain,
  BarChart3, Radar, Settings, MessageSquare, TestTube2
} from 'lucide-react';
import { CommandCenter as CC } from './CommandCenter/CommandCenter';
import type { ClusterState } from '../hooks/useCluster';

const PageWorkspace = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <motion.div 
    className="page-workspace"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ padding: 8, background: 'var(--km-surface)', border: '1px solid var(--km-border)', borderRadius: 6, color: 'var(--km-accent)' }}>
        <Icon size={18} />
      </div>
      <div>
        <h1 style={{ fontFamily: 'var(--km-display)', fontSize: '18px', fontWeight: 700 }}>{title}</h1>
        <div style={{ fontFamily: 'var(--km-mono)', fontSize: '9px', color: 'var(--km-dim)', letterSpacing: '0.05em' }}>COGNITIVE DOMAIN ACTIVE // SECURE ACCESS</div>
      </div>
    </div>
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 16 }}>
       {children}
    </div>
  </motion.div>
);

const PanelScaffold = ({ title, icon: Icon, children }: { title: string, icon: any, children?: React.ReactNode }) => (
  <div className="fabric-panel">
    <div className="panel-header">
      <Icon size={12} />
      <span>{title}</span>
    </div>
    <div className="panel-content">
      {children || (
        <div className="shimmer" style={{ height: '100%', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={32} style={{ color: 'var(--km-accent)', opacity: 0.1 }} />
        </div>
      )}
    </div>
  </div>
);

/* ───── HELPER: Severity Color ───── */
const sevColor = (s: string) => s === 'CRITICAL' ? 'var(--km-danger)' : s === 'WARNING' ? 'var(--km-warn)' : 'var(--km-healthy)';

/* ═══════════════════════════════════════════════════════════════ */
/* COGNITION                                                     */
/* ═══════════════════════════════════════════════════════════════ */
export const AIMesh = ({ state }: { state?: ClusterState }) => (
  <PageWorkspace title="AI Mesh Workspace" icon={Network}>
    <PanelScaffold title="ACTIVE AGENTS" icon={Share2}>
      {state && state.agents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, overflowY: 'auto', height: '100%' }}>
          {state.agents.map(a => (
            <div key={a.agent} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: 'var(--km-surface-alt)',
              border: '1px solid var(--km-border)', borderRadius: 6, fontSize: 11
            }}>
              <span style={{ fontWeight: 600, flex: 1 }}>{a.icon} {a.agent}</span>
              <span style={{
                color: sevColor(a.status),
                fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700,
                marginRight: 8
              }}>{a.status}</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>
                {Math.round(a.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      ) : undefined}
    </PanelScaffold>
    <PanelScaffold title="ENSEMBLE WEIGHTING" icon={Activity}>
      {state && state.agents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)', marginBottom: 4 }}>CONFIDENCE DISTRIBUTION</div>
          {state.agents.slice(0, 5).map(a => (
            <div key={a.agent} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-muted)', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agent.split(' ')[0]}</span>
              <div style={{ flex: 1, height: 4, background: 'var(--km-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(a.confidence * 100)}%`, background: sevColor(a.status), borderRadius: 2, transition: 'width 0.6s' }} />
              </div>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)', width: 28 }}>{Math.round(a.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      ) : undefined}
    </PanelScaffold>
    <PanelScaffold title="AGENT NEURAL NETWORK" icon={Binary} />
    <PanelScaffold title="CONFIDENCE PROPAGATION" icon={Zap} />
    <PanelScaffold title="REASONING EXCHANGE" icon={Terminal} />
    <PanelScaffold title="CONSENSUS MATRIX" icon={Target} />
  </PageWorkspace>
);

export const PredictionFabric = ({ state }: { state?: ClusterState }) => (
  <PageWorkspace title="Prediction Fabric" icon={Binary}>
    <PanelScaffold title="MULTI-HORIZON FORECAST" icon={Activity}>
      {state && state.predictions && state.predictions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, overflowY: 'auto', height: '100%' }}>
          {state.predictions.map((p: any, i: number) => (
            <div key={i} style={{
              padding: '8px 10px', background: 'var(--km-surface-alt)',
              border: '1px solid var(--km-border)', borderRadius: 6,
              borderLeft: `3px solid ${p.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                <span>{p.pod_name}</span>
                <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: sevColor(p.severity) }}>{p.severity}</span>
              </div>
              <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)', marginTop: 4 }}>
                {p.metric} → TTF: {p.ttf_minutes}min · Conf: {Math.round(p.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
          <Activity size={24} style={{ color: 'var(--km-healthy)', opacity: 0.3 }} />
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>NO ACTIVE PREDICTIONS // STABLE</span>
        </div>
      )}
    </PanelScaffold>
    <PanelScaffold title="FUTURE TOPOLOGY STATE" icon={Globe} />
    <PanelScaffold title="INSTABILITY PREDICTION" icon={Zap} />
    <PanelScaffold title="CONFIDENCE DRIFT ANALYSIS" icon={Binary} />
    <PanelScaffold title="PROBABILITY EVOLUTION" icon={BarChart3} />
    <PanelScaffold title="FUTURE BLAST RADIUS" icon={Radar} />
  </PageWorkspace>
);

export const Governance = ({ state }: { state?: ClusterState }) => (
  <PageWorkspace title="Trust & Governance" icon={Fingerprint}>
    <PanelScaffold title="TRUST CALIBRATION" icon={ShieldCheck}>
      {state && state.agents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, overflowY: 'auto', height: '100%' }}>
          {state.agents.map(a => (
            <div key={a.agent} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: 'var(--km-surface-alt)',
              border: '1px solid var(--km-border)', borderRadius: 6
            }}>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{a.agent}</span>
              <span style={{
                fontFamily: 'var(--km-mono)', fontSize: 9, fontWeight: 700,
                color: (a.trust_score || 0.85) > 0.9 ? 'var(--km-healthy)' : 'var(--km-warn)'
              }}>
                TRUST: {Math.round((a.trust_score || 0.85) * 100)}%
              </span>
            </div>
          ))}
        </div>
      ) : undefined}
    </PanelScaffold>
    <PanelScaffold title="CONFIDENCE QUALITY" icon={Activity} />
    <PanelScaffold title="HALLUCINATION MONITORING" icon={Microscope} />
    <PanelScaffold title="GOVERNANCE POLICIES" icon={Fingerprint} />
    <PanelScaffold title="AUTONOMY CONTROLS" icon={Settings} />
    <PanelScaffold title="DECISION AUDIT TRAILS" icon={History} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* INFRASTRUCTURE                                                */
/* ═══════════════════════════════════════════════════════════════ */
export const InfrastructureFabric = ({ state }: { state?: ClusterState }) => (
  <PageWorkspace title="Infrastructure Fabric" icon={Network}>
    <PanelScaffold title="ACTIVE CORRELATIONS" icon={Globe}>
      {state && (state.correlations || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, overflowY: 'auto', height: '100%' }}>
          {(state.correlations as any[]).map((c: any, i: number) => (
            <div key={i} style={{
              padding: '8px 10px', background: 'var(--km-surface-alt)',
              border: '1px solid var(--km-border)', borderRadius: 6,
              borderLeft: `3px solid ${c.severity === 'CRITICAL' ? 'var(--km-danger)' : 'var(--km-warn)'}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'var(--km-secondary)', marginBottom: 4 }}>{c.summary}</div>
              <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>
                {c.causal_chain?.join(' → ')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
          <Globe size={24} style={{ color: 'var(--km-healthy)', opacity: 0.3 }} />
          <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>NO ACTIVE INCIDENTS // TOPOLOGY STABLE</span>
        </div>
      )}
    </PanelScaffold>
    <PanelScaffold title="PROPAGATION FLOW" icon={Activity} />
    <PanelScaffold title="DEPENDENCY OVERLAYS" icon={Share2} />
    <PanelScaffold title="BLAST RADIUS VISUAL" icon={Radar} />
    <PanelScaffold title="RISK HEATMAP" icon={Zap} />
    <PanelScaffold title="CAUSAL FLOW" icon={Binary} />
  </PageWorkspace>
);

export const NamespaceIntelligence = () => (
  <PageWorkspace title="Namespace Intelligence" icon={Globe}>
    <PanelScaffold title="NAMESPACE TOPOLOGY" icon={Globe} />
    <PanelScaffold title="RESOURCE ISOLATION" icon={ShieldCheck} />
    <PanelScaffold title="CROSS-NAMESPACE FLOW" icon={Share2} />
    <PanelScaffold title="LOGICAL BOUNDARIES" icon={Fingerprint} />
    <PanelScaffold title="TENANT RISK" icon={Target} />
    <PanelScaffold title="QUOTA PREDICTION" icon={Activity} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* SIMULATION                                                    */
/* ═══════════════════════════════════════════════════════════════ */
export const DigitalTwinLab = () => (
  <PageWorkspace title="Digital Twin Lab" icon={Microscope}>
    <PanelScaffold title="SCENARIO BUILDER" icon={Settings} />
    <PanelScaffold title="SIMULATION PLAYBACK" icon={Activity} />
    <PanelScaffold title="PROPAGATION ENGINE" icon={Zap} />
    <PanelScaffold title="SURVIVABILITY ANALYSIS" icon={ShieldCheck} />
    <PanelScaffold title="FUTURE TOPOLOGY REPLAY" icon={History} />
    <PanelScaffold title="MITIGATION OUTCOME" icon={Target} />
  </PageWorkspace>
);

export const ScenarioSimulator = () => (
  <PageWorkspace title="Scenario Simulator" icon={TestTube2}>
    <PanelScaffold title="TRAFFIC SPIKE SIM" icon={Activity} />
    <PanelScaffold title="NODE FAILURE SIM" icon={Zap} />
    <PanelScaffold title="MEMORY LEAK SIM" icon={Database} />
    <PanelScaffold title="ROLLBACK SIM" icon={History} />
    <PanelScaffold title="RETRY STORM SIM" icon={Share2} />
    <PanelScaffold title="PARTITION SIM" icon={Network} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* MEMORY                                                        */
/* ═══════════════════════════════════════════════════════════════ */
export const OperationalMemory = () => (
  <PageWorkspace title="Operational Memory" icon={History}>
    <PanelScaffold title="FINGERPRINT EXPLORER" icon={Fingerprint} />
    <PanelScaffold title="INCIDENT LINEAGE" icon={History} />
    <PanelScaffold title="REMEDIATION MEMORY" icon={ShieldCheck} />
    <PanelScaffold title="RECURRING PATTERNS" icon={Activity} />
    <PanelScaffold title="CAUSAL CHAINS" icon={Binary} />
    <PanelScaffold title="MEMORY GRAPH" icon={Network} />
  </PageWorkspace>
);

export const IncidentArchive = () => (
  <PageWorkspace title="Incident Archive" icon={Activity}>
    <PanelScaffold title="HISTORICAL INCIDENTS" icon={History} />
    <PanelScaffold title="COLLAPSE REPLAY" icon={Zap} />
    <PanelScaffold title="ROOT CAUSE REPOSITORY" icon={Target} />
    <PanelScaffold title="STABILIZATION LOGS" icon={ShieldCheck} />
    <PanelScaffold title="RECOVERY EFFICIENCY" icon={Activity} />
    <PanelScaffold title="POST-MORTEM DATA" icon={Terminal} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* INTELLIGENCE                                                  */
/* ═══════════════════════════════════════════════════════════════ */
export const SemanticLogs = () => (
  <PageWorkspace title="Semantic Log Intelligence" icon={Terminal}>
    <PanelScaffold title="SEMANTIC LOG STREAM" icon={Terminal} />
    <PanelScaffold title="AI ANOMALY DETECTION" icon={Zap} />
    <PanelScaffold title="NLP ROOT CAUSE" icon={Target} />
    <PanelScaffold title="CORRELATION GRAPH" icon={Share2} />
    <PanelScaffold title="KEYWORD EXTRACTION" icon={Binary} />
    <PanelScaffold title="REASONING LINKS" icon={Brain} />
  </PageWorkspace>
);

export const CausalAnalytics = () => (
  <PageWorkspace title="Causal Analytics" icon={Zap}>
    <PanelScaffold title="CAUSAL INFERENCE" icon={Binary} />
    <PanelScaffold title="EFFECT ESTIMATION" icon={Activity} />
    <PanelScaffold title="COUNTERFACTUALS" icon={Microscope} />
    <PanelScaffold title="INTERVENTION ANALYSIS" icon={Target} />
    <PanelScaffold title="CAUSAL GRAPH" icon={Network} />
    <PanelScaffold title="PATH ANALYSIS" icon={Share2} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* SYSTEM                                                        */
/* ═══════════════════════════════════════════════════════════════ */
export const CognitiveHealth = () => (
  <PageWorkspace title="Cognitive Health" icon={Heart}>
    <PanelScaffold title="EVENT FABRIC VISUAL" icon={Network} />
    <PanelScaffold title="QUEUE PRESSURE" icon={Activity} />
    <PanelScaffold title="AGENT RUNTIME" icon={Cpu} />
    <PanelScaffold title="COGNITION STABILITY" icon={ShieldCheck} />
    <PanelScaffold title="LATENCY CASCADES" icon={Zap} />
    <PanelScaffold title="INTEGRITY MONITOR" icon={Fingerprint} />
  </PageWorkspace>
);

export const AgentLifecycle = () => (
  <PageWorkspace title="Agent Lifecycle" icon={Cpu}>
    <PanelScaffold title="AGENT ORCHESTRATION" icon={Cpu} />
    <PanelScaffold title="REASONING LATENCY" icon={Activity} />
    <PanelScaffold title="MEMORY ALLOCATION" icon={Database} />
    <PanelScaffold title="COMMUNICATION FLOW" icon={Share2} />
    <PanelScaffold title="LIFECYCLE STATUS" icon={Settings} />
    <PanelScaffold title="AGENT DEPLOYMENT" icon={Zap} />
  </PageWorkspace>
);

/* ═══════════════════════════════════════════════════════════════ */
/* MISSION CONTROL                                               */
/* ═══════════════════════════════════════════════════════════════ */
export const ExecutiveOps = () => (
  <PageWorkspace title="Executive Operations" icon={Target}>
    <PanelScaffold title="STRATEGIC RISK" icon={Radar} />
    <PanelScaffold title="ENTERPRISE STABILITY" icon={ShieldCheck} />
    <PanelScaffold title="LONG-TERM FORECAST" icon={Activity} />
    <PanelScaffold title="RESILIENCE POSTURE" icon={Heart} />
    <PanelScaffold title="INFRASTRUCTURE POSTURE" icon={Globe} />
    <PanelScaffold title="ORG RISK ANALYTICS" icon={Target} />
  </PageWorkspace>
);

export const MissionControl = () => (
  <PageWorkspace title="Live Mission Control" icon={Activity}>
    <PanelScaffold title="CLUSTER FABRIC" icon={Network} />
    <PanelScaffold title="ACTIVE INCIDENTS" icon={Zap} />
    <PanelScaffold title="SIMULATION STREAM" icon={Microscope} />
    <PanelScaffold title="GOVERNANCE MODE" icon={ShieldCheck} />
    <PanelScaffold title="COMMAND INPUT" icon={Terminal} />
    <PanelScaffold title="COGNITIVE FEED" icon={Brain} />
  </PageWorkspace>
);

export const KnowledgeSearch = () => (
  <PageWorkspace title="Knowledge Retrieval" icon={Search}>
    <PanelScaffold title="NATURAL LANGUAGE QUERY" icon={MessageSquare} />
    <PanelScaffold title="INCIDENT RETRIEVAL" icon={History} />
    <PanelScaffold title="TOPOLOGY SEARCH" icon={Globe} />
    <PanelScaffold title="MITIGATION SEARCH" icon={ShieldCheck} />
    <PanelScaffold title="KNOWLEDGE GRAPH" icon={Network} />
    <PanelScaffold title="SEMANTIC INFRASTRUCTURE" icon={Binary} />
  </PageWorkspace>
);

/* REPLAY */
export const ReplayStudio = () => (
  <PageWorkspace title="Replay Studio" icon={History}>
    <PanelScaffold title="TIMELINE REPLAY" icon={History} />
    <PanelScaffold title="TOPOLOGY EVOLUTION" icon={Globe} />
    <PanelScaffold title="PREDICTION EVOLUTION" icon={Binary} />
    <PanelScaffold title="MITIGATION PATHS" icon={ShieldCheck} />
    <PanelScaffold title="REASONING REPLAY" icon={Brain} />
    <PanelScaffold title="STORYTELLING ENGINE" icon={Activity} />
  </PageWorkspace>
);

export const CommandCenter = CC;
