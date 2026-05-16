"""
Retry Storm Agent — Detects network retry anomalies and latency spikes.
"""
from .base_agent import BaseAgent, _rank


class RetryStormAgent(BaseAgent):
    name   = "Retry Storm Agent"
    icon   = "🌐"
    domain = "Network & Traffic"

    def analyze(self, metrics, anomalies, graph, *args):
        lat_anoms = [a for a in anomalies if a["metric"] == "latency_ms"]
        high_net  = [m for m in metrics if m.get("network_in_mbps", 0) > 4.5]
        reasoning = ["Analyzing cluster network fabric and pod-to-pod latency."]

        if lat_anoms:
            top = max(lat_anoms, key=lambda a: _rank(a["severity"]))
            val = top["value"]
            reasoning.append(f"Latency spike on {top['pod_name']}: {val:.0f}ms.")
            return self._result(
                top["severity"],
                f"{top['pod_name']} latency at {val:.0f}ms — "
                f"{'severe degradation, retry storm suspected' if val > 150 else 'abnormal response times'}",
                0.87,
                "Check upstream pod health; add circuit breaker to prevent cascade",
                reasoning,
                {"pod": top["pod_name"], "latency_ms": val},
            )

        if high_net:
            pod = high_net[0]
            reasoning.append(f"High throughput on {pod['pod_name']}: {pod['network_in_mbps']:.2f} MB/s.")
            return self._result(
                "WARNING",
                f"{pod['pod_name']} inbound traffic {pod['network_in_mbps']:.2f} MB/s — bandwidth spike",
                0.76,
                "Investigate traffic origin; check for retry loops or DDoS patterns",
                reasoning,
            )

        max_lat = max(metrics, key=lambda m: m.get("latency_ms", 0), default={})
        reasoning.append(
            f"Network healthy. Max latency: {max_lat.get('pod_name')} at {max_lat.get('latency_ms', 0):.0f}ms."
        )
        return self._result(
            "INFO",
            f"Network healthy — peak latency: {max_lat.get('pod_name', '')} at {max_lat.get('latency_ms', 0):.0f}ms",
            0.90,
            "No action required",
            reasoning,
        )
