import { useState, useCallback, useRef } from 'react';

export type ConnectionMode =
  | 'BOOTING'
  | 'CONNECTING'
  | 'LIVE'
  | 'DEGRADED'
  | 'SIMULATION'
  | 'RECONNECTING';

type Transition =
  | 'HEALTH_OK'
  | 'HEALTH_FAIL'
  | 'WS_OPEN'
  | 'WS_CLOSED'
  | 'WS_ERROR'
  | 'HEARTBEAT_STALE'
  | 'RECOVERY_OK'
  | 'FORCE_SIMULATION';

const TRANSITIONS: Record<ConnectionMode, Partial<Record<Transition, ConnectionMode>>> = {
  BOOTING: {
    HEALTH_OK: 'CONNECTING',
    HEALTH_FAIL: 'BOOTING',
    FORCE_SIMULATION: 'SIMULATION',
  },
  CONNECTING: {
    WS_OPEN: 'LIVE',
    WS_CLOSED: 'DEGRADED',
    WS_ERROR: 'DEGRADED',
    HEALTH_FAIL: 'DEGRADED',
    FORCE_SIMULATION: 'SIMULATION',
  },
  LIVE: {
    WS_CLOSED: 'DEGRADED',
    WS_ERROR: 'DEGRADED',
    HEARTBEAT_STALE: 'DEGRADED',
  },
  DEGRADED: {
    WS_OPEN: 'LIVE',
    HEALTH_FAIL: 'SIMULATION',
    FORCE_SIMULATION: 'SIMULATION',
  },
  SIMULATION: {
    RECOVERY_OK: 'RECONNECTING',
  },
  RECONNECTING: {
    WS_OPEN: 'LIVE',
    WS_CLOSED: 'SIMULATION',
    WS_ERROR: 'SIMULATION',
    HEALTH_FAIL: 'SIMULATION',
  },
};

export function useConnectionState() {
  const [mode, setMode] = useState<ConnectionMode>('BOOTING');
  const prevRef = useRef<ConnectionMode>('BOOTING');

  const transition = useCallback((t: Transition): ConnectionMode => {
    const next = TRANSITIONS[mode][t];
    if (next) {
      prevRef.current = mode;
      setMode(next);
      return next;
    }
    return mode;
  }, [mode]);

  const reset = useCallback(() => {
    prevRef.current = 'BOOTING';
    setMode('BOOTING');
  }, []);

  return { mode, prevMode: prevRef.current, transition, reset };
}
