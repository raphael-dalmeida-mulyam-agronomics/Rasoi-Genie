import {
  FamilyCartItem,
  allocateSharedAmountLargestRemainder,
  isMockEnabled,
} from './familyService';
import { subscribeToTable } from './realtimeService';

export type { FamilyCartItem };

export interface FamilyCartState {
  items: FamilyCartItem[];
  approvedItems: FamilyCartItem[];
  pendingItems: FamilyCartItem[];
  subtotal: number;
  approvedCount: number;
  pendingCount: number;
}

export type FamilyCartAction =
  | { type: 'SET_ITEMS'; items: FamilyCartItem[] }
  | { type: 'UPSERT_ITEM'; item: FamilyCartItem }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'CLEAR' };

/**
 * Idempotent client reducer for Family Cart realtime sync.
 * Rules:
 * - Upsert items by id.
 * - Ignore updates where new `updated_at` is older than existing `updated_at`.
 * - Separate approved vs pending items.
 */
export function familyCartReducer(
  state: FamilyCartState,
  action: FamilyCartAction,
): FamilyCartState {
  switch (action.type) {
    case 'SET_ITEMS': {
      return buildCartState(action.items);
    }

    case 'UPSERT_ITEM': {
      const incoming = action.item;
      const existingIdx = state.items.findIndex((i) => i.id === incoming.id);

      if (existingIdx >= 0) {
        const existing = state.items[existingIdx];
        if (existing) {
          const existingTime = new Date(existing.updated_at || existing.created_at || '').getTime();
          const incomingTime = new Date(incoming.updated_at || incoming.created_at || '').getTime();

          // Stale update rejection
          if (incomingTime < existingTime) {
            return state;
          }
        }

        const nextItems = [...state.items];
        nextItems[existingIdx] = incoming;
        return buildCartState(nextItems);
      } else {
        const nextItems = [incoming, ...state.items];
        return buildCartState(nextItems);
      }
    }

    case 'REMOVE_ITEM': {
      const nextItems = state.items.filter((i) => i.id !== action.itemId);
      return buildCartState(nextItems);
    }

    case 'CLEAR': {
      return {
        items: [],
        approvedItems: [],
        pendingItems: [],
        subtotal: 0,
        approvedCount: 0,
        pendingCount: 0,
      };
    }

    default:
      return state;
  }
}

export function buildCartState(items: FamilyCartItem[]): FamilyCartState {
  const approved = items.filter((i) => i.status === 'approved');
  const pending = items.filter((i) => i.status === 'pending_approval');
  const subtotal = approved.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return {
    items,
    approvedItems: approved,
    pendingItems: pending,
    subtotal,
    approvedCount: approved.reduce((sum, i) => sum + i.quantity, 0),
    pendingCount: pending.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export interface MemberSubtotalBreakdown {
  userId: string;
  displayName: string;
  items: FamilyCartItem[];
  subtotal: number;
  allocatedFee: number; // in rupees
  allocatedDiscount: number; // in rupees
  finalTotal: number;
}

/**
 * Computes per-member subtotals and allocates shared fees / discounts using
 * the Largest Remainder Method so paise sum exactly.
 */
export function computeMemberBreakdown(
  items: FamilyCartItem[],
  memberNames: Record<string, string>,
  sharedDeliveryFee = 0,
  sharedDiscount = 0,
): MemberSubtotalBreakdown[] {
  const approved = items.filter((i) => i.status === 'approved');
  const userMap = new Map<string, FamilyCartItem[]>();

  approved.forEach((item) => {
    const list = userMap.get(item.added_by) || [];
    list.push(item);
    userMap.set(item.added_by, list);
  });

  const memberKeys = Array.from(userMap.keys());
  if (memberKeys.length === 0) return [];

  const subtotals = memberKeys.map((uid) => {
    const memberItems = userMap.get(uid) || [];
    return memberItems.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  });

  // Weights in integer paise
  const weightsInPaise = subtotals.map((s) => Math.round(s * 100));
  const feeInPaise = Math.round(sharedDeliveryFee * 100);
  const discountInPaise = Math.round(sharedDiscount * 100);

  const allocatedFeePaise = allocateSharedAmountLargestRemainder(feeInPaise, weightsInPaise);
  const allocatedDiscountPaise = allocateSharedAmountLargestRemainder(
    discountInPaise,
    weightsInPaise,
  );

  return memberKeys.map((uid, idx) => {
    const mSubtotal = subtotals[idx] ?? 0;
    const mFee = (allocatedFeePaise[idx] ?? 0) / 100;
    const mDiscount = (allocatedDiscountPaise[idx] ?? 0) / 100;
    const finalTotal = Math.max(0, mSubtotal + mFee - mDiscount);

    return {
      userId: uid,
      displayName: memberNames[uid] || 'Member',
      items: userMap.get(uid) || [],
      subtotal: mSubtotal,
      allocatedFee: mFee,
      allocatedDiscount: mDiscount,
      finalTotal,
    };
  });
}

/**
 * Subscribes to realtime changes for a family cart.
 */
export function subscribeToFamilyCartRealtime(
  familyId: string,
  onUpsert: (item: FamilyCartItem) => void,
  onDelete: (itemId: string) => void,
  onResync: () => void,
): () => void {
  if (isMockEnabled()) {
    return () => {};
  }

  return subscribeToTable<FamilyCartItem>({
    table: 'family_cart_items',
    filter: `family_id=eq.${familyId}`,
    onInsert: (row) => onUpsert(row),
    onUpdate: (newRow) => onUpsert(newRow),
    onDelete: (oldRow) => {
      if (oldRow?.id) onDelete(oldRow.id);
    },
    onResync,
  });
}
