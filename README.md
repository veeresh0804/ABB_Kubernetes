# KubeMind AI

**Kubernetes Operations Intelligence Platform** — Real-time AI-assisted Kubernetes monitoring, diagnostics, and incident response.

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Status](https://img.shields.io/badge/status-operational-green)

---

## Features

- **Real-time Telemetry Dashboard** — Live CPU, memory, network, and latency metrics with streaming updates
- **Infrastructure Topology Graph** — Force-directed dependency visualization with health status overlays
- **AI Diagnostic Console** — 7 specialized AI agents (CPU, Memory, PVC, Retry, SRE, Stabilization, Dependency Impact)
- **Incident Detection & Correlation** — Automatic anomaly detection with blast radius analysis
- **Operational Timeline** — Streaming event log with severity classification
- **Connection Health Monitoring** — Live backend, WebSocket, Prometheus, and Kubernetes status
- **Simulation Fallback** — Self-contained browser-side simulator ensures dashboard never appears broken
- **Dark/Light Theme** — Industrial dark theme and clean light theme with smooth transitions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, ECharts, Lucide Icons |
| **Backend** | Python, FastAPI, WebSockets, Uvicorn |
| **AI Engine** | Custom agent framework with 7 diagnostic agents |
| **Simulator** | Backend + browser-side fallback simulation |
| **Storage** | In-memory metric store with SQLite persistence |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- npm 10+

### 1. Clone & Install

```bash
git clone https://github.com/veeresh0804/ABB_Kubernetes.git
cd ABB_Kubernetes
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on `http://localhost:8000`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### One-Command Start

**Windows:**
```bash
scripts\start-demo.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/start-demo.sh
./scripts/start-demo.sh
```

---

## Modes

| Mode | Description |
|------|-------------|
| **LIVE** | Backend connected, real WebSocket telemetry streaming |
| **SIMULATION** | Backend unavailable, browser-side fallback generating realistic metrics |
| **DEGRADED** | Backend reachable but WebSocket disconnected, automatically reconnecting |

The platform automatically transitions between modes. No manual intervention needed.

---

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Frontend   │ ◄──── REST ────► │   Backend     │
│  (:5173)     │                   │  (:8000)      │
│              │                   │               │
│  Dashboard   │                   │  Simulator    │
│  Topology    │                   │  AI Agents    │
│  AI Console  │                   │  Correlation  │
│  Timeline    │                   │  Store        │
└─────────────┘                   └──────────────┘
       │                                │
       │  Fallback Simulator            │
       │  (browser-side, always ready)  │
       └────────────────────────────────┘
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health and driver status |
| GET | `/api/pods` | Current pod metrics |
| GET | `/api/dependencies` | Topology dependency graph |
| GET | `/api/anomalies` | Detected anomalies |
| GET | `/api/agents` | AI agent diagnostics |
| GET | `/api/correlations` | Incident correlations |
| POST | `/api/simulate/anomaly` | Trigger simulation scenario |
| POST | `/api/nlp/query` | Natural language query |
| POST | `/api/remediate` | Execute remediation action |
| WS | `/ws/metrics` | Real-time telemetry stream |

---

## AI Agents

| Agent | Domain | Function |
|-------|--------|----------|
| 🔥 CPU Contention Agent | CPU · Real-time Analysis | Detects CPU pressure and contention |
| 💧 Memory Leak Agent | Memory · Trend Analysis | Identifies memory growth patterns |
| 💾 PVC Saturation Agent | Storage · I/O Analysis | Monitors disk I/O and saturation |
| 🔄 Retry Storm Agent | Network · Traffic Analysis | Detects network retry anomalies |
| 🧠 Cluster SRE Supervisor | Cross-agent Synthesis | Aggregates all agent findings |
| ⚡ Stabilization Recommendation | Remediation | Suggests auto-remediation actions |
| 🌐 Dependency Impact Analysis | Topology · Graph | Analyzes blast radius and cascading failures |

---

## Simulation Scenarios

Click scenario buttons in the top bar to trigger:

- **PVC Cascade** — PostgreSQL storage I/O cascade failure
- **Memory Leak** — Redis memory growth anomaly
- **CPU Storm** — Payment service CPU spike

AI agents respond with diagnostics, confidence scores, and remediation recommendations.

---

## Project Structure

```
ABB_Kubernetes/
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── components/   # Layout, Dashboard, DiagnosticPanel
│   │   ├── hooks/        # useCluster, useTheme, useConnectionState
│   │   └── pages/        # Dashboard, Agents, Dependencies, NLPChat
│   ├── package.json
│   └── vite.config.ts
│
├── backend/           # FastAPI server
│   ├── agents/           # AI agent implementations
│   ├── data/             # Simulator, drivers, metric store
│   ├── engines/          # Anomaly detection, correlation, NLP
│   ├── main.py
│   └── requirements.txt
│
├── docs/              # Documentation
├── scripts/           # Startup scripts (.bat / .sh)
├── .gitignore
├── .env.example
└── README.md
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| WebSocket ECONNREFUSED | Ensure backend is running on port 8000 |
| Blank dashboard | Wait 15s — fallback simulator auto-activates |
| No AI output | Check backend logs for agent initialization errors |
| ECharts chunk warning | Expected — charting library is large |

---

## License

MIT
