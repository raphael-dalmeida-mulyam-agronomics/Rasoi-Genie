import { supabase } from '../supabase/client';
import {
  notifyAdminNewOrder,
  setPendingApprovalOrdersCount,
  playOrderAlertSound,
} from './notificationService';
import {
  Order,
  OrderItem,
  OrderStatus,
  isOrderApproved,
  markOrderAsApproved,
  unmarkOrderAsApproved,
  loadPersistedOrders,
  savePersistedOrders,
  updateOrderStatus,
  clearAllOrders,
  MOCK_ORDER_IDS,
} from '../firebase/ordersService';

export interface CreateOrderParams {
  id?: string;
  orderId?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliverySlot?: string;
  deliveryDate?: string;
  items: {
    kitId: string;
    name: string;
    quantity: number;
    price: number;
    servings?: number;
    spiceLevel?: string;
    masalaSachets?: string[];
    imageUrl?: string;
  }[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash on Delivery';
  transactionId?: string;
}

// Local fallback cache if Supabase network is unavailable
const localOrdersMemory: Order[] = [];

/**
 * Creates a new order in Supabase.
 * Sets initial status to 'Placed' (awaiting admin approval).
 * Creates corresponding order_items and admin_notification entry.
 * Fires real-time notification alert and sound chime.
 */
export async function createOrderInSupabase(
  params: CreateOrderParams,
): Promise<{ success: boolean; orderId: string; error?: string }> {
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    userId: params.userId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerEmail: params.customerEmail,
    deliveryAddress: params.deliveryAddress,
    deliverySlot: params.deliverySlot || '6:00 PM - 8:00 PM',
    deliveryDate: params.deliveryDate || 'Today',
    subtotal: params.subtotal,
    discount: params.discount || 0,
    couponCode: params.couponCode,
    deliveryFee: params.deliveryFee || 0,
    totalAmount: params.totalAmount,
    status: 'Placed', // Initial state awaiting admin approval
    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
    transactionId:
      params.transactionId || `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    trackingEvents: [
      {
        status: 'Placed',
        title: 'Order Placed',
        description: 'Order placed by customer and awaiting chef/admin approval.',
        timestamp: now,
        completed: true,
      },
    ],
    items: params.items.map((it, idx) => ({
      id: `${orderId}-${idx + 1}`,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      servings: it.servings,
      spiceLevel: it.spiceLevel,
      masalaSachets: it.masalaSachets || [],
      imageUrl: it.imageUrl,
    })),
    createdAt: now,
    updatedAt: now,
  };

  // Always keep in local memory for instant UI responsiveness
  localOrdersMemory.unshift(newOrder);
  try {
    const existing = await loadPersistedOrders();
    const updated = [newOrder, ...existing.filter((o) => o.id !== newOrder.id)];
    await savePersistedOrders(updated);
  } catch (persistErr) {
    console.warn('[Supabase Orders] Could not persist new order locally:', persistErr);
  }

  try {
    // 1. Insert into Supabase `orders` table (only columns present in schema)
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: params.userId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail,
      delivery_address: params.deliveryAddress,
      delivery_slot: params.deliverySlot || '6:00 PM - 8:00 PM',
      subtotal: params.subtotal,
      discount: params.discount || 0,
      delivery_fee: params.deliveryFee || 0,
      total_amount: params.totalAmount,
      status: 'Placed',
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
      transaction_id: newOrder.transactionId,
      created_at: now,
    });

    if (orderError) {
      console.warn(
        '[Supabase Orders] Could not insert to Supabase orders table, using local fallback:',
        orderError.message,
      );
    } else {
      // 2. Insert order items
      const itemsToInsert = params.items.map((item) => ({
        order_id: orderId,
        kit_id: item.kitId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        servings: item.servings || 2,
        spice_level: item.spiceLevel || 'Medium',
        masala_sachets: item.masalaSachets || [],
        image_url: item.imageUrl,
      }));

      await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Orders] Error inserting order items:', error.message);
        });

      // 3. Insert into admin_notifications
      await supabase
        .from('admin_notifications')
        .insert({
          order_id: orderId,
          type: 'new_order',
          title: 'New Order Received',
          message: `Order ${orderId} placed for ₹${params.totalAmount} by ${params.customerName}. Requires admin approval.`,
          is_read: false,
          created_at: now,
        })
        .then(({ error }) => {
          if (error)
            console.warn('[Supabase Orders] Error inserting admin notification:', error.message);
        });
    }
  } catch (err: any) {
    console.warn('[Supabase Orders] Unexpected error writing order:', err?.message || err);
  }

  // Trigger admin alert (sound + push notification)
  notifyAdminNewOrder({
    orderId,
    customerName: params.customerName,
    totalAmount: params.totalAmount,
    itemsCount: params.items.length,
  });

  // Re-calculate pending count
  refreshPendingApprovalCount();

  return { success: true, orderId };
}

/**
 * Admin approves order:
 * Transitions status directly from 'Placed' to 'Confirmed'.
 * Marks order as permanently approved so reload never asks again.
 */
export async function approveOrderInSupabase(
  orderId: string,
  approvedBy: string = 'Admin',
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // 1. Permanently record approval in persistent store
  await markOrderAsApproved(orderId, approvedBy);

  // 2. Synchronously update orders in ordersService
  await updateOrderStatus(orderId, 'Confirmed');

  // 3. Keep localOrdersMemory synchronized
  const allCurrent = await loadPersistedOrders();
  const memIdx = localOrdersMemory.findIndex((o) => o.id === orderId);
  const existingMem = memIdx !== -1 ? localOrdersMemory[memIdx] : undefined;
  if (existingMem) {
    localOrdersMemory[memIdx] = {
      ...existingMem,
      status: 'Confirmed',
      isApproved: true,
      approvedBy,
      approvedAt: now,
      updatedAt: now,
    };
  }
  for (const c of allCurrent) {
    const idx = localOrdersMemory.findIndex((o) => o.id === c.id);
    if (idx === -1) {
      if (c.id === orderId) {
        localOrdersMemory.push({
          ...c,
          status: 'Confirmed',
          isApproved: true,
          approvedBy,
          approvedAt: now,
          updatedAt: now,
        });
      } else {
        localOrdersMemory.push(c);
      }
    }
  }
  await savePersistedOrders(localOrdersMemory);

  // 4. Update Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'Confirmed',
      })
      .eq('id', orderId);

    if (error) {
      console.warn('[Supabase Orders] Error updating order status to Confirmed:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase Orders] Exception in approveOrderInSupabase:', err?.message || err);
  }

  refreshPendingApprovalCount();
  notifyRealtimeOrderListeners();
  return { success: true };
}

/**
 * Updates order to any next status in lifecycle (Preparing, Out for Delivery, Delivered, Cancelled).
 */
export async function updateOrderStatusInSupabase(
  orderId: string,
  newStatus: OrderStatus,
  adminNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  if (newStatus === 'Cancelled' || newStatus === 'Refunded') {
    await unmarkOrderAsApproved(orderId);
  } else if (newStatus !== 'Placed') {
    await markOrderAsApproved(orderId);
  }

  // 1. Synchronously update orders in ordersService
  await updateOrderStatus(orderId, newStatus, adminNotes);

  // 2. Keep localOrdersMemory synchronized
  const allCurrent = await loadPersistedOrders();
  let found = false;
  const memIdx = localOrdersMemory.findIndex((o) => o.id === orderId);
  const existingMem = memIdx !== -1 ? localOrdersMemory[memIdx] : undefined;
  if (existingMem) {
    localOrdersMemory[memIdx] = {
      ...existingMem,
      status: newStatus,
      isApproved:
        newStatus === 'Cancelled' || newStatus === 'Refunded'
          ? false
          : (existingMem.isApproved ?? true),
      adminNotes,
      cancellationReason: newStatus === 'Cancelled' ? adminNotes : existingMem.cancellationReason,
      updatedAt: now,
    };
    found = true;
  }
  for (const c of allCurrent) {
    const idx = localOrdersMemory.findIndex((o) => o.id === c.id);
    if (idx === -1) {
      if (c.id === orderId) {
        localOrdersMemory.push({
          ...c,
          status: newStatus,
          isApproved: false,
          adminNotes,
          cancellationReason: adminNotes,
          updatedAt: now,
        });
        found = true;
      } else {
        localOrdersMemory.push(c);
      }
    }
  }

  if (!found) {
    localOrdersMemory.unshift({
      id: orderId,
      userId: 'guest_user',
      customerName: 'Customer',
      customerPhone: '',
      deliveryAddress: '',
      deliverySlot: '',
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      totalAmount: 0,
      status: newStatus,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      transactionId: orderId,
      trackingEvents: [],
      cancellationReason: adminNotes,
      adminNotes,
      createdAt: now,
      updatedAt: now,
    });
  }

  await savePersistedOrders(localOrdersMemory);

  // 3. Update Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
      })
      .eq('id', orderId);

    if (error) {
      console.warn('[Supabase Orders] Error updating status in Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase Orders] Error updating status:', err?.message);
  }

  refreshPendingApprovalCount();
  notifyRealtimeOrderListeners();
  return { success: true };
}

/**
 * Permanently deletes all orders, order items, and admin notifications from Supabase and local storage.
 */
export async function clearAllOrdersFromSupabase(): Promise<{ success: boolean; error?: string }> {
  localOrdersMemory.length = 0;
  await clearAllOrders();

  try {
    await supabase.from('order_items').delete().neq('order_id', 'none');
  } catch {}
  try {
    await supabase.from('admin_notifications').delete().neq('title', '___none___');
  } catch {}
  try {
    await supabase.from('orders').delete().neq('id', 'none');
  } catch {}

  refreshPendingApprovalCount();
  notifyRealtimeOrderListeners();
  return { success: true };
}

/**
 * Fetches all orders from Supabase with graceful local fallback.
 * Automatically filters out legacy filler mock data and applies persistent approval state.
 */
export async function fetchAllOrdersFromSupabase(): Promise<Order[]> {
  const localPersisted = await loadPersistedOrders();
  const localCombined = [...localOrdersMemory];
  for (const p of localPersisted) {
    if (
      !localCombined.some((o) => o.id === p.id) &&
      !MOCK_ORDER_IDS.has(p.id) &&
      p.id.startsWith('ORD-')
    ) {
      localCombined.push(p);
    }
  }

  const applyApproval = (o: Order): Order => {
    if (o.status === 'Cancelled' || o.status === 'Refunded') {
      return { ...o, isApproved: false };
    }
    if ((isOrderApproved(o.id) || o.isApproved) && o.status === 'Placed') {
      return { ...o, isApproved: true, status: 'Confirmed' as OrderStatus };
    }
    return o;
  };

  try {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !ordersData) {
      // Return combined local fallback orders on network error
      localOrdersMemory.length = 0;
      localOrdersMemory.push(...localCombined);
      return localCombined.map(applyApproval);
    }

    if (ordersData.length === 0) {
      // Database is online and explicitly empty (all orders deleted)
      localOrdersMemory.length = 0;
      await savePersistedOrders([]);
      return [];
    }

    const mappedOrders: Order[] = ordersData
      .filter((row: any) => !MOCK_ORDER_IDS.has(row.id))
      .map((row: any) => {
        const isCancelled = row.status === 'Cancelled' || !!row.cancellation_reason;
        const approved =
          !isCancelled && (isOrderApproved(row.id) || !!row.approved_by || !!row.approved_at);
        const currentStatus = (row.status as OrderStatus) || 'Placed';
        const effectiveStatus: OrderStatus = isCancelled
          ? 'Cancelled'
          : approved && currentStatus === 'Placed'
            ? 'Confirmed'
            : currentStatus;

        return {
          id: row.id,
          userId: row.user_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerEmail: row.customer_email,
          deliveryAddress: row.delivery_address,
          deliverySlot: row.delivery_slot,
          deliveryDate: row.delivery_date,
          subtotal: Number(row.subtotal) || 0,
          discount: Number(row.discount) || 0,
          deliveryFee: Number(row.delivery_fee) || 0,
          totalAmount: Number(row.total_amount) || 0,
          status: effectiveStatus,
          isApproved: approved,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at,
          cancellationReason: row.admin_notes || row.cancellation_reason,
          adminNotes: row.admin_notes || row.cancellation_reason,
          paymentMethod: row.payment_method || 'UPI',
          paymentStatus: row.payment_status || 'Paid',
          transactionId: row.transaction_id || row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          trackingEvents: [
            {
              status: 'Placed',
              title: 'Order Placed',
              description: 'Order placed by customer.',
              timestamp: row.created_at,
              completed: true,
            },
            ...(effectiveStatus !== 'Placed'
              ? [
                  {
                    status: effectiveStatus,
                    title:
                      effectiveStatus === 'Cancelled'
                        ? 'Order Cancelled'
                        : `Order ${effectiveStatus}`,
                    description:
                      effectiveStatus === 'Cancelled'
                        ? row.admin_notes || 'Cancelled by Kitchen Management.'
                        : `Status updated to ${effectiveStatus}${row.approved_by ? ` (Approved by ${row.approved_by})` : ''}`,
                    timestamp: row.updated_at,
                    completed: true,
                  },
                ]
              : []),
          ],
          items: (row.order_items || []).map((it: any) => ({
            id: it.id?.toString() || it.kit_id,
            name: it.name,
            quantity: it.quantity,
            price: Number(it.price) || 0,
            servings: it.servings,
            spiceLevel: it.spice_level,
            masalaSachets: it.masala_sachets || [],
            imageUrl: it.image_url,
          })),
        };
      });

    // Merge: Combine remote Supabase orders with local orders without reverting advanced statuses
    const combinedMap = new Map<string, Order>();
    mappedOrders.forEach((o) => combinedMap.set(o.id, o));

    localCombined.forEach((loc) => {
      if (!loc.id.startsWith('ORD-')) return;
      if (!combinedMap.has(loc.id) && !MOCK_ORDER_IDS.has(loc.id)) {
        const isDuplicateTxn =
          loc.transactionId && mappedOrders.some((m) => m.transactionId === loc.transactionId);
        if (!isDuplicateTxn) {
          combinedMap.set(loc.id, loc);
        }
      } else if (combinedMap.has(loc.id)) {
        const remote = combinedMap.get(loc.id)!;
        // If local is Cancelled or Refunded, local terminal status ALWAYS wins over remote
        if (loc.status === 'Cancelled' || loc.status === 'Refunded') {
          combinedMap.set(loc.id, {
            ...remote,
            status: loc.status,
            cancellationReason: loc.cancellationReason || remote.cancellationReason,
            adminNotes: loc.adminNotes || remote.adminNotes,
            isApproved: false,
            updatedAt: loc.updatedAt || remote.updatedAt,
            trackingEvents:
              loc.trackingEvents && loc.trackingEvents.length > 0
                ? loc.trackingEvents
                : remote.trackingEvents,
          });
        } else if (loc.status !== 'Placed' && remote.status === 'Placed') {
          // If local has progressed beyond Placed (e.g. Confirmed, Preparing, Out for Delivery, Delivered)
          combinedMap.set(loc.id, {
            ...remote,
            status: loc.status,
            cancellationReason: loc.cancellationReason || remote.cancellationReason,
            adminNotes: loc.adminNotes || remote.adminNotes,
            isApproved: loc.isApproved || remote.isApproved,
            updatedAt: loc.updatedAt || remote.updatedAt,
            trackingEvents:
              loc.trackingEvents && loc.trackingEvents.length > 0
                ? loc.trackingEvents
                : remote.trackingEvents,
          });
        }
      }
    });

    const combined = Array.from(combinedMap.values());
    localOrdersMemory.length = 0;
    localOrdersMemory.push(...combined);
    await savePersistedOrders(combined);
    return combined.map(applyApproval);
  } catch (err) {
    localOrdersMemory.length = 0;
    localOrdersMemory.push(...localCombined);
    return localCombined.map(applyApproval);
  }
}

/**
 * Recalculates and updates the reactive count of orders with status 'Placed' (awaiting approval).
 * Excludes any order that has already been approved.
 */
export async function refreshPendingApprovalCount(): Promise<number> {
  try {
    const all = await fetchAllOrdersFromSupabase();
    const pendingCount = all.filter(
      (o) => o.status === 'Placed' && !isOrderApproved(o.id) && !o.isApproved,
    ).length;
    setPendingApprovalOrdersCount(pendingCount);
    return pendingCount;
  } catch {
    const localPending = localOrdersMemory.filter(
      (o) => o.status === 'Placed' && !isOrderApproved(o.id) && !o.isApproved,
    ).length;
    setPendingApprovalOrdersCount(localPending);
    return localPending;
  }
}

const realtimeOrderListeners = new Set<() => void>();

export function notifyRealtimeOrderListeners() {
  realtimeOrderListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('[Supabase Realtime] Error invoking order listener:', err);
    }
  });
}

let sharedRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureSharedRealtimeChannel() {
  if (sharedRealtimeChannel) {
    return;
  }

  try {
    // Unique channel topic to prevent collisions across reconnects or hot reloads
    const channelTopic = `rasoi_orders_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelTopic);

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload: any) => {
        try {
          if (payload?.eventType === 'INSERT') {
            const newRow = payload?.new;
            if (newRow && newRow.status === 'Placed') {
              playOrderAlertSound();
            }
          }
          refreshPendingApprovalCount();
          realtimeOrderListeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.error('[Supabase Realtime] Error invoking order listener:', err);
            }
          });
        } catch (err) {
          console.warn('[Supabase Realtime] Error in change event handler:', err);
        }
      },
    );

    channel.subscribe((status: string, err?: any) => {
      if (err) {
        console.warn('[Supabase Realtime] Subscription status:', status, err);
      }
    });

    sharedRealtimeChannel = channel;
  } catch (err) {
    console.warn('[Supabase Realtime] Could not initialize realtime subscription channel:', err);
  }
}

/**
 * Sets up Supabase Realtime subscription for orders.
 * Listens for new orders (INSERT) and status changes (UPDATE).
 * Safe to call from multiple components simultaneously (AdminDashboard, OrderHistory, TabLayout).
 * When a new order with status 'Placed' arrives, triggers audio alert and increments pending count.
 */
export function subscribeToOrdersRealtime(onOrdersChanged: () => void): () => void {
  // Initial check
  refreshPendingApprovalCount();

  realtimeOrderListeners.add(onOrdersChanged);
  ensureSharedRealtimeChannel();

  return () => {
    realtimeOrderListeners.delete(onOrdersChanged);
    if (realtimeOrderListeners.size === 0 && sharedRealtimeChannel) {
      try {
        supabase.removeChannel(sharedRealtimeChannel);
      } catch (err) {
        console.warn('[Supabase Realtime] Error removing channel:', err);
      }
      sharedRealtimeChannel = null;
    }
  };
}
