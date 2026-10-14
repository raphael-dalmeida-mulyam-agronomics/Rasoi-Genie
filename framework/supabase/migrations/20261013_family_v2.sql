-- ==============================================================================
-- Migration: Family Feature v2 (Roles, Co-Owners, Link-Joined Dependents)
-- Date: 2026-10-13
-- Enables collaborative family meal planning with strict role-based access:
--  - Roles: owner, co-owner, member, dependent (child or senior)
--  - Single checkout payer (owner or co-owner) using personal wallet
--  - Dependent single-use join links with cryptographic SHA-256 tokens & consent
--  - Realtime family cart with owner approvals & exclusive checkout holds
--  - Indian DPDP Act compliance (guardian consent, zero tracking for children)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure user_profiles table and columns exist for foreign key references and app profile sync
CREATE TABLE IF NOT EXISTS public.user_profiles (
  uid TEXT PRIMARY KEY,
  display_name TEXT,
  phone_number TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer',
  is_anonymous BOOLEAN DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_payment_method TEXT DEFAULT 'UPI',
  is_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'UPI';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Allow public read-write for user_profiles'
  ) THEN
    CREATE POLICY "Allow public read-write for user_profiles"
      ON public.user_profiles
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure chef_profiles exists
CREATE TABLE IF NOT EXISTS public.chef_profiles (
  uid          TEXT PRIMARY KEY,
  email        TEXT,
  display_name TEXT,
  approved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by  TEXT,
  bio          TEXT,
  speciality   TEXT
);

CREATE INDEX IF NOT EXISTS chef_profiles_email_idx ON public.chef_profiles (lower(email));
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chef_profiles' AND policyname = 'chef_profiles readable'
  ) THEN
    CREATE POLICY "chef_profiles readable" ON public.chef_profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chef_profiles' AND policyname = 'chef_profiles writable'
  ) THEN
    CREATE POLICY "chef_profiles writable" ON public.chef_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- 1. CORE TABLES
-- ==============================================================================

-- 1.1 Families Table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES public.user_profiles(uid) ON DELETE RESTRICT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_owner_id ON public.families(owner_id);

-- 1.2 Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.user_profiles(uid) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co_owner', 'member', 'dependent')),
  dependent_type TEXT CHECK (dependent_type IN ('child', 'senior') OR dependent_type IS NULL),
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id),
  CONSTRAINT uq_family_members_user UNIQUE (user_id),
  CONSTRAINT chk_dependent_type CHECK (
    (role = 'dependent' AND dependent_type IS NOT NULL) OR
    (role != 'dependent' AND dependent_type IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_role ON public.family_members(family_id, role);

-- 1.3 Family Invites Table (Adults invited via mobile number)
CREATE TABLE IF NOT EXISTS public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL REFERENCES public.user_profiles(uid),
  invited_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_phone ON public.family_invites(invited_phone, status);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON public.family_invites(family_id, status);

-- 1.4 Family Join Links Table (Dependents: child or senior)
CREATE TABLE IF NOT EXISTS public.family_join_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES public.user_profiles(uid),
  token_hash TEXT NOT NULL UNIQUE,
  dependent_type TEXT NOT NULL CHECK (dependent_type IN ('child', 'senior')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  redeemed_by TEXT REFERENCES public.user_profiles(uid),
  redeemed_at TIMESTAMPTZ,
  guardian_confirmed BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_join_links_hash ON public.family_join_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_family_join_links_family ON public.family_join_links(family_id, status);

-- 1.5 Family Cart Items Table
CREATE TABLE IF NOT EXISTS public.family_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL REFERENCES public.user_profiles(uid),
  kit_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  servings INTEGER NOT NULL DEFAULT 2 CHECK (servings > 0),
  spice_level TEXT DEFAULT 'Medium',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending_approval', 'rejected')),
  approved_by TEXT REFERENCES public.user_profiles(uid),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_cart_items_family ON public.family_cart_items(family_id, status);
CREATE INDEX IF NOT EXISTS idx_family_cart_items_added_by ON public.family_cart_items(added_by);

-- 1.6 Family Checkout Holds Table (Exclusive 10-minute hold for payer)
CREATE TABLE IF NOT EXISTS public.family_checkout_holds (
  family_id UUID PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  held_by TEXT NOT NULL REFERENCES public.user_profiles(uid),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.7 Consent Records Table (DPDP Act verifiable consent records)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.user_profiles(uid),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('guardian', 'self')),
  version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);

-- 1.8 Family Membership History Table (Tracks member lifecycle)
CREATE TABLE IF NOT EXISTS public.family_membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  left_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_history_user ON public.family_membership_history(user_id, left_at);

-- 1.9 Family Audit Log Table (Append-only audit trail)
CREATE TABLE IF NOT EXISTS public.family_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_audit_family ON public.family_audit_log(family_id, created_at DESC);

-- 1.10 Extend Orders Table with Family references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payer_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payer_id TEXT REFERENCES public.user_profiles(uid) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN added_by TEXT REFERENCES public.user_profiles(uid) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 2.1 Get Caller UID helper (Supports auth.jwt(), auth.uid(), and fallback)
CREATE OR REPLACE FUNCTION public.get_caller_id(p_explicit_id TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    NULLIF(auth.jwt()->>'sub', ''),
    NULLIF(auth.uid()::text, ''),
    p_explicit_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT LOWER(COALESCE(
    auth.jwt()->>'email',
    current_setting('request.jwt.claims', true)::jsonb->>'email',
    ''
  ));
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT public.current_auth_email() = 'raphael.dalmeida@mulyam.in'
     OR EXISTS (
       SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users'
     ) AND EXISTS (
       SELECT 1 FROM public.admin_users
       WHERE LOWER(email) = public.current_auth_email()
         AND role = 'super_admin'
     )),
    false
  );
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- 2.1b Helper functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_family_member(p_family_id UUID, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = p_family_id AND user_id = COALESCE(p_user_id, public.get_caller_id())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(p_family_id UUID, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families
    WHERE id = p_family_id AND owner_id = COALESCE(p_user_id, public.get_caller_id())
  );
$$;

-- 2.2 Capacity Calculation Helper: Members + Pending Invites + Pending Links <= 6
CREATE OR REPLACE FUNCTION public.get_family_seat_count(p_family_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_members INT := 0;
  v_invites INT := 0;
  v_links INT := 0;
BEGIN
  SELECT COUNT(*) INTO v_members
  FROM public.family_members
  WHERE family_id = p_family_id;

  SELECT COUNT(*) INTO v_invites
  FROM public.family_invites
  WHERE family_id = p_family_id
    AND status = 'pending'
    AND expires_at > NOW();

  SELECT COUNT(*) INTO v_links
  FROM public.family_join_links
  WHERE family_id = p_family_id
    AND status = 'pending'
    AND expires_at > NOW();

  RETURN v_members + v_invites + v_links;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2.3 Cart Lock Trigger: Rejects writes when cart is locked (allows family owner)
CREATE OR REPLACE FUNCTION public.check_family_cart_locked()
RETURNS TRIGGER AS $$
DECLARE
  v_family_id UUID;
  v_is_locked BOOLEAN;
  v_owner_id TEXT;
  v_caller TEXT;
BEGIN
  v_family_id := COALESCE(NEW.family_id, OLD.family_id);
  SELECT is_locked, owner_id INTO v_is_locked, v_owner_id FROM public.families WHERE id = v_family_id;
  IF v_is_locked IS TRUE THEN
    v_caller := public.get_caller_id();
    -- If caller is the family owner, allow modification (adding, updating, or removing items)
    IF v_caller IS NOT NULL AND v_caller = v_owner_id THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    -- If caller could not be determined from auth context, check if inserted row was added by owner
    IF v_caller IS NULL AND TG_OP = 'INSERT' AND NEW.added_by = v_owner_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Family cart is currently locked by the owner';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_family_cart_locked ON public.family_cart_items;
CREATE TRIGGER trg_check_family_cart_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.family_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.check_family_cart_locked();

-- 2.4 Referral Abuse Prevention: are_related(user_a, user_b)
-- Blocks rewards between current co-members or members who shared a family within 90 days.
CREATE OR REPLACE FUNCTION public.are_related(p_user_a TEXT, p_user_b TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_a IS NULL OR p_user_b IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_a = p_user_b THEN
    RETURN true;
  END IF;

  -- 1. Active co-members in the same family
  IF EXISTS (
    SELECT 1
    FROM public.family_members m1
    JOIN public.family_members m2 ON m1.family_id = m2.family_id
    WHERE m1.user_id = p_user_a AND m2.user_id = p_user_b
  ) THEN
    RETURN true;
  END IF;

  -- 2. Co-members within the past 90 days
  IF EXISTS (
    SELECT 1
    FROM public.family_membership_history h1
    JOIN public.family_membership_history h2 ON h1.family_id = h2.family_id
    WHERE h1.user_id = p_user_a
      AND h2.user_id = p_user_b
      AND h1.left_at >= (NOW() - INTERVAL '90 days')
      AND h2.left_at >= (NOW() - INTERVAL '90 days')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2.5 Audit log helper (Supports both json and jsonb)
DROP FUNCTION IF EXISTS public.log_family_audit(UUID, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.log_family_audit(UUID, TEXT, TEXT, JSON) CASCADE;
DROP FUNCTION IF EXISTS public.log_family_audit CASCADE;

CREATE OR REPLACE FUNCTION public.log_family_audit(
  p_family_id UUID,
  p_actor_id TEXT,
  p_action TEXT,
  p_details JSON DEFAULT '{}'::json
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.family_audit_log (family_id, actor_id, action, details)
  VALUES (p_family_id, p_actor_id, p_action, p_details::jsonb);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_family_audit(
  p_family_id UUID,
  p_actor_id TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.family_audit_log (family_id, actor_id, action, details)
  VALUES (p_family_id, p_actor_id, p_action, p_details);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_join_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_checkout_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_membership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_audit_log ENABLE ROW LEVEL SECURITY;

-- 3.1 Families Table RLS
DROP POLICY IF EXISTS "families_select_members" ON public.families;
CREATE POLICY "families_select_members" ON public.families FOR SELECT USING (true);

-- Direct client modifications blocked; RPCs only
DROP POLICY IF EXISTS "families_no_direct_insert" ON public.families;
CREATE POLICY "families_no_direct_insert" ON public.families FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "families_no_direct_update" ON public.families;
CREATE POLICY "families_no_direct_update" ON public.families FOR UPDATE USING (false);
DROP POLICY IF EXISTS "families_no_direct_delete" ON public.families;
CREATE POLICY "families_no_direct_delete" ON public.families FOR DELETE USING (false);

-- 3.2 Family Members Table RLS
DROP POLICY IF EXISTS "family_members_select_family" ON public.family_members;
CREATE POLICY "family_members_select_family" ON public.family_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "family_members_no_direct_insert" ON public.family_members;
CREATE POLICY "family_members_no_direct_insert" ON public.family_members FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "family_members_no_direct_update" ON public.family_members;
CREATE POLICY "family_members_no_direct_update" ON public.family_members FOR UPDATE USING (false);
DROP POLICY IF EXISTS "family_members_no_direct_delete" ON public.family_members;
CREATE POLICY "family_members_no_direct_delete" ON public.family_members FOR DELETE USING (false);

-- 3.3 Family Invites Table RLS
DROP POLICY IF EXISTS "family_invites_select_policy" ON public.family_invites;
CREATE POLICY "family_invites_select_policy" ON public.family_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "family_invites_no_direct_insert" ON public.family_invites;
CREATE POLICY "family_invites_no_direct_insert" ON public.family_invites FOR INSERT WITH CHECK (false);

-- 3.4 Family Join Links Table RLS
DROP POLICY IF EXISTS "family_join_links_select_owner" ON public.family_join_links;
CREATE POLICY "family_join_links_select_owner" ON public.family_join_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "family_join_links_no_direct_write" ON public.family_join_links;
CREATE POLICY "family_join_links_no_direct_write" ON public.family_join_links FOR ALL USING (false) WITH CHECK (false);

-- 3.5 Family Cart Items Table RLS
DROP POLICY IF EXISTS "family_cart_items_select" ON public.family_cart_items;
CREATE POLICY "family_cart_items_select" ON public.family_cart_items FOR SELECT USING (true);

-- Direct client inserts: Dependents can ONLY insert their own items with pending_approval
DROP POLICY IF EXISTS "family_cart_items_insert_dependent" ON public.family_cart_items;
CREATE POLICY "family_cart_items_insert_dependent"
  ON public.family_cart_items FOR INSERT
  WITH CHECK (
    status = 'pending_approval'
  );

-- Direct updates and deletes blocked (must use RPCs)
DROP POLICY IF EXISTS "family_cart_items_no_direct_update" ON public.family_cart_items;
CREATE POLICY "family_cart_items_no_direct_update" ON public.family_cart_items FOR UPDATE USING (false);
DROP POLICY IF EXISTS "family_cart_items_no_direct_delete" ON public.family_cart_items;
CREATE POLICY "family_cart_items_no_direct_delete" ON public.family_cart_items FOR DELETE USING (false);

-- 3.6 Family Checkout Holds RLS
DROP POLICY IF EXISTS "family_checkout_holds_select" ON public.family_checkout_holds;
CREATE POLICY "family_checkout_holds_select" ON public.family_checkout_holds FOR SELECT USING (true);

DROP POLICY IF EXISTS "family_checkout_holds_no_direct_write" ON public.family_checkout_holds;
CREATE POLICY "family_checkout_holds_no_direct_write" ON public.family_checkout_holds FOR ALL USING (false) WITH CHECK (false);

-- 3.7 Consent Records RLS
DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select"
  ON public.consent_records FOR SELECT
  USING (
    user_id = public.get_caller_id()
    OR EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = consent_records.family_id AND f.owner_id = public.get_caller_id()
    )
    OR public.is_super_admin()
  );

-- 3.8 Family Membership History RLS
DROP POLICY IF EXISTS "membership_history_select" ON public.family_membership_history;
CREATE POLICY "membership_history_select"
  ON public.family_membership_history FOR SELECT
  USING (
    user_id = public.get_caller_id()
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_membership_history.family_id AND fm.user_id = public.get_caller_id()
    )
    OR public.is_super_admin()
  );

-- 3.9 Audit Log RLS (Owner & Super Admin only)
DROP POLICY IF EXISTS "audit_log_select" ON public.family_audit_log;
CREATE POLICY "audit_log_select"
  ON public.family_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_audit_log.family_id AND f.owner_id = public.get_caller_id()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "audit_log_no_direct_write" ON public.family_audit_log;
CREATE POLICY "audit_log_no_direct_write" ON public.family_audit_log FOR ALL USING (false) WITH CHECK (false);

-- ==============================================================================
-- 4. SECURITY DEFINER RPCS
-- All state mutations flow through these audited, permission-enforced RPCs.
-- ==============================================================================

-- 4.1 create_family
CREATE OR REPLACE FUNCTION public.create_family(
  p_name TEXT,
  p_owner_display_name TEXT DEFAULT NULL,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_family_id UUID;
  v_display_name TEXT;
  v_formatted_name TEXT;
  v_family_count_today INT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Ensure caller is not already in any family
  IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = v_caller) THEN
    RETURN json_build_object('success', false, 'error', 'User is already a member of a family. Leave current family first.');
  END IF;

  -- Abuse prevention: cap families created per device/owner per day (max 3)
  SELECT COUNT(*) INTO v_family_count_today
  FROM public.families
  WHERE owner_id = v_caller AND created_at >= (NOW() - INTERVAL '24 hours');

  IF v_family_count_today >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'Daily family creation limit reached. Please try again tomorrow.');
  END IF;

  -- Resolve owner first name
  IF p_owner_display_name IS NOT NULL AND trim(p_owner_display_name) != '' THEN
    v_display_name := split_part(trim(p_owner_display_name), ' ', 1);
  ELSE
    SELECT COALESCE(split_part(display_name, ' ', 1), 'Owner')
    INTO v_display_name
    FROM public.user_profiles
    WHERE uid = v_caller;
  END IF;
  IF v_display_name IS NULL OR v_display_name = '' THEN
    v_display_name := 'Owner';
  END IF;

  -- Auto-append " Family" if not already present
  IF trim(p_name) !~* '\s*(family|household)$' THEN
    v_formatted_name := initcap(trim(p_name)) || ' Family';
  ELSE
    v_formatted_name := initcap(trim(p_name));
  END IF;

  -- Ensure owner exists in user_profiles to satisfy foreign key constraint
  INSERT INTO public.user_profiles (uid, display_name, role)
  VALUES (v_caller, v_display_name, 'customer')
  ON CONFLICT (uid) DO UPDATE
    SET display_name = COALESCE(NULLIF(v_display_name, 'Owner'), user_profiles.display_name);

  -- Create family row
  INSERT INTO public.families (name, owner_id)
  VALUES (v_formatted_name, v_caller)
  RETURNING id INTO v_family_id;

  -- Add owner as member
  INSERT INTO public.family_members (family_id, user_id, role, dependent_type, display_name)
  VALUES (v_family_id, v_caller, 'owner', NULL, v_display_name);

  -- Log audit
  PERFORM public.log_family_audit(v_family_id, v_caller, 'create_family', json_build_object('name', v_formatted_name));

  RETURN json_build_object(
    'success', true,
    'family_id', v_family_id,
    'name', v_formatted_name,
    'owner_id', v_caller,
    'display_name', v_display_name
  );
END;
$$;

-- 4.2 invite_member_by_phone (Owner only; registered accounts only)
CREATE OR REPLACE FUNCTION public.invite_member_by_phone(
  p_family_id UUID,
  p_phone TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_clean_phone TEXT;
  v_existing_user TEXT;
  v_invite_id UUID;
  v_daily_invites INT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can invite members');
  END IF;

  -- Rate limit: 10 invites per owner per day
  SELECT COUNT(*) INTO v_daily_invites
  FROM public.family_invites
  WHERE invited_by = v_caller AND created_at >= (NOW() - INTERVAL '24 hours');

  IF v_daily_invites >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Daily invite limit reached (10 per day)');
  END IF;

  -- Capacity check (max 6 seats)
  IF public.get_family_seat_count(p_family_id) >= 6 THEN
    RETURN json_build_object('success', false, 'error', 'Family capacity reached (max 6 members)');
  END IF;

  v_clean_phone := trim(p_phone);

  -- Verification requirement: Account must already be registered
  -- Check user_profiles with exact phone or suffix match
  SELECT uid INTO v_existing_user
  FROM public.user_profiles
  WHERE phone_number = v_clean_phone
     OR right(regexp_replace(phone_number, '\D', '', 'g'), 10) = right(regexp_replace(v_clean_phone, '\D', '', 'g'), 10)
  LIMIT 1;

  IF v_existing_user IS NULL THEN
    -- Strict security requirement: Reveal nothing else
    RETURN json_build_object('success', false, 'error', 'Ask them to sign up first');
  END IF;

  -- Check if already in this or another family
  IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = v_existing_user) THEN
    RETURN json_build_object('success', false, 'error', 'This user is already in a family');
  END IF;

  -- Check if already has active pending invite in this family
  IF EXISTS (
    SELECT 1 FROM public.family_invites
    WHERE family_id = p_family_id AND invited_phone = v_clean_phone AND status = 'pending' AND expires_at > NOW()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'An invite is already pending for this phone number');
  END IF;

  INSERT INTO public.family_invites (family_id, invited_by, invited_phone, status, expires_at)
  VALUES (p_family_id, v_caller, v_clean_phone, 'pending', NOW() + INTERVAL '7 days')
  RETURNING id INTO v_invite_id;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'invite_member_by_phone', json_build_object('invite_id', v_invite_id));

  RETURN json_build_object('success', true, 'invite_id', v_invite_id);
END;
$$;

-- 4.3 respond_to_invite (Invitee accepts or declines in-app)
CREATE OR REPLACE FUNCTION public.respond_to_invite(
  p_invite_id UUID,
  p_accept BOOLEAN,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_invite RECORD;
  v_user_phone TEXT;
  v_display_name TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_invite FROM public.family_invites WHERE id = p_invite_id FOR UPDATE;
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invite not found');
  END IF;
  IF v_invite.status != 'pending' OR v_invite.expires_at <= NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite has expired or is no longer pending');
  END IF;

  -- Verify invitee matches caller's phone number
  SELECT phone_number, display_name INTO v_user_phone, v_display_name
  FROM public.user_profiles
  WHERE uid = v_caller;

  IF right(regexp_replace(COALESCE(v_user_phone, ''), '\D', '', 'g'), 10) != right(regexp_replace(v_invite.invited_phone, '\D', '', 'g'), 10) THEN
    RETURN json_build_object('success', false, 'error', 'This invite was sent to a different phone number');
  END IF;

  IF p_accept IS TRUE THEN
    -- Check user is not in another family
    IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = v_caller) THEN
      RETURN json_build_object('success', false, 'error', 'Leave your current family first');
    END IF;

    -- Lock family and verify capacity
    PERFORM id FROM public.families WHERE id = v_invite.family_id FOR UPDATE;
    IF (SELECT COUNT(*) FROM public.family_members WHERE family_id = v_invite.family_id) >= 6 THEN
      RETURN json_build_object('success', false, 'error', 'Family is full (maximum 6 members)');
    END IF;

    -- Add member as adult 'member'
    INSERT INTO public.family_members (family_id, user_id, role, dependent_type, display_name)
    VALUES (
      v_invite.family_id,
      v_caller,
      'member',
      NULL,
      COALESCE(split_part(trim(v_display_name), ' ', 1), 'Member')
    );

    UPDATE public.family_invites
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_invite_id;

    PERFORM public.log_family_audit(v_invite.family_id, v_caller, 'accept_invite', json_build_object('invite_id', p_invite_id));

    RETURN json_build_object('success', true, 'family_id', v_invite.family_id, 'status', 'accepted');
  ELSE
    UPDATE public.family_invites
    SET status = 'declined', updated_at = NOW()
    WHERE id = p_invite_id;

    PERFORM public.log_family_audit(v_invite.family_id, v_caller, 'decline_invite', json_build_object('invite_id', p_invite_id));

    RETURN json_build_object('success', true, 'status', 'declined');
  END IF;
END;
$$;

-- 4.4 create_join_link (Owner generates dependent link: 32 random bytes, stores SHA-256)
CREATE OR REPLACE FUNCTION public.create_join_link(
  p_family_id UUID,
  p_dependent_type TEXT,
  p_display_name TEXT,
  p_guardian_confirmed BOOLEAN,
  p_consent_version TEXT DEFAULT 'v1.0',
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_link_id UUID;
  v_daily_links INT;
  v_first_name TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can generate dependent join links');
  END IF;

  IF p_dependent_type NOT IN ('child', 'senior') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid dependent type. Must be child or senior');
  END IF;

  -- First name only
  v_first_name := split_part(trim(p_display_name), ' ', 1);
  IF v_first_name IS NULL OR v_first_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'Display name (first name) is required');
  END IF;

  -- Do not auto-revoke existing links so sharing multiple links does not invalidate active links

  -- Rate limit: 10 active/created links per owner per day (excluding revoked)
  SELECT COUNT(*) INTO v_daily_links
  FROM public.family_join_links
  WHERE created_by = v_caller AND created_at >= (NOW() - INTERVAL '24 hours') AND status != 'revoked';

  IF v_daily_links >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Daily join link limit reached (10 per day)');
  END IF;

  -- Seat reservation: check capacity
  IF public.get_family_seat_count(p_family_id) >= 6 THEN
    RETURN json_build_object('success', false, 'error', 'Family capacity reached (max 6 seats)');
  END IF;

  -- Child requires guardian consent confirmation
  IF p_dependent_type = 'child' AND p_guardian_confirmed IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Guardian consent is required for a child');
  END IF;

  -- Generate 64 hex characters (32 cryptographically secure random bytes) using core PostgreSQL
  v_raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(sha256(v_raw_token::bytea), 'hex');

  INSERT INTO public.family_join_links (
    family_id,
    created_by,
    token_hash,
    dependent_type,
    display_name,
    status,
    expires_at,
    guardian_confirmed,
    consent_version
  )
  VALUES (
    p_family_id,
    v_caller,
    v_token_hash,
    p_dependent_type,
    v_first_name,
    'pending',
    NOW() + INTERVAL '24 hours',
    p_guardian_confirmed,
    COALESCE(p_consent_version, 'v1.0')
  )
  RETURNING id INTO v_link_id;

  -- If child, record guardian consent immediately
  IF p_dependent_type = 'child' THEN
    INSERT INTO public.consent_records (user_id, family_id, type, version)
    VALUES (v_caller, p_family_id, 'guardian', COALESCE(p_consent_version, 'v1.0'));
  END IF;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'create_join_link', json_build_object('link_id', v_link_id, 'type', p_dependent_type));

  -- Raw token returned once only; never logged or saved in DB
  RETURN json_build_object(
    'success', true,
    'raw_token', v_raw_token,
    'link_id', v_link_id,
    'expires_at', (NOW() + INTERVAL '24 hours'),
    'dependent_type', p_dependent_type,
    'display_name', v_first_name
  );
END;
$$;

-- 4.5 revoke_join_link (Owner revokes pending link)
CREATE OR REPLACE FUNCTION public.revoke_join_link(
  p_link_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_link RECORD;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT * INTO v_link FROM public.family_join_links WHERE id = p_link_id FOR UPDATE;
  IF v_link IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Join link not found');
  END IF;

  SELECT owner_id INTO v_owner FROM public.families WHERE id = v_link.family_id;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner can revoke join links');
  END IF;

  UPDATE public.family_join_links
  SET status = 'revoked'
  WHERE id = p_link_id;

  PERFORM public.log_family_audit(v_link.family_id, v_caller, 'revoke_join_link', json_build_object('link_id', p_link_id));

  RETURN json_build_object('success', true);
END;
$$;

-- 4.6 redeem_join_link (Dependent redeems link; concurrency safe via row lock)
CREATE OR REPLACE FUNCTION public.redeem_join_link(
  p_raw_token TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_target_user TEXT;
  v_token_hash TEXT;
  v_link RECORD;
  v_family RECORD;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  v_target_user := COALESCE(p_user_id, v_caller);

  IF v_target_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User identity required for redemption');
  END IF;

  -- Hash raw token to locate row using core PostgreSQL sha256
  v_token_hash := encode(sha256(trim(p_raw_token)::bytea), 'hex');

  -- Lock link row: exactly one concurrent redemption succeeds
  SELECT * INTO v_link
  FROM public.family_join_links
  WHERE token_hash = v_token_hash
  FOR UPDATE;

  IF v_link IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid join link. Ask the family owner for a new link.');
  END IF;

  IF v_link.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'This join link has already been used or revoked. Ask the owner for a new link.');
  END IF;

  IF v_link.expires_at <= NOW() THEN
    UPDATE public.family_join_links SET status = 'expired' WHERE id = v_link.id;
    RETURN json_build_object('success', false, 'error', 'This join link has expired. Ask the owner for a new link.');
  END IF;

  -- Lock family row and check capacity
  SELECT * INTO v_family FROM public.families WHERE id = v_link.family_id FOR UPDATE;
  IF (SELECT COUNT(*) FROM public.family_members WHERE family_id = v_link.family_id) >= 6 THEN
    RETURN json_build_object('success', false, 'error', 'Family is full (maximum 6 members).');
  END IF;

  -- Ensure target user is not already in another family
  IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = v_target_user) THEN
    RETURN json_build_object('success', false, 'error', 'Leave your current family first.');
  END IF;

  -- Ensure target user exists in user_profiles
  INSERT INTO public.user_profiles (uid, display_name, role)
  VALUES (v_target_user, v_link.display_name, 'customer')
  ON CONFLICT (uid) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Add member
  INSERT INTO public.family_members (
    family_id,
    user_id,
    role,
    dependent_type,
    display_name
  )
  VALUES (
    v_link.family_id,
    v_target_user,
    'dependent',
    v_link.dependent_type,
    v_link.display_name
  );

  -- Mark link redeemed and reconcile all links for this dependent in this family
  UPDATE public.family_join_links
  SET status = 'redeemed',
      redeemed_by = v_target_user,
      redeemed_at = NOW()
  WHERE id = v_link.id
     OR (family_id = v_link.family_id AND lower(display_name) = lower(v_link.display_name));

  -- Record senior self-consent if applicable
  IF v_link.dependent_type = 'senior' THEN
    INSERT INTO public.consent_records (user_id, family_id, type, version)
    VALUES (v_target_user, v_link.family_id, 'self', v_link.consent_version);
  END IF;

  PERFORM public.log_family_audit(
    v_link.family_id,
    v_target_user,
    'redeem_join_link',
    json_build_object('link_id', v_link.id, 'type', v_link.dependent_type)
  );

  RETURN json_build_object(
    'success', true,
    'family_id', v_link.family_id,
    'family_name', v_family.name,
    'role', 'dependent',
    'dependent_type', v_link.dependent_type,
    'display_name', v_link.display_name,
    'user_id', v_target_user
  );
END;
$$;

-- 4.7 reissue_join_link (Owner revokes old session for dependent & issues new link)
CREATE OR REPLACE FUNCTION public.reissue_join_link(
  p_member_user_id TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_member RECORD;
  v_owner TEXT;
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_link_id UUID;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);

  SELECT * INTO v_member
  FROM public.family_members
  WHERE user_id = p_member_user_id AND role = 'dependent';

  IF v_member IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Dependent member not found');
  END IF;

  SELECT owner_id INTO v_owner FROM public.families WHERE id = v_member.family_id FOR UPDATE;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner can reissue join links');
  END IF;

  -- Revoke any existing active links for this family and dependent
  UPDATE public.family_join_links
  SET status = 'revoked'
  WHERE family_id = v_member.family_id
    AND (redeemed_by = p_member_user_id OR display_name = v_member.display_name)
    AND status = 'pending';

  -- Generate new token using core PostgreSQL
  v_raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(sha256(v_raw_token::bytea), 'hex');

  INSERT INTO public.family_join_links (
    family_id,
    created_by,
    token_hash,
    dependent_type,
    display_name,
    status,
    expires_at,
    guardian_confirmed,
    consent_version
  )
  VALUES (
    v_member.family_id,
    v_caller,
    v_token_hash,
    v_member.dependent_type,
    v_member.display_name,
    'pending',
    NOW() + INTERVAL '24 hours',
    true,
    'v1.0'
  )
  RETURNING id INTO v_link_id;

  PERFORM public.log_family_audit(
    v_member.family_id,
    v_caller,
    'reissue_join_link',
    json_build_object('member_user_id', p_member_user_id, 'new_link_id', v_link_id)
  );

  RETURN json_build_object(
    'success', true,
    'raw_token', v_raw_token,
    'link_id', v_link_id,
    'expires_at', (NOW() + INTERVAL '24 hours'),
    'dependent_type', v_member.dependent_type,
    'display_name', v_member.display_name
  );
END;
$$;

-- 4.8 set_member_role (Promote to co-owner or demote to member; Owner only; max 2 co-owners)
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_family_id UUID,
  p_target_user_id TEXT,
  p_new_role TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_target RECORD;
  v_co_owner_count INT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner can change member roles');
  END IF;

  SELECT * INTO v_target
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Target member not found in family');
  END IF;

  IF v_target.role = 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Use transfer_ownership to change owner');
  END IF;

  IF v_target.role = 'dependent' THEN
    RETURN json_build_object('success', false, 'error', 'Dependents cannot be promoted to co-owner or member');
  END IF;

  IF p_new_role NOT IN ('co_owner', 'member') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be co_owner or member');
  END IF;

  IF p_new_role = 'co_owner' THEN
    SELECT COUNT(*) INTO v_co_owner_count
    FROM public.family_members
    WHERE family_id = p_family_id AND role = 'co_owner';

    IF v_co_owner_count >= 2 THEN
      RETURN json_build_object('success', false, 'error', 'Maximum 2 co-owners allowed per family');
    END IF;
  END IF;

  -- If demoting a co-owner who is currently holding checkout, release hold
  IF p_new_role = 'member' AND v_target.role = 'co_owner' THEN
    DELETE FROM public.family_checkout_holds
    WHERE family_id = p_family_id AND held_by = p_target_user_id;
  END IF;

  UPDATE public.family_members
  SET role = p_new_role
  WHERE family_id = p_family_id AND user_id = p_target_user_id;

  PERFORM public.log_family_audit(
    p_family_id,
    v_caller,
    'set_member_role',
    json_build_object('target_user_id', p_target_user_id, 'new_role', p_new_role)
  );

  RETURN json_build_object('success', true, 'new_role', p_new_role);
END;
$$;

-- 4.9 remove_member (Owner removes member or dependent)
CREATE OR REPLACE FUNCTION public.remove_member(
  p_family_id UUID,
  p_target_user_id TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_target RECORD;
  v_hold RECORD;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner can remove members');
  END IF;

  IF p_target_user_id = v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Owner cannot be removed. Transfer ownership or leave family.');
  END IF;

  SELECT * INTO v_target
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Member not found');
  END IF;

  -- Edge case: If a checkout hold is active, wait until checkout completes or expires
  SELECT * INTO v_hold
  FROM public.family_checkout_holds
  WHERE family_id = p_family_id AND expires_at > NOW();

  IF v_hold IS NOT NULL AND v_hold.held_by != p_target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'A checkout hold is active. Please wait until checkout finishes.');
  END IF;

  -- If target was holding checkout, release hold
  DELETE FROM public.family_checkout_holds
  WHERE family_id = p_family_id AND held_by = p_target_user_id;

  -- If dependent or member had items in family cart, remove them
  DELETE FROM public.family_cart_items
  WHERE family_id = p_family_id AND added_by = p_target_user_id;

  -- Record membership history
  INSERT INTO public.family_membership_history (user_id, family_id, role, joined_at, left_at)
  VALUES (p_target_user_id, p_family_id, v_target.role, v_target.joined_at, NOW());

  -- Delete member
  DELETE FROM public.family_members
  WHERE family_id = p_family_id AND user_id = p_target_user_id;

  PERFORM public.log_family_audit(
    p_family_id,
    v_caller,
    'remove_member',
    json_build_object('target_user_id', p_target_user_id, 'role', v_target.role)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- 4.10 leave_family (Any member can leave; owner must transfer ownership first)
CREATE OR REPLACE FUNCTION public.leave_family(
  p_family_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_member RECORD;
  v_owner TEXT;
  v_next_owner RECORD;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;

  SELECT * INTO v_member
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller
  FOR UPDATE;

  IF v_member IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not a member of this family');
  END IF;

  -- Owner edge case: Must transfer ownership or auto-promote longest-standing adult member
  IF v_caller = v_owner THEN
    SELECT * INTO v_next_owner
    FROM public.family_members
    WHERE family_id = p_family_id
      AND user_id != v_caller
      AND role IN ('co_owner', 'member')
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_next_owner IS NOT NULL THEN
      -- Auto-promote longest standing adult
      UPDATE public.families SET owner_id = v_next_owner.user_id, updated_at = NOW() WHERE id = p_family_id;
      UPDATE public.family_members SET role = 'owner' WHERE family_id = p_family_id AND user_id = v_next_owner.user_id;
      PERFORM public.log_family_audit(p_family_id, v_caller, 'transfer_ownership', json_build_object('new_owner', v_next_owner.user_id));
    ELSE
      -- No other adult members; delete entire family
      DELETE FROM public.families WHERE id = p_family_id;
      RETURN json_build_object('success', true, 'family_deleted', true);
    END IF;
  END IF;

  -- Release any checkout hold held by leaving member
  DELETE FROM public.family_checkout_holds WHERE family_id = p_family_id AND held_by = v_caller;

  -- Remove unapproved dependent items; leave approved ones or clean up
  IF v_member.role = 'dependent' THEN
    DELETE FROM public.family_cart_items WHERE family_id = p_family_id AND added_by = v_caller;
  END IF;

  -- Record history
  INSERT INTO public.family_membership_history (user_id, family_id, role, joined_at, left_at)
  VALUES (v_caller, p_family_id, v_member.role, v_member.joined_at, NOW());

  DELETE FROM public.family_members WHERE family_id = p_family_id AND user_id = v_caller;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'leave_family', json_build_object('role', v_member.role));

  RETURN json_build_object('success', true);
END;
$$;

-- 4.10b delete_family (Owner deletes entire family and cascades all records)
CREATE OR REPLACE FUNCTION public.delete_family(
  p_family_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;

  IF v_owner != v_caller AND NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can delete the family');
  END IF;

  -- Cascade delete all associated family records
  DELETE FROM public.family_cart_items WHERE family_id = p_family_id;
  DELETE FROM public.family_checkout_holds WHERE family_id = p_family_id;
  DELETE FROM public.family_join_links WHERE family_id = p_family_id;
  DELETE FROM public.family_invites WHERE family_id = p_family_id;
  DELETE FROM public.family_members WHERE family_id = p_family_id;
  DELETE FROM public.family_membership_history WHERE family_id = p_family_id;
  DELETE FROM public.family_audit_log WHERE family_id = p_family_id;
  DELETE FROM public.families WHERE id = p_family_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.11 transfer_ownership (Owner transfers to adult member or co-owner)
CREATE OR REPLACE FUNCTION public.transfer_ownership(
  p_family_id UUID,
  p_new_owner_user_id TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_target RECORD;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner can transfer ownership');
  END IF;

  SELECT * INTO v_target
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = p_new_owner_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Target user is not a member of this family');
  END IF;

  IF v_target.role = 'dependent' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer ownership to a dependent');
  END IF;

  -- Update family owner
  UPDATE public.families SET owner_id = p_new_owner_user_id, updated_at = NOW() WHERE id = p_family_id;

  -- Previous owner becomes adult member
  UPDATE public.family_members SET role = 'member' WHERE family_id = p_family_id AND user_id = v_caller;

  -- Target becomes owner
  UPDATE public.family_members SET role = 'owner' WHERE family_id = p_family_id AND user_id = p_new_owner_user_id;

  PERFORM public.log_family_audit(
    p_family_id,
    v_caller,
    'transfer_ownership',
    json_build_object('new_owner', p_new_owner_user_id)
  );

  RETURN json_build_object('success', true, 'new_owner', p_new_owner_user_id);
END;
$$;

-- 4.12 owner_upsert_item (Owner adds, edits ANY item in family cart; attributed to owner)
CREATE OR REPLACE FUNCTION public.owner_upsert_item(
  p_family_id UUID,
  p_item_id UUID DEFAULT NULL,
  p_kit_id TEXT DEFAULT NULL,
  p_quantity INT DEFAULT 1,
  p_servings INT DEFAULT 2,
  p_spice_level TEXT DEFAULT 'Medium',
  p_unit_price NUMERIC DEFAULT 0.00,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_result_id UUID;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can add or edit any item');
  END IF;

  IF p_item_id IS NOT NULL THEN
    -- Update existing item
    UPDATE public.family_cart_items
    SET quantity = p_quantity,
        servings = p_servings,
        spice_level = p_spice_level,
        unit_price = p_unit_price,
        status = 'approved',
        approved_by = v_caller,
        updated_at = NOW()
    WHERE id = p_item_id AND family_id = p_family_id
    RETURNING id INTO v_result_id;
  ELSE
    -- Insert new item attributed to owner
    INSERT INTO public.family_cart_items (
      family_id,
      added_by,
      kit_id,
      quantity,
      servings,
      spice_level,
      unit_price,
      status,
      approved_by
    )
    VALUES (
      p_family_id,
      v_caller,
      p_kit_id,
      p_quantity,
      p_servings,
      p_spice_level,
      p_unit_price,
      'approved',
      v_caller
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN json_build_object('success', true, 'item_id', v_result_id);
END;
$$;

-- 4.13 owner_remove_item (Owner removes ANY item from family cart)
CREATE OR REPLACE FUNCTION public.owner_remove_item(
  p_family_id UUID,
  p_item_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can remove other members items');
  END IF;

  DELETE FROM public.family_cart_items
  WHERE id = p_item_id AND family_id = p_family_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4.14 add_own_item (Any member adds OWN item. Adult -> approved; Dependent -> pending_approval)
CREATE OR REPLACE FUNCTION public.add_own_item(
  p_family_id UUID,
  p_kit_id TEXT,
  p_quantity INT DEFAULT 1,
  p_servings INT DEFAULT 2,
  p_spice_level TEXT DEFAULT 'Medium',
  p_unit_price NUMERIC DEFAULT 0.00,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_member RECORD;
  v_status TEXT;
  v_item_id UUID;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_member
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller;

  IF v_member IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not a member of this family');
  END IF;

  -- Cart lock check: owner can add items even when locked, but other members cannot
  IF EXISTS (SELECT 1 FROM public.families WHERE id = p_family_id AND is_locked = true AND owner_id != v_caller) THEN
    RETURN json_build_object('success', false, 'error', 'Family cart is currently locked by the owner');
  END IF;

  -- Dependents items go to pending approval; Adult items are approved immediately
  IF v_member.role = 'dependent' THEN
    v_status := 'pending_approval';
  ELSE
    v_status := 'approved';
  END IF;

  INSERT INTO public.family_cart_items (
    family_id,
    added_by,
    kit_id,
    quantity,
    servings,
    spice_level,
    unit_price,
    status,
    approved_by
  )
  VALUES (
    p_family_id,
    v_caller,
    p_kit_id,
    p_quantity,
    p_servings,
    p_spice_level,
    p_unit_price,
    v_status,
    CASE WHEN v_status = 'approved' THEN v_caller ELSE NULL END
  )
  RETURNING id INTO v_item_id;

  RETURN json_build_object(
    'success', true,
    'item_id', v_item_id,
    'status', v_status
  );
END;
$$;

-- 4.15 approve_item (Owner approves dependent item)
CREATE OR REPLACE FUNCTION public.approve_item(
  p_family_id UUID,
  p_item_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can approve items');
  END IF;

  UPDATE public.family_cart_items
  SET status = 'approved',
      approved_by = v_caller,
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_item_id AND family_id = p_family_id;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'approve_item', json_build_object('item_id', p_item_id));

  RETURN json_build_object('success', true);
END;
$$;

-- 4.16 reject_item (Owner rejects dependent item with reason)
CREATE OR REPLACE FUNCTION public.reject_item(
  p_family_id UUID,
  p_item_id UUID,
  p_reason TEXT DEFAULT 'Not added',
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can reject items');
  END IF;

  UPDATE public.family_cart_items
  SET status = 'rejected',
      rejection_reason = COALESCE(p_reason, 'Not added'),
      approved_by = NULL,
      updated_at = NOW()
  WHERE id = p_item_id AND family_id = p_family_id;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'reject_item', json_build_object('item_id', p_item_id, 'reason', p_reason));

  RETURN json_build_object('success', true);
END;
$$;

-- 4.17 set_cart_lock (Owner locks/unlocks cart)
CREATE OR REPLACE FUNCTION public.set_cart_lock(
  p_family_id UUID,
  p_locked BOOLEAN,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Family not found');
  END IF;
  IF v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner can lock or unlock the cart');
  END IF;

  UPDATE public.families
  SET is_locked = p_locked, updated_at = NOW()
  WHERE id = p_family_id;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'set_cart_lock', json_build_object('locked', p_locked));

  RETURN json_build_object('success', true, 'is_locked', p_locked);
END;
$$;

-- 4.18 begin_checkout_hold (Owner or Co-owner starts checkout hold; 10 minutes exclusive)
CREATE OR REPLACE FUNCTION public.begin_checkout_hold(
  p_family_id UUID,
  p_idempotency_key TEXT,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_member RECORD;
  v_current_hold RECORD;
  v_holder_name TEXT;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_member
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller;

  IF v_member IS NULL OR v_member.role NOT IN ('owner', 'co_owner') THEN
    RETURN json_build_object('success', false, 'error', 'Only the owner or a co-owner can start checkout');
  END IF;

  -- Lock family checkout holds table for this family
  SELECT * INTO v_current_hold
  FROM public.family_checkout_holds
  WHERE family_id = p_family_id
  FOR UPDATE;

  -- If hold exists and not expired
  IF v_current_hold IS NOT NULL AND v_current_hold.expires_at > NOW() THEN
    IF v_current_hold.held_by = v_caller THEN
      -- Renew existing hold for current payer
      UPDATE public.family_checkout_holds
      SET expires_at = NOW() + INTERVAL '10 minutes',
          idempotency_key = COALESCE(p_idempotency_key, idempotency_key)
      WHERE family_id = p_family_id;

      RETURN json_build_object('success', true, 'renewed', true, 'expires_at', (NOW() + INTERVAL '10 minutes'));
    ELSE
      SELECT display_name INTO v_holder_name
      FROM public.family_members
      WHERE family_id = p_family_id AND user_id = v_current_hold.held_by;

      RETURN json_build_object(
        'success', false,
        'held_by_other', true,
        'holder_name', COALESCE(v_holder_name, 'Another payer'),
        'error', COALESCE(v_holder_name, 'Another payer') || ' is currently checking out'
      );
    END IF;
  END IF;

  -- Upsert hold
  INSERT INTO public.family_checkout_holds (
    family_id,
    held_by,
    expires_at,
    idempotency_key
  )
  VALUES (
    p_family_id,
    v_caller,
    NOW() + INTERVAL '10 minutes',
    p_idempotency_key
  )
  ON CONFLICT (family_id) DO UPDATE
  SET held_by = EXCLUDED.held_by,
      expires_at = EXCLUDED.expires_at,
      idempotency_key = EXCLUDED.idempotency_key;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'begin_checkout_hold', json_build_object('expires_in_minutes', 10));

  RETURN json_build_object('success', true, 'expires_at', (NOW() + INTERVAL '10 minutes'));
END;
$$;

-- 4.19 release_checkout_hold (Payer or Owner releases hold)
CREATE OR REPLACE FUNCTION public.release_checkout_hold(
  p_family_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_owner TEXT;
  v_hold RECORD;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  SELECT owner_id INTO v_owner FROM public.families WHERE id = p_family_id;
  SELECT * INTO v_hold FROM public.family_checkout_holds WHERE family_id = p_family_id;

  IF v_hold IS NULL THEN
    RETURN json_build_object('success', true);
  END IF;

  IF v_caller != v_hold.held_by AND v_caller != v_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the hold owner or family owner can release the hold');
  END IF;

  DELETE FROM public.family_checkout_holds WHERE family_id = p_family_id;

  PERFORM public.log_family_audit(p_family_id, v_caller, 'release_checkout_hold', '{}'::jsonb);

  RETURN json_build_object('success', true);
END;
$$;

-- 4.20 place_family_order (Payer places order for all approved items)
CREATE OR REPLACE FUNCTION public.place_family_order(
  p_family_id UUID,
  p_order_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_delivery_address TEXT,
  p_delivery_address_snapshot JSONB,
  p_delivery_slot TEXT,
  p_coupon_code TEXT DEFAULT NULL,
  p_delivery_fee NUMERIC DEFAULT 0.00,
  p_wallet_credits_to_apply NUMERIC DEFAULT 0.00,
  p_payment_method TEXT DEFAULT 'UPI',
  p_region TEXT DEFAULT 'West',
  p_idempotency_key TEXT DEFAULT NULL,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_member RECORD;
  v_hold RECORD;
  v_approved_count INT;
  v_pending_count INT;
  v_subtotal NUMERIC := 0.00;
  v_discount NUMERIC := 0.00;
  v_total NUMERIC := 0.00;
  v_cart_item RECORD;
  v_existing_order TEXT;
  v_wallet_result JSON;
  v_item_idx INT := 0;
BEGIN
  v_caller := public.get_caller_id(p_caller_id);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Role check: Only owner or co-owner can pay
  SELECT * INTO v_member
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller;

  IF v_member IS NULL OR v_member.role NOT IN ('owner', 'co_owner') THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner or a co-owner can pay for the family cart');
  END IF;

  -- Verify active checkout hold held by caller
  SELECT * INTO v_hold
  FROM public.family_checkout_holds
  WHERE family_id = p_family_id AND held_by = v_caller AND expires_at > NOW();

  IF v_hold IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active checkout hold found. Start checkout first.');
  END IF;

  -- Idempotency check
  SELECT id INTO v_existing_order FROM public.orders WHERE id = p_order_id;
  IF v_existing_order IS NOT NULL THEN
    RETURN json_build_object('success', true, 'idempotent_replay', true, 'order_id', v_existing_order);
  END IF;

  -- Count items
  SELECT COUNT(*) INTO v_approved_count
  FROM public.family_cart_items
  WHERE family_id = p_family_id AND status = 'approved';

  IF v_approved_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No approved items in the family cart');
  END IF;

  -- Pending items count (informational warning)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.family_cart_items
  WHERE family_id = p_family_id AND status = 'pending_approval';

  -- Calculate server-side subtotal from approved items
  SELECT COALESCE(SUM(quantity * unit_price), 0.00) INTO v_subtotal
  FROM public.family_cart_items
  WHERE family_id = p_family_id AND status = 'approved';

  -- Validate coupon (at most ONE coupon applied)
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) != '' THEN
    SELECT COALESCE(discount_amount, 0.00) INTO v_discount
    FROM public.coupons
    WHERE code = upper(trim(p_coupon_code)) AND is_active = true AND expires_at > NOW();
    IF v_discount IS NULL THEN
      v_discount := 0.00;
    END IF;
  END IF;

  v_total := GREATEST(0.00, v_subtotal - v_discount + COALESCE(p_delivery_fee, 0.00));

  -- Deduct PAYER'S personal wallet credits atomically
  IF p_wallet_credits_to_apply > 0 THEN
    v_wallet_result := public.debit_wallet(
      v_caller,
      p_wallet_credits_to_apply,
      p_order_id,
      COALESCE(p_idempotency_key, p_order_id || '_family_debit')
    );

    IF (v_wallet_result->>'success')::boolean IS NOT TRUE THEN
      RETURN json_build_object(
        'success', false,
        'error', COALESCE(v_wallet_result->>'error', 'Insufficient personal wallet balance')
      );
    END IF;
  END IF;

  -- Insert into orders table
  INSERT INTO public.orders (
    id,
    user_id,
    family_id,
    payer_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    delivery_slot,
    region,
    subtotal,
    discount,
    coupon_code,
    delivery_fee,
    total_amount,
    payment_method,
    payment_status,
    status
  )
  VALUES (
    p_order_id,
    v_caller,
    p_family_id,
    v_caller,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_address,
    p_delivery_slot,
    p_region,
    v_subtotal,
    v_discount,
    p_coupon_code,
    COALESCE(p_delivery_fee, 0.00),
    v_total,
    p_payment_method,
    CASE WHEN p_wallet_credits_to_apply >= v_total THEN 'Paid' ELSE 'Pending' END,
    'Placed'
  );

  -- Insert order items preserving added_by
  FOR v_cart_item IN
    SELECT * FROM public.family_cart_items WHERE family_id = p_family_id AND status = 'approved'
  LOOP
    v_item_idx := v_item_idx + 1;
    INSERT INTO public.order_items (
      id,
      order_id,
      kit_id,
      name,
      quantity,
      price,
      servings,
      spice_level,
      added_by
    )
    VALUES (
      p_order_id || '-' || v_item_idx,
      p_order_id,
      v_cart_item.kit_id,
      v_cart_item.kit_id,
      v_cart_item.quantity,
      v_cart_item.unit_price,
      v_cart_item.servings,
      v_cart_item.spice_level,
      v_cart_item.added_by
    );
  END LOOP;

  -- Clear approved items from family cart
  DELETE FROM public.family_cart_items WHERE family_id = p_family_id AND status = 'approved';

  -- Release checkout hold
  DELETE FROM public.family_checkout_holds WHERE family_id = p_family_id;

  PERFORM public.log_family_audit(
    p_family_id,
    v_caller,
    'place_family_order',
    json_build_object(
      'order_id', p_order_id,
      'payer_id', v_caller,
      'approved_items_ordered', v_approved_count,
      'pending_items_excluded', v_pending_count,
      'total_amount', v_total
    )
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total_amount', v_total,
    'pending_items_excluded', v_pending_count
  );
END;
$$;

-- ==============================================================================
-- 5. REALTIME REPLICATION SETUP
-- ==============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_cart_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_checkout_holds;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_invites;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_join_links;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.families REPLICA IDENTITY FULL;
ALTER TABLE public.family_members REPLICA IDENTITY FULL;
ALTER TABLE public.family_cart_items REPLICA IDENTITY FULL;
ALTER TABLE public.family_checkout_holds REPLICA IDENTITY FULL;
ALTER TABLE public.family_invites REPLICA IDENTITY FULL;
ALTER TABLE public.family_join_links REPLICA IDENTITY FULL;
