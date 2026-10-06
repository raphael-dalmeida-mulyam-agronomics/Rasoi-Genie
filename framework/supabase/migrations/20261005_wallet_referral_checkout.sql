-- ==============================================================================
-- RasoiGenie Migration: Credits Wallet, Referral Programme, Checkout & Payment
-- Date: 2026-10-05
-- ADDITIVE migration — does NOT destructively alter existing tables.
-- All new tables use IF NOT EXISTS; existing columns use ADD COLUMN IF NOT EXISTS.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: REFERRAL SETTINGS (singleton configuration table)
-- Administrators modify this via the Admin Dashboard — NOT code deploys.
-- ==============================================================================
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

CREATE POLICY "referral_settings_select_all"
  ON public.referral_settings FOR SELECT USING (true);

CREATE POLICY "referral_settings_update_super_admin"
  ON public.referral_settings FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- SECTION 2: REFERRAL CODES
-- One unique code per customer, generated server-side via RPC.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES public.user_profiles(uid) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_select" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "referral_codes_insert_system" ON public.referral_codes FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- SECTION 3: REFERRALS
-- Tracks referrer <-> referred relationship. referred_id is UNIQUE.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES public.user_profiles(uid) ON DELETE RESTRICT,
  referred_id TEXT NOT NULL UNIQUE REFERENCES public.user_profiles(uid) ON DELETE RESTRICT,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE RESTRICT,
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

CREATE POLICY "referrals_select"
  ON public.referrals FOR SELECT
  USING (
    referrer_id = auth.uid()::text
    OR referred_id = auth.uid()::text
    OR public.is_super_admin()
  );

CREATE POLICY "referrals_insert_system" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "referrals_update_system" ON public.referrals FOR UPDATE USING (true) WITH CHECK (true);

-- ==============================================================================
-- SECTION 4: WALLETS
-- One wallet per customer. available_balance is maintained atomically by RPCs.
-- Direct client writes are blocked by RLS; all mutations go through RPC functions.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES public.user_profiles(uid) ON DELETE CASCADE,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reserved_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT wallets_available_non_negative CHECK (available_balance >= 0),
  CONSTRAINT wallets_reserved_non_negative CHECK (reserved_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_super_admin());

-- Block all direct client writes — RPC SECURITY DEFINER functions bypass RLS
CREATE POLICY "wallets_no_direct_insert" ON public.wallets FOR INSERT WITH CHECK (false);
CREATE POLICY "wallets_no_direct_update" ON public.wallets FOR UPDATE USING (false);
CREATE POLICY "wallets_no_direct_delete" ON public.wallets FOR DELETE USING (false);

-- ==============================================================================
-- SECTION 5: CREDIT LOTS
-- Individual credit pools per source. Enables accurate expiry and source breakdown.
-- ORDER_REFUND lots have expires_at = NULL (never expire).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('ORDER_REFUND', 'REFERRAL', 'REFERRAL_BONUS', 'PROMOTION', 'LOYALTY', 'ADMIN_ADJUSTMENT')),
  original_amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  expires_at TIMESTAMPTZ,        -- NULL = never expires
  reference_id TEXT,             -- order_id / referral_id / campaign_id
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

CREATE POLICY "credit_lots_select_own"
  ON public.credit_lots FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_super_admin());

CREATE POLICY "credit_lots_no_direct_insert" ON public.credit_lots FOR INSERT WITH CHECK (false);
CREATE POLICY "credit_lots_no_direct_update" ON public.credit_lots FOR UPDATE USING (false);

-- ==============================================================================
-- SECTION 6: WALLET TRANSACTIONS (Immutable Audit Ledger)
-- Every wallet operation produces an immutable ledger entry.
-- Corrections use REVERSAL transaction type — never edit existing rows.
-- Idempotency key enforced at DB level to prevent duplicate processing.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'REFUND', 'REVERSAL', 'EXPIRY', 'RESERVATION', 'RELEASE')),
  source TEXT NOT NULL
    CHECK (source IN ('ORDER_REFUND', 'REFERRAL', 'REFERRAL_BONUS', 'PROMOTION', 'LOYALTY', 'ADMIN_ADJUSTMENT', 'ORDER_PAYMENT', 'SYSTEM')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reference_id TEXT,
  order_id TEXT,
  credit_lot_ids UUID[],
  description TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
    CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
  idempotency_key TEXT UNIQUE,
  admin_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- No updated_at: immutable ledger. Use REVERSAL for corrections.
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_order_id ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_idempotency ON public.wallet_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_txn_select_own"
  ON public.wallet_transactions FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_super_admin());

-- Immutable — no direct client writes
CREATE POLICY "wallet_txn_no_direct_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (false);
CREATE POLICY "wallet_txn_no_direct_update" ON public.wallet_transactions FOR UPDATE USING (false);
CREATE POLICY "wallet_txn_no_direct_delete" ON public.wallet_transactions FOR DELETE USING (false);

-- ==============================================================================
-- SECTION 7: ALTER ORDERS TABLE — additive columns only
-- ==============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_credits_applied NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS external_payment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS refund_method TEXT
    CHECK (refund_method IN ('WALLET', 'ORIGINAL_PAYMENT', 'SPLIT') OR refund_method IS NULL),
  ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_notes TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS wallet_debit_transaction_id UUID;

-- ==============================================================================
-- SECTION 8: RPC — create_wallet_for_user
-- Creates wallet + referral code atomically. Idempotent.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_wallet_for_user(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_code TEXT;
  v_display_name TEXT;
  v_attempts INTEGER := 0;
BEGIN
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
  IF v_wallet_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'wallet_id', v_wallet_id, 'already_existed', true);
  END IF;

  INSERT INTO public.wallets (user_id, available_balance, reserved_balance, currency)
  VALUES (p_user_id, 0.00, 0.00, 'INR')
  RETURNING id INTO v_wallet_id;

  IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE user_id = p_user_id) THEN
    SELECT UPPER(REGEXP_REPLACE(COALESCE(SUBSTRING(display_name FROM 1 FOR 4), 'RASO'), '[^A-Z]', '', 'g'))
    INTO v_display_name
    FROM public.user_profiles WHERE uid = p_user_id;

    LOOP
      v_code := COALESCE(NULLIF(v_display_name, ''), 'RASO')
        || UPPER(SUBSTRING(MD5(p_user_id || RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 3));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code);
      v_attempts := v_attempts + 1;
      IF v_attempts >= 10 THEN
        v_code := UPPER(SUBSTRING(MD5(p_user_id) FROM 1 FOR 7));
        EXIT;
      END IF;
    END LOOP;

    INSERT INTO public.referral_codes (user_id, code, is_active)
    VALUES (p_user_id, v_code, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN json_build_object('success', true, 'wallet_id', v_wallet_id, 'already_existed', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 9: RPC — credit_wallet
-- Issues credits, creates credit lot, writes ledger entry. Idempotent.
-- p_expires_in_days NULL = never expires (ORDER_REFUND).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT NULL,
  p_admin_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_lot_id UUID;
  v_txn_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_existing_txn_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Credit amount must be positive');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_txn_id
    FROM public.wallet_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_existing_txn_id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'idempotent_replay', true, 'transaction_id', v_existing_txn_id);
    END IF;
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
  IF v_wallet_id IS NULL THEN
    PERFORM public.create_wallet_for_user(p_user_id);
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
  END IF;

  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := NULL;
  END IF;

  INSERT INTO public.credit_lots (
    wallet_id, user_id, source, original_amount, remaining_amount,
    expires_at, reference_id, description, status, issued_by_admin_id
  )
  VALUES (
    v_wallet_id, p_user_id, p_source, p_amount, p_amount,
    v_expires_at, p_reference_id, p_description, 'ACTIVE', p_admin_id
  )
  RETURNING id INTO v_lot_id;

  UPDATE public.wallets
  SET available_balance = available_balance + p_amount, updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, transaction_type, source, amount, currency,
    reference_id, description, status, idempotency_key, admin_id, credit_lot_ids
  )
  VALUES (
    v_wallet_id, p_user_id, 'CREDIT', p_source, p_amount, 'INR',
    p_reference_id, p_description, 'COMPLETED', p_idempotency_key, p_admin_id, ARRAY[v_lot_id]
  )
  RETURNING id INTO v_txn_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_txn_id,
    'credit_lot_id', v_lot_id,
    'new_balance', (SELECT available_balance FROM public.wallets WHERE id = v_wallet_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 10: RPC — debit_wallet
-- Expiry-first consumption: soonest-expiring lots consumed first.
-- ORDER_REFUND (never-expiring) lots consumed LAST.
-- Row-level lock prevents concurrent double-spend.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_order_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_available NUMERIC;
  v_remaining_to_debit NUMERIC;
  v_lot RECORD;
  v_debit_from_lot NUMERIC;
  v_affected_lot_ids UUID[] := '{}';
  v_txn_id UUID;
  v_existing_txn_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Debit amount must be positive');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_txn_id
    FROM public.wallet_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_existing_txn_id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'idempotent_replay', true, 'transaction_id', v_existing_txn_id);
    END IF;
  END IF;

  SELECT id, available_balance INTO v_wallet_id, v_available
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_available < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance',
      'available', v_available, 'requested', p_amount);
  END IF;

  -- Mark expired lots
  UPDATE public.credit_lots
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE wallet_id = v_wallet_id AND status = 'ACTIVE'
    AND expires_at IS NOT NULL AND expires_at < NOW();

  v_remaining_to_debit := p_amount;

  FOR v_lot IN
    SELECT id, remaining_amount FROM public.credit_lots
    WHERE wallet_id = v_wallet_id AND status = 'ACTIVE' AND remaining_amount > 0
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY
      (expires_at IS NULL) ASC,   -- expiring lots first, non-expiring last
      expires_at ASC NULLS LAST,
      created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_debit <= 0;
    v_debit_from_lot := LEAST(v_lot.remaining_amount, v_remaining_to_debit);
    UPDATE public.credit_lots
    SET remaining_amount = remaining_amount - v_debit_from_lot,
        status = CASE WHEN remaining_amount - v_debit_from_lot <= 0.001 THEN 'EXHAUSTED' ELSE 'ACTIVE' END,
        updated_at = NOW()
    WHERE id = v_lot.id;
    v_affected_lot_ids := v_affected_lot_ids || v_lot.id;
    v_remaining_to_debit := v_remaining_to_debit - v_debit_from_lot;
  END LOOP;

  IF v_remaining_to_debit > 0.01 THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient active credit lots');
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount, updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, transaction_type, source, amount, currency,
    order_id, reference_id, description, status, idempotency_key, credit_lot_ids
  )
  VALUES (
    v_wallet_id, p_user_id, 'DEBIT', 'ORDER_PAYMENT', p_amount, 'INR',
    p_order_id, p_order_id,
    COALESCE(p_description, 'Order payment from wallet'),
    'COMPLETED', p_idempotency_key, v_affected_lot_ids
  )
  RETURNING id INTO v_txn_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_txn_id,
    'amount_debited', p_amount,
    'new_balance', (SELECT available_balance FROM public.wallets WHERE id = v_wallet_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 11: RPC — reverse_wallet_debit
-- Reversal for cancelled/refunded wallet-paid orders.
-- Re-credits as ORDER_REFUND (never expires).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reverse_wallet_debit(
  p_original_transaction_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_txn RECORD;
  v_reversal_txn_id UUID;
  v_existing_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.wallet_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'idempotent_replay', true, 'transaction_id', v_existing_id);
    END IF;
  END IF;

  SELECT * INTO v_original_txn FROM public.wallet_transactions WHERE id = p_original_transaction_id;

  IF v_original_txn.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Original transaction not found');
  END IF;
  IF v_original_txn.transaction_type <> 'DEBIT' THEN
    RETURN json_build_object('success', false, 'error', 'Can only reverse DEBIT transactions');
  END IF;
  IF v_original_txn.status = 'REVERSED' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction already reversed');
  END IF;

  UPDATE public.wallet_transactions SET status = 'REVERSED' WHERE id = p_original_transaction_id;

  PERFORM public.credit_wallet(
    v_original_txn.user_id, v_original_txn.amount, 'ORDER_REFUND',
    v_original_txn.order_id,
    COALESCE(p_reason, 'Refund for cancelled order'),
    COALESCE(p_idempotency_key, p_original_transaction_id::TEXT) || '_refund_credit',
    NULL  -- no expiry for ORDER_REFUND
  );

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, transaction_type, source, amount, currency,
    order_id, reference_id, description, status, idempotency_key
  )
  VALUES (
    v_original_txn.wallet_id, v_original_txn.user_id, 'REVERSAL', 'ORDER_REFUND',
    v_original_txn.amount, 'INR',
    v_original_txn.order_id, p_original_transaction_id::TEXT,
    COALESCE(p_reason, 'Reversal of order payment'), 'COMPLETED', p_idempotency_key
  )
  RETURNING id INTO v_reversal_txn_id;

  RETURN json_build_object(
    'success', true,
    'reversal_transaction_id', v_reversal_txn_id,
    'refunded_amount', v_original_txn.amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 12: RPC — get_wallet_balance
-- Returns balance, source breakdown, and credits expiring within 14 days.
-- Auto-creates wallet if missing (handles existing users at first call).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_refund_balance NUMERIC;
  v_referral_balance NUMERIC;
  v_promo_balance NUMERIC;
  v_expiring_soon JSONB;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF v_wallet.id IS NULL THEN
    PERFORM public.create_wallet_for_user(p_user_id);
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  END IF;

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_refund_balance
  FROM public.credit_lots
  WHERE wallet_id = v_wallet.id AND status = 'ACTIVE' AND source = 'ORDER_REFUND'
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_referral_balance
  FROM public.credit_lots
  WHERE wallet_id = v_wallet.id AND status = 'ACTIVE'
    AND source IN ('REFERRAL', 'REFERRAL_BONUS', 'LOYALTY')
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_promo_balance
  FROM public.credit_lots
  WHERE wallet_id = v_wallet.id AND status = 'ACTIVE'
    AND source IN ('PROMOTION', 'ADMIN_ADJUSTMENT')
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id, 'source', source,
      'remaining_amount', remaining_amount,
      'expires_at', expires_at,
      'description', description
    ) ORDER BY expires_at ASC
  ), '[]'::JSON)
  INTO v_expiring_soon
  FROM public.credit_lots
  WHERE wallet_id = v_wallet.id AND status = 'ACTIVE'
    AND expires_at IS NOT NULL AND expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '14 days'
    AND remaining_amount > 0;

  RETURN json_build_object(
    'wallet_id', v_wallet.id,
    'user_id', v_wallet.user_id,
    'available_balance', v_wallet.available_balance,
    'reserved_balance', v_wallet.reserved_balance,
    'currency', v_wallet.currency,
    'breakdown', json_build_object(
      'refund_credits', v_refund_balance,
      'referral_credits', v_referral_balance,
      'promotional_credits', v_promo_balance
    ),
    'expiring_soon', v_expiring_soon,
    'updated_at', v_wallet.updated_at
  );
END;
$$;

-- ==============================================================================
-- SECTION 13: RPC — register_referral
-- Validates referral code and creates a PENDING referral record.
-- Prevents self-referral, duplicate referral, inactive programme.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.register_referral(
  p_referred_user_id TEXT,
  p_referral_code TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_settings RECORD;
  v_referral_id UUID;
  v_existing_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.referrals WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'idempotent_replay', true, 'referral_id', v_existing_id);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You have already used a referral code');
  END IF;

  SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
  IF NOT v_settings.programme_enabled THEN
    RETURN json_build_object('success', false, 'error', 'Referral programme is currently inactive');
  END IF;

  SELECT rc.*, rc.user_id AS referrer_id
  INTO v_code_record
  FROM public.referral_codes rc
  WHERE UPPER(rc.code) = UPPER(p_referral_code) AND rc.is_active = true;

  IF v_code_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or inactive referral code');
  END IF;

  IF v_code_record.referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot use your own referral code');
  END IF;

  IF v_settings.max_referrals_per_customer IS NOT NULL THEN
    IF (
      SELECT COUNT(*) FROM public.referrals
      WHERE referrer_id = v_code_record.referrer_id AND status IN ('REWARDED', 'QUALIFIED')
    ) >= v_settings.max_referrals_per_customer THEN
      RETURN json_build_object('success', false, 'error', 'Referrer has reached the maximum referral limit');
    END IF;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, referral_code_id, status, idempotency_key)
  VALUES (v_code_record.referrer_id, p_referred_user_id, v_code_record.id, 'PENDING', p_idempotency_key)
  RETURNING id INTO v_referral_id;

  RETURN json_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_id', v_code_record.referrer_id,
    'referrer_reward', v_settings.referrer_reward,
    'referred_reward', v_settings.referred_reward
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Referral code already registered (duplicate)');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 14: RPC — qualify_referral
-- Called when referred customer's first qualifying order is DELIVERED.
-- Atomically: marks referral REWARDED, credits both wallets.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.qualify_referral(
  p_referred_user_id TEXT,
  p_qualifying_order_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_settings RECORD;
BEGIN
  -- Idempotency: already qualified for this order?
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE qualifying_order_id = p_qualifying_order_id AND status IN ('QUALIFIED', 'REWARDED')
  ) THEN
    RETURN json_build_object('success', true, 'idempotent_replay', true,
      'message', 'Referral already qualified for this order');
  END IF;

  SELECT * INTO v_referral FROM public.referrals
  WHERE referred_id = p_referred_user_id AND status = 'PENDING';

  IF v_referral.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No pending referral found for this user');
  END IF;

  SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
  IF NOT v_settings.programme_enabled THEN
    RETURN json_build_object('success', false, 'error', 'Referral programme is currently inactive');
  END IF;

  -- Mark QUALIFIED first (before issuing credits, in case of partial failure)
  UPDATE public.referrals
  SET status = 'QUALIFIED',
      qualifying_order_id = p_qualifying_order_id,
      referrer_reward_amount = v_settings.referrer_reward,
      referred_reward_amount = v_settings.referred_reward,
      updated_at = NOW()
  WHERE id = v_referral.id;

  -- Credit referrer
  PERFORM public.credit_wallet(
    v_referral.referrer_id, v_settings.referrer_reward, 'REFERRAL',
    v_referral.id::TEXT,
    'Referral reward — your friend placed their first order!',
    COALESCE(p_idempotency_key, v_referral.id::TEXT) || '_referrer',
    v_settings.referral_credit_expiry_days
  );

  -- Credit referred customer
  PERFORM public.credit_wallet(
    p_referred_user_id, v_settings.referred_reward, 'REFERRAL_BONUS',
    v_referral.id::TEXT,
    'Welcome bonus — thanks for joining with a referral!',
    COALESCE(p_idempotency_key, v_referral.id::TEXT) || '_referred',
    v_settings.referral_credit_expiry_days
  );

  -- Mark REWARDED
  UPDATE public.referrals
  SET status = 'REWARDED', reward_issued_at = NOW(), updated_at = NOW()
  WHERE id = v_referral.id;

  RETURN json_build_object(
    'success', true,
    'referral_id', v_referral.id,
    'referrer_id', v_referral.referrer_id,
    'referred_id', p_referred_user_id,
    'referrer_reward', v_settings.referrer_reward,
    'referred_reward', v_settings.referred_reward
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 15: RPC — create_checkout_order
-- Atomically: validates wallet balance, deducts credits, inserts order.
-- On failure: auto-reverses wallet deduction before returning error.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_order_id TEXT,
  p_user_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_delivery_address TEXT,
  p_delivery_address_snapshot JSONB,
  p_delivery_slot TEXT,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_coupon_code TEXT,
  p_delivery_fee NUMERIC,
  p_total_amount NUMERIC,
  p_wallet_credits_to_apply NUMERIC,
  p_payment_method TEXT,
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_region TEXT DEFAULT 'West'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_external_amount NUMERIC;
  v_initial_payment_status TEXT;
  v_wallet_txn_id UUID;
  v_wallet_result JSON;
  v_existing_order TEXT;
BEGIN
  -- Idempotency
  SELECT id INTO v_existing_order FROM public.orders WHERE id = p_order_id;
  IF v_existing_order IS NOT NULL THEN
    RETURN json_build_object('success', true, 'idempotent_replay', true, 'order_id', v_existing_order);
  END IF;

  -- Validate wallet balance
  IF p_wallet_credits_to_apply > 0 THEN
    IF (SELECT COALESCE(available_balance, 0) FROM public.wallets WHERE user_id = p_user_id)
        < p_wallet_credits_to_apply THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
    END IF;
  END IF;

  v_external_amount := GREATEST(0, p_total_amount - p_wallet_credits_to_apply);

  v_initial_payment_status :=
    CASE
      WHEN p_payment_method = 'Cash on Delivery' THEN 'Pending'
      WHEN p_wallet_credits_to_apply >= p_total_amount THEN 'Paid'
      ELSE 'Pending'
    END;

  -- Deduct wallet credits
  IF p_wallet_credits_to_apply > 0 THEN
    v_wallet_result := public.debit_wallet(
      p_user_id, p_wallet_credits_to_apply, p_order_id,
      'Wallet payment for order ' || p_order_id,
      COALESCE(p_idempotency_key, p_order_id) || '_wallet_debit'
    );

    IF NOT (v_wallet_result->>'success')::BOOLEAN THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Wallet deduction failed: ' || COALESCE(v_wallet_result->>'error', 'unknown error')
      );
    END IF;

    v_wallet_txn_id := (v_wallet_result->>'transaction_id')::UUID;
  END IF;

  -- Insert order
  INSERT INTO public.orders (
    id, user_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_slot, region,
    subtotal, discount, coupon_code, delivery_fee, total_amount,
    wallet_credits_applied, external_payment_amount,
    payment_method, payment_status,
    delivery_address_snapshot, razorpay_order_id,
    wallet_debit_transaction_id,
    status, created_at
  )
  VALUES (
    p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_email,
    p_delivery_address, p_delivery_slot, p_region,
    p_subtotal, p_discount, p_coupon_code, p_delivery_fee, p_total_amount,
    p_wallet_credits_to_apply, v_external_amount,
    p_payment_method, v_initial_payment_status,
    p_delivery_address_snapshot, p_razorpay_order_id,
    v_wallet_txn_id,
    'Placed', NOW()
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'wallet_credits_applied', p_wallet_credits_to_apply,
    'external_payment_amount', v_external_amount,
    'initial_payment_status', v_initial_payment_status,
    'wallet_transaction_id', v_wallet_txn_id
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Auto-reverse wallet deduction if order insert failed
    IF v_wallet_txn_id IS NOT NULL THEN
      PERFORM public.reverse_wallet_debit(
        v_wallet_txn_id,
        'Order creation failed — automatic reversal',
        p_order_id || '_creation_failure_reversal'
      );
    END IF;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 16: RPC — confirm_order_payment (called after Razorpay verification)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.payment_status = 'Paid' THEN
    RETURN json_build_object('success', true, 'idempotent_replay', true, 'message', 'Already paid');
  END IF;

  UPDATE public.orders
  SET payment_status = 'Paid',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature
  WHERE id = p_order_id;

  RETURN json_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- SECTION 17: Realtime subscriptions
-- ==============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END;
$$;

-- ==============================================================================
-- END OF MIGRATION 20261005_wallet_referral_checkout.sql
-- ==============================================================================
