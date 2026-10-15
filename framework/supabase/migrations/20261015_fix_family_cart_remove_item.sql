-- Migration: Fix family cart item removal and basket clearing for orders
-- Ensures both owners and members can remove items, and clears family basket when an order is placed.

-- 1. Ensure RLS allows DELETE on family_cart_items
DROP POLICY IF EXISTS "family_cart_items_no_direct_delete" ON public.family_cart_items;
DROP POLICY IF EXISTS "family_cart_items_delete" ON public.family_cart_items;
CREATE POLICY "family_cart_items_delete" ON public.family_cart_items FOR DELETE USING (true);

-- 2. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_cart_items TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_checkout_holds TO authenticated, anon, service_role;

-- 3. Modify trigger so it does NOT block deletions
DROP TRIGGER IF EXISTS trg_check_family_cart_locked ON public.family_cart_items;
CREATE TRIGGER trg_check_family_cart_locked
  BEFORE INSERT OR UPDATE ON public.family_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.check_family_cart_locked();

-- 4. Robust owner_remove_item function (direct deletion)
DROP FUNCTION IF EXISTS public.owner_remove_item(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.owner_remove_item(UUID, UUID);

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
  v_deleted_count INT;
BEGIN
  -- Perform direct deletion of the item by ID
  DELETE FROM public.family_cart_items
  WHERE id = p_item_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Grant execute permissions on function
GRANT EXECUTE ON FUNCTION public.owner_remove_item(UUID, UUID, TEXT) TO authenticated, anon, service_role;

-- 6. Add clear_family_cart function to clear all basket items after order is placed
DROP FUNCTION IF EXISTS public.clear_family_cart(UUID, TEXT);
DROP FUNCTION IF EXISTS public.clear_family_cart(UUID);

CREATE OR REPLACE FUNCTION public.clear_family_cart(
  p_family_id UUID,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_items INT;
BEGIN
  -- Clear all items belonging to this family basket
  DELETE FROM public.family_cart_items
  WHERE family_id = p_family_id;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;

  -- Release any active checkout hold for this family
  DELETE FROM public.family_checkout_holds
  WHERE family_id = p_family_id;

  RETURN json_build_object(
    'success', true,
    'deleted_items', v_deleted_items
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_family_cart(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.clear_family_cart(UUID) TO authenticated, anon, service_role;

-- 7. Add to realtime publication safely
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_cart_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.family_cart_items REPLICA IDENTITY FULL;

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';
