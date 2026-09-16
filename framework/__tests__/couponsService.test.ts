import {
  validateCoupon,
  getCoupons,
  addCoupon,
  toggleCouponActive,
} from '../services/couponsService';

describe('couponsService', () => {
  it('validates flat discount coupon RASOI100 with minimum order requirement', () => {
    // Under minimum order ₹499
    const underMin = validateCoupon('RASOI100', 300);
    expect(underMin.isValid).toBe(false);
    expect(underMin.discountAmount).toBe(0);

    // Meets minimum order ₹499
    const valid = validateCoupon('RASOI100', 550);
    expect(valid.isValid).toBe(true);
    expect(valid.discountAmount).toBe(100);
    expect(valid.coupon?.code).toBe('RASOI100');
  });

  it('validates free delivery coupon FREEDEL', () => {
    const res = validateCoupon('FREEDEL', 350);
    expect(res.isValid).toBe(true);
    expect(res.freeDelivery).toBe(true);
  });

  it('rejects nonexistent coupon codes', () => {
    const res = validateCoupon('NONEXISTENT_CODE_123', 500);
    expect(res.isValid).toBe(false);
    expect(res.discountAmount).toBe(0);
  });

  it('allows adding and toggling coupon state', () => {
    addCoupon({
      code: 'TEST20',
      type: 'percentage',
      discountValue: 20,
      minOrderValue: 200,
      description: '20% off test coupon',
      expiryDate: '2026-12-31',
      isActive: true,
    });

    const validBefore = validateCoupon('TEST20', 300);
    expect(validBefore.isValid).toBe(true);
    expect(validBefore.discountAmount).toBe(60);

    // Toggle inactive
    toggleCouponActive('TEST20');
    const invalidAfter = validateCoupon('TEST20', 300);
    expect(invalidAfter.isValid).toBe(false);
  });
});
