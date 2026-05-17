"""
KubeMind AI - Predictive Intelligence Layer (Phase 6)

This module implements predictive operational intelligence.
It analyzes historical metric trends, anomaly patterns, and topology
relationships to forecast future instability, degradation, and failures.
"""
import asyncio
from typing import List, Dict, Any, Optional
import time
from collections import deque

from event_bus import event_bus
import events
from knowledge_graph import knowledge_graph

class PredictiveLayer:
    def __init__(self):
        self.running = False
        self.tasks: List[asyncio.Task] = []
        self.TICKS_PER_MINUTE = 30 # 2s per tick
        
        # Priority 5: Stability Memory
        # (pod_id, metric) -> deque of recent TTF predictions
        self.prediction_history: Dict[tuple, deque] = {}
        self.MIN_CONFIDENCE = 0.70
        self.SMOOTHING_WINDOW = 5

    async def start(self):
        self.running = True
        
        telemetry_queue = event_bus.subscribe("TelemetryMetricsEvent")

        async def consume_telemetry():
            while self.running:
                event: events.TelemetryMetricsEvent = await telemetry_queue.get()
                await self.analyze_trends(event.metrics)

        self.tasks.append(asyncio.create_task(consume_telemetry()))

    async def stop(self):
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()

    async def analyze_trends(self, metrics: List[Dict[str, Any]]):
        """
        Performs advanced trend analysis with temporal smoothing and 
        consensus dampening to ensure prediction stability.
        """
        from engines.anomaly_detector import THRESHOLDS
        from engines.trend_engine import trend_engine

        for m in metrics:
            pod_id = m["pod_id"]
            trends = trend_engine.get_trends(pod_id)
            if not trends: continue

            for metric_name, data in trends.items():
                if metric_name not in THRESHOLDS: continue
                
                threshold = THRESHOLDS[metric_name].get("critical")
                if threshold is None: continue

                values = data.get("values", [])
                if len(values) < 15: continue
                
                recent = values[-15:]
                n = len(recent)
                xs = list(range(n))
                x_mean = sum(xs) / n
                y_mean = sum(recent) / n
                num = sum((xs[i] - x_mean) * (recent[i] - y_mean) for i in range(n))
                den = sum((xs[i] - x_mean) ** 2 for i in range(n))
                slope = num / den if den != 0 else 0

                if slope <= 0: continue

                current = recent[-1]
                if current >= threshold: continue

                ticks_to_crit = (threshold - current) / slope
                if ticks_to_crit <= 0 or ticks_to_crit > 1800: continue

                raw_ttf = round(ticks_to_crit / self.TICKS_PER_MINUTE, 1)
                confidence = round(min(0.95, 0.6 + abs(slope) * 10), 2)

                # --- Priority 5: Temporal Smoothing & Dampening ---
                key = (pod_id, metric_name)
                if key not in self.prediction_history:
                    self.prediction_history[key] = deque(maxlen=self.SMOOTHING_WINDOW)
                
                self.prediction_history[key].append(raw_ttf)
                
                # Only proceed if we have a sustained trend and high confidence
                if len(self.prediction_history[key]) < 3 or confidence < self.MIN_CONFIDENCE:
                    continue

                # Calculate smoothed TTF (moving average)
                smoothed_ttf = round(sum(self.prediction_history[key]) / len(self.prediction_history[key]), 1)

                topology = await knowledge_graph.get_topology("all")
                blast_radius = 1 
                for edge in topology.get("edges", []):
                    if edge["source"] == pod_id:
                        blast_radius += 1

                # --- Phase 13: Multi-Horizon Forecasting ---
                prediction = {
                    "pod_id": pod_id,
                    "pod_name": m["pod_name"],
                    "namespace": m["namespace"],
                    "metric": metric_name,
                    "ttf_minutes": smoothed_ttf,
                    "confidence": confidence,
                    "severity": "CRITICAL" if smoothed_ttf < 10 else "WARNING",
                    "estimated_blast_radius": blast_radius,
                    "type": "RESOURCE_EXHAUSTION",
                    "timestamp": time.time(),
                    "horizons": {
                        "immediate": {"stability": "UNSTABLE" if smoothed_ttf < 5 else "STABLE", "risk": 0.9 if smoothed_ttf < 5 else 0.2},
                        "short_term": {"stability": "CRITICAL" if smoothed_ttf < 60 else "DEGRADED", "risk": 0.8},
                        "long_term": {"stability": "FRAGILE", "risk": 0.5}
                    }
                }

                await event_bus.publish("PredictionEvent", events.PredictionEvent(prediction=prediction))

# Singleton instance
predictive_layer = PredictiveLayer()
