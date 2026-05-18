# KubeMind AI — Comprehensive Issues Report

> Generated: 2026-05-18
> Scope: Remaining bugs, tech debt, and enhancements found during system audit.
> These items are NOT fixed — for your agent to resolve.

---

## 🔴 CRITICAL (3)

### CRITICAL-01: WebSocket Payload Lacks `memory_pct` on Pod Metrics

**File:** `backend/data/simulator.py:242-254` → `_run_simulation_tick()`
**Type:** Data Integrity

The `PodMetric.memory_pct` field is never set in the simulated metrics returned by `_run_simulation_tick()`. The `memory_limit_mb` field is set (line 248: `pod["base_memory"] * 3.5`) but `memory_pct` is missing from the dict. In live Prometheus mode (`main.py:172`), it's only set when `memory_limit_mb > 0` — but the field is **required** by the `PodMetric` TS interface.

**Impact:** Frontend components that render `memory_pct` show `NaN` or `undefined` in live WebSocket mode.
**Fix:** Add `"memory_pct": round(min(memory / (pod["base_memory"] * 3.5), 1.0) * 100, 1)` to the metric dict in `_run_simulation_tick()`.

---

### CRITICAL-02: Fallback Mode NLP Query Returns Generic Message (Not Local)

**File:** `frontend/src/hooks/useCluster.ts:800-802`
**Type:** UX / Demo Quality

When the backend is unavailable and a user types an NLP query, the fallback returns a generic message: `"[Simulation Mode] KubeMind AI is operating in fallback mode..."`. Unlike scenarios (which trigger rich local data), NLP queries have no local response logic.

**Impact:** NLP chat is broken in standalone demo mode.
**Fix:** Add a local `_localNlpQuery()` function that uses the current `simStateRef` to generate keyword-routed responses (port the logic from `backend/engines/nlp_engine.py` to the frontend).

---

### CRITICAL-03: `IncidentReplay` Fetches from API, Not Local State

**File:** `frontend/src/pages/IncidentReplay.tsx:53`
**Type:** Integration

The `IncidentReplay` page calls `getIncidentLog()` which fetches `GET /api/incident-log` from the backend. When the backend is unavailable, it returns `{ log: [], count: 0 }`. The page never reads from local `state.correlations` as a fallback.

**Impact:** Incident Replay page is empty in standalone demo mode.
**Fix:** Fall back to `state.correlations` when the incident log API call fails or returns empty.

---

## 🟠 MAJOR (5)

### MAJOR-01: `sparkline` Never Populated in Live WebSocket Mode

**File:** `backend/main.py:157` → `websocket_publisher_worker()`
**Type:** Data Gap

The `ClusterState.sparkline?: number[]` field is generated only in `fallbackTick()` (frontend, line ~300). The backend's `state_engine.get_state()` never includes `sparkline`. Live-mode users see no sparkline chart data.

**Impact:** The sparkline chart (referenced in Dashboard, CommandCenter) is blank in live mode.
**Fix:** Generate a 20-point rolling sparkline in `state_engine.py` from the metric history.

---

### MAJOR-02: `Dependencies.tsx` ECharts Tooltip Colors Unresponsive to Theme

**File:** `frontend/src/pages/Dependencies.tsx:54-56`
**Type:** UI / Theme

The ECharts tooltip config uses hardcoded light-mode colors:
```typescript
backgroundColor: '#FFFFFF',
borderColor: '#E2E8F0',
textStyle: { color: '#0F172A', fontSize: 11 },
```
In dark mode, the white tooltip background will clash with the dark UI.

**Impact:** Poor visual appearance in dark mode.
**Fix:** Use CSS variables or dynamically detect theme:
```typescript
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
```

---

### MAJOR-03: `CommandCenter.tsx` Shimmer Placeholder vs Real Topology Graph

**File:** `frontend/src/pages/CommandCenter/CommandCenter.tsx:101-106`
**Type:** UX / Demo Quality

The "INFRASTRUCTURE FABRIC" panel shows a static shimmer with "TOPOLOGY INTELLIGENCE FABRIC ACTIVE" text instead of rendering the actual dependency graph from `state.graph`. The graph nodes/edges exist in state but are not rendered.

**Impact:** Wasted screen real estate — the most important panel is a static placeholder.
**Fix:** Render a simplified force-directed graph using `state.graph.nodes` and `state.graph.edges` (or integrate a small canvas/div-based topology view).

---

### MAJOR-04: `DigitalTwinLab` Shimmer Placeholder in "SIMULATION VIEWPORT" 

**File:** `frontend/src/pages/PageScaffolds.tsx:587`
**Type:** UX / Demo Quality

The DigitalTwinLab's "SIMULATION VIEWPORT" panel shows a static counter instead of a real simulation viewport. The scenario system now supports detailed tracking, but no visual simulation rendering exists.

**Impact:** The twin lab page is functionally useless.
**Fix:** Implement a mini timeline/event stream showing anomaly progression tick by tick with affected pods highlighted.

---

### MAJOR-05: `memory_leak` Auto-Clears Silently When Redis OOMs

**File:** `backend/data/simulator.py:229`
**Type:** Behavior

```python
if memory > 3800: status = "OOMKilled"; self.clear_anomaly()
```
The memory_leak scenario auto-clears itself when redis memory exceeds 3800MB. This is not communicated to the frontend — the scenario bar just disappears, which can confuse users.

**Impact:** Users wonder why the scenario ended without warning.
**Fix:** Emit an event or notification before auto-clearing, and set a "completed" flag instead of nulling the anomaly mode.

---

## 🟡 MEDIUM (6)

### MEDIUM-01: 10 Backend REST Endpoints Never Called by Frontend

**Files:** `backend/main.py:243-294`
**Type:** Code Cleanup / Tech Debt

The following REST endpoints exist but are never used by any frontend component:
- `GET /api/pods`, `/api/dependencies`, `/api/anomalies`, `/api/agents`, `/api/correlations`
- `GET /api/history/{pod_id}`, `/api/health-history`, `/api/forecast`
- `GET /api/stabilization/mode`, `POST /api/demo/reset`

All data is pushed via WebSocket instead. These endpoints add maintenance surface area with no benefit.

**Action:** Either remove them or add frontend HTTP-only routes that use them.

---

### MEDIUM-02: Extra Backend Fields Sent Over WebSocket

**File:** `backend/state_engine.py` → `backend/main.py:157`
**Type:** Performance / Bandwidth

The WebSocket payload includes `agent_trust_scores`, `active_strategies`, `type: "metrics_update"`, and `timestamp` — fields NOT part of the `ClusterState` interface. These extra keys add ~2KB to every 2-second push.

**Action:** Filter the payload to only include keys matching `ClusterState`.

---

### MEDIUM-03: Duplicate `ConnectionMode` Type Definition

**Files:** `frontend/src/hooks/useCluster.ts:89-95` + `frontend/src/hooks/useConnectionState.ts`
**Type:** Code Quality

The identical union type `'BOOTING' | 'CONNECTING' | 'LIVE' | 'DEGRADED' | 'SIMULATION' | 'RECONNECTING'` is defined in two files.

**Action:** Export from a single source (`useConnectionState.ts`) and import in `useCluster.ts`.

---

### MEDIUM-04: `trends` and `recent_logs` on `PodMetric` Never Populated

**File:** `frontend/src/hooks/useCluster.ts:13-14`
**Type:** Code Quality / Dead Code

```typescript
trends?: Record<string, 'increasing' | 'decreasing' | 'stable'>;
recent_logs?: string;
```
These optional fields are defined in the interface but never populated by the backend, fallback tick, or any other data source.

**Action:** Remove the fields or implement a trend detection function in `fallbackTick()`.

---

### MEDIUM-05: Frontend Doesn't Handle Backend `500` Gracefully in Remediation

**File:** `frontend/src/hooks/useCluster.ts:814-825`
**Type:** Error Handling

The `executeRemediation()` function (line 570-579) only catches network errors, not HTTP errors:
```typescript
const r = await fetch(`${API_URL}/api/remediate`, { ... });
return r.json();  // If backend returns 500, this throws
```
A failed remediation silently throws but is caught by the caller's generic try/catch.

**Action:** Check `r.ok` before calling `.json()` and return a structured error.

---

### MEDIUM-06: Scenario Buttons Have No Loading State

**File:** `frontend/src/components/Layout.tsx:138-155`
**Type:** UX

When a scenario button is clicked, there's no visual feedback until the next sim tick (up to 2 seconds). Users may click multiple times or think the click didn't register.

**Action:** Add a brief "arming" state (opacity/disable) to the clicked button for 500ms.

---

## 🟢 LOW (5)

### LOW-01: Shimmer Animation Barely Visible in Light Mode

**File:** `frontend/src/index.css:277-280`
```css
.shimmer { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.03) 50%, transparent 75%); }
```
The white-on-white shimmer is nearly invisible in light mode.

**Fix:** Use `rgba(0,0,0,0.03)` for light mode via CSS variable.

---

### LOW-02: `--km-warn-dim` and `--km-accent2` Defined Outside Theme Blocks

**File:** `frontend/src/index.css:882-890`
```css
:root { --km-warn-dim: rgba(245,158,11,0.1); --km-accent2: #8B5CF6; }
[data-theme="light"] { --km-warn-dim: rgba(217,119,6,0.08); --km-accent2: #7C3AED; }
```
These two variables are defined in a separate block at the bottom of the file, inconsistent with where other theme variables are defined.

**Fix:** Move these into the main `:root` and `[data-theme="light"]` blocks at lines 16-90.

---

### LOW-03: `styles.ts` Exists But Is Not Imported Anywhere

**File:** `frontend/src/styles.ts`
**Type:** Dead Code

This file may have been created for shared styles but is never imported in any component. Check if it can be removed or consolidated into `index.css`.

---

### LOW-04: No `MemoryExplorer` Component Found in Route Table

**File:** `frontend/src/App.tsx`
**Type:** Missing Route

The `Dashboard.tsx:78` references a `MemoryExplorer` component/feature that is not defined in any route. It may be an inline component or dead code reference.

---

### LOW-05: Backend `main.py` Line 297 Uses `datetime` Inside Request Handler

**File:** `backend/main.py:297`
```python
@app.get("/api/report")
async def api_report(...):
    import datetime
```
The `datetime` import is lazy-loaded inside a request handler. For the `/api/report` endpoint specifically, this adds ~2ms import overhead per request.

**Fix:** Move `import datetime` to the top of the file.

---

## 📋 Summary

| Severity | Count | Key Items |
|----------|-------|-----------|
| 🔴 Critical | 3 | missing memory_pct, local NLP, incident replay |
| 🟠 Major | 5 | sparkline in live, ECharts theme, topology placeholder, twin view, auto-clear |
| 🟡 Medium | 6 | dead endpoints, extra WS fields, duplicate types, error handling |
| 🟢 Low | 5 | shimmer light mode, CSS structure, dead code |

**Total: 19 issues** for the agent to resolve.

---

## How to Reproduce Each Issue

Each issue above includes the exact file path, line number, and reproduction scenario. To verify a fix:

1. **Frontend issues:** Run `npm run dev` in `frontend/`, switch to dark/light mode, navigate to affected page
2. **Backend issues:** Run `python main.py` in `backend/`, use `curl` or browser to test affected endpoint
3. **Integration issues:** Run both backend and frontend, observe WebSocket payload in browser DevTools Network tab
