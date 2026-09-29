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

-- 10. REALTIME REPLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_kits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_regions;
