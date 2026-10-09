import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus } from '../firebase/ordersService';

const GUEST_DEVICE_ID_KEY = '@rasoi_guest_device_id_v1';
const GUEST_ORDERS_STORAGE_KEY = '@rasoi_guest_orders_v1';
const WELCOME_SEEN_KEY = '@rasoi_has_seen_welcome_v1';

let inMemoryGuestId: string | null = null;

/**
 * Returns a persistent, stable guest/device ID stored in AsyncStorage.
 * Generated once per device installation/session.
 */
export async function getOrCreateGuestId(): Promise<string> {
  if (inMemoryGuestId) {
    return inMemoryGuestId;
  }

  try {
    const existing = await AsyncStorage.getItem(GUEST_DEVICE_ID_KEY);
    if (existing && existing.trim()) {
      inMemoryGuestId = existing.trim();
      return inMemoryGuestId;
    }

    const generated = `guest_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, generated);
    inMemoryGuestId = generated;
    return generated;
  } catch (err) {
    console.warn('[GuestService] Failed to access AsyncStorage for guest ID:', err);
    if (!inMemoryGuestId) {
      inMemoryGuestId = `guest_fallback_${Date.now().toString(36)}`;
    }
    return inMemoryGuestId;
  }
}

/**
 * Retrieves orders placed by the guest on this local device.
 */
export async function getGuestOrders(): Promise<Order[]> {
  try {
    const data = await AsyncStorage.getItem(GUEST_ORDERS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[GuestService] Failed to load local guest orders:', err);
    return [];
  }
}

/**
 * Saves a newly placed guest order onto this local device.
 */
export async function saveGuestOrder(order: Order): Promise<void> {
  try {
    const current = await getGuestOrders();
    const updated = [order, ...current.filter((o) => o.id !== order.id)];
    await AsyncStorage.setItem(GUEST_ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[GuestService] Failed to persist guest order:', err);
  }
}

/**
 * Updates a guest order's status locally (e.g. for live tracking updates).
 */
export async function updateGuestOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<void> {
  try {
    const current = await getGuestOrders();
    const updated = current.map((ord) =>
      ord.id === orderId ? { ...ord, status: newStatus, updatedAt: new Date().toISOString() } : ord,
    );
    await AsyncStorage.setItem(GUEST_ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[GuestService] Failed to update guest order status:', err);
  }
}

/**
 * Checks whether user has seen the first-launch welcome cover screen.
 */
export async function hasSeenWelcomeScreen(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks welcome screen as seen.
 */
export async function markWelcomeScreenSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
  } catch (err) {
    console.warn('[GuestService] Failed to save welcome seen flag:', err);
  }
}
