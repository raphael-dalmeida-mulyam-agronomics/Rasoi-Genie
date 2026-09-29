-- ==============================================================================
-- Migration: Row Level Security (RLS) & Multi-Region Admins
-- Super Admin: raphael.dalmeida@mulyam.in
-- Many-to-many relationship: admin_users <-> admin_regions <-> regions
-- ==============================================================================

-- 1. Create regions table if not exists
CREATE TABLE IF NOT EXISTS public.regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.regions (id, name, description)
VALUES
  ('North', 'North Region (Delhi NCR, Noida, Lucknow, Jaipur)', 'Serving Delhi NCR, Punjab, UP, Haryana and Northern states'),
  ('South', 'South Region (Bengaluru, Hyderabad, Chennai, Kochi)', 'Serving Karnataka, Telangana, Tamil Nadu, Andhra Pradesh, Kerala'),
  ('West', 'West Region (Mumbai, Pune, Ahmedabad, Surat)', 'Serving Maharashtra, Gujarat, Goa and Western states'),
  ('East', 'East Region (Kolkata, Patna, Bhubaneswar, Guwahati)', 'Serving West Bengal, Odisha, Bihar and Eastern states')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for regions" ON public.regions;
CREATE POLICY "Allow public read access for regions" ON public.regions FOR SELECT USING (true);

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'regional_admin' CHECK (role IN ('super_admin', 'regional_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Super Admin
INSERT INTO public.admin_users (email, name, role)
VALUES ('raphael.dalmeida@mulyam.in', 'Raphael D''Almeida', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 3. Create admin_regions junction table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.admin_regions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_email TEXT NOT NULL REFERENCES public.admin_users(email) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_email, region_id)
);

-- 4. Update meal_kits columns for tags and trending
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'North';
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS available_regions TEXT[] DEFAULT ARRAY['North', 'South', 'West', 'East']::TEXT[];
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS cuisine TEXT NOT NULL DEFAULT 'North Indian';
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Curries & Gravies';
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS dish_type TEXT DEFAULT 'Curries & Gravies';
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS diet_type TEXT NOT NULL DEFAULT 'veg';
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT ARRAY['veg']::TEXT[];
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;
ALTER TABLE public.meal_kits ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Update orders column for region
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'North';

-- 5. Helper Functions
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

-- 6. Apply RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read admin_users for authenticated admins" ON public.admin_users;
CREATE POLICY "Allow read admin_users for authenticated admins" ON public.admin_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin can insert admin_users" ON public.admin_users;
CREATE POLICY "Super admin can insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update admin_users" ON public.admin_users;
CREATE POLICY "Super admin can update admin_users" ON public.admin_users FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete admin_users" ON public.admin_users;
CREATE POLICY "Super admin can delete admin_users" ON public.admin_users FOR DELETE USING (public.is_super_admin());

-- 7. Apply RLS on admin_regions
ALTER TABLE public.admin_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view their own region assignments or super admin views all" ON public.admin_regions;
CREATE POLICY "Admins can view their own region assignments or super admin views all"
  ON public.admin_regions FOR SELECT
  USING (public.is_super_admin() OR LOWER(admin_email) = public.current_auth_email());

DROP POLICY IF EXISTS "Only super admin can assign admins to regions" ON public.admin_regions;
CREATE POLICY "Only super admin can assign admins to regions" ON public.admin_regions FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super admin can update region assignments" ON public.admin_regions;
CREATE POLICY "Only super admin can update region assignments" ON public.admin_regions FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super admin can delete region assignments" ON public.admin_regions;
CREATE POLICY "Only super admin can delete region assignments" ON public.admin_regions FOR DELETE USING (public.is_super_admin());

-- 8. Apply RLS on meal_kits
ALTER TABLE public.meal_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for meal_kits" ON public.meal_kits;
DROP POLICY IF EXISTS "Meal kits select policy" ON public.meal_kits;
DROP POLICY IF EXISTS "Meal kits insert policy" ON public.meal_kits;
DROP POLICY IF EXISTS "Meal kits update policy" ON public.meal_kits;
DROP POLICY IF EXISTS "Meal kits delete policy" ON public.meal_kits;

CREATE POLICY "Meal kits select policy"
  ON public.meal_kits FOR SELECT
  USING (is_published = true OR public.can_admin_access_region(region, available_regions));

CREATE POLICY "Meal kits insert policy"
  ON public.meal_kits FOR INSERT
  WITH CHECK (public.can_admin_access_region(region, available_regions));

CREATE POLICY "Meal kits update policy"
  ON public.meal_kits FOR UPDATE
  USING (public.can_admin_access_region(region, available_regions))
  WITH CHECK (public.can_admin_access_region(region, available_regions));

CREATE POLICY "Meal kits delete policy"
  ON public.meal_kits FOR DELETE
  USING (public.can_admin_access_region(region, available_regions));

-- 9. Realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_regions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
