"""
Correlation Engine — determines causal chains between anomalies.
Maps multi-service anomaly patterns to root causes and causal chains.
"""
from typing import List, Dict, Any


# ── Rule definitions ───────────────────────────────────────────────────────────
# Each rule: condition fn(anomaly_map) → chain description
RULES = [
    {
        "id": "pvc_cascade",
        "name": "PVC Storage Cascade",
        "priority": 100,
        "condition": lambda am: (
            am.get("postgres-db", {}).get("pvc_write_mbps") == "CRITICAL" or
            am.get("postgres-db", {}).get("pvc_read_mbps") == "CRITICAL"
        ),
        "root_cause": "postgres-db",
        "root_metric": "pvc_write_mbps",
        "chain": [
            "postgres-db PVC write I/O saturated",
            "postgres-db query latency spike (>150ms)",
            "auth-service database retries increasing",
            "auth-service CPU elevated due to retry storms",
            "frontend-service response latency degrading",
        ],
        "summary": (
            "PostgreSQL PVC write latency has saturated storage I/O. "
            "This is causing cascading service degradation: auth-service is "
            "experiencing retry storms against the database, which in turn is "
            "increasing auth response times and causing frontend-service "
            "to appear slow to end users. Root fix: expand PVC IOPS or "
            "reduce postgres write amplification."
        ),
        "severity": "CRITICAL",
        "affected_pods": ["postgres-db", "auth-service", "frontend-service"],
        "recommendations": [
            "Expand PVC storage class IOPS limits for postgres-db",
            "Enable PostgreSQL connection pooling (PgBouncer) to reduce retry pressure",
            "Add read replicas to offload auth-service queries",
            "Temporarily scale auth-service replicas from 2→4 to absorb retry load",
            "Set auth-service circuit breaker timeout to 500ms to prevent cascades",
        ],
    },
    {
        "id": "redis_memory_leak",
        "name": "Redis Memory Leak",
        "priority": 90,
        "condition": lambda am: (
            am.get("redis-cache", {}).get("memory_pct") in ("WARNING", "CRITICAL")
        ),
        "root_cause": "redis-cache",
        "root_metric": "memory_pct",
        "chain": [
            "redis-cache memory usage growing abnormally",
            "Redis eviction policy under pressure",
            "auth-service cache miss rate increasing",
            "auth-service falling back to postgres-db for every request",
            "postgres-db query load increasing",
        ],
        "summary": (
            "redis-cache memory is growing continuously — indicative of a memory leak "
            "or missing TTL on cached keys. As Redis approaches capacity, the eviction "
            "policy causes cache misses in auth-service, forcing it to query postgres-db "
            "on every request. This increases database load and risks an OOMKill event "
            "on the Redis pod, which would cause full auth-service degradation."
        ),
        "severity": "CRITICAL",
        "affected_pods": ["redis-cache", "auth-service", "postgres-db"],
        "recommendations": [
            "Audit Redis key TTLs — ensure all session keys have expiry set",
            "Enable Redis maxmemory-policy=allkeys-lru to enable automatic eviction",
            "Increase redis-cache memory limit from current to 4Gi",
            "Deploy Redis Exporter to track eviction rate in real time",
            "Consider Redis Cluster mode for horizontal memory scaling",
        ],
    },
    {
        "id": "payment_cpu_storm",
        "name": "Payment Service CPU Storm",
        "priority": 80,
        "condition": lambda am: (
            am.get("payment-service", {}).get("cpu_percent") == "CRITICAL"
        ),
        "root_cause": "payment-service",
        "root_metric": "cpu_percent",
        "chain": [
            "payment-service CPU spiking to critical levels",
            "Payment processing threads saturated",
            "payment-service latency increasing",
            "frontend-service checkout flow degrading",
        ],
        "summary": (
            "payment-service is experiencing a CPU storm — likely caused by a workload "
            "burst or an infinite retry loop in transaction processing. CPU saturation "
            "is causing payment API response times to increase significantly, which "
            "frontend-service users experience as slow checkout. This pattern is "
            "consistent with unbounded concurrency or a missing rate limit."
        ),
        "severity": "WARNING",
        "affected_pods": ["payment-service", "frontend-service"],
        "recommendations": [
            "Scale payment-service horizontally: increase replicas from 3→6",
            "Add CPU limits to payment-service pod spec (currently unbounded)",
            "Enable Horizontal Pod Autoscaler (HPA) with CPU threshold at 60%",
            "Audit recent code deployments for missing async/await patterns",
            "Add circuit breaker in frontend-service for payment API calls",
        ],
    },
    {
        "id": "multi_pod_latency",
        "name": "Multi-Service Latency Spike",
        "priority": 70,
        "condition": lambda am: (
            sum(1 for pod_am in am.values()
                if pod_am.get("latency_ms") in ("WARNING", "CRITICAL")) >= 2
        ),
        "root_cause": "network",
        "root_metric": "latency_ms",
        "chain": [
            "Multiple services showing elevated latency simultaneously",
            "Possible shared infrastructure bottleneck",
            "Network or node-level resource contention suspected",
        ],
        "summary": (
            "Multiple services are showing elevated latency simultaneously. "
            "This pattern suggests a shared infrastructure bottleneck — potentially "
            "network congestion on the cluster fabric, node CPU/memory pressure, "
            "or a shared database connection pool exhaustion."
        ),
        "severity": "WARNING",
        "affected_pods": [],
        "recommendations": [
            "Check node-level CPU and memory utilization across all nodes",
            "Review network bandwidth utilization between nodes",
            "Check for noisy-neighbor pods consuming excessive cluster resources",
            "Consider deploying dedicated nodes for database workloads",
        ],
    },
]


def correlate(anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Match current anomalies to causal chain rules."""
    # Build anomaly map: pod_id → metric → severity
    amap: Dict[str, Dict[str, str]] = {}
    for a in anomalies:
        pid = a["pod_id"]
        if pid not in amap:
            amap[pid] = {}
        amap[pid][a["metric"]] = a["severity"]

    results = []
    triggered_ids = set()
    for rule in sorted(RULES, key=lambda r: -r["priority"]):
        if rule["id"] in triggered_ids:
            continue
        try:
            if rule["condition"](amap):
                # Resolve affected pods for generic rules
                affected = rule["affected_pods"] or [a["pod_id"] for a in anomalies]
                results.append({
                    "rule_id":       rule["id"],
                    "name":          rule["name"],
                    "severity":      rule["severity"],
                    "root_cause_pod": rule["root_cause"],
                    "root_metric":   rule["root_metric"],
                    "causal_chain":  rule["chain"],
                    "summary":       rule["summary"],
                    "affected_pods": affected,
                    "recommendations": rule["recommendations"],
                })
                triggered_ids.add(rule["id"])
        except Exception:
            pass

    return results
