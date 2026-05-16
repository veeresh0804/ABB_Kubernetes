"""
Stabilization Recommendation Agent — Cross-agent synthesis and remediation prioritization.
"""
from .base_agent import BaseAgent


class StabilizationRecommendationAgent(BaseAgent):
    name   = "Stabilization Recommendation Agent"
    icon   = "💡"
    domain = "Stabilization"

    def analyze(self, metrics, anomalies, graph, agent_results=None, *args):
        agent_results = agent_results or []
        reasoning = ["Synthesizing findings from all domain agents."]

        critical = [r for r in agent_results if r["status"] == "CRITICAL"]
        warnings = [r for r in agent_results if r["status"] == "WARNING"]
        impact   = next((r for r in agent_results if r["agent"] == "Dependency Impact Analysis Agent"), None)

        if critical:
            top = critical[0]
            blast_info = ""
            if impact and impact["status"] != "INFO":
                blast_info = f" (Blast Radius: {impact['detail'].get('blast_radius', '?')} services)"

            reasoning.append(
                f"Critical state: {top['agent']}. {len(critical)} agents reporting CRITICAL."
            )
            return self._result(
                "CRITICAL",
                f"Cluster instability confirmed: {top['finding']}{blast_info}",
                0.96,
                f"SRE ACTION REQUIRED: {top['recommendation']}",
                reasoning,
                {"critical_findings": critical, "impact": impact},
            )

        if warnings:
            top = warnings[0]
            reasoning.append("Proactive monitoring engaged. Warnings in processing/storage domains.")
            return self._result(
                "WARNING",
                f"Performance degradation: {top['finding']}",
                0.88,
                f"RECOMMENDATION: {top['recommendation']}",
                reasoning,
                {"warning_findings": warnings},
            )

        reasoning.append("Global telemetry within nominal operating parameters.")
        return self._result(
            "INFO",
            "System state: NOMINAL. Continuous operational intelligence monitoring active.",
            0.99,
            "No action required",
            reasoning,
        )
