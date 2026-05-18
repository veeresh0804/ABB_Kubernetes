"""Anomaly detection engine — statistical sliding-window detection."""
import time
from typing import List, Dict, Any
from collections import deque
import statistics

THRESHOLDS = {
    "cpu_percent":      {"warning": 65.0,  "critical": 85.0},
    "memory_pct":       {"warning": 75.0,  "critical": 90.0},
    "pvc_write_mbps":   {"warning": 3.0,   "critical": 6.0},
    "pvc_read_mbps":    {"warning": 4.0,   "critical": 7.0},
    "latency_ms":       {"warning": 80.0,  "critical": 150.0},
    "restarts":         {"warning": 1,     "critical": 3},
}

WINDOWS: Dict[str, Dict[str, deque]] = {}  # pod_id → metric → deque


def _get_window(pod_id: str, metric: str, maxlen: int = 60) -> deque:
    if pod_id not in WINDOWS:
        WINDOWS[pod_id] = {}
    if metric not in WINDOWS[pod_id]:
        WINDOWS[pod_id][metric] = deque(maxlen=maxlen)
    return WINDOWS[pod_id][metric]


def _stddev_anomaly(values: list, current: float, z: float = 2.5) -> bool:
    if len(values) < 10:
        return False
    mean = statistics.mean(values)
    try:
        stdev = statistics.stdev(values)
    except statistics.StatisticsError:
        return False
    return current > mean + z * stdev


def detect(metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    anomalies = []
    for m in metrics:
        pid = m["pod_id"]
        memory_pct = round(m["memory_mb"] / max(m["memory_limit_mb"], 1) * 100, 1)
        m["memory_pct"] = memory_pct

        checks = {
            "cpu_percent":    m["cpu_percent"],
            "memory_pct":     memory_pct,
            "pvc_write_mbps": m.get("pvc_write_mbps", 0),
            "pvc_read_mbps":  m.get("pvc_read_mbps", 0),
            "latency_ms":     m.get("latency_ms", 0),
            "restarts":       m.get("restarts", 0),
        }
        for metric, value in checks.items():
            w = _get_window(pid, metric)
            w.append(value)
            hist = list(w)
            thres = THRESHOLDS.get(metric, {})
            severity = None
            if value >= thres.get("critical", float("inf")):
                severity = "CRITICAL"
            elif value >= thres.get("warning", float("inf")):
                severity = "WARNING"
            elif _stddev_anomaly(hist[:-1], value):
                severity = "WARNING"

            if severity:
                anomalies.append({
                    "pod_id":   pid,
                    "pod_name": m["pod_name"],
                    "metric":   metric,
                    "value":    value,
                    "severity": severity,
                    "threshold": thres.get(severity.lower(), value),
                    "timestamp": m.get("timestamp", time.time()),
                    "message":  _message(pid, metric, value, severity),
                })

        # Status-based anomaly
        status = m.get("status", "Running")
        if status not in ("Running", "Pending"):
            anomalies.append({
                "pod_id":   pid,
                "pod_name": m["pod_name"],
                "metric":   "pod_status",
                "value":    status,
                "severity": "CRITICAL" if status in ("CrashLoopBackOff", "OOMKilled") else "WARNING",
                "threshold": "Running",
                "timestamp": m.get("timestamp", time.time()),
                "message":  f"{m['pod_name']} status is {status}",
            })

    # Deduplicate: keep highest severity per pod+metric
    seen = {}
    for a in anomalies:
        key = (a["pod_id"], a["metric"])
        if key not in seen or _sev_rank(a["severity"]) > _sev_rank(seen[key]["severity"]):
            seen[key] = a
    return list(seen.values())


def _sev_rank(s: str) -> int:
    return {"INFO": 0, "WARNING": 1, "CRITICAL": 2}.get(s, 0)


def _message(pod: str, metric: str, value: float, severity: str) -> str:
    msgs = {
        "cpu_percent":    f"{pod} CPU at {value:.1f}% — {'critical spike' if severity=='CRITICAL' else 'elevated usage'}",
        "memory_pct":     f"{pod} memory at {value:.1f}% — {'OOMKill risk' if severity=='CRITICAL' else 'pressure detected'}",
        "pvc_write_mbps": f"{pod} PVC write {value:.2f} MB/s — {'storage saturation' if severity=='CRITICAL' else 'high write amplification'}",
        "pvc_read_mbps":  f"{pod} PVC read {value:.2f} MB/s — {'I/O bottleneck' if severity=='CRITICAL' else 'elevated read load'}",
        "latency_ms":     f"{pod} latency {value:.0f}ms — {'severe degradation' if severity=='CRITICAL' else 'response slow'}",
        "restarts":       f"{pod} has restarted {int(value)} time(s) — {'crash loop suspected' if value>=3 else 'instability detected'}",
    }
    return msgs.get(metric, f"{pod} {metric}={value} [{severity}]")
