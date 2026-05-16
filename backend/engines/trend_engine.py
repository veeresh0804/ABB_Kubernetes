"""
Trend Analysis Engine — tracks metric history to detect long-term patterns.
"""
from typing import List, Dict, Any, Optional
from collections import deque
import statistics
import time

class TrendEngine:
    def __init__(self, window_size: int = 120):
        self.history: Dict[str, Dict[str, deque]] = {}
        self.window_size = window_size

    def update(self, metrics: List[Dict[str, Any]]):
        for m in metrics:
            pid = m["pod_id"]
            if pid not in self.history:
                self.history[pid] = {
                    "cpu_percent": deque(maxlen=self.window_size),
                    "memory_pct": deque(maxlen=self.window_size),
                    "latency_ms": deque(maxlen=self.window_size),
                }
            
            self.history[pid]["cpu_percent"].append(m.get("cpu_percent", 0))
            
            # Use pre-calculated memory_pct if available, else calc
            mem_pct = m.get("memory_pct")
            if mem_pct is None:
                mem_pct = (m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1)) * 100
                
            self.history[pid]["memory_pct"].append(mem_pct)
            self.history[pid]["latency_ms"].append(m.get("latency_ms", 0))

    def get_trends(self, pod_id: str) -> Dict[str, Any]:
        if pod_id not in self.history:
            return {}
        
        pod_hist = self.history[pod_id]
        trends = {}
        
        for metric, values in pod_hist.items():
            if len(values) < 10:
                trends[metric] = "stable"
                continue
            
            # Simple linear trend detection
            v_list = list(values)
            first_half = v_list[:len(v_list)//2]
            second_half = v_list[len(v_list)//2:]
            
            avg_first = sum(first_half) / len(first_half)
            avg_second = sum(second_half) / len(second_half)
            
            diff_pct = (avg_second - avg_first) / max(avg_first, 1)
            
            if diff_pct > 0.15:
                trends[metric] = "increasing"
            elif diff_pct < -0.15:
                trends[metric] = "decreasing"
            else:
                trends[metric] = "stable"
                
        return trends

    def detect_leaks(self) -> List[Dict[str, Any]]:
        leaks = []
        for pid, pod_hist in self.history.items():
            mem_vals = list(pod_hist["memory"])
            if len(mem_vals) < 60: continue
            
            # Look for monotonic increase
            is_increasing = all(mem_vals[i] <= mem_vals[i+1] for i in range(len(mem_vals)-1))
            
            # Or use a simpler slope check
            avg_start = sum(mem_vals[:10]) / 10
            avg_end = sum(mem_vals[-10:]) / 10
            
            if avg_end > avg_start * 1.2: # 20% growth
                leaks.append({
                    "pod_id": pid,
                    "growth_mb": round(avg_end - avg_start, 2),
                    "confidence": 0.85 if is_increasing else 0.6
                })
        return leaks

# Singleton
trend_engine = TrendEngine()
