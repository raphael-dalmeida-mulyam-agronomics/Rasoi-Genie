// framework/services/seedInventoryFromMealKits.ts
// Reads meal kit catalog and adds every ingredient into inventory with category

import {
  addInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  InventoryItem,
  InventorySection,
  updateInventoryItem,
} from './inventoryService';
import { INITIAL_MEAL_KITS, MealKit } from './mealKitsService';

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
  )
    return 'seasonings';
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
  )
    return 'seasonings';

  // ── Actual Packaging Material ───────────────────────────────────────────────
  // Only genuine packaging supply items — NOT food pouches, sauce bags, etc.
  // Food pouches (e.g., "Tomato Puree Pouch", "Jaggery & Kokum Pouch") are raw ingredients, not packaging
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
    n.includes('food tray') ||
    n.includes('bubble wrap')
  ) {
    // Don't mark food pouches, condiments, or fresh produce as packaging
    if (
      !(
        n.includes('pouch') &&
        (n.includes('puree') ||
          n.includes('sauce') ||
          n.includes('paste') ||
          n.includes('oil') ||
          n.includes('cream') ||
          n.includes('extract') ||
          n.includes('jaggery') ||
          n.includes('kokum') ||
          n.includes('crema') ||
          n.includes('drizzle') ||
          n.includes('dip') ||
          n.includes('mustard') ||
          n.includes('kasundi') ||
          n.includes('chutney') ||
          n.includes('salsa') ||
          n.includes('raita') ||
          n.includes('aioli') ||
          n.includes('mash'))
      ) &&
      !n.includes('slaw') &&
      !n.includes('cabbage') &&
      !n.includes('pickled') &&
      !n.includes('pickle')
    ) {
      return 'packaging';
    }
  }

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

// Packaging items to always ensure exist in inventory
const PACKAGING_ITEMS = [
  { name: 'Meal Kit Box (Medium)', unit: 'units', quantity: 500, threshold: 100 },
  { name: 'Insulated Delivery Bag', unit: 'units', quantity: 200, threshold: 50 },
  { name: 'Gel Ice Pack', unit: 'units', quantity: 1000, threshold: 200 },
  { name: 'Shipping Label Sticker', unit: 'units', quantity: 2000, threshold: 500 },
  { name: 'Tamper-Evident Seal Sticker', unit: 'units', quantity: 1500, threshold: 300 },
  { name: 'Corrugated Shipping Box (Large)', unit: 'units', quantity: 300, threshold: 75 },
  { name: 'Bubble Wrap Roll', unit: 'meters', quantity: 20, threshold: 5 },
];

/**
 * Remove inventory items that have combined ingredients with "&" in their name.
 * These are legacy items from incorrectly seeded data.
 */
function cleanupCombinedIngredientItems(): number {
  let removed = 0;
  try {
    const items = getInventoryItems();
    for (const item of items) {
      // Remove items with "&" in name (combined ingredients like "Fresh Green Chillies & Garlic Pods")
      if (item.name.includes(' & ') || (item.name.includes('&') && item.name.indexOf('&') > 0)) {
        console.log('[Inventory] Removing combined item:', item.name);
        deleteInventoryItem(item.id);
        removed++;
      }
    }
  } catch (e) {
    console.warn('[Inventory] Cleanup error:', e);
  }
  return removed;
}

/**
 * Migrate packaging items that are actually food/ingredients to raw_ingredients.
 * This fixes misclassified items like "Tomato Puree Pouch", "Dairy Cream Pouch", etc.
 */
function migrateIncorrectlyClassifiedItems(): number {
  let migrated = 0;
  try {
    const items = getInventoryItems();
    const foodKeywords = [
      'puree',
      'sauce',
      'paste',
      'oil',
      'cream',
      'extract',
      'jaggery',
      'kokum',
      'ghee',
      'butter',
      'peanuts',
      'noodles',
      'rice',
      'flour',
      'dal',
      'beans',
      'lentils',
      'spice',
      'masala',
      'milk',
      'yogurt',
      'paneer',
      'cheese',
      'tomato',
      'onion',
      'garlic',
      'ginger',
      'herb',
      'leaf',
      'leaves',
      'chilli',
      'chili',
      'pepper',
      'cumin',
      'coriander',
      'turmeric',
      'salt',
      'sugar',
      'honey',
      'vinegar',
      'soy',
      'sesame',
      // Condiments, dressings & fresh produce
      'avocado',
      'crema',
      'drizzle',
      'dip',
      'mustard',
      'kasundi',
      'slaw',
      'cabbage',
      'lime',
      'salsa',
      'chutney',
      'raita',
      'aioli',
      'mash',
      'puree',
      'relish',
      'pickle',
      'pickled',
    ];

    for (const item of items) {
      // If it's in packaging but contains food keywords, move it to raw_ingredients
      if (item.section === 'packaging') {
        const nameLower = item.name.toLowerCase();
        const isFoodItem = foodKeywords.some((keyword) => nameLower.includes(keyword));

        if (isFoodItem) {
          console.log('[Inventory] Migrating to raw_ingredients:', item.name);
          updateInventoryItem(item.id, { section: 'raw_ingredients' });
          migrated++;
        }
      }
    }
  } catch (e) {
    console.warn('[Inventory] Migration error:', e);
  }
  return migrated;
}

export function seedInventoryFromMealKits(): number {
  let added = 0;

  // First, cleanup any legacy combined ingredient items
  cleanupCombinedIngredientItems();

  // Second, migrate incorrectly classified food items from packaging to raw_ingredients
  migrateIncorrectlyClassifiedItems();

  const existingNames = new Set<string>();
  // Avoid duplicating existing seeded items by name (case-insensitive)
  try {
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
      const parsedQty = parseFloat(ing.quantity || '1') || 1;
      const initialStock = unit === 'g' || unit === 'ml' ? Math.max(5000, parsedQty * 25) : 50;
      const thresholdLow = unit === 'g' || unit === 'ml' ? 500 : 10;
      try {
        addInventoryItem({
          name: cleanName,
          section,
          currentStock: initialStock,
          unit,
          shelfLifeDays: 7,
          thresholdLow,
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

  // Seed packaging items if they don't exist
  for (const pkg of PACKAGING_ITEMS) {
    if (!existingNames.has(pkg.name.toLowerCase())) {
      try {
        addInventoryItem({
          name: pkg.name,
          section: 'packaging',
          currentStock: pkg.quantity,
          unit: pkg.unit,
          shelfLifeDays: 365,
          thresholdLow: pkg.threshold,
          region: 'West',
          storageCondition: 'Dry warehouse',
          supplier: 'Packaging Supplies',
          notes: 'Auto-seeded packaging item',
        });
        added++;
        existingNames.add(pkg.name.toLowerCase());
      } catch (e) {}
    }
  }

  return added;
}
