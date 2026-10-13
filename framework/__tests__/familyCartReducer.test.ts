import { familyCartReducer, buildCartState, FamilyCartState } from '../services/familyCartService';
import { FamilyCartItem } from '../services/familyService';

describe('Family Cart Reducer (Idempotent Realtime Sync)', () => {
  const baseItem: FamilyCartItem = {
    id: 'cart_item_1',
    family_id: 'fam_1',
    added_by: 'user_1',
    kit_id: 'biryani_kit',
    quantity: 1,
    servings: 2,
    unit_price: 350,
    status: 'approved',
    created_at: '2026-10-13T10:00:00.000Z',
    updated_at: '2026-10-13T10:00:00.000Z',
  };

  it('sets initial items and computes approved vs pending subtotals', () => {
    const pendingItem: FamilyCartItem = {
      ...baseItem,
      id: 'cart_item_2',
      status: 'pending_approval',
      unit_price: 200,
    };

    const state = familyCartReducer(buildCartState([]), {
      type: 'SET_ITEMS',
      items: [baseItem, pendingItem],
    });

    expect(state.items.length).toBe(2);
    expect(state.approvedItems.length).toBe(1);
    expect(state.pendingItems.length).toBe(1);
    expect(state.subtotal).toBe(350);
    expect(state.approvedCount).toBe(1);
    expect(state.pendingCount).toBe(1);
  });

  it('upserts a new incoming item', () => {
    const initial = buildCartState([baseItem]);
    const newItem: FamilyCartItem = {
      ...baseItem,
      id: 'cart_item_2',
      kit_id: 'paneer_tikka',
      quantity: 2,
      unit_price: 150,
    };

    const state = familyCartReducer(initial, {
      type: 'UPSERT_ITEM',
      item: newItem,
    });

    expect(state.items.length).toBe(2);
    expect(state.subtotal).toBe(650); // 350 + (2 * 150)
  });

  it('updates an existing item with newer updated_at timestamp', () => {
    const initial = buildCartState([baseItem]);
    const updatedItem: FamilyCartItem = {
      ...baseItem,
      quantity: 3,
      updated_at: '2026-10-13T10:05:00.000Z',
    };

    const state = familyCartReducer(initial, {
      type: 'UPSERT_ITEM',
      item: updatedItem,
    });

    expect(state.items.length).toBe(1);
    expect(state.items[0]!.quantity).toBe(3);
    expect(state.subtotal).toBe(1050); // 3 * 350
  });

  it('rejects stale update if updated_at is older than existing record', () => {
    const existingNewer: FamilyCartItem = {
      ...baseItem,
      quantity: 5,
      updated_at: '2026-10-13T10:10:00.000Z',
    };

    const initial = buildCartState([existingNewer]);

    const staleIncoming: FamilyCartItem = {
      ...baseItem,
      quantity: 1,
      updated_at: '2026-10-13T10:01:00.000Z', // Stale!
    };

    const state = familyCartReducer(initial, {
      type: 'UPSERT_ITEM',
      item: staleIncoming,
    });

    // Stale update is discarded; remains quantity 5
    expect(state.items[0]!.quantity).toBe(5);
    expect(state.subtotal).toBe(1750);
  });

  it('removes an item by id', () => {
    const initial = buildCartState([baseItem]);
    const state = familyCartReducer(initial, {
      type: 'REMOVE_ITEM',
      itemId: 'cart_item_1',
    });

    expect(state.items.length).toBe(0);
    expect(state.subtotal).toBe(0);
  });

  it('clears cart state completely', () => {
    const initial = buildCartState([baseItem]);
    const state = familyCartReducer(initial, { type: 'CLEAR' });

    expect(state.items.length).toBe(0);
    expect(state.approvedItems.length).toBe(0);
    expect(state.pendingItems.length).toBe(0);
    expect(state.subtotal).toBe(0);
  });
});
