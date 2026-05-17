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

    def __init__(self):
        self.last_execution_time = 0.0
        self.execution_count = 0
        self.avg_execution_latency = 0.0
        self.health = "HEALTHY"
        self.state = "IDLE"

    def analyze(self, metrics: List[Dict], anomalies: List[Dict], graph: Dict, *args) -> Dict[str, Any]:
        raise NotImplementedError("Each agent must implement analyze()")

    def get_governance_metrics(self) -> Dict[str, Any]:
        """Returns operational metrics for agent lifecycle management."""
        return {
            "agent": self.name,
            "health": self.health,
            "state": self.state,
            "avg_latency_ms": round(self.avg_execution_latency * 1000, 2),
            "cycle_count": self.execution_count
        }

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
            "governance":        self.get_governance_metrics()
        }
