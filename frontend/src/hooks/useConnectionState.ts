import { useState, useCallback } from 'react';

export type ConnectionMode =
  | 'BOOTING'
  | 'CONNECTING'
  | 'LIVE'
  | 'DEGRADED'
  | 'SIMULATION'
  | 'RECONNECTING';

export type TransitionEvent =
  | 'HEALTH_OK'
  | 'HEALTH_FAIL'
  | 'WS_OPEN'
  | 'WS_CLOSED'
  | 'WS_ERROR'
  | 'HEARTBEAT_STALE'
  | 'RECOVERY_OK'
  | 'FORCE_SIM';

export const MODE_TRANSITIONS: Record<ConnectionMode, Partial<Record<TransitionEvent, ConnectionMode>>> = {
  BOOTING: {
    HEALTH_OK: 'CONNECTING',
    HEALTH_FAIL: 'BOOTING',
    FORCE_SIM: 'SIMULATION',
  },
  CONNECTING: {
    WS_OPEN: 'LIVE',
    WS_CLOSED: 'DEGRADED',
    WS_ERROR: 'DEGRADED',
    HEALTH_FAIL: 'DEGRADED',
    FORCE_SIM: 'SIMULATION',
  },
  LIVE: {
    WS_CLOSED: 'DEGRADED',
    WS_ERROR: 'DEGRADED',
    HEARTBEAT_STALE: 'DEGRADED',
  },
  DEGRADED: {
    WS_OPEN: 'LIVE',
    HEALTH_FAIL: 'SIMULATION',
    FORCE_SIM: 'SIMULATION',
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

export function applyTransition(from: ConnectionMode, event: TransitionEvent): ConnectionMode | null {
  return MODE_TRANSITIONS[from]?.[event] ?? null;
}

export function useConnectionState() {
  const [mode, setMode] = useState<ConnectionMode>('BOOTING');

  const transition = useCallback((t: TransitionEvent): ConnectionMode | null => {
    const next = applyTransition(mode, t);
    if (next) {
      setMode(next);
      return next;
    }
    return null;
  }, [mode]);

  const reset = useCallback(() => {
    setMode('BOOTING');
  }, []);

  return { mode, transition, reset };
}
