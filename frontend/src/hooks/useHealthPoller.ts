// frontend/src/hooks/useHealthPoller.ts
import { useCallback, useRef, useEffect } from 'react';
import { applyTransition } from './useConnectionState';
import type { ConnectionMode, ConnectionEvent, ClusterState } from './types';

interface UseHealthPollerProps {
  apiUrl: string;
  bootFailThreshold: number;
  bootPollMs: number;
  simPollMs: number;
  addEvent: (type: ConnectionEvent['type'], message: string) => void;
  mode: ConnectionMode;
  modeRef: React.MutableRefObject<ConnectionMode>;
  setState: React.Dispatch<React.SetStateAction<ClusterState>>;
  setMode: React.Dispatch<React.SetStateAction<ConnectionMode>>;
  setDataSource: React.Dispatch<React.SetStateAction<'live' | 'simulated'>>;
  connectWS: () => void;
  mounted: React.MutableRefObject<boolean>;
  simStateRef: React.MutableRefObject<ClusterState>;
}

export function useHealthPoller({
  apiUrl, bootFailThreshold, bootPollMs, simPollMs, addEvent,
  mode, modeRef, setState, setMode, setDataSource, connectWS,
  mounted, simStateRef,
}: UseHealthPollerProps) {
  const healthFailCountRef = useRef(0);
  const healthTimerRef = useRef<number | undefined>(undefined);

  /* ── Health check ── */
  const runHealthCheck = useCallback(async () => {
    if (!mounted.current) return;
    try {
      const res = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      healthFailCountRef.current = 0;

      const m = modeRef.current;
      if (m === 'BOOTING') {
        addEvent('info', 'Backend detected — establishing WebSocket link');
        const next = applyTransition(m, 'HEALTH_OK');
        if (next) {
          modeRef.current = next;
          setMode(next);
          setState(prev => ({
            ...prev,
            connection: { ...prev.connection, backend: 'connected' },
          }));
        }
        connectWS();
      } else if (m === 'SIMULATION') {
        addEvent('info', 'Backend restored — reconnecting telemetry');
        const next = applyTransition(m, 'RECOVERY_OK');
        if (next) {
          modeRef.current = next;
          setMode(next);
        }
        connectWS();
      } else if (m === 'DEGRADED') {
        connectWS();
      }
      // Update connection status from health response
      setState(prev => ({
        ...prev,
        connection: {
          ...prev.connection,
          backend: 'connected',
          prometheus: data.drivers?.prometheus?.connected ? 'connected' : 'simulated',
          kubernetes: data.drivers?.kubernetes?.connected ? 'connected' : 'simulated',
        },
      }));
    } catch {
      healthFailCountRef.current += 1;
      const m = modeRef.current;
      const fails = healthFailCountRef.current;

      if (m === 'BOOTING' && fails >= bootFailThreshold) {
        const next = applyTransition(m, 'FORCE_SIM');
        if (next) {
          addEvent('info', 'Starting simulation mode with fallback telemetry');
          modeRef.current = next;
          setMode(next);
          setDataSource('simulated');
          setState(prev => ({
            ...simStateRef.current,
            connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
          }));
        }
      } else if ((m === 'DEGRADED' || m === 'RECONNECTING') && fails >= 1) {
        const next = applyTransition(m, 'HEALTH_FAIL');
        if (next) {
          addEvent('warning', 'Backend unreachable — running simulated telemetry');
          modeRef.current = next;
          setMode(next);
          setDataSource('simulated');
          setState(prev => ({
            ...simStateRef.current,
            connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
          }));
        }
      } else if (m === 'BOOTING') {
        setState(prev => ({
          ...prev,
          connection: { ...prev.connection, backend: 'disconnected', websocket: 'disconnected' },
        }));
      }
    }
  }, [apiUrl, bootFailThreshold, addEvent, setMode, setState, setDataSource, connectWS, modeRef, mounted, simStateRef]);

  /* ── Health poll lifecycle ── */
  const startHealthPoll = useCallback((intervalMs: number) => {
    if (healthTimerRef.current !== undefined) clearInterval(healthTimerRef.current);
    healthTimerRef.current = window.setInterval(() => runHealthCheck(), intervalMs);
    runHealthCheck(); // Run immediately on start
  }, [runHealthCheck]);

  const stopHealthPoll = useCallback(() => {
    if (healthTimerRef.current !== undefined) {
      clearInterval(healthTimerRef.current);
      healthTimerRef.current = undefined;
    }
  }, []);

  // Adjust health poll interval when mode changes
  const prevModeRef = useRef<ConnectionMode>('BOOTING');
  useEffect(() => {
    if (mode === prevModeRef.current) return;
    prevModeRef.current = mode;

    if (mode === 'SIMULATION' || mode === 'RECONNECTING') {
      stopHealthPoll();
      startHealthPoll(simPollMs);
    } else if (mode === 'DEGRADED') {
      stopHealthPoll();
      startHealthPoll(bootPollMs);
    } else if (mode === 'LIVE') {
      stopHealthPoll();
      startHealthPoll(simPollMs);
    }
  }, [mode, simPollMs, bootPollMs, stopHealthPoll, startHealthPoll]);

  // Initial health check on mount
  useEffect(() => {
    startHealthPoll(bootPollMs);
    return () => stopHealthPoll();
  }, [startHealthPoll, stopHealthPoll, bootPollMs]);

  return { healthFailCountRef, startHealthPoll, stopHealthPoll, runHealthCheck };
}