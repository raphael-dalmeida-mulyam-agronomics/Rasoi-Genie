-- ==============================================================================
-- Migration: 20261029_subscription_extensions.sql
-- Description: Extends Weekly Meal Subscriptions with per-member plan groups,
--              calendar-based pauses with strict limits and period extension,
--              auto-renewal state machine columns, and regional admin views/RPCs.
-- ==============================================================================

-- 1. EXTEND SUBSCRIPTIONS TABLE
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS renewal_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_renewal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_renewed_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'West';

CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_renew ON public.subscriptions(auto_renew);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_renewal ON public.subscriptions(next_renewal_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_region ON public.subscriptions(region);

-- 2. EXTEND SUBSCRIPTION MEMBERS TABLE
ALTER TABLE public.subscription_members
  ADD COLUMN IF NOT EXISTS plan_group TEXT,
  ADD COLUMN IF NOT EXISTS price_per_week NUMERIC NOT NULL DEFAULT 1299;

CREATE INDEX IF NOT EXISTS idx_sub_members_plan_group ON public.subscription_members(plan_group);

-- 3. SUBSCRIPTION PAUSES TABLE
CREATE TABLE IF NOT EXISTS public.subscription_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT, -- NULL denotes entire family pause; non-null denotes per-member pause
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
  created_by TEXT NOT NULL REFERENCES public.user_profiles(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pause_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_pause_max_consecutive CHECK ((end_date - start_date) + 1 <= 7)
);

CREATE INDEX IF NOT EXISTS idx_sub_pauses_sub_id ON public.subscription_pauses(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_pauses_member_id ON public.subscription_pauses(member_id);
CREATE INDEX IF NOT EXISTS idx_sub_pauses_dates ON public.subscription_pauses(start_date, end_date);

-- 4. DATABASE FUNCTION & TRIGGER TO ENFORCE PAUSE LIMITS & EXTEND PERIOD END
CREATE OR REPLACE FUNCTION public.fn_validate_and_apply_subscription_pause()
RETURNS TRIGGER AS $$
DECLARE
  v_sub RECORD;
  v_total_paused_days INTEGER;
  v_existing_ranges_count INTEGER;
  v_cutoff_date DATE;
BEGIN
  -- Fetch current subscription details
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = NEW.subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription with id % not found', NEW.subscription_id;
  END IF;

  -- 1. Paused days must fall within current subscription period
  IF NEW.start_date < v_sub.period_start::date OR NEW.end_date > v_sub.period_end::date THEN
    RAISE EXCEPTION 'Pause dates must fall within current billing period (% to %)',
      v_sub.period_start::date, v_sub.period_end::date;
  END IF;

  -- 2. Cutoff enforcement: cannot pause in the past or within 48h cutoff
  v_cutoff_date := (CURRENT_DATE + INTERVAL '2 days')::date;
  IF NEW.start_date < v_cutoff_date THEN
    RAISE EXCEPTION 'Cannot pause days in the past or within the 48-hour fulfillment cutoff window';
  END IF;

  -- 3. Check for overlapping pause ranges
  IF EXISTS (
    SELECT 1 FROM public.subscription_pauses
    WHERE subscription_id = NEW.subscription_id
      AND (
        (NEW.member_id IS NULL AND member_id IS NULL)
        OR (NEW.member_id IS NOT NULL AND (member_id = NEW.member_id OR member_id IS NULL))
      )
      AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'Pause range overlaps with an existing pause';
  END IF;

  -- 4. Maximum 2 separate pause ranges per billing period
  SELECT COUNT(*) INTO v_existing_ranges_count
  FROM public.subscription_pauses
  WHERE subscription_id = NEW.subscription_id
    AND start_date >= v_sub.period_start::date
    AND end_date <= v_sub.period_end::date;

  IF v_existing_ranges_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 separate pause ranges allowed per billing period';
  END IF;

  -- 5. Maximum 14 paused days per billing period
  SELECT COALESCE(SUM(days_count), 0) INTO v_total_paused_days
  FROM public.subscription_pauses
  WHERE subscription_id = NEW.subscription_id
    AND start_date >= v_sub.period_start::date
    AND end_date <= v_sub.period_end::date;

  IF (v_total_paused_days + NEW.days_count) > 14 THEN
    RAISE EXCEPTION 'Maximum 14 paused days allowed per billing period (current: %, requested: %)',
      v_total_paused_days, NEW.days_count;
  END IF;

  -- 6. Upfront-payment policy: extend the period end date by the paused days
  UPDATE public.subscriptions
  SET
    period_end = period_end + (NEW.days_count * INTERVAL '1 day'),
    next_renewal_at = CASE
      WHEN next_renewal_at IS NOT NULL THEN next_renewal_at + (NEW.days_count * INTERVAL '1 day')
      ELSE next_renewal_at
    END,
    updated_at = NOW()
  WHERE id = NEW.subscription_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_and_apply_subscription_pause ON public.subscription_pauses;
CREATE TRIGGER trg_validate_and_apply_subscription_pause
  BEFORE INSERT ON public.subscription_pauses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_and_apply_subscription_pause();

-- 5. ROW LEVEL SECURITY (RLS) FOR SUBSCRIPTION PAUSES
ALTER TABLE public.subscription_pauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscription pauses owner manage policy" ON public.subscription_pauses;
CREATE POLICY "Subscription pauses owner manage policy"
  ON public.subscription_pauses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id
        AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id
        AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Subscription pauses family select policy" ON public.subscription_pauses;
CREATE POLICY "Subscription pauses family select policy"
  ON public.subscription_pauses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id
        AND (
          s.owner_user_id = auth.uid()::text
          OR (
            s.family_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.family_members fm
              WHERE fm.family_id = s.family_id
                AND fm.user_id = auth.uid()::text
            )
          )
          OR public.is_super_admin()
        )
    )
  );

-- 6. ADMIN VIEW & STORED PROCEDURES
CREATE OR REPLACE VIEW public.admin_subscriptions_view AS
SELECT
  s.id,
  s.owner_user_id,
  COALESCE(u.display_name, 'Subscriber') AS customer_name,
  u.email AS customer_email,
  u.phone_number AS customer_phone,
  s.family_id,
  f.name AS family_name,
  s.scope,
  s.plan_type,
  s.standard_plan_key,
  s.status,
  s.price_per_member_per_week,
  s.member_count,
  s.amount_paid,
  s.wallet_credits_applied,
  s.payment_reference,
  s.payment_method,
  s.period_start,
  s.period_end,
  s.auto_renew,
  s.renewal_attempts,
  s.next_renewal_at,
  s.cancel_at_period_end,
  COALESCE(s.region, 'West') AS region,
  s.created_at,
  s.updated_at,
  COALESCE((
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', sm.id,
        'member_id', sm.member_id,
        'member_name', sm.member_name,
        'is_dependent', sm.is_dependent,
        'plan_type', sm.plan_type,
        'standard_plan_key', sm.standard_plan_key,
        'plan_group', sm.plan_group,
        'price_per_week', sm.price_per_week
      ) ORDER BY sm.created_at ASC
    )
    FROM public.subscription_members sm
    WHERE sm.subscription_id = s.id
  ), '[]'::json) AS members,
  COALESCE((
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', sp.id,
        'member_id', sp.member_id,
        'start_date', sp.start_date,
        'end_date', sp.end_date,
        'days_count', sp.days_count,
        'created_at', sp.created_at
      ) ORDER BY sp.start_date ASC
    )
    FROM public.subscription_pauses sp
    WHERE sp.subscription_id = s.id
  ), '[]'::json) AS pauses
FROM public.subscriptions s
LEFT JOIN public.user_profiles u ON s.owner_user_id = u.uid
LEFT JOIN public.families f ON s.family_id = f.id;

-- Admin Cancel Function
CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(
  p_subscription_id UUID,
  p_admin_email TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin RECORD;
  v_sub RECORD;
BEGIN
  -- Verify admin identity
  SELECT * INTO v_admin FROM public.admin_users WHERE email = p_admin_email;
  IF NOT FOUND AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription with id % not found', p_subscription_id;
  END IF;

  -- If regional admin, check region
  IF v_admin.role = 'regional_admin' AND v_admin.region IS NOT NULL THEN
    IF v_sub.region IS NOT NULL AND v_sub.region != v_admin.region THEN
      RAISE EXCEPTION 'Unauthorized: Regional admin cannot cancel subscriptions outside %', v_admin.region;
    END IF;
  END IF;

  UPDATE public.subscriptions
  SET
    status = 'cancelled',
    auto_renew = false,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'subscription_id', p_subscription_id,
    'status', 'cancelled'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. REALTIME REPLICATION & GRANTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_pauses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_pauses;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_pauses TO anon, authenticated, service_role;
GRANT SELECT ON public.admin_subscriptions_view TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_subscription TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

