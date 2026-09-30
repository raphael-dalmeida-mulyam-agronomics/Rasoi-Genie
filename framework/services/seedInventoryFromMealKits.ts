// framework/services/seedInventoryFromMealKits.ts
// Reads meal kit catalog and adds every ingredient into inventory with category

import { INITIAL_MEAL_KITS, MealKit, IngredientItem } from './mealKitsService';
import { addInventoryItem, InventoryItem, InventorySection } from './inventoryService';

function guessSection(name: string, isMasalaSachet?: boolean): InventorySection {
  const n = name.toLowerCase();

  // ── Seasonings & Herbs ──────────────────────────────────────────────────────
  // Masala sachets are always seasonings
  if (isMasalaSachet) return 'seasonings';
  // Dry spice keywords
  if (
    n.includes('sachet') ||
    n.includes('masala') ||
    n.includes('spice') ||
    n.includes('powder') ||
    n.includes('blend') ||
    n.includes('dust') ||
    n.includes('tadka') ||
    n.includes('seasoning') ||
    n.includes('tempering') ||
    n.includes('premix') ||
    n.includes('turmeric') ||
    n.includes('cumin') ||
    n.includes('coriander seed') ||
    n.includes('fennel seed') ||
    n.includes('mustard seed') ||
    n.includes('saffron') ||
    n.includes('cardamom') ||
    n.includes('clove') ||
    n.includes('nutmeg') ||
    n.includes('cinnamon') ||
    n.includes('bayleaf') ||
    n.includes('bay leaf')
  ) return 'seasonings';
  // Fresh & dried herb keywords
  if (
    n.includes('curry leaves') ||
    n.includes('curry leaf') ||
    n.includes('fresh coriander') ||
    n.includes('fresh cilantro') ||
    n.includes('fresh mint') ||
    n.includes('fresh basil') ||
    n.includes('fresh thyme') ||
    n.includes('fresh oregano') ||
    n.includes('fresh chilli') ||
    n.includes('fresh chili') ||
    n.includes('green chilli') ||
    n.includes('green chili') ||
    n.includes('dried herb') ||
    n.includes('herb sprig') ||
    n.includes('kasuri methi') ||
    n.includes('methi')
  ) return 'seasonings';

  // ── Actual Packaging Material ───────────────────────────────────────────────
  // Only genuine packaging supply items — NOT food pouches, sauce bags, etc.
  if (
    n.includes('paper cup') ||
    n.includes('foil tray') ||
    n.includes('foil container') ||
    n.includes('cling wrap') ||
    n.includes('cling film') ||
    n.includes('parchment') ||
    n.includes('meal kit box') ||
    n.includes('insulated box') ||
    n.includes('delivery box') ||
    n.includes('zip-lock') ||
    n.includes('ziplock') ||
    n.includes('heat-seal') ||
    n.includes('tamper seal') ||
    n.includes('sticker label') ||
    n.includes('box lid') ||
    n.includes('food tray')
  ) return 'packaging';

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
      const section = guessSection(cleanName, ing.isMasalaSachet);
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
