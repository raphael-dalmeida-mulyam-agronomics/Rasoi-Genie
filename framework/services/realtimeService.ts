import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type RealtimeConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface RealtimeSubscriptionOptions<T = any> {
  table: string;
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (newRow: T, oldRow: Partial<T>) => void;
  onDelete?: (oldRow: Partial<T>) => void;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  onResync?: () => void | Promise<void>;
}

export interface RealtimeSubscriptionControl {
  unsubscribe: () => void;
  getStatus: () => RealtimeConnectionStatus;
  resync: () => Promise<void>;
}

/**
 * Reusable Supabase Realtime table subscription manager.
 *
 * Features:
 * - Generates unique channel topics to prevent collision across hot reloads and subscribers.
 * - Wraps postgres_changes with typed INSERT, UPDATE, DELETE handlers.
 * - Tracks connection status ('connecting' | 'live' | 'reconnecting' | 'offline').
 * - Automatic exponential backoff reconnection on socket error or timeout.
 * - Calls onResync whenever the channel transitions to 'live' so stale data is caught up.
 * - Completely cleans up channels via removeChannel on unsubscribe.
 */
export function subscribeToTable<T = any>(options: RealtimeSubscriptionOptions<T>): () => void {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onStatusChange,
    onResync,
  } = options;

  let isDisposed = false;
  let currentStatus: RealtimeConnectionStatus = 'connecting';
  let activeChannel: RealtimeChannel | null = null;
  let reconnectTimer: any = null;
  let reconnectAttempt = 0;
  const maxBackoffMs = 16000;
  const baseBackoffMs = 1000;

  const updateStatus = (nextStatus: RealtimeConnectionStatus) => {
    if (currentStatus !== nextStatus) {
      currentStatus = nextStatus;
      onStatusChange?.(nextStatus);
    }
  };

  const cleanupActiveChannel = () => {
    if (activeChannel) {
      try {
        const client = getSupabaseClient();
        client.removeChannel(activeChannel);
      } catch (err) {
        // Safe disposal
      }
      activeChannel = null;
    }
  };

  const scheduleReconnect = () => {
    if (isDisposed) return;
    cleanupActiveChannel();
    updateStatus('reconnecting');

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    const backoff = Math.min(
      maxBackoffMs,
      baseBackoffMs * Math.pow(2, reconnectAttempt) + Math.random() * 500,
    );
    reconnectAttempt++;

    reconnectTimer = setTimeout(() => {
      if (!isDisposed) {
        createAndSubscribeChannel();
      }
    }, backoff);
  };

  const createAndSubscribeChannel = () => {
    if (isDisposed) return;

    try {
      const client = getSupabaseClient();
      const uniqueTopic = `rt_${table}_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
      updateStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

      const channel = client.channel(uniqueTopic);
      activeChannel = channel;

      const changeConfig: any = {
        event,
        schema,
        table,
      };
      if (filter) {
        changeConfig.filter = filter;
      }

      channel.on('postgres_changes', changeConfig, (payload: any) => {
        if (isDisposed) return;

        const eventType = payload?.eventType;
        const newRecord = payload?.new as T;
        const oldRecord = (payload?.old || {}) as Partial<T>;

        try {
          if (eventType === 'INSERT' && newRecord) {
            onInsert?.(newRecord);
          } else if (eventType === 'UPDATE' && newRecord) {
            onUpdate?.(newRecord, oldRecord);
          } else if (eventType === 'DELETE') {
            onDelete?.(oldRecord);
          }
        } catch (handlerErr) {
          console.warn(`[RealtimeService:${table}] Error in event handler:`, handlerErr);
        }
      });

      channel.subscribe((status: string, err?: any) => {
        if (isDisposed) return;

        if (status === 'SUBSCRIBED') {
          reconnectAttempt = 0;
          updateStatus('live');
          // On successful connection/reconnection, notify consumer to resync missed events
          try {
            onResync?.();
          } catch (resyncErr) {
            console.warn(`[RealtimeService:${table}] Error in onResync:`, resyncErr);
          }
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          if (!isDisposed) {
            console.warn(
              `[RealtimeService:${table}] Channel disconnected (${status}), scheduling reconnect.`,
              err || '',
            );
            scheduleReconnect();
          }
        }
      });
    } catch (err) {
      if (!isDisposed) {
        console.warn(`[RealtimeService:${table}] Failed to create channel:`, err);
        scheduleReconnect();
      }
    }
  };

  // Initial connection
  createAndSubscribeChannel();

  return () => {
    isDisposed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    cleanupActiveChannel();
    updateStatus('offline');
  };
}
