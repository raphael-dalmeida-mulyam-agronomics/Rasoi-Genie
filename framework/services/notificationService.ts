import { Platform } from 'react-native';

export interface OrderNotificationPayload {
  orderId: string;
  customerName?: string;
  totalAmount: number;
  itemsCount: number;
}

type NotificationListener = (count: number) => void;
const pendingCountListeners: Set<NotificationListener> = new Set();
let currentPendingApprovalCount = 0;

/**
 * Updates the reactive pending approval count and notifies all listeners.
 */
export function setPendingApprovalOrdersCount(count: number) {
  currentPendingApprovalCount = Math.max(0, count);
  pendingCountListeners.forEach((listener) => {
    try {
      listener(currentPendingApprovalCount);
    } catch (err) {
      console.error('[NotificationService] Error notifying count listener:', err);
    }
  });
}

/**
 * Returns current count of orders awaiting admin approval.
 */
export function getPendingApprovalOrdersCount(): number {
  return currentPendingApprovalCount;
}

/**
 * Subscribe to changes in the pending approval orders count.
 */
export function subscribeToPendingApprovalCount(listener: NotificationListener): () => void {
  pendingCountListeners.add(listener);
  listener(currentPendingApprovalCount);
  return () => {
    pendingCountListeners.delete(listener);
  };
}

/**
 * Plays a clean, crisp, melodic ascending chime (C6 -> E6 -> G6)
 * using the Web Audio API / AudioContext.
 * Works seamlessly in React Native Web and browsers without needing external audio asset downloads.
 */
export function playOrderAlertSound(): void {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();

    // Notes: C6 (1046.5Hz), E6 (1318.5Hz), G6 (1567.98Hz)
    const tones = [
      { freq: 1046.5, delay: 0.0, duration: 0.18 },
      { freq: 1318.5, delay: 0.12, duration: 0.22 },
      { freq: 1567.98, delay: 0.24, duration: 0.35 },
    ];

    tones.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    });
  } catch (err) {
    console.warn('[NotificationService] Could not play alert sound:', err);
  }
}

/**
 * Request notification permissions (Browser Notification API / Mobile).
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch (err) {
      console.warn('[NotificationService] Push notification request error:', err);
    }
  }
  return false;
}

/**
 * Triggers full admin alert: sound chime + web/device push notification.
 */
export function notifyAdminNewOrder(payload: OrderNotificationPayload): void {
  // 1. Play melodic chime
  playOrderAlertSound();

  // 2. Dispatch browser / push notification if permitted
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const title = `New Order ${payload.orderId} Awaiting Approval!`;
        const body = `${payload.customerName || 'Customer'} placed an order (₹${payload.totalAmount}) with ${payload.itemsCount} item(s).`;
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('[NotificationService] Push notification delivery error:', err);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGIONAL ADMIN OUT-OF-STOCK ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export interface OutOfStockAlertPayload {
  id?: string;
  kitId: string;
  kitName: string;
  region?: string;
  remainingStock: number;
  reason?: string;
  timestamp?: string;
}

export type OutOfStockAlertListener = (alerts: OutOfStockAlertPayload[]) => void;
const outOfStockListeners = new Set<OutOfStockAlertListener>();
const activeOutOfStockAlerts: OutOfStockAlertPayload[] = [];

/**
 * Returns currently active out of stock alerts for regional admins.
 */
export function getActiveOutOfStockAlerts(): OutOfStockAlertPayload[] {
  return [...activeOutOfStockAlerts];
}

/**
 * Subscribes to out of stock alert updates.
 */
export function subscribeToOutOfStockAlerts(listener: OutOfStockAlertListener): () => void {
  outOfStockListeners.add(listener);
  listener([...activeOutOfStockAlerts]);
  return () => {
    outOfStockListeners.delete(listener);
  };
}

/**
 * Dismisses an out of stock alert once restocked.
 */
export function dismissOutOfStockAlert(kitId: string, region?: string): void {
  const initialLen = activeOutOfStockAlerts.length;
  for (let i = activeOutOfStockAlerts.length - 1; i >= 0; i--) {
    if (activeOutOfStockAlerts[i].kitId === kitId) {
      if (!region || activeOutOfStockAlerts[i].region === region) {
        activeOutOfStockAlerts.splice(i, 1);
      }
    }
  }
  if (activeOutOfStockAlerts.length !== initialLen) {
    outOfStockListeners.forEach((fn) => {
      try {
        fn([...activeOutOfStockAlerts]);
      } catch (e) {
        console.warn('[NotificationService] Error notifying out of stock listener:', e);
      }
    });
  }
}

/**
 * Informs all regional admins that an item has gone out of stock:
 * 1. Plays audible alert chime.
 * 2. Emits in-app event to all listening regional admin components.
 * 3. Sends system push / desktop notification to regional admins.
 * 4. Records alert in Supabase admin_notifications table for persistent tracking.
 */
export async function notifyRegionalAdminsOutOfStock(alert: OutOfStockAlertPayload): Promise<void> {
  const timestamp = new Date().toISOString();
  const alertWithMeta: OutOfStockAlertPayload = {
    ...alert,
    id: alert.id || `oos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
  };

  // 1. In-memory dedup & store
  const existingIdx = activeOutOfStockAlerts.findIndex(
    (a) => a.kitId === alert.kitId && (!alert.region || a.region === alert.region),
  );
  if (existingIdx !== -1) {
    activeOutOfStockAlerts[existingIdx] = alertWithMeta;
  } else {
    activeOutOfStockAlerts.unshift(alertWithMeta);
  }

  // 2. Play audible alert chime
  playOrderAlertSound();

  // 3. Notify in-memory regional admin listeners (e.g. AdminDashboard)
  outOfStockListeners.forEach((fn) => {
    try {
      fn([...activeOutOfStockAlerts]);
    } catch (e) {
      console.warn('[NotificationService] Error notifying out of stock listener:', e);
    }
  });

  // 4. Web Push Notification to regional admins
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const title = `⚠️ OUT OF STOCK: ${alert.kitName}`;
        const regionText = alert.region ? ` in ${alert.region} Region` : '';
        const body = `"${alert.kitName}" has reached 0 units${regionText}! It has been automatically set to OUT OF STOCK. Restocking required.`;
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('[NotificationService] Push notification error:', err);
      }
    }
  }

  // 5. Insert alert into Supabase admin_notifications table
  try {
    const { supabase } = await import('../supabase/client');
    const regionText = alert.region ? ` in ${alert.region} Region` : '';
    await supabase.from('admin_notifications').insert({
      id: alertWithMeta.id,
      type: 'out_of_stock',
      title: `⚠️ OUT OF STOCK: ${alert.kitName}`,
      message: `Meal kit "${alert.kitName}" (ID: ${alert.kitId}) is now OUT OF STOCK${regionText}. Item automatically marked out of stock. Immediate replenishment required.`,
      region: alert.region || 'North',
      is_read: false,
      created_at: timestamp,
    });
  } catch (err) {
    console.warn('[NotificationService] Supabase out-of-stock notification insert error:', err);
  }
}

