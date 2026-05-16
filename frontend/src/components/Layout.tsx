import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Bot, MessageSquare, Clock,
  Activity, AlertTriangle, Settings, Sun, Moon,
  Search, Bell, BarChart3, FileText, Shield,
  List,
} from 'lucide-react';
import type { ClusterState, ConnectionMode, ConnectionEvent } from '../hooks/useCluster';
import { DiagnosticPanel } from './DiagnosticPanel';

interface LayoutProps {
  state: ClusterState;
  mode: ConnectionMode;
  dataSource: 'live' | 'simulated';
  events: ConnectionEvent[];
  simulateAnomaly: (s: string) => Promise<any>;
  executeRemediation: (a: string, t: string, r?: number) => Promise<any>;
  setStabilizationMode: (mode: string) => Promise<any>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

const SCENARIOS = ['PVC Cascade', 'Memory Leak', 'CPU Storm'] as const;
const MODES = ['OBSERVE', 'RECOMMEND', 'APPROVE', 'STABILIZE'] as const;

function moodClass(h: ClusterState['health']) {
  if (h.critical_count > 0) return 'mood-critical';
  if (h.warning_count > 0) return 'mood-warning';
  if (h.score < 90 && h.score > 70) return 'mood-recovering';
  return '';
}

export function Layout({
  state, mode, dataSource, events, simulateAnomaly, executeRemediation, setStabilizationMode,
  theme, onToggleTheme, children
}: LayoutProps) {
  const [showEvents, setShowEvents] = useState(false);
  const mood = useMemo(() => moodClass(state.health), [state.health]);
  const tickerItems = useMemo(() => {
    return state.anomalies.slice(-5).map((a, i) => ({
      key: i,
      time: new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      text: `${a.pod_name} · ${a.metric} ${a.severity}`,
      severity: a.severity === 'CRITICAL' ? 'crit' : 'warn',
    }));
  }, [state.anomalies]);

  const sevColor = (s: string) => s === 'crit' ? 'var(--km-danger)' : s === 'warn' ? 'var(--km-warn)' : 'var(--km-accent)';

  const conn = state.connection;
  const modeLabel = mode === 'BOOTING' ? 'BOOTING' : mode === 'CONNECTING' ? 'CONNECTING' : mode === 'LIVE' ? 'LIVE' : mode === 'DEGRADED' ? 'DEGRADED' : mode === 'SIMULATION' ? 'SIMULATION' : 'RECONNECTING';
  const isSimulated = dataSource === 'simulated';
  const statusColor = mode === 'LIVE' && state.health.critical_count > 0 ? 'var(--km-danger)'
    : mode === 'LIVE' ? 'var(--km-healthy)'
    : mode === 'DEGRADED' ? 'var(--km-warn)'
    : mode === 'SIMULATION' ? 'var(--km-warn)'
    : mode === 'RECONNECTING' ? 'var(--km-warn)'
    : 'var(--km-dim)';

  const avgConfidence = state.agents.length > 0
    ? Math.round(state.agents.reduce((s, a) => s + a.confidence, 0) / state.agents.length * 100)
    : 0;

  const uptimeStr = 'Active';

  function HealthRing({ score }: { score: number }) {
    const r = 14;
    const circ = 2 * Math.PI * r;
    const fill = circ * (score / 100);
    const color = score > 80 ? 'var(--km-healthy)' : score > 50 ? 'var(--km-warn)' : 'var(--km-danger)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={r} fill="none" stroke="var(--km-border)" strokeWidth="2.5"/>
          <circle
            cx="18" cy="18" r={r} fill="none"
            stroke={color} strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${fill} ${circ}`}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease' }}
          />
          <text x="18" y="22" textAnchor="middle"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 700, fill: color }}>
            {score}
          </text>
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: '9px', color: 'var(--km-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Health</div>
          <div style={{ fontFamily: 'var(--km-mono)', fontSize: '11px', fontWeight: 600, color }}>
            {score > 80 ? 'NOMINAL' : score > 50 ? 'DEGRADED' : 'CRITICAL'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-layout ${mood}`}>
      {/* TOP GLOBAL STATUS BAR */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 5v6l6 4 6-4V5L8 1z" fill="currentColor" opacity="0.9"/>
              <path d="M8 3l4 2.67V10L8 13l-4-2.33V5.67L8 3z" fill="rgba(255,255,255,0.3)"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--km-text)', letterSpacing: '-0.3px' }}>KubeMind AI</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--km-dim)', letterSpacing: '0.5px', fontFamily: 'var(--km-mono)' }}>AI OPERATIONS</div>
          </div>
        </div>
        <div className="topbar-divider" />
        <div className="topbar-stat">
          <span className="topbar-stat-dot" style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }} />
          <span className="topbar-stat-value" style={{ color: statusColor }}>{modeLabel}</span>
        </div>
        <HealthRing score={state.health.score} />
        <div className="topbar-stat">
          <AlertTriangle size={10} />
          <span className="topbar-stat-value">{state.health.critical_count + state.health.warning_count}</span>
          incidents
        </div>
        <div className="topbar-stat">
          AI
          <span className="topbar-stat-value">{avgConfidence}%</span>
        </div>
        <div className="topbar-stat">
          <span className="topbar-stat-value">{state.health.pod_count}</span>
          pods
        </div>
        <div className="topbar-stat">
          <span className="topbar-stat-value">{uptimeStr}</span>
          uptime
        </div>
        {isSimulated && (
          <div className="topbar-stat" style={{ background: 'var(--km-warn-dim)', padding: '2px 8px', borderRadius: 'var(--r-sm)' }}>
            <span className="topbar-stat-dot" style={{ background: 'var(--km-warn)' }} />
            <span className="topbar-stat-value" style={{ color: 'var(--km-warn)', fontSize: 8 }}>SIM MODE</span>
          </div>
        )}
        <div className="topbar-controls">
          <span style={{ fontSize: 7, color: 'var(--km-dim)', fontFamily: 'var(--km-mono)', letterSpacing: 0.8, textTransform: 'uppercase', marginRight: 4 }}>AI</span>
          <div style={{ display: 'flex', gap: 2, marginRight: 6 }}>
            {MODES.map(m => (
              <button key={m} className={`btn ${state.stabilization_mode === m ? 'active' : ''}`}
                onClick={() => setStabilizationMode(m)} style={{ fontSize: 7, padding: '2px 4px' }}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, marginRight: 6 }}>
            {SCENARIOS.map(s => (
              <button key={s} className="btn" onClick={() => simulateAnomaly(s.toLowerCase().replace(' ', '_'))}
                style={{ fontSize: 7, padding: '2px 5px', color: 'var(--km-muted)' }}>
                <Activity size={7} /> {s}
              </button>
            ))}
          </div>
          <div className="topbar-divider" />
          <button className="topbar-btn" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
          </button>
          <button className="topbar-btn" onClick={() => setShowEvents(!showEvents)} title="Connection events">
            <List size={11} />
          </button>
          <button className="topbar-btn"><Search size={11} /></button>
          <button className="topbar-btn"><Bell size={11} /></button>
          <button className="topbar-btn"><Settings size={11} /></button>
          <div className="topbar-profile" style={{ marginLeft: 2 }}>
            <div className="topbar-avatar">SR</div>
          </div>
        </div>
      </header>

      {/* LEFT SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 5v6l6 4 6-4V5L8 1z" fill="currentColor" opacity="0.9"/>
              <path d="M8 3l4 2.67V10L8 13l-4-2.33V5.67L8 3z" fill="rgba(255,255,255,0.3)"/>
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">KubeMind</span>
            <span className="sidebar-brand-sub">AI Operations</span>
          </div>
        </div>

        <div className="sidebar-section">Overview</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={14} /> Dashboard
        </NavLink>
        <NavLink to="/dependencies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <GitBranch size={14} /> Topology
        </NavLink>

        <div className="sidebar-section">Intelligence</div>
        <NavLink to="/agents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bot size={14} /> AI Agents
        </NavLink>
        <NavLink to="/nlp" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={14} /> Incidents
        </NavLink>

        <div className="sidebar-section">Monitoring</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={14} /> Alerts
        </NavLink>
        <NavLink to="/replay" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Clock size={14} /> Timeline
        </NavLink>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={14} /> Metrics
        </NavLink>

        <div className="sidebar-section">Operations</div>
        <div className="nav-item"><FileText size={14} /> Reports</div>
        <div className="nav-item"><Shield size={14} /> Settings</div>

        <div className="sidebar-status-cards">
          <div className="sidebar-status-label">Cluster Status</div>
          <div className="sidebar-status-row">
            <span className="sidebar-status-key"><span className="sidebar-status-dot" style={{ background: 'var(--km-telem)' }} />Context</span>
            <span className="sidebar-status-val">minikube</span>
          </div>
          <div className="sidebar-status-row">
            <span className="sidebar-status-key"><span className="sidebar-status-dot" style={{ background: 'var(--km-accent)' }} />K8s Version</span>
            <span className="sidebar-status-val">v1.28.3</span>
          </div>
          <div className="sidebar-status-row">
            <span className="sidebar-status-key"><span className="sidebar-status-dot" style={{ background: state.health.critical_count > 0 ? 'var(--km-danger)' : 'var(--km-healthy)' }} />Total Nodes</span>
            <span className="sidebar-status-val">{state.health.pod_count}</span>
          </div>
          <div className="sidebar-status-row">
            <span className="sidebar-status-key"><span className="sidebar-status-dot" style={{ background: state.agents.length > 0 ? 'var(--km-accent)' : 'var(--km-dim)' }} />AI Agents</span>
            <span className="sidebar-status-val">{state.agents.length}/7</span>
          </div>
          <div className="sidebar-status-row">
            <span className="sidebar-status-key"><span className="sidebar-status-dot" style={{ background: 'var(--km-muted)' }} />System Time</span>
            <span className="sidebar-status-val">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="sidebar-conn-dots">
          <span className="sidebar-conn-dot">
            <span className="sidebar-conn-indicator" style={{ background: conn.backend === 'connected' ? 'var(--km-healthy)' : conn.backend === 'reconnecting' ? 'var(--km-warn)' : 'var(--km-dim)' }} />
            BE
          </span>
          <span className="sidebar-conn-dot">
            <span className="sidebar-conn-indicator" style={{ background: conn.websocket === 'connected' ? 'var(--km-healthy)' : conn.websocket === 'reconnecting' ? 'var(--km-warn)' : 'var(--km-dim)' }} />
            WS
          </span>
          <span className="sidebar-conn-dot">
            <span className="sidebar-conn-indicator" style={{ background: conn.prometheus === 'connected' ? 'var(--km-healthy)' : conn.prometheus === 'simulated' ? 'var(--km-warn)' : 'var(--km-dim)' }} />
            PM
          </span>
          <span className="sidebar-conn-dot">
            <span className="sidebar-conn-indicator" style={{ background: conn.kubernetes === 'connected' ? 'var(--km-healthy)' : conn.kubernetes === 'simulated' ? 'var(--km-warn)' : 'var(--km-dim)' }} />
            K8s
          </span>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {children}
      </main>

      {/* RIGHT AI DIAGNOSTIC CONSOLE */}
      <div className="diag-panel">
        <div className="diag-header">
          <span className="diag-header-dot" />
          AI Diagnostic Console
        </div>
        <DiagnosticPanel agents={state.agents} executeRemediation={executeRemediation} dataSource={dataSource} />
      </div>

      {/* BOTTOM TICKER */}
      <div className="bottom-ticker">
        <div className="ticker-label">Live Ops</div>
        <div className="ticker-scroll">
          {tickerItems.length === 0 && (
            <span style={{ color: 'var(--km-dim)', fontSize: 9 }}>No active events — system nominal</span>
          )}
          {tickerItems.map(e => (
            <div key={e.key} className="ticker-event">
              <span className="ticker-time">{e.time}</span>
              <span className="ticker-dot" style={{ background: sevColor(e.severity) }} />
              <span className="ticker-text">{e.text}</span>
            </div>
          ))}
        </div>
        <div className="ticker-label" style={{ cursor: 'pointer' }} onClick={() => setShowEvents(!showEvents)}>
          <List size={9} /> LOG
        </div>
      </div>

      {/* EVENT LOG OVERLAY */}
      {showEvents && (
        <div className="event-log-overlay" onClick={() => setShowEvents(false)}>
          <div className="event-log-panel" onClick={e => e.stopPropagation()}>
            <div className="event-log-header">
              <span>Connection Events</span>
              <button className="topbar-btn" onClick={() => setShowEvents(false)} style={{ padding: '2px 6px' }}>✕</button>
            </div>
            <div className="event-log-list">
              {events.length === 0 && <div className="event-log-empty">No events recorded</div>}
              {events.map(ev => (
                <div key={ev.id} className={`event-log-item event-${ev.type}`}>
                  <span className="event-log-time">{new Date(ev.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className={`event-log-badge badge-${ev.type === 'success' ? 'ok' : ev.type === 'warning' ? 'warning' : ev.type === 'error' ? 'alert' : 'info'}`}>
                    {ev.type.toUpperCase()}
                  </span>
                  <span className="event-log-msg">{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
