"""
Trend Analysis Engine — tracks metric history to detect slow-burn patterns.
"""
from typing import List, Dict, Any, Optional
from collections import deque


class TrendEngine:
    def __init__(self, window_size: int = 120):
        self.history: Dict[str, Dict[str, deque]] = {}
        self.window_size = window_size

    def update(self, metrics: List[Dict[str, Any]]):
        for m in metrics:
            pid = m["pod_id"]
            if pid not in self.history:
                self.history[pid] = {
                    "namespace": m.get("namespace"),
                    "cpu_percent": deque(maxlen=self.window_size),
                    "memory_pct":  deque(maxlen=self.window_size),
                    "latency_ms":  deque(maxlen=self.window_size),
                }
            self.history[pid]["cpu_percent"].append(m.get("cpu_percent", 0))
            mem_pct = m.get("memory_pct")
            if mem_pct is None:
                mem_pct = (m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1)) * 100
            self.history[pid]["memory_pct"].append(mem_pct)
            self.history[pid]["latency_ms"].append(m.get("latency_ms", 0))

    def get_trends(self, pod_id: str) -> Dict[str, Any]:
        if pod_id not in self.history:
            return {}
        trends = {}
        for metric, values in self.history[pod_id].items():
            if len(values) < 10:
                trends[metric] = "stable"
                continue
            v = list(values)
            mid = len(v) // 2
            avg_first  = sum(v[:mid]) / max(mid, 1)
            avg_second = sum(v[mid:]) / max(len(v) - mid, 1)
            diff_pct = (avg_second - avg_first) / max(avg_first, 1)
            if diff_pct > 0.15:
                trends[metric] = "increasing"
            elif diff_pct < -0.15:
                trends[metric] = "decreasing"
            else:
                trends[metric] = "stable"
        return trends

    def detect_leaks(self) -> List[Dict[str, Any]]:
        """Detect pods with monotonically increasing memory (potential leaks)."""
        leaks = []
        for pid, pod_hist in self.history.items():
            mem_vals = list(pod_hist["memory_pct"])   # fixed: was "memory"
            if len(mem_vals) < 60:
                continue
            avg_start = sum(mem_vals[:10]) / 10
            avg_end   = sum(mem_vals[-10:]) / 10
            is_monotonic = all(mem_vals[i] <= mem_vals[i + 1] for i in range(len(mem_vals) - 1))
            if avg_end > avg_start * 1.2:
                leaks.append({
                    "pod_id":     pid,
                    "growth_pct": round(avg_end - avg_start, 2),
                    "confidence": 0.85 if is_monotonic else 0.60,
                })
        return leaks

    def predict_failures(self, namespace: Optional[str] = None) -> list:
        """Linear extrapolation predictor. Returns TTF in minutes for pods near critical thresholds."""
        from engines.anomaly_detector import THRESHOLDS
        predictions = []
        TICKS_PER_MINUTE = 30  # 2s per tick

        for pod_id, pod_hist in self.history.items():
            if namespace and namespace != "all" and pod_hist.get("namespace") != namespace:
                continue

            for metric, deq in pod_hist.items():
                if not isinstance(deq, deque): continue # Skip non-metric data like 'namespace'
                values = list(deq)
                if len(values) < 15:
                    continue
                recent = values[-15:]
                # Linear regression slope
                n = len(recent)
                xs = list(range(n))
                x_mean = sum(xs) / n
                y_mean = sum(recent) / n
                num = sum((xs[i] - x_mean) * (recent[i] - y_mean) for i in range(n))
                den = sum((xs[i] - x_mean) ** 2 for i in range(n))
                slope = num / den if den != 0 else 0

                if slope <= 0:
                    continue  # Not growing, skip

                current = recent[-1]
                threshold = THRESHOLDS.get(metric, {}).get("critical")
                if threshold is None or current >= threshold:
                    continue

                ticks_to_critical = (threshold - current) / slope
                if ticks_to_critical <= 0 or ticks_to_critical > 1800:
                    continue

                ttf_minutes = round(ticks_to_critical / TICKS_PER_MINUTE, 1)
                confidence = round(min(0.95, 0.6 + abs(slope) * 10), 2)
                predictions.append({
                    "pod_id":    pod_id,
                    "metric":    metric,
                    "current":   round(current, 2),
                    "threshold": threshold,
                    "slope_per_tick": round(slope, 4),
                    "ttf_minutes":    ttf_minutes,
                    "confidence":     confidence,
                    "severity":  "CRITICAL" if ttf_minutes < 10 else "WARNING",
                })

        return sorted(predictions, key=lambda p: p["ttf_minutes"])[:5]


# Singleton
trend_engine = TrendEngine()
