import {
  getReferralSettings,
  updateReferralSettings,
  getCustomerReferralStats,
  getCustomerReferralsList,
  registerReferralCode,
  qualifyReferralOrder,
  buildReferralShareMessage,
} from '../services/referralService';

// Mock Supabase client
jest.mock('../supabase/client', () => {
  let settingsState = {
    id: 1,
    referrer_reward: 300,
    referred_reward: 200,
    referral_credit_expiry_days: 60,
    min_qualifying_order_amount: 0,
    max_referrals_per_customer: 20,
    programme_enabled: true,
    qualification_event: 'FIRST_ORDER_DELIVERED',
    created_at: '2026-10-05T00:00:00Z',
    updated_at: '2026-10-05T00:00:00Z',
  };

  const mockRpc = jest.fn((fnName: string, args: any) => {
    if (fnName === 'register_referral') {
      if (args.p_referral_code === 'SELF_CODE') {
        return Promise.resolve({
          data: { success: false, error: 'You cannot use your own referral code' },
          error: null,
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          referral_id: 'mock_ref_1',
          referrer_reward: 300,
          referred_reward: 200,
        },
        error: null,
      });
    }
    if (fnName === 'qualify_referral') {
      return Promise.resolve({
        data: {
          success: true,
          referral_id: 'mock_ref_1',
          rewarded: true,
        },
        error: null,
      });
    }
    if (fnName === 'create_wallet_for_user') {
      return Promise.resolve({
        data: {
          success: true,
          wallet_id: 'wallet_1',
          referral_code: 'RASOI5678',
        },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const mockFrom = jest.fn((table: string) => {
    if (table === 'referral_settings') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: settingsState, error: null }),
        update: jest.fn((newVals: any) => ({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() => {
            settingsState = { ...settingsState, ...newVals };
            return Promise.resolve({ data: settingsState, error: null });
          }),
        })),
      };
    }
    if (table === 'referral_codes') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { code: 'RASOI5678', is_active: true },
          error: null,
        }),
      };
    }
    if (table === 'referrals') {
      const mockResult = {
        data: [
          {
            id: 'ref-1',
            referrer_id: 'user_1',
            referred_id: 'user_2',
            status: 'REWARDED',
            referrer_reward_amount: 300,
            referred_reward_amount: 200,
            created_at: '2026-10-05T00:00:00Z',
          },
        ],
        error: null,
      };
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockResult),
        then: (onfulfilled: any, onrejected: any) =>
          Promise.resolve(mockResult).then(onfulfilled, onrejected),
      };
      return queryBuilder;
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
  });

  return {
    getSupabaseClient: () => ({
      rpc: mockRpc,
      from: mockFrom,
    }),
  };
});

describe('referralService', () => {
  it('retrieves referral programme settings', async () => {
    const res = await getReferralSettings();
    expect(res.success).toBe(true);
    expect(res.data?.referrer_reward).toBe(300);
    expect(res.data?.referred_reward).toBe(200);
    expect(res.data?.programme_enabled).toBe(true);
  });

  it('updates referral settings (admin operation)', async () => {
    const updateRes = await updateReferralSettings({
      referrer_reward: 350,
      referred_reward: 250,
    });
    expect(updateRes.success).toBe(true);
    expect(updateRes.data?.referrer_reward).toBe(350);
  });

  it('builds clear referral share message for social apps', () => {
    const share = buildReferralShareMessage('RASOI999', 200);
    expect(share.title).toContain('Invite Friends');
    expect(share.message).toContain('RASOI999');
    expect(share.message).toContain('₹200');
    expect(share.url).toContain('RASOI999');
  });

  it('fetches customer referral statistics', async () => {
    const res = await getCustomerReferralStats('user_1');
    expect(res.success).toBe(true);
    expect(res.data?.currentCode).toBe('RASOI5678');
    expect(res.data?.successfulReferrals).toBe(1);
    expect(res.data?.totalEarnings).toBe(300);
  });

  it('fetches customer referrals history list', async () => {
    const res = await getCustomerReferralsList('user_1');
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data?.[0].status).toBe('REWARDED');
  });

  it('registers a referee with a friend referral code', async () => {
    const res = await registerReferralCode('RASOI5678', 'user_2');
    expect(res.success).toBe(true);
    expect(res.data?.referralId).toBe('mock_ref_1');
  });

  it('prevents self-referral', async () => {
    const res = await registerReferralCode('SELF_CODE', 'user_1');
    expect(res.success).toBe(false);
    expect(res.error).toContain('cannot use your own');
  });

  it('qualifies referral when order completes', async () => {
    const res = await qualifyReferralOrder('user_2', 'ORD_202');
    expect(res.success).toBe(true);
    expect(res.data?.rewarded).toBe(true);
  });
});
