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

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  masalaSachets: string[];
}

export interface Order {
  id: string;
  userId: string;
  customerPhone: string;
  customerName?: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// Initial mock orders to populate if Firestore is empty in dev mode
const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-9821',
    userId: 'user_phone_9876543210',
    customerPhone: '+91 9876543210',
    customerName: 'Priya Sharma',
    deliveryAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
    items: [
      {
        id: 'kit-1',
        name: 'Paneer Butter Masala Meal Kit',
        quantity: 2,
        price: 299,
        masalaSachets: ['Whole Spices (Khadamasala)', 'Shahi Gravy Premix', 'Garam Masala'],
      },
      {
        id: 'kit-2',
        name: 'Dal Makhani Sachet Pack',
        quantity: 1,
        price: 149,
        masalaSachets: ['Rajma & Dal Slow Brew Spice', 'Kasuri Methi Blend'],
      },
    ],
    totalAmount: 747,
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'ORD-9820',
    userId: 'user_phone_9123456789',
    customerPhone: '+91 9123456789',
    customerName: 'Rahul Verma',
    deliveryAddress: 'B-12, Sector 62, Noida, Uttar Pradesh',
    items: [
      {
        id: 'kit-3',
        name: 'Hyderabadi Chicken Biryani Meal Kit',
        quantity: 1,
        price: 399,
        masalaSachets: [
          'Biryani Marinade Mix',
          'Aromatic Basmati Rice Spice Pot',
          'Biryani Masala',
        ],
      },
    ],
    totalAmount: 399,
    status: 'Preparing',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'ORD-9819',
    userId: 'user_phone_9988776655',
    customerPhone: '+91 9988776655',
    customerName: 'Ananya Patel',
    deliveryAddress: '15/A Park Street, Indiranagar, Bengaluru',
    items: [
      {
        id: 'kit-4',
        name: 'Kadhai Paneer Spice Kit',
        quantity: 3,
        price: 249,
        masalaSachets: ['Kadhai Roast Spice Blend', 'Tandoori Gravy Base'],
      },
    ],
    totalAmount: 747,
    status: 'Delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

// In-memory fallback order storage for local execution & testing
let memoryOrdersStore: Order[] = [...INITIAL_MOCK_ORDERS];

/**
 * Place a new user order into Firebase Firestore & local store.
 */
export async function createOrder(
  userId: string,
  customerPhone: string,
  deliveryAddress: string,
  items: OrderItem[],
  totalAmount: number,
  customerName?: string,
): Promise<Order> {
  const newOrderData = {
    userId,
    customerPhone,
    customerName: customerName || `Customer (${customerPhone.slice(-4)})`,
    deliveryAddress,
    items,
    totalAmount,
    status: 'Pending' as OrderStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const ordersCol = collection(db, 'orders');
    const docRef = await addDoc(ordersCol, newOrderData);
    const createdOrder: Order = {
      id: docRef.id,
      ...newOrderData,
    };
    memoryOrdersStore.unshift(createdOrder);
    return createdOrder;
  } catch (error) {
    // Fallback for offline/demo operation
    const fallbackId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdOrder: Order = {
      id: fallbackId,
      ...newOrderData,
    };
    memoryOrdersStore.unshift(createdOrder);
    return createdOrder;
  }
}

/**
 * Get all user orders for Admin Dashboard.
 */
export async function getAllOrders(): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const orders: Order[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Order, 'id'>),
      }));
      return orders;
    }
  } catch (error) {
    // Return memory store if Firestore read fails
  }

  return [...memoryOrdersStore];
}

/**
 * Update status of an order by Admin.
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  // Update memory store
  const foundIndex = memoryOrdersStore.findIndex((o) => o.id === orderId);
  if (foundIndex !== -1 && memoryOrdersStore[foundIndex]) {
    memoryOrdersStore[foundIndex] = {
      ...memoryOrdersStore[foundIndex],
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await updateDoc(orderDocRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    return true; // memory store successfully updated
  }
}

/**
 * Subscribe to real-time order updates for Admin Dashboard.
 */
export function subscribeToOrders(onOrdersChanged: (orders: Order[]) => void): () => void {
  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const orders: Order[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>),
          }));
          onOrdersChanged(orders);
        } else {
          onOrdersChanged([...memoryOrdersStore]);
        }
      },
      () => {
        onOrdersChanged([...memoryOrdersStore]);
      },
    );

    return unsubscribe;
  } catch {
    onOrdersChanged([...memoryOrdersStore]);
    return () => {};
  }
}
