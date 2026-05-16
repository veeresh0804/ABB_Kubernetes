"""
Multi-Agent AI System — Main entry point
"""
import time
from typing import List, Dict, Any

from .memory_leak_agent import MemoryLeakAgent
from .cpu_contention_agent import CPUContentionAgent
from .pvc_saturation_agent import PVCSaturationAgent
from .retry_storm_agent import RetryStormAgent
from .cluster_sre_supervisor_agent import ClusterSRESupervisorAgent
from .dependency_impact_analysis_agent import DependencyImpactAnalysisAgent
from .stabilization_recommendation_agent import StabilizationRecommendationAgent

# ─── Agent Registry ───────────────────────────────────────────────────────────
ALL_AGENTS = [
    MemoryLeakAgent(),
    CPUContentionAgent(),
    PVCSaturationAgent(),
    RetryStormAgent(),
    ClusterSRESupervisorAgent(),
    DependencyImpactAnalysisAgent(),
    StabilizationRecommendationAgent(),
]


def run_all_agents(metrics: List[Dict], anomalies: List[Dict], graph: Dict) -> List[Dict]:
    results = []
    # Run all agents except the recommendation agent first
    for agent in ALL_AGENTS:
        if agent.name != "Stabilization Recommendation Agent":
            try:
                result = agent.analyze(metrics, anomalies, graph)
                results.append(result)
            except Exception as e:
                results.append({
                    "agent": agent.name,
                    "icon": agent.icon,
                    "domain": agent.domain,
                    "status": "ERROR",
                    "finding": f"Agent error: {str(e)}",
                    "confidence": 0.0,
                    "recommendation": "Check agent logs",
                    "detail": {},
                    "timestamp": time.time(),
                })

    # Run the recommendation agent with the results of the other agents
    for agent in ALL_AGENTS:
        if agent.name == "Stabilization Recommendation Agent":
            try:
                result = agent.analyze(metrics, anomalies, graph, results)
                results.append(result)
            except Exception as e:
                results.append({
                    "agent": agent.name,
                    "icon": agent.icon,
                    "domain": agent.domain,
                    "status": "ERROR",
                    "finding": f"Agent error: {str(e)}",
                    "confidence": 0.0,
                    "recommendation": "Check agent logs",
                    "detail": {},
                    "timestamp": time.time(),
                })
    return results
