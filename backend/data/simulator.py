"""
KubeMind AI — Kubernetes Cluster Data Simulator
Generates realistic pod metrics for 5 microservices with natural variation,
burst patterns, and triggerable anomaly scenarios.
Also merges live data from a real Kubernetes cluster if available.
"""
import time
import math
import asyncio
import random
import os
import logging
from typing import Dict, List, Any, Optional
from collections import deque

# ─── Global Configuration ──────────────────────────────────────────────────
logger = logging.getLogger("ClusterSimulator")
FORCE_SIMULATION_MODE = os.getenv("FORCE_SIMULATION_MODE", "false").lower() == "true"

# Use a relative import within the package
from .k8s_driver import kube_driver
from .prometheus_driver import prometheus_driver

# ─── Pod Definitions ──────────────────────────────────────────────────────────
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
]

# ─── Dependency Graph ─────────────────────────────────────────────────────────
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
        # This history will now store both simulated and real pod data
        self.history: Dict[str, deque] = { pod["id"]: deque(maxlen=120) for pod in PODS }
        self.restarts = {pod["id"]: pod["restarts"] for pod in PODS}

    def noise(self, scale=1.0) -> float:
        return random.gauss(0, scale)

    def sine_wave(self, period=60, amplitude=1.0, phase=0.0) -> float:
        return amplitude * math.sin(2 * math.pi * self.tick / period + phase)

    def trigger_anomaly(self, scenario: str):
        self.anomaly_mode = scenario
        self.anomaly_started_at = self.tick

    def clear_anomaly(self):
        self.anomaly_mode = None
        self.anomaly_started_at = None

    def reset(self):
        """Resets the simulator state."""
        self.tick = 0
        self.clear_anomaly()
        self.history = { pod["id"]: deque(maxlen=120) for pod in PODS }
        logger.info("Simulator reset successfully.")

    def anomaly_progress(self) -> float:
        if self.anomaly_started_at is None:
            return 0.0
        return min((self.tick - self.anomaly_started_at) / 30.0, 1.0)

    async def get_metrics(self) -> List[Dict[str, Any]]:
        self.tick += 1
        simulated_metrics = self._run_simulation_tick()
        
        if FORCE_SIMULATION_MODE:
            all_metrics = simulated_metrics
        else:
            # 1. Fetch from K8s API (for metadata & basic status)
            real_pods = await kube_driver.list_real_pods()
            
            # 2. Fetch from Prometheus (for high-fidelity metrics)
            prom_metrics = await prometheus_driver.fetch_all_pod_metrics()
            prom_map = {(p["namespace"], p["pod_name"]): p for p in prom_metrics}
            
            # Use (namespace, pod_name) as the key for merging
            final_metrics_map = {(p["namespace"], p["pod_name"]): p for p in simulated_metrics}
            
            # Merge K8s API data
            for pod in real_pods:
                key = (pod["namespace"], pod["pod_name"])
                pod["is_simulated"] = False
                final_metrics_map[key] = pod

            # Merge Prometheus data (overwriting metrics but keeping metadata)
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
                    
                    # Recalculate memory percentage if limit is known
                    if target.get("memory_limit_mb", 0) > 0:
                        target["memory_pct"] = round((target["memory_mb"] / target["memory_limit_mb"]) * 100, 2)

            all_metrics = list(final_metrics_map.values())

        for metric in all_metrics:
            pid = metric.get("pod_id")
            if not pid:
                # If a real pod has no UID yet, create a temporary one for history tracking
                pid = f"{metric.get('namespace')}-{metric.get('pod_name')}"
                metric['pod_id'] = pid
            
            if pid not in self.history:
                self.history[pid] = deque(maxlen=120)
            self.history[pid].append(metric)

        return all_metrics

    def _run_simulation_tick(self) -> List[Dict[str, Any]]:
        progress = self.anomaly_progress()
        results = []
        t = self.tick

        for pod in PODS:
            pid = pod["id"]
            cpu    = pod["base_cpu"]    + self.sine_wave(60, 3.0, hash(pid) % 10) + self.noise(1.5)
            memory = pod["base_memory"] + self.sine_wave(120, 20.0, hash(pid) % 5) + self.noise(5.0)
            net_in  = pod["base_network_in"]  + self.sine_wave(45, 0.3, 1.0) + self.noise(0.1)
            net_out = pod["base_network_out"] + self.sine_wave(45, 0.2, 2.0) + self.noise(0.08)
            pvc_r   = pod["base_pvc_read"]  + self.noise(0.05)
            pvc_w   = pod["base_pvc_write"] + self.noise(0.03)
            latency = 12.0 + self.sine_wave(30, 2.0) + self.noise(1.0)
            status  = "Running"
            restarts = self.restarts[pid]

            if self.anomaly_mode == "pvc_cascade":
                if pid == "postgres-db":
                    pvc_w += 8.5 * progress; pvc_r += 4.2 * progress; cpu += 35 * progress; latency += 180 * progress
                    if progress > 0.7: status = "Warning" if progress < 0.9 else "CrashLoopBackOff"
                elif pid == "auth-service":
                    delay = max(0, progress - 0.3)
                    cpu += 42 * delay; latency += 95 * delay
                elif pid == "frontend-service":
                    latency += 220 * max(0, progress - 0.5)

            elif self.anomaly_mode == "memory_leak":
                if pid == "redis-cache":
                    memory += 15 * (t - self.anomaly_started_at) * progress
                    if memory > 3800: status = "OOMKilled"; self.clear_anomaly()
                elif pid == "auth-service":
                    latency += 60 * max(0, progress - 0.4)

            elif self.anomaly_mode == "cpu_storm":
                if pid == "payment-service":
                    cpu += 65 * progress; latency += 75 * progress
                elif pid == "frontend-service":
                    latency += 110 * max(0, progress - 0.35)
            
            metric = {
                "pod_id": pid, "pod_name": pod["name"], "namespace": pod["namespace"],
                "node": pod["node"], "image": pod["image"], "labels": pod["labels"],
                "status": status, "replicas": pod["replicas"], "restarts": restarts,
                "cpu_percent": round(max(0.1, min(cpu, 100.0)), 2),
                "memory_mb": round(max(10.0, memory), 1),
                "memory_limit_mb": pod["base_memory"] * 3.5,
                "network_in_mbps": round(max(0, net_in), 3), "network_out_mbps": round(max(0, net_out), 3),
                "pvc_read_mbps": round(max(0, pvc_r), 3), "pvc_write_mbps": round(max(0, pvc_w), 3),
                "latency_ms": round(max(1.0, latency), 1),
                "is_simulated": True, "timestamp": round(time.time(), 3), "tick": t,
            }
            results.append(metric)
        return results

    def get_history(self, pod_id: str, n: int = 60) -> List[Dict]:
        return list(self.history.get(pod_id, []))[-n:]

    async def get_dependency_graph(self) -> Dict:
        latest_metrics = await self.get_latest_metrics()
        current = {m["pod_id"]: m for m in latest_metrics}
        
        # Mapping for pod names to IDs (needed for the discovery engine which returns names)
        name_to_id = {m["pod_name"]: m["pod_id"] for m in latest_metrics}

        all_pods_in_graph = {p["id"] for p in PODS} | {m["pod_id"] for m in latest_metrics}
        
        nodes = []
        for pid in all_pods_in_graph:
            m = current.get(pid, {})
            if not m: continue

            status = m.get("status", "Unknown")
            severity = "normal"
            if status in ("Warning", "Degraded"): severity = "warning"
            elif status in ("CrashLoopBackOff", "OOMKilled", "Failed"): severity = "critical"
            
            nodes.append({
                "id": pid, "label": m.get("pod_name"), "tier": m.get("labels", {}).get("tier", "live"),
                "node": m.get("node"), "status": status, "severity": severity,
                "cpu": m.get("cpu_percent", 0),
                "memory_pct": round(m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1) * 100, 1) if m.get("memory_limit_mb") else 0,
                "restarts": m.get("restarts", 0),
            })

        edges = []
        
        # 1. Fetch Dynamic Edges (if connected)
        dynamic_edges = await kube_driver.discover_dependencies()
        for de in dynamic_edges:
            # Convert names back to IDs for the frontend
            source_id = name_to_id.get(de["source"], de["source"])
            target_id = name_to_id.get(de["target"], de["target"])
            
            if source_id in current and target_id in current:
                s_met = current[source_id]
                t_met = current[target_id]
                hot = (s_met.get("latency_ms", 0) > 80 or t_met.get("latency_ms", 0) > 80)
                edges.append({
                    "source": source_id,
                    "target": target_id,
                    "type": de["type"],
                    "protocol": de["protocol"],
                    "weight": de["weight"],
                    "hot": hot
                })

        # 2. Add Hardcoded Simulation Edges (only if they don't already exist or as fallback)
        for e in DEPENDENCY_EDGES:
            # Check if this edge (or its inverse/duplicate) is already added via discovery
            if any(de["source"] == e["source"] and de["target"] == e["target"] for de in edges):
                continue

            s_met = current.get(e["source"], {})
            t_met = current.get(e["target"], {})
            if s_met and t_met:
                hot = (s_met.get("latency_ms", 0) > 80 or t_met.get("latency_ms", 0) > 80)
                edges.append({**e, "hot": hot})
                
        return {"nodes": nodes, "edges": edges}

    async def get_latest_metrics(self) -> List[Dict]:
        ids = list(self.history.keys())
        tasks = [self.get_latest_for_pod(pid) for pid in ids]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r]

    async def get_latest_for_pod(self, pod_id: str) -> Optional[Dict]:
        if pod_id in self.history and self.history[pod_id]:
            return self.history[pod_id][-1]
        return None

# Singleton
simulator = ClusterSimulator()
