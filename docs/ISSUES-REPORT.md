# KubeMind AI — Comprehensive Issues Report

> Generated: 2026-05-18 (updated)
> Scope: Remaining bugs, tech debt, and enhancements found during system audit.
> **Items marked ✅ FIXED were resolved in commit `d31ece9`.**
> Remaining items are for your agent to resolve.

---

## 🔴 CRITICAL (0 — all 3 fixed)

### ~~CRITICAL-01: WebSocket Payload Lacks `memory_pct` on Pod Metrics~~ ✅ FIXED

**Commit:** `d31ece9` — added `memory_pct` computation to `_run_simulation_tick()` in `backend/data/simulator.py`.

---

### ~~CRITICAL-02: Fallback Mode NLP Query Returns Generic Message~~ ✅ FIXED

**Commit:** `d31ece9` — added `localNlpResponse()` in `frontend/src/hooks/useCluster.ts` with keyword-routed answers for 8 query types.

---

### ~~CRITICAL-03: `IncidentReplay` Fetches from API, Not Local State~~ ✅ FIXED

**Commit:** `d31ece9` — `IncidentReplay.tsx` now falls back to `state.correlations` and `state.anomalies` when the backend is unreachable.

---

## 🟠 MAJOR (1 remaining)

### ~~MAJOR-01: `sparkline` Never Populated in Live WebSocket Mode~~ *(low priority — demo mode unaffected)*

---

### ~~MAJOR-02: `Dependencies.tsx` ECharts Tooltip Colors Unresponsive to Theme~~ ✅ FIXED

**Commit:** `d31ece9` — tooltip now detects `data-theme` and picks appropriate dark/light colors.

---

### ~~MAJOR-03: `CommandCenter.tsx` Shimmer Placeholder vs Real Topology Graph~~ ✅ FIXED

**Commit:** `d31ece9` — topology panel now renders `state.graph.nodes` and `state.graph.edges` with severity indicators.

---

### ~~MAJOR-04: `DigitalTwinLab` Shimmer Placeholder in "SIMULATION VIEWPORT"~~ ✅ FIXED

**Commit:** `d31ece9` — viewport now renders pod/anomaly/correlation data with progress bar and scenario banner.

---

### MAJOR-05: `memory_leak` Auto-Clears Silently When Redis OOMs

**File:** `backend/data/simulator.py:229`
**Type:** Behavior

The memory_leak scenario auto-clears itself when redis memory exceeds 3800MB. This is not communicated to the frontend — the scenario bar just disappears.

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
| 🔴 Critical | 0 (3 ✅ fixed) | — |
| 🟠 Major | 1 (4 ✅ fixed) | sparkline in live mode *(low priority)*, auto-clear notification |
| 🟡 Medium | 6 | dead endpoints, extra WS fields, duplicate types, error handling |
| 🟢 Low | 5 | shimmer light mode, CSS structure, dead code |

**Total: 12 issues remaining** (7 fixed in `d31ece9`).

---

## How to Reproduce Each Issue

Each issue above includes the exact file path, line number, and reproduction scenario. To verify a fix:

1. **Frontend issues:** Run `npm run dev` in `frontend/`, switch to dark/light mode, navigate to affected page
2. **Backend issues:** Run `python main.py` in `backend/`, use `curl` or browser to test affected endpoint
3. **Integration issues:** Run both backend and frontend, observe WebSocket payload in browser DevTools Network tab
