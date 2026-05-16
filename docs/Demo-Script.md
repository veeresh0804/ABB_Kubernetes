# KubeMind AI - 5 Minute Demo Script

---

### **Phase 1: Baseline & Introduction (30s)**

*(Screen shows the healthy KubeMind dashboard. All metrics are green. The dependency graph is stable.)*

**Narrator:** "Good morning. We're presenting KubeMind AI, an operational intelligence platform designed for complex Kubernetes environments. What you see here is a live, healthy cluster with 5 microservices. KubeMind is not just a monitoring dashboard; it's an AI SRE that understands *why* systems fail."

"Our platform ingests a hybrid of real Prometheus metrics and deterministic operational simulations. The dependency graph is mapped dynamically, showing us how services like our `frontend` talk to the `auth-service` and `postgres-db`."

---

### **Phase 2: Trigger Incident & Visualize Propagation (60s)**

*(Narrator clicks the "PVC Cascade" scenario button.)*

**Narrator:** "Now, let's simulate a common industrial edge failure: a storage bottleneck. I'm injecting a PVC saturation event on the `postgres-db`."

*(The screen immediately reacts:*
*- A **SEV-1 CRITICAL INCIDENT** banner appears.*
*- The `postgres-db` node on the graph turns red and starts glowing.*
*- An animated pulse travels from `postgres-db` to `auth-service`, then to `frontend-service`.*
*- The "Cluster Story" panel appears at the top.)*

**Narrator:** "Instantly, KubeMind detects the anomaly. But more importantly, it understands the **blast radius**. The AI shows the failure propagating—the database issue is now causing latency in the auth service, which is degrading our entire frontend. We've moved beyond isolated alerts to a visualized, causal story of failure."

---

### **Phase 3: AI Explanation & Root Cause Analysis (60s)**

*(Narrator points to the "Cluster Story" panel.)*

**Narrator:** "This is the core of KubeMind. Instead of a dozen disconnected alerts, the AI provides a single, coherent **operational narrative**. It has already identified the root cause: PVC saturation, not a bug in the frontend."

*(Narrator opens the "AI Agents" tab. Clicks to expand the Storage Agent.)*

**Narrator:** "How does it know? Our multi-agent system works in parallel. The Storage Agent provides its reasoning: it detected a write I/O spike on the database. The Network Agent then correlated this with increased latency on dependent services. The AI correctly distinguishes **symptom** from **cause**."

---

### **Phase 4: Autonomous Remediation (45s)**

*(Narrator navigates back to the Dashboard and points to the "Recommended Remediation" in the story panel.)*

**Narrator:** "The AI doesn't just diagnose; it recommends a solution: 'Scale DB storage throughput and throttle retries.' For demo purposes, we've mapped this to a quick remediation action."

*(Narrator clicks the "QUICK REMEDIATE" button on the CPU Agent card.)*

**Narrator:** "We're now executing an autonomous remediation—scaling the affected dependent service to handle the pressure. The system is configured to take direct action, turning insight into resolution."

*(The graph begins to stabilize. The SEV-1 banner downgrades to SEV-2, then disappears. Metrics return to green.)*

**Narrator:** "As the remediation takes effect, the system intelligently de-escalates the incident. The cluster is now returning to a healthy state."

---

### **Phase 5: Historical Replay & Conclusion (30s)**

*(Narrator navigates to the "Incident Log" page.)*

**Narrator:** "Finally, no incident is ever forgotten. KubeMind's persistent memory records every step of the failure. Our operational timeline provides a clear, second-by-second reconstruction of the entire event, from initial trigger to final resolution."

"This allows SRE teams to analyze recurring patterns and move from reactive firefighting to proactive reliability. Thank you."
