"""
Cluster SRE Supervisor Agent — Cross-domain cluster health synthesis.
"""
from .base_agent import BaseAgent


class ClusterSRESupervisorAgent(BaseAgent):
    name   = "Cluster SRE Supervisor Agent"
    icon   = "🛡️"
    domain = "Site Reliability"

    def analyze(self, metrics, anomalies, graph, *args):
        pod_count = len(metrics)
        nodes     = len(set(m.get("node") for m in metrics if m.get("node")))
        avg_cpu   = sum(m["cpu_percent"] for m in metrics) / max(pod_count, 1)

        reasoning = [
            f"Evaluating cluster-wide health across {pod_count} pods and {nodes} nodes.",
            f"Global CPU load average: {avg_cpu:.1f}%.",
        ]

        # Node imbalance check
        node_pods: dict = {}
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
                reasoning,
            )

        if avg_cpu > 70:
            reasoning.append(f"Global CPU pressure ({avg_cpu:.1f}%) detected.")
            return self._result(
                "CRITICAL",
                f"Cluster-wide CPU saturation imminent — avg {avg_cpu:.1f}%",
                0.91,
                "Provision additional nodes or scale down non-essential workloads",
                reasoning,
            )

        reasoning.append("Cluster infrastructure is stable and balanced.")
        return self._result(
            "INFO",
            f"Cluster infrastructure healthy: {pod_count} pods across {nodes} nodes.",
            0.94,
            "No action required",
            reasoning,
        )
