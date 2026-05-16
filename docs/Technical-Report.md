# KubeMind AI — Technical Documentation

## 1. System Overview
KubeMind AI is a real-time Kubernetes intelligence platform designed to move "Beyond Monitoring" by providing causal analysis and autonomous agent-driven insights. It uses a multi-agent system to monitor resource domains and a correlation engine to identify root causes of cluster-wide incidents.

## 2. Architecture

### 2.1 Backend (Python / FastAPI)
The backend serves as the core intelligence layer. It maintains a simulated Kubernetes cluster state and runs periodic analysis cycles.

- **Data Simulator (`backend/data/simulator.py`)**: Generates high-fidelity metric streams for 5 microservices. Supports triggerable anomaly scenarios (PVC Cascades, Memory Leaks, CPU Storms).
- **K8s Driver (`backend/data/k8s_driver.py`)**: Connects to the live Kubernetes API to discover real pods, fetch metadata, tail pod logs, and execute remediation actions (scaling, pod restarts).
- **Prometheus Driver (`backend/data/prometheus_driver.py`)**: Queries a Prometheus instance for high-fidelity metrics (CPU, Memory, Network, Storage I/O) to replace simulated data when available.
- **Metric Store (`backend/data/metric_store.py`)**: SQLite database providing persistent long-term memory for metrics, anomalies, and incident correlations.
- **Anomaly Detector (`backend/engines/anomaly_detector.py`)**: Statistical engine that flags metric deviations using z-score analysis and thresholding.
- **Trend Engine (`backend/engines/trend_engine.py`)**: Analyzes historical metric windows to detect slow-burn trends like memory leaks.
- **Correlation Engine (`backend/engines/correlation_engine.py`)**: A rule-based system that maps patterns of anomalies across multiple services to known causal chains (e.g., storage saturation cascading to frontend slowdown).
- **Multi-Agent System (`backend/agents/agents.py`)**: 7 specialized agents (CPU, Memory, Storage, Network, Log, Cluster SRE, Recommendation) that perform domain-specific analysis and provide structured insights with deep reasoning.
- **NLP Engine (`backend/engines/nlp_engine.py`)**: Natural language query processor that translates user questions into context-aware reports using the current live state of the cluster.

### 2.2 Frontend (React / TypeScript / Vite)
A modern, high-performance dashboard built for operational awareness.

- **Dashboard**: Real-time metric visualization, trend arrows, and active anomaly alerts.
- **Dependency Map**: Dynamic force-directed graph showing service relationships discovered in real-time. Identifies "hot paths" where latency or errors are cascading.
- **AI Agents View**: Real-time feed of findings and deep-dive reasoning from the 7 specialized agents.
- **Action Center**: UI bindings to trigger backend `/api/remediate` commands for autonomous self-healing.
- **NLP Chat**: Interactive interface for querying the cluster state in plain English.
- **Incident Replay**: Historical view of cluster health and incident progression, backed by the SQLite persistent store.

## 3. AI Methodology

### 3.1 Multi-Agent Analysis
Instead of a monolithic model, KubeMind AI uses specialized agents. This allows for:
- **Domain Expertise**: The Storage Agent understands PVC IOPS and WAL tuning, while the Log Agent performs deep pattern matching on real Kubernetes logs (e.g., catching "exceptions" or "timeouts").
- **Parallel Processing**: Agents run independently, ensuring the system remains responsive.
- **Consensus & Synthesis**: The Recommendation Agent synthesizes findings from all other agents to produce high-level remediation strategies, which can be executed autonomously via the Remediation API.

### 3.2 Causal Correlation
The platform distinguishes between "symptoms" and "root causes." By mapping the dynamic dependency graph (discovered via Services, Endpoints, and Env vars) against anomaly timestamps, the system can distinguish between a service that is slow because it's failing and a service that is slow because its database is saturated.

## 4. Operational Flow
1. **Metrics Ingestion**: Real-time capture of CPU, Memory, I/O, and Network.
2. **Anomaly Detection**: Identification of statistical outliers.
3. **Agent Analysis**: Specialized agents analyze their respective domains.
4. **Causal Mapping**: Correlation engine identifies the incident root cause.
5. **Insights Delivery**: Results are streamed via WebSockets to the frontend and made available via NLP queries.
