import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  | 'Pending'; // Backward compatibility

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  servings?: number;
  spiceLevel?: string;
  masalaSachets: string[];
  imageUrl?: string;
}

export interface TrackingEvent {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

export interface Order {
  id: string;
  userId: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  deliveryAddress: string;
  addressTag?: 'Home' | 'Work' | 'Other';
  deliverySlot?: string;
  deliveryDate?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash on Delivery';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  transactionId: string;
  trackingEvents: TrackingEvent[];
  refundReason?: string;
  refundAmount?: number;
  cancellationReason?: string;
  adminNotes?: string;
  isDismissed?: boolean;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ORDERS_STORAGE_KEY = '@rasoi_persisted_orders';
export const APPROVED_ORDERS_STORAGE_KEY = '@rasoi_approved_order_ids';
export const DISMISSED_ORDERS_STORAGE_KEY = '@rasoi_dismissed_order_ids';
export const MOCK_ORDER_IDS = new Set(['ORD-9821', 'ORD-9820', 'ORD-9819']);

// Initial mock orders kept empty to avoid filler data
export const INITIAL_MOCK_ORDERS: Order[] = [];

// In-memory fallback order storage for local execution & testing
let memoryOrdersStore: Order[] = [];
const approvedOrderIdsSet = new Set<string>();
const dismissedOrderIdsSet = new Set<string>();

// Read synchronously from web localStorage if available
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const rawApproved = window.localStorage.getItem(APPROVED_ORDERS_STORAGE_KEY);
    if (rawApproved) {
      const ids: string[] = JSON.parse(rawApproved);
      ids.forEach((id) => approvedOrderIdsSet.add(id));
    }
    const rawDismissed = window.localStorage.getItem(DISMISSED_ORDERS_STORAGE_KEY);
    if (rawDismissed) {
      const ids: string[] = JSON.parse(rawDismissed);
      ids.forEach((id) => dismissedOrderIdsSet.add(id));
    }
    const rawOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (rawOrders) {
      const ords: Order[] = JSON.parse(rawOrders);
      memoryOrdersStore = ords
        .filter((o) => !MOCK_ORDER_IDS.has(o.id))
        .map((o) => {
          const isDismissed = dismissedOrderIdsSet.has(o.id) || !!o.isDismissed;
          if (approvedOrderIdsSet.has(o.id) || o.isApproved) {
            return {
              ...o,
              isApproved: true,
              isDismissed,
              status: o.status === 'Placed' ? 'Confirmed' : o.status,
            };
          }
          return { ...o, isDismissed };
        });
    }
  } catch {}
}

const listeners: ((orders: Order[]) => void)[] = [];

export function notifyListeners() {
  listeners.forEach((fn) => fn([...memoryOrdersStore]));
}

export function isOrderApproved(orderId: string): boolean {
  return approvedOrderIdsSet.has(orderId);
}

async function safeStorageGet(key: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch {}
  }
  try {
    if (typeof AsyncStorage !== 'undefined' && AsyncStorage?.getItem) {
      return await AsyncStorage.getItem(key);
    }
  } catch {}
  return null;
}

async function safeStorageSet(key: string, value: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  }
  try {
    if (typeof AsyncStorage !== 'undefined' && AsyncStorage?.setItem) {
      await AsyncStorage.setItem(key, value);
    }
  } catch {}
}

export async function savePersistedOrders(orders: Order[]): Promise<void> {
  const clean = orders.filter((o) => !MOCK_ORDER_IDS.has(o.id));
  const serialized = JSON.stringify(clean);
  await safeStorageSet(ORDERS_STORAGE_KEY, serialized);
}

export async function markOrderAsApproved(orderId: string, approvedBy = 'Admin'): Promise<void> {
  approvedOrderIdsSet.add(orderId);
  const serialized = JSON.stringify(Array.from(approvedOrderIdsSet));
  await safeStorageSet(APPROVED_ORDERS_STORAGE_KEY, serialized);

  if (memoryOrdersStore.length === 0) {
    await loadPersistedOrders();
  }

  const idx = memoryOrdersStore.findIndex((o) => o.id === orderId);
  if (idx !== -1 && memoryOrdersStore[idx]) {
    const existing = memoryOrdersStore[idx]!;
    memoryOrdersStore[idx] = {
      ...existing,
      isApproved: true,
      approvedBy,
      approvedAt: new Date().toISOString(),
      status: existing.status === 'Placed' ? 'Confirmed' : existing.status,
    };
    await savePersistedOrders(memoryOrdersStore);
    notifyListeners();
  }
}

export async function unmarkOrderAsApproved(orderId: string): Promise<void> {
  approvedOrderIdsSet.delete(orderId);
  const serialized = JSON.stringify(Array.from(approvedOrderIdsSet));
  await safeStorageSet(APPROVED_ORDERS_STORAGE_KEY, serialized);
}

export async function loadPersistedOrders(): Promise<Order[]> {
  try {
    let parsedOrders: Order[] = [];
    let parsedApproved: string[] = [];
    let parsedDismissed: string[] = [];

    const rawOrders = await safeStorageGet(ORDERS_STORAGE_KEY);
    if (rawOrders) {
      try {
        parsedOrders = JSON.parse(rawOrders);
      } catch {}
    }

    const rawApproved = await safeStorageGet(APPROVED_ORDERS_STORAGE_KEY);
    if (rawApproved) {
      try {
        parsedApproved = JSON.parse(rawApproved);
      } catch {}
    }

    const rawDismissed = await safeStorageGet(DISMISSED_ORDERS_STORAGE_KEY);
    if (rawDismissed) {
      try {
        parsedDismissed = JSON.parse(rawDismissed);
      } catch {}
    }

    parsedApproved.forEach((id) => approvedOrderIdsSet.add(id));
    parsedDismissed.forEach((id) => dismissedOrderIdsSet.add(id));

    const cleaned = parsedOrders
      .filter((o) => !MOCK_ORDER_IDS.has(o.id) && o.id.startsWith('ORD-'))
      .map((o) => {
        const isDismissed = dismissedOrderIdsSet.has(o.id) || !!o.isDismissed;
        const isCancelled = o.status === 'Cancelled' || o.status === 'Refunded';
        if (!isCancelled && (approvedOrderIdsSet.has(o.id) || o.isApproved)) {
          return {
            ...o,
            isApproved: true,
            isDismissed,
            status: o.status === 'Placed' ? 'Confirmed' : o.status,
          };
        }
        return { ...o, isApproved: !isCancelled && !!o.isApproved, isDismissed };
      });

    if (cleaned.length > 0) {
      memoryOrdersStore = cleaned;
    }
    return [...memoryOrdersStore];
  } catch (err) {
    return [...memoryOrdersStore];
  }
}

export async function dismissCancelledOrder(orderId: string): Promise<void> {
  dismissedOrderIdsSet.add(orderId);
  const serialized = JSON.stringify(Array.from(dismissedOrderIdsSet));
  await safeStorageSet(DISMISSED_ORDERS_STORAGE_KEY, serialized);

  const idx = memoryOrdersStore.findIndex((o) => o.id === orderId);
  if (idx !== -1 && memoryOrdersStore[idx]) {
    memoryOrdersStore[idx]!.isDismissed = true;
    await savePersistedOrders(memoryOrdersStore);
  }
  notifyListeners();
}

export function isOrderDismissed(orderId: string): boolean {
  return dismissedOrderIdsSet.has(orderId);
}

export async function clearAllOrders(): Promise<void> {
  memoryOrdersStore = [];
  approvedOrderIdsSet.clear();
  dismissedOrderIdsSet.clear();
  await safeStorageSet(ORDERS_STORAGE_KEY, JSON.stringify([]));
  await safeStorageSet(APPROVED_ORDERS_STORAGE_KEY, JSON.stringify([]));
  await safeStorageSet(DISMISSED_ORDERS_STORAGE_KEY, JSON.stringify([]));
  notifyListeners();

  // Permanently delete all documents from Firestore orders collection
  try {
    const ordersCol = collection(db, 'orders');
    const snapshot = await getDocs(ordersCol);
    if (!snapshot.empty) {
      await Promise.all(snapshot.docs.map((d) => deleteDoc(doc(db, 'orders', d.id))));
    }
  } catch (err) {
    console.warn('[ordersService] Failed to clear Firestore orders collection:', err);
  }

  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }
}

// Initial load on start
loadPersistedOrders()
  .then(() => notifyListeners())
  .catch(() => {});

export interface CreateOrderParams {
  id?: string;
  orderId?: string;
  userId: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  deliveryAddress: string;
  addressTag?: 'Home' | 'Work' | 'Other';
  deliverySlot?: string;
  deliveryDate?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash on Delivery';
}

/**
 * Place a new user order into Firebase Firestore & local store.
 */
export async function createOrder(
  userIdOrParams: string | CreateOrderParams,
  customerPhone?: string,
  deliveryAddress?: string,
  items?: OrderItem[],
  totalAmount?: number,
  customerName?: string,
): Promise<Order> {
  let params: CreateOrderParams;

  if (typeof userIdOrParams === 'object') {
    params = userIdOrParams;
  } else {
    params = {
      userId: userIdOrParams,
      customerPhone: customerPhone || '',
      deliveryAddress: deliveryAddress || '',
      items: items || [],
      subtotal: totalAmount || 0,
      totalAmount: totalAmount || 0,
      customerName,
      paymentMethod: 'UPI',
    };
  }

  const orderId = params.id || params.orderId || 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();

  const newOrder: Order = {
    id: orderId,
    userId: params.userId,
    customerPhone: params.customerPhone,
    customerName: params.customerName || `Customer (${params.customerPhone.slice(-4)})`,
    customerEmail: params.customerEmail,
    deliveryAddress: params.deliveryAddress,
    addressTag: params.addressTag || 'Home',
    deliverySlot: params.deliverySlot || 'Today Evening (6 PM - 8 PM)',
    deliveryDate: params.deliveryDate || 'Today',
    items: params.items,
    subtotal: params.subtotal,
    discount: params.discount || 0,
    couponCode: params.couponCode || '',
    deliveryFee: params.deliveryFee || 0,
    totalAmount: params.totalAmount,
    status: 'Placed',
    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
    transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    trackingEvents: [
      {
        status: 'Placed',
        title: 'Order Placed',
        description: `Order ${orderId} received and payment confirmed.`,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completed: true,
      },
      {
        status: 'Confirmed',
        title: 'Order Confirmed',
        description: 'RasoiGenie kitchen confirmed order. Fresh preparation underway.',
        timestamp: 'Pending',
        completed: false,
      },
      {
        status: 'Preparing',
        title: 'Fresh Prep & Vacuum Pack',
        description: 'Pre-portioned fresh ingredients and spice sachets packed.',
        timestamp: 'Pending',
        completed: false,
      },
      {
        status: 'Out for Delivery',
        title: 'Out for Delivery',
        description: 'Handed over to cold-chain delivery agent with temperature monitor.',
        timestamp: 'Pending',
        completed: false,
      },
      {
        status: 'Delivered',
        title: 'Delivered Fresh to Doorstep',
        description: 'Customer accepted order. Ready to cook in 25 mins!',
        timestamp: 'Pending',
        completed: false,
      },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (process.env.NODE_ENV !== 'test') {
    try {
      const cleanDoc = JSON.parse(JSON.stringify(newOrder));
      await setDoc(doc(db, 'orders', orderId), cleanDoc);
    } catch (err) {
      console.warn('[ordersService] Firestore setDoc failed, using local store:', err);
    }
  }

  // Deduplicate in memory
  const existingIdx = memoryOrdersStore.findIndex((o) => o.id === newOrder.id);
  if (existingIdx !== -1) {
    memoryOrdersStore[existingIdx] = newOrder;
  } else {
    memoryOrdersStore.unshift(newOrder);
  }

  await savePersistedOrders(memoryOrdersStore);
  notifyListeners();
  return newOrder;
}

/**
 * Fetch orders for a specific user ID
 */
export function getOrdersByUser(userId: string): Order[] {
  return memoryOrdersStore.filter((o) => o.userId === userId);
}

/**
 * Get all orders
 */
export function getAllOrders(): Order[] {
  return [...memoryOrdersStore];
}

/**
 * Get a specific order by ID
 */
export function getOrderById(orderId: string): Order | undefined {
  return memoryOrdersStore.find((o) => o.id === orderId);
}

/**
 * Subscribe to realtime order updates
 */
export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  callback([...memoryOrdersStore]);
  listeners.push(callback);

  loadPersistedOrders()
    .then((ords) => {
      callback(ords);
    })
    .catch(() => {});

  let unsubscribeFirestore = () => {};

  if (process.env.NODE_ENV !== 'test') {
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const uniqueMap = new Map<string, Order>();
            snapshot.docs
              .filter((docSnap) => docSnap.id.startsWith('ORD-'))
              .forEach((docSnap) => {
                const data = docSnap.data() as Omit<Order, 'id'> & { id?: string };
                const effectiveId = docSnap.id;
                if (!MOCK_ORDER_IDS.has(effectiveId)) {
                  uniqueMap.set(effectiveId, {
                    ...data,
                    id: effectiveId,
                  } as Order);
                }
              });
            const cleaned = Array.from(uniqueMap.values());
            memoryOrdersStore = cleaned;
            savePersistedOrders(cleaned);
            notifyListeners();
          } else {
            // When Firestore collection is empty, ensure memory and local storage are also cleared
            memoryOrdersStore = [];
            savePersistedOrders([]);
            notifyListeners();
          }
        },
        (error) => {
          console.warn('[ordersService] Firestore onSnapshot fallback:', error);
        },
      );
    } catch (e) {
      console.warn('[ordersService] Firestore subscription failed, using local store:', e);
    }
  }

  return () => {
    unsubscribeFirestore();
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Update an order's status (Admin operation)
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  cancellationReason?: string,
): Promise<void> {
  if (status === 'Cancelled' || status === 'Refunded') {
    await unmarkOrderAsApproved(orderId);
  } else if (status !== 'Placed') {
    await markOrderAsApproved(orderId);
  }

  if (memoryOrdersStore.length === 0 || !memoryOrdersStore.some((o) => o.id === orderId)) {
    await loadPersistedOrders();
  }

  let order = memoryOrdersStore.find((o) => o.id === orderId);
  if (!order) {
    const raw = await safeStorageGet(ORDERS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed: Order[] = JSON.parse(raw);
        const found = parsed.find((o) => o.id === orderId);
        if (found) {
          memoryOrdersStore = parsed;
          order = found;
        }
      } catch {}
    }
  }

  if (order) {
    order.status = status;
    if (status === 'Cancelled' || status === 'Refunded') {
      order.isApproved = false;
    } else if (status !== 'Placed') {
      order.isApproved = true;
    }

    if (status === 'Cancelled') {
      order.cancellationReason =
        cancellationReason || order.cancellationReason || 'Cancelled by Admin';
      order.adminNotes = cancellationReason || order.adminNotes || 'Cancelled by Admin';

      const alreadyHasCancelEvent = order.trackingEvents.some((e) => e.status === 'Cancelled');
      if (!alreadyHasCancelEvent) {
        order.trackingEvents.push({
          status: 'Cancelled',
          title: 'Order Cancelled',
          description: cancellationReason || 'Your order was cancelled by the fulfillment kitchen.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          completed: true,
        });
      }
    }
    order.updatedAt = new Date().toISOString();

    // Update tracking events
    const statusOrder: OrderStatus[] = [
      'Placed',
      'Confirmed',
      'Preparing',
      'Out for Delivery',
      'Delivered',
    ];
    const currentIdx = statusOrder.indexOf(status);

    if (currentIdx !== -1) {
      order.trackingEvents.forEach((evt, idx) => {
        if (idx <= currentIdx) {
          evt.completed = true;
          if (!evt.timestamp || evt.timestamp === 'Pending') {
            evt.timestamp = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }
      });
    }

    await savePersistedOrders(memoryOrdersStore);
    notifyListeners();

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await setDoc(
        orderDocRef,
        {
          status,
          ...(cancellationReason ? { cancellationReason, adminNotes: cancellationReason } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('[ordersService] Firestore setDoc fallback:', err);
    }
  }
}

/**
 * Issue refund for an order (Admin operation)
 */
export async function issueRefund(orderId: string, amount: number, reason: string): Promise<void> {
  const order = memoryOrdersStore.find((o) => o.id === orderId);
  if (order) {
    order.status = 'Refunded';
    order.paymentStatus = 'Refunded';
    order.refundAmount = amount;
    order.refundReason = reason;
    order.updatedAt = new Date().toISOString();
    await savePersistedOrders(memoryOrdersStore);
    notifyListeners();
  }

  if (process.env.NODE_ENV !== 'test') {
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await setDoc(
        orderDocRef,
        {
          status: 'Refunded',
          paymentStatus: 'Refunded',
          refundAmount: amount,
          refundReason: reason,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('[ordersService] Firestore issueRefund setDoc fallback:', err);
    }
  }
}

/**
 * Generate formatted text invoice
 */
export function generateInvoiceText(order: Order): string {
  const lineItems = order.items
    .map((item) => `  - ${item.name} x${item.quantity}: ₹${item.price * item.quantity}`)
    .join('\n');

  return `
========================================
           RASOI GENIE INVOICE
   Authentic Indian Meal Kits & Masalas
========================================
Invoice No:    INV-${order.id}
Date:           ${new Date(order.createdAt).toLocaleDateString()}
Status:         ${order.status} (${order.paymentStatus})
Customer:       ${order.customerName || 'Valued Customer'}
Phone:          ${order.customerPhone}
Address:        ${order.deliveryAddress}
Payment:        ${order.paymentMethod} (Txn: ${order.transactionId})

Items Ordered:
${lineItems}

----------------------------------------
Subtotal:       ₹${order.subtotal}
Discount:      -₹${order.discount} ${order.couponCode ? `(${order.couponCode})` : ''}
Delivery Fee:   ₹${order.deliveryFee === 0 ? 'FREE' : order.deliveryFee}
Taxes (5% GST): Included
----------------------------------------
TOTAL PAID:     ₹${order.totalAmount}
========================================
Thank you for cooking fresh with RasoiGenie!
Support: support@mulyam.in | WhatsApp: +91 98765 43210
`;
}
