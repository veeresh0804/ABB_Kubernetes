"""
Stabilization Recommendation Agent
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

class StabilizationRecommendationAgent(BaseAgent):
    name = "Stabilization Recommendation Agent"
    icon = "💡"
    domain = "Stabilization"

    def analyze(self, metrics, anomalies, graph, agent_results):
        reasoning = ["Synthesizing findings from all domain agents to generate stabilization recommendations."]
        
        critical_findings = [r for r in agent_results if r["status"] == "CRITICAL"]
        warning_findings = [r for r in agent_results if r["status"] == "WARNING"]
        impact_finding = next((r for r in agent_results if r["agent"] == "Dependency Impact Analysis Agent"), None)

        if critical_findings:
            top = critical_findings[0]
            blast_radius_info = ""
            if impact_finding and impact_finding["status"] != "INFO":
                 blast_radius_info = f" (Blast Radius: {impact_finding['detail'].get('blast_radius', '?')} services)"

            reasoning.append(f"Critical state confirmed for {top['agent']}. {len(critical_findings)} agents reporting critical status.")
            
            return self._result(
                "CRITICAL",
                f"Cluster instability confirmed: {top['finding']}{blast_radius_info}",
                0.96,
                f"SRE ACTION REQUIRED: {top['recommendation']}",
                reasoning,
                detail={"critical_findings": critical_findings, "impact": impact_finding}
            )

        if warning_findings:
            top = warning_findings[0]
            reasoning.append("Proactive monitoring engaged. Warnings identified in processing/storage domains.")
            return self._result(
                "WARNING",
                f"Performance degradation detected: {top['finding']}",
                0.88,
                f"RECOMMENDATION: {top['recommendation']}",
                reasoning,
                detail={"warning_findings": warning_findings}
            )

        reasoning.append("Global telemetry within nominal operating parameters.")
        return self._result(
            "INFO",
            "System state: NOMINAL. Continuous operational intelligence monitoring active.",
            0.99,
            "No action required",
            reasoning
        )
