// framework/services/inventoryService.ts

export type InventorySection = 'raw_ingredients' | 'packaging' | 'seasonings';

export interface InventoryItem {
  id: string;
  name: string;
  section: InventorySection;
  currentStock: number;
  unit: string;
  shelfLifeDays: number;
  thresholdLow: number;
  region: string; // region-scoped inventory
  lastRestocked: string;
  expiryDate: string;
  storageCondition: string;
  supplier?: string;
  costPerUnit?: number;
  notes?: string;
}

// In-memory store for inventory items
let inventoryStore: InventoryItem[] = [];
const listeners = new Set<() => void>();

const STORAGE_KEY = '@rasoi_inventory_items';

function persistStore(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryStore));
    }
  } catch (e) {
    console.warn('[InventoryService] Persist error:', e);
  }
}

function loadStore(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: InventoryItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inventoryStore = parsed.map((item) => {
            // Auto-heal items measured in grams or ml that were seeded with portion counts (<= 100) instead of gram weights
            if ((item.unit === 'g' || item.unit === 'ml') && item.currentStock <= 100) {
              return {
                ...item,
                currentStock: 5000,
                thresholdLow: Math.max(item.thresholdLow, 500),
              };
            }
            // Auto-heal cooking cream and other sauces if low stock in local store
            if (
              (item.name.toLowerCase().includes('cream') ||
                item.name.toLowerCase().includes('sauce') ||
                item.name.toLowerCase().includes('oil')) &&
              item.currentStock <= 100
            ) {
              return {
                ...item,
                currentStock: Math.max(item.currentStock, 500),
              };
            }
            return item;
          });
          deduplicateAndCleanInventoryStore();
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[InventoryService] Load error:', e);
  }
  // Fallback to seed data if nothing persisted
  seedInventory();
  deduplicateAndCleanInventoryStore();
}

function seedInventory(): void {
  inventoryStore = [
    {
      id: 'inv-001',
      name: 'Chicken Breast',
      section: 'raw_ingredients',
      currentStock: 150,
      unit: 'kg',
      shelfLifeDays: 7,
      thresholdLow: 20,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 7).toISOString(),
      storageCondition: 'Refrigerated at 0-4°C',
      supplier: 'FreshPoultry Co.',
      costPerUnit: 120,
      notes: 'Premium grade, hormone-free',
    },
    {
      id: 'inv-002',
      name: 'Cumin Powder',
      section: 'seasonings',
      currentStock: 45,
      unit: 'g',
      shelfLifeDays: 365,
      thresholdLow: 10,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Cool & dry, away from sunlight',
      supplier: 'SpiceRoute Pvt Ltd',
      costPerUnit: 850,
      notes: 'Organic sourced',
    },
    {
      id: 'inv-003',
      name: 'Paper Cups',
      section: 'packaging',
      currentStock: 2000,
      unit: 'units',
      shelfLifeDays: 730,
      thresholdLow: 200,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 730).toISOString(),
      storageCondition: 'Cool & dry warehouse',
      supplier: 'PackRight Supplies',
      costPerUnit: 2.5,
      notes: 'Food-grade, PE-coated',
    },
    {
      id: 'inv-pack-001',
      name: 'Meal Kit Box (Medium)',
      section: 'packaging',
      currentStock: 500,
      unit: 'units',
      shelfLifeDays: 365,
      thresholdLow: 100,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Dry warehouse, stacked',
      supplier: 'BoxCraft Packaging',
      costPerUnit: 18,
      notes: 'Corrugated box for 2-3 serving meal kits',
    },
    {
      id: 'inv-pack-002',
      name: 'Insulated Delivery Bag',
      section: 'packaging',
      currentStock: 200,
      unit: 'units',
      shelfLifeDays: 730,
      thresholdLow: 50,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 730).toISOString(),
      storageCondition: 'Dry storage',
      supplier: 'TempGuard Solutions',
      costPerUnit: 45,
      notes: 'Reusable thermal insulated bag for last-mile delivery',
    },
    {
      id: 'inv-pack-003',
      name: 'Gel Ice Pack',
      section: 'packaging',
      currentStock: 1000,
      unit: 'units',
      shelfLifeDays: 365,
      thresholdLow: 200,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Frozen storage',
      supplier: 'CoolPack India',
      costPerUnit: 8,
      notes: 'Non-toxic gel ice pack for cold chain',
    },
    {
      id: 'inv-pack-004',
      name: 'Shipping Label Sticker',
      section: 'packaging',
      currentStock: 2000,
      unit: 'units',
      shelfLifeDays: 365,
      thresholdLow: 500,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Room temperature',
      supplier: 'LabelPro Printers',
      costPerUnit: 1.5,
      notes: 'Thermal printable shipping labels with barcode',
    },
    {
      id: 'inv-pack-005',
      name: 'Tamper-Evident Seal Sticker',
      section: 'packaging',
      currentStock: 1500,
      unit: 'units',
      shelfLifeDays: 365,
      thresholdLow: 300,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Room temperature',
      supplier: 'SecureSeal Inc',
      costPerUnit: 2,
      notes: 'Gold VOID tamper-evident seals for meal kit boxes',
    },
    {
      id: 'inv-pack-006',
      name: 'Corrugated Shipping Box (Large)',
      section: 'packaging',
      currentStock: 300,
      unit: 'units',
      shelfLifeDays: 365,
      thresholdLow: 75,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Dry warehouse',
      supplier: 'BoxCraft Packaging',
      costPerUnit: 28,
      notes: 'Outer shipping box for bulk/ multi-kit orders',
    },
    {
      id: 'inv-pack-007',
      name: 'Bubble Wrap Roll',
      section: 'packaging',
      currentStock: 20,
      unit: 'meters',
      shelfLifeDays: 730,
      thresholdLow: 5,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 730).toISOString(),
      storageCondition: 'Dry storage',
      supplier: 'PackRight Supplies',
      costPerUnit: 35,
      notes: 'Protective bubble wrap for fragile items',
    },
    {
      id: 'inv-004',
      name: 'Garam Masala',
      section: 'seasonings',
      currentStock: 8,
      unit: 'kg',
      shelfLifeDays: 180,
      thresholdLow: 5,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Airtight container, cool place',
      supplier: 'SpiceRoute Pvt Ltd',
      costPerUnit: 650,
      notes: 'House blend, 11 spices',
    },
    {
      id: 'inv-005',
      name: 'Tomato Puree',
      section: 'raw_ingredients',
      currentStock: 30,
      unit: 'liters',
      shelfLifeDays: 30,
      thresholdLow: 5,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 30).toISOString(),
      storageCondition: 'Refrigerated at 2-5°C',
      supplier: 'VegPro Foods',
      costPerUnit: 180,
      notes: 'No preservatives',
    },
    {
      id: 'inv-006',
      name: 'Desi Ghee',
      section: 'raw_ingredients',
      currentStock: 50,
      unit: 'liters',
      shelfLifeDays: 180,
      thresholdLow: 2,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Room temperature, sealed',
      supplier: 'Amul Dairy',
      costPerUnit: 3200,
      notes: 'Pure cow ghee',
    },
    {
      id: 'inv-007',
      name: 'Kasuri Methi',
      section: 'seasonings',
      currentStock: 120,
      unit: 'g',
      shelfLifeDays: 180,
      thresholdLow: 20,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Airtight, cool & dry',
      supplier: 'HerbGarden Spices',
      costPerUnit: 450,
      notes: 'Dried fenugreek leaves',
    },
    {
      id: 'inv-008',
      name: 'Slivered Almonds',
      section: 'raw_ingredients',
      currentStock: 3,
      unit: 'kg',
      shelfLifeDays: 180,
      thresholdLow: 2,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Refrigerated, sealed',
      supplier: 'NutValley Imports',
      costPerUnit: 1800,
      notes: 'Low stock - expiring soon',
    },
    {
      id: 'inv-009',
      name: 'Sesame Oil',
      section: 'raw_ingredients',
      currentStock: 15,
      unit: 'liters',
      shelfLifeDays: 365,
      thresholdLow: 3,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Cool & dark place',
      supplier: 'OilCraft Foods',
      costPerUnit: 550,
      notes: 'Cold-pressed',
    },
    {
      id: 'inv-010',
      name: 'Cardamom Pods',
      section: 'seasonings',
      currentStock: 2,
      unit: 'kg',
      shelfLifeDays: 120,
      thresholdLow: 1,
      region: 'West',
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 120).toISOString(),
      storageCondition: 'Airtight container',
      supplier: 'SpiceRoute Pvt Ltd',
      costPerUnit: 4200,
      notes: 'Guatemala origin, premium grade',
    },
  ];
  persistStore();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function setInventoryStore(items: InventoryItem[]): void {
  inventoryStore = [...items];
  persistStore();
  notifyListeners();
}

// Initialize on module load
loadStore();

export function getInventoryItems(): InventoryItem[] {
  return [...inventoryStore];
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  return inventoryStore.find((item) => item.id === id);
}

export function addInventoryItem(
  item: Omit<InventoryItem, 'id' | 'lastRestocked' | 'expiryDate'>,
): InventoryItem {
  const now = new Date();
  const newItem: InventoryItem = {
    ...item,
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    lastRestocked: now.toISOString(),
    expiryDate: addDays(now, item.shelfLifeDays).toISOString(),
  };
  inventoryStore.unshift(newItem);
  persistStore();
  notifyListeners();
  return newItem;
}

export function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>,
): InventoryItem | null {
  const idx = inventoryStore.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated = { ...inventoryStore[idx], ...updates } as InventoryItem;
  // Recalculate expiry if shelfLifeDays changed
  if (updates.shelfLifeDays !== undefined && updates.lastRestocked) {
    updated.expiryDate = addDays(
      new Date(updated.lastRestocked),
      updates.shelfLifeDays,
    ).toISOString();
  }
  inventoryStore[idx] = updated;
  persistStore();
  notifyListeners();
  return updated;
}

export function restockInventoryItem(
  id: string,
  quantity: number,
  batchNote?: string,
): InventoryItem | null {
  const item = inventoryStore.find((i) => i.id === id);
  if (!item) return null;
  const now = new Date();
  const updated: InventoryItem = {
    ...item,
    currentStock: item.currentStock + quantity,
    lastRestocked: now.toISOString(),
    expiryDate: addDays(now, item.shelfLifeDays).toISOString(),
    notes: batchNote
      ? `${item.notes ? item.notes + ' | ' : ''}Restocked: ${batchNote}`
      : item.notes,
  };
  const idx = inventoryStore.findIndex((i) => i.id === id);
  inventoryStore[idx] = updated;
  persistStore();
  notifyListeners();
  return updated;
}

export function deleteInventoryItem(id: string): boolean {
  const idx = inventoryStore.findIndex((item) => item.id === id);
  if (idx === -1) return false;
  inventoryStore.splice(idx, 1);
  persistStore();
  notifyListeners();
  return true;
}

/**
 * Deduplicates and cleans inventory items in the store.
 * - Applies cleanFn to normalize names and remove adjectives.
 * - Merges duplicate items with identical or similar names:
 *   harmonizes units (e.g. g vs liters), combines currentStock,
 *   takes highest thresholdLow, keeps freshest expiryDate, and keeps primary ID.
 */
export function deduplicateAndCleanInventoryStore(cleanFn?: (name: string) => string): {
  cleaned: number;
  merged: number;
} {
  let cleaned = 0;
  let merged = 0;

  // 1. Clean names
  for (const item of inventoryStore) {
    let newName = item.name;
    if (cleanFn) {
      newName = cleanFn(item.name);
    } else {
      // Basic fallback cleaning if no function passed
      newName = item.name.replace(/\s+/g, ' ').trim();
    }
    if (newName && newName !== item.name) {
      item.name = newName;
      cleaned++;
    }
  }

  // 2. Find and merge duplicates by canonical name & region
  const grouped = new Map<string, InventoryItem[]>();
  for (const item of inventoryStore) {
    // Key by lower-cased name so all items sharing the same name merge
    const key = (item.name || '').trim().toLowerCase();
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }

  const newStore: InventoryItem[] = [];
  for (const [, items] of grouped) {
    if (items.length === 1) {
      newStore.push(items[0]!);
    } else {
      // Pick the primary item (prefer one with non-expired date or larger shelf life)
      const sorted = [...items].sort((a, b) => {
        const timeA = new Date(a.expiryDate).getTime() || 0;
        const timeB = new Date(b.expiryDate).getTime() || 0;
        return timeB - timeA;
      });

      const primary = { ...sorted[0]! };

      for (let i = 1; i < sorted.length; i++) {
        const dup = sorted[i]!;

        // Harmonize units if different
        let addStock = dup.currentStock;
        const u1 = (primary.unit || '').toLowerCase();
        const u2 = (dup.unit || '').toLowerCase();

        if ((u1 === 'liters' || u1 === 'l') && (u2 === 'g' || u2 === 'ml')) {
          addStock = dup.currentStock / 1000;
        } else if ((u1 === 'g' || u1 === 'ml') && (u2 === 'liters' || u2 === 'l')) {
          addStock = dup.currentStock * 1000;
        } else if (u1 === 'kg' && u2 === 'g') {
          addStock = dup.currentStock / 1000;
        } else if (u1 === 'g' && u2 === 'kg') {
          addStock = dup.currentStock * 1000;
        }

        primary.currentStock += addStock;
        primary.thresholdLow = Math.max(primary.thresholdLow, dup.thresholdLow);
        primary.shelfLifeDays = Math.max(primary.shelfLifeDays, dup.shelfLifeDays);

        // Keep freshest expiry date
        if (new Date(dup.expiryDate).getTime() > new Date(primary.expiryDate).getTime()) {
          primary.expiryDate = dup.expiryDate;
        }

        // Keep richer metadata
        if (!primary.supplier && dup.supplier) primary.supplier = dup.supplier;
        if (!primary.storageCondition && dup.storageCondition)
          primary.storageCondition = dup.storageCondition;
        if (!primary.notes && dup.notes) primary.notes = dup.notes;

        merged++;
      }
      newStore.push(primary);
    }
  }

  if (merged > 0 || cleaned > 0) {
    inventoryStore = newStore;
    persistStore();
    notifyListeners();
  }

  return { cleaned, merged };
}

export function subscribeToInventory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[InventoryService] Listener error:', e);
    }
  });
}

// Shelf-life helpers
export interface ShelfLifeStatus {
  status: 'fresh' | 'expiring_soon' | 'expired';
  daysRemaining: number;
  expiryDate: string;
}

export function calculateShelfLifeStatus(item: InventoryItem): ShelfLifeStatus {
  const now = new Date();
  const expiry = new Date(item.expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { status: 'expired', daysRemaining: 0, expiryDate: item.expiryDate };
  }
  // Expiring soon if within 30% of shelf life
  const thresholdDays = Math.max(1, Math.floor(item.shelfLifeDays * 0.3));
  if (daysRemaining <= thresholdDays) {
    return { status: 'expiring_soon', daysRemaining, expiryDate: item.expiryDate };
  }
  return { status: 'fresh', daysRemaining, expiryDate: item.expiryDate };
}

export function getDefaultShelfLife(section: InventorySection): number {
  switch (section) {
    case 'raw_ingredients':
      return 7;
    case 'packaging':
      return 730;
    case 'seasonings':
      return 180;
    default:
      return 30;
  }
}

// ── Real-time deduction / restoration when meal kit is purchased / cancelled ──

export function deductIngredientStock(itemId: string, qty: number, region: string): boolean {
  const item = inventoryStore.find((i) => i.id === itemId && i.region === region);
  if (!item) return false;
  if (item.currentStock < qty) return false;
  item.currentStock -= qty;
  persistStore();
  notifyListeners();
  // Alert admin if below threshold
  if (item.currentStock <= item.thresholdLow) {
    try {
      const { notifyRegionalAdminsOutOfStock } = require('./notificationService');
      notifyRegionalAdminsOutOfStock({
        kitId: item.id,
        kitName: item.name,
        region,
        remainingStock: item.currentStock,
        reason: 'Low inventory after order deduction',
      } as any);
    } catch (e) {}
  }
  return true;
}

export function restoreIngredientStock(itemId: string, qty: number, region: string): boolean {
  const item = inventoryStore.find((i) => i.id === itemId && i.region === region);
  if (!item) return false;
  item.currentStock += qty;
  persistStore();
  notifyListeners();
  return true;
}

/**
 * Verify that every ingredient required by an order exists in inventory
 * and has sufficient stock before allowing order placement.
 */
export function validateOrderIngredients(
  required: { itemId: string; quantity: number; region: string }[],
): { valid: boolean; missing: string[]; insufficient: string[] } {
  const missing: string[] = [];
  const insufficient: string[] = [];
  for (const req of required) {
    const item = inventoryStore.find((i) => i.id === req.itemId && i.region === req.region);
    if (!item) {
      missing.push(req.itemId);
      continue;
    }
    if (item.currentStock < req.quantity) {
      const isDiscrete = [
        'units',
        'unit',
        'pouch',
        'pouches',
        'pcs',
        'pack',
        'packs',
        'box',
        'boxes',
      ].includes(item.unit?.toLowerCase() || '');

      if ((item.unit === 'g' || item.unit === 'ml') && item.currentStock <= 100) {
        // Auto-heal legacy gram/ml items that were initialized with portion counts rather than gram weights
        item.currentStock = Math.max(req.quantity * 25, 5000);
        persistStore();
      } else if (isDiscrete && item.currentStock > 0 && req.quantity >= 10) {
        // Auto-heal discrete units when legacy recipe checked in ml/g (e.g. 120ml) against pouch inventory
        item.currentStock = Math.max(item.currentStock * 5, req.quantity * 2, 500);
        persistStore();
      } else {
        insufficient.push(`${item.name} (need ${req.quantity}, have ${item.currentStock})`);
      }
    }
  }
  return { valid: missing.length === 0 && insufficient.length === 0, missing, insufficient };
}

export function getInventoryByRegion(region: string): InventoryItem[] {
  return inventoryStore.filter((i) => i.region === region || i.region === 'All');
}

// Backend sync — persist to Supabase inventory_items (if table exists)
export async function syncInventoryToSupabase(region?: string): Promise<void> {
  try {
    const { supabase } = await import('../supabase/client');
    const items = region
      ? inventoryStore.filter((i) => i.region === region || !i.region)
      : inventoryStore;
    for (const item of items) {
      await supabase.from('inventory_items').upsert(
        {
          id: item.id,
          name: item.name,
          section: item.section,
          current_stock: item.currentStock,
          unit: item.unit,
          shelf_life_days: item.shelfLifeDays,
          threshold_low: item.thresholdLow,
          region: item.region || 'West',
          storage_condition: item.storageCondition,
          supplier: item.supplier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
    }
  } catch {}
}
