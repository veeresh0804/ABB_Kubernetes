# KubeMind AI: Autonomous Infrastructure Cognition Platform

**KubeMind AI** is a next-generation, AI-native operational intelligence fabric designed to transform Kubernetes observability into autonomous infrastructure cognition. It moves beyond traditional monitoring by implementing a distributed cognitive architecture that reasons, simulates, and self-corrects in real-time.

![Version](https://img.shields.io/badge/version-2.0.0-blue) ![Status](https://img.shields.io/badge/category-Operational_Cognition-purple) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 Strategic Architectural Vision

KubeMind AI has evolved from a monitoring dashboard into a **Distributed Cognitive Operating System** for infrastructure. The platform functions as a unified "World Model" of the cluster, capable of distinguishing causal root causes from symptoms and evaluating stabilization strategies in a virtual sandbox.

### **Core Intelligent Layers**

| Layer | Component | Function |
|-------|-----------|----------|
| **Foundation** | **Event-Driven Fabric** | An asynchronous nervous system using a central Event Bus and decoupled workers. |
| **State** | **Operational State Engine** | The centralized "Single Source of Truth" that maintains global operational context. |
| **Cortex** | **Cognitive AI Mesh** | A distributed multi-agent system of specialized sensors and domain experts. |
| **Context** | **Operational Knowledge Graph** | Topology-aware reasoning that understands service relationships and blast radius. |
| **Memory** | **Hybrid Operational Memory** | Persistent semantic storage for anomaly fingerprints and historical reasoning. |
| **Foresight**| **Predictive Intelligence** | Multi-horizon forecasting (Immediate, Short-term, Long-term) with temporal smoothing. |
| **Sandbox** | **Digital Operational Twin** | High-fidelity simulation supporting counterfactual "What-if" reasoning. |
| **Governance**| **Cognitive Governance** | Forensic audit trails, decision versioning, and recursive learning via a Truth Observer. |

---

## ✨ Key Cognitive Features

### 🔍 **Topology-Aware Causal Inference**
Unlike simple correlation engines, KubeMind AI uses its Knowledge Graph to perform **Causal Inference**. By analyzing dependency propagation paths, the system can isolate "Patient Zero" in complex cascading failures.

### 🛡️ **Autonomous Decision Intelligence**
The platform doesn't just report issues; it **evaluates actions**. For every incident, the **Decision Engine** generates multiple stabilization plans, testing each against the **Digital Twin** to provide explicit **Recovery Probabilities** and **Risk Scores**.

### 📈 **Predictive Stability Mesh**
The Predictive Intelligence Layer provides continuous failure forecasting. Using **Temporal Smoothing** and confidence consensus (0.7+), it eliminates noise to provide reliable count-downs to potential OOMKills or CPU storms.

### 📜 **Forensic Audit & Lineage**
Every AI conclusion is versioned and traceable. The **Reasoning Audit Trail** allows engineers to drill down into the specific evidence—metrics, logs, and agent contributions—that led to an inference.

### 🔄 **Recursive Operational Learning**
The **Truth Observer** monitors reality against predictions. Successful forecasts increase an agent's **Trust Reputation**, while false positives dampen influence, ensuring the cognitive mesh adapts and matures over time.

---

## 🖥️ Command Center UI

The frontend has been evolved into an **Operational Cognition Workspace**:

- **Executive Intelligence Layer** — High-level operational scores and aggregated instability risk.
- **Cognitive Load Monitor** — Real-time visibility into AI confidence and reasoning latency.
- **Stabilization Planner** — Interface for comparing AI-simulated counterfactual strategies.
- **Reasoning Trace** — Forensic view of the metrics and agents contributing to a diagnosis.
- **Reputation Indicators** — Visual transparency into the historical trust of every AI agent.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 20+
- npm 10+

### 2. Launch the Platform
KubeMind AI is designed to be portable and demo-ready.

```bash
# Clone the repository
git clone https://github.com/veeresh0804/ABB_Kubernetes.git
cd ABB_Kubernetes

# Run the unified launcher (Windows)
scripts\start-demo.bat

# Run the unified launcher (macOS/Linux)
chmod +x scripts/start-demo.sh
./scripts/start-demo.sh
```

The platform will automatically start the **FastAPI Cognitive Backend** (:8000) and the **React Command Center** (:5173).

---

## 📂 Project Structure (Evolved)

```
ABB_Kubernetes/
├── backend/                  # AI-Native Cognitive Monolith
│   ├── agents/               # Cognitive AI Mesh (Log, CPU, Memory, etc.)
│   │   ├── mesh.py           # Orchestration Layer
│   │   └── log_agent.py      # Semantic Log Intelligence
│   ├── engines/              # Reasoning Layers
│   │   ├── causal_engine.py  # Topology-aware Causal Inference
│   │   └── decision_engine.py# Strategy Evaluation Engine
│   ├── data/                 # Digital Twin & Drivers
│   │   ├── simulator.py      # Digital Twin with Counterfactual logic
│   │   └── metric_store.py   # Hybrid Operational Memory (SQLite)
│   ├── event_bus.py          # Asynchronous Nervous System
│   ├── state_engine.py       # Operational State Engine
│   ├── knowledge_graph.py    # Topology Intelligence Service
│   ├── predictor.py          # Multi-horizon Predictive Layer
│   ├── truth_observer.py     # Recursive Learning Loop
│   └── main.py               # Gateway & REST/WS API
│
├── frontend/                 # Forensic Cognition Workspace
│   ├── src/
│   │   ├── components/       # Layout, OperationalStory, DiagnosticPanel
│   │   ├── hooks/            # useCluster (State Sync), useTheme
│   │   └── pages/            # CommandCenter, Agents, Replay, NLPChat
```

---

## 🧪 Intelligence Verification

The platform's architecture has been validated for:
- **Causal Consistency** under noisy telemetry.
- **Decision Stability** across versioned diagnostic cycles.
- **Type Safety** via strict TypeScript and Pydantic schemas.
- **Operational Trust** through evidence-grounded explainability.

---

## 📄 License

MIT - Developed for the ABB Accelerator 2026.
