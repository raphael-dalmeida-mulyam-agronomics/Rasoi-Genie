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
        const title = `🚨 New Order ${payload.orderId} Awaiting Approval!`;
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
