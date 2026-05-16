import { useState, useRef, useCallback } from 'react';

export interface Event {
  id: number;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const MAX_EVENTS = 50;

let nextId = 0;

export function useEventLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const eventsRef = useRef<Event[]>([]);

  const addEvent = useCallback((type: Event['type'], message: string) => {
    const event: Event = { id: nextId++, timestamp: Date.now(), type, message };
    const next = [...eventsRef.current, event].slice(-MAX_EVENTS);
    eventsRef.current = next;
    setEvents(next);
  }, []);

  const clear = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  return { events, addEvent, clear };
}
