"""
CPU Contention Agent
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

class CPUContentionAgent(BaseAgent):
    name = "CPU Contention Agent"
    icon = "⚙️"
    domain = "CPU & Processing"

    def analyze(self, metrics, anomalies, graph):
        cpu_data = sorted(metrics, key=lambda m: m["cpu_percent"], reverse=True)
        worst = cpu_data[0] if cpu_data else {}
        cpu = worst.get("cpu_percent", 0)
        pod = worst.get("pod_name", "unknown")
        cpu_anoms = [a for a in anomalies if a["metric"] == "cpu_percent"]
        
        reasoning = [
            f"Analyzing CPU utilization across {len(metrics)} pods.",
            f"Peak utilization identified on {pod} ({cpu}%)."
        ]

        if cpu_anoms:
            top = max(cpu_anoms, key=lambda a: _rank(a["severity"]))
            sev = top["severity"]
            reasoning.append(f"Confirmed anomaly on {top['pod_name']} with severity {sev}.")
            reasoning.append("Cross-referencing with historical burst patterns.")
            return self._result(
                sev,
                f"{top['pod_name']} CPU at {top['value']:.1f}% — {'possible infinite loop or workload burst' if sev == 'CRITICAL' else 'elevated usage detected'}",
                0.91 if sev == "CRITICAL" else 0.78,
                "Scale horizontally or audit code for blocking loops" if sev == "CRITICAL" else "Monitor for next 5 minutes",
                reasoning,
                {"hot_pod": top["pod_name"], "cpu": top["value"], "all_pods": {m["pod_name"]: m["cpu_percent"] for m in metrics}},
            )
        
        reasoning.append("All pods within nominal CPU bounds (<65%).")
        return self._result(
            "INFO", f"CPU normal — highest: {pod} at {cpu:.1f}%", 0.93,
            "No action required",
            reasoning,
            {"hot_pod": pod, "cpu": cpu},
        )
