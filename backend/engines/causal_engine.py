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
from collections import defaultdict # FIX: Import defaultdict

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
        
        # FIX: Create proper adjacency lists for forward and reverse dependencies
        forward_dependencies = defaultdict(list)
        reverse_dependencies = defaultdict(list) # To find upstreams easily
        for e in topology.get("edges", []):
            source = e["source"]
            target = e["target"]
            forward_dependencies[source].append(target)
            reverse_dependencies[target].append(source)


        affected_pods = {a["pod_id"] for a in fresh_anomalies}
        pod_scores = {pid: 0 for pid in affected_pods}
        
        for a in fresh_anomalies:
            pid = a["pod_id"]
            
            # Check if this pid has any *affected upstream* dependencies
            upstreams_of_pid = reverse_dependencies.get(pid, [])
            has_affected_upstream = False
            for upstream_pod in upstreams_of_pid:
                if upstream_pod in affected_pods:
                    has_affected_upstream = True
                    # If an upstream is affected, this pid is less likely to be the root.
                    # The upstream pod is more likely to be the root.
                    pod_scores[pid] -= 1
                    pod_scores[upstream_pod] += 2
            
            if not has_affected_upstream:
                # If no affected upstream, this pid is a potential root cause.
                pod_scores[pid] += 1

        sorted_pods = sorted(pod_scores.items(), key=lambda x: x[1], reverse=True)
        if not sorted_pods: return []
        
        root_pod_id, score = sorted_pods[0]
        root_anomaly = next((a for a in fresh_anomalies if a["pod_id"] == root_pod_id), fresh_anomalies[0])

        affected = affected_pods - {root_pod_id}
        chain = _build_causal_chain(root_pod_id, affected, topology.get("edges", []))

        severity = max((a["severity"] for a in fresh_anomalies if a["pod_id"] == root_pod_id), default="WARNING")
        severity_score = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}.get(severity, 1)

        recommendations = []
        if any("memory" in a.get("metric", "") for a in fresh_anomalies):
            recommendations.append("Review memory limits and check for unbounded cache allocation.")
            recommendations.append("Consider increasing memory limit or triggering a restart of unhealthy replicas.")
        if any("cpu" in a.get("metric", "") for a in fresh_anomalies):
            recommendations.append("Check for CPU contention — review horizontal scaling options.")
            recommendations.append("Consider enabling HPA with CPU threshold at 60%.")
        if any("pvc" in a.get("metric", "") for a in fresh_anomalies):
            recommendations.append("Expand PVC storage IOPS limits or add read replicas to offload I/O.")
        if not recommendations:
            recommendations = ["Monitor closely and prepare escalation procedures."]

        incident = {
            "rule_id": f"causal-{root_pod_id}-{int(now)}",
            "name": f"{root_pod_id} {root_anomaly.get('metric', 'degradation')} incident",
            "severity": severity,
            "root_cause_pod": root_pod_id,
            "root_metric": root_anomaly.get("metric", "unknown"),
            "causal_chain": chain,
            "summary": f"Causal analysis identified {root_pod_id} as root cause (score={score}) with {len(chain)} affected services.",
            "affected_pods": list(affected),
            "recommendations": recommendations[:4],
            "timestamp": now,
            "causal_evidence": {
                "upstream_credits": sum(1 for pid, s in pod_scores.items() if s > 0),
                "downstream_blame": sum(-1 for pid, s in pod_scores.items() if s < 0),
                "max_score": score,
            },
        }

        return [incident]

causal_engine = CausalEngine()
