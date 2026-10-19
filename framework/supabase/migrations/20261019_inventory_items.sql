-- ==============================================================================
-- Migration: Create inventory_items table for Inventory Hub
-- Date: 2026-10-19
-- 
-- HOW TO APPLY IN SUPABASE DASHBOARD:
-- 1. Log in to https://supabase.com/dashboard and navigate to your project.
-- 2. Open "SQL Editor" from the left navigation bar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- 4. Navigate to "Database" > "Replication" to verify that "inventory_items"
--    is toggled ON under the "supabase_realtime" publication.
-- ==============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'raw_ingredients', -- 'raw_ingredients' | 'packaging' | 'seasonings'
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  shelf_life_days INTEGER NOT NULL DEFAULT 7,
  threshold_low NUMERIC NOT NULL DEFAULT 10,
  region TEXT NOT NULL DEFAULT 'West',
  last_restocked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  storage_condition TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  cost_per_unit NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Full Replica Identity for Supabase Realtime
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;

-- 3. Add to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Row Level Security (RLS)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anonymous users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'inventory_items' 
      AND policyname = 'inventory_items_select_policy'
  ) THEN
    CREATE POLICY "inventory_items_select_policy"
      ON public.inventory_items FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow insert access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'inventory_items' 
      AND policyname = 'inventory_items_insert_policy'
  ) THEN
    CREATE POLICY "inventory_items_insert_policy"
      ON public.inventory_items FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow update access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'inventory_items' 
      AND policyname = 'inventory_items_update_policy'
  ) THEN
    CREATE POLICY "inventory_items_update_policy"
      ON public.inventory_items FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow delete access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'inventory_items' 
      AND policyname = 'inventory_items_delete_policy'
  ) THEN
    CREATE POLICY "inventory_items_delete_policy"
      ON public.inventory_items FOR DELETE
      USING (true);
  END IF;
END $$;

-- Index on name and section for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_section ON public.inventory_items(section);
CREATE INDEX IF NOT EXISTS idx_inventory_items_region ON public.inventory_items(region);
