import { useState, useEffect, useRef, useCallback } from 'react';
import { applyTransition } from './useConnectionState';
import { useEventLog } from './useEventLog';

/* ─── Types ─── */
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
}

export interface AgentInsight {
  agent: string; icon: string; domain: string; status: string;
  finding: string; confidence: number; reasoning: string[]; recommendation: string;
  detail: Record<string,any>; timestamp: number; buffer_action?: string;
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

/* ─── Constants ─── */
const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + `//${window.location.host}/ws/metrics`;
const BOOT_FAIL_THRESHOLD = 3;
const BOOT_POLL_MS = 5000;
const SIM_POLL_MS = 10000;
const HEARTBEAT_STALE_MS = 10000;
const HEARTBEAT_CHECK_MS = 2000;
const SIM_TICK_MS = 2000;

const EMPTY: ClusterState = {
  health: { score: 100, status: 'loading', anomaly_count: 0, critical_count: 0, warning_count: 0, pod_count: 0 },
  pods: [], anomalies: [], graph: { nodes: [], edges: [] }, correlations: [], agents: [],
  anomaly_mode: null, tick: 0, connected: false,
  connection: {
    backend: 'disconnected', websocket: 'disconnected',
    prometheus: 'disconnected', kubernetes: 'disconnected', fallback: false,
  },
};

/* ─── Browser-side fallback simulator ─── */
function fallbackTick(prev: ClusterState): ClusterState {
  const tick = prev.tick + 1;
  const pods: PodMetric[] = [
    { pod_id: 'frontend-service', pod_name: 'frontend-service', namespace: 'production', node: 'node-01', image: 'nginx:1.25', status: 'Running', cpu_percent: 12 + Math.sin(tick * 0.1) * 3 + (Math.random() - 0.5) * 3, memory_mb: 256 + Math.sin(tick * 0.05) * 20 + (Math.random() - 0.5) * 10, memory_limit_mb: 896, memory_pct: 28.6, network_in_mbps: 2.1, network_out_mbps: 1.8, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 12 + Math.sin(tick * 0.1) * 2, restarts: 0, replicas: 2, timestamp: Date.now() / 1000 },
    { pod_id: 'auth-service', pod_name: 'auth-service', namespace: 'production', node: 'node-01', image: 'auth-svc:2.1.0', status: 'Running', cpu_percent: 18 + Math.sin(tick * 0.08 + 1) * 4 + (Math.random() - 0.5) * 2, memory_mb: 512 + Math.sin(tick * 0.04 + 2) * 30 + (Math.random() - 0.5) * 15, memory_limit_mb: 1792, memory_pct: 28.6, network_in_mbps: 1.2, network_out_mbps: 0.9, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 8 + Math.sin(tick * 0.09 + 1) * 2, restarts: 0, replicas: 2, timestamp: Date.now() / 1000 },
    { pod_id: 'payment-service', pod_name: 'payment-service', namespace: 'production', node: 'node-02', image: 'payment-svc:1.4.2', status: 'Running', cpu_percent: 24 + Math.sin(tick * 0.12 + 3) * 5 + (Math.random() - 0.5) * 4, memory_mb: 768 + Math.sin(tick * 0.06 + 4) * 40 + (Math.random() - 0.5) * 20, memory_limit_mb: 2688, memory_pct: 28.6, network_in_mbps: 0.8, network_out_mbps: 0.6, pvc_read_mbps: 0, pvc_write_mbps: 0, latency_ms: 15 + Math.sin(tick * 0.11 + 3) * 3, restarts: 0, replicas: 3, timestamp: Date.now() / 1000 },
    { pod_id: 'redis-cache', pod_name: 'redis-cache', namespace: 'production', node: 'node-02', image: 'redis:7.2', status: 'Running', cpu_percent: 8 + Math.sin(tick * 0.07 + 5) * 2 + (Math.random() - 0.5) * 1.5, memory_mb: 1024 + Math.sin(tick * 0.03 + 6) * 50 + (Math.random() - 0.5) * 25, memory_limit_mb: 3584, memory_pct: 28.6, network_in_mbps: 3.5, network_out_mbps: 3.2, pvc_read_mbps: 0.5, pvc_write_mbps: 0.3, latency_ms: 5 + Math.sin(tick * 0.06 + 5) * 1, restarts: 0, replicas: 1, timestamp: Date.now() / 1000 },
    { pod_id: 'postgres-db', pod_name: 'postgres-db', namespace: 'production', node: 'node-03', image: 'postgres:15.3', status: 'Running', cpu_percent: 15 + Math.sin(tick * 0.05 + 7) * 3 + (Math.random() - 0.5) * 2, memory_mb: 2048 + Math.sin(tick * 0.02 + 8) * 60 + (Math.random() - 0.5) * 30, memory_limit_mb: 7168, memory_pct: 28.6, network_in_mbps: 0.4, network_out_mbps: 0.6, pvc_read_mbps: 2.1, pvc_write_mbps: 1.8, latency_ms: 10 + Math.sin(tick * 0.04 + 7) * 2, restarts: 0, replicas: 1, timestamp: Date.now() / 1000 },
  ];

  const anomalies: Anomaly[] = [];
  if (tick % 30 === 0 && tick > 0) {
    anomalies.push({
      pod_id: 'payment-service', pod_name: 'payment-service', metric: 'cpu_percent',
      value: 89, severity: 'WARNING', threshold: 80,
      message: 'CPU spike detected in payment-service', timestamp: Date.now() / 1000,
    });
  }

  const critical_count = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warning_count = anomalies.filter(a => a.severity === 'WARNING').length;
  const anomaly_count = anomalies.length;
  const pod_count = pods.length;

  const score = Math.max(0, 100 - critical_count * 15 - warning_count * 5);
  const health = { score, status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'critical', pod_count, anomaly_count, critical_count, warning_count };

  const spark = [12, 18, 15, 22, 28, 25, 32, 38, 42, 35, 30, 28, 35, 45, 52, 48, 42, 38, 34, 40].map(v => v + Math.random() * 5);

  const nodes: GraphNode[] = pods.map(p => ({
    id: p.pod_id, label: p.pod_name, tier: 'live', node: p.node, status: p.status,
    severity: anomalies.find(a => a.pod_id === p.pod_id) ? 'warning' : 'normal',
    cpu: p.cpu_percent, memory_pct: Math.round((p.memory_mb / p.memory_limit_mb) * 100), restarts: p.restarts,
  }));

  const edges: GraphEdge[] = [
    { source: 'frontend-service', target: 'auth-service', type: 'http', protocol: 'REST', weight: 0.9, hot: false },
    { source: 'frontend-service', target: 'payment-service', type: 'http', protocol: 'REST', weight: 0.5, hot: anomalies.length > 0 },
    { source: 'auth-service', target: 'redis-cache', type: 'tcp', protocol: 'Redis', weight: 0.8, hot: false },
    { source: 'auth-service', target: 'postgres-db', type: 'tcp', protocol: 'SQL', weight: 0.7, hot: false },
    { source: 'payment-service', target: 'postgres-db', type: 'tcp', protocol: 'SQL', weight: 0.85, hot: false },
    { source: 'payment-service', target: 'redis-cache', type: 'tcp', protocol: 'Redis', weight: 0.4, hot: false },
  ];

  const agents: AgentInsight[] = [
    { agent: 'CPU Contention Agent', icon: '🔥', domain: 'CPU · Real-time Analysis', status: anomalies.length > 0 ? 'WARNING' : 'INFO', finding: 'All CPU metrics within nominal ranges. No contention detected.', confidence: 0.89, reasoning: [], recommendation: 'Continue monitoring', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'Memory Leak Agent', icon: '💧', domain: 'Memory · Trend Analysis', status: 'INFO', finding: 'Memory usage patterns stable across all pods.', confidence: 0.92, reasoning: [], recommendation: 'No action needed', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'PVC Saturation Agent', icon: '💾', domain: 'Storage · I/O Analysis', status: 'INFO', finding: 'PVC I/O within normal thresholds.', confidence: 0.95, reasoning: [], recommendation: 'Monitor', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'Retry Storm Agent', icon: '🔄', domain: 'Network · Traffic Analysis', status: anomalies.length > 0 ? 'WARNING' : 'INFO', finding: anomalies.length > 0 ? 'Elevated retry count detected in payment-service.' : 'No retry anomalies detected.', confidence: 0.87, reasoning: [], recommendation: 'Check logs', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'Cluster SRE Supervisor Agent', icon: '🧠', domain: 'Cross-agent Synthesis', status: 'INFO', finding: 'All systems operational. Continuous monitoring active.', confidence: 0.91, reasoning: [], recommendation: 'Standby', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'Stabilization Recommendation Agent', icon: '⚡', domain: 'Remediation', status: 'INFO', finding: 'No remediation actions required at this time.', confidence: 0.93, reasoning: [], recommendation: 'Standby', detail: {}, timestamp: Date.now() / 1000 },
    { agent: 'Dependency Impact Analysis Agent', icon: '🌐', domain: 'Topology · Graph', status: 'INFO', finding: 'Service dependencies stable. All edges nominal.', confidence: 0.88, reasoning: [], recommendation: 'Monitor', detail: {}, timestamp: Date.now() / 1000 },
  ];

  return {
    ...prev, tick, health, pods, anomalies, agents,
    graph: { nodes, edges },
    sparkline: spark,
    correlations: [],
    connected: false,
    connection: { backend: 'disconnected', websocket: 'disconnected', prometheus: 'simulated', kubernetes: 'simulated', fallback: true },
  };
}

/* ─── Hook ─── */
export function useCluster() {
  const [state, setState] = useState<ClusterState>(EMPTY);
  const [mode, setMode] = useState<ConnectionMode>('BOOTING');
  const [dataSource, setDataSource] = useState<'live' | 'simulated'>('simulated');
  const { events, addEvent } = useEventLog();

  /* ── Refs ── */
  const modeRef = useRef<ConnectionMode>('BOOTING');
  const mountedRef = useRef(true);
  const simStateRef = useRef<ClusterState>({ ...EMPTY, tick: 0 });
  const liveStateRef = useRef<ClusterState>(EMPTY);
  const lastLiveUpdateRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const healthFailCountRef = useRef(0);

  /* Timer refs */
  const simTimerRef = useRef<number | undefined>(undefined);
  const healthTimerRef = useRef<number | undefined>(undefined);
  const hbTimerRef = useRef<number | undefined>(undefined);
  const pingTimerRef = useRef<number | undefined>(undefined);
  const wsConnectTimerRef = useRef<number | undefined>(undefined);

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
      simStateRef.current = fallbackTick(simStateRef.current);
      const m = modeRef.current;
      if (m !== 'LIVE') {
        setState((prev) => ({ ...simStateRef.current, connection: prev.connection }));
      }
    }, SIM_TICK_MS);
  }, []);

  /* ── WebSocket connect ── */
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    const to = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) ws.close();
    }, 5000);

    ws.onopen = () => {
      clearTimeout(to);
      lastLiveUpdateRef.current = Date.now();
      const m = modeRef.current;
      if (m === 'CONNECTING' || m === 'RECONNECTING') {
        const next = applyTransition(m, 'WS_OPEN');
        if (next) {
          modeRef.current = next;
          setMode(next);
        }
      }
      if (modeRef.current === 'LIVE') {
        setDataSource('live');
        addEvent('success', 'WebSocket connected — live telemetry active');
      }
      pingTimerRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send('{"type":"ping"}'); } catch { /* ignore */ }
        }
      }, 15000);
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'pong') return;
        lastLiveUpdateRef.current = Date.now();
        const merged: ClusterState = {
          ...d, connected: true,
          connection: {
            backend: 'connected', websocket: 'connected',
            prometheus: 'connected', kubernetes: 'connected',
            fallback: false,
          },
        };
        liveStateRef.current = merged;
        if (modeRef.current === 'LIVE') {
          setState(merged);
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      clearTimeout(to);
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = undefined;
      const m = modeRef.current;
      const next = applyTransition(m, 'WS_CLOSED');
      if (next) {
        modeRef.current = next;
        setMode(next);
      }
      if (next === 'DEGRADED') {
        addEvent('warning', 'WebSocket disconnected — attempting reconnect');
        setDataSource('simulated');
      } else if (next === 'SIMULATION') {
        addEvent('warning', 'Backend unreachable — simulation mode activated');
        setDataSource('simulated');
      }
      // Schedule reconnect
      clearTimeout(wsConnectTimerRef.current);
      wsConnectTimerRef.current = undefined;
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [addEvent]);

  /* ── Health check ── */
  const runHealthCheck = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      healthFailCountRef.current = 0;

      const m = modeRef.current;
      if (m === 'BOOTING') {
        addEvent('info', 'Backend detected — establishing WebSocket link');
        const next = applyTransition(m, 'HEALTH_OK');
        if (next) {
          modeRef.current = next;
          setMode(next);
          setState(prev => ({
            ...prev,
            connection: { ...prev.connection, backend: 'connected' },
          }));
        }
        connectWS();
      } else if (m === 'SIMULATION') {
        addEvent('info', 'Backend restored — reconnecting telemetry');
        const next = applyTransition(m, 'RECOVERY_OK');
        if (next) {
          modeRef.current = next;
          setMode(next);
        }
        connectWS();
      } else if (m === 'DEGRADED') {
        connectWS();
      }
      // Update connection status from health response
      setState(prev => ({
        ...prev,
        connection: {
          ...prev.connection,
          backend: 'connected',
          prometheus: data.drivers?.prometheus?.connected ? 'connected' : 'simulated',
          kubernetes: data.drivers?.kubernetes?.connected ? 'connected' : 'simulated',
        },
      }));
    } catch {
      healthFailCountRef.current += 1;
      const m = modeRef.current;
      const fails = healthFailCountRef.current;

      if (m === 'BOOTING' && fails >= BOOT_FAIL_THRESHOLD) {
        const next = applyTransition(m, 'FORCE_SIM');
        if (next) {
          addEvent('info', 'Starting simulation mode with fallback telemetry');
          modeRef.current = next;
          setMode(next);
          setDataSource('simulated');
          setState(prev => ({
            ...simStateRef.current,
            connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
          }));
        }
      } else if ((m === 'DEGRADED' || m === 'RECONNECTING') && fails >= 1) {
        const next = applyTransition(m, 'HEALTH_FAIL');
        if (next) {
          addEvent('warning', 'Backend unreachable — running simulated telemetry');
          modeRef.current = next;
          setMode(next);
          setDataSource('simulated');
          setState(prev => ({
            ...simStateRef.current,
            connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
          }));
        }
      } else if (m === 'BOOTING') {
        setState(prev => ({
          ...prev,
          connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
        }));
      }
    }
  }, [connectWS, addEvent]);

  /* ── Health poll lifecycle ── */
  const startHealthPoll = useCallback((intervalMs: number) => {
    if (healthTimerRef.current !== undefined) clearInterval(healthTimerRef.current);
    healthTimerRef.current = window.setInterval(() => runHealthCheck(), intervalMs);
    runHealthCheck();
  }, [runHealthCheck]);

  const stopHealthPoll = useCallback(() => {
    if (healthTimerRef.current !== undefined) {
      clearInterval(healthTimerRef.current);
      healthTimerRef.current = undefined;
    }
  }, []);

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
  }, [addEvent]);

  const stopHeartbeatMonitor = useCallback(() => {
    if (hbTimerRef.current !== undefined) {
      clearInterval(hbTimerRef.current);
      hbTimerRef.current = undefined;
    }
  }, []);

  /* ── Unified interval manager — adjusts polling based on mode ── */
  useEffect(() => {
    startSim();
    startHeartbeatMonitor();

    // Boot cycle: try every 5s until backend responds
    healthFailCountRef.current = 0;
    startHealthPoll(BOOT_POLL_MS);

    return () => {
      mountedRef.current = false;
      stopSim();
      stopHealthPoll();
      stopHeartbeatMonitor();
      clearTimeout(wsConnectTimerRef.current);
      clearInterval(pingTimerRef.current);
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Adjust health poll interval when mode changes ── */
  const prevModeRef = useRef<ConnectionMode>('BOOTING');
  useEffect(() => {
    if (mode === prevModeRef.current) return;
    prevModeRef.current = mode;

    if (mode === 'SIMULATION' || mode === 'RECONNECTING') {
      // Slow polling during simulation
      stopHealthPoll();
      startHealthPoll(SIM_POLL_MS);
    } else if (mode === 'DEGRADED') {
      // Faster polling in degraded to detect recovery quickly
      stopHealthPoll();
      startHealthPoll(BOOT_POLL_MS);
    } else if (mode === 'LIVE') {
      stopHealthPoll();
      startHealthPoll(SIM_POLL_MS);
    }
  }, [mode, stopHealthPoll, startHealthPoll]);

  /* ── Actions ── */
  const triggerAnomaly = async (scenario: string) => {
    if (modeRef.current !== 'LIVE') return;
    await fetch(`${API_URL}/api/simulate/anomaly`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
  };

  const nlpQuery = async (question: string) => {
    if (modeRef.current !== 'LIVE') {
      return { answer: `[Simulation Mode] KubeMind AI is operating in fallback mode. The backend service is currently unavailable. Question received: "${question}"` };
    }
    try {
      const r = await fetch(`${API_URL}/api/nlp/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      return r.json();
    } catch {
      return { answer: `Backend unavailable. Running in simulation mode. Cannot process: "${question}"` };
    }
  };

  const executeRemediation = async (action: string, target: string, replicas?: number) => {
    if (modeRef.current !== 'LIVE') {
      return { status: 'simulated', message: `[SIMULATION] Would execute: ${action} on ${target}` };
    }
    const r = await fetch(`${API_URL}/api/remediate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target, replicas }),
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

  const getIncidentLog = async () => {
    if (modeRef.current !== 'LIVE') {
      return { log: [], count: 0, in_memory_count: 0 };
    }
    const r = await fetch(`${API_URL}/api/incident-log`);
    return r.json();
  };

  return {
    state, mode, dataSource, events,
    triggerAnomaly, nlpQuery, executeRemediation, setStabilizationMode, getIncidentLog,
  };
}
