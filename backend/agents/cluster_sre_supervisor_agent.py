"""
Cluster SRE Supervisor Agent
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

class ClusterSRESupervisorAgent(BaseAgent):
    name = "Cluster SRE Supervisor Agent"
    icon = "🛡️"
    domain = "Site Reliability"

    def analyze(self, metrics, anomalies, graph):
        pod_count = len(metrics)
        nodes = len(set(m.get("node") for m in metrics if m.get("node")))
        avg_cpu = sum(m["cpu_percent"] for m in metrics) / max(pod_count, 1)
        
        reasoning = [
            f"Evaluating cluster-wide health across {pod_count} pods and {nodes} nodes.",
            f"Current global CPU load average: {avg_cpu:.1f}%."
        ]

        # Check for node imbalance
        node_pods = {}
        for m in metrics:
            n = m.get("node", "unknown")
            node_pods[n] = node_pods.get(n, 0) + 1
        
        if nodes > 1 and max(node_pods.values()) > min(node_pods.values()) * 2:
            reasoning.append("Warning: Pod distribution across nodes is highly imbalanced.")
            return self._result(
                "WARNING",
                "Pod distribution imbalance detected across nodes",
                0.82,
                "Check taints/tolerations or node affinity rules; trigger pod rescheduling",
                reasoning
            )

        if avg_cpu > 70:
            reasoning.append(f"Global CPU pressure ({avg_cpu:.1f}%) detected.")
            return self._result(
                "CRITICAL",
                "Cluster-wide CPU saturation imminent",
                0.91,
                "Provision additional nodes or scale down non-essential workloads",
                reasoning
            )

        reasoning.append("Cluster infrastructure is stable and balanced.")
        return self._result(
            "INFO",
            f"Cluster infrastructure healthy: {pod_count} pods distributed across {nodes} nodes.",
            0.94,
            "No action required",
            reasoning
        )
