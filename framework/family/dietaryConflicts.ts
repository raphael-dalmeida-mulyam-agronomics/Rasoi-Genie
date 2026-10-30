import { FamilyMember } from '../services/familyService';
import { MealKit } from '../services/mealKitsService';
import {
  PlanType,
  StandardPlanKey,
  resolvePlanMealKits,
  STANDARD_SUBSCRIPTION_PLANS,
} from '../services/subscriptionPlans';

export interface DietaryConflictResult {
  hasConflict: boolean;
  reasons: string[];
}

export interface MemberPlanMealItem {
  weekday: number;
  weekdayShort: string;
  weekdayName: string;
  kit?: MealKit;
  conflict: DietaryConflictResult;
}

export interface MemberPlanAuditResult {
  weeklyMeals: MemberPlanMealItem[];
  conflicts: MemberPlanMealItem[];
  hasConflict: boolean;
  conflictReasons: string[];
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

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Audits all 7 meals for a member under their current or chosen plan configuration,
 * returning the daily resolved meal kits and any dietary/allergen conflicts.
 */
export function auditMemberWeeklyPlan(
  member: FamilyMember,
  cfg: { planType: PlanType; standardPlanKey?: StandardPlanKey | null } | undefined,
  localMeals: Record<string, string>,
  getMealKit: (id: string) => MealKit | undefined,
): MemberPlanAuditResult {
  const planType = cfg?.planType || 'standard';
  const standardKey =
    cfg?.standardPlanKey || (planType === 'standard' ? 'high-protein' : undefined);
  const plan = standardKey ? STANDARD_SUBSCRIPTION_PLANS[standardKey] : undefined;

  const weeklyMeals: MemberPlanMealItem[] = [0, 1, 2, 3, 4, 5, 6].map((wIndex) => {
    let kitId = localMeals[`${member.user_id}_${wIndex}`];
    if (!kitId && standardKey) {
      const template = resolvePlanMealKits(standardKey);
      const match = template.find((t) => t.weekday === wIndex);
      const rawAssignment = plan?.weeklyMeals?.find((m) => m.weekday === wIndex);
      kitId = match?.mealKit?.id || rawAssignment?.mealKitId;
    }
    const kit = kitId ? getMealKit(kitId) : undefined;
    const conflict = kit ? checkDietaryConflict(member, kit) : { hasConflict: false, reasons: [] };

    return {
      weekday: wIndex,
      weekdayShort: SHORT_DAYS[wIndex] || '',
      weekdayName: FULL_DAYS[wIndex] || '',
      kit,
      conflict,
    };
  });

  const conflicts = weeklyMeals.filter((m) => m.conflict.hasConflict);
  const conflictReasons = Array.from(new Set(conflicts.flatMap((m) => m.conflict.reasons)));

  return {
    weeklyMeals,
    conflicts,
    hasConflict: conflicts.length > 0,
    conflictReasons,
  };
}

/**
 * Pure evaluator: audits all 7 meals of a standard plan template against a member's dietary preferences and allergies.
 */
export function auditStandardPlanForMember(
  member: FamilyMember,
  planKey: StandardPlanKey,
  getMealKit: (id: string) => MealKit | undefined,
): { hasConflict: boolean; conflictingMealsCount: number; reasons: string[] } {
  const template = resolvePlanMealKits(planKey);
  const plan = STANDARD_SUBSCRIPTION_PLANS[planKey];
  const reasons: string[] = [];
  let conflictingCount = 0;

  for (let w = 0; w < 7; w++) {
    const item = template.find((t) => t.weekday === w);
    const rawAssignment = plan?.weeklyMeals?.find((m) => m.weekday === w);
    const kitId = rawAssignment?.mealKitId;
    const kit = item?.mealKit || (kitId && getMealKit ? getMealKit(kitId) : undefined);
    const conflict = kit ? checkDietaryConflict(member, kit) : { hasConflict: false, reasons: [] };
    if (conflict.hasConflict) {
      conflictingCount++;
      reasons.push(...conflict.reasons);
    }
  }

  return {
    hasConflict: conflictingCount > 0,
    conflictingMealsCount: conflictingCount,
    reasons: Array.from(new Set(reasons)),
  };
}
