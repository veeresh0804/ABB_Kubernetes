"""
KubeMind AI - Cognitive Feedback Loop & Truth Observer (Phase 9)

This module closes the loop between prediction and reality.
It monitors the actual infrastructure outcome after an AI prediction
and emits FeedbackEvents to adjust agent trust scores.
"""
import asyncio
import time
from typing import List, Dict, Any

from event_bus import event_bus
import events

class TruthObserver:
    def __init__(self):
        self.pending_verifications: Dict[str, Dict[str, Any]] = {}
        self.latest_metrics: List[Dict] = []
        self.running = False
        self.tasks: List[asyncio.Task] = []

    async def start(self):
        self.running = True
        
        prediction_queue = event_bus.subscribe("PredictionEvent")
        telemetry_queue = event_bus.subscribe("TelemetryMetricsEvent")

        async def watch_predictions():
            while self.running:
                event: events.PredictionEvent = await prediction_queue.get()
                p = event.prediction
                verify_at = time.time() + (p.get("ttf_minutes", 5) * 60)
                self.pending_verifications[event.event_id] = {
                    "pod_id": p.get("pod_id", ""),
                    "metric": p.get("metric", ""),
                    "verify_at": verify_at,
                    "prediction_data": p
                }

        async def capture_metrics():
            while self.running:
                event = await telemetry_queue.get()
                self.latest_metrics = event.metrics

        async def verify_outcomes():
            """Periodically check if pending predictions came true."""
            while self.running:
                now = time.time()
                to_remove = []
                
                for event_id, data in self.pending_verifications.items():
                    if now >= data["verify_at"]:
                        pod_id = data["pod_id"]
                        pod = next(
                            (m for m in self.latest_metrics if m.get("pod_id") == pod_id),
                            None
                        )
                        status = (pod or {}).get("status", "")
                        restarts = (pod or {}).get("restarts", 0)
                        failed = status in ("CrashLoopBackOff", "OOMKilled", "Error", "Init:Error")
                        outcome = "CONFIRMED" if failed or restarts > 2 else "DISMISSED"
                        accuracy = 0.92 if outcome == "CONFIRMED" else 0.15
                        
                        await event_bus.publish("CognitiveFeedbackEvent", events.CognitiveFeedbackEvent(
                            target_event_id=event_id,
                            outcome=outcome,
                            accuracy_score=accuracy,
                            impacted_agents=["PredictiveLayer"] 
                        ))
                        to_remove.append(event_id)
                
                for eid in to_remove:
                    del self.pending_verifications[eid]
                
                await asyncio.sleep(10)

        self.tasks.extend([
            asyncio.create_task(watch_predictions()),
            asyncio.create_task(capture_metrics()),  # FIX: Added missing task
            asyncio.create_task(verify_outcomes())
        ])

    async def stop(self):
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)

# Singleton
truth_observer = TruthObserver()
