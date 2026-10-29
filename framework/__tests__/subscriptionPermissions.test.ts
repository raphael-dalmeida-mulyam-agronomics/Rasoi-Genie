import { can } from '../family/permissions';
import { checkDietaryConflict } from '../family/dietaryConflicts';
import { FamilyMember } from '../services/familyService';
import { MealKit } from '../services/mealKitsService';

describe('Family Subscription Owner-Only Permissions & Dietary Conflict Tests', () => {
  describe('can(role, manage_family_subscription)', () => {
    it('allows family OWNER to manage weekly subscription', () => {
      expect(can('owner', 'manage_family_subscription')).toBe(true);
    });

    it('DENIES co-owner from managing family subscription', () => {
      expect(can('co_owner', 'manage_family_subscription')).toBe(false);
    });

    it('DENIES regular adult member from managing family subscription', () => {
      expect(can('member', 'manage_family_subscription')).toBe(false);
    });

    it('DENIES child and senior dependents from managing family subscription', () => {
      expect(can('dependent', 'manage_family_subscription')).toBe(false);
    });

    it('DENIES unauthenticated / null role users', () => {
      expect(can(null, 'manage_family_subscription')).toBe(false);
      expect(can(undefined, 'manage_family_subscription')).toBe(false);
    });
  });

  describe('checkDietaryConflict (pure evaluator)', () => {
    const mockMember: FamilyMember = {
      family_id: 'fam_1',
      user_id: 'mem_1',
      role: 'member',
      display_name: 'Vegetarian Priya',
      joined_at: new Date().toISOString(),
      preferences: {
        dietTypes: ['veg'],
        allergies: ['Peanuts', 'Dairy'],
        spiceTolerance: 'Mild',
      },
    };

    it('detects allergen conflict', () => {
      const kitWithDairy: Partial<MealKit> = {
        name: 'Paneer Butter Masala',
        diet: 'veg',
        allergens: ['Dairy (Butter & Cream)'],
        spiceLevel: 'Mild',
      };

      const result = checkDietaryConflict(mockMember, kitWithDairy as MealKit);
      expect(result.hasConflict).toBe(true);
      expect(result.reasons[0]).toContain('Dairy');
    });

    it('detects diet conflict (nonveg assigned to veg)', () => {
      const nonVegKit: Partial<MealKit> = {
        name: 'Butter Chicken Kit',
        diet: 'nonveg',
        allergens: [],
        spiceLevel: 'Mild',
      };

      const result = checkDietaryConflict(mockMember, nonVegKit as MealKit);
      expect(result.hasConflict).toBe(true);
      expect(result.reasons[0]).toContain('Non-vegetarian dish assigned to vegetarian member');
    });

    it('detects spice level conflict for mild spice tolerance', () => {
      const spicyVegKit: Partial<MealKit> = {
        name: 'Spicy Chana Masala',
        diet: 'veg',
        allergens: [],
        spiceLevel: 'Spicy',
      };

      const result = checkDietaryConflict(mockMember, spicyVegKit as MealKit);
      expect(result.hasConflict).toBe(true);
      expect(result.reasons[0]).toContain('Spicy spice level exceeds mild spice preference');
    });

    it('returns hasConflict: false when no allergens or diet conflicts exist', () => {
      const safeKit: Partial<MealKit> = {
        name: 'Mild Baingan Bharta',
        diet: 'veg',
        allergens: [],
        spiceLevel: 'Mild',
      };

      const result = checkDietaryConflict(mockMember, safeKit as MealKit);
      expect(result.hasConflict).toBe(false);
      expect(result.reasons).toEqual([]);
    });
  });
});
