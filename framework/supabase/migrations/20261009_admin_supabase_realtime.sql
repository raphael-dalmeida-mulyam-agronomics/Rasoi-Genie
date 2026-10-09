-- ==============================================================================
-- Migration: Supabase Realtime for Admin Dashboard (Orders & Meal Kits)
-- Date: 2026-10-09
-- 
-- HOW TO APPLY IN SUPABASE DASHBOARD:
-- 1. Log in to https://supabase.com/dashboard and navigate to your project.
-- 2. Open "SQL Editor" from the left navigation bar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- 4. Navigate to "Database" > "Replication" to verify that "orders" and "meal_kits"
--    are toggled ON under the "supabase_realtime" publication.
-- ==============================================================================

-- 1. Enable Full Replica Identity
-- Full replica identity ensures that UPDATE and DELETE events include the old row
-- payload (required for regional admin filtering and instant UI row removal).
ALTER TABLE IF EXISTS public.orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.meal_kits REPLICA IDENTITY FULL;

-- 2. Guarded Addition to supabase_realtime Publication
-- Safely adds tables to the publication without throwing errors on re-execution.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meal_kits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_kits;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Verify / Ensure RLS Policies for Admin Realtime Visibility
-- Supabase Realtime strictly honors Row Level Security (RLS).
-- Admins will only receive realtime postgres_changes payloads for rows
-- they are permitted to SELECT.

-- Ensure orders SELECT policy permits Super Admins and Regional Admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'orders' 
      AND policyname = 'orders_select_policy'
  ) THEN
    CREATE POLICY "orders_select_policy"
      ON public.orders FOR SELECT
      USING (
        user_id = auth.uid()::text
        OR user_id LIKE 'guest_%'
        OR public.is_super_admin()
        OR public.can_admin_access_region(region, ARRAY[region]::TEXT[])
      );
  END IF;
END $$;

-- Ensure meal_kits SELECT policy permits Super Admins and Regional Admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'meal_kits' 
      AND policyname = 'Meal kits select policy'
  ) THEN
    CREATE POLICY "Meal kits select policy"
      ON public.meal_kits FOR SELECT
      USING (
        is_published = true 
        OR public.can_admin_access_region(region, available_regions)
      );
  END IF;
END $$;
