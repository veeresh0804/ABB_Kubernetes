"""
KubeMind AI — Shared BaseAgent
All specialized agents inherit from this class.
"""
import time
from typing import List, Dict, Any, Optional


def _rank(severity: str) -> int:
    return {"INFO": 0, "WARNING": 1, "CRITICAL": 2}.get(severity, 0)


class BaseAgent:
    name: str = "BaseAgent"
    icon: str = "🤖"
    domain: str = "General"

    def analyze(self, metrics: List[Dict], anomalies: List[Dict], graph: Dict, *args) -> Dict[str, Any]:
        raise NotImplementedError("Each agent must implement analyze()")

    def _result(
        self,
        status: str,
        finding: str,
        confidence: float,
        recommendation: str,
        reasoning: Optional[List[str]] = None,
        detail: Optional[Dict] = None,
        mitigation_safety: str = "LOW_RISK",
        buffer_action: Optional[str] = None,
    ) -> Dict[str, Any]:
        return {
            "agent":             self.name,
            "icon":              self.icon,
            "domain":            self.domain,
            "status":            status,
            "finding":           finding,
            "confidence":        round(confidence, 2),
            "reasoning":         reasoning or [],
            "recommendation":    recommendation,
            "detail":            detail or {},
            "mitigation_safety": mitigation_safety,
            "buffer_action":     buffer_action or "monitor_only",
            "timestamp":         time.time(),
        }
