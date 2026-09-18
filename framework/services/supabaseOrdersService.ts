import { supabase } from '../supabase/client';
import {
  notifyAdminNewOrder,
  setPendingApprovalOrdersCount,
  playOrderAlertSound,
} from './notificationService';
import { Order, OrderItem, OrderStatus } from '../firebase/ordersService';

export interface CreateOrderParams {
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
      masalaSachets: it.masalaSachets || [],
      imageUrl: it.imageUrl,
    })),
    createdAt: now,
    updatedAt: now,
  };

  // Always keep in local memory for instant UI responsiveness
  localOrdersMemory.unshift(newOrder);

  try {
    // 1. Insert into Supabase `orders` table
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: params.userId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail,
      delivery_address: params.deliveryAddress,
      delivery_slot: params.deliverySlot || '6:00 PM - 8:00 PM',
      delivery_date: params.deliveryDate || 'Today',
      subtotal: params.subtotal,
      discount: params.discount || 0,
      delivery_fee: params.deliveryFee || 0,
      total_amount: params.totalAmount,
      status: 'Placed',
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
      transaction_id: newOrder.transactionId,
      created_at: now,
      updated_at: now,
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
 */
export async function approveOrderInSupabase(
  orderId: string,
  approvedBy: string = 'Admin',
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // 1. Update local memory
  const localIndex = localOrdersMemory.findIndex((o) => o.id === orderId);
  if (localIndex !== -1 && localOrdersMemory[localIndex]) {
    const existing = localOrdersMemory[localIndex]!;
    localOrdersMemory[localIndex] = {
      ...existing,
      status: 'Confirmed',
      updatedAt: now,
      trackingEvents: [
        ...(existing.trackingEvents || []),
        {
          status: 'Confirmed',
          title: 'Order Confirmed & Approved',
          description: `Order approved by ${approvedBy}. The chef has begun packing fresh meal kit ingredients.`,
          timestamp: now,
          completed: true,
        },
      ],
    };
  }

  // 2. Update Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'Confirmed',
        approved_by: approvedBy,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', orderId);

    if (error) {
      console.warn('[Supabase Orders] Error updating order status to Confirmed:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase Orders] Exception in approveOrderInSupabase:', err?.message || err);
  }

  refreshPendingApprovalCount();
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

  const localIndex = localOrdersMemory.findIndex((o) => o.id === orderId);
  if (localIndex !== -1 && localOrdersMemory[localIndex]) {
    const existing = localOrdersMemory[localIndex]!;
    localOrdersMemory[localIndex] = {
      ...existing,
      status: newStatus,
      updatedAt: now,
    };
  }

  try {
    await supabase
      .from('orders')
      .update({
        status: newStatus,
        admin_notes: adminNotes,
        updated_at: now,
      })
      .eq('id', orderId);
  } catch (err: any) {
    console.warn('[Supabase Orders] Error updating status:', err?.message);
  }

  refreshPendingApprovalCount();
  return { success: true };
}

/**
 * Fetches all orders from Supabase with graceful local fallback.
 */
export async function fetchAllOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !ordersData || ordersData.length === 0) {
      return [...localOrdersMemory];
    }

    const mappedOrders: Order[] = ordersData.map((row: any) => ({
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
      status: (row.status as OrderStatus) || 'Placed',
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
        ...(row.status !== 'Placed'
          ? [
              {
                status: row.status as OrderStatus,
                title: `Order ${row.status}`,
                description: `Status updated to ${row.status}${row.approved_by ? ` (Approved by ${row.approved_by})` : ''}`,
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
        masalaSachets: it.masala_sachets || [],
        imageUrl: it.image_url,
      })),
    }));

    // Synchronize local memory
    mappedOrders.forEach((mo) => {
      const idx = localOrdersMemory.findIndex((l) => l.id === mo.id);
      if (idx !== -1) {
        localOrdersMemory[idx] = mo;
      } else {
        localOrdersMemory.push(mo);
      }
    });

    return mappedOrders;
  } catch (err) {
    return [...localOrdersMemory];
  }
}

/**
 * Recalculates and updates the reactive count of orders with status 'Placed' (awaiting approval).
 */
export async function refreshPendingApprovalCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Placed');

    if (!error && typeof count === 'number') {
      setPendingApprovalOrdersCount(count);
      return count;
    }
  } catch {
    // fallback to local memory count
  }

  const localPending = localOrdersMemory.filter((o) => o.status === 'Placed').length;
  setPendingApprovalOrdersCount(localPending);
  return localPending;
}

/**
 * Sets up Supabase Realtime subscription for orders.
 * Listens for new orders (INSERT) and status changes (UPDATE).
 * When a new order with status 'Placed' arrives, triggers audio alert and increments pending count.
 */
export function subscribeToOrdersRealtime(onOrdersChanged: () => void): () => void {
  // Initial check
  refreshPendingApprovalCount();

  const channel = supabase
    .channel('rasoi_orders_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
      if (payload.eventType === 'INSERT') {
        const newRow = payload.new;
        if (newRow && newRow.status === 'Placed') {
          playOrderAlertSound();
        }
      }
      refreshPendingApprovalCount();
      onOrdersChanged();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
