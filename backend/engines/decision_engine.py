"""
KubeMind AI - Operational Decision Engine (Phase 11)

This module implements Decision Intelligence. 
It evaluates multiple potential operational actions by querying the Digital Twin
for counterfactual outcomes, and generates optimal Stabilization Plans.
"""
import asyncio
from typing import List, Dict, Any
import time

from event_bus import event_bus
import events
from data.simulator import simulator

class DecisionEngine:
    def __init__(self):
        self.running = False
        self.tasks: List[asyncio.Task] = []

    async def start(self):
        self.running = True
        
        correlation_queue = event_bus.subscribe("CorrelationEvent")

        async def watch_incidents():
            while self.running:
                event: events.CorrelationEvent = await correlation_queue.get()
                await self.evaluate_mitigations(event)

        self.tasks.append(asyncio.create_task(watch_incidents()))

    async def stop(self):
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)

    async def evaluate_mitigations(self, event: events.CorrelationEvent):
        """
        Phase 11: Action Evaluation.
        Generates and tests multiple 'what-if' scenarios for an incident.
        """
        inc = event.correlation
        root_pod = inc.get("root_cause_pod")
        if not root_pod: return

        # Define candidate actions
        candidate_actions = ["restart_pod", "scale_deployment", "throttle_traffic"]
        evaluations = []

        for action in candidate_actions:
            # --- Counterfactual Simulation (What-if?) ---
            outcome = simulator.evaluate_strategy(action, root_pod)
            
            evaluations.append(events.ActionEvaluation(
                action=action,
                target=root_pod,
                predicted_recovery_prob=outcome["predicted_recovery_prob"],
                risk_score=outcome["estimated_risk_score"],
                reasoning=f"Counterfactual simulation predicts {outcome['expected_outcome']} state."
            ))

        # Sort by best probability and lowest risk
        evaluations.sort(key=lambda x: (x.predicted_recovery_prob, -x.risk_score), reverse=True)

        # Publish the finalized Stabilization Strategy
        await event_bus.publish("StrategyEvent", events.StrategyEvent(
            correlation_id=event.event_id,
            strategies=evaluations,
            recommended_strategy_index=0
        ))

# Singleton instance
decision_engine = DecisionEngine()
