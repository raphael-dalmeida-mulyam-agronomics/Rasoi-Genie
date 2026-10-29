import { getMealKitById, MealKit } from './mealKitsService';

export type StandardPlanKey = 'high-protein' | 'keto' | 'vegan';
export type PlanType = 'standard' | 'custom';
export type SubscriptionScope = 'individual' | 'family';
export type SubscriptionStatus = 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';

export interface WeekdayMealAssignment {
  weekday: number; // 0 = Monday, 1 = Tuesday, ... 6 = Sunday
  weekdayName: string;
  mealKitId: string;
}

export interface StandardSubscriptionPlan {
  key: StandardPlanKey;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  pricePerMemberPerWeek: number;
  originalPricePerMemberPerWeek: number;
  highlightNutrition: string;
  weeklyMeals: WeekdayMealAssignment[]; // 7-day template (Monday to Sunday)
}

export const WEEKDAYS = [
  { index: 0, short: 'Mon', full: 'Monday' },
  { index: 1, short: 'Tue', full: 'Tuesday' },
  { index: 2, short: 'Wed', full: 'Wednesday' },
  { index: 3, short: 'Thu', full: 'Thursday' },
  { index: 4, short: 'Fri', full: 'Friday' },
  { index: 5, short: 'Sat', full: 'Saturday' },
  { index: 6, short: 'Sun', full: 'Sunday' },
] as const;

export const DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK = 1299;

export const STANDARD_SUBSCRIPTION_PLANS: Record<StandardPlanKey, StandardSubscriptionPlan> = {
  'high-protein': {
    key: 'high-protein',
    name: 'High Protein Power',
    tagline: '30g+ protein per meal to fuel active days',
    description:
      'Chef-curated bowls, biryanis, coastal roasts, and smash burgers loaded with tender chicken, prawns, and double patties.',
    badge: 'ATHLETE & ACTIVE',
    pricePerMemberPerWeek: 1299,
    originalPricePerMemberPerWeek: 1699,
    highlightNutrition: 'Avg 32g - 42g Protein / meal',
    weeklyMeals: [
      { weekday: 0, weekdayName: 'Monday', mealKitId: 'kit-102' }, // Hyderabadi Dum Chicken Biryani Kit (34g protein)
      { weekday: 1, weekdayName: 'Tuesday', mealKitId: 'kit-104' }, // Coastal Prawns Ghee Roast Kit (38g protein)
      { weekday: 2, weekdayName: 'Wednesday', mealKitId: 'kit-204' }, // Smoky Grilled Chipotle Chicken Burrito Bowl Kit (42g protein)
      { weekday: 3, weekdayName: 'Thursday', mealKitId: 'kit-206' }, // Texas Double Smash Cheeseburger Kit (38g protein)
      { weekday: 4, weekdayName: 'Friday', mealKitId: 'kit-208' }, // Birria Pulled Chicken Tacos with Consomé Dip Kit (34g protein)
      { weekday: 5, weekdayName: 'Saturday', mealKitId: 'kit-304' }, // Chettinad Pepper Chicken Curry Kit (32g protein)
      { weekday: 6, weekdayName: 'Sunday', mealKitId: 'kit-207' }, // Smoked Pepperoni & Hot Honey Artisanal Pizza Kit (26g protein)
    ],
  },
  keto: {
    key: 'keto',
    name: 'Keto Low-Carb Gourmet',
    tagline: 'Under 15g net carbs with wholesome good fats',
    description:
      'Wholesome low-carb coastal prawn roasts, cauliflower tikka, pepper curries, and rich vegetable stews.',
    badge: 'LOW CARB & KETO',
    pricePerMemberPerWeek: 1399,
    originalPricePerMemberPerWeek: 1799,
    highlightNutrition: 'Low Net Carbs (8g - 22g) with Healthy Fats',
    weeklyMeals: [
      { weekday: 0, weekdayName: 'Monday', mealKitId: 'kit-106' }, // Keto Cauliflower Tikka Masala Kit (9g carbs, tagged keto)
      { weekday: 1, weekdayName: 'Tuesday', mealKitId: 'kit-104' }, // Coastal Prawns Ghee Roast Kit (8g carbs, tagged keto)
      { weekday: 2, weekdayName: 'Wednesday', mealKitId: 'kit-304' }, // Chettinad Pepper Chicken Curry Kit (12g carbs, 28g fats)
      { weekday: 3, weekdayName: 'Thursday', mealKitId: 'kit-101' }, // Paneer Butter Masala Kit (22g carbs, 28g fats)
      { weekday: 4, weekdayName: 'Friday', mealKitId: 'kit-302' }, // Classic French Provencal Ratatouille Stew Kit (light carb vegetable stew)
      { weekday: 5, weekdayName: 'Saturday', mealKitId: 'kit-303' }, // Spiced Tomato & Red Lentil Shorba Kit (light spiced lentil broth)
      { weekday: 6, weekdayName: 'Sunday', mealKitId: 'kit-308' }, // Creamy Wild Mushroom & Corn Chowder Kit (wild mushrooms)
    ],
  },
  vegan: {
    key: 'vegan',
    name: '100% Plant-Based Vegan',
    tagline: 'Pure plant-powered bowls, curries & stews with zero dairy',
    description:
      '100% dairy-free, cruelty-free meals prepared with pressed coconut, black beans, chickpeas, and fresh market produce.',
    badge: '100% PLANT-BASED',
    pricePerMemberPerWeek: 1199,
    originalPricePerMemberPerWeek: 1499,
    highlightNutrition: '100% Dairy-Free & Rich in Plant Fiber',
    weeklyMeals: [
      { weekday: 0, weekdayName: 'Monday', mealKitId: 'kit-106' }, // Keto Cauliflower Tikka Masala Kit (100% vegan, almond cream)
      { weekday: 1, weekdayName: 'Tuesday', mealKitId: 'kit-209' }, // Fiesta Roasted Fajita & Black Bean Burrito Bowl Kit (100% vegan)
      { weekday: 2, weekdayName: 'Wednesday', mealKitId: 'kit-301' }, // Mediterranean Chickpea & Spinach Stew Kit (100% vegan)
      { weekday: 3, weekdayName: 'Thursday', mealKitId: 'kit-302' }, // Classic French Provencal Ratatouille Stew Kit (100% vegan)
      { weekday: 4, weekdayName: 'Friday', mealKitId: 'kit-303' }, // Spiced Tomato & Red Lentil Shorba Kit (100% vegan)
      { weekday: 5, weekdayName: 'Saturday', mealKitId: 'kit-305' }, // Crispy Veg Manchurian & Hakka Noodles Kit (100% vegan)
      { weekday: 6, weekdayName: 'Sunday', mealKitId: 'kit-310' }, // Puneri Pithla Bhakri & Thecha Kit (100% vegan)
    ],
  },
};

export const STANDARD_PLANS_LIST: StandardSubscriptionPlan[] = Object.values(
  STANDARD_SUBSCRIPTION_PLANS,
);

/**
 * Validates that every meal kit in standard plans exists in the catalog.
 */
export function validateStandardPlanKits(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const plan of STANDARD_PLANS_LIST) {
    for (const assignment of plan.weeklyMeals) {
      const kit = getMealKitById(assignment.mealKitId);
      if (!kit) {
        missing.push(`${plan.key}:${assignment.weekday}:${assignment.mealKitId}`);
      }
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Resolves full MealKit objects for a plan's 7-day schedule.
 */
export function resolvePlanMealKits(
  planKey: StandardPlanKey,
): { weekday: number; weekdayName: string; mealKit: MealKit | undefined }[] {
  const plan = STANDARD_SUBSCRIPTION_PLANS[planKey];
  if (!plan) return [];
  return plan.weeklyMeals.map((item) => ({
    weekday: item.weekday,
    weekdayName: item.weekdayName,
    mealKit: getMealKitById(item.mealKitId),
  }));
}

export interface SubscriptionPricingParams {
  pricePerMemberPerWeek: number;
  memberCount: number;
  discount?: number;
}

export interface SubscriptionPricingResult {
  pricePerMemberPerWeek: number;
  memberCount: number;
  subtotal: number;
  discount: number;
  total: number;
}

/**
 * Pure function: calculates total subscription price.
 * Total = price_per_member_per_week × number of covered members - discount.
 */
export function calculateSubscriptionTotal(
  params: SubscriptionPricingParams,
): SubscriptionPricingResult {
  const pricePerMember = Math.max(0, Math.round(params.pricePerMemberPerWeek));
  const memberCount = Math.max(0, Math.floor(params.memberCount));
  const subtotal = pricePerMember * memberCount;
  const discount = Math.min(subtotal, Math.max(0, Math.round(params.discount || 0)));
  const total = Math.max(0, subtotal - discount);

  return {
    pricePerMemberPerWeek: pricePerMember,
    memberCount,
    subtotal,
    discount,
    total,
  };
}

export interface ProrationCalculationParams {
  currentMemberCount: number;
  newMemberCount: number;
  pricePerMemberPerWeek: number;
  daysRemainingInPeriod: number; // 0 to 7
  totalDaysInPeriod?: number; // default 7
}

export interface ProrationCalculationResult {
  memberDelta: number; // positive = added, negative = removed
  daysRemaining: number;
  dailyRatePerMember: number;
  immediatePayableAmount: number; // if adding members mid-period
  refundCreditAmount: number; // if refunding for removed members (or 0 if takes effect next period)
  nextPeriodTotal: number;
}

/**
 * Pure function: Proration & membership adjustment policy calculation.
 * Adding members mid-period: prorated charge for remaining days in current period upfront.
 * Removing members: takes effect at next period renewal (0 immediate refund, next period total reduced).
 */
export function calculateProratedAdjustment(
  params: ProrationCalculationParams,
): ProrationCalculationResult {
  const totalDays = params.totalDaysInPeriod || 7;
  const daysRemaining = Math.max(0, Math.min(totalDays, Math.round(params.daysRemainingInPeriod)));
  const memberDelta = params.newMemberCount - params.currentMemberCount;
  const dailyRatePerMember = params.pricePerMemberPerWeek / totalDays;

  let immediatePayableAmount = 0;
  let refundCreditAmount = 0;

  if (memberDelta > 0) {
    // New members added mid-week: charge prorated days remaining upfront
    immediatePayableAmount = Math.round(memberDelta * dailyRatePerMember * daysRemaining);
  } else if (memberDelta < 0) {
    // Policy: member removal takes effect at next period renewal (standard SaaS / food box policy)
    refundCreditAmount = 0;
  }

  const nextPeriodTotal = Math.max(0, params.newMemberCount * params.pricePerMemberPerWeek);

  return {
    memberDelta,
    daysRemaining,
    dailyRatePerMember,
    immediatePayableAmount,
    refundCreditAmount,
    nextPeriodTotal,
  };
}

import {
  SUBSCRIPTION_PAUSE_CONFIG,
  SUBSCRIPTION_PLAN_PRICES,
} from '../subscription/subscriptionConfig';

export interface MemberPlanPricingItem {
  planType: PlanType;
  standardPlanKey?: StandardPlanKey | null;
  pricePerWeek?: number;
}

export interface PerMemberSubscriptionTotalParams {
  members: MemberPlanPricingItem[];
  weeks?: number; // default 1
  discount?: number; // default 0
}

export interface MemberBreakdownItem {
  planType: PlanType;
  standardPlanKey: StandardPlanKey | null;
  pricePerWeek: number;
  totalForPeriod: number;
}

export interface PerMemberSubscriptionTotalResult {
  membersCount: number;
  weeks: number;
  memberBreakdown: MemberBreakdownItem[];
  subtotal: number;
  discount: number;
  total: number;
}

/**
 * Pure function: calculates subscription total based on each covered member's individual plan.
 * Total price = sum of each member's weekly price × weeks in the period - discount.
 */
export function calculatePerMemberSubscriptionTotal(
  params: PerMemberSubscriptionTotalParams,
): PerMemberSubscriptionTotalResult {
  const weeks = Math.max(1, Math.floor(params.weeks || 1));
  const discount = Math.max(0, Math.round(params.discount || 0));

  const memberBreakdown: MemberBreakdownItem[] = (params.members || []).map((m) => {
    let rate = m.pricePerWeek;
    if (rate === undefined || rate === null) {
      if (m.planType === 'standard' && m.standardPlanKey) {
        rate =
          STANDARD_SUBSCRIPTION_PLANS[m.standardPlanKey]?.pricePerMemberPerWeek ||
          DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;
      } else {
        rate = DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;
      }
    }
    const safeRate = Math.max(0, Math.round(rate));
    return {
      planType: m.planType,
      standardPlanKey: m.standardPlanKey || null,
      pricePerWeek: safeRate,
      totalForPeriod: safeRate * weeks,
    };
  });

  const subtotal = memberBreakdown.reduce((sum, item) => sum + item.totalForPeriod, 0);
  const total = Math.max(0, subtotal - Math.min(subtotal, discount));

  return {
    membersCount: memberBreakdown.length,
    weeks,
    memberBreakdown,
    subtotal,
    discount,
    total,
  };
}

/**
 * Pure function: copies a single plan configuration across all covered member IDs.
 * Used for "Apply the same plan to everyone".
 */
export function copyPlanToAllMembers(
  targetPlan: { planType: PlanType; standardPlanKey?: StandardPlanKey | null },
  memberIds: string[],
  planGroup: string = 'shared_all',
): Record<
  string,
  { planType: PlanType; standardPlanKey: StandardPlanKey | null; planGroup: string }
> {
  const result: Record<
    string,
    { planType: PlanType; standardPlanKey: StandardPlanKey | null; planGroup: string }
  > = {};
  for (const id of memberIds) {
    result[id] = {
      planType: targetPlan.planType,
      standardPlanKey: targetPlan.standardPlanKey || null,
      planGroup,
    };
  }
  return result;
}

export interface PauseDateRange {
  startDate: string | Date;
  endDate: string | Date;
  memberId?: string | null;
  daysCount?: number;
}

export interface ValidatePauseSelectionParams {
  startDate: string | Date;
  endDate: string | Date;
  existingPauses?: PauseDateRange[];
  periodStart: string | Date;
  periodEnd: string | Date;
  now?: string | Date;
}

export interface ValidatePauseSelectionResult {
  valid: boolean;
  daysCount: number;
  error?: string;
}

export interface PauseAllowanceResult {
  totalAllowedDays: number;
  daysUsed: number;
  daysRemaining: number;
  maxRanges: number;
  rangesUsed: number;
  rangesRemaining: number;
}

function normalizeToDate(val: string | Date): Date {
  const d = new Date(val);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Pure function: validates a user-selected pause date range against all business & cutoff constraints.
 */
export function validatePauseSelection(
  params: ValidatePauseSelectionParams,
): ValidatePauseSelectionResult {
  const start = normalizeToDate(params.startDate);
  const end = normalizeToDate(params.endDate);
  const periodStart = normalizeToDate(params.periodStart);
  const periodEnd = normalizeToDate(params.periodEnd);
  const now = params.now ? new Date(params.now) : new Date();

  // 1. Order check
  if (end < start) {
    return { valid: false, daysCount: 0, error: 'End date cannot be earlier than start date' };
  }

  const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 2. Max consecutive days
  if (daysCount > SUBSCRIPTION_PAUSE_CONFIG.MAX_CONSECUTIVE_PAUSE_DAYS) {
    return {
      valid: false,
      daysCount,
      error: `No single pause can be longer than ${SUBSCRIPTION_PAUSE_CONFIG.MAX_CONSECUTIVE_PAUSE_DAYS} consecutive days`,
    };
  }

  // 3. Fall inside current period
  if (start < periodStart || end > periodEnd) {
    return {
      valid: false,
      daysCount,
      error: 'Paused days must fall inside the current billing period',
    };
  }

  // 4. Cutoff window check (48 hours) & past days
  const cutoffTime = new Date(
    now.getTime() + SUBSCRIPTION_PAUSE_CONFIG.CUTOFF_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const cutoffStartDay = new Date(
    cutoffTime.getFullYear(),
    cutoffTime.getMonth(),
    cutoffTime.getDate(),
  );

  if (start < cutoffStartDay) {
    return {
      valid: false,
      daysCount,
      error: 'Cannot pause days within the 48-hour delivery cutoff window or in the past',
    };
  }

  // 5. Existing pauses checks
  const existing = params.existingPauses || [];

  // Overlap check
  for (const ep of existing) {
    const epStart = normalizeToDate(ep.startDate);
    const epEnd = normalizeToDate(ep.endDate);
    if (start <= epEnd && end >= epStart) {
      return {
        valid: false,
        daysCount,
        error: 'Pause range overlaps with an existing pause',
      };
    }
  }

  // Max ranges check
  if (existing.length >= SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSE_RANGES_PER_PERIOD) {
    return {
      valid: false,
      daysCount,
      error: `Maximum ${SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSE_RANGES_PER_PERIOD} separate pause ranges allowed per billing period`,
    };
  }

  // Max total days check
  const existingDaysTotal = existing.reduce((sum, p) => {
    const pStart = normalizeToDate(p.startDate);
    const pEnd = normalizeToDate(p.endDate);
    return sum + (Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, 0);

  if (existingDaysTotal + daysCount > SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD) {
    const remaining = Math.max(
      0,
      SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD - existingDaysTotal,
    );
    return {
      valid: false,
      daysCount,
      error: `Pause exceeds remaining limit. You have ${remaining} of ${SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD} paused days left`,
    };
  }

  return {
    valid: true,
    daysCount,
  };
}

/**
 * Pure function: calculates remaining pause days & ranges allowance.
 */
export function calculateRemainingPauseAllowance(
  existingPauses: PauseDateRange[] = [],
): PauseAllowanceResult {
  const daysUsed = existingPauses.reduce((sum, p) => {
    const pStart = normalizeToDate(p.startDate);
    const pEnd = normalizeToDate(p.endDate);
    return sum + (Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, 0);

  return {
    totalAllowedDays: SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD,
    daysUsed,
    daysRemaining: Math.max(0, SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD - daysUsed),
    maxRanges: SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSE_RANGES_PER_PERIOD,
    rangesUsed: existingPauses.length,
    rangesRemaining: Math.max(
      0,
      SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSE_RANGES_PER_PERIOD - existingPauses.length,
    ),
  };
}

/**
 * Pure function: checks if a specific date is locked from being paused (past or within 48h cutoff).
 */
export function isDateLockedForPause(date: string | Date, now?: string | Date): boolean {
  const target = normalizeToDate(date);
  const currentNow = now ? new Date(now) : new Date();
  const cutoff = new Date(
    currentNow.getTime() + SUBSCRIPTION_PAUSE_CONFIG.CUTOFF_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const cutoffDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
  return target < cutoffDay;
}

/**
 * Pure function: checks if a specific date is covered by any existing pause.
 */
export function isDatePaused(
  date: string | Date,
  pauses: PauseDateRange[] = [],
  memberId?: string | null,
): boolean {
  const target = normalizeToDate(date);
  return pauses.some((p) => {
    if (memberId && p.memberId && p.memberId !== memberId) {
      return false;
    }
    const start = normalizeToDate(p.startDate);
    const end = normalizeToDate(p.endDate);
    return target >= start && target <= end;
  });
}

/**
 * Pure function: checks if a specific date has a pause applied to the entire family (memberId is null).
 */
export function isWholeFamilyDatePaused(
  date: string | Date,
  pauses: PauseDateRange[] = [],
): boolean {
  const target = normalizeToDate(date);
  return pauses.some((p) => {
    if (p.memberId) return false;
    const start = normalizeToDate(p.startDate);
    const end = normalizeToDate(p.endDate);
    return target >= start && target <= end;
  });
}

/**
 * Pure function: calculates extended period_end when pauses are applied.
 * Upfront payment policy: period is extended by the paused days.
 */
export function calculateExtendedPeriodEnd(
  currentPeriodEnd: string | Date,
  pausedDays: number,
): Date {
  const d = new Date(currentPeriodEnd);
  return new Date(d.getTime() + pausedDays * 24 * 60 * 60 * 1000);
}
