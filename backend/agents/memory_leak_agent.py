"""
Memory Leak Agent
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

def _rank(severity: str) -> int:
    return {"INFO": 0, "WARNING": 1, "CRITICAL": 2}.get(severity, 0)

class MemoryLeakAgent(BaseAgent):
    name = "Memory Leak Agent"
    icon = "🧠"
    domain = "Memory & Cache"

    def analyze(self, metrics, anomalies, graph):
        mem_anoms = [a for a in anomalies if a["metric"] == "memory_pct"]
        
        reasoning = [f"Scanning memory footprint for {len(metrics)} pods."]

        # Check for pods with increasing memory trend
        leaking_pods = []
        for pod in metrics:
            if pod.get("trends", {}).get("memory_pct") == "increasing" and pod["memory_pct"] > 75:
                leaking_pods.append(pod)

        if leaking_pods:
            pod = max(leaking_pods, key=lambda p: p["memory_pct"])
            pct = pod["memory_pct"]
            reasoning.append(f"Sustained memory growth detected on {pod['pod_name']} at {pct:.1f}%.")
            reasoning.append("This is a strong indicator of a memory leak.")
            
            return self._result(
                "CRITICAL",
                f"Sustained memory growth in {pod['pod_name']} likely indicates a memory leak.",
                0.95,
                "Restart unhealthy replica and monitor stabilization. Investigate application code for unbounded cache or object allocation.",
                reasoning,
                {
                    "pod": pod['pod_name'],
                    "memory_pct": pct,
                    "probable_cause": "Unbounded cache allocation or object references preventing garbage collection.",
                    "evidence": f"Memory usage has been consistently increasing over the last 15 minutes, now at {pct:.1f}% of limit.",
                    "operational_risk": "HIGH: Potential for OOMKilled event, leading to service disruption.",
                    "dependency_propagation": "Downstream services may experience increased latency and errors.",
                },
                mitigation_safety="MEDIUM_RISK",
                buffer_action="restart_unhealthy_replica"
            )

        if mem_anoms:
            top = max(mem_anoms, key=lambda a: _rank(a["severity"]))
            reasoning.append(f"Anomaly detected on {top['pod_name']}. Evaluating leakage probability.")
            return self._result(
                top["severity"],
                f"{top['pod_name']} memory at {top['value']:.1f}% — {'potential leak detected' if top['severity']=='CRITICAL' else 'memory pressure building'}",
                0.82,
                "Review memory limits and check for unbounded in-memory caches",
                reasoning,
                {"pod": top["pod_name"], "memory_pct": top["value"]},
            )
        
        worst = max(metrics, key=lambda m: m["memory_mb"] / max(m["memory_limit_mb"], 1), default={})
        pct = worst.get("memory_mb", 0) / max(worst.get("memory_limit_mb", 1), 1) * 100
        reasoning.append(f"System-wide memory within limits. Highest usage: {worst.get('pod_name')} at {pct:.1f}%.")
        return self._result(
            "INFO", f"Memory normal — highest: {worst.get('pod_name','')} at {pct:.1f}%", 0.92,
            "No action required",
            reasoning
        )
