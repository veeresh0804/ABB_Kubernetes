// frontend/src/hooks/useWebSocket.ts
import { useRef, useCallback, useEffect } from 'react';
import type { ClusterState, ConnectionMode, ConnectionEvent } from './types';

interface UseWebSocketProps {
  wsUrl: string;
  addEvent: (type: ConnectionEvent['type'], message: string) => void;
  onMessage: (data: ClusterState) => void;
  onClose: (mode: ConnectionMode) => void;
  onOpen: (mode: ConnectionMode) => void;
  namespace: string;
  mode: ConnectionMode;
  reconnectAttempt: number;
  setReconnectAttempt: (attempt: number) => void;
  mounted: React.MutableRefObject<boolean>;
}

const IS_DEV = import.meta.env.DEV;
const wsLog = IS_DEV ? (msg: string) => console.log(`[WS] ${msg}`) : () => {};
const RECONNECT_BASE_MS = IS_DEV ? 3000 : 1000;
const RECONNECT_MAX_MS = 30000;

export function useWebSocket({ wsUrl, addEvent, onMessage, onClose, onOpen, namespace, mode, reconnectAttempt, setReconnectAttempt, mounted }: UseWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);

  /* Timer refs */
  const pingTimerRef = useRef<number | undefined>(undefined);
  const wsConnectTimerRef = useRef<number | undefined>(undefined);
  const reconnectTimerRef = useRef<number | undefined>(undefined);

  const connectWS = useCallback(() => {
    if (!mounted.current) return;
    if (connectingRef.current) {
      wsLog('Connect blocked — already connecting');
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsLog('Already connected');
      return;
    }

    connectingRef.current = true;
    wsLog('Connecting...');

    /* Clean up previous socket + timers */
    const prev = wsRef.current;
    if (prev) {
      prev.onopen = null;
      prev.onmessage = null;
      prev.onclose = null;
      prev.onerror = null;
      if (prev.readyState === WebSocket.OPEN || prev.readyState === WebSocket.CONNECTING) {
        prev.close();
      }
    }
    clearInterval(pingTimerRef.current);
    pingTimerRef.current = undefined;
    clearTimeout(wsConnectTimerRef.current);
    wsConnectTimerRef.current = undefined;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const to = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        wsLog('Connection timeout');
        ws.close();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(to);
      connectingRef.current = false;
      wsLog('Connected');
      setReconnectAttempt(0); // Reset reconnect attempts on successful connect
      onOpen(mode); // Notify parent hook
      
      // Send current namespace on connect
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'set_namespace', namespace }));
      }
      pingTimerRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send('{"type":"ping"}'); } catch { /* ignore */ }
        }
      }, 15000);
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'pong') return;
        onMessage(d); // Notify parent hook about new data
      } catch { /* ignore */ }
    };

    ws.onclose = (ev) => {
      clearTimeout(to);
      connectingRef.current = false;
      wsLog(`Closed (code=${ev.code})`);
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = undefined;

      if (!mounted.current) return;

      onClose(mode); // Notify parent hook about close
      
      /* Exponential backoff reconnect logic */
      const attempt = reconnectAttempt;
      const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS);
      setReconnectAttempt(attempt + 1);
      wsLog(`Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(() => {
        if (mounted.current) connectWS();
      }, delay);
    };

    ws.onerror = () => {
      connectingRef.current = false;
      ws.close(); // Force close to trigger onclose
    };
  }, [wsUrl, addEvent, onMessage, onClose, onOpen, namespace, mode, reconnectAttempt, setReconnectAttempt, mounted]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      clearInterval(pingTimerRef.current);
      clearTimeout(wsConnectTimerRef.current);
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { connectWS, wsRef };
}