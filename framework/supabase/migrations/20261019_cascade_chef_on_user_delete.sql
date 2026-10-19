-- ==============================================================================
-- Migration: Cascade chef_profiles and submissions deletion when user_profile is deleted
-- Date: 2026-10-19
-- 
-- HOW TO APPLY IN SUPABASE DASHBOARD:
-- 1. Log in to https://supabase.com/dashboard and navigate to your project.
-- 2. Open "SQL Editor" from the left navigation bar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- ==============================================================================

-- 1. Trigger function to automatically cascade user deletion to chef_profiles and chef_submissions
CREATE OR REPLACE FUNCTION public.cascade_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- If deleted user is an approved chef, remove their chef_profiles record
  DELETE FROM public.chef_profiles
  WHERE uid = OLD.uid
     OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));

  -- Clean up any chef submissions submitted by this chef
  DELETE FROM public.chef_submissions
  WHERE chef_id = OLD.uid;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to user_profiles
DROP TRIGGER IF EXISTS trg_cascade_user_deletion ON public.user_profiles;
CREATE TRIGGER trg_cascade_user_deletion
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_user_deletion();

-- 3. Purge any orphan chef profiles where the user profile no longer exists
DELETE FROM public.chef_profiles
WHERE uid NOT IN (SELECT uid FROM public.user_profiles)
  AND (
    email IS NULL 
    OR lower(email) NOT IN (SELECT lower(email) FROM public.user_profiles WHERE email IS NOT NULL)
  );
