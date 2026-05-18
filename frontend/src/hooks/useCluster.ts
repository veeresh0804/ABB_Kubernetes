import { useState, useEffect, useRef, useCallback } from 'react';
import { applyTransition } from './useConnectionState';
import { useEventLog } from './useEventLog';
import { useWebSocket } from './useWebSocket'; // FIX F-002: Import new WebSocket hook
import { useHealthPoller } from './useHealthPoller'; // FIX F-002: Import new Health Poller hook
import type { PodMetric, Anomaly, GraphNode, GraphEdge, Graph, Correlation, AgentInsight, ClusterHealth, ConnectionStatus, ClusterState, ConnectionMode, ConnectionEvent } from './types';

/* ─── Constants ─── */
const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + `//${window.location.host}/ws/metrics`;
const IS_DEV = import.meta.env.DEV;
const wsLog = IS_DEV ? (msg: string) => console.log(`[WS] ${msg}`) : () => {};
const BOOT_FAIL_THRESHOLD = 3;
const BOOT_POLL_MS = 5000;
const SIM_POLL_MS = 10000;
const HEARTBEAT_STALE_MS = 10000;
const HEARTBEAT_CHECK_MS = 2000;
const SIM_TICK_MS = 2000;
// const RECONNECT_BASE_MS = IS_DEV ? 3000 : 1000; // Moved to useWebSocket
// const RECONNECT_MAX_MS = 30000; // Moved to useWebSocket

const EMPTY: ClusterState = {
  health: { score: 100, status: 'loading', anomaly_count: 0, critical_count: 0, warning_count: 0, pod_count: 0 },
  pods: [], anomalies: [], graph: { nodes: [], edges: [] }, correlations: [], agents: [], predictions: [],
  anomaly_mode: null, tick: 0, connected: false,
  connection: {
    backend: 'disconnected', websocket: 'disconnected',
    prometheus: 'disconnected', kubernetes: 'disconnected', fallback: false,
  },
};

export function simProgress(tick: number, startTick: number, duration: number): number {
  if (startTick === 0) return 0;
  return Math.min((tick - startTick) / duration, 1.0);
}

export function getBasePods(tick: number): PodMetric[] {
  const t = tick;
  return [
    { pod_id: 'frontend-service', pod_name: 'frontend-service', namespace: 'production', node: 'node-01', image: 'nginx:1.25', status: 'Running', cpu_percent: 12 + Math.sin(t * 0.1) * 3 + (Math.random() - 0.5) * 3, memory_mb: 256 + Math.sin(t * 0.05) * 20 + (Math.random() - 0.5) * 10, memory_limit_mb: 896, memory_pct: 28.6, network_in_mbps: 2.1, network_out_mbps: 1.8, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 12 + Math.sin(t * 0.1) * 2, restarts: 0, replicas: 2, timestamp: Date.now() / 1000 },
    { pod_id: 'auth-service', pod_name: 'auth-service', namespace: 'production', node: 'node-01', image: 'auth-svc:2.1.0', status: 'Running', cpu_percent: 18 + Math.sin(t * 0.08 + 1) * 4 + (Math.random() - 0.5) * 2, memory_mb: 512 + Math.sin(t * 0.04 + 2) * 30 + (Math.random() - 0.5) * 15, memory_limit_mb: 1792, memory_pct: 28.6, network_in_mbps: 1.2, network_out_mbps: 0.9, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 8 + Math.sin(t * 0.09 + 1) * 2, restarts: 0, replicas: 2, timestamp: Date.now() / 1000 },
    { pod_id: 'payment-service', pod_name: 'payment-service', namespace: 'production', node: 'node-02', image: 'payment-svc:1.4.2', status: 'Running', cpu_percent: 24 + Math.sin(t * 0.12 + 3) * 5 + (Math.random() - 0.5) * 4, memory_mb: 768 + Math.sin(t * 0.06 + 4) * 40 + (Math.random() - 0.5) * 20, memory_limit_mb: 2688, memory_pct: 28.6, network_in_mbps: 0.8, network_out_mbps: 0.6, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 15 + Math.sin(t * 0.11 + 3) * 3, restarts: 0, replicas: 3, timestamp: Date.now() / 1000 },
    { pod_id: 'redis-cache', pod_name: 'redis-cache', namespace: 'production', node: 'node-02', image: 'redis:7.2', status: 'Running', cpu_percent: 8 + Math.sin(t * 0.07 + 5) * 2 + (Math.random() - 0.5) * 1.5, memory_mb: 1024 + Math.sin(t * 0.03 + 6) * 50 + (Math.random() - 0.5) * 25, memory_limit_mb: 3584, memory_pct: 28.6, network_in_mbps: 3.5, network_out_mbps: 3.2, pvc_read_mbps: 0.5, pvc_write_mbps: 0.3, latency_ms: 5 + Math.sin(t * 0.06 + 5) * 1, restarts: 0, replicas: 1, timestamp: Date.now() / 1000 },
    { pod_id: 'postgres-db', pod_name: 'postgres-db', namespace: 'production', node: 'node-03', image: 'postgres:15.3', status: 'Running', cpu_percent: 15 + Math.sin(t * 0.05 + 7) * 3 + (Math.random() - 0.5) * 2, memory_mb: 2048 + Math.sin(t * 0.02 + 8) * 60 + (Math.random() - 0.5) * 30, memory_limit_mb: 7168, memory_pct: 28.6, network_in_mbps: 0.4, network_out_mbps: 0.6, pvc_read_mbps: 2.1, pvc_write_mbps: 1.8, latency_ms: 10 + Math.sin(t * 0.04 + 7) * 2, restarts: 0, replicas: 1, timestamp: Date.now() / 1000 },
  ];
}

export function cl(pct: number): 'CRITICAL' | 'WARNING' { return pct > 80 ? 'CRITICAL' : 'WARNING'; }

const SCENARIO_CONFIGS: Record<string, {
  label: string; duration: number; pods: string[];
  modify: (p: PodMetric, prog: number, tick: number) => PodMetric;
  anomalies: (prog: number, tick: number, pods: PodMetric[]) => Anomaly[];
  correlation: (prog: number, pods: PodMetric[]) => Correlation;
  agents: (prog: number, prev: AgentInsight[]) => AgentInsight[];
  predictions: (prog: number) => any[];
}> = {
  pvc_cascade: {
    label: 'PVC/iSCSI Cascade', duration: 30, pods: ['postgres-db', 'auth-service', 'frontend-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'postgres-db') return { ...p, pvc_write_mbps: 1.8 + prog * 8.5, pvc_read_mbps: 0.5 + prog * 4.2, cpu_percent: 15 + prog * 35, latency_ms: 10 + prog * 180, status: prog > 0.9 ? 'CrashLoopBackOff' : 'Running' };
      if (p.pod_id === 'auth-service') return { ...p, latency_ms: 8 + prog * 80, cpu_percent: 18 + prog * 25 };
      if (p.pod_id === 'frontend-service') return { ...p, latency_ms: 12 + prog * 120, cpu_percent: 12 + prog * 20 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.1) a.push({ pod_id: 'postgres-db', pod_name: 'postgres-db', metric: 'pvc_write_mbps', value: +(1.8 + prog * 8.5).toFixed(1), severity: cl(prog * 100), threshold: 4, message: 'Postgres PVC write I/O surge — storage saturation imminent', timestamp: Date.now() / 1000 });
      if (prog > 0.3) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 80).toFixed(0), severity: 'WARNING', threshold: 50, message: 'Auth service latency cascading from postgres-db slowdown', timestamp: Date.now() / 1000 });
      if (prog > 0.5) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'latency_ms', value: +(12 + prog * 120).toFixed(0), severity: cl(prog * 100), threshold: 80, message: 'Frontend response time degraded due to auth dependency chain', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-pvc_cascade', name: 'PVC Cascade: Postgres I/O Saturation', summary: 'Storage I/O surge in postgres-db cascaded through auth-service to frontend-service, causing widespread latency degradation.', severity: 'CRITICAL', root_cause_pod: 'postgres-db', root_metric: 'pvc_write_mbps', causal_chain: ['postgres-db', 'auth-service', 'frontend-service'], affected_pods: ['postgres-db', 'auth-service', 'frontend-service'], recommendations: ['Expand postgres PVC IOPS limits', 'Enable connection pooling on auth-service', 'Implement circuit breaker on frontend → auth calls'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('CPU') && prog > 0.2) return { ...a, status: 'WARNING', finding: 'Postgres CPU elevated due to I/O wait — check storage class IOPS limits.', confidence: 0.87 };
      if (a.agent.includes('PVC') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'postgres-db PVC write I/O at critical level. Storage saturation cascade detected.', confidence: 0.95 };
      if (a.agent.includes('Retry') && prog > 0.3) return { ...a, status: 'WARNING', finding: 'Elevated retry counts detected in auth-service → postgres-db connection pool.', confidence: 0.89 };
      if (a.agent.includes('SRE') && prog > 0.15) return { ...a, status: 'WARNING', finding: 'PVC cascade in progress. Monitoring dependency propagation across 3 services.', confidence: 0.91 };
      if (a.agent.includes('Stabilization') && prog > 0.2) return { ...a, status: 'WARNING', finding: 'Recommend immediate PVC IOPS expansion. Fallback: throttle auth read replicas.', confidence: 0.88, recommendation: 'Expand postgres PVC IOPS' };
      if (a.agent.includes('Dependency') && prog > 0.1) return { ...a, status: 'WARNING', finding: 'Causal chain confirmed: postgres-db → auth-service → frontend-service.', confidence: 0.93, reasoning: ['postgres-db (I/O saturated)', 'auth-service (connection queuing)', 'frontend-service (response timeout)'] };
      return a;
    }),
    predictions: (prog) => prog > 0.6 ? [{ pod_id: 'frontend-service', metric: 'latency_ms', current: 120, threshold: 200, ttf_minutes: 3, severity: 'CRITICAL', estimated_blast_radius: 2 }] : [],
  },
  memory_leak: {
    label: 'Redis Memory Leak', duration: 50, pods: ['redis-cache', 'auth-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'redis-cache') {
        const mem = 1024 + prog * 3500;
        const oom = mem > 4400;
        return { ...p, memory_mb: Math.min(mem, 4500), memory_limit_mb: 4500, memory_pct: Math.min(mem / 4500 * 100, 100), cpu_percent: 8 + prog * 25, latency_ms: 5 + prog * 40, status: oom ? 'OOMKilled' : 'Running', restarts: oom ? 1 : 0 };
      }
      if (p.pod_id === 'auth-service') return { ...p, latency_ms: 8 + prog * 60, cpu_percent: 18 + prog * 15, restarts: prog > 0.8 ? 2 : 0 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'redis-cache', pod_name: 'redis-cache', metric: 'memory_pct', value: +(prog * 100).toFixed(1), severity: cl(prog * 100), threshold: 85, message: 'Redis memory growing continuously — missing key TTLs detected', timestamp: Date.now() / 1000 });
      if (prog > 0.3) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 60).toFixed(0), severity: 'WARNING', threshold: 50, message: 'Auth service latency increasing due to Redis cache misses', timestamp: Date.now() / 1000 });
      if (prog > 0.8) a.push({ pod_id: 'redis-cache', pod_name: 'redis-cache', metric: 'memory_mb', value: 'OOMKilled', severity: 'CRITICAL', threshold: 4500, message: 'Redis OOMKilled — memory limit exceeded. Auth service degraded.', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-memory_leak', name: 'Redis Memory Leak: Cache Eviction Cascade', summary: 'Redis cache memory leak caused by unbounded key growth with no TTLs. Auth service degraded due to cache misses falling back to postgres.', severity: 'CRITICAL', root_cause_pod: 'redis-cache', root_metric: 'memory_pct', causal_chain: ['redis-cache', 'auth-service'], affected_pods: ['redis-cache', 'auth-service'], recommendations: ['Set maxmemory-policy=allkeys-lru on redis-cache', 'Audit application code for missing TTLs on cache writes', 'Add memory usage alert at 80% threshold'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('Memory') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'redis-cache memory growing at ~15MB/tick. OOMKill predicted within minutes.', confidence: 0.93, reasoning: ['Memory: 1024MB → ' + (1024 + prog * 3500).toFixed(0) + 'MB', 'Growth rate: accelerating', 'Risk: auth service will fall back to postgres-db'] };
      if (a.agent.includes('Retry') && prog > 0.3) return { ...a, status: 'WARNING', finding: 'Auth service retries increasing as Redis cache misses force postgres fallback.', confidence: 0.88 };
      if (a.agent.includes('SRE') && prog > 0.1) return { ...a, status: 'WARNING', finding: 'Redis memory leak cascade. Auth service degradation imminent.', confidence: 0.90 };
      if (a.agent.includes('Stabilization') && prog > 0.1) return { ...a, status: 'WARNING', finding: 'Immediate action: set maxmemory-policy on redis-cache before OOM.', recommendation: 'Set maxmemory-policy=allkeys-lru' };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'WARNING', finding: 'Impact chain: redis-cache (memory) → auth-service (latency) → frontend (indirect).', confidence: 0.91 };
      return a;
    }),
    predictions: (prog) => [
      { pod_id: 'redis-cache', metric: 'memory_pct', current: +(prog * 100).toFixed(1), threshold: 85, ttf_minutes: Math.max(1, Math.round((1 - prog) * 10)), severity: prog > 0.7 ? 'CRITICAL' : 'WARNING', estimated_blast_radius: 2 },
    ],
  },
  cpu_storm: {
    label: 'CPU Storm', duration: 30, pods: ['payment-service', 'frontend-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'payment-service') return { ...p, cpu_percent: 24 + prog * 65, latency_ms: 15 + prog * 75, status: prog > 0.95 ? 'CrashLoopBackOff' : 'Running', restarts: prog > 0.8 ? 3 : 0 };
      if (p.pod_id === 'frontend-service') return { ...p, latency_ms: 12 + prog * 110, cpu_percent: 12 + prog * 30 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'payment-service', pod_name: 'payment-service', metric: 'cpu_percent', value: +(24 + prog * 65).toFixed(0), severity: cl(prog * 100), threshold: 80, message: 'CPU storm in payment-service — possible infinite loop or DDoS', timestamp: Date.now() / 1000 });
      if (prog > 0.3) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'latency_ms', value: +(12 + prog * 110).toFixed(0), severity: cl(prog * 100), threshold: 100, message: 'Frontend payment checkout latency rising due to payment-service CPU contention', timestamp: Date.now() / 1000 });
      if (prog > 0.7) a.push({ pod_id: 'payment-service', pod_name: 'payment-service', metric: 'restarts', value: 3, severity: 'CRITICAL', threshold: 2, message: 'Payment service crashing — CPU OOM状态 triggered container restart', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-cpu_storm', name: 'CPU Storm: Payment Service Contention', summary: 'CPU saturation in payment-service caused by abnormally high request volume. Cascading latency to frontend checkout flow.', severity: 'CRITICAL', root_cause_pod: 'payment-service', root_metric: 'cpu_percent', causal_chain: ['payment-service', 'frontend-service'], affected_pods: ['payment-service', 'frontend-service'], recommendations: ['Scale payment-service horizontally (3→5 replicas)', 'Enable rate limiting on payment API gateway', 'Investigate recent deployment for regression'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('CPU') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'payment-service CPU at ' + (24 + prog * 65).toFixed(0) + '% — storm in progress. Recommend immediate scale-out.', confidence: 0.94 };
      if (a.agent.includes('Retry') && prog > 0.2) return { ...a, status: 'WARNING', finding: 'Frontend → payment retry storm detected. 40% of checkout requests timing out.', confidence: 0.90 };
      if (a.agent.includes('SRE') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'CPU storm cascade in progress. Payment service at risk of CrashLoopBackOff.', confidence: 0.92 };
      if (a.agent.includes('Stabilization') && prog > 0.15) return { ...a, status: 'WARNING', finding: 'Auto-scaling recommended for payment-service. Current: 3 pods → suggested: 8 pods.', recommendation: 'Scale payment-service to 8 replicas' };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'WARNING', finding: 'Causal propagation: payment-service CPU → frontend latency (checkout degraded).', confidence: 0.90 };
      return a;
    }),
    predictions: (prog) => prog > 0.5 ? [{ pod_id: 'payment-service', metric: 'cpu_percent', current: +(24 + prog * 65).toFixed(0), threshold: 95, ttf_minutes: Math.max(1, Math.round((1 - prog) * 5)), severity: 'CRITICAL', estimated_blast_radius: 1 }] : [],
  },
  network_partition: {
    label: 'Network Partition', duration: 25, pods: ['auth-service', 'frontend-service', 'payment-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'auth-service') return { ...p, status: prog > 0.7 ? 'CrashLoopBackOff' : 'Running', latency_ms: 8 + prog * 300, network_in_mbps: 1.2 + prog * 0.5, network_out_mbps: 0.9 + prog * 0.3, cpu_percent: 18 + prog * 40, restarts: prog > 0.5 ? Math.floor(prog * 3) : 0 };
      if (p.pod_id === 'frontend-service') return { ...p, latency_ms: 12 + prog * 250, cpu_percent: 12 + prog * 35 };
      if (p.pod_id === 'payment-service') return { ...p, latency_ms: 15 + prog * 100, cpu_percent: 24 + prog * 20 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 300).toFixed(0), severity: cl(prog * 100), threshold: 100, message: 'Auth service unreachable — network partition detected on node-01', timestamp: Date.now() / 1000 });
      if (prog > 0.2) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'latency_ms', value: +(12 + prog * 250).toFixed(0), severity: cl(prog * 100), threshold: 150, message: 'All frontend authentication requests timing out due to network partition', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-network_partition', name: 'Network Partition: Auth Service Isolation', summary: 'Network partition isolated auth-service on node-01. All authentication-dependent services (frontend, payment) degraded.', severity: 'CRITICAL', root_cause_pod: 'auth-service', root_metric: 'latency_ms', causal_chain: ['auth-service', 'frontend-service', 'payment-service'], affected_pods: ['auth-service', 'frontend-service', 'payment-service'], recommendations: ['Investigate node-01 network interface', 'Schedule auth-service pod to different node', 'Enable multi-AZ deployment for auth-service'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('Retry') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'Massive retry storm from frontend → auth. All connections timing out.', confidence: 0.96 };
      if (a.agent.includes('SRE') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'Network partition event. Auth service isolated. 3 services affected.', confidence: 0.94 };
      if (a.agent.includes('CPU') && prog > 0.2) return { ...a, status: 'WARNING', finding: 'Frontend CPU elevated due to connection retry storms against auth-service.', confidence: 0.85 };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'Auth service (SPOF) — all 5 services depend on auth for session validation.', confidence: 0.97, reasoning: ['auth-service: network partition', 'frontend-service: auth timeout cascade', 'payment-service: degraded checkout UX'] };
      return a;
    }),
    predictions: (prog) => [{ pod_id: 'auth-service', metric: 'latency_ms', current: +(8 + prog * 300).toFixed(0), threshold: 500, ttf_minutes: Math.max(1, Math.round((1 - prog) * 5)), severity: 'CRITICAL', estimated_blast_radius: 3 }],
  },
  node_failure: {
    label: 'Node Failure', duration: 20, pods: ['payment-service', 'redis-cache', 'frontend-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'payment-service') return { ...p, status: prog > 0.3 ? 'NodeLost' : 'Running', cpu_percent: 24 + (prog < 0.3 ? prog * 60 : 0), latency_ms: 15 + prog * 50, restarts: prog > 0.5 ? 4 : 0 };
      if (p.pod_id === 'redis-cache') return { ...p, status: prog > 0.3 ? 'NodeLost' : 'Running', latency_ms: 5 + prog * 30, cpu_percent: 8 + prog * 15, restarts: prog > 0.5 ? 2 : 0 };
      if (p.pod_id === 'frontend-service') return { ...p, latency_ms: 12 + prog * 180, cpu_percent: 12 + prog * 25 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.1) a.push({ pod_id: 'payment-service', pod_name: 'payment-service', metric: 'status', value: 'NodeLost', severity: 'CRITICAL', threshold: 0, message: 'node-02 went offline. payment-service and redis-cache are unreachable.', timestamp: Date.now() / 1000 });
      if (prog > 0.15) a.push({ pod_id: 'redis-cache', pod_name: 'redis-cache', metric: 'status', value: 'NodeLost', severity: 'CRITICAL', threshold: 0, message: 'Redis cache unavailable — all cached sessions lost', timestamp: Date.now() / 1000 });
      if (prog > 0.2) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'latency_ms', value: +(12 + prog * 180).toFixed(0), severity: cl(prog * 100), threshold: 100, message: 'Frontend degraded — payment + auth both impacted by node-02 failure', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-node_failure', name: 'Node-02 Failure: Multi-Service Outage', summary: 'node-02 hardware failure caused complete loss of payment-service and redis-cache. Cascading impact on frontend-service and auth-service.', severity: 'CRITICAL', root_cause_pod: 'payment-service', root_metric: 'status', causal_chain: ['node-02 (hardware)', 'payment-service', 'redis-cache', 'frontend-service'], affected_pods: ['payment-service', 'redis-cache', 'frontend-service'], recommendations: ['Cordon node-02 and drain workloads', 'Reschedule payment-service and redis-cache to healthy nodes', 'Enable pod anti-affinity across nodes'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('Memory') && prog > 0.2) return { ...a, status: 'WARNING', finding: 'Redis cache lost on node-02. Auth sessions must rehydrate from postgres-db.', confidence: 0.87 };
      if (a.agent.includes('SRE') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'Node failure event. 2 pods lost, 3 services impacted. Immediate remediation required.', confidence: 0.96 };
      if (a.agent.includes('Stabilization') && prog > 0.15) return { ...a, status: 'CRITICAL', finding: 'Node failure: recommend cordoning node-02 and rescheduling workloads to node-01/node-03.', recommendation: 'Cordon node-02 and reschedule pods' };
      if (a.agent.includes('Dependency') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'SPOF cluster: 2 pods on same node-02. Cascading blast radius across 3 services.', confidence: 0.95, reasoning: ['node-02: hardware failure', 'payment-service → lost (no HA)', 'redis-cache → lost (no replica)', 'frontend → degraded (no payment, slow auth)'] };
      return a;
    }),
    predictions: (prog) => [{ pod_id: 'frontend-service', metric: 'latency_ms', current: +(12 + prog * 180).toFixed(0), threshold: 300, ttf_minutes: Math.max(1, Math.round((1 - prog) * 3)), severity: 'CRITICAL', estimated_blast_radius: 2 }],
  },
  cert_expiry: {
    label: 'TLS Cert Expiry', duration: 25, pods: ['frontend-service', 'auth-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'frontend-service') return { ...p, status: prog > 0.6 ? 'CrashLoopBackOff' : 'Running', latency_ms: 12 + prog * 150, cpu_percent: 12 + prog * 30, restarts: prog > 0.4 ? Math.floor(prog * 2) : 0 };
      if (p.pod_id === 'auth-service') return { ...p, latency_ms: 8 + prog * 40, cpu_percent: 18 + prog * 10 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'status', value: 'TLS Handshake Failed', severity: cl(prog * 100), threshold: 0, message: 'TLS certificate expired for frontend-service. All HTTPS connections rejected.', timestamp: Date.now() / 1000 });
      if (prog > 0.3) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 40).toFixed(0), severity: 'WARNING', threshold: 30, message: 'Auth service detecting invalid certificate chain from frontend', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-cert_expiry', name: 'TLS Certificate Expiry: Frontend Outage', summary: 'Frontend TLS certificate expired causing all external HTTPS connections to fail. Auth service degraded handling renewal requests.', severity: 'CRITICAL', root_cause_pod: 'frontend-service', root_metric: 'status', causal_chain: ['frontend-service (TLS cert)', 'frontend-service (CrashLoopBackOff)', 'auth-service (degraded)'], affected_pods: ['frontend-service', 'auth-service'], recommendations: ['Renew frontend TLS certificate immediately', 'Set up automated cert-manager with Let\'s Encrypt', 'Add certificate expiry monitoring at 30-day warning'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('SRE') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'TLS certificate expired for frontend-service. All external traffic blocked.', confidence: 0.98 };
      if (a.agent.includes('Stabilization') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'Cert-manager renewal failed. Manual intervention required for TLS cert rotation.', recommendation: 'Renew TLS certificate on frontend ingress' };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'WARNING', finding: 'Single point of failure: expired TLS cert blocks all external → frontend → auth traffic.', confidence: 0.93 };
      return a;
    }),
    predictions: (prog) => [{ pod_id: 'frontend-service', metric: 'status', current: 0, threshold: 1, ttf_minutes: 0, severity: 'CRITICAL', estimated_blast_radius: 1 }],
  },
  config_drift: {
    label: 'Config Drift', duration: 30, pods: ['postgres-db', 'auth-service', 'payment-service'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'postgres-db') return { ...p, latency_ms: 10 + prog * 200, cpu_percent: 15 + prog * 45, pvc_write_mbps: 1.8 + prog * 3, status: prog > 0.85 ? 'CrashLoopBackOff' : 'Running' };
      if (p.pod_id === 'auth-service') return { ...p, latency_ms: 8 + prog * 90, cpu_percent: 18 + prog * 15, restarts: prog > 0.6 ? Math.floor(prog * 2) : 0 };
      if (p.pod_id === 'payment-service') return { ...p, latency_ms: 15 + prog * 50, cpu_percent: 24 + prog * 10 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'postgres-db', pod_name: 'postgres-db', metric: 'latency_ms', value: +(10 + prog * 200).toFixed(0), severity: cl(prog * 100), threshold: 50, message: 'Postgres config drift detected. max_connections reduced from 200 to 20.', timestamp: Date.now() / 1000 });
      if (prog > 0.2) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 90).toFixed(0), severity: 'WARNING', threshold: 50, message: 'Connection pool exhaustion in auth-service due to postgres config drift', timestamp: Date.now() / 1000 });
      if (prog > 0.4) a.push({ pod_id: 'payment-service', pod_name: 'payment-service', metric: 'latency_ms', value: +(15 + prog * 50).toFixed(0), severity: 'WARNING', threshold: 50, message: 'Payment transactions queuing — postgres connection pool saturated', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-config_drift', name: 'Config Drift: Postgres Connection Collapse', summary: 'Postgres configuration drifted from baseline — max_connections dropped from 200 to 20. Connection pool exhaustion cascading to all dependent services.', severity: 'CRITICAL', root_cause_pod: 'postgres-db', root_metric: 'latency_ms', causal_chain: ['postgres-db (config drift)', 'auth-service (pool exhausted)', 'payment-service (transactions queued)'], affected_pods: ['postgres-db', 'auth-service', 'payment-service'], recommendations: ['Restore postgres max_connections to 200', 'Implement ConfigMap versioning and drift detection', 'Add connection pool monitoring with PgBouncer'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('SRE') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'Postgres config drift detected. max_connections=20 (baseline: 200). 3 services impacted.', confidence: 0.97 };
      if (a.agent.includes('Stabilization') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'Config drift: restore postgres max_connections to 200. Deploy PgBouncer for pool management.', recommendation: 'Restore postgres config to baseline' };
      if (a.agent.includes('PVC') && prog > 0.05) return { ...a, status: 'WARNING', finding: 'Postgres I/O elevated due to connection churn from pool exhaustion.', confidence: 0.82 };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'Postgres config drift — 3 downstream services impacted. SPOF scenario.', confidence: 0.94, reasoning: ['postgres-db: max_connections=20 (was 200)', 'auth-service: connection pool saturated', 'payment-service: transaction queue growing'] };
      return a;
    }),
    predictions: (prog) => prog > 0.5 ? [{ pod_id: 'postgres-db', metric: 'latency_ms', current: +(10 + prog * 200).toFixed(0), threshold: 300, ttf_minutes: Math.max(1, Math.round((1 - prog) * 5)), severity: 'CRITICAL', estimated_blast_radius: 3 }] : [],
  },
  dns_failure: {
    label: 'DNS Resolution Failure', duration: 20, pods: ['auth-service', 'frontend-service', 'redis-cache'],
    modify: (p, prog, t) => {
      if (p.pod_id === 'auth-service') return { ...p, latency_ms: 8 + prog * 200, cpu_percent: 18 + prog * 30, status: prog > 0.8 ? 'CrashLoopBackOff' : 'Running', restarts: prog > 0.5 ? Math.floor(prog * 3) : 0 };
      if (p.pod_id === 'frontend-service') return { ...p, latency_ms: 12 + prog * 150, cpu_percent: 12 + prog * 25 };
      if (p.pod_id === 'redis-cache') return { ...p, latency_ms: 5 + prog * 20, cpu_percent: 8 + prog * 10 };
      return p;
    },
    anomalies: (prog, t, pods) => {
      const a: Anomaly[] = [];
      if (prog > 0.05) a.push({ pod_id: 'auth-service', pod_name: 'auth-service', metric: 'latency_ms', value: +(8 + prog * 200).toFixed(0), severity: cl(prog * 100), threshold: 100, message: 'DNS resolution failing for external identity provider — auth service cannot validate tokens', timestamp: Date.now() / 1000 });
      if (prog > 0.2) a.push({ pod_id: 'frontend-service', pod_name: 'frontend-service', metric: 'latency_ms', value: +(12 + prog * 150).toFixed(0), severity: 'WARNING', threshold: 80, message: 'Frontend login flow broken — auth dependency failing due to DNS issues', timestamp: Date.now() / 1000 });
      return a;
    },
    correlation: (prog, pods) => ({
      rule_id: 'CAUSAL-dns_failure', name: 'DNS Resolution Failure: Auth Chain Break', summary: 'CoreDNS resolution for external identity provider failed. Auth service cannot validate tokens, breaking all authenticated flows.', severity: 'CRITICAL', root_cause_pod: 'auth-service', root_metric: 'latency_ms', causal_chain: ['CoreDNS (resolution failure)', 'auth-service (token validation failed)', 'frontend-service (login broken)', 'redis-cache (session refresh paused)'], affected_pods: ['auth-service', 'frontend-service', 'redis-cache'], recommendations: ['Check CoreDNS pod status and logs', 'Verify upstream DNS resolver configuration', 'Add external DNS fallback resolver', ' Cache external DNS resolutions with longer TTL'],
    }),
    agents: (prog, prev) => prev.map(a => {
      if (a.agent.includes('Retry') && prog > 0.1) return { ...a, status: 'CRITICAL', finding: 'DNS retry storm — auth service making 50 DNS queries/sec. All failing.', confidence: 0.95 };
      if (a.agent.includes('SRE') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'CoreDNS failure. External identity provider unreachable. Auth service breaking.', confidence: 0.96 };
      if (a.agent.includes('Stabilization') && prog > 0.1) return { ...a, status: 'WARNING', finding: 'Deploy CoreDNS fallback. Add external DNS caching with nodelocal DNS cache.', recommendation: 'Configure CoreDNS fallback upstream' };
      if (a.agent.includes('Dependency') && prog > 0.05) return { ...a, status: 'CRITICAL', finding: 'DNS SPOF: CoreDNS failure cascading to auth, frontend, and redis session refresh.', confidence: 0.93, reasoning: ['CoreDNS: resolution failed for ext-idp.example.com', 'auth-service: cannot validate OIDC tokens', 'frontend-service: login flow broken'] };
      return a;
    }),
    predictions: (prog) => [{ pod_id: 'auth-service', metric: 'latency_ms', current: +(8 + prog * 200).toFixed(0), threshold: 300, ttf_minutes: Math.max(1, Math.round((1 - prog) * 4)), severity: 'CRITICAL', estimated_blast_radius: 3 }],
  },
};

export type ScenarioKey = keyof typeof SCENARIO_CONFIGS;
export const ALL_SCENARIOS = Object.entries(SCENARIO_CONFIGS).map(([k, v]) => ({ key: k, label: v.label }));

export function getEmptyAgents(tick: number): AgentInsight[] {
  const ts = Date.now() / 1000;
  return [
    { agent: 'CPU Contention Agent', icon: '🔥', domain: 'CPU · Real-time Analysis', status: 'INFO', finding: 'All CPU metrics within nominal ranges. No contention detected.', confidence: 0.89, reasoning: [], recommendation: 'Continue monitoring', detail: {}, timestamp: ts, trust_score: 0.92, governance: { avg_latency_ms: 12, health: 'HEALTHY', state: 'IDLE', cycle_count: Math.floor(tick / 5) } },
    { agent: 'Memory Leak Agent', icon: '💧', domain: 'Memory · Trend Analysis', status: 'INFO', finding: 'Memory usage patterns stable across all pods.', confidence: 0.92, reasoning: [], recommendation: 'No action needed', detail: {}, timestamp: ts, trust_score: 0.94, governance: { avg_latency_ms: 15, health: 'HEALTHY', state: 'IDLE', cycle_count: Math.floor(tick / 5) } },
    { agent: 'PVC Saturation Agent', icon: '💾', domain: 'Storage · I/O Analysis', status: 'INFO', finding: 'PVC I/O within normal thresholds.', confidence: 0.95, reasoning: [], recommendation: 'Monitor', detail: {}, timestamp: ts, trust_score: 0.93, governance: { avg_latency_ms: 8, health: 'HEALTHY', state: 'IDLE', cycle_count: Math.floor(tick / 5) } },
    { agent: 'Retry Storm Agent', icon: '🔄', domain: 'Network · Traffic Analysis', status: 'INFO', finding: 'No retry anomalies detected.', confidence: 0.87, reasoning: [], recommendation: 'Check logs', detail: {}, timestamp: ts, trust_score: 0.85, governance: { avg_latency_ms: 22, health: 'HEALTHY', state: 'MONITORING', cycle_count: Math.floor(tick / 5) } },
    { agent: 'Cluster SRE Supervisor Agent', icon: '🧠', domain: 'Cross-agent Synthesis', status: 'INFO', finding: 'All systems operational. Continuous monitoring active.', confidence: 0.91, reasoning: [], recommendation: 'Standby', detail: {}, timestamp: ts, trust_score: 0.96, governance: { avg_latency_ms: 5, health: 'HEALTHY', state: 'SUPERVISING', cycle_count: Math.floor(tick / 5) } },
    { agent: 'Stabilization Recommendation Agent', icon: '⚡', domain: 'Remediation', status: 'INFO', finding: 'No remediation actions required at this time.', confidence: 0.93, reasoning: [], recommendation: 'Standby', detail: {}, timestamp: ts, trust_score: 0.91, governance: { avg_latency_ms: 18, health: 'HEALTHY', state: 'STANDBY', cycle_count: Math.floor(tick / 5) } },
    { agent: 'Dependency Impact Analysis Agent', icon: '🌐', domain: 'Topology · Graph', status: 'INFO', finding: 'Service dependencies stable. All edges nominal.', confidence: 0.88, reasoning: [], recommendation: 'Monitor', detail: {}, timestamp: ts, trust_score: 0.90, governance: { avg_latency_ms: 10, health: 'HEALTHY', state: 'ANALYZING', cycle_count: Math.floor(tick / 5) } },
    { agent: 'LogIntelligenceAgent', icon: '📋', domain: 'Log · Linguistic Analysis', status: 'INFO', finding: 'Log patterns normal. No linguistic anomalies detected.', confidence: 0.86, reasoning: [], recommendation: 'Monitor logs', detail: {}, timestamp: ts, trust_score: 0.88, governance: { avg_latency_ms: 14, health: 'HEALTHY', state: 'PARSING', cycle_count: Math.floor(tick / 5) } },
  ];
}

function fallbackTick(prev: ClusterState, namespace: string, anomalyMode: string | null, scenarioStartTick: number): ClusterState {
  const tick = prev.tick + 1;
  const allPods = getBasePods(tick);
  const cfg = anomalyMode ? SCENARIO_CONFIGS[anomalyMode] : null;
  const prog = cfg && anomalyMode ? simProgress(tick, scenarioStartTick, cfg.duration) : 0;
  const active = prog > 0 && prog < 1;

  const modifiedPods = allPods.map(p => (cfg && active && cfg.pods.includes(p.pod_id)) ? cfg.modify(p, prog, tick) : p);
  const pods = namespace === 'all' ? modifiedPods : modifiedPods.filter(p => p.namespace === namespace);

  const anomalies: Anomaly[] = [];
  if (cfg && active) anomalies.push(...cfg.anomalies(prog, tick, modifiedPods));
  if (!anomalyMode && tick % 30 === 0 && tick > 0) {
    anomalies.push({
      pod_id: 'payment-service', pod_name: 'payment-service', metric: 'cpu_percent',
      value: 89, severity: 'WARNING', threshold: 80,
      message: 'Transient CPU spike detected in payment-service', timestamp: Date.now() / 1000,
    });
  }

  const critical_count = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warning_count = anomalies.filter(a => a.severity === 'WARNING').length;
  const anomaly_count = anomalies.length;
  const pod_count = pods.length;

  const score = Math.max(0, 100 - critical_count * 20 - warning_count * 5);
  const health = { score, status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'critical', pod_count, anomaly_count, critical_count, warning_count };

  const spark = [12, 18, 15, 22, 28, 25, 32, 38, 42, 35, 30, 28, 35, 45, 52, 48, 42, 38, 34, 40].map(v => v + Math.random() * 5);

  const nodes: GraphNode[] = pods.map(p => ({
    id: p.pod_id, label: p.pod_name, tier: 'live', node: p.node, status: p.status,
    severity: p.status === 'Running' ? (anomalies.find(a => a.pod_id === p.pod_id) ? 'warning' : 'normal') : 'critical',
    cpu: p.cpu_percent, memory_pct: Math.round((p.memory_mb / Math.max(p.memory_limit_mb, 1)) * 100), restarts: p.restarts,
  }));

  const edges: GraphEdge[] = [
    { source: 'frontend-service', target: 'auth-service', type: 'http', protocol: 'REST', weight: 0.9, hot: anomalies.some(a => a.pod_id === 'frontend-service') },
    { source: 'frontend-service', target: 'payment-service', type: 'http', protocol: 'REST', weight: 0.5, hot: anomalies.some(a => a.pod_id === 'payment-service') },
    { source: 'auth-service', target: 'redis-cache', type: 'tcp', protocol: 'Redis', weight: 0.8, hot: anomalies.some(a => a.pod_id === 'auth-service') },
    { source: 'auth-service', target: 'postgres-db', type: 'tcp', protocol: 'SQL', weight: 0.7, hot: false },
    { source: 'payment-service', target: 'postgres-db', type: 'tcp', protocol: 'SQL', weight: 0.85, hot: false },
    { source: 'payment-service', target: 'redis-cache', type: 'tcp', protocol: 'Redis', weight: 0.4, hot: false },
  ];

  const baselineAgents = getEmptyAgents(tick);
  let agents = baselineAgents;
  if (cfg && active) agents = cfg.agents(prog, baselineAgents);
  else if (anomalies.length > 0) {
    agents = baselineAgents.map(a => {
      if (a.agent.includes('CPU')) return { ...a, status: 'WARNING', finding: 'Transient CPU spike detected in payment-service. No causal chain confirmed.', confidence: 0.78 };
      if (a.agent.includes('Retry')) return { ...a, status: 'WARNING', finding: 'Minor retry activity detected. Investigating dependency paths.', confidence: 0.72 };
      return a;
    });
  }

  const correlations: Correlation[] = [];
  if (cfg && active && prog > 0.15) correlations.push(cfg.correlation(prog, modifiedPods));

  const predictions: any[] = [];
  if (cfg && active) predictions.push(...cfg.predictions(prog));

  return {
    ...prev, tick, health, pods, anomalies, agents, predictions,
    graph: { nodes, edges },
    sparkline: spark,
    correlations,
    anomaly_mode: anomalyMode && active ? anomalyMode : (anomalyMode && prog >= 1 ? null : anomalyMode),
    connected: false,
    connection: { backend: 'disconnected', websocket: 'disconnected', prometheus: 'simulated', kubernetes: 'simulated', fallback: true },
  };
}

/* ─── Hook ─── */
export function useCluster() {
  const [state, setState] = useState<ClusterState>(EMPTY);
  const [mode, setMode] = useState<ConnectionMode>('BOOTING');
  const [dataSource, setDataSource] = useState<'live' | 'simulated'>('simulated');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const { events, addEvent } = useEventLog();
  const [simScenario, setSimScenario] = useState<string | null>(null);

  /* ── Refs ── */
  const modeRef = useRef<ConnectionMode>('BOOTING');
  const namespaceRef = useRef('all');
  const mountedRef = useRef(true);
  const simStateRef = useRef<ClusterState>({ ...EMPTY, tick: 0 });
  const simScenarioRef = useRef<string | null>(null);
  const simScenarioStartTickRef = useRef(0);
  const liveStateRef = useRef<ClusterState>(EMPTY);
  const lastLiveUpdateRef = useRef(0);
  // const wsRef = useRef<WebSocket | null>(null); // FIX F-002: Moved to useWebSocket
  // const healthFailCountRef = useRef(0); // Moved to useHealthPoller

  // const connectingRef = useRef(false); // FIX F-002: Moved to useWebSocket
  const reconnectAttemptRef = useRef(0);

  // FIX F-002: Integrate useHealthPoller hook
  const { startHealthPoll, stopHealthPoll, runHealthCheck } = useHealthPoller({
    apiUrl: API_URL,
    bootFailThreshold: BOOT_FAIL_THRESHOLD,
    bootPollMs: BOOT_POLL_MS,
    simPollMs: SIM_POLL_MS,
    addEvent,
    mode,
    modeRef,
    setState,
    setMode,
    setDataSource,
    connectWS,
    mounted: mountedRef,
    simStateRef,
  });

  /* Timer refs */
  const simTimerRef = useRef<number | undefined>(undefined);
  // const healthTimerRef = useRef<number | undefined>(undefined); // Moved to useHealthPoller
  const hbTimerRef = useRef<number | undefined>(undefined);
  // const pingTimerRef = useRef<number | undefined>(undefined); // FIX F-002: Moved to useWebSocket
  // const wsConnectTimerRef = useRef<number | undefined>(undefined); // FIX F-002: Moved to useWebSocket
  // const reconnectTimerRef = useRef<number | undefined>(undefined); // FIX F-002: Moved to useWebSocket

  /* ── Simulation engine (always running in background) ── */
  const stopSim = useCallback(() => {
    if (simTimerRef.current !== undefined) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = undefined;
    }
  }, []);

  const startSim = useCallback(() => {
    if (simTimerRef.current !== undefined) return;
    simTimerRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      simStateRef.current = fallbackTick(
        simStateRef.current, namespaceRef.current,
        simScenarioRef.current, simScenarioStartTickRef.current
      );
      const m = modeRef.current;
      if (m !== 'LIVE') {
        setState((prev) => ({ ...simStateRef.current, connection: prev.connection }));
      }
      if (simStateRef.current.anomaly_mode !== simScenarioRef.current) {
        simScenarioRef.current = simStateRef.current.anomaly_mode;
        setSimScenario(simScenarioRef.current);
      }
    }, SIM_TICK_MS);
  }, []);

  /* ── WebSocket Callbacks ── */

  /* ── Health check (logic moved to useHealthPoller) ── */

  /* ── Heartbeat monitor ── */
  const startHeartbeatMonitor = useCallback(() => {
    if (hbTimerRef.current !== undefined) return;
    hbTimerRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      if (modeRef.current !== 'LIVE') return;
      const elapsed = Date.now() - lastLiveUpdateRef.current;
      if (elapsed > HEARTBEAT_STALE_MS) {
        addEvent('warning', 'Telemetry heartbeat timeout — WebSocket appears stale');
        const next = applyTransition('LIVE', 'HEARTBEAT_STALE');
        if (next) {
          modeRef.current = next;
          setMode(next);
          setDataSource('simulated');
          setState(prev => ({
            ...simStateRef.current,
            connection: { ...prev.connection, websocket: 'reconnecting' },
          }));
          wsRef.current?.close();
        }
      }
    }, HEARTBEAT_CHECK_MS);
  }, [addEvent, wsRef]);

  const stopHeartbeatMonitor = useCallback(() => {
    if (hbTimerRef.current !== undefined) {
      clearInterval(hbTimerRef.current);
      hbTimerRef.current = undefined;
    }
  }, []);

  /* ── Unified interval manager — adjusts polling based on mode ── */
  useEffect(() => {
    mountedRef.current = true;
    startSim();
    startHeartbeatMonitor();

    // Boot cycle: try every 5s until backend responds
    // healthFailCountRef.current = 0; // Managed by useHealthPoller
    startHealthPoll(BOOT_POLL_MS);

    return () => {
      mountedRef.current = false;
      stopSim();
      stopHealthPoll();
      stopHeartbeatMonitor();
      // FIX F-002: WebSocket cleanup moved to useWebSocket
      // clearInterval(pingTimerRef.current);
      // clearTimeout(wsConnectTimerRef.current);
      // clearTimeout(reconnectTimerRef.current);
      // if (wsRef.current) {
      //   wsRef.current.onopen = null;
      //   wsRef.current.onmessage = null;
      //   wsRef.current.onclose = null;
      //   wsRef.current.onerror = null;
      //   wsRef.current.close();
      //   wsRef.current = null;
      // }
    };
    }, [startSim, startHealthPoll, startHeartbeatMonitor, stopSim, stopHealthPoll, stopHeartbeatMonitor]);

  /* ── Actions ── */
  const triggerAnomaly = async (scenario: string) => {
    if (scenario === 'clear') {
      simScenarioRef.current = null;
      simScenarioStartTickRef.current = 0;
      simStateRef.current = { ...simStateRef.current, anomaly_mode: null };
      setSimScenario(null);
      addEvent('info', 'Scenario cleared — returning to nominal state');
      return { status: 'cleared' };
    }
    if (SCENARIO_CONFIGS[scenario]) {
      simScenarioRef.current = scenario;
      simScenarioStartTickRef.current = simStateRef.current.tick;
      setSimScenario(scenario);
      addEvent('warning', `Scenario triggered: ${SCENARIO_CONFIGS[scenario].label}`);
      return { status: 'triggered', scenario };
    }
    if (modeRef.current !== 'LIVE') return { status: 'simulated', message: 'Scenario not available' };
    try {
      const res = await fetch(`${API_URL}/api/simulate/anomaly`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      return res.json();
    } catch { return { status: 'error', message: 'Backend unavailable' }; }
  };

  function localNlpResponse(q: string): string {
    const st = simStateRef.current;
    const lq = q.toLowerCase();
    if (lq.includes('slow') || lq.includes('frontend') || lq.includes('why'))
      return `**Frontend slowdown analysis:** Current latency across services: ${st.pods.map((p: any) => `${p.pod_name} ${p.latency_ms?.toFixed(0) || '?'}ms`).join(', ')}. ${st.correlations.length > 0 ? `AI has identified a causal chain: ${st.correlations[0].causal_chain?.join(' → ')}.` : 'No confirmed causal chain yet.'}`;
    if (lq.includes('cpu') || lq.includes('memory') || lq.includes('resource'))
      return `**Resource analysis:** ${st.pods.map((p: any) => `${p.pod_name}: CPU ${p.cpu_percent?.toFixed(0) || '?'}%, MEM ${((p.memory_mb / Math.max(p.memory_limit_mb, 1)) * 100).toFixed(0) || '?'}%`).join(' | ')}. Health score: ${st.health.score}/100.`;
    if (lq.includes('root') || lq.includes('cause') || lq.includes('why'))
      return st.correlations.length > 0
        ? `**Root cause identified:** ${st.correlations[0].name}. Origin: ${st.correlations[0].root_cause_pod}. Chain: ${st.correlations[0].causal_chain?.join(' → ')}. ${st.correlations[0].summary}`
        : `**No root cause identified.** Cluster operating normally. ${st.anomalies.length > 0 ? `${st.anomalies.length} anomalies detected but no causal chain confirmed yet.` : ''}`;
    if (lq.includes('health') || lq.includes('status') || lq.includes('overview'))
      return `**Cluster health:** Score ${st.health.score}/100 (${st.health.status}). ${st.health.pod_count} pods, ${st.health.anomaly_count} anomalies, ${st.correlations.length} active incidents. ${st.predictions?.length || 0} predictions active.`;
    if (lq.includes('fix') || lq.includes('recommend') || lq.includes('solution'))
      return st.correlations.length > 0
        ? `**Recommendations:** ${st.correlations.map((c: any) => (c.recommendations || []).join(', ')).join(' | ')}`
        : '**No active issues require remediation.** All systems nominal. Consider enabling proactive HPA and resource limits.';
    if (lq.includes('scenario') || lq.includes('simulate') || lq.includes('demo'))
      return `**Demo scenarios available:** PVC Cascade, Memory Leak, CPU Storm, Network Partition, Node Failure, Cert Expiry, Config Drift, DNS Failure. Click any scenario button in the header to trigger a realistic infrastructure failure with full AI-driven causal analysis.`;
    if (lq.includes('agent') || lq.includes('ai'))
      return `**Active AI agents:** ${st.agents.map((a: any) => `${a.icon} ${a.agent} (${a.status})`).join(' | ')}. Avg confidence: ${st.agents.length > 0 ? (st.agents.reduce((s: number, a: any) => s + a.confidence, 0) / st.agents.length * 100).toFixed(0) : '?'}%.`;
    return `I analyzed your query against current cluster state. Cluster health is **${st.health.score}/100** with **${st.health.anomaly_count} anomalies** and **${st.correlations.length} confirmed incidents**. Try asking about: resources, root cause, health, recommendations, agents, or available scenarios.`;
  }

  const nlpQuery = async (question: string) => {
    if (modeRef.current !== 'LIVE') {
      return { answer: localNlpResponse(question), question, timestamp: Date.now() / 1000, sources: ['simulation-engine'], severity: 'INFO', confidence: 0.75 };
    }
    try {
      const r = await fetch(`${API_URL}/api/nlp/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, namespace: namespaceRef.current }),
      });
      return r.json();
    } catch {
      return { answer: `Backend unavailable. Running in simulation mode. Cannot process: "${question}"` };
    }
  };

  const executeRemediation = async (action: string, target: string, namespace: string, replicas?: number) => {
    if (modeRef.current !== 'LIVE') {
      return { status: 'simulated', message: `[SIMULATION] Would execute: ${action} on ${target} in ${namespace}` };
    }
    const r = await fetch(`${API_URL}/api/remediate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target, namespace, replicas }),
    });
    return r.json();
  };

  const setStabilizationMode = async (modeStr: string) => {
    if (modeRef.current !== 'LIVE') return;
    await fetch(`${API_URL}/api/stabilization/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: modeStr }),
    });
  };

  const setNamespace = useCallback((namespace: string) => {
    setSelectedNamespace(namespace);
    namespaceRef.current = namespace;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsLog(`Setting namespace to ${namespace}`);
      wsRef.current.send(JSON.stringify({ type: 'set_namespace', namespace }));
    }
  }, [wsRef]);

  const getIncidentLog = async () => {
    if (modeRef.current !== 'LIVE') {
      return { log: [], count: 0, in_memory_count: 0 };
    }
    const r = await fetch(`${API_URL}/api/incident-log?namespace=${namespaceRef.current}`);
    return r.json();
  };

  const simProgressValue = simScenarioRef.current && simScenarioStartTickRef.current > 0
    ? simProgress(simStateRef.current.tick, simScenarioStartTickRef.current,
        SCENARIO_CONFIGS[simScenarioRef.current]?.duration || 30)
    : 0;

  return {
    state, mode, dataSource, events, selectedNamespace,
    triggerAnomaly, nlpQuery, executeRemediation, setStabilizationMode, getIncidentLog,
    setNamespace,
    simScenario: simScenarioRef.current,
    simProgress: simProgressValue,
  };
}
