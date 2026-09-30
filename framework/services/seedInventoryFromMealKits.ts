// framework/services/seedInventoryFromMealKits.ts
// Reads meal kit catalog and adds every ingredient into inventory with category

import { INITIAL_MEAL_KITS, MealKit, IngredientItem } from './mealKitsService';
import { addInventoryItem, InventoryItem, InventorySection } from './inventoryService';

function guessSection(name: string): InventorySection {
  const n = name.toLowerCase();
  if (n.includes('sachet') || n.includes('masala') || n.includes('spice') || n.includes('powder') || n.includes('blend') || n.includes('dust') || n.includes('tadka') || n.includes('seasoning')) return 'seasonings';
  if (n.includes('cup') || n.includes('box') || n.includes('pack') || n.includes('pouch') || n.includes('bag') || n.includes('container') || n.includes('bott') || n.includes('jar')) return 'packaging';
  return 'raw_ingredients';
}

function guessUnit(qtyStr: string): string {
  const q = qtyStr.toLowerCase();
  if (q.includes('g')) return 'g';
  if (q.includes('kg')) return 'kg';
  if (q.includes('l') || q.includes('ml')) return 'L';
  if (q.includes('pc') || q.includes('pcs')) return 'units';
  if (q.includes('slice') || q.includes('sheet')) return 'units';
  return 'units';
}

export function seedInventoryFromMealKits(): number {
  let added = 0;
  const existingNames = new Set<string>();
  // Avoid duplicating existing seeded items by name (case-insensitive)
  try {
    const { getInventoryItems } = require('./inventoryService');
    getInventoryItems().forEach((i: InventoryItem) => existingNames.add(i.name.toLowerCase()));
  } catch {}

  for (const kit of INITIAL_MEAL_KITS as MealKit[]) {
    if (!kit.ingredients) continue;
    for (const ing of kit.ingredients) {
      const cleanName = ing.name.replace(/\s+/g, ' ').trim();
      if (!cleanName) continue;
      if (existingNames.has(cleanName.toLowerCase())) continue;
      const section = guessSection(cleanName);
      const unit = guessUnit(ing.quantity || '');
      try {
        addInventoryItem({
          name: cleanName,
          section,
          currentStock: 50,
          unit,
          shelfLifeDays: 7,
          thresholdLow: 10,
          region: 'West',
          storageCondition: 'Cool & dry / Refrigerated',
          supplier: 'Meal Kit Catalog',
          notes: `From kit: ${kit.name}`,
        });
        added++;
        existingNames.add(cleanName.toLowerCase());
      } catch (e) {}
    }
  }
  return added;
}
