import { getSupabaseClient } from '../supabase/client';
import { isMissingSchemaError } from './supabaseUtils';

export interface ReferralSettings {
  id: number;
  referrer_reward: number;
  referred_reward: number;
  referral_credit_expiry_days: number;
  min_qualifying_order_amount: number;
  max_referrals_per_customer: number | null;
  programme_enabled: boolean;
  qualification_event: 'FIRST_ORDER_DELIVERED' | 'FIRST_ORDER_PAID';
  created_at: string;
  updated_at: string;
}

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REVERSED' | 'FLAGGED';

export interface ReferralItem {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code_id: string;
  status: ReferralStatus;
  qualifying_order_id: string | null;
  referrer_reward_amount: number | null;
  referred_reward_amount: number | null;
  reward_issued_at: string | null;
  reversal_reason: string | null;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
  referred_user_name?: string;
  referred_user_email?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  currentCode: string;
  programmeEnabled: boolean;
  rewardPerReferral: number;
  referredFriendReward: number;
}

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Referral Settings ────────────────────────────────────────────────────────

/**
 * Fetches the active referral programme settings.
 */
export async function getReferralSettings(): Promise<ServiceResult<ReferralSettings>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('referral_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[ReferralService] getReferralSettings error:', error.message);
      }
      return {
        success: true,
        data: {
          id: 1,
          referrer_reward: 300,
          referred_reward: 200,
          referral_credit_expiry_days: 60,
          min_qualifying_order_amount: 0,
          max_referrals_per_customer: 20,
          programme_enabled: true,
          qualification_event: 'FIRST_ORDER_DELIVERED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    if (!data) {
      return {
        success: true,
        data: {
          id: 1,
          referrer_reward: 300,
          referred_reward: 200,
          referral_credit_expiry_days: 60,
          min_qualifying_order_amount: 0,
          max_referrals_per_customer: 20,
          programme_enabled: true,
          qualification_event: 'FIRST_ORDER_DELIVERED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    return { success: true, data: data as ReferralSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch referral settings' };
  }
}

/**
 * Updates referral programme settings. Admin-only.
 */
export async function updateReferralSettings(
  settings: Partial<Omit<ReferralSettings, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ServiceResult<ReferralSettings>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('referral_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ReferralSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update referral settings' };
  }
}

// ─── Customer Referral Code & Stats ──────────────────────────────────────────

/**
 * Gets or creates the customer's referral code and overall referral statistics.
 */
export async function getCustomerReferralStats(userId: string): Promise<ServiceResult<ReferralStats>> {
  try {
    const supabase = getSupabaseClient();

    // 1. Get settings
    const settingsRes = await getReferralSettings();
    const settings = settingsRes.data;

    // 2. Fetch or create referral code
    let code = '';
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();

    if (codeData?.code) {
      code = codeData.code;
    } else {
      // Trigger wallet/code creation via RPC
      const { data: createData } = await supabase.rpc('create_wallet_for_user', {
        p_user_id: userId,
      });
      if (createData?.referral_code) {
        code = createData.referral_code;
      } else {
        // Fallback fetch
        const { data: retryData } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('user_id', userId)
          .maybeSingle();
        code = retryData?.code || 'RASOI' + userId.slice(-4).toUpperCase();
      }
    }

    // 3. Fetch referrals where user is referrer
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    if (refError) {
      if (!isMissingSchemaError(refError)) {
        console.warn('[ReferralService] referrals query error:', refError.message);
      }
    }

    const items = (referrals as ReferralItem[]) || [];
    const successful = items.filter((r) => r.status === 'REWARDED' || r.status === 'QUALIFIED').length;
    const pending = items.filter((r) => r.status === 'PENDING').length;
    const totalEarnings = items
      .filter((r) => r.status === 'REWARDED')
      .reduce((sum, r) => sum + (r.referrer_reward_amount || 0), 0);

    return {
      success: true,
      data: {
        totalReferrals: items.length,
        successfulReferrals: successful,
        pendingReferrals: pending,
        totalEarnings,
        currentCode: code,
        programmeEnabled: settings?.programme_enabled ?? true,
        rewardPerReferral: settings?.referrer_reward ?? 300,
        referredFriendReward: settings?.referred_reward ?? 200,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch customer referral stats' };
  }
}

/**
 * Fetches the list of friends referred by the current user.
 */
export async function getCustomerReferralsList(userId: string): Promise<ServiceResult<ReferralItem[]>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as ReferralItem[]) ?? [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch referrals list' };
  }
}

// ─── Registration & Qualification ───────────────────────────────────────────

/**
 * Registers a referee under a referral code.
 * Safe to call during signup or before first order.
 */
export async function registerReferralCode(
  referralCode: string,
  referredUserId: string,
  idempotencyKey?: string,
): Promise<ServiceResult<{ referralId: string; referrerReward: number; referredReward: number }>> {
  try {
    const cleanCode = referralCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a valid referral code' };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('register_referral', {
      p_referral_code: cleanCode,
      p_referred_user_id: referredUserId,
      p_idempotency_key: idempotencyKey || `ref_reg_${referredUserId}_${Date.now()}`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to apply referral code' };
    }

    return {
      success: true,
      data: {
        referralId: data.referral_id,
        referrerReward: data.referrer_reward,
        referredReward: data.referred_reward,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register referral code' };
  }
}

/**
 * Qualifies a referral when the referee's first order is placed/delivered.
 */
export async function qualifyReferralOrder(
  referredUserId: string,
  orderId: string,
  idempotencyKey?: string,
): Promise<ServiceResult<{ rewarded: boolean; message?: string }>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('qualify_referral', {
      p_referred_user_id: referredUserId,
      p_qualifying_order_id: orderId,
      p_idempotency_key: idempotencyKey || `qual_${referredUserId}_${orderId}`,
    });

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[ReferralService] qualify_referral RPC error:', error.message);
      }
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Referral qualification failed' };
    }

    return { success: true, data: { rewarded: true, message: data.message } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to qualify referral' };
  }
}

/**
 * Generates a sharable referral text and link for WhatsApp, SMS, or copy-paste.
 */
export function buildReferralShareMessage(code: string, friendReward = 200): { title: string; message: string; url: string } {
  const url = `https://rasoigenie.in/join?ref=${code}`;
  const message = `Hey! Cook restaurant-quality meals at home with Rasoi-Genie! Use my referral code *${code}* to get ₹${friendReward} free credits in your wallet on your first order. Download the app or order here: ${url}`;
  return {
    title: 'Invite Friends to Rasoi-Genie',
    message,
    url,
  };
}
