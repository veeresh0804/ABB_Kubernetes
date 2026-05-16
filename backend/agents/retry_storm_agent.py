"""
Retry Storm Agent
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

class RetryStormAgent(BaseAgent):
    name = "Retry Storm Agent"
    icon = "🌐"
    domain = "Network & Traffic"

    def analyze(self, metrics, anomalies, graph):
        lat_anoms = [a for a in anomalies if a["metric"] == "latency_ms"]
        high_net = [m for m in metrics if m.get("network_in_mbps", 0) > 4.5]
        
        reasoning = ["Analyzing cluster network fabric and pod-to-pod latency."]

        if lat_anoms:
            top = max(lat_anoms, key=lambda a: _rank(a["severity"]))
            val = top["value"]
            reasoning.append(f"Latency spike detected on {top['pod_name']}: {val:.0f}ms.")
            return self._result(
                top["severity"],
                f"{top['pod_name']} latency at {val:.0f}ms — {'severe degradation, retry storm suspected' if val > 150 else 'abnormal response times'}",
                0.87,
                "Check upstream pod health; add circuit breaker to prevent cascade",
                reasoning,
                {"pod": top["pod_name"], "latency_ms": val},
            )
        
        if high_net:
            pod = high_net[0]
            reasoning.append(f"High throughput detected on {pod['pod_name']}: {pod['network_in_mbps']:.2f} MB/s.")
            return self._result(
                "WARNING",
                f"{pod['pod_name']} inbound traffic {pod['network_in_mbps']:.2f} MB/s — bandwidth spike detected",
                0.76,
                "Investigate traffic origin; check for retry loops or DDoS patterns",
                reasoning
            )
        
        max_lat = max(metrics, key=lambda m: m.get("latency_ms", 0), default={})
        reasoning.append(f"Network healthy. Max observed latency: {max_lat.get('pod_name')} at {max_lat.get('latency_ms',0):.0f}ms.")
        return self._result(
            "INFO",
            f"Network healthy — peak latency: {max_lat.get('pod_name','')} at {max_lat.get('latency_ms',0):.0f}ms",
            0.90, "No action required",
            reasoning
        )
