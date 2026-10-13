import { can, FamilyAction } from '../family/permissions';
import { FamilyRole } from '../services/familyService';

describe('Family Permissions Matrix: can(role, action)', () => {
  describe('Unauthenticated / No Role', () => {
    it('allows create_family only', () => {
      expect(can(null, 'create_family')).toBe(true);
      expect(can(undefined, 'create_family')).toBe(true);
      expect(can(null, 'invite_adult')).toBe(false);
      expect(can(null, 'view_family_cart')).toBe(false);
      expect(can(null, 'pay_family_cart')).toBe(false);
    });
  });

  describe('Owner Role', () => {
    const role: FamilyRole = 'owner';

    it('can manage entire family lifecycle', () => {
      expect(can(role, 'invite_adult')).toBe(true);
      expect(can(role, 'add_dependent_link')).toBe(true);
      expect(can(role, 'manage_links')).toBe(true);
      expect(can(role, 'revoke_link')).toBe(true);
      expect(can(role, 'reissue_link')).toBe(true);
      expect(can(role, 'manage_members')).toBe(true);
      expect(can(role, 'set_co_owner')).toBe(true);
      expect(can(role, 'remove_co_owner')).toBe(true);
      expect(can(role, 'remove_member', { isOwnerSelf: false })).toBe(true);
      expect(can(role, 'remove_member', { isOwnerSelf: true })).toBe(false);
      expect(can(role, 'transfer_ownership')).toBe(true);
      expect(can(role, 'delete_family')).toBe(true);
      expect(can(role, 'leave_family')).toBe(false); // must transfer or delete
    });

    it('can moderate cart and approvals', () => {
      expect(can(role, 'view_approvals')).toBe(true);
      expect(can(role, 'approve_item')).toBe(true);
      expect(can(role, 'reject_item')).toBe(true);
      expect(can(role, 'lock_cart')).toBe(true);
      expect(can(role, 'unlock_cart')).toBe(true);
      expect(can(role, 'edit_any_item')).toBe(true);
      expect(can(role, 'remove_any_item')).toBe(true);
    });

    it('can pay and checkout the family cart', () => {
      expect(can(role, 'checkout')).toBe(true);
      expect(can(role, 'pay_family_cart')).toBe(true);
    });

    it('can view pricing and access personal features', () => {
      expect(can(role, 'view_other_members_pricing')).toBe(true);
      expect(can(role, 'access_personal_features')).toBe(true);
    });
  });

  describe('Co-Owner Role', () => {
    const role: FamilyRole = 'co_owner';

    it('CAN pay for the family cart', () => {
      expect(can(role, 'checkout')).toBe(true);
      expect(can(role, 'pay_family_cart')).toBe(true);
    });

    it('CANNOT add or remove members or links', () => {
      expect(can(role, 'invite_adult')).toBe(false);
      expect(can(role, 'add_dependent_link')).toBe(false);
      expect(can(role, 'manage_links')).toBe(false);
      expect(can(role, 'manage_members')).toBe(false);
      expect(can(role, 'set_co_owner')).toBe(false);
      expect(can(role, 'remove_member')).toBe(false);
      expect(can(role, 'transfer_ownership')).toBe(false);
      expect(can(role, 'delete_family')).toBe(false);
    });

    it('CANNOT approve items, lock cart, or edit other items', () => {
      expect(can(role, 'approve_item')).toBe(false);
      expect(can(role, 'reject_item')).toBe(false);
      expect(can(role, 'lock_cart')).toBe(false);
      expect(can(role, 'edit_any_item')).toBe(false);
      expect(can(role, 'remove_any_item')).toBe(false);
    });

    it('CAN edit and remove own items, and leave family', () => {
      expect(can(role, 'add_item')).toBe(true);
      expect(can(role, 'edit_own_item')).toBe(true);
      expect(can(role, 'remove_own_item')).toBe(true);
      expect(can(role, 'leave_family')).toBe(true);
    });
  });

  describe('Member Role (Adult)', () => {
    const role: FamilyRole = 'member';

    it('CANNOT pay for family cart', () => {
      expect(can(role, 'checkout')).toBe(false);
      expect(can(role, 'pay_family_cart')).toBe(false);
    });

    it('CANNOT manage members, links, or approvals', () => {
      expect(can(role, 'invite_adult')).toBe(false);
      expect(can(role, 'add_dependent_link')).toBe(false);
      expect(can(role, 'approve_item')).toBe(false);
      expect(can(role, 'reject_item')).toBe(false);
      expect(can(role, 'lock_cart')).toBe(false);
      expect(can(role, 'edit_any_item')).toBe(false);
      expect(can(role, 'remove_any_item')).toBe(false);
    });

    it('CAN add, edit, and remove own items, and leave family', () => {
      expect(can(role, 'add_item')).toBe(true);
      expect(can(role, 'edit_own_item')).toBe(true);
      expect(can(role, 'remove_own_item')).toBe(true);
      expect(can(role, 'leave_family')).toBe(true);
      expect(can(role, 'view_other_members_pricing')).toBe(true);
      expect(can(role, 'access_personal_features')).toBe(true);
    });
  });

  describe('Dependent Role (Child / Senior)', () => {
    const role: FamilyRole = 'dependent';

    it('CAN add items and remove own items', () => {
      expect(can(role, 'add_item')).toBe(true);
      expect(can(role, 'remove_own_item')).toBe(true);
      expect(can(role, 'view_family_cart')).toBe(true);
      expect(can(role, 'leave_family')).toBe(true);
    });

    it('CANNOT edit other items, approve, lock, or pay', () => {
      expect(can(role, 'checkout')).toBe(false);
      expect(can(role, 'pay_family_cart')).toBe(false);
      expect(can(role, 'edit_own_item')).toBe(false);
      expect(can(role, 'edit_any_item')).toBe(false);
      expect(can(role, 'remove_any_item')).toBe(false);
      expect(can(role, 'approve_item')).toBe(false);
      expect(can(role, 'lock_cart')).toBe(false);
    });

    it('CANNOT view other members pricing or access personal features', () => {
      expect(can(role, 'view_other_members_pricing')).toBe(false);
      expect(can(role, 'access_personal_features')).toBe(false);
    });
  });
});
