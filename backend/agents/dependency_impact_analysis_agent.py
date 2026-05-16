"""
Dependency Impact Analysis Agent — Blast radius and cascade propagation analysis.
"""
from .base_agent import BaseAgent, _rank


class DependencyImpactAnalysisAgent(BaseAgent):
    name   = "Dependency Impact Analysis Agent"
    icon   = "🔥"
    domain = "Dependency & Impact"

    def analyze(self, metrics, anomalies, graph, *args):
        reasoning = ["Analyzing dependency graph and blast radius."]

        if not anomalies:
            return self._result(
                "INFO",
                "Dependency graph stable. No active anomalies.",
                0.95,
                "No action required",
                reasoning,
            )

        root_anomaly = max(anomalies, key=lambda a: _rank(a["severity"]))
        root_pod     = root_anomaly["pod_name"]

        adj: dict = {node["label"]: [] for node in graph.get("nodes", [])}
        for edge in graph.get("edges", []):
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if src in adj:
                adj[src].append(tgt)

        queue, visited = [root_pod], {root_pod}
        while queue:
            curr = queue.pop(0)
            for neighbor in adj.get(curr, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        blast_radius = len(visited)
        reasoning.append(f"Anomaly on {root_pod} initiated impact analysis.")
        reasoning.append(f"Graph traversal: {blast_radius} services in propagation path.")

        if blast_radius > 2:
            return self._result(
                "CRITICAL",
                f"Blast radius: {blast_radius} services in propagation path of {root_pod}.",
                0.92,
                f"IMMEDIATE: Isolate {root_pod} to prevent cluster-wide degradation.",
                reasoning,
                {"root_pod": root_pod, "blast_radius": blast_radius, "affected_services": list(visited)},
                mitigation_safety="MEDIUM_RISK",
                buffer_action="isolate_pod",
            )

        if blast_radius > 1:
            return self._result(
                "WARNING",
                f"Anomaly at {root_pod} has potential blast radius of {blast_radius} services.",
                0.85,
                f"Monitor downstream services; consider temporary isolation of {root_pod}.",
                reasoning,
                {"root_pod": root_pod, "blast_radius": blast_radius, "affected_services": list(visited)},
            )

        reasoning.append("Anomaly contained to a single service.")
        return self._result(
            "INFO",
            f"Anomaly on {root_pod} is contained — not propagated.",
            0.90,
            "Monitor service for recovery.",
            reasoning,
            {"root_pod": root_pod},
        )
