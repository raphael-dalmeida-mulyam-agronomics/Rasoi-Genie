import { FamilyMember } from '../services/familyService';
import { MealKit } from '../services/mealKitsService';

export interface DietaryConflictResult {
  hasConflict: boolean;
  reasons: string[];
}

/**
 * Pure evaluator: checks whether a meal kit conflicts with a family member or dependent's
 * dietary preferences, allergies, or spice tolerance.
 */
export function checkDietaryConflict(
  member: FamilyMember | null | undefined,
  kit: MealKit | null | undefined,
): DietaryConflictResult {
  if (!member || !kit) {
    return { hasConflict: false, reasons: [] };
  }

  const reasons: string[] = [];
  const prefs = member.preferences || {};

  // 1. Allergies Check
  const allergies: string[] = prefs.allergies || [];
  if (allergies.length > 0 && kit.allergens && kit.allergens.length > 0) {
    const kitAllergensLower = kit.allergens.map((a) => a.toLowerCase().trim());
    for (const allergy of allergies) {
      const aLower = allergy.toLowerCase().trim();
      const matched = kitAllergensLower.find((ka) => ka.includes(aLower) || aLower.includes(ka));
      if (matched) {
        reasons.push(`Contains ${matched} (${allergy} allergy)`);
      }
    }
  }

  // 2. Diet Type Check
  const dietTypes: string[] = prefs.dietTypes || [];
  if (dietTypes.length > 0) {
    const isVegOnly = dietTypes.includes('veg') && !dietTypes.includes('nonveg');
    const isVeganOnly = dietTypes.includes('vegan');
    const isJainOnly = dietTypes.includes('jain');

    if (isVegOnly && kit.diet === 'nonveg') {
      reasons.push('Non-vegetarian dish assigned to vegetarian member');
    }
    if (isVeganOnly && kit.diet !== 'vegan' && !kit.dietaryTags?.includes('vegan')) {
      reasons.push('Non-vegan dish assigned to vegan member');
    }
    if (isJainOnly && !kit.dietaryTags?.includes('jain')) {
      reasons.push('Non-Jain ingredients assigned to Jain preference');
    }
  }

  // 3. Spice Level Check (Children & Mild tolerance)
  const spiceTolerance =
    prefs.spiceTolerance || (member.dependent_type === 'child' ? 'Mild' : null);
  if (spiceTolerance === 'Mild') {
    if (kit.spiceLevel === 'Spicy' || kit.spiceLevel === 'Fiery') {
      reasons.push(`${kit.spiceLevel} spice level exceeds mild spice preference`);
    }
  }

  return {
    hasConflict: reasons.length > 0,
    reasons,
  };
}
