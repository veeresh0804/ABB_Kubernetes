# KubeMind AI — Full Video Narration Script
# ABB Accelerator 2026 · Theme 2: Beyond Monitoring
# Target duration: 4:30–5:00 minutes

---

## PRE-RECORDING CHECKLIST

Before recording:
- [ ] `python main.py` running in backend/
- [ ] `npm run dev` running in frontend/
- [ ] Browser open at http://localhost:5173
- [ ] Cluster in NORMAL state (no anomaly active)
- [ ] Open browser DevTools Network tab closed (keep screen clean)
- [ ] Screen resolution: 1920x1080, browser zoom: 90%

---

## SEGMENT 1 — Introduction and Baseline (0:00–0:40)

**[Screen: Dashboard page, all green, healthy state]**

**Narrator:**
"Good morning. We are presenting KubeMind AI — an AI-powered Kubernetes
operational intelligence platform built for industrial edge environments.

What you see here is a live cluster running five microservices. Notice the
dependency graph at the top left — this is not a static diagram. KubeMind has
discovered these service relationships dynamically by analyzing Kubernetes
service endpoints and network communication patterns.

The key metric on screen is the health score — currently at 97 out of 100.
Seven AI agents are running continuously in the background, each monitoring a
different resource domain: CPU, memory, storage, network, site reliability,
dependency impact, and cross-agent synthesis.

KubeMind is not a dashboard. It is an AI SRE — it understands *why* systems
fail, not just *that* they failed."

**[Action: point cursor slowly across the dependency graph, then to the health score]**

---

## SEGMENT 2 — Trigger the Incident (0:40–1:10)

**[Screen: Dashboard — cursor moves to top bar scenario buttons]**

**Narrator:**
"Let's simulate a failure pattern common in industrial edge deployments —
a storage bottleneck cascading through connected services.

I'm triggering a PVC saturation scenario on the PostgreSQL database — exactly
the kind of failure that affects factory-floor data pipelines and SCADA
systems relying on persistent storage."

**[Action: Click the 'PVC Cascade' button in the top bar]**

**[Screen: Dashboard begins reacting — health score drops, red alerts appear, topology edges turn red]**

**Narrator:**
"Immediately, KubeMind detects the anomaly. The database node turns critical.
But notice what happens next — the failure propagates. The auth service,
which depends on postgres for session validation, begins showing elevated
latency. The frontend service starts degrading.

This is the blast radius in real time. KubeMind is not showing you five
separate alerts. It is showing you one incident — and its causal path."

---

## SEGMENT 3 — Dependency Map and Root Cause (1:10–1:55)

**[Action: Click 'Dependency Map' in the sidebar]**

**[Screen: Full-screen force-directed graph — postgres node glowing red, animated pulses on hot edges]**

**Narrator:**
"Switch to the dependency map. The red animated edges show you exactly where
anomalous traffic is flowing. Postgres is the epicenter. Auth service is
downstream. Frontend is the final affected layer.

This is interdependency mapping — one of the core requirements ABB specified.
In industrial environments, a failure in one subsystem can silently degrade
an entire control pipeline. KubeMind makes the propagation path visible and
explainable."

**[Action: Point cursor to the red edge between postgres and auth-service]**

**Narrator:**
"The AI root cause chain appears at the bottom — PostgreSQL PVC I/O saturated,
causing auth service retries, causing frontend degradation. Three sentences
instead of thirty alerts."

---

## SEGMENT 4 — AI Agents Deep Dive (1:55–2:45)

**[Action: Click 'AI Agents' in the sidebar]**

**[Screen: 7 agent cards, Storage Agent and CPU Agent showing CRITICAL badges]**

**Narrator:**
"Now let's look inside the AI. Seven specialized agents are running in parallel,
each an expert in its resource domain.

The PVC Saturation Agent has detected postgres write I/O at elevated levels and
classified it as the root cause. Let me expand its reasoning log."

**[Action: Click the 'AI REASONING LOG' expand arrow on the PVC Saturation Agent card]**

**[Screen: Reasoning steps expand: 'Evaluating PVC throughput...', 'I/O levels categorized as CRITICAL']**

**Narrator:**
"Every diagnostic step is auditable. This is not a black box — you can see
exactly how the agent reached its conclusion.

Now look at the Dependency Impact Analysis Agent. It has performed a graph
traversal — a BFS search across the service topology — and calculated that
this single failure has a blast radius of three services. That is the
information an industrial SRE needs within seconds of an alert."

**[Action: Point to Dependency Impact Agent card showing blast radius]**

**Narrator:**
"Finally, the Stabilization Recommendation Agent synthesizes all findings.
It has produced one prioritized action: expand PVC IOPS limits and enable
connection pooling. No manual correlation. No war room. AI did it in under
four seconds."

---

## SEGMENT 5 — NLP Natural Language Query (2:45–3:20)

**[Action: Click 'NLP Query' in the sidebar]**

**[Screen: Chat interface]**

**Narrator:**
"KubeMind also provides a natural language interface. Any engineer — not just
a Kubernetes expert — can ask operational questions in plain English."

**[Action: Type "Why is the cluster slow?" and press Enter]**

**[Screen: AI response appears with bold root cause explanation]**

**Narrator:**
"The AI responds instantly — not with a generic template, but with a response
constructed from live cluster state. It explains the PostgreSQL PVC saturation,
the auth service cascade, and the exact frontend latency impact.

Let me ask one more."

**[Action: Click quick-ask button "Which pod will fail next?"]**

**[Screen: Predictive response about redis-cache OOMKill risk]**

**Narrator:**
"Predictive intelligence. The platform has detected a memory growth trend on
the redis cache and is predicting an OOMKill event if left unaddressed.
This is the difference between reactive monitoring and proactive reliability."

---

## SEGMENT 6 — Remediation (3:20–3:50)

**[Action: Click 'AI Agents' in sidebar, scroll to the CPU Contention Agent]**

**[Screen: CPU Agent card showing CRITICAL status with 'EXECUTE: SCALE DEPLOYMENT' button]**

**Narrator:**
"KubeMind does not just diagnose. It acts. Each agent can propose a safe,
bounded remediation action. Here the CPU Agent recommends scaling the payment
service deployment.

I will execute this directly from the dashboard."

**[Action: Click the 'EXECUTE: SCALE DEPLOYMENT' button]**

**[Screen: Brief loading state, then success notification]**

**Narrator:**
"The remediation has been sent to the Kubernetes API. In a live cluster, the
deployment would scale immediately. The platform is configured in 'RECOMMEND'
mode for demo — in production 'STABILIZE' mode, these actions execute
autonomously when confidence exceeds threshold."

---

## SEGMENT 7 — Incident Timeline and Closing (3:50–4:30)

**[Action: Click 'Incident Log' in sidebar]**

**[Screen: Timeline showing real events fetched from SQLite + live anomaly events]**

**Narrator:**
"Finally — every incident is permanently recorded. KubeMind's persistent store
captures the full sequence: detection, analysis, diagnosis, mitigation.

This is not just for post-mortems. For industrial operators running 24/7
facilities, this audit trail is the difference between a one-time fix and a
pattern-based reliability improvement.

An engineer reviewing this timeline can see exactly when the storage anomaly
began, how long it took the AI to identify the root cause, and what
remediation was applied. Full operational transparency."

**[Action: Pause on the timeline for 3 seconds]**

**Narrator:**
"KubeMind AI — real-time pod resource discovery, dependency mapping, anomaly
detection, AI recommendations, and NLP insights — in a platform that runs
on Minikube, K3s, or any industrial edge Kubernetes deployment.

Thank you."

---

## POST-RECORDING NOTES

- Record at 1080p minimum
- Use a quality microphone — judges will listen carefully
- Keep the cursor moving but slow — fast cursor movement looks nervous
- Do NOT show any terminal windows or backend logs on screen
- If you need to pause between segments: pause the video, set up the next screen, then continue
- Render at 1080p 30fps, MP4 format
- Total target: under 5 minutes (submission requirement)
