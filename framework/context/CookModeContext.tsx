import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus } from '../firebase/ordersService';
import {
  fetchAllOrdersFromSupabase,
  subscribeToOrdersRealtime,
} from '../services/supabaseOrdersService';
import { getGuestOrders } from '../services/guestService';
import { useAuth } from './AuthContext';
import {
  scheduleCookingTimerNotification,
  cancelCookingTimerNotification,
  notifyTimerFinishedInForeground,
} from '../services/cookingNotificationService';

export type CookTextSize = 'standard' | 'large';

export interface CookingTimerState {
  stepNumber: number;
  stepTitle?: string;
  totalSeconds: number;
  endTimestamp: number | null; // epoch ms when timer will finish, null if paused
  remainingSeconds: number;
  isRunning: boolean;
  notificationId?: string | null;
}

export interface KitCookingProgress {
  kitId: string;
  currentStepIndex: number;
  isCompleted?: boolean;
  timer?: CookingTimerState | null;
}

export interface OrderProgressRecord {
  orderId: string;
  selectedKitId?: string;
  kits: Record<string, KitCookingProgress>;
  updatedAt: string;
}

interface CookModeContextType {
  activeOrders: Order[];
  isLoadingOrders: boolean;
  dismissedOrderIds: Set<string>;
  isOrderDismissed: (orderId: string) => boolean;
  dismissCookMode: (orderId: string) => Promise<void>;
  undismissCookMode: (orderId: string) => Promise<void>;
  textSize: CookTextSize;
  toggleTextSize: () => Promise<void>;
  getProgressForOrderKit: (orderId: string, kitId: string) => KitCookingProgress;
  setKitStep: (orderId: string, kitId: string, stepIndex: number) => Promise<void>;
  markKitCompleted: (orderId: string, kitId: string) => Promise<void>;
  startTimer: (
    orderId: string,
    kitId: string,
    stepNumber: number,
    totalSeconds: number,
    stepTitle?: string,
  ) => Promise<void>;
  pauseTimer: (orderId: string, kitId: string) => Promise<void>;
  resetTimer: (orderId: string, kitId: string, totalSeconds: number) => Promise<void>;
  registerNewActiveOrder: (order: Order) => void;
  activeOrderWithTimer: { order: Order; kitId: string; timer: CookingTimerState } | null;
  refreshOrders: () => Promise<void>;
}

const CookModeContext = createContext<CookModeContextType | null>(null);

const STORAGE_KEYS = {
  DISMISSED_ORDERS: '@rasoi_cook_dismissed_orders_v1',
  PROGRESS: '@rasoi_cook_progress_v1',
  TEXT_SIZE: '@rasoi_cook_text_size_v1',
};

const TERMINAL_STATUSES: Set<OrderStatus> = new Set(['Delivered', 'Cancelled', 'Refunded']);

export const CookModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [guestLocalOrders, setGuestLocalOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, OrderProgressRecord>>({});
  const [textSize, setTextSize] = useState<CookTextSize>('standard');

  const progressRef = useRef(progressMap);
  progressRef.current = progressMap;

  // 1. Rehydrate settings, dismissed IDs, and progress from AsyncStorage
  useEffect(() => {
    let isMounted = true;

    async function rehydrate() {
      try {
        const [savedDismissed, savedProgress, savedTextSize] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_ORDERS),
          AsyncStorage.getItem(STORAGE_KEYS.PROGRESS),
          AsyncStorage.getItem(STORAGE_KEYS.TEXT_SIZE),
        ]);

        if (!isMounted) return;

        if (savedDismissed) {
          try {
            const parsed = JSON.parse(savedDismissed);
            if (Array.isArray(parsed)) {
              setDismissedOrderIds(new Set(parsed));
            }
          } catch {}
        }

        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            if (parsed && typeof parsed === 'object') {
              // Normalize timers based on endTimestamp across rehydration/backgrounding
              const now = Date.now();
              Object.keys(parsed).forEach((ordId) => {
                const orderRecord = parsed[ordId];
                if (orderRecord?.kits) {
                  Object.keys(orderRecord.kits).forEach((kitId) => {
                    const kitProg = orderRecord.kits[kitId];
                    if (kitProg?.timer) {
                      const t = kitProg.timer;
                      if (t.isRunning && t.endTimestamp) {
                        const rem = Math.max(0, Math.ceil((t.endTimestamp - now) / 1000));
                        t.remainingSeconds = rem;
                        if (rem === 0) {
                          t.isRunning = false;
                          t.endTimestamp = null;
                        }
                      }
                    }
                  });
                }
              });
              setProgressMap(parsed);
            }
          } catch {}
        }

        if (savedTextSize === 'large' || savedTextSize === 'standard') {
          setTextSize(savedTextSize);
        }
      } catch (err) {
        console.warn('[CookModeContext] Failed to rehydrate:', err);
      }
    }

    rehydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch orders and subscribe to realtime updates
  const loadOrders = useCallback(async () => {
    try {
      const [remoteOrders, localGuest] = await Promise.all([
        fetchAllOrdersFromSupabase(),
        getGuestOrders(),
      ]);
      setAllOrders(remoteOrders || []);
      setGuestLocalOrders(localGuest || []);
    } catch (err) {
      console.warn('[CookModeContext] Error loading orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeToOrdersRealtime(() => {
      loadOrders();
    });
    return () => {
      unsubscribe();
    };
  }, [loadOrders]);

  // 3. Compute active orders for current user (or guest)
  const activeOrders = useMemo(() => {
    const cleanOrders = allOrders.filter(
      (o) => !TERMINAL_STATUSES.has(o.status) && o.id && o.id.startsWith('ORD-'),
    );

    if (!user) {
      // Guest: merge local orders with remote updates
      const guestMap = new Map<string, Order>();
      for (const g of guestLocalOrders) {
        if (!TERMINAL_STATUSES.has(g.status)) {
          guestMap.set(g.id, g);
        }
      }
      for (const r of cleanOrders) {
        if (guestMap.has(r.id)) {
          guestMap.set(r.id, { ...guestMap.get(r.id)!, ...r });
        }
      }
      return Array.from(guestMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const filtered = cleanOrders.filter(
      (o) =>
        o.userId === user.uid ||
        (user.phoneNumber &&
          o.customerPhone &&
          o.customerPhone
            .replace(/\D/g, '')
            .endsWith(user.phoneNumber.replace(/\D/g, '').slice(-10))) ||
        (user.email &&
          o.customerEmail &&
          o.customerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
        o.userId.startsWith('guest_user_'),
    );

    // Sort newest first
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allOrders, guestLocalOrders, user]);

  // 4. Timer interval tick for active running timers
  useEffect(() => {
    const interval = setInterval(() => {
      const current = progressRef.current;
      let hasRunning = false;
      const now = Date.now();
      const updated = { ...current };
      let changed = false;

      Object.keys(updated).forEach((ordId) => {
        const orderRec = updated[ordId];
        if (!orderRec?.kits) return;

        Object.keys(orderRec.kits).forEach((kId) => {
          const kit = orderRec.kits[kId];
          const t = kit?.timer;
          if (t && t.isRunning && t.endTimestamp) {
            hasRunning = true;
            const remaining = Math.max(0, Math.ceil((t.endTimestamp - now) / 1000));
            if (remaining !== t.remainingSeconds) {
              changed = true;
              t.remainingSeconds = remaining;
            }

            if (remaining === 0) {
              // Timer just finished!
              changed = true;
              t.isRunning = false;
              t.endTimestamp = null;
              notifyTimerFinishedInForeground(t.stepNumber, t.stepTitle || 'Step');
            }
          }
        });
      });

      if (changed) {
        setProgressMap({ ...updated });
      }

      if (!hasRunning) {
        // No active running timer
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save progress helper
  const persistProgress = useCallback(async (newProgress: Record<string, OrderProgressRecord>) => {
    setProgressMap(newProgress);
    progressRef.current = newProgress;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress));
    } catch (err) {
      console.warn('[CookModeContext] Failed to persist progress:', err);
    }
  }, []);

  // Dismiss operations
  const dismissCookMode = useCallback(async (orderId: string) => {
    setDismissedOrderIds((prev) => {
      const next = new Set(prev).add(orderId);
      AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_ORDERS, JSON.stringify(Array.from(next))).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const undismissCookMode = useCallback(async (orderId: string) => {
    setDismissedOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_ORDERS, JSON.stringify(Array.from(next))).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const isOrderDismissed = useCallback(
    (orderId: string) => {
      return dismissedOrderIds.has(orderId);
    },
    [dismissedOrderIds],
  );

  // Text size toggle
  const toggleTextSize = useCallback(async () => {
    const nextSize: CookTextSize = textSize === 'standard' ? 'large' : 'standard';
    setTextSize(nextSize);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TEXT_SIZE, nextSize);
    } catch {}
  }, [textSize]);

  // Read progress for order kit
  const getProgressForOrderKit = useCallback(
    (orderId: string, kitId: string): KitCookingProgress => {
      const orderRecord = progressMap[orderId];
      if (orderRecord?.kits && orderRecord.kits[kitId]) {
        return orderRecord.kits[kitId];
      }
      return {
        kitId,
        currentStepIndex: 0,
        isCompleted: false,
        timer: null,
      };
    },
    [progressMap],
  );

  // Set step index
  const setKitStep = useCallback(
    async (orderId: string, kitId: string, stepIndex: number) => {
      const current = { ...progressRef.current };
      const orderRec = current[orderId] || {
        orderId,
        kits: {},
        updatedAt: new Date().toISOString(),
      };
      const kitRec = orderRec.kits[kitId] || {
        kitId,
        currentStepIndex: 0,
        isCompleted: false,
      };

      orderRec.kits[kitId] = {
        ...kitRec,
        currentStepIndex: Math.max(0, stepIndex),
      };
      orderRec.updatedAt = new Date().toISOString();
      current[orderId] = orderRec;

      await persistProgress(current);
    },
    [persistProgress],
  );

  // Mark kit recipe completed
  const markKitCompleted = useCallback(
    async (orderId: string, kitId: string) => {
      const current = { ...progressRef.current };
      const orderRec = current[orderId] || {
        orderId,
        kits: {},
        updatedAt: new Date().toISOString(),
      };
      const kitRec = orderRec.kits[kitId] || {
        kitId,
        currentStepIndex: 0,
        isCompleted: false,
      };

      orderRec.kits[kitId] = {
        ...kitRec,
        isCompleted: true,
      };
      orderRec.updatedAt = new Date().toISOString();
      current[orderId] = orderRec;

      await persistProgress(current);
    },
    [persistProgress],
  );

  // Start timer
  const startTimer = useCallback(
    async (
      orderId: string,
      kitId: string,
      stepNumber: number,
      totalSeconds: number,
      stepTitle?: string,
    ) => {
      const current = { ...progressRef.current };
      const orderRec = current[orderId] || {
        orderId,
        kits: {},
        updatedAt: new Date().toISOString(),
      };
      const existingKit = orderRec.kits[kitId];
      const existingTimer = existingKit?.timer;

      const durationToRun =
        existingTimer &&
        existingTimer.stepNumber === stepNumber &&
        existingTimer.remainingSeconds > 0
          ? existingTimer.remainingSeconds
          : totalSeconds;

      const notifId = await scheduleCookingTimerNotification({
        orderId,
        kitId,
        stepNumber,
        stepTitle: stepTitle || `Step ${stepNumber}`,
        seconds: durationToRun,
      });

      const now = Date.now();
      const endTimestamp = now + durationToRun * 1000;

      const newTimer: CookingTimerState = {
        stepNumber,
        stepTitle,
        totalSeconds,
        endTimestamp,
        remainingSeconds: durationToRun,
        isRunning: true,
        notificationId: notifId,
      };

      orderRec.kits[kitId] = {
        ...(existingKit || { kitId, currentStepIndex: 0 }),
        timer: newTimer,
      };
      orderRec.updatedAt = new Date().toISOString();
      current[orderId] = orderRec;

      await persistProgress(current);
    },
    [persistProgress],
  );

  // Pause timer
  const pauseTimer = useCallback(
    async (orderId: string, kitId: string) => {
      const current = { ...progressRef.current };
      const orderRec = current[orderId];
      if (!orderRec) return;
      const kit = orderRec.kits?.[kitId];
      const t = kit?.timer;
      if (!t || !t.isRunning) return;

      await cancelCookingTimerNotification(t.notificationId);

      const now = Date.now();
      const remaining = t.endTimestamp
        ? Math.max(0, Math.ceil((t.endTimestamp - now) / 1000))
        : t.remainingSeconds;

      t.remainingSeconds = remaining;
      t.isRunning = false;
      t.endTimestamp = null;
      t.notificationId = null;

      orderRec.updatedAt = new Date().toISOString();
      current[orderId] = orderRec;
      await persistProgress(current);
    },
    [persistProgress],
  );

  // Reset timer
  const resetTimer = useCallback(
    async (orderId: string, kitId: string, totalSeconds: number) => {
      const current = { ...progressRef.current };
      const orderRec = current[orderId];
      if (!orderRec) return;
      const kit = orderRec.kits?.[kitId];
      const t = kit?.timer;
      if (t) {
        await cancelCookingTimerNotification(t.notificationId);
      }

      if (kit) {
        kit.timer = {
          stepNumber: kit.timer?.stepNumber || 1,
          stepTitle: kit.timer?.stepTitle,
          totalSeconds,
          remainingSeconds: totalSeconds,
          endTimestamp: null,
          isRunning: false,
          notificationId: null,
        };
        orderRec.updatedAt = new Date().toISOString();
        current[orderId] = orderRec;
        await persistProgress(current);
      }
    },
    [persistProgress],
  );

  // Register newly placed order immediately
  const registerNewActiveOrder = useCallback((order: Order) => {
    setAllOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    // Make sure it is not marked dismissed
    setDismissedOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(order.id);
      AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_ORDERS, JSON.stringify(Array.from(next))).catch(
        () => {},
      );
      return next;
    });
  }, []);

  // Find any active order with a running timer for mini-bar display
  const activeOrderWithTimer = useMemo(() => {
    for (const order of activeOrders) {
      const orderRec = progressMap[order.id];
      if (!orderRec?.kits) continue;
      for (const kitId of Object.keys(orderRec.kits)) {
        const kit = orderRec.kits[kitId];
        if (kit?.timer?.isRunning) {
          return {
            order,
            kitId,
            timer: kit.timer,
          };
        }
      }
    }
    return null;
  }, [activeOrders, progressMap]);

  return (
    <CookModeContext.Provider
      value={{
        activeOrders,
        isLoadingOrders,
        dismissedOrderIds,
        isOrderDismissed,
        dismissCookMode,
        undismissCookMode,
        textSize,
        toggleTextSize,
        getProgressForOrderKit,
        setKitStep,
        markKitCompleted,
        startTimer,
        pauseTimer,
        resetTimer,
        registerNewActiveOrder,
        activeOrderWithTimer,
        refreshOrders: loadOrders,
      }}
    >
      {children}
    </CookModeContext.Provider>
  );
};

export const useCookMode = (): CookModeContextType => {
  const context = useContext(CookModeContext);
  if (!context) {
    throw new Error('useCookMode must be used within a CookModeProvider');
  }
  return context;
};
