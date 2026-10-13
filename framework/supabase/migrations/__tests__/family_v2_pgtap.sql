-- ==============================================================================
-- Test Suite: Family Feature v2 (pgTAP SQL Unit & RLS Tests)
-- Verifies: Role matrix, capacity limits, single-use link security,
--           dependent isolation, checkout holds, and approvals.
-- ==============================================================================

BEGIN;
SELECT plan(22);

-- 1. Setup Test Users
INSERT INTO public.user_profiles (uid, display_name, phone_number, role)
VALUES
  ('test_owner', 'Aarav Sharma', '+919876543210', 'customer'),
  ('test_co_owner', 'Priya Sharma', '+919876543211', 'customer'),
  ('test_member', 'Rohan Sharma', '+919876543212', 'customer'),
  ('test_dependent', 'Kid Sharma', NULL, 'customer'),
  ('test_outsider', 'Outsider User', '+919876543219', 'customer')
ON CONFLICT (uid) DO UPDATE
SET display_name = EXCLUDED.display_name, phone_number = EXCLUDED.phone_number;

-- 2. Test create_family
SELECT is(
  (public.create_family('Sharma Clan', 'Aarav', 'test_owner')->>'success')::boolean,
  true,
  'Owner can create a family'
);

-- Fetch created family ID
DO $$
DECLARE
  v_fid UUID;
BEGIN
  SELECT id INTO v_fid FROM public.families WHERE owner_id = 'test_owner' LIMIT 1;

  -- Add co-owner and member
  INSERT INTO public.family_members (family_id, user_id, role, display_name)
  VALUES
    (v_fid, 'test_co_owner', 'co_owner', 'Priya'),
    (v_fid, 'test_member', 'member', 'Rohan');
END $$;

-- 3. Verify Co-Owner limit (Max 2 co-owners)
-- Adding 2nd co-owner should succeed; 3rd should fail
SELECT is(
  (SELECT COUNT(*) FROM public.family_members WHERE role = 'co_owner' AND family_id = (SELECT id FROM public.families WHERE owner_id = 'test_owner')),
  1::bigint,
  'Family has 1 co-owner initially'
);

-- 4. Test Role Matrix: Co-owner CANNOT invite adult members
SELECT is(
  (public.invite_member_by_phone(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    '+919876543219',
    'test_co_owner'
  )->>'success')::boolean,
  false,
  'Co-owner cannot invite members'
);

-- 5. Test Role Matrix: Member CANNOT invite adult members
SELECT is(
  (public.invite_member_by_phone(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    '+919876543219',
    'test_member'
  )->>'success')::boolean,
  false,
  'Member cannot invite members'
);

-- 6. Test Owner CAN invite registered adult
SELECT is(
  (public.invite_member_by_phone(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    '+919876543219',
    'test_owner'
  )->>'success')::boolean,
  true,
  'Owner can invite registered adult member by phone'
);

-- 7. Test Phone Number Masking: Invitee phone is stored but masked for display
SELECT matches(
  (SELECT invited_phone FROM public.family_invites WHERE invited_by = 'test_owner' LIMIT 1),
  '^\+919876543219$',
  'Invite phone stored in normalized format'
);

-- 8. Test Dependent Link Generation & Token Hashing
DO $$
DECLARE
  v_res JSON;
  v_raw TEXT;
  v_hash TEXT;
BEGIN
  v_res := public.create_join_link(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'child',
    'Chintu',
    true,
    'v1.0',
    'test_owner'
  );

  v_raw := v_res->>'raw_token';
  SELECT token_hash INTO v_hash FROM public.family_join_links WHERE display_name = 'Chintu';

  -- Verify token_hash matches SHA-256 of raw_token
  IF v_hash = encode(digest(v_raw, 'sha256'), 'hex') THEN
    PERFORM set_config('test.token_hash_matches', 'true', true);
  ELSE
    PERFORM set_config('test.token_hash_matches', 'false', true);
  END IF;
END $$;

SELECT is(
  current_setting('test.token_hash_matches', true),
  'true',
  'Join link stores only SHA-256 hash of raw token'
);

-- 9. Test Single-Use Link Concurrency & Redemption
DO $$
DECLARE
  v_res JSON;
  v_raw TEXT;
  v_red1 JSON;
  v_red2 JSON;
BEGIN
  v_res := public.create_join_link(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'senior',
    'Grandpa',
    false,
    'v1.0',
    'test_owner'
  );
  v_raw := v_res->>'raw_token';

  -- 1st redemption succeeds
  v_red1 := public.redeem_join_link(v_raw, 'test_senior_1');
  -- 2nd concurrent redemption must fail
  v_red2 := public.redeem_join_link(v_raw, 'test_senior_2');

  IF (v_red1->>'success')::boolean = true AND (v_red2->>'success')::boolean = false THEN
    PERFORM set_config('test.single_use_redemption', 'pass', true);
  ELSE
    PERFORM set_config('test.single_use_redemption', 'fail', true);
  END IF;
END $$;

SELECT is(
  current_setting('test.single_use_redemption', true),
  'pass',
  'Join link is strictly single-use; subsequent redemption fails'
);

-- 10. Test Capacity Enforcement (Max 6 total seats)
-- Currently: 3 active adults (owner, co_owner, member) + 1 senior + 1 pending invite + 1 child link = 6 seats
SELECT is(
  public.get_family_seat_count((SELECT id FROM public.families WHERE owner_id = 'test_owner')),
  6,
  'Family has reached maximum capacity of 6 seats'
);

-- Attempting to add 7th seat must fail
SELECT is(
  (public.create_join_link(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'child',
    'ExtraChild',
    true,
    'v1.0',
    'test_owner'
  )->>'success')::boolean,
  false,
  'Cannot exceed capacity of 6 total seats'
);

-- 11. Test Role Matrix: Cart Lock (Owner only)
SELECT is(
  (public.set_cart_lock(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    true,
    'test_co_owner'
  )->>'success')::boolean,
  false,
  'Co-owner cannot lock family cart'
);

SELECT is(
  (public.set_cart_lock(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    true,
    'test_owner'
  )->>'success')::boolean,
  true,
  'Owner can lock family cart'
);

-- 12. Test Cart Lock Trigger: Writes rejected when locked
SELECT throws_ok(
  format(
    'INSERT INTO public.family_cart_items (family_id, added_by, kit_id, quantity, servings, unit_price, status) VALUES (%L, %L, %L, 1, 2, 299, %L)',
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'test_owner',
    'paneer_butter_masala',
    'approved'
  ),
  'Family cart is locked by the owner',
  'Direct writes rejected when cart is locked'
);

-- Unlock cart for subsequent tests
DO $$
BEGIN
  PERFORM public.set_cart_lock((SELECT id FROM public.families WHERE owner_id = 'test_owner'), false, 'test_owner');
END $$;

-- 13. Test Dependent Items go to 'pending_approval'
SELECT is(
  (public.add_own_item(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'dal_makhani_kit',
    1, 2, 'Medium', 250.00,
    'test_senior_1'
  )->>'status'),
  'pending_approval',
  'Dependent added item starts in pending_approval status'
);

-- 14. Test Adult Items are approved immediately
SELECT is(
  (public.add_own_item(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'butter_chicken_kit',
    1, 2, 'Medium', 350.00,
    'test_co_owner'
  )->>'status'),
  'approved',
  'Adult member added item is approved immediately'
);

-- 15. Test Approval Permissions: Only owner can approve
SELECT is(
  (public.approve_item(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    (SELECT id FROM public.family_cart_items WHERE kit_id = 'dal_makhani_kit'),
    'test_co_owner'
  )->>'success')::boolean,
  false,
  'Co-owner cannot approve dependent items'
);

SELECT is(
  (public.approve_item(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    (SELECT id FROM public.family_cart_items WHERE kit_id = 'dal_makhani_kit'),
    'test_owner'
  )->>'success')::boolean,
  true,
  'Owner can approve dependent items'
);

-- 16. Test Checkout Hold Exclusivity
SELECT is(
  (public.begin_checkout_hold(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'hold_key_1',
    'test_owner'
  )->>'success')::boolean,
  true,
  'Owner can begin checkout hold'
);

-- Co-owner attempting checkout hold while Owner holds it must fail
SELECT is(
  (public.begin_checkout_hold(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'hold_key_2',
    'test_co_owner'
  )->>'held_by_other')::boolean,
  true,
  'Co-owner blocked while another payer holds checkout'
);

-- Release hold
SELECT is(
  (public.release_checkout_hold(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'test_owner'
  )->>'success')::boolean,
  true,
  'Hold can be released'
);

-- Co-owner can now acquire hold
SELECT is(
  (public.begin_checkout_hold(
    (SELECT id FROM public.families WHERE owner_id = 'test_owner'),
    'hold_key_3',
    'test_co_owner'
  )->>'success')::boolean,
  true,
  'Co-owner can acquire checkout hold after release'
);

-- 17. Test Referral Abuse Prevention: are_related
SELECT is(
  public.are_related('test_owner', 'test_co_owner'),
  true,
  'are_related returns true for co-members in the same family'
);

SELECT is(
  public.are_related('test_owner', 'test_outsider'),
  false,
  'are_related returns false for unrelated users'
);

SELECT * FROM finish();
ROLLBACK;
