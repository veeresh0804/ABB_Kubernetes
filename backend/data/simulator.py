"""
KubeMind AI - Digital Twin & Simulation Layer (Phase 7)

This module evolves the legacy simulator into a sophisticated Digital Twin.
It can replay historical failures, forecast future metric states, and
simulate the potential impact of stabilization plans in a sandbox environment.
"""
import time
import math
import asyncio
import random
import os
import logging
from typing import Dict, List, Any, Optional
from collections import deque

logger = logging.getLogger("DigitalTwin")
FORCE_SIMULATION_MODE = os.getenv("FORCE_SIMULATION_MODE", "false").lower() == "true"

from .k8s_driver import kube_driver
from .prometheus_driver import prometheus_driver

# ─── Pod Definitions (The 'Blueprint' for the twin) ──────────────────────────
PODS = [
    {
        "id": "frontend-service", "name": "frontend-service", "namespace": "production", "image": "nginx:1.25", "node": "node-01",
        "labels": {"app": "frontend", "tier": "web"}, "status": "Running", "base_cpu": 12.0, "base_memory": 256.0,
        "base_network_in": 2.1, "base_network_out": 1.8, "base_pvc_read": 0.0, "base_pvc_write": 0.0,
        "replicas": 2, "restarts": 0,
    },
    {
        "id": "auth-service", "name": "auth-service", "namespace": "production", "image": "auth-svc:2.1.0", "node": "node-01",
        "labels": {"app": "auth", "tier": "middleware"}, "status": "Running", "base_cpu": 18.0, "base_memory": 512.0,
        "base_network_in": 1.2, "base_network_out": 0.9, "base_pvc_read": 0.0, "base_pvc_write": 0.0,
        "replicas": 2, "restarts": 0,
    },
    {
        "id": "payment-service", "name": "payment-service", "namespace": "production", "image": "payment-svc:1.4.2", "node": "node-02",
        "labels": {"app": "payment", "tier": "middleware"}, "status": "Running", "base_cpu": 24.0, "base_memory": 768.0,
        "base_network_in": 0.8, "base_network_out": 0.6, "base_pvc_read": 0.0, "base_pvc_write": 0.0,
        "replicas": 3, "restarts": 0,
    },
    {
        "id": "redis-cache", "name": "redis-cache", "namespace": "production", "image": "redis:7.2", "node": "node-02",
        "labels": {"app": "redis", "tier": "cache"}, "status": "Running", "base_cpu": 8.0, "base_memory": 1024.0,
        "base_network_in": 3.5, "base_network_out": 3.2, "base_pvc_read": 0.5, "base_pvc_write": 0.3,
        "replicas": 1, "restarts": 0,
    },
    {
        "id": "postgres-db", "name": "postgres-db", "namespace": "production", "image": "postgres:15.3", "node": "node-03",
        "labels": {"app": "postgres", "tier": "database"}, "status": "Running", "base_cpu": 15.0, "base_memory": 2048.0,
        "base_network_in": 0.4, "base_network_out": 0.6, "base_pvc_read": 2.1, "base_pvc_write": 1.8,
        "replicas": 1, "restarts": 0,
    },
    {
        "id": "analytics-job", "name": "analytics-job", "namespace": "batch",
        "image": "analytics:3.1.0", "node": "node-03",
        "labels": {"app": "analytics", "tier": "batch"}, "status": "Running",
        "base_cpu": 45.0, "base_memory": 1024.0,
        "base_network_in": 0.5, "base_network_out": 0.2, "base_pvc_read": 3.5, "base_pvc_write": 4.2,
        "replicas": 1, "restarts": 0,
    },
    {
        "id": "log-aggregator", "name": "log-aggregator", "namespace": "monitoring",
        "image": "fluentd:1.16", "node": "node-01",
        "labels": {"app": "fluentd", "tier": "logging"}, "status": "Running",
        "base_cpu": 8.0, "base_memory": 384.0,
        "base_network_in": 2.8, "base_network_out": 2.1, "base_pvc_read": 0.2, "base_pvc_write": 1.1,
        "replicas": 1, "restarts": 0,
    },
]

DEPENDENCY_EDGES = [
    {"source": "frontend-service", "target": "auth-service",   "type": "http",  "protocol": "REST", "weight": 0.9},
    {"source": "frontend-service", "target": "payment-service","type": "http",  "protocol": "REST", "weight": 0.5},
    {"source": "auth-service",     "target": "redis-cache",    "type": "tcp",   "protocol": "Redis","weight": 0.8},
    {"source": "auth-service",     "target": "postgres-db",    "type": "tcp",   "protocol": "SQL",  "weight": 0.7},
    {"source": "payment-service",  "target": "postgres-db",    "type": "tcp",   "protocol": "SQL",  "weight": 0.85},
    {"source": "payment-service",  "target": "redis-cache",    "type": "tcp",   "protocol": "Redis","weight": 0.4},
]

class ClusterSimulator:
    def __init__(self):
        self.tick = 0
        self.anomaly_mode = None
        self.anomaly_started_at = None
        self.history: Dict[str, deque] = { pod["id"]: deque(maxlen=120) for pod in PODS }
        self.restarts = {pod["id"]: pod["restarts"] for pod in PODS}
        self.remediation_effects = {} # pod_id -> effect_data

    def noise(self, scale=1.0) -> float: return random.gauss(0, scale)
    def sine_wave(self, period=60, amplitude=1.0, phase=0.0) -> float:
        return amplitude * math.sin(2 * math.pi * self.tick / period + phase)

    def trigger_anomaly(self, scenario: str):
        self.anomaly_mode = scenario
        self.anomaly_started_at = self.tick
        self.remediation_effects = {} # Reset effects on new anomaly

    def clear_anomaly(self):
        self.anomaly_mode = None
        self.anomaly_started_at = None

    def apply_remediation(self, pod_id: str, action: str):
        """Simulates the impact of a stabilization action on the twin."""
        self.remediation_effects[pod_id] = {
            "action": action,
            "applied_at": self.tick,
            "recovery_rate": 0.1 # Amount of anomaly reduced per tick
        }

    def evaluate_strategy(self, action: str, target: str) -> Dict[str, Any]:
        """
        Phase 11: Counterfactual Reasoning.
        Simulates the outcome of an action without actually applying it.
        """
        # Logic to estimate recovery based on current anomaly state
        progress = self.anomaly_progress()
        
        # Base probabilities
        probs = {
            "restart_pod": 0.85 if progress < 0.9 else 0.4,
            "scale_deployment": 0.75,
            "throttle_traffic": 0.90 if self.anomaly_mode == "cpu_storm" else 0.3,
        }
        
        prob = probs.get(action, 0.5)
        # Apply variance based on target criticality
        if target == "postgres-db": prob *= 0.9 # Harder to recover
        
        risk = 0.1
        if action == "restart_pod" and target == "postgres-db": risk = 0.6 # High risk
        
        return {
            "predicted_recovery_prob": round(prob, 2),
            "estimated_risk_score": round(risk, 2),
            "expected_outcome": "STABILIZED" if prob > 0.7 else "DEGRADED"
        }

    def anomaly_progress(self) -> float:
        if self.anomaly_started_at is None: return 0.0
        return min((self.tick - self.anomaly_started_at) / 30.0, 1.0)

    async def get_metrics(self, namespace: Optional[str] = None) -> List[Dict[str, Any]]:
        self.tick += 1
        simulated_metrics = self._run_simulation_tick()
        
        if FORCE_SIMULATION_MODE:
            all_metrics = simulated_metrics
        else:
            real_pods = await kube_driver.list_real_pods()
            prom_metrics = await prometheus_driver.fetch_all_pod_metrics()
            prom_map = {(p["namespace"], p["pod_name"]): p for p in prom_metrics}
            final_metrics_map = {(p["namespace"], p["pod_name"]): p for p in simulated_metrics}
            
            for pod in real_pods:
                key = (pod["namespace"], pod["pod_name"])
                pod["is_simulated"] = False
                final_metrics_map[key] = pod

            for key, p_metrics in prom_map.items():
                if key in final_metrics_map:
                    target = final_metrics_map[key]
                    target["is_simulated"] = False
                    target["cpu_percent"] = p_metrics["cpu_percent"]
                    target["memory_mb"] = p_metrics["memory_mb"]
                    target["network_in_mbps"] = p_metrics["network_in_mbps"]
                    target["network_out_mbps"] = p_metrics["network_out_mbps"]
                    target["pvc_read_mbps"] = p_metrics["pvc_read_mbps"]
                    target["pvc_write_mbps"] = p_metrics["pvc_write_mbps"]
                    if target.get("memory_limit_mb", 0) > 0:
                        target["memory_pct"] = round((target["memory_mb"] / target["memory_limit_mb"]) * 100, 2)

            all_metrics = list(final_metrics_map.values())

        if namespace and namespace != "all":
            all_metrics = [m for m in all_metrics if m.get("namespace") == namespace]

        for metric in all_metrics:
            pid = metric.get("pod_id")
            if not pid:
                pid = f"{metric.get('namespace')}-{metric.get('pod_name')}"
                metric['pod_id'] = pid
            if pid not in self.history: self.history[pid] = deque(maxlen=120)
            self.history[pid].append(metric)

        return all_metrics

    def _run_simulation_tick(self) -> List[Dict[str, Any]]:
        progress = self.anomaly_progress()
        results = []
        t = self.tick

        for pod in PODS:
            pid = pod["id"]
            # Apply remediation recovery logic
            recovery = 0.0
            if pid in self.remediation_effects:
                effect = self.remediation_effects[pid]
                recovery = min(1.0, (t - effect["applied_at"]) * effect["recovery_rate"])

            # Base Metrics
            cpu    = pod["base_cpu"]    + self.sine_wave(60, 3.0, hash(pid) % 10) + self.noise(1.5)
            memory = pod["base_memory"] + self.sine_wave(120, 20.0, hash(pid) % 5) + self.noise(5.0)
            net_in  = pod["base_network_in"]  + self.sine_wave(45, 0.3, 1.0) + self.noise(0.1)
            net_out = pod["base_network_out"] + self.sine_wave(45, 0.2, 2.0) + self.noise(0.08)
            pvc_r   = pod["base_pvc_read"]  + self.noise(0.05)
            pvc_w   = pod["base_pvc_write"] + self.noise(0.03)
            latency = 12.0 + self.sine_wave(30, 2.0) + self.noise(1.0)
            status  = "Running"
            restarts = self.restarts[pid]

            # Anomaly Injection Logic (Mitigated by recovery)
            adj_progress = max(0.0, progress - recovery)

            if self.anomaly_mode == "pvc_cascade":
                if pid == "postgres-db":
                    pvc_w += 8.5 * adj_progress; pvc_r += 4.2 * adj_progress; cpu += 35 * adj_progress; latency += 180 * adj_progress
                    if adj_progress > 0.7: status = "Warning" if adj_progress < 0.9 else "CrashLoopBackOff"
                elif pid == "auth-service":
                    delay = max(0, adj_progress - 0.3)
                    cpu += 42 * delay; latency += 95 * delay
                elif pid == "frontend-service":
                    latency += 220 * max(0, adj_progress - 0.5)

            elif self.anomaly_mode == "memory_leak":
                if pid == "redis-cache":
                    memory += 15 * (t - self.anomaly_started_at) * adj_progress
                    if memory > 3800: status = "OOMKilled"; self.clear_anomaly()
                elif pid == "auth-service":
                    latency += 60 * max(0, adj_progress - 0.4)

            elif self.anomaly_mode == "cpu_storm":
                if pid == "payment-service":
                    cpu += 65 * adj_progress; latency += 75 * adj_progress
                elif pid == "frontend-service":
                    latency += 110 * max(0, adj_progress - 0.35)
            
            # Replicate restarts for twin realism
            if status in ("CrashLoopBackOff", "OOMKilled"): self.restarts[pid] += 1

            metric = {
                "pod_id": pid, "pod_name": pod["name"], "namespace": pod["namespace"],
                "node": pod["node"], "image": pod["image"], "labels": pod["labels"],
                "status": status, "replicas": pod["replicas"], "restarts": self.restarts[pid],
                "cpu_percent": round(max(0.1, min(cpu, 100.0)), 2),
                "memory_mb": round(max(10.0, memory), 1),
                "memory_limit_mb": pod["base_memory"] * 3.5,
                "network_in_mbps": round(max(0, net_in), 3), "network_out_mbps": round(max(0, net_out), 3),
                "pvc_read_mbps": round(max(0, pvc_r), 3), "pvc_write_mbps": round(max(0, pvc_w), 3),
                "latency_ms": round(max(1.0, latency), 1),
                "is_simulated": True, "is_digital_twin": True, 
                "timestamp": round(time.time(), 3), "tick": t,
            }
            results.append(metric)
        return results

    async def get_dependency_graph(self, namespace: Optional[str] = None) -> Dict:
        # Implementation preserved but moved to KnowledgeGraph in Phase 4
        # Returning a simplified view here for backward compatibility if needed
        return {"nodes": [], "edges": []}

    async def get_latest_metrics(self, namespace: Optional[str] = None) -> List[Dict]:
        ids = list(self.history.keys())
        tasks = [self.get_latest_for_pod(pid) for pid in ids]
        results = await asyncio.gather(*tasks)
        all_latest = [r for r in results if r]
        if namespace and namespace != "all":
            return [m for m in all_latest if m.get("namespace") == namespace]
        return all_latest

    async def get_latest_for_pod(self, pod_id: str) -> Optional[Dict]:
        if pod_id in self.history and self.history[pod_id]: return self.history[pod_id][-1]
        return None

    def reset(self):
        self.tick = 0; self.clear_anomaly(); self.remediation_effects = {}
        self.history = { pod["id"]: deque(maxlen=120) for pod in PODS }
        self.restarts = {pod["id"]: pod["restarts"] for pod in PODS}

    def get_history(self, pod_id: str, n: int = 60) -> List[Dict]:
        return list(self.history.get(pod_id, []))[-n:]

simulator = ClusterSimulator()
