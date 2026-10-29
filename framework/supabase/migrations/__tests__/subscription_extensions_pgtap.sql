-- ==============================================================================
-- Test Suite: Subscription Extensions & Pauses (pgTAP SQL Unit & RLS Tests)
-- Verifies: subscription_pauses, auto_renew columns, per-member plan groups,
--           pause limits, and admin view/function.
-- ==============================================================================

BEGIN;
SELECT plan(14);

-- 1. Setup Test User
INSERT INTO public.user_profiles (uid, display_name, phone_number, role)
VALUES ('sub_ext_owner', 'Rohan SubOwner', '+919876543292', 'customer')
ON CONFLICT (uid) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 2. Verify subscription_pauses Table
SELECT has_table('public', 'subscription_pauses', 'Table public.subscription_pauses exists');

-- 3. Verify columns in subscriptions
SELECT has_column('public', 'subscriptions', 'auto_renew', 'subscriptions has auto_renew column');
SELECT has_column('public', 'subscriptions', 'renewal_attempts', 'subscriptions has renewal_attempts column');
SELECT has_column('public', 'subscriptions', 'next_renewal_at', 'subscriptions has next_renewal_at column');
SELECT has_column('public', 'subscriptions', 'cancel_at_period_end', 'subscriptions has cancel_at_period_end column');
SELECT has_column('public', 'subscriptions', 'region', 'subscriptions has region column');

-- 4. Verify columns in subscription_members
SELECT has_column('public', 'subscription_members', 'plan_group', 'subscription_members has plan_group column');
SELECT has_column('public', 'subscription_members', 'price_per_week', 'subscription_members has price_per_week column');

-- 5. Verify columns in subscription_pauses
SELECT has_column('public', 'subscription_pauses', 'id', 'subscription_pauses has id column');
SELECT has_column('public', 'subscription_pauses', 'subscription_id', 'subscription_pauses has subscription_id column');
SELECT has_column('public', 'subscription_pauses', 'member_id', 'subscription_pauses has member_id column');
SELECT has_column('public', 'subscription_pauses', 'days_count', 'subscription_pauses has days_count column');

-- 6. Verify admin view & RPC
SELECT has_view('public', 'admin_subscriptions_view', 'View public.admin_subscriptions_view exists');
SELECT has_function('public', 'admin_cancel_subscription', 'Function public.admin_cancel_subscription exists');

-- 7. Test Check Constraint: Pause > 7 consecutive days throws check constraint violation
PREPARE insert_invalid_pause AS
  INSERT INTO public.subscription_pauses (
    subscription_id, start_date, end_date, created_by
  ) VALUES (
    gen_random_uuid(), '2026-11-01', '2026-11-10', 'sub_ext_owner'
  );

SELECT throws_ok(
  'insert_invalid_pause',
  '23514',
  NULL,
  'Pause longer than 7 consecutive days throws check constraint violation'
);

SELECT * FROM finish();
ROLLBACK;

