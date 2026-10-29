-- ==============================================================================
-- RasoiGenie Supabase Complete Schema
-- Tables: regions, admin_users, admin_regions, meal_kits, orders, order_items, admin_notifications, user_profiles
-- Includes: Row Level Security (RLS) for Super Admin and Regional Admins
-- ==============================================================================

-- 1. REGIONS CATALOG
CREATE TABLE IF NOT EXISTS public.regions (
  id TEXT PRIMARY KEY, -- 'North', 'South', 'West', 'East'
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Indian Operating Regions
INSERT INTO public.regions (id, name, description)
VALUES
  ('North', 'North Region (Delhi NCR, Noida, Lucknow, Jaipur)', 'Serving Delhi NCR, Punjab, UP, Haryana and Northern states'),
  ('South', 'South Region (Bengaluru, Hyderabad, Chennai, Kochi)', 'Serving Karnataka, Telangana, Tamil Nadu, Andhra Pradesh, Kerala'),
  ('West', 'West Region (Mumbai, Pune, Ahmedabad, Surat)', 'Serving Maharashtra, Gujarat, Goa and Western states'),
  ('East', 'East Region (Kolkata, Patna, Bhubaneswar, Guwahati)', 'Serving West Bengal, Odisha, Bihar and Eastern states')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for regions"
  ON public.regions FOR SELECT USING (true);

-- 2. ADMIN USERS & ROLES
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'regional_admin' CHECK (role IN ('super_admin', 'regional_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed designated Super Admin
INSERT INTO public.admin_users (email, name, role)
VALUES ('raphael.dalmeida@mulyam.in', 'Raphael D''Almeida', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 3. MANY-TO-MANY RELATIONSHIP: REGIONAL ADMINS <-> REGIONS
-- One admin can administer several regions, and one region can have several admins.
CREATE TABLE IF NOT EXISTS public.admin_regions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_email TEXT NOT NULL REFERENCES public.admin_users(email) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_email, region_id)
);

-- 4. RLS HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT LOWER(COALESCE(
    auth.jwt()->>'email',
    current_setting('request.jwt.claims', true)::jsonb->>'email',
    ''
  ));
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    public.current_auth_email() = 'raphael.dalmeida@mulyam.in'
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(email) = public.current_auth_email()
        AND role = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_admin_regions()
RETURNS TABLE (region_id TEXT) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ar.region_id
  FROM public.admin_regions ar
  WHERE LOWER(ar.admin_email) = public.current_auth_email();
$$;

CREATE OR REPLACE FUNCTION public.can_admin_access_region(check_region TEXT, check_available_regions TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.admin_regions ar
      WHERE LOWER(ar.admin_email) = public.current_auth_email()
        AND (
          ar.region_id = check_region
          OR (check_available_regions IS NOT NULL AND ar.region_id = ANY(check_available_regions))
        )
    );
$$;

-- RLS Policies for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read admin_users for authenticated admins"
  ON public.admin_users FOR SELECT
  USING (true);

CREATE POLICY "Super admin can insert admin_users"
  ON public.admin_users FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update admin_users"
  ON public.admin_users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can delete admin_users"
  ON public.admin_users FOR DELETE
  USING (public.is_super_admin());

-- RLS Policies for admin_regions
ALTER TABLE public.admin_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own region assignments or super admin views all"
  ON public.admin_regions FOR SELECT
  USING (
    public.is_super_admin()
    OR LOWER(admin_email) = public.current_auth_email()
  );

CREATE POLICY "Only super admin can assign admins to regions"
  ON public.admin_regions FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super admin can update region assignments"
  ON public.admin_regions FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super admin can delete region assignments"
  ON public.admin_regions FOR DELETE
  USING (public.is_super_admin());

-- 5. MEAL KITS CATALOG
CREATE TABLE IF NOT EXISTS public.meal_kits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hindi_name TEXT,
  tagline TEXT,
  description TEXT,
  region TEXT NOT NULL DEFAULT 'North',
  available_regions TEXT[] DEFAULT ARRAY['North', 'South', 'West', 'East']::TEXT[],
  cities TEXT[] DEFAULT '{}'::TEXT[],
  origin_city TEXT,
  cuisine TEXT NOT NULL DEFAULT 'North Indian',
  category TEXT NOT NULL DEFAULT 'Curries & Gravies',
  dish_type TEXT DEFAULT 'Curries & Gravies',
  diet_type TEXT NOT NULL DEFAULT 'veg',
  dietary_tags TEXT[] DEFAULT ARRAY['veg']::TEXT[],
  spice_level TEXT DEFAULT 'Medium',
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  prep_time INTEGER NOT NULL DEFAULT 15,
  prep_time_minutes INTEGER DEFAULT 30,
  servings INTEGER DEFAULT 2,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  rating NUMERIC DEFAULT 4.8,
  reviews_count INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 400,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  hero_image TEXT,
  image_url TEXT,
  is_trending BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  stock_status TEXT DEFAULT 'in_stock',
  in_stock BOOLEAN DEFAULT true,
  ingredients JSONB DEFAULT '[]'::jsonb,
  masala_sachets JSONB DEFAULT '[]'::jsonb,
  instructions JSONB DEFAULT '[]'::jsonb,
  nutrition JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on meal_kits
ALTER TABLE public.meal_kits ENABLE ROW LEVEL SECURITY;

-- Customers can view published meal kits, admins can view kits for their region(s), super admin sees all
CREATE POLICY "Meal kits select policy"
  ON public.meal_kits FOR SELECT
  USING (
    is_published = true
    OR public.can_admin_access_region(region, available_regions)
  );

-- Regional admins can insert meal kits in their assigned regions; super admin in any
CREATE POLICY "Meal kits insert policy"
  ON public.meal_kits FOR INSERT
  WITH CHECK (
    public.can_admin_access_region(region, available_regions)
  );

-- Regional admins can update meal kits in their assigned regions; super admin in any
CREATE POLICY "Meal kits update policy"
  ON public.meal_kits FOR UPDATE
  USING (public.can_admin_access_region(region, available_regions))
  WITH CHECK (public.can_admin_access_region(region, available_regions));

-- Regional admins can delete meal kits in their assigned regions; super admin in any
CREATE POLICY "Meal kits delete policy"
  ON public.meal_kits FOR DELETE
  USING (public.can_admin_access_region(region, available_regions));

-- 6. USER PROFILES & PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  uid TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  phone_number TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_payment_method TEXT DEFAULT 'UPI',
  is_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for user_profiles"
  ON public.user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. ORDERS & REGIONAL SCOPING
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  delivery_slot TEXT,
  region TEXT DEFAULT 'North',
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  coupon_code TEXT,
  delivery_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'Pending',
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'Placed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_delivery TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders select policy"
  ON public.orders FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()::text
    OR public.can_admin_access_region(region, ARRAY[region])
  );

CREATE POLICY "Orders insert policy"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Orders update policy"
  ON public.orders FOR UPDATE
  USING (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region])
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region])
  );

-- 8. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  servings INTEGER DEFAULT 2,
  spice_level TEXT,
  masala_sachets JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items select policy"
  ON public.order_items FOR SELECT
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid()::text OR public.can_admin_access_region(o.region, ARRAY[o.region]))
    )
  );

CREATE POLICY "Order items insert policy"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

-- 9. ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  region TEXT DEFAULT 'North',
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin notifications select policy"
  ON public.admin_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region])
  );

CREATE POLICY "Admin notifications insert-update policy"
  ON public.admin_notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. CHEF PROFILES & CHEF SUBMISSIONS
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

DROP POLICY IF EXISTS "chef_profiles readable" ON public.chef_profiles;
CREATE POLICY "chef_profiles readable" ON public.chef_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "chef_profiles writable" ON public.chef_profiles;
CREATE POLICY "chef_profiles writable" ON public.chef_profiles FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.chef_submissions (
  id                        TEXT PRIMARY KEY,
  slug                      TEXT,
  name                      TEXT NOT NULL,
  tagline                   TEXT DEFAULT '',
  description               TEXT DEFAULT '',
  hero_image                TEXT DEFAULT '',
  gallery_images            TEXT[] DEFAULT '{}'::TEXT[],
  diet                      TEXT NOT NULL DEFAULT 'veg',
  cuisine                   TEXT NOT NULL DEFAULT 'North Indian',
  dish_category             TEXT,
  spice_level               TEXT DEFAULT 'Medium',
  servings                  INTEGER DEFAULT 2,
  prep_time_minutes         INTEGER DEFAULT 15,
  cook_time_minutes         INTEGER DEFAULT 30,
  dietary_tags              TEXT[] DEFAULT ARRAY['veg']::TEXT[],
  allergens                 TEXT[] DEFAULT '{}'::TEXT[],
  ingredients               JSONB DEFAULT '[]'::JSONB,
  recipe_steps              JSONB DEFAULT '[]'::JSONB,
  chef_id                   TEXT NOT NULL,
  chef_name                 TEXT NOT NULL,
  submission_status         TEXT NOT NULL DEFAULT 'pending_review',
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at               TIMESTAMPTZ,
  review_notes              TEXT,
  price                     NUMERIC,
  available_regions         TEXT[] DEFAULT '{}'::TEXT[],
  available_storage_centres TEXT[] DEFAULT '{}'::TEXT[],
  cities                    TEXT[] DEFAULT '{}'::TEXT[]
);

CREATE INDEX IF NOT EXISTS chef_submissions_chef_id_idx ON public.chef_submissions (chef_id);
CREATE INDEX IF NOT EXISTS chef_submissions_status_idx ON public.chef_submissions (submission_status);

ALTER TABLE public.chef_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_submissions readable" ON public.chef_submissions;
CREATE POLICY "chef_submissions readable" ON public.chef_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "chef_submissions writable" ON public.chef_submissions;
CREATE POLICY "chef_submissions writable" ON public.chef_submissions FOR ALL USING (true) WITH CHECK (true);

-- 11. CASCADE USER DELETION TRIGGER
CREATE OR REPLACE FUNCTION public.cascade_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chef_profiles
  WHERE uid = OLD.uid
     OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));

  DELETE FROM public.chef_submissions
  WHERE chef_id = OLD.uid;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_user_deletion ON public.user_profiles;
CREATE TRIGGER trg_cascade_user_deletion
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_user_deletion();

-- 12. REALTIME REPLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_kits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_regions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_submissions;

-- 13. POSTGREST / SUPABASE DATA API PERMISSIONS
-- Complies with Supabase October 30, 2026 update regarding Data API access for tables in public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Maintain automatic Data API access for newly created tables in the public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 14. WEEKLY MEAL SUBSCRIPTIONS
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
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_attempts INTEGER NOT NULL DEFAULT 0,
  next_renewal_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_renewed_period_end TIMESTAMPTZ,
  region TEXT DEFAULT 'West',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON public.subscriptions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_family ON public.subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_renew ON public.subscriptions(auto_renew);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_renewal ON public.subscriptions(next_renewal_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_region ON public.subscriptions(region);

CREATE TABLE IF NOT EXISTS public.subscription_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  is_dependent BOOLEAN NOT NULL DEFAULT false,
  plan_type TEXT NOT NULL DEFAULT 'standard' CHECK (plan_type IN ('standard', 'custom')),
  standard_plan_key TEXT,
  plan_group TEXT,
  price_per_week NUMERIC NOT NULL DEFAULT 1299,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sub_member UNIQUE (subscription_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_members_sub_id ON public.subscription_members(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_members_plan_group ON public.subscription_members(plan_group);

CREATE TABLE IF NOT EXISTS public.subscription_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  meal_kit_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sub_member_day UNIQUE (subscription_id, member_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_sub_meals_sub_id ON public.subscription_meals(subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_meals ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.subscription_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_id TEXT,
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

ALTER TABLE public.subscription_pauses ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Subscriptions owner manage policy" ON public.subscriptions;
CREATE POLICY "Subscriptions owner manage policy"
  ON public.subscriptions FOR ALL
  USING (owner_user_id = auth.uid()::text OR owner_user_id = public.current_auth_email() OR public.is_super_admin())
  WITH CHECK (owner_user_id = auth.uid()::text OR owner_user_id = public.current_auth_email() OR public.is_super_admin());

DROP POLICY IF EXISTS "Subscriptions family members select policy" ON public.subscriptions;
CREATE POLICY "Subscriptions family members select policy"
  ON public.subscriptions FOR SELECT
  USING (
    owner_user_id = auth.uid()::text
    OR (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = subscriptions.family_id AND fm.user_id = auth.uid()::text
    ))
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Subscription members owner manage policy" ON public.subscription_members;
CREATE POLICY "Subscription members owner manage policy"
  ON public.subscription_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())));

DROP POLICY IF EXISTS "Subscription members family select policy" ON public.subscription_members;
CREATE POLICY "Subscription members family select policy"
  ON public.subscription_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (
        s.owner_user_id = auth.uid()::text
        OR (s.family_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.family_members fm WHERE fm.family_id = s.family_id AND fm.user_id = auth.uid()::text
        ))
        OR public.is_super_admin()
      )
  ));

DROP POLICY IF EXISTS "Subscription meals owner manage policy" ON public.subscription_meals;
CREATE POLICY "Subscription meals owner manage policy"
  ON public.subscription_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())));

DROP POLICY IF EXISTS "Subscription meals family select policy" ON public.subscription_meals;
CREATE POLICY "Subscription meals family select policy"
  ON public.subscription_meals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (
        s.owner_user_id = auth.uid()::text
        OR (s.family_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.family_members fm WHERE fm.family_id = s.family_id AND fm.user_id = auth.uid()::text
        ))
        OR public.is_super_admin()
      )
  ));

GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_meals TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Subscription pauses owner manage policy" ON public.subscription_pauses;
CREATE POLICY "Subscription pauses owner manage policy"
  ON public.subscription_pauses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.owner_user_id = auth.uid()::text OR public.is_super_admin())));

DROP POLICY IF EXISTS "Subscription pauses family select policy" ON public.subscription_pauses;
CREATE POLICY "Subscription pauses family select policy"
  ON public.subscription_pauses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (
        s.owner_user_id = auth.uid()::text
        OR (s.family_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.family_members fm WHERE fm.family_id = s.family_id AND fm.user_id = auth.uid()::text
        ))
        OR public.is_super_admin()
      )
  ));

GRANT ALL ON TABLE public.subscription_pauses TO anon, authenticated, service_role;




