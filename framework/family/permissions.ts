import { FamilyRole } from '../services/familyService';

export type FamilyAction =
  | 'create_family'
  | 'delete_family'
  | 'transfer_ownership'
  | 'leave_family'
  | 'invite_adult'
  | 'add_dependent_link'
  | 'manage_links'
  | 'revoke_link'
  | 'reissue_link'
  | 'manage_members'
  | 'set_co_owner'
  | 'remove_co_owner'
  | 'remove_member'
  | 'view_approvals'
  | 'approve_item'
  | 'reject_item'
  | 'lock_cart'
  | 'unlock_cart'
  | 'add_item'
  | 'edit_own_item'
  | 'remove_own_item'
  | 'edit_any_item'
  | 'remove_any_item'
  | 'checkout'
  | 'pay_family_cart'
  | 'view_family_cart'
  | 'view_other_members_pricing'
  | 'access_personal_features'
  | 'manage_family_subscription'
  | 'view_own_subscription_plan';

export interface PermissionContext {
  isOwnItem?: boolean;
  targetRole?: FamilyRole;
  isOwnerSelf?: boolean;
}

/**
 * Pure permission evaluator enforcing the RasoiGenie Family v2 Permission Matrix.
 * All role-conditional UI must invoke this function.
 */
export function can(
  role: FamilyRole | null | undefined,
  action: FamilyAction,
  context?: PermissionContext,
): boolean {
  if (!role) {
    return action === 'create_family';
  }

  switch (action) {
    case 'create_family':
      // Already in a family
      return false;

    case 'delete_family':
    case 'transfer_ownership':
    case 'invite_adult':
    case 'add_dependent_link':
    case 'manage_links':
    case 'revoke_link':
    case 'reissue_link':
    case 'manage_members':
    case 'manage_family_subscription':
    case 'set_co_owner':
    case 'remove_co_owner':
    case 'view_approvals':
    case 'approve_item':
    case 'reject_item':
    case 'lock_cart':
    case 'unlock_cart':
    case 'edit_any_item':
    case 'remove_any_item':
      return role === 'owner';

    case 'remove_member':
      if (role !== 'owner') return false;
      // Owner cannot remove self (must transfer ownership or delete family)
      if (context?.isOwnerSelf) return false;
      return true;

    case 'leave_family':
      // Owner cannot leave without transferring ownership; co-owner, member, dependent can leave
      return role !== 'owner';

    case 'checkout':
    case 'pay_family_cart':
      return role === 'owner' || role === 'co_owner';

    case 'add_item':
    case 'view_family_cart':
      return true;

    case 'edit_own_item':
      // Dependents cannot edit quantity stepper after adding item awaiting approval; adults can
      if (role === 'dependent') return false;
      return true;

    case 'remove_own_item':
      return true;

    case 'view_other_members_pricing':
      // Dependents cannot view price breakdowns / subtotals of other family members
      return role !== 'dependent';

    case 'access_personal_features':
      // Dependents are locked to family shell (no personal basket, wallet, referral, account edits)
      return role !== 'dependent';

    case 'view_own_subscription_plan':
      // Any member of the family (owner, co_owner, member, dependent) can view their own plan
      return Boolean(role);

    default:
      return false;
  }
}
