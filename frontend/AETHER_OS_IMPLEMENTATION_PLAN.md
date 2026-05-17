# Aether OS → KubeMind AI Implementation Plan

**Source**: Superdesign draft `9c1a7bb6-e7b3-49f6-bfa9-025384fb40fe` (Aether OS Operational Command)
**Target**: `C:\Users\manoh\Desktop\ABB\frontend\src\`

---

## Overview

The Aether OS design is a dark industrial command center with emerald-green accents,
three-column layout, monospaced typography, and scanning-radar visual language.
KubeMind AI currently uses a blue-accented dark theme with IBM Plex Sans.
This plan maps every Aether OS element to our existing codebase.

---

## Phase 1 — Design Token Migration

### 1.1 Font System (`index.css:1-7`)

**Current**: IBM Plex Sans (sans), JetBrains Mono (mono)
**Target**: General Sans (display), Satoshi (body), JetBrains Mono (mono)

| Role | Current | Target |
|------|---------|--------|
| Display/Headings | IBM Plex Sans 700 | General Sans 600/700 |
| Body | IBM Plex Sans 400 | Satoshi 400/500 |
| Mono/Code | JetBrains Mono | JetBrains Mono (keep) |

**Action**: Replace Google Fonts import with Fontshare (General Sans + Satoshi).

### 1.2 Color Palette (`index.css:9-91`)

| Token | Current | Aether OS Target |
|-------|---------|------------------|
| `--km-bg` | `#000000` | `#09090b` |
| `--km-surface` | `#0D0D0D` | `#121215` |
| `--km-card` | `#0A0A0A` | `rgba(24,24,27,0.3)` (zinc-900/30) |
| `--km-border` | `#1A1A1A` | `#27272a` (zinc-800) |
| `--km-accent` | `#2E7BF6` (blue) | `#10b981` (emerald) |
| `--km-text` | `#E6EDF5` | `#f4f4f5` (zinc-100) |
| `--km-muted` | `#5A7A9A` | `#a1a1aa` (zinc-400) |
| `--km-dim` | `#3D5D7D` | `#52525b` (zinc-500) |
| `--km-danger` | `#EF4444` | Keep (matches) |
| `--km-warn` | `#F59E0B` | Keep (matches) |
| `--km-healthy` | `#22C55E` | `#10b981` (emerald-500) |

### 1.3 Layout Dimensions (`index.css:45-49`)

| Token | Current | Aether OS Target |
|-------|---------|------------------|
| `--km-sidebar-w` | 224px | **260px** |
| `--km-topbar-h` | 46px | **64px** (h-16) |
| `--km-diag-w` | 310px | **340px** (right panel) |
| `--km-ticker-h` | 34px | **48px** (footer h-12) |

### 1.4 Border Radius & Shadows

| Token | Current | Aether OS |
|-------|---------|-----------|
| `--r` | 6px | Keep |
| `--r-sm` | 4px | Keep |
| `--r-lg` | 10px | **8px** (rounded-lg) |
| Card borders | `1px solid var(--km-border)` | **`1px solid #27272a`** |

---

## Phase 2 — Layout Restructure

### 2.1 Current Layout (4-column)

```
┌──────────────────────────────────────────────────┐
│                    Topbar (46px)                  │
├────────┬──────────────────┬──────────────────────┤
│        │                  │                       │
│Sidebar │    Main Content  │  AI Diagnostic Panel  │
│ 224px  │      1fr         │       310px           │
│        │                  │                       │
├────────┴──────────────────┴──────────────────────┤
│              Bottom Ticker (34px)                 │
└──────────────────────────────────────────────────┘
```

### 2.2 Target Layout (3-column, Aether OS)

```
┌──────────────────────────────────────────────────┐
│                                                    │
├────────┬──────────────────┬──────────────────────┤
│        │  ┌────────────┐  │                       │
│Sidebar │  │   Header   │  │   Right System        │
│ 260px  │  ├────────────┤  │   Panel               │
│        │  │            │  │   340px                │
│        │  │   Content  │  │                       │
│        │  │   (scroll) │  │                       │
│        │  ├────────────┤  │                       │
│        │  │   Footer   │  │                       │
├────────┴──┴────────────┴──┴───────────────────────┤
└──────────────────────────────────────────────────┘
```

### 2.3 Changes to `Layout.tsx`

- **Remove** topbar (integrate into main area header)
- **Remove** bottom ticker (replace with compact status footer)
- **Widen** sidebar from 224px to 260px
- **Widen** right panel from 310px to 340px
- **Move** connection dots, health ring, mode indicator into the new header bar or sidebar footer
- **Add** `app-layout` → `dashboard-grid` CSS class change

### 2.4 New `.app-layout` Grid (`index.css`)

```css
.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr 340px;
  grid-template-rows: 1fr;
  height: 100vh;
  background: #09090b;
}
```

---

## Phase 3 — Sidebar Redesign

### 3.1 Structure (`Layout.tsx`)

**Current** → **Target mapping**:

| Current Element | Aether OS Equivalent |
|----------------|---------------------|
| Logo (KubeMind AI) | Logo + "Aether OS" → "KubeMind AI" with box icon |
| Sidebar nav items | Two sections: "Operational" / "Security" |
| Cluster status cards | System stability bar (bottom) |
| Connection dots | Remove (move to header) |

### 3.2 Sidebar Sections

**Operational** (renamed from "Overview"):
- Command Center (Dashboard) — `--km-accent` icon + active bg
- Core Systems (→ `/agents`)
- Network Mesh (→ `/dependencies`)
- Logistics Pipe (→ `/replay`)

**Security** (new):
- Protocol Logs (→ `/nlp`)
- Active Threats (new)

### 3.3 Sidebar Footer

Replace `sidebar-status-cards` with Aether OS's compact system stability card:
```
┌─────────────────────┐
│ SYSTEM STABILITY    │ 99.98%
│ ████████████████░░  │
└─────────────────────┘
```

### 3.4 CSS Variables for Sidebar

```css
--sidebar-width: 260px;
--sidebar-bg: #09090b;
--sidebar-border: #27272a;
```

---

## Phase 4 — Main Header Redesign

### 4.1 New Header Component

Replace `Layout.tsx:103-177` (topbar) with an in-main header:

```
┌──────────────────────────────────────────────┐
│ ● SYSTEMS NORMAL   │  Uptime: 412d 11h       │
│                     │                         │
│           [New Directive]  🔍  🔔             │
└──────────────────────────────────────────────┘
```

- Left: status dot + "SYSTEMS NORMAL" / mode label, uptime
- Right: primary CTA button, search, bell, user avatar
- Integration with `layout.tsx:52-60` (status color logic → badge color)
- Integration with `layout.tsx:66` (uptimeStr → uptime display)

### 4.2 Remove Topbar Items

Items to relocate or remove:
- HealthRing → move to main content area or sidebar
- AI mode buttons (OBSERVE/RECOMMEND/APPROVE/STABILIZE) → move to right panel
- Scenario buttons (PVC Cascade etc.) → move to right panel
- Theme toggle → move to sidebar footer
- Connection events → move to bottom-right

---

## Phase 5 — Dashboard Page Redesign (`Dashboard.tsx`)

The most substantial visual change. Map all current Dashboard sections to Aether OS layout.

### 5.1 Metric Cards (Top Row)

Replace current `KubeMetric` grid with Aether OS 4-column metric cards:

| Current | Aether OS Style |
|---------|----------------|
| CPU Usage → | **Total Asset Value** — large number, trend %, mini bar chart |
| Memory → | **Active Workers** — count, status label, large icon |
| Latency → | **Energy Consumption** — value, HIGH/LOW label, 10-segment bar |
| Pods → | **Pending Deployments** — count, QUEUE label, avatar rings |

**CSS**: `bg-zinc-900/30 border border-zinc-800 p-5 rounded-lg`

### 5.2 Operational Grid (Middle Row)

Current two-column card layout → Aether OS 12-column grid:

**Left (col-span-8)**: Live Feed / Topology Map
- Replace current `TopologyGraph` ECharts with the Aether OS scanline + radar grid aesthetic
- Keep ECharts force-directed graph but wrap in scanline overlay container
- Add "LIVE_FEED: SECTOR" label badge
- Add zoom controls
- Add coordinate display + signal strength footer

**Right (col-span-4)**: Event Stream + Terminal
- **Event Stream**: Replace the current static operational timeline with the Aether OS event log (severity dots, timestamps, messages)
- **Terminal**: New component — green monospaced terminal with "Aether Core Terminal" branding

### 5.3 Infrastructure Table (Bottom)

Replace current "Top CPU Consumers" pod list with full-width data table:

| Column | Style |
|--------|-------|
| Resource ID | `font-mono text-xs text-zinc-300` |
| Type | `text-xs text-zinc-500` |
| Status | Badge pill (Operational/Maintenance/Offline) |
| Efficiency | Bar + percentage |
| Last Sync | `font-mono text-xs` |

Row hover: `hover:bg-zinc-800/20`

### 5.4 Operational Story Integration

The existing `OperationalStory` component (alert banner) → integrate as the "Active Threats" section in the right panel, or as a compact alert bar below the header.

---

## Phase 6 — Right Panel Redesign

### 6.1 Structure

Replace `DiagnosticPanel` with the Aether OS right panel:

```
┌─────────────────────┐
│  Quick Controls     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│  │RB│ │SY│ │LK│ │BN││
│  └──┘ └──┘ └──┘ └──┘│
│                      │
│  Security Brief      │
│  ┌─────────────────┐ │
│  │ THREAT LEVEL LOW│ │
│  │ Firewall Load   │ │
│  │ ██░░░░░░░░ 12%  │ │
│  └─────────────────┘ │
│                      │
│  User Sessions       │
│  · John Dorsey       │
│  · Anna Klov         │
│                      │
│  [Logout Session]    │
└─────────────────────┘
```

### 6.2 Quick Controls Mapping

| Aether OS Button | KubeMind Action |
|-----------------|-----------------|
| Reboot → | Remap to `executeRemediation('restart_pod')` |
| Sync → | Remap to `triggerAnomaly` health check |
| Lockdown → | Remap to `setStabilizationMode('STABILIZE')` |
| Beacon → | Remap to connection status / event log |

### 6.3 Security Brief

New component showing:
- Threat level (→ current anomaly count → LOW/MED/HIGH/CRITICAL)
- Firewall load bar (→ CPU usage percentage)
- Summary text from AI agent findings

### 6.4 User Sessions → AI Agents

Replace mock users with actual AI agent statuses from `state.agents`.

---

## Phase 7 — Bottom Footer

### 7.1 Replace Bottom Ticker

Current: scrolling event ticker
Target: compact status bar (h-12)

```
┌────────────────────────────────────────────────┐
│ 🖥 CPU_LOAD: 24%  │  💾 STORAGE_CAP: 1.2 PB   │
│                              │ DEPLOY_ENV: PROD │●│
└────────────────────────────────────────────────┘
```

- Left: CPU load, storage capacity (from state data)
- Right: deploy env label + status dot

---

## Phase 8 — Animation & Visual Effects

### 8.1 Scanline Effect

Add the Aether OS scanline animation to the topology/live-feed area:

```css
.scanline {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 1px;
  background: rgba(16, 185, 129, 0.1);
  animation: scan 8s linear infinite;
  pointer-events: none;
}
@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}
```

### 8.2 Status Pulse

Replace existing pulse animations with Aether OS style:

```css
.status-pulse {
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  animation: pulse 2s infinite;
}
```

### 8.3 Dot Grid Background

Add radial dot grid to the live feed / map area:

```css
background-image: radial-gradient(circle at 2px 2px, #27272a 1px, transparent 0);
background-size: 24px 24px;
```

---

## Phase 9 — Icon Migration

### 9.1 Current → Target

| Location | Current (Lucide) | Aether OS |
|----------|-----------------|-----------|
| Sidebar Dashboard | `LayoutDashboard` | `lucide:layout-dashboard` (same) |
| Sidebar AI Agents | `Bot` | `lucide:cpu` |
| Sidebar Topology | `GitBranch` | `lucide:share-2` |
| Sidebar Timeline | `Clock` | `lucide:package-check` |
| Header search | `Search` | `lucide:search` (same) |
| Header bell | `Bell` | `lucide:bell` (same) |

Switch from Lucide-react imports to `<iconify-icon>` with Lucide icon names, OR keep lucide-react and remap icon names.

**Recommended**: Keep `lucide-react` (already in package.json) — it has all the icons used.

---

## Phase 10 — Implementation Order & File Mapping

| Step | File(s) | Description | Effort |
|------|---------|-------------|--------|
| 1 | `index.css` | Design tokens (colors, fonts, spacing, layout vars) | Medium |
| 2 | `index.css` | Grid layout restructure (3-column) | Small |
| 3 | `Layout.tsx` | Sidebar redesign + header extraction | Large |
| 4 | `index.css` + `Layout.tsx` | Right panel restructure | Medium |
| 5 | `Dashboard.tsx` | Metric cards, grid, live feed, table | Large |
| 6 | `DiagnosticPanel.tsx` → deprecate or integrate into right panel | Medium |
| 7 | `index.css` | Animations, scanline, pulse, dot grid | Small |
| 8 | new `QuickControls.tsx`, `SecurityBrief.tsx`, `SystemTerminal.tsx` | New components | Medium |
| 9 | `index.css` | Footer status bar | Small |
| 10 | Review & QA | Polish, responsive, dark/light mode | Medium |

### Total Estimated Effort: ~350-450 lines of CSS changes, ~250-350 lines of TSX changes

---

## Architecture Decision Records

### ADR-1: Keep lucide-react over iconify
Package already installed, tree-shakeable, typesafe. No need to add iconify dependency.

### ADR-2: CSS variables + Tailwind-like utility classes
The Aether OS HTML uses Tailwind classes. Our codebase uses CSS variables + custom classes.
Keep our approach but rename variables to match Aether OS color values.

### ADR-3: Progressive enhancement
Roll out in order: Phase 1 (tokens) → Phase 2 (layout) → Phases 3-7 (components).
Each phase is independently verifiable.

### ADR-4: Dark-mode only for initial Aether OS pass
The Aether OS design is dark-only. Port to light mode as a follow-up after the dark
version is stable. The CSS variable system makes this trivial.
