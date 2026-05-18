"""
KubeMind AI - Operational Knowledge Graph (Phase 4)

This module maintains a high-fidelity graph of the infrastructure, 
dependencies, and active incidents. It provides topology-aware reasoning
capabilities like blast radius estimation and causal chain tracking.
"""
import asyncio
from typing import Dict, List, Any, Set, Optional
import time

from event_bus import event_bus
import events
from data.simulator import DEPENDENCY_EDGES
from data.k8s_driver import kube_driver # FIX: Import kube_driver

class KnowledgeGraph:
    def __init__(self):
        self.nodes: Dict[str, Dict[str, Any]] = {} # pod_id -> node_data
        self.edges: List[Dict[str, Any]] = []      # List of dependencies
        self.running = False
        self.tasks: List[asyncio.Task] = []
        self.lock = asyncio.Lock()

    async def start(self):
        self.running = True
        
        telemetry_queue = event_bus.subscribe("TelemetryMetricsEvent")
        anomaly_queue = event_bus.subscribe("AnomalyEvent")

        async def consume_telemetry():
            while self.running:
                event: events.TelemetryMetricsEvent = await telemetry_queue.get()
                await self.update_topology(event.metrics)

        async def consume_anomalies():
            while self.running:
                event: events.AnomalyEvent = await anomaly_queue.get()
                await self.mark_anomaly(event.anomaly)

        self.tasks.extend([
            asyncio.create_task(consume_telemetry()),
            asyncio.create_task(consume_anomalies())
        ])

    async def stop(self):
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()

    async def update_topology(self, metrics: List[Dict[str, Any]]):
        """Updates nodes based on fresh telemetry and discovers dependencies if connected to K8s."""
        async with self.lock:
            # We don't remove nodes immediately to preserve historical context
            # during short telemetry gaps.
            for m in metrics:
                pid = m["pod_id"]
                # Reset severity to normal each topology update; anomaly events will re-escalate
                current_severity = self.nodes.get(pid, {}).get("severity", "normal")
                self.nodes[pid] = {
                    "id": pid,
                    "label": m["pod_name"],
                    "namespace": m["namespace"],
                    "node": m["node"],
                    "status": m["status"],
                    "tier": m.get("labels", {}).get("tier", "unknown"),
                    "severity": "normal",  # Reset; anomaly consumer will re-escalate
                    "last_seen": time.time(),
                    "metrics": {
                        "cpu": m.get("cpu_percent", 0),
                        "memory_pct": round(m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1) * 100, 1) if m.get("memory_limit_mb") else 0,
                    }
                }
            
            # FIX B-005: Integrate real dependency discovery from kube_driver
            all_edges = []
            
            # Start with simulated edges
            for e in DEPENDENCY_EDGES:
                if e["source"] in self.nodes and e["target"] in self.nodes:
                    all_edges.append({**e, "source_type": "simulated"}) # Mark source
            
            # Add discovered edges if kube_driver is connected
            if kube_driver.connected:
                discovered_edges = await kube_driver.discover_dependencies()
                for e in discovered_edges:
                    # Only add if nodes exist (discovered might contain stale pods)
                    if e["source"] in self.nodes and e["target"] in self.nodes:
                        # Prevent duplicates from simulated edges if real is similar
                        if not any(ae["source"] == e["source"] and ae["target"] == e["target"] for ae in all_edges):
                            all_edges.append({**e, "source_type": "discovered"}) # Mark source
            
            self.edges = all_edges

    async def mark_anomaly(self, anomaly: Dict[str, Any]):
        """Updates node severity based on detected anomalies."""
        async with self.lock:
            pid = anomaly["pod_id"]
            if pid not in self.nodes:
                return
            new_sev = anomaly["severity"].lower()
            current_sev = self.nodes[pid]["severity"]
            SEV_RANK = {"normal": 0, "warning": 1, "critical": 2}
            if SEV_RANK.get(new_sev, 0) >= SEV_RANK.get(current_sev, 0):
                self.nodes[pid]["severity"] = new_sev

    async def get_topology(self, namespace: str = "all") -> Dict[str, Any]:
        """Returns the current graph state, filtered by namespace."""
        async with self.lock:
            filtered_nodes = []
            active_ids = set()
            
            for pid, data in self.nodes.items():
                if namespace == "all" or data["namespace"] == namespace:
                    # Prune stale nodes (not seen in > 30s)
                    if time.time() - data["last_seen"] < 30:
                        filtered_nodes.append(data)
                        active_ids.add(pid)
            
            filtered_edges = [
                e for e in self.edges 
                if e["source"] in active_ids and e["target"] in active_ids
            ]
            
            return {
                "nodes": filtered_nodes,
                "edges": filtered_edges
            }

# Singleton instance
knowledge_graph = KnowledgeGraph()
