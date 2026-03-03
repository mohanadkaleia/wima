"use client";

import { useEffect, useState, useCallback } from "react";

interface SSEEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  payload: Record<string, unknown>;
}

export function useSSE() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        setEvents((prev) => [...prev.slice(-99), event]);
      } catch {
        // Ignore parse errors (e.g. heartbeats)
      }
    };

    // Listen to all event types
    const handleEvent = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        setEvents((prev) => [...prev.slice(-99), event]);
      } catch {
        // Ignore
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
