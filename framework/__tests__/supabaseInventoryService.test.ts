// framework/__tests__/supabaseInventoryService.test.ts

import {
  deduplicateAndCleanInventoryStore,
  getInventoryItems,
  setInventoryStore,
} from '../services/inventoryService';
import { cleanIngredientName } from '../services/seedInventoryFromMealKits';
import {
  addInventoryItemToSupabase,
  deleteInventoryItemFromSupabase,
  fetchInventoryFromSupabase,
  mapInventoryItemToRow,
  mapSupabaseRowToInventoryItem,
  restockInventoryItemInSupabase,
  updateInventoryItemInSupabase,
} from '../services/supabaseInventoryService';

describe('Supabase Inventory Service & Deduplication Flow', () => {
  beforeEach(() => {
    // Reset to clean state
    setInventoryStore([]);
  });

  it('merges duplicate items with different units (e.g. 10000 g and 30 liters Tomato Puree) into 1 entry', () => {
    const item1 = {
      id: 'inv-test-1',
      name: 'Tomato Puree',
      section: 'raw_ingredients' as const,
      currentStock: 10000,
      unit: 'g',
      shelfLifeDays: 7,
      thresholdLow: 500,
      region: 'West',
      lastRestocked: '2026-09-30T00:00:00.000Z',
      expiryDate: '2026-10-07T00:00:00.000Z',
      storageCondition: 'Cool & dry / Refrigerated',
      supplier: 'Meal Kit Catalog',
      notes: 'From kit: Spiced Tomato & Red Lentil Shorba Kit',
    };

    const item2 = {
      id: 'inv-005',
      name: 'Tomato Puree',
      section: 'raw_ingredients' as const,
      currentStock: 30,
      unit: 'liters',
      shelfLifeDays: 30,
      thresholdLow: 5,
      region: 'West',
      lastRestocked: '2026-09-30T00:00:00.000Z',
      expiryDate: '2026-10-30T00:00:00.000Z',
      storageCondition: 'Refrigerated at 2-5°C',
      supplier: 'VegPro Foods',
      notes: 'No preservatives',
    };

    setInventoryStore([item1, item2]);
    expect(getInventoryItems()).toHaveLength(2);

    const result = deduplicateAndCleanInventoryStore(cleanIngredientName);
    expect(result.merged).toBeGreaterThan(0);

    const items = getInventoryItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Tomato Puree');
    // 30 liters + 10000 g (10 liters) = 40 liters
    expect(items[0]!.currentStock).toBe(40);
    expect(items[0]!.unit).toBe('liters');
    // Fresh expiry date must be preserved
    expect(new Date(items[0]!.expiryDate).getTime()).toBeGreaterThan(
      new Date('2026-10-07T00:00:00.000Z').getTime(),
    );
  });

  it('allows adding a new ingredient to Supabase and reflects immediately in the store', async () => {
    const newItem = await addInventoryItemToSupabase({
      name: 'Artisanal Fresh Fior di Latte Diced Mozzarella',
      section: 'raw_ingredients',
      currentStock: 50,
      unit: 'kg',
      shelfLifeDays: 14,
      thresholdLow: 5,
      region: 'West',
      storageCondition: 'Refrigerated at 2-4°C',
      supplier: 'Dairy Farms Co.',
      costPerUnit: 450,
      notes: 'Freshly diced mozzarella cheese',
    });

    // Check adjective removal
    expect(newItem.name).toBe('Diced Mozzarella');
    expect(newItem.id).toBeDefined();

    const inStore = getInventoryItems().find((i) => i.id === newItem.id);
    expect(inStore).toBeDefined();
    expect(inStore?.name).toBe('Diced Mozzarella');
  });

  it('allows updating an ingredient and reflects in store', async () => {
    const item = await addInventoryItemToSupabase({
      name: 'Button Mushrooms',
      section: 'raw_ingredients',
      currentStock: 20,
      unit: 'kg',
      shelfLifeDays: 5,
      thresholdLow: 3,
      region: 'West',
      storageCondition: 'Refrigerated',
      supplier: 'FarmFresh',
      costPerUnit: 150,
    });

    const updated = await updateInventoryItemInSupabase(item.id, {
      currentStock: 35,
      supplier: 'Organic Shroom Co.',
    });

    expect(updated).not.toBeNull();
    expect(updated?.currentStock).toBe(35);
    expect(updated?.supplier).toBe('Organic Shroom Co.');

    const inStore = getInventoryItems().find((i) => i.id === item.id);
    expect(inStore?.currentStock).toBe(35);
  });

  it('allows restocking an ingredient and extends expiry date', async () => {
    const item = await addInventoryItemToSupabase({
      name: 'Desi Ghee',
      section: 'raw_ingredients',
      currentStock: 10,
      unit: 'liters',
      shelfLifeDays: 180,
      thresholdLow: 5,
      region: 'West',
      storageCondition: 'Room temperature',
      supplier: 'Amul',
    });

    const restocked = await restockInventoryItemInSupabase(item.id, 25, 'Batch #GHEE-99');
    expect(restocked).not.toBeNull();
    expect(restocked?.currentStock).toBe(35);
    expect(restocked?.notes).toContain('Batch #GHEE-99');

    const inStore = getInventoryItems().find((i) => i.id === item.id);
    expect(inStore?.currentStock).toBe(35);
  });

  it('allows deleting an ingredient from Supabase and removes it from store', async () => {
    const item = await addInventoryItemToSupabase({
      name: 'Temporary Spice',
      section: 'seasonings',
      currentStock: 10,
      unit: 'g',
      shelfLifeDays: 60,
      thresholdLow: 2,
      region: 'West',
      storageCondition: 'Dry',
    });

    expect(getInventoryItems().some((i) => i.id === item.id)).toBe(true);

    const deleted = await deleteInventoryItemFromSupabase(item.id);
    expect(deleted).toBe(true);
    expect(getInventoryItems().some((i) => i.id === item.id)).toBe(false);
  });

  it('gracefully handles row mapping both ways', () => {
    const sampleItem = {
      id: 'inv-map-1',
      name: 'Coriander Leaves',
      section: 'seasonings' as const,
      currentStock: 500,
      unit: 'g',
      shelfLifeDays: 5,
      thresholdLow: 50,
      region: 'West',
      lastRestocked: '2026-10-19T00:00:00.000Z',
      expiryDate: '2026-10-24T00:00:00.000Z',
      storageCondition: 'Chilled',
      supplier: 'FreshHerb Co',
      costPerUnit: 20,
      notes: 'Freshly harvested',
    };

    const row = mapInventoryItemToRow(sampleItem);
    expect(row.id).toBe(sampleItem.id);
    expect(row.current_stock).toBe(500);

    const mappedBack = mapSupabaseRowToInventoryItem(row);
    expect(mappedBack.id).toBe(sampleItem.id);
    expect(mappedBack.name).toBe('Coriander Leaves');
    expect(mappedBack.currentStock).toBe(500);
  });
});
