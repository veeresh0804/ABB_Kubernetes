# backend/tests/test_anomaly_detector.py
import pytest
import time
from collections import deque
from engines.anomaly_detector import detect, WINDOWS, LAST_SEEN, TTL_SECONDS, THRESHOLDS

# Fixture to clear WINDOWS and LAST_SEEN before each test
@pytest.fixture(autouse=True)
def clear_state():
    WINDOWS.clear()
    LAST_SEEN.clear()

def get_base_metric(pod_id: str, metric_name: str, value: float, timestamp: float = None):
    return {
        "pod_id": pod_id,
        "pod_name": f"{pod_id}-name",
        "namespace": "test-ns",
        "cpu_percent": 0, "memory_mb": 0, "memory_limit_mb": 1, # Dummy values
        "pvc_write_mbps": 0, "pvc_read_mbps": 0, "latency_ms": 0, "restarts": 0,
        metric_name: value,
        "timestamp": timestamp if timestamp is not None else time.time()
    }

def test_detect_no_anomaly_initial():
    metrics = [
        get_base_metric("pod-1", "cpu_percent", 10),
        get_base_metric("pod-2", "memory_pct", 20),
    ]
    anomalies = detect(metrics)
    assert len(anomalies) == 0

def test_detect_warning_threshold():
    metrics = [
        get_base_metric("pod-1", "cpu_percent", THRESHOLDS["cpu_percent"]["warning"] + 1),
    ]
    anomalies = detect(metrics)
    assert len(anomalies) == 1
    assert anomalies[0]["pod_id"] == "pod-1"
    assert anomalies[0]["metric"] == "cpu_percent"
    assert anomalies[0]["severity"] == "WARNING"

def test_detect_critical_threshold():
    metrics = [
        get_base_metric("pod-1", "cpu_percent", THRESHOLDS["cpu_percent"]["critical"] + 1),
    ]
    anomalies = detect(metrics)
    assert len(anomalies) == 1
    assert anomalies[0]["pod_id"] == "pod-1"
    assert anomalies[0]["metric"] == "cpu_percent"
    assert anomalies[0]["severity"] == "CRITICAL"

def test_detect_stddev_anomaly():
    # Fill deque with normal values first
    pod_id = "pod-stddev"
    metric = "latency_ms"
    current_time = time.time()
    
    # 10 normal readings
    for i in range(10):
        metrics = [get_base_metric(pod_id, metric, 50, timestamp=current_time + i)]
        detect(metrics) # Populate window

    # Then a spike
    metrics = [get_base_metric(pod_id, metric, 150, timestamp=current_time + 11)] # Spike
    anomalies = detect(metrics)
    
    assert len(anomalies) == 1
    assert anomalies[0]["pod_id"] == pod_id
    assert anomalies[0]["metric"] == metric
    assert anomalies[0]["severity"] == "WARNING" # Default for stddev if not critical threshold

def test_evict_stale_pods():
    # Add a pod that will become stale
    stale_pod_id = "stale-pod"
    active_pod_id = "active-pod"
    
    detect([get_base_metric(stale_pod_id, "cpu_percent", 10, timestamp=time.time() - TTL_SECONDS - 1)])
    detect([get_base_metric(active_pod_id, "cpu_percent", 10, timestamp=time.time())])
    
    assert stale_pod_id in WINDOWS
    assert active_pod_id in WINDOWS
    assert stale_pod_id in LAST_SEEN
    assert active_pod_id in LAST_SEEN

    # Run detect again to trigger eviction
    detect([get_base_metric(active_pod_id, "cpu_percent", 10, timestamp=time.time() + 1)])
    
    assert stale_pod_id not in WINDOWS
    assert stale_pod_id not in LAST_SEEN
    assert active_pod_id in WINDOWS
    assert active_pod_id in LAST_SEEN

def test_deduplicate_anomalies():
    metrics = [
        get_base_metric("pod-1", "cpu_percent", THRESHOLDS["cpu_percent"]["warning"] + 1),
        get_base_metric("pod-1", "cpu_percent", THRESHOLDS["cpu_percent"]["critical"] + 1), # Higher severity for same pod+metric
    ]
    anomalies = detect(metrics)
    assert len(anomalies) == 1
    assert anomalies[0]["pod_id"] == "pod-1"
    assert anomalies[0]["metric"] == "cpu_percent"
    assert anomalies[0]["severity"] == "CRITICAL" # Ensure higher severity is kept
