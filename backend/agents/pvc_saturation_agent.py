"""
PVC Saturation Agent — Monitors disk I/O and storage bottlenecks.
"""
from .base_agent import BaseAgent, _rank


class PVCSaturationAgent(BaseAgent):
    name   = "PVC Saturation Agent"
    icon   = "💾"
    domain = "PVC & Disk I/O"

    def analyze(self, metrics, anomalies, graph, *args):
        pvc_anoms = [a for a in anomalies if a["metric"] in ("pvc_write_mbps", "pvc_read_mbps")]
        postgres  = next((m for m in metrics if m["pod_id"] == "postgres-db"), None)
        reasoning = ["Evaluating PVC throughput and IOPS utilization."]

        if postgres:
            pw = postgres.get("pvc_write_mbps", 0)
            pr = postgres.get("pvc_read_mbps", 0)
            reasoning.append(f"Database I/O: {pw:.2f} MB/s write, {pr:.2f} MB/s read.")
            if pw > 5 or pr > 5:
                sev = "CRITICAL" if (pw > 7 or pr > 7) else "WARNING"
                reasoning.append(f"I/O levels categorized as {sev}.")
                return self._result(
                    sev,
                    f"postgres-db PVC: write {pw:.2f} MB/s, read {pr:.2f} MB/s — "
                    f"{'saturation detected' if sev == 'CRITICAL' else 'high write amplification'}",
                    0.94,
                    "Expand PVC IOPS limits; tune checkpoint_completion_target in postgres.conf",
                    reasoning,
                    {"pvc_write": pw, "pvc_read": pr, "pod": "postgres-db"},
                )

        if pvc_anoms:
            top = max(pvc_anoms, key=lambda a: _rank(a["severity"]))
            reasoning.append(f"Non-database storage anomaly on {top['pod_name']}.")
            return self._result(
                top["severity"], top["message"], 0.83,
                "Review storage class IOPS limits and disk utilization",
                reasoning,
            )

        reasoning.append("All PVC volumes within nominal throughput envelopes.")
        return self._result(
            "INFO",
            "PVC I/O normal — all volumes within healthy throughput bounds",
            0.91,
            "No action required",
            reasoning,
        )
