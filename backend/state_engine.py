"""
KubeMind AI - Operational State Engine (Phase 2)

Centralizes the global operational truth of the cluster.
It subscribes to the event bus, updates the internal state cache,
and provides thread-safe access to this state.
"""
import asyncio
from typing import Dict, Any, List
import time

from event_bus import event_bus
import events
from data.simulator import simulator

# Centralized State Cache
STATE_CACHE: Dict[str, Any] = {
    "health": {
        "score": 100, "status": "healthy", "pod_count": 0,
        "anomaly_count": 0, "critical_count": 0, "warning_count": 0,
    },
    "pods": [],
    "anomalies": [],
    "graph": {"nodes": [], "edges": []},
    "correlations": [],
    "agents": [],
    "predictions": [],
    "agent_trust_scores": {}, 
    "active_strategies": {}, # Phase 11: evaluated stabilization plans
    "stabilization_mode": "RECOMMEND",
    "anomaly_mode": None,
    "tick": 0,
}

STATE_LOCK = asyncio.Lock()

def _cluster_health(metrics: list, anomalies: list) -> dict:
    """Calculates cluster health. Moved from main.py for state cohesion."""
    score = 100
    critical = sum(1 for a in anomalies if a["severity"] == "CRITICAL")
    warning  = sum(1 for a in anomalies if a["severity"] == "WARNING")
    for m in metrics:
        if m.get("status") not in ("Running", "Pending", "Succeeded"):
            score -= 20
    score -= critical * 15
    score -= warning * 5
    score = max(0, min(100, score))
    status = "healthy" if score > 80 else ("degraded" if score > 50 else "critical")
    return {
        "score": score, "status": status, "pod_count": len(metrics),
        "anomaly_count": len(anomalies), "critical_count": critical, "warning_count": warning,
    }

class StateEngine:
    def __init__(self):
        self.running = False
        self.tasks: List[asyncio.Task] = []

    async def start(self):
        """Starts the state aggregator workers."""
        self.running = True
        
        telemetry_queue = event_bus.subscribe("TelemetryMetricsEvent")
        anomaly_queue = event_bus.subscribe("AnomalyEvent")
        correlation_queue = event_bus.subscribe("CorrelationEvent")
        agent_queue = event_bus.subscribe("AgentInsightEvent")
        prediction_queue = event_bus.subscribe("PredictionEvent")
        feedback_queue = event_bus.subscribe("CognitiveFeedbackEvent")
        strategy_queue = event_bus.subscribe("StrategyEvent")

        async def consume_telemetry():
            while self.running:
                event: events.TelemetryMetricsEvent = await telemetry_queue.get()
                async with STATE_LOCK:
                    STATE_CACHE["pods"] = event.metrics
                    if event.metrics:
                        STATE_CACHE["tick"] = event.metrics[0].get("tick", STATE_CACHE["tick"])
                    STATE_CACHE["anomaly_mode"] = simulator.anomaly_mode
                    
                    health = _cluster_health(event.metrics, STATE_CACHE["anomalies"])
                    STATE_CACHE["health"] = health

        async def consume_anomalies():
            local_anomaly_buffer = []
            while self.running:
                event: events.AnomalyEvent = await anomaly_queue.get()
                local_anomaly_buffer.append(event.anomaly)
                if len(local_anomaly_buffer) > 100:
                    local_anomaly_buffer.pop(0)
                async with STATE_LOCK:
                    STATE_CACHE["anomalies"] = list(local_anomaly_buffer)

        async def consume_correlations():
            while self.running:
                event: events.CorrelationEvent = await correlation_queue.get()
                async with STATE_LOCK:
                    STATE_CACHE["correlations"] = [event.correlation]

        async def consume_agent_insights():
            agent_map = {}
            while self.running:
                event: events.AgentInsightEvent = await agent_queue.get()
                agent_name = event.insight["agent"]
                agent_map[agent_name] = event.insight
                
                async with STATE_LOCK:
                    STATE_CACHE["agents"] = list(agent_map.values())

        async def consume_predictions():
            local_prediction_map = {} # pod_id:metric -> prediction
            while self.running:
                event: events.PredictionEvent = await prediction_queue.get()
                p = event.prediction
                key = f"{p['pod_id']}:{p['metric']}"
                local_prediction_map[key] = p
                
                async with STATE_LOCK:
                    sorted_p = sorted(local_prediction_map.values(), key=lambda x: x["ttf_minutes"])
                    STATE_CACHE["predictions"] = sorted_p[:5]

        async def consume_feedback():
            while self.running:
                event: events.CognitiveFeedbackEvent = await feedback_queue.get()
                async with STATE_LOCK:
                    for agent in event.impacted_agents:
                        current = STATE_CACHE["agent_trust_scores"].get(agent, 0.85)
                        new_score = (current * 0.9) + (event.accuracy_score * 0.1)
                        STATE_CACHE["agent_trust_scores"][agent] = round(new_score, 3)

        async def consume_strategies():
            while self.running:
                event: events.StrategyEvent = await strategy_queue.get()
                async with STATE_LOCK:
                    # Map strategy to its parent correlation
                    STATE_CACHE["active_strategies"][event.correlation_id] = {
                        "strategies": [s.dict() for s in event.strategies],
                        "recommended_index": event.recommended_strategy_index,
                        "timestamp": event.timestamp
                    }

        self.tasks.extend([
            asyncio.create_task(consume_telemetry()),
            asyncio.create_task(consume_anomalies()),
            asyncio.create_task(consume_correlations()),
            asyncio.create_task(consume_agent_insights()),
            asyncio.create_task(consume_predictions()),
            asyncio.create_task(consume_feedback()),
            asyncio.create_task(consume_strategies())
        ])

    async def stop(self):
        """Stops the state aggregator workers."""
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()

    async def get_state(self) -> Dict[str, Any]:
        """Returns a deep copy of the current state."""
        async with STATE_LOCK:
            return {k: v[:] if isinstance(v, list) else v for k, v in STATE_CACHE.items()}

# Singleton instance
state_engine = StateEngine()
