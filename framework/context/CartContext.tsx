import React, { createContext, useContext, useState, useMemo } from 'react';
import { MealKit } from '../services/mealKitsService';
import { validateCoupon, Coupon } from '../services/couponsService';
import { OrderItem } from '../firebase/ordersService';

export interface CartItem {
  kit: MealKit;
  quantity: number;
  servings: number;
  spiceLevel?: string;
  unitPrice?: number;
}

export type PaymentMethod = 'UPI' | 'Card' | 'Wallet' | 'Cash on Delivery';

export interface CartContextValue {
  items: CartItem[];
  addItem: (kit: MealKit, quantity?: number, servings?: number, spiceLevel?: string) => void;
  updateQuantity: (kitId: string, quantity: number, servings?: number, spiceLevel?: string) => void;
  removeItem: (kitId: string, servings?: number, spiceLevel?: string) => void;
  clearCart: () => void;
  reorderItems: (orderItems: OrderItem[]) => void;

  // Coupons
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  couponMessage: string | null;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;

  // Delivery & Payment choices
  selectedSlot: string;
  setSelectedSlot: (slot: string) => void;
  selectedDeliveryDate: string;
  setSelectedDeliveryDate: (date: string) => void;
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (method: PaymentMethod) => void;

  // Financial calculations
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<string>('6:00 PM - 8:00 PM (Dinner)');
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string>('Today');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');

  const addItem = (
    kit: MealKit,
    quantity = 1,
    servings = kit.servings || 2,
    spiceLevel: string = kit.spiceLevel || 'Medium',
  ) => {
    const baseServings = kit.servings || 2;
    const unitPrice = Math.round((kit.price / baseServings) * servings);

    setItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.kit.id === kit.id &&
          item.servings === servings &&
          (item.spiceLevel || kit.spiceLevel) === spiceLevel,
      );
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...prev, { kit, quantity, servings, spiceLevel, unitPrice }];
    });
  };

  const updateQuantity = (
    kitId: string,
    quantity: number,
    servings?: number,
    spiceLevel?: string,
  ) => {
    if (quantity <= 0) {
      removeItem(kitId, servings, spiceLevel);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const matches =
          item.kit.id === kitId &&
          (servings === undefined || item.servings === servings) &&
          (spiceLevel === undefined || item.spiceLevel === spiceLevel);
        return matches ? { ...item, quantity } : item;
      }),
    );
  };

  const removeItem = (kitId: string, servings?: number, spiceLevel?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        if (item.kit.id !== kitId) return true;
        if (servings !== undefined && item.servings !== servings) return true;
        if (spiceLevel !== undefined && item.spiceLevel !== spiceLevel) return true;
        return false;
      }),
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponMessage(null);
  };

  const reorderItems = (orderItems: OrderItem[]) => {
    // Dynamically rebuild cart from order items
    // If kits are available, add them
    import('../services/mealKitsService').then(({ getMealKitById, getMealKits }) => {
      const allKits = getMealKits();
      const newCartItems: CartItem[] = [];

      orderItems.forEach((orderItem) => {
        const kit = getMealKitById(orderItem.id) || allKits.find((k) => k.name === orderItem.name);
        if (kit) {
          const s = (orderItem as any).servings || kit.servings || 2;
          const sp = (orderItem as any).spiceLevel || kit.spiceLevel || 'Medium';
          const up = Math.round((kit.price / (kit.servings || 2)) * s);
          newCartItems.push({
            kit,
            quantity: orderItem.quantity,
            servings: s,
            spiceLevel: sp,
            unitPrice: up,
          });
        }
      });

      if (newCartItems.length > 0) {
        setItems(newCartItems);
      }
    });
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitPrice ?? item.kit.price) * item.quantity, 0);
  }, [items]);

  const deliveryFee = useMemo(() => {
    if (subtotal === 0) return 0;
    if (appliedCoupon?.type === 'free_delivery') return 0;
    return subtotal >= 499 ? 0 : 49;
  }, [subtotal, appliedCoupon]);

  const discount = useMemo(() => {
    if (!appliedCoupon || subtotal === 0) return 0;
    const result = validateCoupon(appliedCoupon.code, subtotal);
    return result.isValid ? result.discountAmount : 0;
  }, [subtotal, appliedCoupon]);

  const total = useMemo(() => {
    const rawTotal = subtotal - discount + deliveryFee;
    return Math.max(0, rawTotal);
  }, [subtotal, discount, deliveryFee]);

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const applyCouponCode = (code: string) => {
    const result = validateCoupon(code, subtotal);
    if (result.isValid && result.coupon) {
      setAppliedCoupon(result.coupon);
      setCouponDiscount(result.discountAmount);
      setCouponMessage(result.message);
      return { success: true, message: result.message };
    } else {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponMessage(result.message);
      return { success: false, message: result.message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponMessage(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        reorderItems,
        appliedCoupon,
        couponDiscount,
        couponMessage,
        applyCouponCode,
        removeCoupon,
        selectedSlot,
        setSelectedSlot,
        selectedDeliveryDate,
        setSelectedDeliveryDate,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        subtotal,
        discount,
        deliveryFee,
        total,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
