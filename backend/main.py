"""
KubeMind AI — FastAPI Backend
Real-time Kubernetes intelligence platform with WebSocket streaming.
"""
import asyncio
import json
import time
from typing import List, Set, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Internal modules
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from data.simulator import simulator
from data.k8s_driver import kube_driver
from data.prometheus_driver import prometheus_driver
from data.metric_store import metric_store
from engines.anomaly_detector import detect
from engines.correlation_engine import correlate
from engines.nlp_engine import process as nlp_process
from engines.trend_engine import trend_engine
from agents.agents import run_all_agents

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="KubeMind AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── State ────────────────────────────────────────────────────────────────────
active_connections: Set[WebSocket] = set()
incident_log: List[dict] = []
stabilization_mode: str = "RECOMMEND" # OBSERVE, RECOMMEND, APPROVE, STABILIZE
last_stabilization: Dict[str, float] = {} # pod_id -> timestamp

# ─── WebSocket Manager ────────────────────────────────────────────────────────
@app.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            payload = await _build_payload()
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception:
        active_connections.discard(websocket)


async def _build_payload():
    metrics = await simulator.get_metrics()
    trend_engine.update(metrics)
    
    anomalies = detect(metrics)
    graph = await simulator.get_dependency_graph()
    corr = correlate(anomalies)
    agents = run_all_agents(metrics, anomalies, graph)
    
    # ─── Safe Temporary Stabilization ───
    if stabilization_mode == "STABILIZE":
        for agent_res in agents:
            if agent_res["status"] == "CRITICAL" and agent_res.get("buffer_action") not in (None, "monitor_only"):
                target = agent_res.get("detail", {}).get("pod") or agent_res.get("detail", {}).get("hot_pod") or agent_res.get("detail", {}).get("root_pod")
                if target:
                    # Rate limit: 60s between auto-actions on the same target
                    now = time.time()
                    if now - last_stabilization.get(target, 0) > 60:
                        action = agent_res["buffer_action"]
                        if action == "restart_unhealthy_replica": action = "restart_pod"
                        
                        print(f"[AUTO-STABILIZE] Triggering {action} for {target} (Agent: {agent_res['agent']})")
                        last_stabilization[target] = now
                        asyncio.create_task(kube_driver.execute_remediation(action, target))
                        break # Only one auto-action per tick for safety

    health = _cluster_health(metrics, anomalies)

    # Persist to MetricStore
    metric_store.save_metrics(simulator.tick, metrics)
    if anomalies:
        metric_store.save_anomalies(anomalies)
    for c in corr:
        metric_store.save_incident(c)

    # Enrich pods with trends
    for pod in metrics:
        pod["trends"] = trend_engine.get_trends(pod["pod_id"])

    # Log for incident replay
    entry = {
        "timestamp": time.time(),
        "tick": simulator.tick,
        "anomaly_mode": simulator.anomaly_mode,
        "health": health,
        "anomaly_count": len(anomalies),
        "critical_count": sum(1 for a in anomalies if a["severity"] == "CRITICAL"),
    }
    incident_log.append(entry)
    if len(incident_log) > 300:
        incident_log.pop(0)

    return {
        "type": "metrics_update", "timestamp": time.time(), "tick": simulator.tick,
        "anomaly_mode": simulator.anomaly_mode, "health": health, "pods": metrics,
        "anomalies": anomalies, "graph": graph, "correlations": corr, "agents": agents,
        "stabilization_mode": stabilization_mode,
    }


def _cluster_health(metrics: list, anomalies: list) -> dict:
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


# ─── REST Endpoints (now async) ───────────────────────────────────────────────

@app.get("/api/health")
async def api_health():
    return {
        "status": "ok", 
        "version": "1.0.0", 
        "service": "KubeMind AI",
        "drivers": {
            "kubernetes": {
                "connected": kube_driver.connected,
                "context": kube_driver.context_name
            },
            "prometheus": {
                "connected": prometheus_driver.connected,
                "url": prometheus_driver.url
            }
        }
    }


@app.get("/api/pods")
async def api_pods():
    metrics = await simulator.get_latest_metrics()
    return {"pods": metrics, "count": len(metrics)}


@app.get("/api/dependencies")
async def api_dependencies():
    return await simulator.get_dependency_graph()


@app.get("/api/anomalies")
async def api_anomalies():
    metrics   = await simulator.get_latest_metrics()
    anomalies = detect(metrics)
    return {"anomalies": anomalies, "count": len(anomalies)}


@app.get("/api/agents")
async def api_agents():
    metrics   = await simulator.get_latest_metrics()
    anomalies = detect(metrics)
    graph = await simulator.get_dependency_graph()
    agents    = run_all_agents(metrics, anomalies, graph)
    return {"agents": agents}


@app.get("/api/correlations")
async def api_correlations():
    metrics   = await simulator.get_latest_metrics()
    anomalies = detect(metrics)
    corr      = correlate(anomalies)
    return {"correlations": corr, "count": len(corr)}


@app.get("/api/history/{pod_id}")
async def api_history(pod_id: str, n: int = 60):
    history = metric_store.get_history(pod_id, n)
    if not history:
        # Fallback to simulator memory if DB is empty
        history = simulator.get_history(pod_id, n)
    
    if not history:
        raise HTTPException(status_code=404, detail=f"Pod {pod_id} not found")
    return {"pod_id": pod_id, "history": history, "count": len(history)}


@app.get("/api/incident-log")
async def api_incident_log():
    # Fetch from persistent store
    recent = metric_store.get_recent_incidents(50)
    return {"log": recent, "count": len(recent), "in_memory_count": len(incident_log)}

# ─── NLP Endpoint ─────────────────────────────────────────────────────────────
class NLPQuery(BaseModel):
    question: str

@app.post("/api/nlp/query")
async def api_nlp_query(body: NLPQuery):
    metrics   = await simulator.get_latest_metrics()
    anomalies = detect(metrics)
    corr      = correlate(anomalies)
    graph     = await simulator.get_dependency_graph()
    agents    = run_all_agents(metrics, anomalies, graph)
    result = nlp_process(
        question=body.question, metrics=metrics, anomalies=anomalies,
        correlations=corr, agent_insights=agents,
    )
    return {**result, "question": body.question, "timestamp": time.time()}

# ─── Anomaly Simulation ───────────────────────────────────────────────────────
class AnomalyTrigger(BaseModel):
    scenario: str

@app.post("/api/simulate/anomaly")
async def api_simulate_anomaly(body: AnomalyTrigger):
    if body.scenario == "clear":
        simulator.clear_anomaly()
        return {"status": "cleared", "message": "All anomalies cleared"}
    
    valid = {"pvc_cascade", "memory_leak", "cpu_storm"}
    if body.scenario not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid scenario. Valid: {valid}")
    
    simulator.trigger_anomaly(body.scenario)
    messages = {
        "pvc_cascade": "PostgreSQL PVC cascade initiated",
        "memory_leak": "Redis memory leak scenario started",
        "cpu_storm":   "Payment service CPU storm triggered",
    }
    return {"status": "triggered", "scenario": body.scenario, "message": messages[body.scenario]}

@app.get("/api/simulate/status")
async def api_simulate_status():
    return {
        "anomaly_mode": simulator.anomaly_mode,
        "started_at_tick": simulator.anomaly_started_at,
        "current_tick": simulator.tick,
        "progress": simulator.anomaly_progress(),
    }

class RemediationRequest(BaseModel):
    action: str
    target: str
    namespace: str = "production"
    replicas: int = 2

@app.post("/api/remediate")
async def api_remediate(body: RemediationRequest):
    result = await kube_driver.execute_remediation(
        action=body.action, 
        target=body.target, 
        namespace=body.namespace,
        replicas=body.replicas
    )
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.post("/api/demo/reset")
async def api_demo_reset():
    simulator.reset()
    metric_store.clear_all()
    # Also clear in-memory incident log
    global incident_log
    incident_log = []
    return {"status": "success", "message": "Demo state reset to clean baseline."}

# ─── Stabilization Control ────────────────────────────────────────────────────
class ModeUpdate(BaseModel):
    mode: str

@app.post("/api/stabilization/mode")
async def api_set_mode(body: ModeUpdate):
    global stabilization_mode
    valid = {"OBSERVE", "RECOMMEND", "APPROVE", "STABILIZE"}
    if body.mode not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Valid: {valid}")
    stabilization_mode = body.mode
    return {"status": "success", "mode": stabilization_mode}

@app.get("/api/stabilization/mode")
async def api_get_mode():
    return {"mode": stabilization_mode}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
