import {
  calculateSubscriptionTotal,
  calculateProratedAdjustment,
} from '../services/subscriptionPlans';

describe('Weekly Meal Subscription Pricing Tests', () => {
  describe('calculateSubscriptionTotal (pure function)', () => {
    it('calculates total for an individual subscriber', () => {
      const result = calculateSubscriptionTotal({
        pricePerMemberPerWeek: 1299,
        memberCount: 1,
      });

      expect(result.pricePerMemberPerWeek).toBe(1299);
      expect(result.memberCount).toBe(1);
      expect(result.subtotal).toBe(1299);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(1299);
    });

    it('calculates total for multiple covered family members (total = rate * members)', () => {
      const result = calculateSubscriptionTotal({
        pricePerMemberPerWeek: 1299,
        memberCount: 4,
      });

      expect(result.memberCount).toBe(4);
      expect(result.subtotal).toBe(5196);
      expect(result.total).toBe(5196);
    });

    it('handles 0 members gracefully', () => {
      const result = calculateSubscriptionTotal({
        pricePerMemberPerWeek: 1299,
        memberCount: 0,
      });

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it('applies promotional discount capped at subtotal', () => {
      const withDiscount = calculateSubscriptionTotal({
        pricePerMemberPerWeek: 1000,
        memberCount: 2,
        discount: 300,
      });
      expect(withDiscount.subtotal).toBe(2000);
      expect(withDiscount.discount).toBe(300);
      expect(withDiscount.total).toBe(1700);

      // Discount exceeds total
      const capped = calculateSubscriptionTotal({
        pricePerMemberPerWeek: 500,
        memberCount: 1,
        discount: 800,
      });
      expect(capped.discount).toBe(500);
      expect(capped.total).toBe(0);
    });
  });

  describe('calculateProratedAdjustment (member additions & removals)', () => {
    it('calculates prorated upfront charge when adding members mid-period', () => {
      // Adding 1 member with 4 days remaining out of 7
      const adjustment = calculateProratedAdjustment({
        currentMemberCount: 2,
        newMemberCount: 3,
        pricePerMemberPerWeek: 1400, // 200/day
        daysRemainingInPeriod: 4,
      });

      expect(adjustment.memberDelta).toBe(1);
      expect(adjustment.daysRemaining).toBe(4);
      expect(adjustment.dailyRatePerMember).toBe(200);
      expect(adjustment.immediatePayableAmount).toBe(800); // 1 * 200 * 4
      expect(adjustment.nextPeriodTotal).toBe(4200); // 3 * 1400
    });

    it('handles member removal by applying reduction to next period renewal', () => {
      // Removing 1 member mid-week
      const adjustment = calculateProratedAdjustment({
        currentMemberCount: 3,
        newMemberCount: 2,
        pricePerMemberPerWeek: 1299,
        daysRemainingInPeriod: 3,
      });

      expect(adjustment.memberDelta).toBe(-1);
      expect(adjustment.immediatePayableAmount).toBe(0); // No mid-week charge
      expect(adjustment.refundCreditAmount).toBe(0); // Standard policy: takes effect next cycle
      expect(adjustment.nextPeriodTotal).toBe(2598); // 2 * 1299
    });

    it('returns 0 immediate charge when 0 days remaining', () => {
      const adjustment = calculateProratedAdjustment({
        currentMemberCount: 1,
        newMemberCount: 2,
        pricePerMemberPerWeek: 1299,
        daysRemainingInPeriod: 0,
      });

      expect(adjustment.immediatePayableAmount).toBe(0);
      expect(adjustment.nextPeriodTotal).toBe(2598);
    });
  });
});
