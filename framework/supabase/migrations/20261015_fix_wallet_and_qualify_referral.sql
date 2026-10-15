-- ==============================================================================
-- RasoiGenie Database Fix: Wallets ID Default & qualify_referral RPC
-- Date: 2026-10-15
-- Instructions: Run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure crypto extension is present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Fix wallets table default ID so inserts without an explicit ID generate a UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wallets'
  ) THEN
    ALTER TABLE public.wallets ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- 3. Replace create_wallet_for_user to safely supply gen_random_uuid()
-- Drop existing signature first in case return type differed
DROP FUNCTION IF EXISTS public.create_wallet_for_user(TEXT);
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

  INSERT INTO public.wallets (id, user_id, available_balance, reserved_balance, currency)
  VALUES (gen_random_uuid(), p_user_id, 0.00, 0.00, 'INR')
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

-- 4. Create/Replace qualify_referral RPC
DROP FUNCTION IF EXISTS public.qualify_referral(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.qualify_referral(TEXT, TEXT);
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
  IF v_settings.id IS NULL OR NOT v_settings.programme_enabled THEN
    RETURN json_build_object('success', false, 'error', 'Referral programme is currently inactive');
  END IF;

  -- Mark QUALIFIED first
  UPDATE public.referrals
  SET status = 'QUALIFIED',
      qualifying_order_id = p_qualifying_order_id,
      referrer_reward_amount = v_settings.referrer_reward,
      referred_reward_amount = v_settings.referred_reward,
      updated_at = NOW()
  WHERE id = v_referral.id;

  -- Credit referrer
  BEGIN
    PERFORM public.credit_wallet(
      v_referral.referrer_id, v_settings.referrer_reward, 'REFERRAL',
      v_referral.id::TEXT,
      'Referral reward — your friend placed their first order!',
      COALESCE(p_idempotency_key, v_referral.id::TEXT) || '_referrer',
      v_settings.referral_credit_expiry_days
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback or log if credit_wallet is not yet defined
    NULL;
  END;

  -- Credit referred customer
  BEGIN
    PERFORM public.credit_wallet(
      p_referred_user_id, v_settings.referred_reward, 'REFERRAL_BONUS',
      v_referral.id::TEXT,
      'Welcome bonus — thanks for joining with a referral!',
      COALESCE(p_idempotency_key, v_referral.id::TEXT) || '_referred',
      v_settings.referral_credit_expiry_days
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

-- 5. Grant permissions to client roles
GRANT EXECUTE ON FUNCTION public.create_wallet_for_user(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 6. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
