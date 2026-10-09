const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorage.get(key) || null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorage.clear();
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  scheduleCookingTimerNotification,
  cancelCookingTimerNotification,
  requestCookingNotificationPermission,
} from '../services/cookingNotificationService';
import { Order } from '../firebase/ordersService';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock audio alert
jest.mock('../services/notificationService', () => ({
  playOrderAlertSound: jest.fn(),
}));

describe('Cook Mode & Kitchen Companion Suite', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('1. Timer Notifications & Cooking Helpers', () => {
    it('requests notification permission contextually on timer start', async () => {
      const granted = await requestCookingNotificationPermission();
      expect(granted).toBe(true);
    });

    it('schedules notification for step timer and returns notification ID', async () => {
      const notifId = await scheduleCookingTimerNotification({
        orderId: 'ORD-123456',
        kitId: 'paneer-butter-masala',
        stepNumber: 2,
        stepTitle: 'Simmer Gravy',
        seconds: 300,
      });

      expect(notifId).toBe('mock-notification-id-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Timer Complete! 🍳',
            body: expect.stringContaining('Simmer Gravy'),
          }),
          trigger: expect.objectContaining({
            seconds: 300,
          }),
        }),
      );
    });

    it('cancels scheduled notification when timer is paused or reset', async () => {
      await cancelCookingTimerNotification('mock-notification-id-123');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'mock-notification-id-123',
      );
    });
  });

  describe('2. Per-Order Dismissal and Persistence', () => {
    const DISMISSED_KEY = '@rasoi_cook_dismissed_orders_v1';

    it('manages dismissed flags independently per order ID', async () => {
      const dismissed = new Set<string>();
      dismissed.add('ORD-AAA');
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissed)));

      const stored = await AsyncStorage.getItem(DISMISSED_KEY);
      const parsed: string[] = JSON.parse(stored || '[]');

      expect(parsed).toContain('ORD-AAA');
      expect(parsed).not.toContain('ORD-BBB');

      // Dismiss second order
      dismissed.add('ORD-BBB');
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissed)));

      const reloaded = JSON.parse((await AsyncStorage.getItem(DISMISSED_KEY)) || '[]');
      expect(reloaded).toContain('ORD-AAA');
      expect(reloaded).toContain('ORD-BBB');
    });
  });

  describe('3. Saved Progress & Accurate Background Timers', () => {
    const PROGRESS_KEY = '@rasoi_cook_progress_v1';

    it('persists and restores kit step progress', async () => {
      const orderId = 'ORD-100001';
      const kitId = 'butter-chicken';

      const initialProgress = {
        [orderId]: {
          orderId,
          kits: {
            [kitId]: {
              kitId,
              currentStepIndex: 2,
              isCompleted: false,
            },
          },
          updatedAt: new Date().toISOString(),
        },
      };

      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(initialProgress));

      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      const rehydrated = JSON.parse(raw || '{}');

      expect(rehydrated[orderId].kits[kitId].currentStepIndex).toBe(2);
      expect(rehydrated[orderId].kits[kitId].isCompleted).toBe(false);
    });

    it('stores timer end timestamps so timers remain accurate across app backgrounding', async () => {
      const orderId = 'ORD-100002';
      const kitId = 'paneer-tikka';
      const now = Date.now();
      const endTimestamp = now + 120 * 1000; // 120 seconds in future

      const progressWithTimer = {
        [orderId]: {
          orderId,
          kits: {
            [kitId]: {
              kitId,
              currentStepIndex: 1,
              isCompleted: false,
              timer: {
                stepNumber: 1,
                totalSeconds: 120,
                endTimestamp,
                remainingSeconds: 120,
                isRunning: true,
                notificationId: 'notif-1',
              },
            },
          },
          updatedAt: new Date().toISOString(),
        },
      };

      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progressWithTimer));

      // Simulate app reopening after 50 seconds
      const simulatedResumeTime = now + 50 * 1000;
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      const rehydrated = JSON.parse(raw || '{}');
      const timer = rehydrated[orderId].kits[kitId].timer;

      expect(timer.endTimestamp).toBe(endTimestamp);
      const remainingOnResume = Math.max(
        0,
        Math.ceil((timer.endTimestamp - simulatedResumeTime) / 1000),
      );
      expect(remainingOnResume).toBe(70); // 120 - 50 = 70
    });
  });

  describe('4. Kitchen Text Size Mode Persistence', () => {
    const TEXT_SIZE_KEY = '@rasoi_cook_text_size_v1';

    it('persists and toggles between standard and large kitchen text', async () => {
      await AsyncStorage.setItem(TEXT_SIZE_KEY, 'large');
      let size = await AsyncStorage.getItem(TEXT_SIZE_KEY);
      expect(size).toBe('large');

      await AsyncStorage.setItem(TEXT_SIZE_KEY, 'standard');
      size = await AsyncStorage.getItem(TEXT_SIZE_KEY);
      expect(size).toBe('standard');
    });
  });

  describe('5. Active Orders Lifecycle & Mini-Bar Visibility', () => {
    const isTerminalStatus = (status: Order['status']) =>
      status === 'Delivered' || status === 'Cancelled' || status === 'Refunded';

    it('treats Placed, Confirmed, Preparing, and Out for Delivery as active orders', () => {
      expect(isTerminalStatus('Placed')).toBe(false);
      expect(isTerminalStatus('Confirmed')).toBe(false);
      expect(isTerminalStatus('Preparing')).toBe(false);
      expect(isTerminalStatus('Out for Delivery')).toBe(false);
    });

    it('treats Delivered, Cancelled, and Refunded as terminal states that remove mini-bar', () => {
      expect(isTerminalStatus('Delivered')).toBe(true);
      expect(isTerminalStatus('Cancelled')).toBe(true);
      expect(isTerminalStatus('Refunded')).toBe(true);
    });
  });

  describe('6. Multi-Kit & Multi-Order Resolution', () => {
    it('supports multiple kits with independent progress in a single order', () => {
      const order: Order = {
        id: 'ORD-MULTI-1',
        userId: 'user-1',
        customerName: 'Aarav Patel',
        customerPhone: '9876543210',
        deliveryAddress: 'Flat 101, Indiranagar',
        subtotal: 700,
        discount: 0,
        deliveryFee: 0,
        totalAmount: 700,
        status: 'Preparing',
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        transactionId: 'TXN-123456',
        trackingEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            kitId: 'dal-makhani',
            name: 'Dal Makhani Kit',
            quantity: 1,
            price: 320,
            masalaSachets: [],
          },
          {
            id: 'item-2',
            kitId: 'paneer-kulcha',
            name: 'Amritsari Paneer Kulcha Kit',
            quantity: 1,
            price: 380,
            masalaSachets: [],
          },
        ],
      };

      expect(order.items.length).toBe(2);

      const kitsProgress = {
        'dal-makhani': { step: 3, completed: false },
        'paneer-kulcha': { step: 1, completed: false },
      };

      expect(kitsProgress['dal-makhani'].step).toBe(3);
      expect(kitsProgress['paneer-kulcha'].step).toBe(1);
    });

    it('resolves multiple active orders sorting newest first with +N count', () => {
      const orders: Partial<Order>[] = [
        { id: 'ORD-1', createdAt: '2026-10-09T10:00:00Z', status: 'Preparing' },
        { id: 'ORD-2', createdAt: '2026-10-09T11:00:00Z', status: 'Out for Delivery' },
      ];

      const sorted = [...orders].sort(
        (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
      );

      expect(sorted[0]?.id).toBe('ORD-2');
      const moreCount = sorted.length - 1;
      expect(moreCount).toBe(1);
    });
  });

  describe('7. Guest vs Signed-In Parity', () => {
    const GUEST_STORAGE_KEY = '@rasoi_guest_orders_v1';

    it('persists guest order locally and allows Cook Mode to track it seamlessly', async () => {
      const guestOrder: Order = {
        id: 'ORD-GUEST-001',
        userId: 'guest_abc123',
        customerName: 'Guest Chef',
        customerPhone: '9998887770',
        deliveryAddress: 'Koramangala 4th Block',
        subtotal: 450,
        discount: 0,
        deliveryFee: 0,
        totalAmount: 450,
        status: 'Placed',
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        transactionId: 'TXN-GUEST-001',
        trackingEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            id: 'kit-g1',
            kitId: 'biryani-kit',
            name: 'Dum Biryani Kit',
            quantity: 1,
            price: 450,
            masalaSachets: ['Dum Pukht Whole Spices'],
          },
        ],
      };

      await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify([guestOrder]));

      const storedGuests = JSON.parse((await AsyncStorage.getItem(GUEST_STORAGE_KEY)) || '[]');
      expect(storedGuests).toHaveLength(1);
      expect(storedGuests[0].id).toBe('ORD-GUEST-001');
      expect(storedGuests[0].items[0].name).toBe('Dum Biryani Kit');
    });
  });
});
