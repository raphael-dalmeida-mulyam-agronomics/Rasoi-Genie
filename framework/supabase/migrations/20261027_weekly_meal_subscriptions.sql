-- ==============================================================================
-- Migration: 20261027_weekly_meal_subscriptions.sql
-- Description: Weekly Meal Subscriptions (Individual & Family)
-- Includes: subscriptions, subscription_members, subscription_meals tables,
--           Row Level Security (RLS) for owners and covered family members,
--           Realtime publication, and Supabase Data API grants.
-- ==============================================================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL REFERENCES public.user_profiles(uid) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('individual', 'family')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('standard', 'custom')),
  standard_plan_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired')),
  price_per_member_per_week NUMERIC NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 1,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  wallet_credits_applied NUMERIC NOT NULL DEFAULT 0,
  payment_reference TEXT,
  payment_method TEXT,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON public.subscriptions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_family ON public.subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 2. SUBSCRIPTION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  is_dependent BOOLEAN NOT NULL DEFAULT false,
  plan_type TEXT NOT NULL DEFAULT 'standard' CHECK (plan_type IN ('standard', 'custom')),
  standard_plan_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sub_member UNIQUE (subscription_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_members_sub_id ON public.subscription_members(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_members_member_id ON public.subscription_members(member_id);

-- 3. SUBSCRIPTION MEALS TABLE (7-Day schedule per member)
CREATE TABLE IF NOT EXISTS public.subscription_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Mon, 6=Sun
  meal_kit_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sub_member_day UNIQUE (subscription_id, member_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_sub_meals_sub_id ON public.subscription_meals(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_meals_member_day ON public.subscription_meals(member_id, weekday);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_meals ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies
DROP POLICY IF EXISTS "Subscriptions owner manage policy" ON public.subscriptions;
CREATE POLICY "Subscriptions owner manage policy"
  ON public.subscriptions
  FOR ALL
  USING (
    owner_user_id = auth.uid()::text
    OR owner_user_id = public.current_auth_email()
    OR public.is_super_admin()
  )
  WITH CHECK (
    owner_user_id = auth.uid()::text
    OR owner_user_id = public.current_auth_email()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Subscriptions family members select policy" ON public.subscriptions;
CREATE POLICY "Subscriptions family members select policy"
  ON public.subscriptions
  FOR SELECT
  USING (
    owner_user_id = auth.uid()::text
    OR (
      family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = subscriptions.family_id
          AND fm.user_id = auth.uid()::text
      )
    )
    OR public.is_super_admin()
  );

-- Subscription Members Policies
DROP POLICY IF EXISTS "Subscription members owner manage policy" ON public.subscription_members;
CREATE POLICY "Subscription members owner manage policy"
  ON public.subscription_members
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

DROP POLICY IF EXISTS "Subscription members family select policy" ON public.subscription_members;
CREATE POLICY "Subscription members family select policy"
  ON public.subscription_members
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

-- Subscription Meals Policies
DROP POLICY IF EXISTS "Subscription meals owner manage policy" ON public.subscription_meals;
CREATE POLICY "Subscription meals owner manage policy"
  ON public.subscription_meals
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

DROP POLICY IF EXISTS "Subscription meals family select policy" ON public.subscription_meals;
CREATE POLICY "Subscription meals family select policy"
  ON public.subscription_meals
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

-- 5. REALTIME REPLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_meals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_meals;
  END IF;
END $$;

-- 6. DATA API GRANTS (in compliance with October 2026 Supabase standard)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_meals TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
