import {
  normalizePhoneNumber,
  maskPhoneNumber,
  extractFirstName,
  createFamily,
  deleteFamily,
  inviteMemberByPhone,
  respondToInvite,
  createJoinLink,
  revokeJoinLink,
  revokeAllPendingLinks,
  redeemJoinLink,
  reissueJoinLink,
  setMemberRole,
  removeMember,
  leaveFamily,
  transferOwnership,
  addOwnItem,
  approveItem,
  rejectItem,
  setCartLock,
  beginCheckoutHold,
  releaseCheckoutHold,
  placeFamilyOrder,
  areRelated,
  resetLocalFamilyStoreForTesting,
  MAX_FAMILY_MEMBERS,
  MAX_CO_OWNERS,
} from '../services/familyService';

describe('Family Service Unit & Integration Tests', () => {
  beforeEach(() => {
    resetLocalFamilyStoreForTesting();
  });

  describe('Phone Normalization & Masking', () => {
    it('normalizes valid Indian mobile numbers to E.164 format', () => {
      const res1 = normalizePhoneNumber('9876543210');
      expect(res1.valid).toBe(true);
      expect(res1.e164).toBe('+919876543210');

      const res2 = normalizePhoneNumber('+91 98765 43210');
      expect(res2.valid).toBe(true);
      expect(res2.e164).toBe('+919876543210');

      const res3 = normalizePhoneNumber('09876543210');
      expect(res3.valid).toBe(true);
      expect(res3.e164).toBe('+919876543210');
    });

    it('rejects invalid or too short phone numbers', () => {
      const res = normalizePhoneNumber('12345');
      expect(res.valid).toBe(false);
    });

    it('masks phone numbers correctly to protect member privacy', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+91 98••• ••210');
      expect(maskPhoneNumber('9876543210')).toBe('+91 98••• ••210');
    });

    it('extracts first name only from full name', () => {
      expect(extractFirstName('Aarav Sharma')).toBe('Aarav');
      expect(extractFirstName('Priya')).toBe('Priya');
      expect(extractFirstName('')).toBe('Member');
    });
  });

  describe('Family Lifecycle & Capacity Rules', () => {
    it('creates a new family and sets creator as owner', async () => {
      const res = await createFamily('Sharma Household', 'Aarav Sharma', 'user_owner');
      expect(res.success).toBe(true);
      expect(res.family).toBeDefined();
      expect(res.family?.name).toBe('Sharma Household');
      expect(res.family?.owner_id).toBe('user_owner');
    });

    it('prevents a user from creating/joining more than one family', async () => {
      await createFamily('Family One', 'Aarav', 'user_owner');
      const secondRes = await createFamily('Family Two', 'Aarav', 'user_owner');
      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('already a member');
    });

    it('enforces maximum capacity of 6 total seats (members + pending invites + links)', async () => {
      const res = await createFamily('Large Clan', 'Aarav', 'owner_1');
      const fid = res.family!.id;

      // Add 2 adults
      await inviteMemberByPhone(fid, '9876543211', 'owner_1');
      await inviteMemberByPhone(fid, '9876543212', 'owner_1');

      // Add 2 dependent links
      await createJoinLink(fid, 'child', 'Chintu', true, 'v1.0', 'owner_1');
      await createJoinLink(fid, 'senior', 'Dadi', false, 'v1.0', 'owner_1');

      // Now 1 owner + 2 invites + 2 links = 5 seats. Adding 6th should succeed.
      const sixth = await createJoinLink(fid, 'child', 'Golu', true, 'v1.0', 'owner_1');
      expect(sixth.success).toBe(true);

      // Adding 7th seat must be rejected
      const seventh = await createJoinLink(fid, 'child', 'TooMany', true, 'v1.0', 'owner_1');
      expect(seventh.success).toBe(false);
      expect(seventh.error).toContain('Family capacity reached');
    });

    it('auto-revokes previous pending link for the same dependent when regenerated', async () => {
      const res = await createFamily('Sharma Family', 'Priya', 'owner_regen');
      const fid = res.family!.id;

      // Generate link for Aarav 3 times
      const link1 = await createJoinLink(fid, 'child', 'Aarav', true, 'v1.0', 'owner_regen');
      expect(link1.success).toBe(true);

      const link2 = await createJoinLink(fid, 'child', 'Aarav', true, 'v1.0', 'owner_regen');
      expect(link2.success).toBe(true);

      const link3 = await createJoinLink(fid, 'child', 'Aarav', true, 'v1.0', 'owner_regen');
      expect(link3.success).toBe(true);

      // Now 1 owner + only 1 active link for Aarav = 2 seats used (not 4!)
      // Should still be able to invite 4 more members without hitting capacity
      const adult1 = await inviteMemberByPhone(fid, '9876543201', 'owner_regen');
      expect(adult1.success).toBe(true);
      const adult2 = await inviteMemberByPhone(fid, '9876543202', 'owner_regen');
      expect(adult2.success).toBe(true);
      const adult3 = await inviteMemberByPhone(fid, '9876543203', 'owner_regen');
      expect(adult3.success).toBe(true);
      const adult4 = await inviteMemberByPhone(fid, '9876543204', 'owner_regen');
      expect(adult4.success).toBe(true);
    });

    it('revokes all pending links to free capacity immediately', async () => {
      const res = await createFamily('Test Revoke All', 'Raj', 'owner_revoke');
      const fid = res.family!.id;

      await createJoinLink(fid, 'child', 'ChildA', true, 'v1.0', 'owner_revoke');
      await createJoinLink(fid, 'senior', 'SeniorB', false, 'v1.0', 'owner_revoke');

      const revokeRes = await revokeAllPendingLinks(fid, 'owner_revoke');
      expect(revokeRes.success).toBe(true);
      expect(revokeRes.count).toBe(2);
    });

    it('allows owner to delete family, freeing user to create a new one', async () => {
      const res = await createFamily('Temporary Family', 'Rohan', 'owner_delete');
      const fid = res.family!.id;

      const deleteRes = await deleteFamily(fid, 'owner_delete');
      expect(deleteRes.success).toBe(true);

      // Owner can now create a new family without "already a member" error
      const newFamilyRes = await createFamily('New Family', 'Rohan', 'owner_delete');
      expect(newFamilyRes.success).toBe(true);
      expect(newFamilyRes.family?.name).toBe('New Family');
    });
  });

  describe('Single-Use Dependent Links & Consent', () => {
    it('requires guardian consent confirmation for a child', async () => {
      const res = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = res.family!.id;

      const linkWithoutConsent = await createJoinLink(
        fid,
        'child',
        'Baby',
        false,
        'v1.0',
        'owner_1',
      );
      expect(linkWithoutConsent.success).toBe(false);
      expect(linkWithoutConsent.error).toContain('Guardian consent');

      const linkWithConsent = await createJoinLink(fid, 'child', 'Baby', true, 'v1.0', 'owner_1');
      expect(linkWithConsent.success).toBe(true);
      expect(linkWithConsent.rawToken).toBeDefined();
    });

    it('redeems link single-use and creates dependent member', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      const linkRes = await createJoinLink(fid, 'senior', 'Grandpa', false, 'v1.0', 'owner_1');
      const rawToken = linkRes.rawToken!;

      // 1st redemption succeeds
      const red1 = await redeemJoinLink(rawToken, 'anon_senior_1');
      expect(red1.success).toBe(true);
      expect(red1.role).toBe('dependent');
      expect(red1.dependentType).toBe('senior');

      // 2nd redemption of same link fails
      const red2 = await redeemJoinLink(rawToken, 'anon_senior_2');
      expect(red2.success).toBe(false);
      expect(red2.error).toContain('used or revoked');
    });

    it('revoking a join link prevents redemption', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      const linkRes = await createJoinLink(fid, 'child', 'Rani', true, 'v1.0', 'owner_1');
      await revokeJoinLink(linkRes.linkId!, 'owner_1');

      const redeem = await redeemJoinLink(linkRes.rawToken!, 'anon_child_1');
      expect(redeem.success).toBe(false);
    });

    it('owner can re-issue a link for a dependent', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      const linkRes = await createJoinLink(fid, 'child', 'Kittu', true, 'v1.0', 'owner_1');
      await redeemJoinLink(linkRes.rawToken!, 'anon_kittu');

      const reissue = await reissueJoinLink('anon_kittu', 'owner_1');
      expect(reissue.success).toBe(true);
      expect(reissue.rawToken).toBeDefined();
    });
  });

  describe('Roles & Permissions Matrix', () => {
    it('allows promoting adult member to co-owner up to max 2 co-owners', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      // Add two members
      const inv1 = await inviteMemberByPhone(fid, '9876543211', 'owner_1');
      const inv2 = await inviteMemberByPhone(fid, '9876543212', 'owner_1');
      const inv3 = await inviteMemberByPhone(fid, '9876543213', 'owner_1');

      const mem1 = 'user_adult_1';
      const mem2 = 'user_adult_2';
      const mem3 = 'user_adult_3';

      await respondToInvite(inv1.inviteId!, true, mem1);
      await respondToInvite(inv2.inviteId!, true, mem2);
      await respondToInvite(inv3.inviteId!, true, mem3);

      // Promote 1st and 2nd to co-owner
      const p1 = await setMemberRole(fid, mem1, 'co_owner', 'owner_1');
      expect(p1.success).toBe(true);

      const p2 = await setMemberRole(fid, mem2, 'co_owner', 'owner_1');
      expect(p2.success).toBe(true);

      // 3rd promotion must fail (max 2 co-owners)
      const p3 = await setMemberRole(fid, mem3, 'co_owner', 'owner_1');
      expect(p3.success).toBe(false);
      expect(p3.error).toContain(`Maximum ${MAX_CO_OWNERS} co-owners`);
    });

    it('cart lock prevents adding or editing items', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      await setCartLock(fid, true, 'owner_1');

      const addRes = await addOwnItem(fid, 'biryani_kit', 1, 2, 'Medium', 300, 'owner_1');
      expect(addRes.success).toBe(false);
      expect(addRes.error).toContain('locked');

      await setCartLock(fid, false, 'owner_1');
      const addRes2 = await addOwnItem(fid, 'biryani_kit', 1, 2, 'Medium', 300, 'owner_1');
      expect(addRes2.success).toBe(true);
    });

    it('dependent items go to pending_approval and owner can approve or reject', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      const link = await createJoinLink(fid, 'child', 'Golu', true, 'v1.0', 'owner_1');
      await redeemJoinLink(link.rawToken!, 'anon_golu');

      // Golu adds item -> pending_approval
      const addRes = await addOwnItem(fid, 'paneer_tikka_kit', 1, 2, 'Mild', 220, 'anon_golu');
      expect(addRes.success).toBe(true);
      expect(addRes.status).toBe('pending_approval');

      // Owner approves item
      const appRes = await approveItem(fid, addRes.itemId!, 'owner_1');
      expect(appRes.success).toBe(true);

      // Owner rejects item
      const rejRes = await rejectItem(fid, addRes.itemId!, 'Too spicy for dinner', 'owner_1');
      expect(rejRes.success).toBe(true);
    });

    it('enforces exclusive checkout hold between payers', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      // Payer 1 acquires hold
      const hold1 = await beginCheckoutHold(fid, 'hold_1', 'owner_1');
      expect(hold1.success).toBe(true);

      // Payer 2 attempts hold -> blocked
      const hold2 = await beginCheckoutHold(fid, 'hold_2', 'co_owner_1');
      expect(hold2.success).toBe(false);
      expect(hold2.heldByOther).toBe(true);

      // Payer 1 releases hold
      await releaseCheckoutHold(fid, 'owner_1');

      // Payer 2 can now acquire hold
      const hold3 = await beginCheckoutHold(fid, 'hold_3', 'co_owner_1');
      expect(hold3.success).toBe(true);
    });
  });

  describe('Referral Abuse Prevention: areRelated', () => {
    it('returns true for members of the same family', async () => {
      const famRes = await createFamily('Sharma Clan', 'Aarav', 'owner_1');
      const fid = famRes.family!.id;

      const link = await createJoinLink(fid, 'child', 'Chintu', true, 'v1.0', 'owner_1');
      await redeemJoinLink(link.rawToken!, 'chintu_uid');

      const related = await areRelated('owner_1', 'chintu_uid');
      expect(related).toBe(true);

      const unrelated = await areRelated('owner_1', 'stranger_uid');
      expect(unrelated).toBe(false);
    });
  });
});
