"""
KubeMind AI - Causal Reasoning Engine (Phase 9)

Moves beyond simple correlation to causal inference.
Uses the Knowledge Graph to distinguish between 'root causes' and 'symptoms'
by analyzing dependency propagation paths.
"""
import asyncio
import uuid
from typing import List, Dict, Any, Set
import time

from event_bus import event_bus
import events
from knowledge_graph import knowledge_graph

def _build_causal_chain(root: str, affected: Set[str], edges: List[Dict]) -> List[str]:
    chain = [root]
    visited = {root}
    queue = [root]
    while queue:
        current = queue.pop(0)
        children = [
            e["target"] for e in edges
            if e.get("source") == current and e["target"] in affected and e["target"] not in visited
        ]
        for child in children:
            if child not in visited:
                visited.add(child)
                queue.append(child)
                chain.append(child)
    remaining = [p for p in affected if p not in visited]
    chain.extend(sorted(remaining))
    return chain

class CausalEngine:
    def __init__(self):
        self.running = False
        self.tasks: List[asyncio.Task] = []
        self.anomaly_window = 15 
        
        # Phase 10: Governance & Reliability
        self.active_incidents: Dict[str, Dict[str, Any]] = {} # pod_id -> incident
        self.EVIDENCE_DECAY_SEC = 300 # 5 minutes

    async def start(self):
        self.running = True

    async def stop(self):
        self.running = False

    async def infer_root_cause(self, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyzes anomalies with temporal decay, versioning, and forensic audit trails.
        """
        now = time.time()
        # --- Priority 4: Reasoning Decay ---
        # Filter out "stale" evidence
        fresh_anomalies = [
            a for a in anomalies 
            if now - a.get("timestamp", now) < self.EVIDENCE_DECAY_SEC
        ]
        
        if not fresh_anomalies: return []
        
        topology = await knowledge_graph.get_topology("all")
        dependencies = {e["source"]: e["target"] for e in topology.get("edges", [])}

        affected_pods = {a["pod_id"] for a in fresh_anomalies}
        pod_scores = {pid: 0 for pid in affected_pods}
        
        for a in fresh_anomalies:
            pid = a["pod_id"]
            upstream = dependencies.get(pid)
            if upstream in affected_pods:
                pod_scores[pid] -= 1
                pod_scores[upstream] += 2
            else:
                pod_scores[pid] += 1

        sorted_pods = sorted(pod_scores.items(), key=lambda x: x[1], reverse=True)
        if not sorted_pods: return []
        
        root_pod_id, score = sorted_pods[0]
        root_anomaly = next(a for a in fresh_anomalies if a["pod_id"] == root_pod_id)
        
        # --- Priority 1 & 2: Versioning & Audit Trail ---
        version = 1
        prev_id = None
        
        if root_pod_id in self.active_incidents:
            prev = self.active_incidents[root_pod_id]
            version = prev.get("version", 1) + 1
            prev_id = prev.get("event_id")

        incident = {
            "event_id": str(uuid.uuid4()),
            "rule_id": f"CAUSAL-{root_pod_id}",
            "name": f"Cognitive Outage Model: {root_anomaly['metric']} (v{version})",
            "summary": f"Inferred root cause in {root_pod_id} (Centrality: {score}). Cascading symptoms across {len(affected_pods)-1} services.",
            "severity": "CRITICAL" if any(a["severity"] == "CRITICAL" for a in fresh_anomalies) else "WARNING",
            "root_cause_pod": root_pod_id,
            "root_metric": root_anomaly["metric"],
            "affected_pods": list(affected_pods),
            "causal_chain": _build_causal_chain(root_pod_id, affected_pods, topology.get("edges", [])),
            "recommendations": [f"Break causal chain at {root_pod_id}."],
            "version": version,
            "previous_version_id": prev_id,
            "causal_evidence": {
                "centrality_score": score,
                "evidence_count": len(fresh_anomalies),
                "decay_applied": True
            },
            "reasoning_audit_trail": [
                {"type": "ANOMALY_EVIDENCE", "pod": a["pod_id"], "metric": a["metric"], "ts": a["timestamp"]}
                for a in fresh_anomalies
            ]
        }
        
        self.active_incidents[root_pod_id] = incident
        return [incident]

# Singleton instance
causal_engine = CausalEngine()
