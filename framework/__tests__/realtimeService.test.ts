import { subscribeToTable, RealtimeConnectionStatus } from '../services/realtimeService';
import { getSupabaseClient } from '../supabase/client';

jest.mock('../supabase/client', () => {
  let activeHandlers: Record<string, Function> = {};
  let currentSubscribeCb: Function | null = null;
  const mockChannelObj: any = {
    on: jest.fn((event: string, config: any, callback: Function) => {
      activeHandlers[event] = callback;
      return mockChannelObj;
    }),
    subscribe: jest.fn((cb: Function) => {
      currentSubscribeCb = cb;
      // Default to auto-subscribing in tests unless overridden
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return mockChannelObj;
    }),
  };

  const mockClient = {
    channel: jest.fn(() => mockChannelObj),
    removeChannel: jest.fn(),
  };

  return {
    getSupabaseClient: jest.fn(() => mockClient),
    __mockChannelObj: mockChannelObj,
    __triggerChange: (payload: any) => {
      if (activeHandlers['postgres_changes']) {
        activeHandlers['postgres_changes'](payload);
      }
    },
    __triggerStatus: (status: string, err?: any) => {
      if (currentSubscribeCb) {
        currentSubscribeCb(status, err);
      }
    },
  };
});

describe('realtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to a table with a unique channel name and reports live status', async () => {
    const statuses: RealtimeConnectionStatus[] = [];
    const resyncMock = jest.fn();

    const unsubscribe = subscribeToTable({
      table: 'orders',
      onStatusChange: (status) => statuses.push(status),
      onResync: resyncMock,
    });

    const client = getSupabaseClient();
    expect(client.channel).toHaveBeenCalledTimes(1);
    const channelName = (client.channel as jest.Mock).mock.calls[0][0];
    expect(channelName).toContain('rt_orders_');

    // Run timers for the setTimeout in mock subscribe
    jest.runAllTimers();

    expect(statuses).toContain('live');
    expect(resyncMock).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalled();
  });

  it('correctly routes INSERT, UPDATE, and DELETE events to callbacks', async () => {
    const onInsert = jest.fn();
    const onUpdate = jest.fn();
    const onDelete = jest.fn();

    const { __triggerChange } = require('../supabase/client');

    const unsubscribe = subscribeToTable({
      table: 'meal_kits',
      onInsert,
      onUpdate,
      onDelete,
    });

    jest.runAllTimers();

    // Trigger INSERT
    __triggerChange({
      eventType: 'INSERT',
      new: { id: 'kit-new-1', name: 'Paneer Butter Masala' },
    });
    expect(onInsert).toHaveBeenCalledWith({ id: 'kit-new-1', name: 'Paneer Butter Masala' });

    // Trigger UPDATE
    __triggerChange({
      eventType: 'UPDATE',
      new: { id: 'kit-new-1', name: 'Paneer Butter Masala 2.0' },
      old: { id: 'kit-new-1', name: 'Paneer Butter Masala' },
    });
    expect(onUpdate).toHaveBeenCalledWith(
      { id: 'kit-new-1', name: 'Paneer Butter Masala 2.0' },
      { id: 'kit-new-1', name: 'Paneer Butter Masala' },
    );

    // Trigger DELETE
    __triggerChange({
      eventType: 'DELETE',
      old: { id: 'kit-new-1' },
    });
    expect(onDelete).toHaveBeenCalledWith({ id: 'kit-new-1' });

    unsubscribe();
  });

  it('reconnects with backoff and calls onResync on recovery', async () => {
    const statuses: RealtimeConnectionStatus[] = [];
    const resyncMock = jest.fn();
    const { __triggerStatus } = require('../supabase/client');

    const unsubscribe = subscribeToTable({
      table: 'orders',
      onStatusChange: (status) => statuses.push(status),
      onResync: resyncMock,
    });

    // Initial subscribe
    jest.runAllTimers();
    expect(statuses).toContain('live');
    expect(resyncMock).toHaveBeenCalledTimes(1);

    // Simulate connection drop
    __triggerStatus('CHANNEL_ERROR', new Error('Socket closed'));
    expect(statuses).toContain('reconnecting');

    // Fast-forward backoff timer
    jest.runAllTimers();

    // Resubscribes
    expect(resyncMock).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(statuses[statuses.length - 1]).toBe('offline');
  });
});
