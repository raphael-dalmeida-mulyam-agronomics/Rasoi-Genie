import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://duokelhwmmkuoceuweuz.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_B2eyDzwM3SvTe8P3eJ8MBw_reqZmJCm';

export const testSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function testRegisterReferralCode(referralCode: string, referredUserId: string) {
  try {
    const { data, error } = await testSupabase.rpc('register_referral', {
      p_referral_code: referralCode.trim().toUpperCase(),
      p_referred_user_id: referredUserId,
      p_idempotency_key: `ref_reg_${referredUserId}_${Date.now()}`,
    });
    if (error) return { success: false, error: error.message };
    return data || { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Referral error' };
  }
}

export async function testQualifyReferralOrder(referredUserId: string, orderId: string) {
  try {
    const { data, error } = await testSupabase.rpc('qualify_referral', {
      p_referred_user_id: referredUserId,
      p_qualifying_order_id: orderId,
      p_idempotency_key: `qual_${referredUserId}_${orderId}`,
    });
    if (error) return { success: false, error: error.message };
    return data || { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Qualify error' };
  }
}

export async function testGetWalletBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await testSupabase
      .from('wallets')
      .select('available_balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return 0;
    return Number(data.available_balance || 0);
  } catch {
    return 0;
  }
}
