import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, Share2, PackageCheck,
  ShieldCheck, Radar, Activity, AlertTriangle,
  Settings, Sun, Moon, Search, Bell, Plus, List,
  Terminal, Power, RefreshCw, Lock, Radio,
  Wifi, HardDrive,
} from 'lucide-react';
import type { ClusterState, ConnectionMode, ConnectionEvent } from '../hooks/useCluster';

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

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 3, WARNING: 2, ERROR: 1, INFO: 0 };

export function Layout({
  state, mode, dataSource, events,
  simulateAnomaly, executeRemediation, setStabilizationMode,
  theme, onToggleTheme, children
}: LayoutProps) {
  const [showEvents, setShowEvents] = useState(false);

  const conn = state.connection;
  const modeLabel = mode === 'BOOTING' ? 'BOOTING' : mode === 'CONNECTING' ? 'CONNECTING' : mode === 'LIVE' ? 'LIVE' : mode === 'DEGRADED' ? 'DEGRADED' : mode === 'SIMULATION' ? 'SIMULATION' : 'RECONNECTING';
  const isLive = mode === 'LIVE' && dataSource === 'live';
  const isDegraded = mode === 'DEGRADED' || mode === 'RECONNECTING';
  const statusClass = isLive ? (state.health.critical_count > 0 ? 'degraded' : 'live') : isDegraded ? 'degraded' : 'offline';
  const statusLabel = isLive ? (state.health.critical_count > 0 ? 'ALERTS ACTIVE' : 'SYSTEMS NORMAL') : isDegraded ? 'CONNECTION LOST' : 'OFFLINE';

  const uptimeStr = 'Active';
  const avgConfidence = state.agents.length > 0
    ? Math.round(state.agents.reduce((s, a) => s + a.confidence, 0) / state.agents.length * 100)
    : 0;
  const stabilityScore = state.health.score;

  const handleNewDirective = () => {
    simulateAnomaly('cpu_storm');
  };

  const handleReboot = () => {
    setShowEvents(true);
    executeRemediation('restart_pod', 'frontend-service');
  };

  const handleSync = () => {
    setShowEvents(true);
    simulateAnomaly('health_check');
  };

  const handleLockdown = () => {
    setShowEvents(true);
    setStabilizationMode('STABILIZE');
  };

  const handleBeacon = () => {
    setShowEvents(!showEvents);
  };

  const sortedAgents = useMemo(() => {
    return [...state.agents].sort((a, b) =>
      (SEVERITY_ORDER[b.status] || 0) - (SEVERITY_ORDER[a.status] || 0)
    );
  }, [state.agents]);

  const criticalCount = state.agents.filter(a => a.status === 'CRITICAL').length;
  const warningCount = state.agents.filter(a => a.status === 'WARNING').length;

  const tickerItems = useMemo(() => {
    return state.anomalies.slice(-3).map((a, i) => ({
      key: i,
      time: new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      text: `${a.pod_name} · ${a.metric} ${a.severity}`,
      severity: a.severity === 'CRITICAL' ? 'crit' : 'warn',
    }));
  }, [state.anomalies]);

  const sevColor = (s: string) => s === 'crit' ? 'var(--km-danger)' : s === 'warn' ? 'var(--km-warn)' : 'var(--km-accent)';

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--km-bg)' }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <span className="sidebar-brand-name">KubeMind AI</span>
        </div>

        <div className="sidebar-section">Operational</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16} /> Command Center
        </NavLink>
        <NavLink to="/agents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Cpu size={16} /> Core Systems
        </NavLink>
        <NavLink to="/dependencies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Share2 size={16} /> Network Mesh
        </NavLink>
        <NavLink to="/replay" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PackageCheck size={16} /> Logistics Pipe
        </NavLink>

        <div className="sidebar-section">Security</div>
        <NavLink to="/nlp" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={16} /> Protocol Logs
        </NavLink>
        <div className="nav-item">
          <Radar size={16} /> Active Threats
          {(criticalCount + warningCount) > 0 && (
            <span className="status-badge badge-alert" style={{ marginLeft: 'auto', padding: '1px 5px', fontSize: 8 }}>
              {criticalCount + warningCount}
            </span>
          )}
        </div>

        <div className="sidebar-stability">
          <div className="sidebar-stability-header">
            <span className="sidebar-stability-label">System Stability</span>
            <span className="sidebar-stability-value">{stabilityScore}%</span>
          </div>
          <div className="sidebar-stability-bar">
            <div className="sidebar-stability-fill" style={{ width: `${stabilityScore}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--km-border)' }}>
            {[
              { key: 'BE', status: conn.backend },
              { key: 'WS', status: conn.websocket },
              { key: 'PM', status: conn.prometheus },
              { key: 'K8', status: conn.kubernetes },
            ].map(d => {
              const color = d.status === 'connected' ? 'var(--km-accent)' : d.status === 'reconnecting' ? 'var(--km-warn)' : 'var(--km-dim)';
              return (
                <span key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, fontFamily: 'var(--km-mono)', color: 'var(--km-dim)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {d.key}
                </span>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN AREA */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-status">
              <span className={`topbar-status-dot ${statusClass}`} />
              <span className={`topbar-status-label ${statusClass}`}>{statusLabel}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-uptime">
              <span className="topbar-uptime-label">Uptime</span>
              <span className="topbar-uptime-value">{uptimeStr}</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-cta" onClick={handleNewDirective}>
              <Plus size={14} /> New Directive
            </button>
            <div className="topbar-divider" />
            <button className="topbar-icon-btn"><Search size={16} /></button>
            <button className="topbar-icon-btn"><Bell size={16} /></button>
            <button className="topbar-icon-btn" onClick={() => setShowEvents(!showEvents)} title="Connection events">
              <List size={16} />
            </button>
            <button className="topbar-icon-btn" onClick={onToggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <div className="main-content-area">
          {children}
        </div>

        <footer className="bottom-ticker">
          <div className="ticker-label">
            <Wifi size={12} />
            <span className="topbar-uptime-label">CPU</span>
            <span>{state.health.score}%</span>
          </div>
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
          <div className="ticker-label" style={{ gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--km-muted)', letterSpacing: '0.05em' }}>ENV</span>
              <span style={{ color: isLive ? 'var(--km-accent)' : 'var(--km-warn)', fontWeight: 700 }}>
                {dataSource === 'live' ? 'PRODUCTION' : 'SIMULATION'}
              </span>
            </span>
            <span className={`topbar-status-dot ${statusClass}`} style={{ width: 6, height: 6 }} />
          </div>
        </footer>
      </main>

      {/* RIGHT SYSTEM PANEL */}
      <aside className="diag-panel">
        {/* Quick Controls */}
        <div>
          <h3 style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--km-text)', textTransform: 'uppercase', marginBottom: 16 }}>Quick Controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="quick-ctrl-btn" onClick={handleReboot} title="Restart frontend-service pod">
              <Power size={18} />
              <span>Reboot</span>
            </button>
            <button className="quick-ctrl-btn" onClick={handleSync} title="Trigger health check">
              <RefreshCw size={18} />
              <span>Sync</span>
            </button>
            <button className="quick-ctrl-btn" onClick={handleLockdown} title="Set STABILIZE mode">
              <Lock size={18} />
              <span>Lockdown</span>
            </button>
            <button className="quick-ctrl-btn" onClick={handleBeacon} title="Toggle event log">
              <Radio size={18} />
              <span>Beacon</span>
            </button>
          </div>
        </div>

        {/* Security Brief */}
        <div>
          <h3 style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--km-text)', textTransform: 'uppercase', marginBottom: 16 }}>Security Brief</h3>
          <div style={{ background: 'rgba(24,24,27,0.3)', border: '1px solid var(--km-border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>THREAT LEVEL</span>
              <span style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: criticalCount > 0 ? 'var(--km-danger)' : warningCount > 0 ? 'var(--km-warn)' : 'var(--km-accent)', fontWeight: 700 }}>
                {criticalCount > 0 ? 'HIGH' : warningCount > 0 ? 'ELEVATED' : 'LOW'}
              </span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--km-muted)' }}>Firewall Load</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--km-mono)', color: 'var(--km-text)' }}>{stabilityScore}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--km-border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stabilityScore}%`, background: criticalCount > 0 ? 'var(--km-danger)' : 'var(--km-accent)', borderRadius: 999 }} />
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--km-dim)', lineHeight: 1.5, marginTop: 8 }}>
              {criticalCount > 0
                ? `${criticalCount} critical ${criticalCount === 1 ? 'anomaly' : 'anomalies'} detected. Immediate attention required.`
                : warningCount > 0
                  ? `${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'} active. Systems under observation.`
                  : 'All perimeter sensors reporting nominal data. No unauthorized access detected.'}
            </p>
          </div>
        </div>

        {/* AI Agents */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'var(--km-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--km-text)', textTransform: 'uppercase', marginBottom: 16 }}>Active Sessions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedAgents.slice(0, 4).map(a => {
              const isCrit = a.status === 'CRITICAL';
              const isWarn = a.status === 'WARNING';
              const bgColor = isCrit ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(245,158,11,0.08)' : 'rgba(24,24,27,0.3)';
              const borderColor = isCrit ? 'rgba(239,68,68,0.2)' : isWarn ? 'rgba(245,158,11,0.2)' : 'transparent';
              return (
                <div key={a.agent} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: bgColor, border: `1px solid ${borderColor}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--km-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--km-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.agent}</div>
                    <div style={{ fontSize: 9, color: isCrit ? 'var(--km-danger)' : isWarn ? 'var(--km-warn)' : 'var(--km-accent)', fontFamily: 'var(--km-mono)' }}>{a.status}</div>
                  </div>
                </div>
              );
            })}
            {sortedAgents.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: 'var(--km-dim)' }}>No agents available</div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button style={{ width: '100%', padding: '10px 0', border: '1px solid var(--km-border)', borderRadius: 6, background: 'transparent', color: 'var(--km-muted)', fontFamily: 'var(--km-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--km-text)'; e.currentTarget.style.background = 'var(--km-surface)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--km-muted)'; e.currentTarget.style.background = 'transparent' }}>
          Logout Session
        </button>
      </aside>

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
