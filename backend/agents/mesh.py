"""
KubeMind AI - Cognitive AI Mesh (Phase 3)

This module orchestrates the multi-agent system.
It runs agents as background tasks that subscribe to telemetry and anomaly events,
perform domain-specific reasoning, and publish AgentInsightEvents.
"""
import asyncio
import time
from typing import List

from event_bus import event_bus
from .memory_leak_agent import MemoryLeakAgent
from .cpu_contention_agent import CPUContentionAgent
from .pvc_saturation_agent import PVCSaturationAgent
from .retry_storm_agent import RetryStormAgent
from .cluster_sre_supervisor_agent import ClusterSRESupervisorAgent
from .dependency_impact_analysis_agent import DependencyImpactAnalysisAgent
from .stabilization_recommendation_agent import StabilizationRecommendationAgent
from .log_agent import LogIntelligenceAgent

class AgentMesh:
    def __init__(self):
        self.running = False
        self.tasks: List[asyncio.Task] = []
        
        # Instantiate agents
        self.agents = [
            MemoryLeakAgent(),
            CPUContentionAgent(),
            PVCSaturationAgent(),
            RetryStormAgent(),
            ClusterSRESupervisorAgent(),
            DependencyImpactAnalysisAgent(),
            StabilizationRecommendationAgent(),
            LogIntelligenceAgent(),
        ]

    async def start(self):
        self.running = True
        
        telemetry_queue = event_bus.subscribe("TelemetryMetricsEvent")
        anomaly_queue = event_bus.subscribe("AnomalyEvent")
        
        # Temporary buffers for legacy agent compatibility
        # In a fully refactored system, each agent maintains its own memory.
        latest_metrics = []
        latest_anomalies = []
        
        async def agent_runner():
            """
            This runner bridges the new event-driven architecture with the
            legacy synchronous agents. It waits for fresh telemetry, updates
            the buffers, and triggers the agent analysis loop.
            """
            from state_engine import state_engine
            
            while self.running:
                # Wait for a telemetry update to trigger an analysis cycle
                event = await telemetry_queue.get()
                latest_metrics = event.metrics
                
                # Fetch anomalies from the state engine for full context
                state = await state_engine.get_state()
                latest_anomalies = state.get("anomalies", [])
                graph = state.get("graph", {"nodes": [], "edges": []})
                
                # Fetch agent trust scores for dynamic ensemble weighting (Phase 9)
                trust_scores = state.get("agent_trust_scores", {})
                
                results = []
                # Run Tier 1-3 agents
                for agent in self.agents:
                    if agent.name != "Stabilization Recommendation Agent":
                        try:
                            agent.state = "ANALYZING"
                            start_time = time.time()
                            
                            result = agent.analyze(latest_metrics, latest_anomalies, graph)
                            
                            # --- Phase 9: Dynamic Weighting & Confidence Calibration ---
                            # Temper the agent's internal confidence with its historical trust score
                            trust = trust_scores.get(agent.name, 1.0)
                            # Calibrated Confidence = Internal Confidence * Historical Trust
                            result["confidence"] = round(result["confidence"] * trust, 2)
                            result["trust_score"] = trust # Expose for transparency
                            
                            latency = time.time() - start_time
                            agent.avg_execution_latency = (agent.avg_execution_latency * agent.execution_count + latency) / (agent.execution_count + 1)
                            agent.execution_count += 1
                            agent.state = "IDLE"
                            
                            results.append(result)
                            await event_bus.publish("AgentInsightEvent", {"insight": result})
                        except Exception as e:
                            agent.health = "DEGRADED"
                            print(f"Error in {agent.name}: {e}")

                # Run Tier 5 (Stabilization) agent
                for agent in self.agents:
                    if agent.name == "Stabilization Recommendation Agent":
                        try:
                            agent.state = "ANALYZING"
                            start_time = time.time()
                            
                            result = agent.analyze(latest_metrics, latest_anomalies, graph, results)
                            
                            # Apply weighting to the strategist as well
                            trust = trust_scores.get(agent.name, 1.0)
                            result["confidence"] = round(result["confidence"] * trust, 2)
                            result["trust_score"] = trust
                            
                            latency = time.time() - start_time
                            agent.avg_execution_latency = (agent.avg_execution_latency * agent.execution_count + latency) / (agent.execution_count + 1)
                            agent.execution_count += 1
                            agent.state = "IDLE"
                            
                            results.append(result)
                            await event_bus.publish("AgentInsightEvent", {"insight": result})
                        except Exception as e:
                            agent.health = "DEGRADED"
                            print(f"Error in {agent.name}: {e}")

        self.tasks.append(asyncio.create_task(agent_runner()))

    async def stop(self):
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()

agent_mesh = AgentMesh()
