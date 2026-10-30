import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SUBSCRIPTION_PAUSE_CONFIG,
  SUBSCRIPTION_RENEWAL_CONFIG,
  SUBSCRIPTION_PLAN_PRICES,
} from '../subscription/subscriptionConfig';
import { getSupabaseClient } from '../supabase/client';
import { subscribeToTable } from './realtimeService';
import {
  calculateExtendedPeriodEnd,
  calculatePerMemberSubscriptionTotal,
  calculateProratedAdjustment,
  calculateRemainingPauseAllowance,
  DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK,
  isDateLockedForPause,
  isDatePaused,
  PauseDateRange,
  PlanType,
  ProrationCalculationResult,
  resolvePlanMealKits,
  STANDARD_SUBSCRIPTION_PLANS,
  StandardPlanKey,
  SubscriptionScope,
  SubscriptionStatus,
  validatePauseSelection,
  validateHighlightedPauseDays,
  groupDatesIntoRanges,
  enumerateDatesInRange,
} from './subscriptionPlans';

export interface Subscription {
  id: string;
  owner_user_id: string;
  family_id: string | null;
  scope: SubscriptionScope;
  plan_type: 'standard' | 'custom';
  standard_plan_key: StandardPlanKey | null;
  status: SubscriptionStatus;
  price_per_member_per_week: number;
  member_count: number;
  amount_paid: number;
  wallet_credits_applied: number;
  payment_reference: string | null;
  payment_method: string | null;
  period_start: string;
  period_end: string;
  auto_renew: boolean;
  renewal_attempts: number;
  next_renewal_at: string | null;
  cancel_at_period_end: boolean;
  last_renewed_period_end: string | null;
  region: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionMember {
  id: string;
  subscription_id: string;
  member_id: string;
  member_name: string;
  is_dependent: boolean;
  plan_type: 'standard' | 'custom';
  standard_plan_key: StandardPlanKey | null;
  plan_group: string | null;
  price_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionMeal {
  id: string;
  subscription_id: string;
  member_id: string;
  weekday: number; // 0=Mon, 6=Sun
  meal_kit_id: string;
  created_at: string;
  updated_at: string;
}

const LOCAL_SUBS_KEY = '@rasoi_local_subscriptions';
const LOCAL_SUB_MEMBERS_KEY = '@rasoi_local_sub_members';
const LOCAL_SUB_MEALS_KEY = '@rasoi_local_sub_meals';

// Memory caches for synchronous mock fast-path & test isolation
let inMemorySubs: Subscription[] = [];
let inMemoryMembers: SubscriptionMember[] = [];
let inMemoryMeals: SubscriptionMeal[] = [];

export interface SubscriptionPause {
  id: string;
  subscription_id: string;
  member_id: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  days_count: number;
  created_by: string;
  created_at: string;
}

const LOCAL_SUB_PAUSES_KEY = '@rasoi_local_sub_pauses';
let inMemoryPauses: SubscriptionPause[] = [];

/** Reset in-memory subscription stores (useful for tests) */
export function resetSubscriptionMockStore(): void {
  inMemorySubs = [];
  inMemoryMembers = [];
  inMemoryMeals = [];
  inMemoryPauses = [];
}

async function loadLocalStores(): Promise<void> {
  try {
    const [rawSubs, rawMems, rawMeals, rawPauses] = await Promise.all([
      AsyncStorage.getItem(LOCAL_SUBS_KEY),
      AsyncStorage.getItem(LOCAL_SUB_MEMBERS_KEY),
      AsyncStorage.getItem(LOCAL_SUB_MEALS_KEY),
      AsyncStorage.getItem(LOCAL_SUB_PAUSES_KEY),
    ]);
    if (rawSubs) inMemorySubs = JSON.parse(rawSubs);
    if (rawMems) inMemoryMembers = JSON.parse(rawMems);
    if (rawMeals) inMemoryMeals = JSON.parse(rawMeals);
    if (rawPauses) inMemoryPauses = JSON.parse(rawPauses);
  } catch {
    // Keep in-memory
  }
}

async function saveLocalStores(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(LOCAL_SUBS_KEY, JSON.stringify(inMemorySubs)),
      AsyncStorage.setItem(LOCAL_SUB_MEMBERS_KEY, JSON.stringify(inMemoryMembers)),
      AsyncStorage.setItem(LOCAL_SUB_MEALS_KEY, JSON.stringify(inMemoryMeals)),
      AsyncStorage.setItem(LOCAL_SUB_PAUSES_KEY, JSON.stringify(inMemoryPauses)),
    ]);
  } catch {
    // Keep in-memory
  }
}

// Preload mock stores
loadLocalStores();

/**
 * Checks if Supabase client is configured with real cloud endpoints.
 */
function isSupabaseLive(): boolean {
  try {
    const supabase = getSupabaseClient();
    const url = (supabase as any)?.supabaseUrl || '';
    return Boolean(
      url && !url.includes('demo') && !url.includes('mock') && !url.includes('localhost'),
    );
  } catch {
    return false;
  }
}

/**
 * Fetches the active subscription that covers the specified user:
 * 1. Checks for an active individual subscription owned by the user.
 * 2. Checks for an active family subscription if the user belongs to a family.
 */
export async function fetchUserActiveSubscription(
  userId: string,
  familyId?: string | null,
): Promise<{
  subscription: Subscription | null;
  members: SubscriptionMember[];
  meals: SubscriptionMeal[];
}> {
  if (!userId) {
    return { subscription: null, members: [], meals: [] };
  }

  // Live Supabase attempt
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();

      // Check direct owner subscription first
      const { data: directSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_user_id', userId)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1);

      let targetSub: Subscription | null = (directSubs && directSubs[0]) || null;

      // If no direct subscription and familyId provided, check if family has active subscription
      if (!targetSub && familyId) {
        const { data: familySubs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('family_id', familyId)
          .in('status', ['active', 'paused'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (familySubs && familySubs[0]) {
          targetSub = familySubs[0];
        }
      }

      if (!targetSub) {
        // Check for latest cancelled subscription
        const { data: cancelledSubs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('owner_user_id', userId)
          .eq('status', 'cancelled')
          .order('updated_at', { ascending: false })
          .limit(1);
        if (cancelledSubs && cancelledSubs[0]) {
          return {
            subscription: cancelledSubs[0],
            members: [],
            meals: [],
          };
        }
      }

      if (targetSub) {
        const [membersRes, mealsRes] = await Promise.all([
          supabase.from('subscription_members').select('*').eq('subscription_id', targetSub.id),
          supabase.from('subscription_meals').select('*').eq('subscription_id', targetSub.id),
        ]);

        return {
          subscription: targetSub,
          members: (membersRes.data as SubscriptionMember[]) || [],
          meals: (mealsRes.data as SubscriptionMeal[]) || [],
        };
      }
    } catch (err) {
      console.warn(
        '[SubscriptionService] Supabase fetch failed, falling back to local store:',
        err,
      );
    }
  }

  // Fallback to local / mock storage
  await loadLocalStores();

  // Find direct individual or family owner sub
  let sub = inMemorySubs.find(
    (s) => s.owner_user_id === userId && (s.status === 'active' || s.status === 'paused'),
  );

  // If not found and familyId given, check if family has active sub
  if (!sub && familyId) {
    sub = inMemorySubs.find(
      (s) => s.family_id === familyId && (s.status === 'active' || s.status === 'paused'),
    );
  }

  // Also check if member is explicitly listed in subscription_members
  if (!sub) {
    const memEntry = inMemoryMembers.find((m) => m.member_id === userId);
    if (memEntry) {
      sub = inMemorySubs.find(
        (s) =>
          s.id === memEntry.subscription_id && (s.status === 'active' || s.status === 'paused'),
      );
    }
  }

  // If no active or paused sub, check for most recently cancelled sub
  if (!sub) {
    const cancelledSubs = inMemorySubs
      .filter(
        (s) =>
          (s.owner_user_id === userId || (familyId && s.family_id === familyId)) &&
          s.status === 'cancelled',
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );
    if (cancelledSubs.length > 0) {
      sub = cancelledSubs[0];
    }
  }

  if (!sub) {
    return { subscription: null, members: [], meals: [] };
  }

  if (sub.status === 'cancelled') {
    return { subscription: sub, members: [], meals: [] };
  }

  const members = inMemoryMembers.filter((m) => m.subscription_id === sub!.id);
  const meals = inMemoryMeals.filter((m) => m.subscription_id === sub!.id);

  return { subscription: sub, members, meals };
}

export interface MemberSubscriptionSetup {
  id: string; // user id or dependent id
  name: string;
  isDependent: boolean;
  planType?: 'standard' | 'custom';
  standardPlanKey?: StandardPlanKey | null;
  planGroup?: string | null;
  pricePerWeek?: number;
  meals?: Record<number, string>; // weekday (0..6) -> meal_kit_id
}

export interface CreateSubscriptionInput {
  ownerUserId: string;
  familyId?: string | null;
  scope: SubscriptionScope;
  planType: 'standard' | 'custom';
  standardPlanKey?: StandardPlanKey | null;
  pricePerMemberPerWeek?: number;
  members: MemberSubscriptionSetup[];
  amountPaid: number;
  walletCreditsApplied?: number;
  paymentMethod?: string;
  paymentReference?: string;
  autoRenew?: boolean;
  region?: string;
  weeks?: number;
}

/**
 * Creates and activates a new weekly meal subscription.
 */
export async function createAndActivateSubscription(input: CreateSubscriptionInput): Promise<{
  success: boolean;
  subscription?: Subscription;
  members?: SubscriptionMember[];
  meals?: SubscriptionMeal[];
  error?: string;
}> {
  const {
    ownerUserId,
    familyId = null,
    scope,
    planType,
    standardPlanKey = null,
    members,
    amountPaid,
    walletCreditsApplied = 0,
    paymentMethod = 'UPI',
    paymentReference = `sub_pay_${Date.now()}`,
    autoRenew = SUBSCRIPTION_RENEWAL_CONFIG.DEFAULT_AUTO_RENEW,
    region = 'West',
  } = input;

  if (!ownerUserId) {
    return { success: false, error: 'Owner user ID is required' };
  }
  if (!members || members.length === 0) {
    return { success: false, error: 'At least one covered member is required' };
  }

  const pricePerMember =
    input.pricePerMemberPerWeek ||
    (planType === 'standard' && standardPlanKey
      ? STANDARD_SUBSCRIPTION_PLANS[standardPlanKey]?.pricePerMemberPerWeek ||
        DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
      : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK);

  const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const numWeeks = input.weeks && input.weeks > 0 ? input.weeks : 1;
  const periodEnd = new Date(now.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000);

  const newSubscription: Subscription = {
    id: subId,
    owner_user_id: ownerUserId,
    family_id: familyId || null,
    scope,
    plan_type: planType,
    standard_plan_key: standardPlanKey || null,
    status: 'active',
    price_per_member_per_week: pricePerMember,
    member_count: members.length,
    amount_paid: amountPaid,
    wallet_credits_applied: walletCreditsApplied,
    payment_reference: paymentReference,
    payment_method: paymentMethod,
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
    auto_renew: autoRenew,
    renewal_attempts: 0,
    next_renewal_at: periodEnd.toISOString(),
    cancel_at_period_end: false,
    last_renewed_period_end: null,
    region,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const newMembers: SubscriptionMember[] = [];
  const newMeals: SubscriptionMeal[] = [];

  for (const m of members) {
    const memPlanType = m.planType || planType;
    const memStandardKey =
      m.standardPlanKey || (memPlanType === 'standard' ? standardPlanKey : null);

    newMembers.push({
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subscription_id: subId,
      member_id: m.id,
      member_name: m.name,
      is_dependent: Boolean(m.isDependent),
      plan_type: memPlanType,
      standard_plan_key: memStandardKey,
      plan_group: m.planGroup || null,
      price_per_week:
        m.pricePerWeek ||
        (memPlanType === 'standard' && memStandardKey
          ? STANDARD_SUBSCRIPTION_PLANS[memStandardKey]?.pricePerMemberPerWeek ||
            DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
          : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    // Populate meals for this member:
    // If standard plan, populate from the 7-day template; if custom, populate passed meals
    if (memPlanType === 'standard' && memStandardKey) {
      const template = resolvePlanMealKits(memStandardKey);
      for (const t of template) {
        if (t.mealKit) {
          newMeals.push({
            id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            subscription_id: subId,
            member_id: m.id,
            weekday: t.weekday,
            meal_kit_id: t.mealKit.id,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });
        }
      }
    } else if (m.meals) {
      for (const [dayStr, kitId] of Object.entries(m.meals)) {
        if (kitId) {
          newMeals.push({
            id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            subscription_id: subId,
            member_id: m.id,
            weekday: parseInt(dayStr, 10),
            meal_kit_id: kitId,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });
        }
      }
    }
  }

  // Attempt live Supabase insert
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('subscriptions').insert(newSubscription);
      if (newMembers.length > 0) {
        await supabase.from('subscription_members').insert(newMembers);
      }
      if (newMeals.length > 0) {
        await supabase.from('subscription_meals').insert(newMeals);
      }
    } catch (err) {
      console.warn('[SubscriptionService] Supabase insert failed, saving to local:', err);
    }
  }

  // Update local memory and AsyncStorage
  // Deactivate any previous active sub for this scope
  inMemorySubs = inMemorySubs.map((s) => {
    if (
      (s.owner_user_id === ownerUserId || (familyId && s.family_id === familyId)) &&
      s.status === 'active'
    ) {
      return { ...s, status: 'cancelled' as SubscriptionStatus };
    }
    return s;
  });

  inMemorySubs.unshift(newSubscription);
  inMemoryMembers.push(...newMembers);
  inMemoryMeals.push(...newMeals);
  await saveLocalStores();

  return {
    success: true,
    subscription: newSubscription,
    members: newMembers,
    meals: newMeals,
  };
}

/**
 * Pauses an active subscription (takes effect starting next Monday).
 */
export async function pauseSubscription(
  subscriptionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('subscriptions')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);
    } catch {
      // Fallback
    }
  }

  let found = false;
  inMemorySubs = inMemorySubs.map((s) => {
    if (s.id === subscriptionId) {
      found = true;
      return { ...s, status: 'paused' as SubscriptionStatus, updated_at: new Date().toISOString() };
    }
    return s;
  });

  if (found) {
    await saveLocalStores();
    notifySubscriptionPauseListeners(subscriptionId);
    return { success: true };
  }
  return { success: false, error: 'Subscription not found' };
}

/**
 * Resumes a paused subscription.
 */
export async function resumeSubscription(
  subscriptionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);
    } catch {
      // Fallback
    }
  }

  let found = false;
  inMemorySubs = inMemorySubs.map((s) => {
    if (s.id === subscriptionId) {
      found = true;
      return { ...s, status: 'active' as SubscriptionStatus, updated_at: new Date().toISOString() };
    }
    return s;
  });

  if (found) {
    await saveLocalStores();
    notifySubscriptionPauseListeners(subscriptionId);
    return { success: true };
  }
  return { success: false, error: 'Subscription not found' };
}

/**
 * Cancels a subscription immediately or at period end.
 */
export async function cancelSubscription(
  subscriptionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);
    } catch {
      // Fallback
    }
  }

  let found = false;
  inMemorySubs = inMemorySubs.map((s) => {
    if (s.id === subscriptionId) {
      found = true;
      return {
        ...s,
        status: 'cancelled' as SubscriptionStatus,
        updated_at: new Date().toISOString(),
      };
    }
    return s;
  });

  if (found) {
    await saveLocalStores();
    notifySubscriptionPauseListeners(subscriptionId);
    return { success: true };
  }
  return { success: false, error: 'Subscription not found' };
}

/**
 * Assigns or updates a meal for a specific family member on a specific weekday.
 */
export async function assignMemberMeal(
  subscriptionId: string,
  memberId: string,
  weekday: number,
  mealKitId: string,
): Promise<{ success: boolean; meal?: SubscriptionMeal; error?: string }> {
  const now = new Date().toISOString();

  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('subscription_meals').upsert(
        {
          subscription_id: subscriptionId,
          member_id: memberId,
          weekday,
          meal_kit_id: mealKitId,
          updated_at: now,
        },
        { onConflict: 'subscription_id,member_id,weekday' },
      );
    } catch {
      // Fallback
    }
  }

  // Update in-memory
  const existingIndex = inMemoryMeals.findIndex(
    (m) =>
      m.subscription_id === subscriptionId && m.member_id === memberId && m.weekday === weekday,
  );

  let updatedMeal: SubscriptionMeal;
  if (existingIndex >= 0) {
    updatedMeal = {
      ...inMemoryMeals[existingIndex]!,
      meal_kit_id: mealKitId,
      updated_at: now,
    };
    inMemoryMeals[existingIndex] = updatedMeal;
  } else {
    updatedMeal = {
      id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subscription_id: subscriptionId,
      member_id: memberId,
      weekday,
      meal_kit_id: mealKitId,
      created_at: now,
      updated_at: now,
    };
    inMemoryMeals.push(updatedMeal);
  }

  await saveLocalStores();
  return { success: true, meal: updatedMeal };
}

/**
 * Clears an assigned meal for a specific member on a specific weekday.
 */
export async function clearMemberMeal(
  subscriptionId: string,
  memberId: string,
  weekday: number,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('subscription_meals')
        .delete()
        .eq('subscription_id', subscriptionId)
        .eq('member_id', memberId)
        .eq('weekday', weekday);
    } catch {
      // Fallback
    }
  }

  inMemoryMeals = inMemoryMeals.filter(
    (m) =>
      !(m.subscription_id === subscriptionId && m.member_id === memberId && m.weekday === weekday),
  );

  await saveLocalStores();
  return { success: true };
}

export const clearMealFromMember = clearMemberMeal;

/**
 * Updates a member's plan between standard and custom.
 * When switching to a standard plan, auto-populates the 7-day schedule with the standard template.
 */
export async function updateMemberPlan(
  subscriptionId: string,
  memberId: string,
  planType: 'standard' | 'custom',
  standardPlanKey?: StandardPlanKey | null,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // 1. Update member row
  inMemoryMembers = inMemoryMembers.map((m) => {
    if (m.subscription_id === subscriptionId && m.member_id === memberId) {
      return {
        ...m,
        plan_type: planType,
        standard_plan_key: standardPlanKey || null,
        updated_at: now,
      };
    }
    return m;
  });

  // 2. If switched to standard plan, replace member's meals with standard template
  if (planType === 'standard' && standardPlanKey) {
    inMemoryMeals = inMemoryMeals.filter(
      (m) => !(m.subscription_id === subscriptionId && m.member_id === memberId),
    );
    const template = resolvePlanMealKits(standardPlanKey);
    for (const t of template) {
      if (t.mealKit) {
        inMemoryMeals.push({
          id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          subscription_id: subscriptionId,
          member_id: memberId,
          weekday: t.weekday,
          meal_kit_id: t.mealKit.id,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  await saveLocalStores();
  return { success: true };
}

/**
 * Updates the covered members list for a family subscription:
 * Recalculates total and computes prorated adjustments if adding members mid-period.
 */
export async function updateCoveredMembers(
  subscriptionId: string,
  newMembers: { id: string; name: string; isDependent: boolean }[],
): Promise<{
  success: boolean;
  adjustment?: ProrationCalculationResult;
  updatedSubscription?: Subscription;
  error?: string;
}> {
  const sub = inMemorySubs.find((s) => s.id === subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  const currentCount = sub.member_count;
  const newCount = newMembers.length;

  // Calculate days remaining in period
  const periodEnd = new Date(sub.period_end).getTime();
  const now = Date.now();
  const diffDays = Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));

  const adjustment = calculateProratedAdjustment({
    currentMemberCount: currentCount,
    newMemberCount: newCount,
    pricePerMemberPerWeek: sub.price_per_member_per_week,
    daysRemainingInPeriod: diffDays,
  });

  const nowIso = new Date().toISOString();
  const updatedSub: Subscription = {
    ...sub,
    member_count: newCount,
    updated_at: nowIso,
  };

  inMemorySubs = inMemorySubs.map((s) => (s.id === subscriptionId ? updatedSub : s));

  // Sync members list
  const existingIds = new Set(newMembers.map((m) => m.id));
  inMemoryMembers = inMemoryMembers.filter(
    (m) => m.subscription_id !== subscriptionId || existingIds.has(m.member_id),
  );

  for (const m of newMembers) {
    const alreadyExists = inMemoryMembers.some(
      (existing) => existing.subscription_id === subscriptionId && existing.member_id === m.id,
    );
    if (!alreadyExists) {
      inMemoryMembers.push({
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        subscription_id: subscriptionId,
        member_id: m.id,
        member_name: m.name,
        is_dependent: m.isDependent,
        plan_type: sub.plan_type,
        standard_plan_key: sub.standard_plan_key,
        plan_group: null,
        price_per_week: sub.price_per_member_per_week || DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK,
        created_at: nowIso,
        updated_at: nowIso,
      });

      // If standard plan, populate template
      if (sub.plan_type === 'standard' && sub.standard_plan_key) {
        const template = resolvePlanMealKits(sub.standard_plan_key);
        for (const t of template) {
          if (t.mealKit) {
            inMemoryMeals.push({
              id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              subscription_id: subscriptionId,
              member_id: m.id,
              weekday: t.weekday,
              meal_kit_id: t.mealKit.id,
              created_at: nowIso,
              updated_at: nowIso,
            });
          }
        }
      }
    }
  }

  await saveLocalStores();

  return {
    success: true,
    adjustment,
    updatedSubscription: updatedSub,
  };
}

/**
 * Fetches all pauses for a given subscription.
 */
export async function fetchSubscriptionPauses(
  subscriptionId: string,
): Promise<{ success: boolean; pauses: SubscriptionPause[]; error?: string }> {
  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subscription_pauses')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('start_date', { ascending: true });
      if (!error && data) {
        return { success: true, pauses: data as SubscriptionPause[] };
      }
    } catch {
      // Fallback to local
    }
  }

  await loadLocalStores();
  const pauses = inMemoryPauses.filter((p) => p.subscription_id === subscriptionId);
  return { success: true, pauses };
}

export interface CreateSubscriptionPauseInput {
  subscriptionId: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dates?: string[]; // Array of highlighted dates YYYY-MM-DD (can be non-contiguous)
  memberId?: string | null;
  createdBy: string;
  now?: Date;
}

/**
 * Creates and records a pause window for a subscription or specific covered member.
 * Enforces all 5 business limits (consecutive days, total days, ranges, cutoff window, inside period)
 * and extends the period_end according to the upfront-payment policy.
 */
export async function createSubscriptionPause(input: CreateSubscriptionPauseInput): Promise<{
  success: boolean;
  pause?: SubscriptionPause;
  subscription?: Subscription;
  extendedPeriodEnd?: string;
  error?: string;
}> {
  await loadLocalStores();
  const sub = inMemorySubs.find((s) => s.id === input.subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  // Fetch existing pauses for this subscription
  const existingPauses = inMemoryPauses.filter((p) => p.subscription_id === input.subscriptionId);

  // 1. If explicit list of highlighted dates provided (supporting non-contiguous dates)
  if (input.dates && input.dates.length > 0) {
    const validation = validateHighlightedPauseDays({
      dates: input.dates,
      existingPauses: existingPauses.map((p) => ({
        startDate: p.start_date,
        endDate: p.end_date,
        daysCount: p.days_count,
        memberId: p.member_id,
      })),
      periodStart: sub.period_start,
      periodEnd: sub.period_end,
      now: input.now,
      memberId: input.memberId,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const createdPauses: SubscriptionPause[] = [];
    for (const range of validation.ranges) {
      const pauseId = `spause_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newPause: SubscriptionPause = {
        id: pauseId,
        subscription_id: input.subscriptionId,
        member_id: input.memberId || null,
        start_date: range.startDate,
        end_date: range.endDate,
        days_count: range.daysCount,
        created_by: input.createdBy,
        created_at: new Date().toISOString(),
      };
      createdPauses.push(newPause);
    }

    // Upfront-payment policy: extend the period end date so skipped days carry on
    const newPeriodEnd = calculateExtendedPeriodEnd(
      sub.period_end,
      validation.daysCount,
    ).toISOString();
    const nextRenewal = sub.next_renewal_at
      ? calculateExtendedPeriodEnd(sub.next_renewal_at, validation.daysCount).toISOString()
      : newPeriodEnd;

    const updatedSub: Subscription = {
      ...sub,
      period_end: newPeriodEnd,
      next_renewal_at: nextRenewal,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseLive()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('subscription_pauses').insert(createdPauses);
        await supabase
          .from('subscriptions')
          .update({
            period_end: newPeriodEnd,
            next_renewal_at: nextRenewal,
            updated_at: updatedSub.updated_at,
          })
          .eq('id', sub.id);
      } catch {
        // Fallback
      }
    }

    inMemorySubs = inMemorySubs.map((s) => (s.id === sub.id ? updatedSub : s));
    inMemoryPauses.push(...createdPauses);
    await saveLocalStores();
    notifySubscriptionPauseListeners(input.subscriptionId);

    return {
      success: true,
      pause: createdPauses[0],
      subscription: updatedSub,
      extendedPeriodEnd: newPeriodEnd,
    };
  }

  if (!input.startDate || !input.endDate) {
    return {
      success: false,
      error: 'Start and end dates or a list of highlighted dates are required',
    };
  }

  // Validate limits using pure evaluator
  const validation = validatePauseSelection({
    startDate: input.startDate,
    endDate: input.endDate,
    existingPauses: existingPauses.map((p) => ({
      startDate: p.start_date,
      endDate: p.end_date,
      daysCount: p.days_count,
      memberId: p.member_id,
    })),
    periodStart: sub.period_start,
    periodEnd: sub.period_end,
    now: input.now,
    memberId: input.memberId,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const pauseId = `spause_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newPause: SubscriptionPause = {
    id: pauseId,
    subscription_id: input.subscriptionId,
    member_id: input.memberId || null,
    start_date: input.startDate,
    end_date: input.endDate,
    days_count: validation.daysCount,
    created_by: input.createdBy,
    created_at: new Date().toISOString(),
  };

  // Upfront-payment policy: extend the period end date by the paused days
  const newPeriodEnd = calculateExtendedPeriodEnd(
    sub.period_end,
    validation.daysCount,
  ).toISOString();
  const nextRenewal = sub.next_renewal_at
    ? calculateExtendedPeriodEnd(sub.next_renewal_at, validation.daysCount).toISOString()
    : newPeriodEnd;

  const updatedSub: Subscription = {
    ...sub,
    period_end: newPeriodEnd,
    next_renewal_at: nextRenewal,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('subscription_pauses').insert(newPause);
      await supabase
        .from('subscriptions')
        .update({
          period_end: newPeriodEnd,
          next_renewal_at: nextRenewal,
          updated_at: updatedSub.updated_at,
        })
        .eq('id', sub.id);
    } catch {
      // Fallback
    }
  }

  inMemorySubs = inMemorySubs.map((s) => (s.id === sub.id ? updatedSub : s));
  inMemoryPauses.push(newPause);
  await saveLocalStores();
  notifySubscriptionPauseListeners(input.subscriptionId);

  return {
    success: true,
    pause: newPause,
    subscription: updatedSub,
    extendedPeriodEnd: newPeriodEnd,
  };
}

/**
 * Removes an existing subscription pause.
 */
export async function removeSubscriptionPause(
  pauseId: string,
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  await loadLocalStores();
  const pauseItem = inMemoryPauses.find((p) => p.id === pauseId);
  if (!pauseItem) {
    return { success: false, error: 'Pause record not found' };
  }

  const sub = inMemorySubs.find((s) => s.id === pauseItem.subscription_id);
  let updatedSub: Subscription | undefined;

  if (sub) {
    const currentEnd = new Date(sub.period_end).getTime();
    const newEndMs = currentEnd - pauseItem.days_count * 24 * 60 * 60 * 1000;
    const newPeriodEnd = new Date(newEndMs).toISOString();

    let newNextRenewal = sub.next_renewal_at;
    if (sub.next_renewal_at) {
      const currentRenewal = new Date(sub.next_renewal_at).getTime();
      const newRenewalMs = currentRenewal - pauseItem.days_count * 24 * 60 * 60 * 1000;
      newNextRenewal = new Date(newRenewalMs).toISOString();
    }

    updatedSub = {
      ...sub,
      period_end: newPeriodEnd,
      next_renewal_at: newNextRenewal,
      updated_at: new Date().toISOString(),
    };
  }

  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('subscription_pauses').delete().eq('id', pauseId);
      if (updatedSub) {
        await supabase
          .from('subscriptions')
          .update({
            period_end: updatedSub.period_end,
            next_renewal_at: updatedSub.next_renewal_at,
            updated_at: updatedSub.updated_at,
          })
          .eq('id', updatedSub.id);
      }
    } catch (err: any) {
      console.warn('[SubscriptionService] Error removing pause from Supabase:', err);
    }
  }

  inMemoryPauses = inMemoryPauses.filter((p) => p.id !== pauseId);
  if (updatedSub) {
    inMemorySubs = inMemorySubs.map((s) => (s.id === updatedSub!.id ? updatedSub! : s));
  }
  await saveLocalStores();
  notifySubscriptionPauseListeners(pauseItem.subscription_id);

  return { success: true, subscription: updatedSub };
}

export interface UnpauseSubscriptionDatesInput {
  subscriptionId: string;
  dates: string[]; // YYYY-MM-DD date strings
  memberId?: string | null;
  now?: Date | string;
}

export interface UnpauseSubscriptionDatesResult {
  success: boolean;
  subscription?: Subscription;
  unpausedCount?: number;
  newPauses?: SubscriptionPause[];
  error?: string;
}

/**
 * Unpauses specific delivery dates for a subscription or member (e.g. if paused by mistake).
 * Splits or removes matching pause records, reduces extended period_end and next_renewal_at accordingly,
 * updates the database and local stores in real time, and notifies active listeners so following
 * meal kits continue on their proper calendar days.
 */
export async function unpauseSubscriptionDates(
  input: UnpauseSubscriptionDatesInput,
): Promise<UnpauseSubscriptionDatesResult> {
  await loadLocalStores();
  const sub = inMemorySubs.find((s) => s.id === input.subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  const nowObj = input.now ? new Date(input.now) : new Date();
  const datesToUnpause = Array.from(new Set(input.dates.map((d) => d.split('T')[0] ?? d))).sort();
  if (datesToUnpause.length === 0) {
    return { success: false, error: 'No dates provided to unpause' };
  }

  // Prevent unpausing days within 48h fulfillment cutoff window or in the past
  for (const dStr of datesToUnpause) {
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(y!, m! - 1, d!);
    if (isDateLockedForPause(dateObj, nowObj)) {
      return {
        success: false,
        error: `Cannot unpause ${dStr} as it is in the past or within the 48-hour delivery packing cutoff window.`,
      };
    }
  }

  const existingPauses = inMemoryPauses.filter((p) => p.subscription_id === input.subscriptionId);
  const pausesToDelete: string[] = [];
  const pausesToInsert: SubscriptionPause[] = [];
  let unpausedCount = 0;
  const datesSet = new Set(datesToUnpause);

  for (const p of existingPauses) {
    const coversMember =
      input.memberId === undefined
        ? true
        : input.memberId === null
          ? p.member_id === null
          : p.member_id === input.memberId || p.member_id === null;

    if (!coversMember) continue;

    const allDatesInP = enumerateDatesInRange(p.start_date, p.end_date);
    const removedDates = allDatesInP.filter((d) => datesSet.has(d));
    if (removedDates.length === 0) continue;

    unpausedCount += removedDates.length;
    pausesToDelete.push(p.id);

    const remainingDates = allDatesInP.filter((d) => !datesSet.has(d));
    if (remainingDates.length > 0) {
      const newRanges = groupDatesIntoRanges(remainingDates);
      for (const r of newRanges) {
        pausesToInsert.push({
          id: `spause_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          subscription_id: sub.id,
          member_id: p.member_id,
          start_date: r.startDate,
          end_date: r.endDate,
          days_count: r.daysCount,
          created_by: p.created_by,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  if (unpausedCount === 0) {
    return {
      success: false,
      error: 'None of the specified dates are currently paused for this subscription/member.',
    };
  }

  // Shrink extended period end and next renewal timestamp by the exact unpaused days count
  const curEndMs = new Date(sub.period_end).getTime();
  const newEndMs = curEndMs - unpausedCount * 24 * 60 * 60 * 1000;
  const newPeriodEnd = new Date(newEndMs).toISOString();

  let newNextRenewal = sub.next_renewal_at;
  if (sub.next_renewal_at) {
    const curRenewMs = new Date(sub.next_renewal_at).getTime();
    const newRenewMs = curRenewMs - unpausedCount * 24 * 60 * 60 * 1000;
    newNextRenewal = new Date(newRenewMs).toISOString();
  }

  const updatedSub: Subscription = {
    ...sub,
    period_end: newPeriodEnd,
    next_renewal_at: newNextRenewal,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      if (pausesToDelete.length > 0) {
        await supabase.from('subscription_pauses').delete().in('id', pausesToDelete);
      }
      if (pausesToInsert.length > 0) {
        await supabase.from('subscription_pauses').insert(pausesToInsert);
      }
      await supabase
        .from('subscriptions')
        .update({
          period_end: updatedSub.period_end,
          next_renewal_at: updatedSub.next_renewal_at,
          updated_at: updatedSub.updated_at,
        })
        .eq('id', updatedSub.id);
    } catch (err: any) {
      console.warn('[SubscriptionService] Supabase error during unpause:', err);
    }
  }

  inMemoryPauses = inMemoryPauses
    .filter((p) => !pausesToDelete.includes(p.id))
    .concat(pausesToInsert);
  inMemorySubs = inMemorySubs.map((s) => (s.id === updatedSub.id ? updatedSub : s));
  await saveLocalStores();
  notifySubscriptionPauseListeners(sub.id);

  return {
    success: true,
    subscription: updatedSub,
    unpausedCount,
    newPauses: inMemoryPauses.filter((p) => p.subscription_id === sub.id),
  };
}

/**
 * Toggles auto_renew on a subscription (Owner only).
 * When toggled off, subscription remains active until period_end and then expires.
 */
export async function toggleAutoRenew(
  subscriptionId: string,
  autoRenew: boolean,
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  await loadLocalStores();
  const sub = inMemorySubs.find((s) => s.id === subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  const updatedSub: Subscription = {
    ...sub,
    auto_renew: autoRenew,
    cancel_at_period_end: !autoRenew,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseLive()) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('subscriptions')
        .update({
          auto_renew: autoRenew,
          cancel_at_period_end: !autoRenew,
          updated_at: updatedSub.updated_at,
        })
        .eq('id', subscriptionId);
    } catch {
      // Fallback
    }
  }

  inMemorySubs = inMemorySubs.map((s) => (s.id === subscriptionId ? updatedSub : s));
  await saveLocalStores();

  return { success: true, subscription: updatedSub };
}

export interface RenewalResult {
  success: boolean;
  subscription?: Subscription;
  alreadyRenewed?: boolean;
  attempts?: number;
  expired?: boolean;
  error?: string;
  reminderSent?: boolean;
}

/**
 * Executes or simulates subscription renewal.
 * Idempotent: uses last_renewed_period_end so the same period is never renewed twice.
 * Retries up to 3 times on payment failure, then transitions status to 'expired'.
 */
export async function processSubscriptionRenewal(
  subscriptionId: string,
  nowOrOptions?: Date | boolean | { now?: Date; forcePaymentFailure?: boolean },
  forcePaymentFailureParam?: boolean,
): Promise<RenewalResult> {
  let now = new Date();
  let forcePaymentFailure = false;

  if (typeof nowOrOptions === 'boolean') {
    forcePaymentFailure = nowOrOptions;
  } else if (nowOrOptions instanceof Date) {
    now = nowOrOptions;
    forcePaymentFailure = !!forcePaymentFailureParam;
  } else if (nowOrOptions && typeof nowOrOptions === 'object') {
    if (nowOrOptions.now) now = nowOrOptions.now;
    if (nowOrOptions.forcePaymentFailure !== undefined) {
      forcePaymentFailure = nowOrOptions.forcePaymentFailure;
    }
  }

  await loadLocalStores();
  const sub = inMemorySubs.find((s) => s.id === subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  if (sub.status !== 'active' && sub.status !== 'paused') {
    return { success: false, error: `Cannot renew subscription in ${sub.status} state` };
  }

  // Idempotency check: if last_renewed_period_end equals current period_end, already charged for this period
  if (sub.last_renewed_period_end && sub.last_renewed_period_end === sub.period_end) {
    return { success: true, subscription: sub, alreadyRenewed: true };
  }

  // If auto-renew is off, let it expire at period_end
  if (!sub.auto_renew || sub.cancel_at_period_end) {
    const expiredSub: Subscription = {
      ...sub,
      status: 'expired',
      updated_at: now.toISOString(),
    };
    inMemorySubs = inMemorySubs.map((s) => (s.id === subscriptionId ? expiredSub : s));
    await saveLocalStores();
    return { success: true, subscription: expiredSub, expired: true };
  }

  // Recalculate total from current covered members & individual plans
  const members = inMemoryMembers.filter((m) => m.subscription_id === subscriptionId);
  const pricing = calculatePerMemberSubscriptionTotal({
    members: members.map((m) => ({
      planType: m.plan_type,
      standardPlanKey: m.standard_plan_key,
      pricePerWeek: m.price_per_week,
    })),
    weeks: 1,
  });

  // Handle payment failure simulation or retry
  if (forcePaymentFailure) {
    const attempts = (sub.renewal_attempts || 0) + 1;
    const isExpired = attempts >= SUBSCRIPTION_RENEWAL_CONFIG.MAX_RENEWAL_ATTEMPTS;
    const failedSub: Subscription = {
      ...sub,
      renewal_attempts: attempts,
      status: isExpired ? 'expired' : sub.status,
      updated_at: now.toISOString(),
    };

    inMemorySubs = inMemorySubs.map((s) => (s.id === subscriptionId ? failedSub : s));
    await saveLocalStores();

    return {
      success: false,
      subscription: failedSub,
      attempts,
      expired: isExpired,
      error: isExpired
        ? 'Maximum renewal attempts exceeded. Subscription has expired.'
        : `Renewal charge failed. Attempt ${attempts} of ${SUBSCRIPTION_RENEWAL_CONFIG.MAX_RENEWAL_ATTEMPTS}.`,
    };
  }

  // Successful renewal: advance period, keep plans, reset retry attempts
  const currentPeriodEndTime = new Date(sub.period_end).getTime();
  const nextPeriodEnd = new Date(currentPeriodEndTime + 7 * 24 * 60 * 60 * 1000).toISOString();

  const renewedSub: Subscription = {
    ...sub,
    period_start: sub.period_end,
    period_end: nextPeriodEnd,
    next_renewal_at: nextPeriodEnd,
    last_renewed_period_end: nextPeriodEnd, // Idempotency watermark
    amount_paid: pricing.total,
    renewal_attempts: 0,
    status: 'active',
    updated_at: now.toISOString(),
  };

  inMemorySubs = inMemorySubs.map((s) => (s.id === subscriptionId ? renewedSub : s));
  await saveLocalStores();

  return {
    success: true,
    subscription: renewedSub,
    alreadyRenewed: false,
  };
}

/**
 * Applies one plan to all covered members in a family subscription.
 * Sets plan_group to denote sharing, while leaving members individually editable afterwards.
 */
export async function applyPlanToAllMembers(
  subscriptionId: string,
  planType: PlanType,
  standardPlanKey?: StandardPlanKey | null,
  planGroup: string = 'shared_all',
): Promise<{ success: boolean; members?: SubscriptionMember[]; error?: string }> {
  await loadLocalStores();
  const sub = inMemorySubs.find((s) => s.id === subscriptionId);
  if (!sub) {
    return { success: false, error: 'Subscription not found' };
  }

  const nowIso = new Date().toISOString();
  const rate =
    planType === 'standard' && standardPlanKey
      ? STANDARD_SUBSCRIPTION_PLANS[standardPlanKey]?.pricePerMemberPerWeek ||
        DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
      : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;

  inMemoryMembers = inMemoryMembers.map((m) => {
    if (m.subscription_id === subscriptionId) {
      return {
        ...m,
        plan_type: planType,
        standard_plan_key: standardPlanKey || null,
        plan_group: planGroup,
        price_per_week: rate,
        updated_at: nowIso,
      };
    }
    return m;
  });

  // If standard plan, update 7-day template meals for all members
  if (planType === 'standard' && standardPlanKey) {
    inMemoryMeals = inMemoryMeals.filter((meal) => meal.subscription_id !== subscriptionId);
    const template = resolvePlanMealKits(standardPlanKey);
    const targetMembers = inMemoryMembers.filter((m) => m.subscription_id === subscriptionId);

    for (const tm of targetMembers) {
      for (const t of template) {
        if (t.mealKit) {
          inMemoryMeals.push({
            id: `smeal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            subscription_id: subscriptionId,
            member_id: tm.member_id,
            weekday: t.weekday,
            meal_kit_id: t.mealKit.id,
            created_at: nowIso,
            updated_at: nowIso,
          });
        }
      }
    }
  }

  await saveLocalStores();
  const updatedMembers = inMemoryMembers.filter((m) => m.subscription_id === subscriptionId);

  return { success: true, members: updatedMembers };
}

/**
 * Updates a member's plan_group tag.
 */
export async function setMemberPlanGroup(
  subscriptionId: string,
  memberId: string,
  planGroup: string | null,
): Promise<{ success: boolean; error?: string }> {
  await loadLocalStores();
  inMemoryMembers = inMemoryMembers.map((m) => {
    if (m.subscription_id === subscriptionId && m.member_id === memberId) {
      return {
        ...m,
        plan_group: planGroup,
        updated_at: new Date().toISOString(),
      };
    }
    return m;
  });

  await saveLocalStores();
  return { success: true };
}

// ─── Realtime & Event Subscriptions for Pauses ──────────────────────────────
type SubscriptionPauseListener = (subscriptionId: string) => void;
const subscriptionPauseListeners = new Set<SubscriptionPauseListener>();

export function subscribeToSubscriptionPauseEvents(
  listener: SubscriptionPauseListener,
): () => void {
  subscriptionPauseListeners.add(listener);
  return () => {
    subscriptionPauseListeners.delete(listener);
  };
}

export function notifySubscriptionPauseListeners(subscriptionId: string): void {
  subscriptionPauseListeners.forEach((listener) => {
    try {
      listener(subscriptionId);
    } catch (err) {
      console.warn('[SubscriptionService] Error in pause listener:', err);
    }
  });
}

/**
 * Subscribes to realtime updates for subscription_pauses in Supabase and in-app event bus.
 */
export function subscribeToSubscriptionPausesRealtime(
  subscriptionId: string,
  onChanged: () => void,
): () => void {
  const unsubInApp = subscribeToSubscriptionPauseEvents((subId) => {
    if (subId === subscriptionId) {
      onChanged();
    }
  });

  if (!isSupabaseLive()) {
    return unsubInApp;
  }

  const unsubSupabase = subscribeToTable<SubscriptionPause>({
    table: 'subscription_pauses',
    filter: `subscription_id=eq.${subscriptionId}`,
    onInsert: () => onChanged(),
    onUpdate: () => onChanged(),
    onDelete: () => onChanged(),
    onResync: onChanged,
  });

  return () => {
    unsubInApp();
    unsubSupabase();
  };
}

/**
 * Subscribes to realtime updates for the subscriptions table in Supabase.
 */
export function subscribeToSubscriptionRealtime(
  subscriptionId: string,
  onChanged: () => void,
): () => void {
  if (!isSupabaseLive()) return () => {};

  return subscribeToTable<Subscription>({
    table: 'subscriptions',
    filter: `id=eq.${subscriptionId}`,
    onUpdate: () => onChanged(),
    onResync: onChanged,
  });
}
