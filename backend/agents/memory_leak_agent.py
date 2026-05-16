"""
Memory Leak Agent — Identifies memory growth patterns and OOMKill risk.
"""
from .base_agent import BaseAgent, _rank


class MemoryLeakAgent(BaseAgent):
    name   = "Memory Leak Agent"
    icon   = "🧠"
    domain = "Memory & Cache"

    def analyze(self, metrics, anomalies, graph, *args):
        mem_anoms = [a for a in anomalies if a["metric"] == "memory_pct"]
        reasoning = [f"Scanning memory footprint for {len(metrics)} pods."]

        leaking_pods = [
            p for p in metrics
            if p.get("trends", {}).get("memory_pct") == "increasing"
            and p.get("memory_pct", 0) > 75
        ]

        if leaking_pods:
            pod = max(leaking_pods, key=lambda p: p.get("memory_pct", 0))
            pct = pod.get("memory_pct", 0)
            reasoning.append(f"Sustained memory growth on {pod['pod_name']} at {pct:.1f}%.")
            reasoning.append("Consistent growth is a strong indicator of a memory leak.")
            return self._result(
                "CRITICAL",
                f"Sustained memory growth in {pod['pod_name']} — likely memory leak.",
                0.95,
                "Restart unhealthy replica and investigate unbounded cache allocation.",
                reasoning,
                {
                    "pod":              pod["pod_name"],
                    "memory_pct":       pct,
                    "probable_cause":   "Unbounded cache or object references preventing GC.",
                    "evidence":         f"Memory growing continuously, now at {pct:.1f}% of limit.",
                    "operational_risk": "HIGH: OOMKill event imminent, causing service disruption.",
                    "dependency_propagation": "Downstream services will experience increased latency.",
                },
                mitigation_safety="MEDIUM_RISK",
                buffer_action="restart_unhealthy_replica",
            )

        if mem_anoms:
            top = max(mem_anoms, key=lambda a: _rank(a["severity"]))
            reasoning.append(f"Anomaly on {top['pod_name']}. Evaluating leakage probability.")
            return self._result(
                top["severity"],
                f"{top['pod_name']} memory at {top['value']:.1f}% — "
                f"{'potential leak detected' if top['severity'] == 'CRITICAL' else 'memory pressure building'}",
                0.82,
                "Review memory limits and check for unbounded in-memory caches",
                reasoning,
                {"pod": top["pod_name"], "memory_pct": top["value"]},
            )

        worst = max(metrics, key=lambda m: m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1), default={})
        pct = worst.get("memory_mb", 0) / max(worst.get("memory_limit_mb", 1), 1) * 100
        reasoning.append(f"System-wide memory within limits. Highest: {worst.get('pod_name')} at {pct:.1f}%.")
        return self._result(
            "INFO",
            f"Memory normal — highest: {worst.get('pod_name', '')} at {pct:.1f}%",
            0.92,
            "No action required",
            reasoning,
        )
