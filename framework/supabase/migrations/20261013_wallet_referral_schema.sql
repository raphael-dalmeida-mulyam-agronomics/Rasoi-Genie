-- ==============================================================================
-- RasoiGenie Missing Tables Migration: Wallet, Credit Lots & Referrals
-- Date: 2026-10-13
-- Run this in the Supabase SQL Editor to eliminate 404 errors for credit_lots and referral_codes
-- ==============================================================================

-- 1. Referral Settings
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  referrer_reward NUMERIC(12,2) NOT NULL DEFAULT 300.00,
  referred_reward NUMERIC(12,2) NOT NULL DEFAULT 200.00,
  referral_credit_expiry_days INTEGER NOT NULL DEFAULT 60,
  min_qualifying_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  max_referrals_per_customer INTEGER,
  programme_enabled BOOLEAN NOT NULL DEFAULT true,
  qualification_event TEXT NOT NULL DEFAULT 'FIRST_ORDER_DELIVERED'
    CHECK (qualification_event IN ('FIRST_ORDER_DELIVERED', 'FIRST_ORDER_PAID')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT referral_settings_singleton CHECK (id = 1)
);

INSERT INTO public.referral_settings (
  id, referrer_reward, referred_reward, referral_credit_expiry_days,
  programme_enabled, qualification_event
)
VALUES (1, 300.00, 200.00, 60, true, 'FIRST_ORDER_DELIVERED')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_settings_select_all" ON public.referral_settings;
CREATE POLICY "referral_settings_select_all" ON public.referral_settings FOR SELECT USING (true);

-- 2. Referral Codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_codes_select" ON public.referral_codes;
CREATE POLICY "referral_codes_select" ON public.referral_codes FOR SELECT USING (true);
DROP POLICY IF EXISTS "referral_codes_insert_system" ON public.referral_codes;
CREATE POLICY "referral_codes_insert_system" ON public.referral_codes FOR INSERT WITH CHECK (true);

-- 3. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL UNIQUE,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'QUALIFIED', 'REWARDED', 'REVERSED', 'FLAGGED')),
  qualifying_order_id TEXT,
  referrer_reward_amount NUMERIC(12,2),
  referred_reward_amount NUMERIC(12,2),
  reward_issued_at TIMESTAMPTZ,
  reversal_reason TEXT,
  flagged_reason TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select" ON public.referrals;
CREATE POLICY "referrals_select" ON public.referrals FOR SELECT USING (true);
DROP POLICY IF EXISTS "referrals_insert_system" ON public.referrals;
CREATE POLICY "referrals_insert_system" ON public.referrals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "referrals_update_system" ON public.referrals;
CREATE POLICY "referrals_update_system" ON public.referrals FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Credit Lots
CREATE TABLE IF NOT EXISTS public.credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('ORDER_REFUND', 'REFERRAL', 'REFERRAL_BONUS', 'PROMOTION', 'LOYALTY', 'ADMIN_ADJUSTMENT')),
  original_amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  expires_at TIMESTAMPTZ,
  reference_id TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVERSED')),
  issued_by_admin_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT credit_lots_remaining_non_negative CHECK (remaining_amount >= 0),
  CONSTRAINT credit_lots_original_positive CHECK (original_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_credit_lots_wallet_id ON public.credit_lots(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_lots_user_id ON public.credit_lots(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_lots_status ON public.credit_lots(status);
CREATE INDEX IF NOT EXISTS idx_credit_lots_expires_at ON public.credit_lots(expires_at);

ALTER TABLE public.credit_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_lots_select" ON public.credit_lots;
CREATE POLICY "credit_lots_select" ON public.credit_lots FOR SELECT USING (true);
DROP POLICY IF EXISTS "credit_lots_insert" ON public.credit_lots;
CREATE POLICY "credit_lots_insert" ON public.credit_lots FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "credit_lots_update" ON public.credit_lots;
CREATE POLICY "credit_lots_update" ON public.credit_lots FOR UPDATE USING (true);

-- 5. Wallet Transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('CREDIT', 'DEBIT', 'HOLD', 'RELEASE_HOLD', 'EXPIRE', 'REVERSAL')),
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  credit_lot_id UUID,
  reference_id TEXT,
  description TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_transactions_select" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select" ON public.wallet_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "wallet_transactions_insert" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (true);
