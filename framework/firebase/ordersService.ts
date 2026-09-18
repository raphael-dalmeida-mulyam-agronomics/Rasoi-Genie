import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

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
  createdAt: string;
  updatedAt: string;
}

// Initial mock orders to populate if Firestore is empty in dev mode
export const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-9821',
    userId: 'user_phone_9876543210',
    customerPhone: '+91 9876543210',
    customerName: 'Priya Sharma',
    customerEmail: 'priya.sharma@example.com',
    deliveryAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
    addressTag: 'Home',
    deliverySlot: '6:00 PM - 8:00 PM',
    deliveryDate: 'Today',
    items: [
      {
        id: 'kit-101',
        name: 'Paneer Butter Masala Meal Kit',
        quantity: 2,
        price: 299,
        masalaSachets: ['Whole Khada Masala', 'Shahi Gravy Premix', 'Kasuri Methi'],
        imageUrl:
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
      },
      {
        id: 'kit-103',
        name: 'Slow-Brew Dal Makhani Kit',
        quantity: 1,
        price: 249,
        masalaSachets: ['Smoked Kashmiri Mirch', 'Clove & Nutmeg Spice Dust'],
        imageUrl:
          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      },
    ],
    subtotal: 847,
    discount: 100,
    couponCode: 'RASOI100',
    deliveryFee: 0,
    totalAmount: 747,
    status: 'Preparing',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    transactionId: 'UPI-TXN-8841920',
    trackingEvents: [
      {
        status: 'Placed',
        title: 'Order Placed',
        description: 'Order placed successfully via UPI (GPay)',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        completed: true,
      },
      {
        status: 'Confirmed',
        title: 'Order Confirmed',
        description: 'Fulfillment hub accepted your order',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        completed: true,
      },
      {
        status: 'Preparing',
        title: 'Portioning Fresh Ingredients & Masalas',
        description: 'Chefs are packing vacuum-sealed sachets and fresh produce',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        completed: true,
      },
      {
        status: 'Out for Delivery',
        title: 'Dispatched with Cold-Chain Courier',
        description: 'Delivery rider is on the way in temperature-controlled bag',
        timestamp: 'Estimated 6:30 PM',
        completed: false,
      },
      {
        status: 'Delivered',
        title: 'Delivered to Doorstep',
        description: 'Handover complete. Ready to cook!',
        timestamp: 'Pending',
        completed: false,
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'ORD-9820',
    userId: 'user_phone_9123456789',
    customerPhone: '+91 9123456789',
    customerName: 'Rahul Verma',
    deliveryAddress: 'B-12, Sector 62, Noida, Uttar Pradesh',
    addressTag: 'Work',
    deliverySlot: '12:00 PM - 2:00 PM',
    deliveryDate: 'Today',
    items: [
      {
        id: 'kit-102',
        name: 'Hyderabadi Chicken Biryani Meal Kit',
        quantity: 1,
        price: 399,
        masalaSachets: ['Biryani Marinade Booster', 'Rice Whole Spice Pot', 'Rose & Kewra Mist'],
        imageUrl:
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
      },
    ],
    subtotal: 399,
    discount: 0,
    deliveryFee: 49,
    totalAmount: 448,
    status: 'Out for Delivery',
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    transactionId: 'CRD-TXN-4910283',
    trackingEvents: [
      {
        status: 'Placed',
        title: 'Order Placed',
        description: 'Payment authorized successfully',
        timestamp: '11:05 AM',
        completed: true,
      },
      {
        status: 'Confirmed',
        title: 'Confirmed by Hub',
        description: 'Assigned to Delhi NCR Kitchen Hub',
        timestamp: '11:15 AM',
        completed: true,
      },
      {
        status: 'Preparing',
        title: 'Packed & Inspected',
        description: 'Quality check passed with nitrogen freshness seal',
        timestamp: '11:45 AM',
        completed: true,
      },
      {
        status: 'Out for Delivery',
        title: 'Out for Delivery',
        description: 'Rider Ramesh (+91 9811002233) is arriving in 15 mins',
        timestamp: '12:15 PM',
        completed: true,
      },
      {
        status: 'Delivered',
        title: 'Delivered',
        description: 'Package received',
        timestamp: 'Pending',
        completed: false,
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'ORD-9819',
    userId: 'user_phone_9988776655',
    customerPhone: '+91 9988776655',
    customerName: 'Ananya Patel',
    deliveryAddress: '15/A Park Street, Indiranagar, Bengaluru',
    addressTag: 'Home',
    deliverySlot: '7:00 PM - 9:00 PM',
    items: [
      {
        id: 'kit-104',
        name: 'Coastal Prawns Ghee Roast Kit',
        quantity: 2,
        price: 499,
        masalaSachets: ['Ghee Roast Cumin-Fennel Spice Blend', 'Peppercorn Kalpasi Masala'],
        imageUrl:
          'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80',
      },
    ],
    subtotal: 998,
    discount: 150,
    couponCode: 'FEAST150',
    deliveryFee: 0,
    totalAmount: 848,
    status: 'Delivered',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    transactionId: 'UPI-TXN-1123984',
    trackingEvents: [
      {
        status: 'Placed',
        title: 'Order Placed',
        description: 'Placed via PhonePe UPI',
        timestamp: 'Yesterday',
        completed: true,
      },
      {
        status: 'Confirmed',
        title: 'Confirmed',
        description: 'Bengaluru East Hub',
        timestamp: 'Yesterday',
        completed: true,
      },
      {
        status: 'Preparing',
        title: 'Packed',
        description: 'Ice chilled seafood thermal pack prepared',
        timestamp: 'Yesterday',
        completed: true,
      },
      {
        status: 'Out for Delivery',
        title: 'Out for Delivery',
        description: 'Rider arrived',
        timestamp: 'Yesterday',
        completed: true,
      },
      {
        status: 'Delivered',
        title: 'Delivered',
        description: 'Handed to customer at gate',
        timestamp: 'Yesterday',
        completed: true,
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
];

// In-memory fallback order storage for local execution & testing
let memoryOrdersStore: Order[] = [...INITIAL_MOCK_ORDERS];
const listeners: ((orders: Order[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach((fn) => fn([...memoryOrdersStore]));
}

export interface CreateOrderParams {
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

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
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

  try {
    const ordersCol = collection(db, 'orders');
    const cleanDoc = JSON.parse(JSON.stringify(newOrder));
    const docRef = await addDoc(ordersCol, cleanDoc);
    newOrder.id = docRef.id;
  } catch (err) {
    console.warn('[ordersService] Firestore addDoc failed, using local store:', err);
  }

  memoryOrdersStore.unshift(newOrder);
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

  let unsubscribeFirestore = () => {};

  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteOrders: Order[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>),
          }));
          memoryOrdersStore = remoteOrders;
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

  return () => {
    unsubscribeFirestore();
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Update an order's status (Admin operation)
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const order = memoryOrdersStore.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
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

    notifyListeners();
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await updateDoc(orderDocRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[ordersService] Firestore updateDoc fallback:', err);
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
    notifyListeners();
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await updateDoc(orderDocRef, {
      status: 'Refunded',
      paymentStatus: 'Refunded',
      refundAmount: amount,
      refundReason: reason,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[ordersService] Firestore refund fallback:', err);
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
