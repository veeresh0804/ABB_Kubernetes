"""
KubeMind AI — FastAPI Backend
Real-time Kubernetes intelligence platform with WebSocket streaming.
AI-Native Cognitive Operational Intelligence Fabric
"""
import asyncio
import json
import time
from typing import List, Set, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Internal modules
import sys, os
_backend_dir = os.path.dirname(__file__)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from data.simulator import simulator
from data.k8s_driver import kube_driver
from data.prometheus_driver import prometheus_driver
from data.metric_store import metric_store
from engines.anomaly_detector import detect
# from engines.correlation_engine import correlate  # Retained for reference; runtime uses causal_engine
from engines.nlp_engine import process as nlp_process
from engines.trend_engine import trend_engine

# KubeMind Architecture - Event-driven components
from event_bus import event_bus
import events
from state_engine import state_engine, _cluster_health
from agents.mesh import agent_mesh
from knowledge_graph import knowledge_graph
from predictor import predictive_layer
from truth_observer import truth_observer
from engines.decision_engine import decision_engine


background_tasks = set()

# ─── App Lifecycle ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("KubeMind AI starting up...")
    
    # Start the distributed intelligence services
    await state_engine.start()
    await agent_mesh.start()
    await knowledge_graph.start()
    await predictive_layer.start()
    await truth_observer.start()
    await decision_engine.start()
    
    # Start gateway workers
    tasks = [
        telemetry_worker,
        anomaly_worker,
        correlation_worker,
        websocket_publisher_worker
    ]
    for task_factory in tasks:
        task = asyncio.create_task(task_factory())
        background_tasks.add(task)
    
    yield
    
    # Shutdown
    print("KubeMind AI shutting down...")
    await decision_engine.stop()
    await truth_observer.stop()
    await predictive_layer.stop()
    await knowledge_graph.stop()
    await agent_mesh.stop()
    await state_engine.stop()
    for task in background_tasks:
        task.cancel()
    await asyncio.gather(*background_tasks, return_exceptions=True)

app = FastAPI(title="KubeMind AI", version="1.0.0", lifespan=lifespan)

# ─── Gateway Worker Processes ──────────────────────────────────────────────────

async def telemetry_worker():
    """Periodically fetches metrics for all namespaces and publishes them."""
    while True:
        try:
            all_metrics = await simulator.get_metrics(namespace="all")
            
            # FIX CB-006: Enrich metrics with trend data for MemoryLeakAgent
            enriched_metrics = []
            for metric in all_metrics:
                pod_id = metric["pod_id"]
                trends = trend_engine.get_trends(pod_id)
                metric["trends"] = trends # Add the trends dictionary to the metric
                enriched_metrics.append(metric)

            if enriched_metrics: # Publish enriched metrics
                await event_bus.publish("TelemetryMetricsEvent", events.TelemetryMetricsEvent(metrics=enriched_metrics, namespace="all"))
            trend_engine.update(all_metrics) # Original update, still useful for trend_engine's internal history
        except Exception as e:
            print(f"Error in telemetry_worker: {e}")
        await asyncio.sleep(2)

async def anomaly_worker():
    """Subscribes to metrics and publishes anomaly events."""
    queue = event_bus.subscribe("TelemetryMetricsEvent")
    while True:
        try:
            event: events.TelemetryMetricsEvent = await queue.get()
            anomalies = detect(event.metrics)
            for anomaly in anomalies:
                if "namespace" not in anomaly:
                    pod = next((p for p in event.metrics if p["pod_id"] == anomaly["pod_id"]), None)
                    if pod: anomaly["namespace"] = pod["namespace"]
                await event_bus.publish("AnomalyEvent", events.AnomalyEvent(anomaly=anomaly))
        except Exception as e:
            print(f"Error in anomaly_worker: {e}")

from engines.causal_engine import causal_engine
async def correlation_worker():
    """Subscribes to anomalies and publishes causal reasoning events."""
    anomalies_buffer = []
    last_correlation_time = time.time()

    queue = event_bus.subscribe("AnomalyEvent")
    while True:
        try:
            try:
                event: events.AnomalyEvent = await asyncio.wait_for(queue.get(), timeout=5.0)
                anomalies_buffer.append(event.anomaly)
            except asyncio.TimeoutError:
                pass 

            now = time.time()
            if (now - last_correlation_time > 10) and anomalies_buffer:
                # --- Phase 9: Causal Inference Upgrade ---
                incidents = await causal_engine.infer_root_cause(anomalies_buffer)
                for inc in incidents:
                    await event_bus.publish("CorrelationEvent", events.CorrelationEvent(
                        correlation=inc,
                        causal_evidence=inc.get("causal_evidence")
                    ))
                    _append_incident({**inc, "logged_at": time.time()})
                
                anomalies_buffer = [] 
                last_correlation_time = now

        except Exception as e:
            print(f"Error in correlation_worker: {e}")

async def websocket_publisher_worker():
    """
    Gateway publisher. Reads unified state, filters by namespace, and streams.
    """
    while True:
        try:
            if not active_connections:
                await asyncio.sleep(0.5)
                continue

            # Fetch centralized state from the State Engine (Phase 2)
            base_payload = await state_engine.get_state()
            
            send_tasks = []
            for ws in list(active_connections): # FIX: Iterate over a copy to prevent RuntimeError
                namespace = connection_namespaces.get(ws, "all")
                
                client_payload = base_payload.copy()
                
                # Fetch tailored topology from the Knowledge Graph (Phase 4)
                client_payload["graph"] = await knowledge_graph.get_topology(namespace)

                if namespace != "all":
                    client_payload["pods"] = [p for p in base_payload["pods"] if p.get("namespace") == namespace]
                    client_payload["anomalies"] = [a for a in base_payload["anomalies"] if a.get("namespace") == namespace]
                    client_payload["predictions"] = [p for p in base_payload["predictions"] if p.get("namespace") == namespace]
                    
                    pod_ids_in_ns = {p["pod_id"] for p in client_payload["pods"]}
                    client_payload["correlations"] = [c for c in base_payload["correlations"] if c.get("root_cause_pod") in pod_ids_in_ns]
                    
                    client_payload["health"] = _cluster_health(client_payload["pods"], client_payload["anomalies"])

                client_payload["type"] = "metrics_update"
                client_payload["timestamp"] = time.time()
                
                send_tasks.append(ws.send_text(json.dumps(client_payload)))

            await asyncio.gather(*send_tasks, return_exceptions=True)

        except Exception as e:
            print(f"Error in websocket_publisher_worker: {e}")
        
        await asyncio.sleep(2)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Connection State ──────────────────────────────────────────────────────────
active_connections: Set[WebSocket] = set()
connection_namespaces: Dict[WebSocket, str] = {}
MAX_INCIDENT_LOG = 300
incident_log: List[dict] = []
stabilization_mode: str = "RECOMMEND"


def _append_incident(entry: dict) -> None:
    incident_log.append(entry)
    if len(incident_log) > MAX_INCIDENT_LOG:
        incident_log[:] = incident_log[-MAX_INCIDENT_LOG:] 
last_stabilization: Dict[str, float] = {} # pod_id -> timestamp

# ─── WebSocket Manager ────────────────────────────────────────────────────────
@app.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    connection_namespaces[websocket] = "all"

    listener_task = None
    try:
        async def message_listener():
            try:
                while True:
                    message = await websocket.receive_text()
                    data = json.loads(message)
                    if data.get("type") == "set_namespace" and "namespace" in data:
                        connection_namespaces[websocket] = data["namespace"]
            except WebSocketDisconnect: pass
            except Exception as e: print(f"WS Listener Error: {e}")

        listener_task = asyncio.create_task(message_listener())
        while True: await asyncio.sleep(3600)
    except WebSocketDisconnect: pass
    finally:
        active_connections.discard(websocket)
        if websocket in connection_namespaces: del connection_namespaces[websocket]
        if listener_task and not listener_task.done(): listener_task.cancel()


# ─── REST Endpoints (Operational Access) ───────────────────────────────────────

@app.get("/api/health")
async def api_health():
    return {
        "status": "ok", "version": "1.0.0", "service": "KubeMind AI",
        "drivers": {
            "kubernetes": {"connected": kube_driver.connected, "context": kube_driver.context_name},
            "prometheus": {"connected": prometheus_driver.connected, "url": prometheus_driver.url}
        }
    }

@app.get("/api/pods")
async def api_pods(namespace: Optional[str] = "all"):
    state = await state_engine.get_state()
    pods = state.get("pods", [])
    if namespace != "all": pods = [p for p in pods if p.get("namespace") == namespace]
    return {"pods": pods, "count": len(pods)}

@app.get("/api/dependencies")
async def api_dependencies(namespace: Optional[str] = "all"):
    return await knowledge_graph.get_topology(namespace)

@app.get("/api/anomalies")
async def api_anomalies(namespace: Optional[str] = "all"):
    state = await state_engine.get_state()
    anomalies = state.get("anomalies", [])
    if namespace != "all": anomalies = [a for a in anomalies if a.get("namespace") == namespace]
    return {"anomalies": anomalies, "count": len(anomalies)}

@app.get("/api/agents")
async def api_agents(namespace: Optional[str] = "all"):
    state = await state_engine.get_state()
    return {"agents": state.get("agents", [])}

@app.get("/api/correlations")
async def api_correlations(namespace: Optional[str] = "all"):
    state = await state_engine.get_state()
    return {"correlations": state.get("correlations", []), "count": len(state.get("correlations", []))}

@app.get("/api/history/{pod_id}")
async def api_history(pod_id: str, n: int = 60):
    history = metric_store.get_history(pod_id, n)
    if not history: history = simulator.get_history(pod_id, n)
    if not history: raise HTTPException(status_code=404, detail=f"Pod {pod_id} not found")
    return {"pod_id": pod_id, "history": history, "count": len(history)}

@app.get("/api/incident-log")
async def api_incident_log(namespace: Optional[str] = "all"):
    recent = metric_store.get_recent_incidents(50, namespace)
    return {"log": recent, "count": len(recent), "in_memory_count": len(incident_log)}

@app.get("/api/health-history")
async def api_health_history():
    scores = [entry["health"]["score"] for entry in incident_log[-60:]]
    return {"scores": scores, "count": len(scores)}

@app.get("/api/forecast")
async def api_forecast(namespace: Optional[str] = "all"):
    state = await state_engine.get_state()
    preds = state.get("predictions", [])
    if namespace != "all": preds = [p for p in preds if p.get("namespace") == namespace]
    return {"predictions": preds, "count": len(preds)}

@app.get("/api/report")
async def api_report(namespace: Optional[str] = "all"):
    import datetime
    import html # FIX: Import html for escaping
    state = await state_engine.get_state()
    metrics = state.get("pods", []); anomalies = state.get("anomalies", [])
    corr = state.get("correlations", []); agents = state.get("agents", [])
    
    if namespace != "all":
        metrics = [p for p in metrics if p.get("namespace") == namespace]
        anomalies = [a for a in anomalies if a.get("namespace") == namespace]
        pod_ids = {p["pod_id"] for p in metrics}
        corr = [c for c in corr if c.get("root_cause_pod") in pod_ids]

    health = _cluster_health(metrics, anomalies)
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    score_color = "#16A34A" if health["score"] > 80 else "#D97706" if health["score"] > 50 else "#DC2626"

    incident_rows = ""
    for c in corr:
        # FIX: HTML-escape all correlation data
        escaped_severity = html.escape(c['severity'])
        escaped_name = html.escape(c['name'])
        escaped_root_cause_pod = html.escape(c.get('root_cause_pod','unknown'))
        escaped_summary = html.escape(c['summary'])
        escaped_chain = " → ".join(f"<code>{html.escape(s)}</code>" for s in c["causal_chain"])
        escaped_recs  = "".join(f"<li>{html.escape(r)}</li>" for r in c["recommendations"][:4])
        escaped_pods  = ", ".join(f"<code>{html.escape(p)}</code>" for p in c["affected_pods"])
        
        incident_rows += f"""
        <div class="incident">
          <div class="inc-header">
            <span class="sev-badge sev-{escaped_severity.lower()}">{escaped_severity}</span>
            <strong>{escaped_name}</strong>
            <span class="root">Root: <code>{escaped_root_cause_pod}</code></span>
          </div>
          <p class="summary">{escaped_summary}</p>
          <div class="two-col">
            <div><h4>Causal Chain</h4><p>{escaped_chain}</p></div>
            <div><h4>Affected Services ({len(c['affected_pods'])})</h4><p>{escaped_pods}</p></div>
          </div>
          <h4>Recommendations</h4><ol>{escaped_recs}</ol>
        </div>"""

    agent_rows = ""
    for a in agents:
        # FIX: HTML-escape all agent data
        escaped_icon = html.escape(a['icon'])
        escaped_agent_name = html.escape(a['agent'])
        escaped_domain = html.escape(a['domain'])
        escaped_status = html.escape(a['status'])
        escaped_finding = html.escape(a['finding'][:80]) + ('...' if len(a['finding']) > 80 else '')
        
        color = "#DC2626" if escaped_status=="CRITICAL" else "#D97706" if escaped_status=="WARNING" else "#16A34A"
        agent_rows += f"""<tr>
          <td>{escaped_icon} {escaped_agent_name}</td>
          <td>{escaped_domain}</td>
          <td style="color:{color};font-weight:700">{escaped_status}</td>
          <td>{int(a.get('confidence', 0)*100)}%</td>
          <td>{escaped_finding}</td>
        </tr>"""

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>KubeMind AI — Report</title>
    <style>body{{font-family:-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#0F172A;font-size:13px;line-height:1.6}}h1{{font-size:20px;font-weight:700}}h2{{font-size:14px;border-bottom:2px solid #E2E8F0;padding-bottom:6px}}h4{{font-size:12px;color:#475569}}.meta{{color:#64748B;font-size:12px;margin-bottom:24px;display:flex;gap:24px}}.score-badge{{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:24px}}.score-num{{font-size:32px;font-weight:700;color:{score_color}}}.incident{{border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px;border-left:3px solid #DC2626}}.inc-header{{display:flex;align-items:center;gap:10px;margin-bottom:8px}}.sev-badge{{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase}}.sev-critical{{background:#FEF2F2;color:#B91C1C}}.sev-warning{{background:#FFFBEB;color:#B45309}}.root{{font-size:11px;color:#64748B;margin-left:auto}}.summary{{color:#475569;margin-bottom:10px}}.two-col{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}ol{{margin:4px 0 0 16px;padding:0}}li{{color:#475569}}code{{background:#F1F5F9;padding:1px 5px;border-radius:3px;font-family:monospace}}table{{width:100%;border-collapse:collapse}}th{{background:#F8FAFC;padding:8px 12px;text-align:left;font-size:11px;color:#64748B}}td{{padding:8px 12px;border-bottom:1px solid #F1F5F9}}</style></head>
    <body><h1>KubeMind AI — Incident Report</h1><div class="meta"><span>Generated: {now}</span><span>Monitored: {health['pod_count']}</span><span>Anomalies: {health['anomaly_count']}</span></div>
    <div class="score-badge"><div class="score-num">{health['score']}</div><div class="score-label"><strong>Health Score</strong><br>{health['status'].upper()}</div></div>
    <h2>Active Incidents ({len(corr)})</h2>{incident_rows if corr else '<p>✓ Nominal</p>'}
    <h2>AI Agent Diagnostics</h2><table><thead><tr><th>Agent</th><th>Domain</th><th>Status</th><th>Confidence</th><th>Finding</th></tr></thead><tbody>{agent_rows}</tbody></table></body></html>"""

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html, headers={"Content-Disposition": "inline; filename=kubemind-report.html"})

class NLPQuery(BaseModel):
    question: str
    namespace: Optional[str] = "all"

@app.post("/api/nlp/query")
async def api_nlp_query(body: NLPQuery):
    state = await state_engine.get_state()
    metrics = state.get("pods", []); anomalies = state.get("anomalies", [])
    corr = state.get("correlations", []); agents = state.get("agents", [])
    
    if body.namespace != "all":
        metrics = [p for p in metrics if p.get("namespace") == body.namespace]
        anomalies = [a for a in anomalies if a.get("namespace") == body.namespace]
        pod_ids = {p["pod_id"] for p in metrics}
        corr = [c for c in corr if c.get("root_cause_pod") in pod_ids]

    result = nlp_process(question=body.question, metrics=metrics, anomalies=anomalies, correlations=corr, agent_insights=agents)
    return {**result, "question": body.question, "timestamp": time.time()}

class AnomalyTrigger(BaseModel): scenario: str

@app.post("/api/simulate/anomaly")
async def api_simulate_anomaly(body: AnomalyTrigger):
    if body.scenario == "clear":
        simulator.clear_anomaly()
        return {"status": "cleared", "message": "All anomalies cleared"}
    simulator.trigger_anomaly(body.scenario)
    return {"status": "triggered", "scenario": body.scenario}

@app.get("/api/simulate/status")
async def api_simulate_status():
    return {"anomaly_mode": simulator.anomaly_mode, "progress": simulator.anomaly_progress()}

class RemediationRequest(BaseModel):
    action: str; target: str; namespace: str; replicas: Optional[int] = None

@app.post("/api/remediate")
async def api_remediate(body: RemediationRequest):
    result = await kube_driver.execute_remediation(action=body.action, target=body.target, namespace=body.namespace, replicas=body.replicas)
    metric_store.save_remediation(action=body.action, target=body.target, namespace=body.namespace, status=result.get("status", "unknown"), message=result.get("message", ""))
    if result["status"] == "error": raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.post("/api/demo/reset")
async def api_demo_reset():
    simulator.reset(); metric_store.clear_all(); global incident_log; incident_log = []
    return {"status": "success"}

class ModeUpdate(BaseModel): mode: str
@app.post("/api/stabilization/mode")
async def api_set_mode(body: ModeUpdate):
    global stabilization_mode; stabilization_mode = body.mode
    return {"status": "success", "mode": stabilization_mode}

@app.get("/api/stabilization/mode")
async def api_get_mode(): return {"mode": stabilization_mode}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
