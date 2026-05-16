# KubeMind AI — Technical Report
**ABB Accelerator 2026 · Theme 2: Beyond Monitoring**
**Team Submission · Version 1.0**

---

## 1. Executive Summary

KubeMind AI is an AI-powered Kubernetes operational intelligence platform built for industrial edge environments. It goes beyond conventional monitoring by providing real-time causal analysis, multi-agent AI diagnostics, and autonomous remediation capabilities.

The platform addresses a critical gap in containerized operations: existing tools generate raw metrics but cannot explain *why* a system is failing or predict what will fail next. KubeMind AI solves this through a layered architecture combining live telemetry ingestion, statistical anomaly detection, a 7-agent AI analysis framework, causal correlation, natural language querying, and a dependency graph that maps inter-service blast radius in real time.

---

## 2. Problem Statement

Engineers managing containerized systems in Kubernetes/K3s/MicroK8s environments — especially in industrial edge deployments — face three compounding challenges:

1. **Signal noise**: Hundreds of alerts with no causal context. A frontend slowdown may generate 15 separate metric alerts when the true cause is a single PVC saturation event on the database.
2. **Dependency blindness**: No unified tool correlates CPU, memory, disk I/O, and network behavior across service relationships. An operator cannot quickly answer: "Is this pod slow because of itself, or because of its upstream dependency?"
3. **Reactive operations**: Teams respond after failures. No system predicts failure before it occurs or provides NLP-accessible operational intelligence.

---

## 3. Solution Architecture

### 3.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        KubeMind AI Platform                       │
│                                                                    │
│  ┌─────────────┐  WebSocket/REST  ┌──────────────────────────┐   │
│  │  React SPA   │◄────────────────►│     FastAPI Backend        │   │
│  │  (Vite/TS)  │                  │                            │   │
│  │             │                  │  ┌─────────────────────┐  │   │
│  │  Dashboard  │                  │  │   Data Ingestion     │  │   │
│  │  Dep. Graph │                  │  │  K8s API Driver      │  │   │
│  │  AI Agents  │                  │  │  Prometheus Driver   │  │   │
│  │  NLP Chat   │                  │  │  Cluster Simulator   │  │   │
│  │  Timeline   │                  │  └──────────┬──────────┘  │   │
│  └─────────────┘                  │             │              │   │
│                                   │  ┌──────────▼──────────┐  │   │
│                                   │  │   Intelligence Layer │  │   │
│                                   │  │  Anomaly Detector    │  │   │
│                                   │  │  Trend Engine        │  │   │
│                                   │  │  Correlation Engine  │  │   │
│                                   │  │  NLP Engine          │  │   │
│                                   │  └──────────┬──────────┘  │   │
│                                   │             │              │   │
│                                   │  ┌──────────▼──────────┐  │   │
│                                   │  │  Multi-Agent System  │  │   │
│                                   │  │  7 Specialized Agents│  │   │
│                                   │  └──────────┬──────────┘  │   │
│                                   │             │              │   │
│                                   │  ┌──────────▼──────────┐  │   │
│                                   │  │  Persistent Store    │  │   │
│                                   │  │  SQLite + MetricStore│  │   │
│                                   │  └─────────────────────┘  │   │
│                                   └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Ingestion Pipeline

The platform supports three data modes that switch automatically:

| Mode | Source | Activation |
|------|--------|-----------|
| **LIVE** | K8s API + Prometheus | Real cluster with metrics-server |
| **HYBRID** | Real pod metadata + simulated metrics | K8s reachable, no Prometheus |
| **SIMULATION** | Deterministic simulator | No cluster (demo/edge offline) |

**K8s Driver** (`backend/data/k8s_driver.py`): Uses the official `kubernetes` Python client to query pod states, fetch container logs for failing pods, discover service dependencies via Endpoints/Env var analysis, and execute remediation actions (pod restart, deployment scaling).

**Prometheus Driver** (`backend/data/prometheus_driver.py`): Queries a Prometheus instance for high-fidelity CPU, memory, network, and storage I/O metrics using PromQL, replacing simulated values with real ones.

**Simulator** (`backend/data/simulator.py`): Generates deterministic metric streams for 5 microservices using sinusoidal base patterns with Gaussian noise. Supports three triggerable anomaly scenarios:
- `pvc_cascade`: PostgreSQL PVC write saturation cascading to auth and frontend
- `memory_leak`: Redis monotonic memory growth (OOMKill risk)
- `cpu_storm`: Payment service CPU spike from simulated retry loop

### 3.3 Intelligence Layer

**Anomaly Detector** (`backend/engines/anomaly_detector.py`):
- Threshold-based detection with configurable WARNING/CRITICAL levels per metric
- Z-score statistical anomaly detection using 60-sample sliding windows
- Deduplicated output: highest severity per pod+metric pair only

**Trend Engine** (`backend/engines/trend_engine.py`):
- Maintains 120-sample rolling history per pod per metric
- Detects directional trends by comparing first-half vs second-half averages
- Classifies as `increasing`, `decreasing`, or `stable`
- Enables Memory Leak Agent to distinguish pressure (static) from leak (monotonic growth)

**Correlation Engine** (`backend/engines/correlation_engine.py`):
- Priority-ordered rule set mapping multi-service anomaly patterns to causal chains
- Rules encode known failure modes: PVC cascade, memory leak, CPU storm, multi-service latency
- Returns human-readable causal chains, affected pods, and actionable recommendations

**NLP Engine** (`backend/engines/nlp_engine.py`):
- Intent-routing natural language processor with 13 intent handlers
- Maps user questions to live cluster state using structured query routing
- Returns context-aware responses with severity classification and confidence scores
- Intent categories: slow/latency, CPU, memory, storage, network, crash, health, recommendations, prediction, incident report, resource optimization, root cause, dependencies

### 3.4 Multi-Agent AI System

Seven specialized agents run in parallel each telemetry cycle (every 2 seconds). The Stabilization Recommendation Agent runs last, synthesizing all other results:

| Agent | Icon | Domain | Key Signal |
|-------|------|--------|-----------|
| CPU Contention Agent | ⚙️ | CPU & Processing | cpu_percent spikes |
| Memory Leak Agent | 🧠 | Memory & Cache | memory_pct + trend direction |
| PVC Saturation Agent | 💾 | PVC & Disk I/O | pvc_write_mbps, pvc_read_mbps |
| Retry Storm Agent | 🌐 | Network & Traffic | latency_ms, network_in_mbps |
| Cluster SRE Supervisor | 🛡️ | Site Reliability | node balance, global avg CPU |
| Dependency Impact Agent | 🔥 | Dependency & Impact | BFS blast radius on graph |
| Stabilization Agent | 💡 | Remediation | Synthesis of all agents |

Each agent produces:
- **Status**: INFO / WARNING / CRITICAL
- **Finding**: Human-readable single-sentence diagnosis
- **Reasoning**: Step-by-step inference log (expandable in UI)
- **Confidence**: 0.0–1.0 score
- **Recommendation**: Specific remediation action
- **Buffer Action**: Machine-executable remediation command
- **Mitigation Safety**: LOW_RISK / MEDIUM_RISK classification

### 3.5 Dependency Graph

The dependency graph is built from two sources:

1. **Static simulation edges**: 6 hardcoded relationships between the 5 demo microservices
2. **Dynamic discovery** (when connected to live cluster): Parses Kubernetes Services, Endpoints, and Pod environment variables to infer inter-service communication paths

Each edge is marked `hot: true` when either the source or target pod has latency above 80ms, causing the UI to render animated red pulse indicators on the graph edge.

The Dependency Impact Analysis Agent performs BFS traversal on this graph to compute blast radius — the number of services reachable from an anomalous pod.

### 3.6 Persistence Layer

`MetricStore` (`backend/data/metric_store.py`) uses SQLite with three tables:
- `metrics`: Full pod metric snapshots per tick
- `anomalies`: All detected anomalies with severity and message
- `incidents`: Confirmed causal chain correlations

The `/api/incident-log` endpoint serves this data to the Incident Replay page, enabling time-travel analysis of any recorded failure event.

### 3.7 Frontend Architecture

Built with React 19, TypeScript, Vite, and ECharts for data visualization.

**Real-time communication**: WebSocket connection to `/ws/metrics` with 2-second polling. Automatic fallback to browser-side simulation if backend is unreachable. Three operating modes: LIVE, DEGRADED, SIMULATION.

**Pages**:
- **Dashboard**: Health metrics, ECharts sparklines, topology graph mini-view, active alerts, AI agent strip
- **Dependency Map**: Full-screen force-directed graph with animated hot-path edges
- **AI Agents**: 7 agent cards with expandable reasoning logs and one-click remediation
- **NLP Chat**: Natural language interface with quick-ask suggestions
- **Incident Replay**: Timeline of real persisted incidents fetched from backend + live anomaly stream

---

## 4. AI Methodology

### 4.1 Why Multi-Agent vs Monolithic

A monolithic model would require retraining for every new failure pattern. Our agent-per-domain design provides:

- **Specialization**: Each agent has domain-specific thresholds and heuristics tuned to its signal type
- **Explainability**: Each agent produces a reasoning log auditable by SREs
- **Extensibility**: Adding a new agent (e.g., Log Intelligence Agent using Loki) requires no changes to existing agents
- **Safety**: The Stabilization Agent acts as a consensus layer — it only escalates when multiple domain agents agree

### 4.2 Causal vs Symptomatic Detection

The correlation engine distinguishes root causes from symptoms by:
1. Mapping anomaly timestamps to known propagation patterns
2. Weighting by dependency graph proximity (upstream pods are likely causes)
3. Matching against priority-ordered rule patterns

Example: A `latency_ms` anomaly on `frontend-service` alone is a symptom. The same anomaly co-occurring with `pvc_write_mbps` on `postgres-db` matches the `pvc_cascade` rule and is classified as a root cause incident.

### 4.3 NLP Design Philosophy

The NLP engine uses intent routing rather than embedding similarity because:
- Operational queries follow predictable patterns ("why is X slow", "what will fail next")
- Rule-based routing provides deterministic, auditable behavior for safety-critical environments
- Zero latency: no LLM API call required, responses are instantaneous
- Context-aware: every response is generated from live cluster state, not static templates

---

## 5. Industrial Edge Alignment

KubeMind AI is designed for the ABB industrial edge use case:

| Requirement | Implementation |
|-------------|---------------|
| K3s/MicroK8s support | K8s driver uses standard `kubernetes` client, compatible with all distributions |
| Single-node operation | Simulator and correlation engine work with 1-node clusters |
| Edge-offline resilience | Browser-side fallback simulator activates when backend is unreachable |
| Low resource footprint | FastAPI + SQLite, no external dependencies required beyond Python |
| Operational continuity | Three-mode operation (LIVE/DEGRADED/SIMULATION) ensures dashboard never goes blank |
| Predictive maintenance | Trend engine detects slow-burn failures (memory leaks, disk saturation) before OOMKill |
| NLP operational queries | SRE teams can ask operational questions in plain English — no PromQL required |

---

## 6. Demo Capabilities

### Triggerable Scenarios

| Scenario | Button | What It Simulates | AI Response |
|----------|--------|------------------|-------------|
| PVC Cascade | "PVC Cascade" | PostgreSQL storage I/O saturation | Storage Agent → Correlation Engine → causal chain |
| Memory Leak | "Memory Leak" | Redis monotonic memory growth | Memory Agent → OOMKill prediction |
| CPU Storm | "CPU Storm" | Payment service retry loop | CPU Agent → blast radius analysis |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend, K8s, and Prometheus connection status |
| GET | `/api/pods` | Current pod metrics snapshot |
| GET | `/api/dependencies` | Topology dependency graph |
| GET | `/api/anomalies` | Detected anomalies |
| GET | `/api/agents` | AI agent diagnostics |
| GET | `/api/correlations` | Causal incident correlations |
| GET | `/api/incident-log` | Persisted incident history |
| POST | `/api/simulate/anomaly` | Trigger scenario: `pvc_cascade`, `memory_leak`, `cpu_storm` |
| POST | `/api/nlp/query` | Natural language query |
| POST | `/api/remediate` | Execute remediation action |
| WS | `/ws/metrics` | Real-time 2-second telemetry stream |

---

## 7. Setup and Deployment

### Prerequisites
- Python 3.10+
- Node.js 20+
- (Optional) Minikube, K3s, or MicroK8s with metrics-server
- (Optional) Prometheus instance

### Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

One-command start:
```bash
# Windows
scripts\start-demo.bat

# macOS/Linux
chmod +x scripts/start-demo.sh && ./scripts/start-demo.sh
```

### Environment Variables

Copy `.env.example` to `.env` and configure:
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/metrics
FORCE_SIMULATION_MODE=false  # set true to always use simulator
```

---

## 8. Risk Analysis and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No live Kubernetes cluster | Demo breaks | Simulation fallback always active |
| Prometheus unreachable | Metrics gap | K8s API driver provides fallback; simulator fills gaps |
| WebSocket disconnect | Dashboard blank | Auto-reconnect + browser-side simulator activates in 15s |
| False positive anomalies | Operator alert fatigue | Z-score gating + minimum window of 10 samples before flagging |
| Agent errors | Missing AI output | try/catch in run_all_agents with graceful ERROR status fallback |
| SQLite file corruption | History loss | In-memory incident_log provides real-time fallback |

---

## 9. Roadmap (if shortlisted for Round 2)

1. **Loki log integration**: Log Intelligence Agent querying Loki for error pattern detection
2. **LSTM-based forecasting**: Replace trend engine with LSTM for more accurate OOMKill time prediction
3. **Prometheus alerting rules**: Auto-generate Prometheus alerting rules from AI findings
4. **Multi-namespace support**: Extend dependency graph to cross-namespace topologies
5. **Helm chart**: Package for one-command Kubernetes deployment

---

## 10. Team Acknowledgements

Built for ABB Accelerator 2026, Theme 2: Beyond Monitoring.
Platform: KubeMind AI v1.0
