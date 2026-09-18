-- ==============================================================================
-- RasoiGenie Supabase Complete Schema
-- Tables: user_profiles, orders, order_items, admin_notifications, meal_kits
-- ==============================================================================

-- 1. USER PROFILES & PREFERENCES
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

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for user_profiles"
  ON public.user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. MEAL KITS CATALOG
CREATE TABLE IF NOT EXISTS public.meal_kits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  prep_time INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  rating NUMERIC DEFAULT 4.8,
  reviews_count INTEGER DEFAULT 0,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  dietary_tags TEXT[] DEFAULT '{}',
  hero_image TEXT,
  description TEXT,
  spice_level TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meal_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for meal_kits"
  ON public.meal_kits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  delivery_slot TEXT,
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

CREATE POLICY "Allow public read-write for orders"
  ON public.orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. ORDER ITEMS
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

CREATE POLICY "Allow public read-write for order_items"
  ON public.order_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for admin_notifications"
  ON public.admin_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
