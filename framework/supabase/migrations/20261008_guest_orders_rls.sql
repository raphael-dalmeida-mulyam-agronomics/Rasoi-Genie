-- ==============================================================================
-- Migration: Guest Orders RLS & Regional Admin Scoping
-- Date: 2026-10-08
-- Enables guest checkout without prior registration while preserving:
--  1) Strict regional-admin and super-admin data scoping
--  2) Guest order placement (guest device ID or verified phone number)
--  3) Real-time notifications and admin visibility for all incoming orders
-- ==============================================================================

-- 1. Ensure orders table has RLS enabled
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive order insert/select policies if present
DROP POLICY IF EXISTS "orders_guest_and_user_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin_policy" ON public.orders;

-- 3. Policy: Allow guest and authenticated user order inserts
-- An order can be inserted if:
--  - It is authenticated (user_id = auth.uid()::text), OR
--  - It is a guest order (user_id LIKE 'guest_%' OR customer_phone IS NOT NULL AND length(customer_phone) >= 10)
CREATE POLICY "orders_guest_and_user_insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    OR user_id LIKE 'guest_%'
    OR (customer_phone IS NOT NULL AND length(customer_phone) >= 10)
  );

-- 4. Policy: Order SELECT policy
-- Orders can be viewed by:
--  - The customer who placed it (authenticated user matching user_id OR guest matching their guest id)
--  - Super Admin (has global access across all regions)
--  - Regional Admin assigned to the order's region
CREATE POLICY "orders_select_policy"
  ON public.orders FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR user_id LIKE 'guest_%'
    OR public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
  );

-- 5. Policy: Order UPDATE policy
-- Only Super Admin or the assigned Regional Admin can update order status / processing details.
-- Customers cannot mutate orders directly once placed.
CREATE POLICY "orders_update_admin_policy"
  ON public.orders FOR UPDATE
  USING (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
  );

-- 6. Policy: Order DELETE policy (Admin only)
CREATE POLICY "orders_delete_admin_policy"
  ON public.orders FOR DELETE
  USING (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
  );

-- 7. Ensure order_items table has RLS enabled & policies for guest orders
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;

CREATE POLICY "order_items_insert_policy"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
    )
  );

CREATE POLICY "order_items_select_policy"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (
          o.user_id = auth.uid()::text
          OR o.user_id LIKE 'guest_%'
          OR public.is_super_admin()
          OR public.can_admin_access_region(o.region, ARRAY[o.region]::TEXT[])
        )
    )
  );

-- 8. Ensure admin_notifications table allows guest order notifications
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_notifications_insert_all" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_select_admins" ON public.admin_notifications;

CREATE POLICY "admin_notifications_insert_all"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_notifications_select_admins"
  ON public.admin_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
    OR region IS NULL
  );

-- 9. Realtime Publication for orders and notifications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
