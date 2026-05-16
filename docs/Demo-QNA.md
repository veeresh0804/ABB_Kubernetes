# KubeMind AI - Expected Q&A

| Question | Expected Answer |
| :--- | :--- |
| **Is the telemetry real?** | It’s a hybrid. We pull real-time pod metadata from the Kubernetes API and high-fidelity metrics from Prometheus. For reliability, we can also blend this with a deterministic operational simulation. |
| **Why use simulation?** | For deterministic reliability modeling. It allows us to train and test our AI's response to specific, known failure modes—like a PVC cascade—without risking live infrastructure. |
| **How is the AI implemented?** | It’s a hybrid intelligence system. We use statistical models for anomaly detection, a rule-based correlation engine for known failure patterns, and a multi-agent architecture for domain-specific reasoning. |
| **Why SQLite?** | For lightweight, zero-dependency operational persistence. It’s perfect for an edge-focused platform, providing long-term memory for incident analysis without the overhead of a large database. |
| **How scalable is it?** | The architecture is modular. The backend is built on async Python, and the telemetry layer is designed to support additional data sources. The agents run as independent parallel processes, allowing for horizontal scaling of the intelligence layer. |
| **What’s the most unique thing?** | Its ability to deliver **causal operational intelligence**. Most tools show you *what* is broken. KubeMind explains *why* it's broken by understanding the dependency graph and the story of how failure propagates. |
