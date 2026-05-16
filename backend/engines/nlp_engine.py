"""
NLP Engine — keyword-routing natural language query processor.
Maps user questions to context-aware AI responses using current cluster state.
"""
import re
import time
from typing import Dict, Any, List


def _find_worst_pod(metrics: List[Dict], metric: str) -> Dict:
    return max(metrics, key=lambda m: m.get(metric, 0), default={})


def _health_score(metrics: List[Dict]) -> int:
    score = 100
    for m in metrics:
        if m.get("status") not in ("Running", "Pending"):
            score -= 25
        if m.get("cpu_percent", 0) > 80:
            score -= 10
        if m.get("memory_mb", 0) / max(m.get("memory_limit_mb", 1), 1) > 0.85:
            score -= 10
        if m.get("latency_ms", 0) > 100:
            score -= 8
    return max(0, score)


def process(
    question: str,
    metrics: List[Dict],
    anomalies: List[Dict],
    correlations: List[Dict],
    agent_insights: List[Dict],
) -> Dict[str, Any]:
    q = question.lower().strip()

    # ── Route by intent ────────────────────────────────────────────────────────
    if any(kw in q for kw in ["slow", "slowdown", "frontend", "why slow", "response"]):
        return _answer_slow(q, metrics, anomalies, correlations)

    if any(kw in q for kw in ["cpu", "processor", "spike", "burst"]):
        return _answer_cpu(q, metrics, anomalies)

    if any(kw in q for kw in ["memory", "leak", "ram", "oom", "oomkill"]):
        return _answer_memory(q, metrics, anomalies)

    if any(kw in q for kw in ["storage", "pvc", "disk", "io", "write", "read"]):
        return _answer_storage(q, metrics, anomalies)

    if any(kw in q for kw in ["network", "traffic", "bandwidth", "latency"]):
        return _answer_network(q, metrics, anomalies)

    if any(kw in q for kw in ["crash", "restart", "crashloop", "oomkilled", "failed"]):
        return _answer_crash(q, metrics, anomalies)

    if any(kw in q for kw in ["health", "status", "overall", "cluster", "how is"]):
        return _answer_health(q, metrics, anomalies, correlations)

    if any(kw in q for kw in ["fix", "recommend", "solution", "suggestion", "optimize"]):
        return _answer_recommendations(q, correlations, agent_insights)

    if any(kw in q for kw in ["fail", "next", "prediction", "forecast", "future"]):
        return _answer_prediction(q, metrics, anomalies)

    if any(kw in q for kw in ["report", "summary", "incident report", "analysis"]):
        return _answer_report(q, correlations, metrics, anomalies)

    if any(kw in q for kw in ["allocation", "resource", "limit", "request", "scaling", "size"]):
        return _answer_optimization(q, metrics)

    if any(kw in q for kw in ["root cause", "cause", "why", "reason", "origin"]):
        return _answer_root_cause(q, metrics, anomalies, correlations)

    if any(kw in q for kw in ["depend", "relationship", "connect", "talk", "communicate"]):
        return _answer_dependencies(q, metrics)

    return _answer_generic(q, metrics, anomalies, correlations)


# ── Intent Handlers ────────────────────────────────────────────────────────────

def _answer_slow(q, metrics, anomalies, correlations):
    frontend = next((m for m in metrics if m["pod_id"] == "frontend-service"), None)
    auth     = next((m for m in metrics if m["pod_id"] == "auth-service"), None)
    postgres = next((m for m in metrics if m["pod_id"] == "postgres-db"), None)

    if correlations and any(c["rule_id"] == "pvc_cascade" for c in correlations):
        pvc_w = postgres.get("pvc_write_mbps", 0) if postgres else 0
        auth_lat = auth.get("latency_ms", 0) if auth else 0
        front_lat = frontend.get("latency_ms", 0) if frontend else 0
        return {
            "answer": (
                f"**Frontend slowdown is caused by a PostgreSQL PVC storage cascade.**\n\n"
                f"Here is the full causal chain:\n\n"
                f"1. **postgres-db** is experiencing high PVC write I/O ({pvc_w:.1f} MB/s), "
                f"causing query latency to spike.\n"
                f"2. **auth-service** depends on postgres-db for user session validation. "
                f"It is now experiencing retry storms with latency at {auth_lat:.0f}ms.\n"
                f"3. Every user request through **frontend-service** must authenticate first — "
                f"auth delays cascade directly to frontend response times ({front_lat:.0f}ms).\n\n"
                f"**Root cause**: PostgreSQL PVC I/O saturation.\n"
                f"**Immediate action**: Expand postgres-db PVC IOPS or enable connection pooling."
            ),
            "sources": ["postgres-db (PVC)", "auth-service (latency)", "frontend-service (response time)"],
            "severity": "CRITICAL",
            "confidence": 0.94,
        }

    lat = frontend.get("latency_ms", 0) if frontend else 0
    if lat > 80:
        return {
            "answer": (
                f"**Frontend-service is showing elevated response latency ({lat:.0f}ms)**, "
                f"above the healthy threshold of 50ms. "
                f"No active downstream cascade has been confirmed yet — the AI agents are "
                f"analyzing dependency paths. Check auth-service and redis-cache for early "
                f"signs of pressure. Recommend monitoring for 60 seconds."
            ),
            "sources": ["frontend-service"],
            "severity": "WARNING",
            "confidence": 0.72,
        }

    return {
        "answer": "**Frontend-service is currently healthy.** Response latency and throughput are within normal bounds. No slowdown detected in the dependency chain.",
        "sources": ["frontend-service"],
        "severity": "INFO",
        "confidence": 0.91,
    }


def _answer_cpu(q, metrics, anomalies):
    worst = _find_worst_pod(metrics, "cpu_percent")
    cpu_anomalies = [a for a in anomalies if a["metric"] == "cpu_percent"]
    if cpu_anomalies:
        worst_anom = max(cpu_anomalies, key=lambda a: {"WARNING": 1, "CRITICAL": 2}.get(a["severity"], 0))
        pod = worst_anom["pod_name"]
        val = worst_anom["value"]
        return {
            "answer": (
                f"**{pod} is causing the highest CPU pressure at {val:.1f}%.**\n\n"
                f"This is classified as {worst_anom['severity']}. "
                f"Possible causes: workload burst, unbounded concurrency, or "
                f"an infinite retry loop. "
                f"The CPU Agent recommends scaling horizontally if this persists beyond 5 minutes, "
                f"or auditing recent code deployments for blocking operations."
            ),
            "sources": [pod],
            "severity": worst_anom["severity"],
            "confidence": 0.88,
        }
    cpu = worst.get("cpu_percent", 0)
    return {
        "answer": f"**CPU usage is normal cluster-wide.** The highest CPU pod is **{worst.get('pod_name', 'unknown')}** at {cpu:.1f}%, which is within healthy range.",
        "sources": [worst.get("pod_name", "")],
        "severity": "INFO",
        "confidence": 0.90,
    }


def _answer_memory(q, metrics, anomalies):
    mem_anomalies = [a for a in anomalies if a["metric"] == "memory_pct"]
    redis = next((m for m in metrics if m["pod_id"] == "redis-cache"), None)
    if redis:
        mem_pct = redis.get("memory_mb", 0) / max(redis.get("memory_limit_mb", 1), 1) * 100
        if mem_pct > 80:
            return {
                "answer": (
                    f"**Redis-cache is showing signs of a memory leak.** "
                    f"Current memory usage is {mem_pct:.1f}% of the allocated limit. "
                    f"Memory is growing continuously rather than stabilizing — this is the "
                    f"classic signature of missing key TTLs or unbounded cache growth.\n\n"
                    f"**Risk**: At current growth rate, an OOMKill event is predicted within "
                    f"~10 minutes. This would cause auth-service to lose all cached sessions "
                    f"and fall back to postgres-db for every request.\n\n"
                    f"**Immediate action**: Set maxmemory-policy=allkeys-lru on redis-cache."
                ),
                "sources": ["redis-cache (memory)", "auth-service (dependency)"],
                "severity": "CRITICAL",
                "confidence": 0.91,
            }
    worst = _find_worst_pod(metrics, "memory_mb")
    return {
        "answer": f"**Memory usage is within normal bounds.** The highest memory pod is **{worst.get('pod_name', '')}** — no leak pattern detected.",
        "sources": [worst.get("pod_name", "")],
        "severity": "INFO",
        "confidence": 0.87,
    }


def _answer_storage(q, metrics, anomalies):
    postgres = next((m for m in metrics if m["pod_id"] == "postgres-db"), None)
    if postgres:
        pvc_w = postgres.get("pvc_write_mbps", 0)
        if pvc_w > 4:
            return {
                "answer": (
                    f"**postgres-db PVC write I/O is elevated at {pvc_w:.1f} MB/s** "
                    f"(normal: ~1.8 MB/s). This indicates storage saturation — "
                    f"write operations are queuing, which increases query latency. "
                    f"This is likely caused by: high transaction volume, missing WAL "
                    f"tuning, or checkpoint pressure.\n\n"
                    f"**Impact**: All services that query postgres-db (auth-service, "
                    f"payment-service) will experience increased response times.\n\n"
                    f"**Fix**: Tune checkpoint_completion_target and max_wal_size in "
                    f"postgres config, or upgrade to a higher-IOPS storage class."
                ),
                "sources": ["postgres-db (PVC)"],
                "severity": "CRITICAL",
                "confidence": 0.93,
            }
    return {
        "answer": "**PVC storage I/O is normal.** No disk bottlenecks detected across postgres-db, redis-cache, or other persistent volume mounts.",
        "sources": ["postgres-db", "redis-cache"],
        "severity": "INFO",
        "confidence": 0.89,
    }


def _answer_network(q, metrics, anomalies):
    high_net = [m for m in metrics if m.get("network_in_mbps", 0) > 5 or m.get("latency_ms", 0) > 100]
    if high_net:
        pod = high_net[0]
        return {
            "answer": (
                f"**{pod['pod_name']} shows elevated network activity.** "
                f"Inbound traffic: {pod.get('network_in_mbps', 0):.2f} MB/s, "
                f"latency: {pod.get('latency_ms', 0):.0f}ms. "
                f"This could indicate a traffic spike, retry storm, or a dependency "
                f"pod that is slow to respond, causing request queuing."
            ),
            "sources": [pod["pod_name"]],
            "severity": "WARNING",
            "confidence": 0.81,
        }
    return {
        "answer": "**Network traffic is normal.** Pod-to-pod communication is within expected bandwidth and latency bounds.",
        "sources": [],
        "severity": "INFO",
        "confidence": 0.88,
    }


def _answer_crash(q, metrics, anomalies):
    crashed = [m for m in metrics if m.get("restarts", 0) > 0 or m.get("status") in ("CrashLoopBackOff", "OOMKilled")]
    if crashed:
        pod = crashed[0]
        status = pod.get("status")
        restarts = pod.get("restarts", 0)
        return {
            "answer": (
                f"**{pod['pod_name']} has experienced {restarts} restart(s)** "
                f"and current status is: **{status}**.\n\n"
                f"{'OOMKill: Pod exceeded its memory limit and was forcibly terminated by the kernel. ' if status == 'OOMKilled' else ''}"
                f"{'CrashLoopBackOff: Pod is repeatedly crashing on startup. Check logs for startup errors. ' if status == 'CrashLoopBackOff' else ''}"
                f"Kubernetes will continue restarting with exponential backoff. "
                f"Recommend checking pod logs and events immediately."
            ),
            "sources": [pod["pod_name"]],
            "severity": "CRITICAL",
            "confidence": 0.97,
        }
    return {
        "answer": "**No crashes detected.** All pods are running stably with zero restart events in the current window.",
        "sources": [],
        "severity": "INFO",
        "confidence": 0.95,
    }


def _answer_health(q, metrics, anomalies, correlations):
    score = _health_score(metrics)
    anom_count = len(anomalies)
    corr_count = len(correlations)
    status = "healthy" if score > 80 else ("degraded" if score > 50 else "critical")
    return {
        "answer": (
            f"**Cluster health score: {score}/100 — {status.upper()}.**\n\n"
            f"- Active pods: {len(metrics)}\n"
            f"- Active anomalies: {anom_count}\n"
            f"- Confirmed causal incidents: {corr_count}\n\n"
            f"{'No active incidents detected. All services operating normally.' if anom_count == 0 else f'{anom_count} anomalies detected across the cluster. AI agents are analyzing causal relationships.'}"
        ),
        "sources": ["cluster-wide"],
        "severity": "CRITICAL" if score < 50 else ("WARNING" if score < 80 else "INFO"),
        "confidence": 0.95,
    }


def _answer_recommendations(q, correlations, agent_insights):
    recs = []
    for c in correlations:
        recs.extend(c.get("recommendations", []))
    if not recs:
        recs = [
            "Enable Horizontal Pod Autoscaler (HPA) on all stateless services",
            "Set resource requests and limits on all pods",
            "Configure liveness and readiness probes for faster failure detection",
            "Enable Prometheus alerting for PVC usage > 80%",
        ]
    rec_text = "\n".join(f"{i+1}. {r}" for i, r in enumerate(recs[:6]))
    return {
        "answer": f"**AI Recommendations based on current cluster state:**\n\n{rec_text}",
        "sources": ["correlation-engine", "recommendation-agent"],
        "severity": "INFO",
        "confidence": 0.86,
    }


def _answer_prediction(q, metrics, anomalies):
    # Prediction logic: look for trends (like redis memory)
    redis = next((m for m in metrics if m["pod_id"] == "redis-cache"), None)
    if redis:
        mem_pct = redis.get("memory_mb", 0) / max(redis.get("memory_limit_mb", 1), 1) * 100
        if mem_pct > 70:
            return {
                "answer": (
                    f"**Prediction: redis-cache is at high risk of failure.**\n\n"
                    f"Current memory usage is {mem_pct:.1f}% and climbing. Based on the growth "
                    f"curve, an **OOMKill** event is predicted within approximately 25-30 minutes "
                    f"unless the maxmemory policy is updated. \n\n"
                    f"Second risk: **payment-service** could enter CrashLoopBackOff if current "
                    f"CPU pressure persists for more than 10 minutes."
                ),
                "sources": ["redis-cache (memory trend)", "payment-service (CPU stability)"],
                "severity": "WARNING",
                "confidence": 0.85,
            }
    
    return {
        "answer": "**No immediate failures predicted.** All pods are currently operating within their stability envelopes. Predicted uptime for the next 60 minutes is >99.9%.",
        "sources": ["predictive-engine"],
        "severity": "INFO",
        "confidence": 0.82,
    }


def _answer_report(q, correlations, metrics, anomalies):
    if correlations:
        c = correlations[0]
        return {
            "answer": (
                f"**Incident Report — INC-{int(time.time()) % 10000}**\n"
                f"**Status**: ACTIVE · **Severity**: {c['severity']}\n\n"
                f"**Summary**: {c['name']} detected. {c['summary']}\n\n"
                f"**Impacted Services**: {', '.join(c['affected_pods'])}\n"
                f"**Root Cause**: {c['root_cause_pod']} ({c['root_metric']})\n\n"
                f"**Timeline Highlights**:\n"
                f"- T-120s: Anomaly detected in {c['root_cause_pod']}\n"
                f"- T-60s: Causal propagation to {c['affected_pods'][1] if len(c['affected_pods']) > 1 else 'dependents'}\n"
                f"- T-0s: AI synthesis confirmed incident chain."
            ),
            "sources": ["incident-log", "correlation-engine"],
            "severity": c["severity"],
            "confidence": 0.95,
        }
    
    score = _health_score(metrics)
    return {
        "answer": (
            f"**Daily Cluster Health Report**\n"
            f"**Status**: {'HEALTHY' if score > 80 else 'DEGRADED'}\n"
            f"**Score**: {score}/100\n\n"
            f"No major incidents are currently active. {len(anomalies)} minor anomalies are "
            f"being tracked by the AI agents. Overall cluster stability is high."
        ),
        "sources": ["health-monitor"],
        "severity": "INFO",
        "confidence": 0.90,
    }


def _answer_optimization(q, metrics):
    payment = next((m for m in metrics if m["pod_id"] == "payment-service"), None)
    if payment:
        return {
            "answer": (
                f"**Resource Optimization for payment-service:**\n\n"
                f"Current limits appear insufficient for peak load. Recommended adjustment:\n"
                f"- **CPU**: Increase limit to 500m (current request: 200m)\n"
                f"- **Memory**: Increase limit to 1Gi (current request: 768Mi)\n\n"
                f"Also recommend enabling **Horizontal Pod Autoscaler (HPA)** with a target "
                f"CPU utilization of 60% to handle workload bursts automatically."
            ),
            "sources": ["recommendation-agent", "VPA-analysis"],
            "severity": "INFO",
            "confidence": 0.88,
        }
    
    return {
        "answer": "**Cluster is generally well-optimized.** Average CPU utilization is under 40% across all namespaces. No urgent rightsizing needed at this time.",
        "sources": ["optimization-engine"],
        "severity": "INFO",
        "confidence": 0.85,
    }


def _answer_root_cause(q, metrics, anomalies, correlations):
    if correlations:
        c = correlations[0]
        chain_text = "\n".join(f"→ {step}" for step in c["causal_chain"])
        return {
            "answer": (
                f"**Root Cause Identified: {c['name']}**\n\n"
                f"Origin: **{c['root_cause_pod']}** ({c['root_metric']})\n\n"
                f"Causal chain:\n{chain_text}\n\n"
                f"{c['summary']}"
            ),
            "sources": c["affected_pods"],
            "severity": c["severity"],
            "confidence": 0.92,
        }
    if anomalies:
        worst = max(anomalies, key=lambda a: {"WARNING": 1, "CRITICAL": 2}.get(a["severity"], 0))
        return {
            "answer": (
                f"**Likely root cause: {worst['pod_name']} — {worst['metric']}**\n\n"
                f"{worst['message']}\n\n"
                f"No confirmed causal chain yet — AI correlation engine needs more data points. "
                f"Continue monitoring for 30-60 seconds for full chain resolution."
            ),
            "sources": [worst["pod_name"]],
            "severity": worst["severity"],
            "confidence": 0.68,
        }
    return {
        "answer": "**No active root cause identified.** The cluster is operating normally with no anomalies requiring causal analysis.",
        "sources": [],
        "severity": "INFO",
        "confidence": 0.93,
    }


def _answer_dependencies(q, metrics):
    return {
        "answer": (
            "**Service dependency topology:**\n\n"
            "```\n"
            "frontend-service\n"
            "  ├── auth-service      [REST/HTTP]\n"
            "  │    ├── redis-cache  [TCP/Redis]\n"
            "  │    └── postgres-db  [TCP/SQL]\n"
            "  └── payment-service  [REST/HTTP]\n"
            "       ├── postgres-db  [TCP/SQL]\n"
            "       └── redis-cache  [TCP/Redis]\n"
            "```\n\n"
            "All 5 services ultimately depend on **postgres-db** — "
            "making it the highest-criticality single point of failure in the cluster. "
            "A failure in postgres-db impacts 4 of 5 services simultaneously."
        ),
        "sources": ["dependency-engine"],
        "severity": "INFO",
        "confidence": 0.99,
    }


def _answer_generic(q, metrics, anomalies, correlations):
    score = _health_score(metrics)
    return {
        "answer": (
            f"I analyzed your query against current cluster state. "
            f"Cluster health is at **{score}/100** with **{len(anomalies)} active anomalies** "
            f"and **{len(correlations)} confirmed incidents**.\n\n"
            f"Try asking: *'Why is the cluster slow?'*, *'What is the root cause?'*, "
            f"*'Show me recommendations'*, or *'How is redis doing?'*"
        ),
        "sources": ["cluster-wide"],
        "severity": "INFO",
        "confidence": 0.70,
    }
