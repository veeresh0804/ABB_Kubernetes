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
        root_anomaly = next(a for a in fresh_anomalies if a["pod_id"] == root_pod_id)
        
        # ... (rest of the incident construction)
