export interface Coupon {
  code: string;
  type: 'percentage' | 'flat' | 'free_delivery';
  discountValue: number; // e.g. 20 for 20%, 100 for ₹100
  maxDiscount?: number;
  minOrderValue: number;
  description: string;
  expiryDate: string;
  isActive: boolean;
}

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'RASOI100',
    type: 'flat',
    discountValue: 100,
    minOrderValue: 499,
    description: 'Flat ₹100 off on gourmet meal kits above ₹499',
    expiryDate: '2026-12-31',
    isActive: true,
  },
  {
    code: 'WELCOME50',
    type: 'percentage',
    discountValue: 50,
    maxDiscount: 150,
    minOrderValue: 299,
    description: '50% off on your first home-cooking box (up to ₹150)',
    expiryDate: '2026-12-31',
    isActive: true,
  },
  {
    code: 'FREEDEL',
    type: 'free_delivery',
    discountValue: 49,
    minOrderValue: 249,
    description: 'Free cold-chain delivery on orders above ₹249',
    expiryDate: '2026-12-31',
    isActive: true,
  },
  {
    code: 'FEAST150',
    type: 'flat',
    discountValue: 150,
    minOrderValue: 799,
    description: 'Flat ₹150 off on family feast boxes above ₹799',
    expiryDate: '2026-12-31',
    isActive: true,
  },
];

let couponsStore: Coupon[] = [...INITIAL_COUPONS];

export function getCoupons(): Coupon[] {
  return [...couponsStore];
}

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  freeDelivery: boolean;
  message: string;
}

export function validateCoupon(code: string, cartSubtotal: number): CouponValidationResult {
  const cleanCode = code.trim().toUpperCase();
  const coupon = couponsStore.find((c) => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    return {
      isValid: false,
      discountAmount: 0,
      freeDelivery: false,
      message: 'Invalid promo code. Please check and try again.',
    };
  }

  if (!coupon.isActive) {
    return {
      isValid: false,
      discountAmount: 0,
      freeDelivery: false,
      message: 'This coupon has expired or is inactive.',
    };
  }

  if (cartSubtotal < coupon.minOrderValue) {
    return {
      isValid: false,
      discountAmount: 0,
      freeDelivery: false,
      message: `Add ₹${coupon.minOrderValue - cartSubtotal} more to apply ${coupon.code}. Minimum order ₹${coupon.minOrderValue}.`,
    };
  }

  let discount = 0;
  let freeDel = false;

  if (coupon.type === 'flat') {
    discount = Math.min(coupon.discountValue, cartSubtotal);
  } else if (coupon.type === 'percentage') {
    const rawDiscount = (cartSubtotal * coupon.discountValue) / 100;
    discount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
  } else if (coupon.type === 'free_delivery') {
    freeDel = true;
    discount = 49; // standard delivery fee
  }

  return {
    isValid: true,
    coupon,
    discountAmount: Math.round(discount),
    freeDelivery: freeDel,
    message: `Coupon ${coupon.code} applied! Saved ₹${Math.round(discount)}.`,
  };
}

// Admin coupon management
export function addCoupon(newCoupon: Coupon): void {
  couponsStore = [newCoupon, ...couponsStore];
}

export function toggleCouponActive(code: string): void {
  couponsStore = couponsStore.map((c) =>
    c.code.toUpperCase() === code.toUpperCase() ? { ...c, isActive: !c.isActive } : c,
  );
}

export function deleteCoupon(code: string): void {
  couponsStore = couponsStore.filter((c) => c.code.toUpperCase() !== code.toUpperCase());
}
