// frontend/src/hooks/types.ts
import { WebSocket } from "ws";

export interface PodMetric {
  pod_id: string; pod_name: string; namespace: string;
  node: string; image: string; status: string;
  cpu_percent: number; memory_mb: number; memory_limit_mb: number;
  memory_pct: number; network_in_mbps: number; network_out_mbps: number;
  pvc_read_mbps: number; pvc_write_mbps: number;
  latency_ms: number; restarts: number; replicas: number; timestamp: number;
  trends?: Record<string, 'increasing' | 'decreasing' | 'stable'>;
  recent_logs?: string;
}

export interface Anomaly {
  pod_id: string; pod_name: string; metric: string;
  value: number | string; severity: 'CRITICAL'|'WARNING'|'INFO';
  threshold: number; message: string; timestamp: number;
}

export interface GraphNode {
  id: string; label: string; tier: string; node: string;
  status: string; severity: 'normal'|'warning'|'critical';
  cpu: number; memory_pct: number; restarts: number;
}

export interface GraphEdge {
  source: string; target: string; type: string; protocol: string; weight: number; hot: boolean;
}

export interface Graph {
  nodes: GraphNode[]; edges: GraphEdge[];
}

export interface Correlation {
  rule_id: string; name: string; summary: string; severity: 'CRITICAL'|'WARNING';
  root_cause_pod?: string; root_metric?: string;
  causal_chain: string[]; affected_pods: string[]; recommendations: string[];
  version?: number;
  reasoning_audit_trail?: any[];
  causal_evidence?: any;
  strategies?: any[];
}

export interface AgentInsight {
  agent: string; icon: string; domain: string; status: string;
  finding: string; confidence: number; reasoning: string[]; recommendation: string;
  detail: Record<string,any>; timestamp: number; buffer_action?: string;
  trust_score?: number;
  governance?: {
    avg_latency_ms: number;
    health: string;
    state: string;
    cycle_count: number;
  };
}

export interface ClusterHealth {
  score: number; status: string; pod_count: number;
  anomaly_count: number; critical_count: number; warning_count: number;
}

export interface ConnectionStatus {
  backend: 'connected' | 'reconnecting' | 'disconnected';
  websocket: 'connected' | 'reconnecting' | 'disconnected';
  prometheus: 'connected' | 'disconnected' | 'simulated';
  kubernetes: 'connected' | 'disconnected' | 'simulated';
  fallback: boolean;
}

export interface ClusterState {
  health: ClusterHealth;
  pods: PodMetric[];
  anomalies: Anomaly[];
  graph: Graph;
  correlations: Correlation[];
  agents: AgentInsight[];
  predictions: any[];
  sparkline?: number[];
  anomaly_mode: string | null;
  stabilization_mode?: 'OBSERVE' | 'RECOMMEND' | 'APPROVE' | 'STABILIZE';
  tick: number;
  connected: boolean;
  connection: ConnectionStatus;
}

export type ConnectionMode =
  | 'BOOTING'
  | 'CONNECTING'
  | 'LIVE'
  | 'DEGRADED'
  | 'SIMULATION'
  | 'RECONNECTING';

export interface ConnectionEvent {
  id: number;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
