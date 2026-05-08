'use client';
import { useEffect, useRef, useCallback } from 'react';

interface TicketUpdate {
  id: number;
  title?: string;
  status?: string;
  priority?: string;
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    username: string;
    name: string | null;
  } | null;
  updatedAt?: string;
}

interface RealtimeEvent {
  type: 'created' | 'updated' | 'deleted';
  ticket: TicketUpdate;
}

type OnTicketUpdate = (event: RealtimeEvent) => void;

export function useRealtimeTickets(onUpdate: OnTicketUpdate) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const eventSource = new EventSource('/api/realtime/tickets');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[Realtime] Connected to ticket updates');
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.addEventListener('ticket-created', (event) => {
      try {
        const ticket = JSON.parse(event.data);
        console.log('[Realtime] Ticket created:', ticket);
        onUpdateRef.current({ type: 'created', ticket });
      } catch (e) {
        console.error('[Realtime] Error parsing ticket-created event:', e);
      }
    });

    eventSource.addEventListener('ticket-updated', (event) => {
      try {
        const ticket = JSON.parse(event.data);
        console.log('[Realtime] Ticket updated:', ticket);
        onUpdateRef.current({ type: 'updated', ticket });
      } catch (e) {
        console.error('[Realtime] Error parsing ticket-updated event:', e);
      }
    });

    eventSource.addEventListener('ticket-deleted', (event) => {
      try {
        const ticket = JSON.parse(event.data);
        console.log('[Realtime] Ticket deleted:', ticket);
        onUpdateRef.current({ type: 'deleted', ticket });
      } catch (e) {
        console.error('[Realtime] Error parsing ticket-deleted event:', e);
      }
    });

    eventSource.onerror = (error) => {
      console.error('[Realtime] Connection error:', error);
      eventSource.close();
      
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[Realtime] Attempting to reconnect...');
        connect();
      }, 5000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    },
    reconnect: connect,
  };
}