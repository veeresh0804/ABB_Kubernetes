"""
Dependency Impact Analysis Agent
"""
import time
from typing import List, Dict, Any

class BaseAgent:
    name: str
    icon: str
    domain: str

    def analyze(self, metrics: List[Dict], anomalies: List[Dict]) -> Dict[str, Any]:
        raise NotImplementedError

    def _result(self, status, finding, confidence, recommendation, reasoning=None, detail=None, mitigation_safety="LOW_RISK", buffer_action=None):
        return {
            "agent":          self.name,
            "icon":           self.icon,
            "domain":         self.domain,
            "status":         status,
            "finding":        finding,
            "confidence":     round(confidence, 2),
            "reasoning":      reasoning or [],
            "recommendation": recommendation,
            "detail":         detail or {},
            "mitigation_safety": mitigation_safety,
            "buffer_action":  buffer_action or "monitor_only",
            "timestamp":      time.time(),
        }

class DependencyImpactAnalysisAgent(BaseAgent):
    name = "Dependency Impact Analysis Agent"
    icon = "🔥"
    domain = "Dependency & Impact"

    def analyze(self, metrics, anomalies, graph):
        reasoning = ["Analyzing dependency graph and impact radius."]
        
        if not anomalies:
            return self._result(
                "INFO",
                "Dependency graph stable. No active anomalies.",
                0.95,
                "No action required",
                reasoning
            )

        # Find the pod with the highest severity anomaly
        root_anomaly = max(anomalies, key=lambda a: _rank(a["severity"]))
        root_pod = root_anomaly["pod_name"]
        
        adj_list = {node['label']: [] for node in graph['nodes']}
        for edge in graph['edges']:
            adj_list[edge['source']].append(edge['target'])

        # BFS to find all reachable nodes (the blast radius)
        q = [root_pod]
        visited = {root_pod}
        while q:
            curr = q.pop(0)
            if curr in adj_list:
                for neighbor in adj_list[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
        
        blast_radius = len(visited)
        reasoning.append(f"Anomaly on {root_pod} initiated impact analysis.")
        reasoning.append(f"Graph traversal identified {blast_radius} services in the potential blast radius.")

        if blast_radius > 2:
            return self._result(
                "CRITICAL",
                f"Sustained blast radius expansion: {blast_radius} services identified in propagation path of {root_pod}.",
                0.92,
                f"IMMEDIATE ACTION: Isolate {root_pod} to prevent cluster-wide degradation. Circuit breakers may be insufficient.",
                reasoning,
                detail={
                    "root_pod": root_pod,
                    "blast_radius": blast_radius,
                    "affected_services": list(visited)
                },
                mitigation_safety="MEDIUM_RISK",
                buffer_action="isolate_pod"
            )

        if blast_radius > 1:
            return self._result(
                "WARNING",
                f"Anomaly at {root_pod} has a potential blast radius of {blast_radius} services.",
                0.85,
                f"Monitor downstream services for impact. Consider temporary isolation of {root_pod}.",
                reasoning,
                detail={
                    "root_pod": root_pod,
                    "blast_radius": blast_radius,
                    "affected_services": list(visited)
                }
            )

        reasoning.append("Anomaly contained to a single service.")
        return self._result(
            "INFO",
            f"Anomaly on {root_pod} is contained and has not propagated.",
            0.9,
            "Monitor service for recovery.",
            reasoning,
            detail={"root_pod": root_pod}
        )

def _rank(severity: str) -> int:
    return {"INFO": 0, "WARNING": 1, "CRITICAL": 2}.get(severity, 0)
