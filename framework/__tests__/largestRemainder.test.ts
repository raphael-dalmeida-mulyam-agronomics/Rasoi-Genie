import { allocateSharedAmountLargestRemainder } from '../services/familyService';
import { computeMemberBreakdown, FamilyCartItem } from '../services/familyCartService';

describe('Largest Remainder Allocation (Hare-Niemeyer Method)', () => {
  it('allocates shared amount exactly with zero remainder error', () => {
    // 100 paise split 3 ways equally: 33 + 33 + 34 = 100
    const res = allocateSharedAmountLargestRemainder(100, [1, 1, 1]);
    expect(res.reduce((sum, v) => sum + v, 0)).toBe(100);
    expect(res).toEqual([34, 33, 33]);
  });

  it('allocates proportional to subtotal weights with exact paise matching', () => {
    // Subtotals: ₹250, ₹150, ₹100 (total ₹500 = 50,000 paise)
    // Shared delivery fee of ₹49.00 = 4,900 paise
    const feePaise = 4900;
    const weights = [25000, 15000, 10000]; // 50%, 30%, 20%
    const allocated = allocateSharedAmountLargestRemainder(feePaise, weights);

    expect(allocated.reduce((sum, v) => sum + v, 0)).toBe(feePaise);
    expect(allocated[0]).toBe(2450); // 50% of 4900 = 2450
    expect(allocated[1]).toBe(1470); // 30% of 4900 = 1470
    expect(allocated[2]).toBe(980); // 20% of 4900 = 980
  });

  it('handles arbitrary fractional remainders without losing or gaining a paisa', () => {
    // 1000 paise split among 7 members
    const totalPaise = 1000;
    const weights = [14, 28, 42, 57, 71, 85, 99];
    const allocated = allocateSharedAmountLargestRemainder(totalPaise, weights);

    const sum = allocated.reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalPaise);
  });

  it('handles zero total amount gracefully', () => {
    const allocated = allocateSharedAmountLargestRemainder(0, [100, 200, 300]);
    expect(allocated).toEqual([0, 0, 0]);
  });

  it('handles empty weights list', () => {
    const allocated = allocateSharedAmountLargestRemainder(500, []);
    expect(allocated).toEqual([]);
  });

  describe('computeMemberBreakdown', () => {
    it('groups approved items per member and calculates allocated totals correctly', () => {
      const items: FamilyCartItem[] = [
        {
          id: 'item_1',
          family_id: 'fam_1',
          added_by: 'user_aarav',
          kit_id: 'paneer_butter_masala',
          quantity: 1,
          servings: 2,
          unit_price: 300,
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'item_2',
          family_id: 'fam_1',
          added_by: 'user_priya',
          kit_id: 'dal_makhani',
          quantity: 2,
          servings: 2,
          unit_price: 200,
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'item_3',
          family_id: 'fam_1',
          added_by: 'user_kid',
          kit_id: 'gulab_jamun',
          quantity: 1,
          servings: 2,
          unit_price: 150,
          status: 'pending_approval', // Should be excluded from financial breakdown
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const names = {
        user_aarav: 'Aarav',
        user_priya: 'Priya',
        user_kid: 'Golu',
      };

      // ₹300 (Aarav) + ₹400 (Priya) = ₹700 subtotal
      // ₹50 shared delivery fee, ₹100 shared discount
      const breakdown = computeMemberBreakdown(items, names, 50, 100);

      expect(breakdown.length).toBe(2);

      const aarav = breakdown.find((b) => b.userId === 'user_aarav')!;
      const priya = breakdown.find((b) => b.userId === 'user_priya')!;

      expect(aarav.subtotal).toBe(300);
      expect(priya.subtotal).toBe(400);

      // Verify that total fees and discounts match exact inputs
      const totalFeeAllocated = aarav.allocatedFee + priya.allocatedFee;
      const totalDiscountAllocated = aarav.allocatedDiscount + priya.allocatedDiscount;

      expect(totalFeeAllocated).toBeCloseTo(50, 2);
      expect(totalDiscountAllocated).toBeCloseTo(100, 2);
    });
  });
});
