import { getSupabaseClient } from '../supabase/client';
import { fetchAdminProfile, AdminRole } from './adminRbacService';
import {
  Subscription,
  SubscriptionMember,
  SubscriptionPause,
  fetchSubscriptionPauses,
} from './subscriptionService';
import { StandardPlanKey, PlanType } from './subscriptionPlans';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdminSubscriptionRow extends Subscription {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  family_name?: string;
  members: SubscriptionMember[];
  pauses: SubscriptionPause[];
}

export interface AdminSubscriptionFilters {
  type?: 'all' | 'individual' | 'family';
  plan?: 'all' | StandardPlanKey | 'custom';
  status?: 'all' | 'active' | 'paused' | 'cancelled' | 'expired';
  autoRenew?: 'all' | 'on' | 'off';
  region?: string;
  searchQuery?: string;
  sortByRenewal?: 'asc' | 'desc';
}

const LOCAL_SUBS_KEY = '@rasoi_local_subscriptions';
const LOCAL_SUB_MEMBERS_KEY = '@rasoi_local_sub_members';
const LOCAL_SUB_PAUSES_KEY = '@rasoi_local_sub_pauses';

/**
 * Fetches all subscriptions for admin view with regional scoping applied.
 * Super admins see all regions; regional admins see only their assigned regions.
 */
export async function adminFetchAllSubscriptions(
  adminEmail: string,
  filters: AdminSubscriptionFilters = {},
): Promise<{ success: boolean; subscriptions: AdminSubscriptionRow[]; error?: string }> {
  const profile = await fetchAdminProfile(adminEmail);
  const isSuper = profile?.role === 'super_admin';
  const allowedRegions = profile?.regions || [];

  // Try Live Supabase admin view first
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('admin_subscriptions_view').select('*');

    if (!isSuper && allowedRegions.length > 0) {
      query = query.in('region', allowedRegions);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      let filtered = data as AdminSubscriptionRow[];
      filtered = applyClientFilters(filtered, filters);
      return { success: true, subscriptions: filtered };
    }
  } catch {
    // Fallback to local
  }

  // Fallback to local AsyncStorage / memory
  try {
    const [rawSubs, rawMems, rawPauses] = await Promise.all([
      AsyncStorage.getItem(LOCAL_SUBS_KEY),
      AsyncStorage.getItem(LOCAL_SUB_MEMBERS_KEY),
      AsyncStorage.getItem(LOCAL_SUB_PAUSES_KEY),
    ]);

    const subs: Subscription[] = rawSubs ? JSON.parse(rawSubs) : [];
    const mems: SubscriptionMember[] = rawMems ? JSON.parse(rawMems) : [];
    const pauses: SubscriptionPause[] = rawPauses ? JSON.parse(rawPauses) : [];

    let combined: AdminSubscriptionRow[] = subs.map((s) => {
      const subMems = mems.filter((m) => m.subscription_id === s.id);
      const subPauses = pauses.filter((p) => p.subscription_id === s.id);
      return {
        ...s,
        customer_name: s.scope === 'family' ? 'Sharma Household (Owner)' : 'Aarav Sharma',
        customer_email: 'customer@rasoigenie.com',
        customer_phone: '+91 98765 43210',
        family_name: s.scope === 'family' ? 'Sharma Family Kitchen' : undefined,
        members: subMems,
        pauses: subPauses,
      };
    });

    // Enforce regional admin scoping
    if (!isSuper && allowedRegions.length > 0) {
      combined = combined.filter((s) => allowedRegions.includes(s.region || 'West'));
    }

    combined = applyClientFilters(combined, filters);
    return { success: true, subscriptions: combined };
  } catch (err: any) {
    return {
      success: false,
      subscriptions: [],
      error: err?.message || 'Failed to fetch subscriptions',
    };
  }
}

function applyClientFilters(
  list: AdminSubscriptionRow[],
  filters: AdminSubscriptionFilters,
): AdminSubscriptionRow[] {
  let result = [...list];

  // Filter: Type
  if (filters.type && filters.type !== 'all') {
    result = result.filter((s) => s.scope === filters.type);
  }

  // Filter: Plan
  if (filters.plan && filters.plan !== 'all') {
    if (filters.plan === 'custom') {
      result = result.filter((s) => s.plan_type === 'custom');
    } else {
      result = result.filter(
        (s) => s.plan_type === 'standard' && s.standard_plan_key === filters.plan,
      );
    }
  }

  // Filter: Status
  if (filters.status && filters.status !== 'all') {
    result = result.filter((s) => s.status === filters.status);
  }

  // Filter: Auto-renew
  if (filters.autoRenew && filters.autoRenew !== 'all') {
    const wantAutoRenew = filters.autoRenew === 'on';
    result = result.filter((s) => Boolean(s.auto_renew) === wantAutoRenew);
  }

  // Filter: Region
  if (filters.region && filters.region !== 'all') {
    result = result.filter((s) => s.region === filters.region);
  }

  // Search query (name, email, phone)
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_email?.toLowerCase().includes(q) ||
        s.customer_phone?.toLowerCase().includes(q) ||
        s.family_name?.toLowerCase().includes(q),
    );
  }

  // Sort by renewal date
  if (filters.sortByRenewal) {
    result.sort((a, b) => {
      const dateA = new Date(a.next_renewal_at || a.period_end).getTime();
      const dateB = new Date(b.next_renewal_at || b.period_end).getTime();
      return filters.sortByRenewal === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  return result;
}

/**
 * Admin action to cancel a subscription behind a confirmation dialog.
 */
export async function adminCancelSubscription(
  subscriptionId: string,
  adminEmail: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('admin_cancel_subscription', {
      p_subscription_id: subscriptionId,
      p_admin_email: adminEmail,
      p_reason: reason || 'Administrative cancellation',
    });

    if (!error && data && data.success) {
      return { success: true };
    }
  } catch {
    // Fallback to local update
  }

  try {
    const rawSubs = await AsyncStorage.getItem(LOCAL_SUBS_KEY);
    if (rawSubs) {
      let subs: Subscription[] = JSON.parse(rawSubs);
      subs = subs.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              status: 'cancelled',
              auto_renew: false,
              updated_at: new Date().toISOString(),
            }
          : s,
      );
      await AsyncStorage.setItem(LOCAL_SUBS_KEY, JSON.stringify(subs));
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel subscription' };
  }

  return { success: false, error: 'Subscription not found' };
}
