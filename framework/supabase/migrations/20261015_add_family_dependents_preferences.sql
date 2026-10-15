-- ==============================================================================
-- RasoiGenie Database Migration: Managed Family Dependents (Child / Senior)
-- Date: 2026-10-15
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Add preferences, age, and gender columns to family_members if not already present
ALTER TABLE public.family_members 
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT NULL;

ALTER TABLE public.family_members 
  ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT NULL;

ALTER TABLE public.family_members 
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL;

-- 2. Drop strict FK constraint on user_id if it exists, so non-auth dependents 
-- (e.g. dep_<uuid>) can be stored directly within family_members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'family_members_user_id_fkey' 
      AND table_name = 'family_members'
  ) THEN
    ALTER TABLE public.family_members DROP CONSTRAINT family_members_user_id_fkey;
  END IF;
END $$;

-- 3. RPC: add_dependent_member
-- Directly creates a child or senior citizen profile managed by the family owner/co-owner.
-- No invite or join link is generated.
DROP FUNCTION IF EXISTS public.add_dependent_member(UUID, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.add_dependent_member(UUID, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.add_dependent_member(
  p_family_id UUID,
  p_dependent_type TEXT,
  p_display_name TEXT,
  p_preferences JSONB DEFAULT NULL,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_caller_role TEXT;
  v_member_count INTEGER;
  v_dependent_id TEXT;
  v_clean_name TEXT;
  v_age INTEGER;
  v_gender TEXT;
BEGIN
  -- Determine caller
  v_caller := COALESCE(p_caller_id, auth.uid()::TEXT);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Validate caller has manage permissions (owner or co_owner)
  SELECT role INTO v_caller_role
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'co_owner') THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner or co-owner can add dependents');
  END IF;

  -- Validate dependent type
  IF p_dependent_type NOT IN ('child', 'senior') THEN
    RETURN json_build_object('success', false, 'error', 'Dependent type must be either child or senior');
  END IF;

  -- Validate display name
  v_clean_name := TRIM(p_display_name);
  IF v_clean_name IS NULL OR v_clean_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'Display name is required');
  END IF;

  -- Extract age and gender from preferences JSON if present
  IF p_preferences IS NOT NULL THEN
    BEGIN
      v_age := (p_preferences->>'age')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_age := NULL;
    END;
    v_gender := p_preferences->>'gender';
  END IF;

  -- Validate age ranges: 4-15 for child, 60-120 for senior
  IF p_dependent_type = 'child' AND (v_age IS NULL OR v_age < 4 OR v_age > 15) THEN
    RETURN json_build_object('success', false, 'error', 'Child age must be between 4 and 15 years');
  END IF;

  IF p_dependent_type = 'senior' AND (v_age IS NULL OR v_age < 60 OR v_age > 120) THEN
    RETURN json_build_object('success', false, 'error', 'Senior citizen age must be between 60 and 120 years');
  END IF;

  -- Check family capacity (max 6 members including pending phone invites)
  SELECT COUNT(*) INTO v_member_count
  FROM public.family_members
  WHERE family_id = p_family_id;

  IF v_member_count >= 6 THEN
    RETURN json_build_object('success', false, 'error', 'Family has reached the maximum capacity of 6 members');
  END IF;

  -- Generate unique dependent ID
  v_dependent_id := 'dep_' || gen_random_uuid()::TEXT;

  -- Insert dependent directly into family_members
  INSERT INTO public.family_members (
    family_id,
    user_id,
    role,
    dependent_type,
    display_name,
    age,
    gender,
    preferences,
    joined_at
  )
  VALUES (
    p_family_id,
    v_dependent_id,
    'dependent',
    p_dependent_type,
    v_clean_name,
    v_age,
    v_gender,
    COALESCE(p_preferences, '{}'::JSONB),
    NOW()
  );

  -- Log action in audit log if table exists
  BEGIN
    INSERT INTO public.family_audit_log (family_id, actor_id, action, details)
    VALUES (
      p_family_id,
      v_caller,
      'add_dependent',
      json_build_object(
        'dependent_id', v_dependent_id,
        'dependent_type', p_dependent_type,
        'display_name', v_clean_name,
        'age', v_age,
        'gender', v_gender
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'family_id', p_family_id,
      'user_id', v_dependent_id,
      'role', 'dependent',
      'dependent_type', p_dependent_type,
      'display_name', v_clean_name,
      'age', v_age,
      'gender', v_gender,
      'preferences', COALESCE(p_preferences, '{}'::JSONB),
      'joined_at', NOW()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. RPC: update_dependent_preferences
-- Allows owner or co-owner to update the taste and dietary preferences of a dependent profile.
DROP FUNCTION IF EXISTS public.update_dependent_preferences(UUID, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.update_dependent_preferences(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.update_dependent_preferences(
  p_family_id UUID,
  p_dependent_id TEXT,
  p_preferences JSONB,
  p_caller_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_caller_role TEXT;
  v_age INTEGER;
  v_gender TEXT;
BEGIN
  -- Determine caller
  v_caller := COALESCE(p_caller_id, auth.uid()::TEXT);
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Validate caller has manage permissions
  SELECT role INTO v_caller_role
  FROM public.family_members
  WHERE family_id = p_family_id AND user_id = v_caller;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'co_owner') THEN
    RETURN json_build_object('success', false, 'error', 'Only the family owner or co-owner can edit preferences');
  END IF;

  -- Check that target dependent exists in this family
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = p_family_id AND user_id = p_dependent_id AND role = 'dependent'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Dependent profile not found in this family');
  END IF;

  -- Extract age and gender if provided in preferences
  IF p_preferences IS NOT NULL THEN
    BEGIN
      v_age := (p_preferences->>'age')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_age := NULL;
    END;
    v_gender := p_preferences->>'gender';
  END IF;

  -- Update preferences and optionally age/gender
  UPDATE public.family_members
  SET preferences = p_preferences,
      age = COALESCE(v_age, age),
      gender = COALESCE(v_gender, gender)
  WHERE family_id = p_family_id AND user_id = p_dependent_id;

  -- Log action
  BEGIN
    INSERT INTO public.family_audit_log (family_id, actor_id, action, details)
    VALUES (
      p_family_id,
      v_caller,
      'update_dependent_preferences',
      json_build_object(
        'dependent_id', p_dependent_id,
        'preferences', p_preferences
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.add_dependent_member(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_dependent_preferences(UUID, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
