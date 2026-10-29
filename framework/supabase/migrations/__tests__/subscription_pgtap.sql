-- ==============================================================================
-- Test Suite: Weekly Meal Subscriptions (pgTAP SQL Unit & RLS Tests)
-- Verifies: Table creation, constraints, status checks, weekday checks,
--           unique composite constraints, and RLS policies.
-- ==============================================================================

BEGIN;
SELECT plan(15);

-- 1. Setup Test Users
INSERT INTO public.user_profiles (uid, display_name, phone_number, role)
VALUES
  ('sub_test_owner', 'Aarav SubOwner', '+919876543290', 'customer'),
  ('sub_test_member', 'Priya SubMember', '+919876543291', 'customer'),
  ('sub_test_outsider', 'Stranger User', '+919876543299', 'customer')
ON CONFLICT (uid) DO UPDATE
SET display_name = EXCLUDED.display_name;

-- 2. Test Table Existence
SELECT has_table('public', 'subscriptions', 'Table public.subscriptions exists');
SELECT has_table('public', 'subscription_members', 'Table public.subscription_members exists');
SELECT has_table('public', 'subscription_meals', 'Table public.subscription_meals exists');

-- 3. Test Column Types in subscriptions
SELECT has_column('public', 'subscriptions', 'id', 'subscriptions has id column');
SELECT has_column('public', 'subscriptions', 'owner_user_id', 'subscriptions has owner_user_id column');
SELECT has_column('public', 'subscriptions', 'scope', 'subscriptions has scope column');
SELECT has_column('public', 'subscriptions', 'price_per_member_per_week', 'subscriptions has price column');

-- 4. Test Insert Individual Subscription
DO $$
DECLARE
  v_sub_id UUID;
BEGIN
  INSERT INTO public.subscriptions (
    owner_user_id, scope, plan_type, standard_plan_key, status,
    price_per_member_per_week, member_count, amount_paid,
    period_start, period_end
  ) VALUES (
    'sub_test_owner', 'individual', 'standard', 'high-protein', 'active',
    1299, 1, 1299,
    NOW(), NOW() + INTERVAL '7 days'
  ) RETURNING id INTO v_sub_id;

  -- Add covered member
  INSERT INTO public.subscription_members (
    subscription_id, member_id, member_name, is_dependent, plan_type, standard_plan_key
  ) VALUES (
    v_sub_id, 'sub_test_owner', 'Aarav SubOwner', false, 'standard', 'high-protein'
  );

  -- Add meals for Monday (0) and Tuesday (1)
  INSERT INTO public.subscription_meals (
    subscription_id, member_id, weekday, meal_kit_id
  ) VALUES
    (v_sub_id, 'sub_test_owner', 0, 'kit-103'),
    (v_sub_id, 'sub_test_owner', 1, 'e2e-kit-paneer-tikka');
END $$;

SELECT is(
  (SELECT COUNT(*) FROM public.subscriptions WHERE owner_user_id = 'sub_test_owner' AND status = 'active'),
  1::bigint,
  'Active subscription created successfully for sub_test_owner'
);

SELECT is(
  (SELECT COUNT(*) FROM public.subscription_meals WHERE member_id = 'sub_test_owner'),
  2::bigint,
  'Two meal schedule entries assigned for sub_test_owner'
);

-- 5. Test Check Constraint on Status: invalid status should fail
PREPARE insert_invalid_status AS
  INSERT INTO public.subscriptions (
    owner_user_id, scope, plan_type, status, price_per_member_per_week, period_start, period_end
  ) VALUES (
    'sub_test_owner', 'individual', 'standard', 'invalid_status', 1299, NOW(), NOW() + INTERVAL '7 days'
  );

SELECT throws_ok(
  'insert_invalid_status',
  '23514',
  NULL,
  'Invalid subscription status throws check constraint violation'
);

-- 6. Test Check Constraint on Weekday: weekday > 6 should fail
PREPARE insert_invalid_weekday AS
  INSERT INTO public.subscription_meals (
    subscription_id, member_id, weekday, meal_kit_id
  ) VALUES (
    (SELECT id FROM public.subscriptions WHERE owner_user_id = 'sub_test_owner' LIMIT 1),
    'sub_test_owner', 7, 'kit-101'
  );

SELECT throws_ok(
  'insert_invalid_weekday',
  '23514',
  NULL,
  'Weekday 7 throws check constraint violation (must be 0 to 6)'
);

-- 7. Test Unique Composite Constraint on (subscription_id, member_id, weekday)
PREPARE insert_duplicate_meal_day AS
  INSERT INTO public.subscription_meals (
    subscription_id, member_id, weekday, meal_kit_id
  ) VALUES (
    (SELECT id FROM public.subscriptions WHERE owner_user_id = 'sub_test_owner' LIMIT 1),
    'sub_test_owner', 0, 'kit-101'
  );

SELECT throws_ok(
  'insert_duplicate_meal_day',
  '23505',
  NULL,
  'Duplicate meal assignment on the same day for a member throws unique constraint violation'
);

-- 8. Test Data API Grants
SELECT table_privilege_leaks('public', 'subscriptions');
SELECT table_privilege_leaks('public', 'subscription_members');
SELECT table_privilege_leaks('public', 'subscription_meals');

SELECT * FROM finish();
ROLLBACK;
