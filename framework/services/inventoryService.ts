// framework/services/inventoryService.ts

export type InventoryCategory = 'raw_material' | 'ingredient' | 'packaging' | 'spice' | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  unit: string;
  shelfLifeDays: number;
  thresholdLow: number;
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
          inventoryStore = parsed;
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[InventoryService] Load error:', e);
  }
  // Fallback to seed data if nothing persisted
  seedInventory();
}

function seedInventory(): void {
  inventoryStore = [
    {
      id: 'inv-001',
      name: 'Chicken Breast',
      category: 'raw_material',
      currentStock: 150,
      unit: 'kg',
      shelfLifeDays: 7,
      thresholdLow: 20,
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
      category: 'spice',
      currentStock: 45,
      unit: 'g',
      shelfLifeDays: 365,
      thresholdLow: 10,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 365).toISOString(),
      storageCondition: 'Cool & dry, away from sunlight',
      supplier: 'SpiceRoute Pvt Ltd',
      costPerUnit: 850,
      notes: 'Organic sourced',
    },
    {
      id: 'inv-003',
      name: 'Paper Cups (8oz)',
      category: 'packaging',
      currentStock: 2000,
      unit: 'units',
      shelfLifeDays: 730,
      thresholdLow: 200,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 730).toISOString(),
      storageCondition: 'Cool & dry warehouse',
      supplier: 'PackRight Supplies',
      costPerUnit: 2.5,
      notes: 'Food-grade, PE-coated',
    },
    {
      id: 'inv-004',
      name: 'Garam Masala Blend',
      category: 'spice',
      currentStock: 8,
      unit: 'kg',
      shelfLifeDays: 180,
      thresholdLow: 5,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Airtight container, cool place',
      supplier: 'SpiceRoute Pvt Ltd',
      costPerUnit: 650,
      notes: 'House blend, 11 spices',
    },
    {
      id: 'inv-005',
      name: 'Tomato Puree (1L)',
      category: 'ingredient',
      currentStock: 30,
      unit: 'liters',
      shelfLifeDays: 30,
      thresholdLow: 5,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 30).toISOString(),
      storageCondition: 'Refrigerated at 2-5°C',
      supplier: 'VegPro Foods',
      costPerUnit: 180,
      notes: 'No preservatives',
    },
    {
      id: 'inv-006',
      name: 'Desi Ghee (5L)',
      category: 'ingredient',
      currentStock: 0,
      unit: 'liters',
      shelfLifeDays: 180,
      thresholdLow: 2,
      lastRestocked: new Date().toISOString(),
      expiryDate: new Date().toISOString(),
      storageCondition: 'Room temperature, sealed',
      supplier: 'Amul Dairy',
      costPerUnit: 3200,
      notes: 'OUT OF STOCK - reorder needed',
    },
    {
      id: 'inv-007',
      name: 'Kasuri Methi',
      category: 'spice',
      currentStock: 120,
      unit: 'g',
      shelfLifeDays: 180,
      thresholdLow: 20,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Airtight, cool & dry',
      supplier: 'HerbGarden Spices',
      costPerUnit: 450,
      notes: 'Dried fenugreek leaves',
    },
    {
      id: 'inv-008',
      name: 'Almond Slivered',
      category: 'ingredient',
      currentStock: 3,
      unit: 'kg',
      shelfLifeDays: 180,
      thresholdLow: 2,
      lastRestocked: new Date().toISOString(),
      expiryDate: addDays(new Date(), 180).toISOString(),
      storageCondition: 'Refrigerated, sealed',
      supplier: 'NutValley Imports',
      costPerUnit: 1800,
      notes: 'Low stock - expiring soon',
    },
    {
      id: 'inv-009',
      name: 'Sesame Oil (1L)',
      category: 'ingredient',
      currentStock: 15,
      unit: 'liters',
      shelfLifeDays: 365,
      thresholdLow: 3,
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
      category: 'spice',
      currentStock: 2,
      unit: 'kg',
      shelfLifeDays: 120,
      thresholdLow: 1,
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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Initialize on module load
loadStore();

export function getInventoryItems(): InventoryItem[] {
  return [...inventoryStore];
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  return inventoryStore.find((item) => item.id === id);
}

export function addInventoryItem(item: Omit<InventoryItem, 'id' | 'lastRestocked' | 'expiryDate'>): InventoryItem {
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

export function updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
  const idx = inventoryStore.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated = { ...inventoryStore[idx], ...updates } as InventoryItem;
  // Recalculate expiry if shelfLifeDays changed
  if (updates.shelfLifeDays !== undefined && updates.lastRestocked) {
    updated.expiryDate = addDays(new Date(updated.lastRestocked), updates.shelfLifeDays).toISOString();
  }
  inventoryStore[idx] = updated;
  persistStore();
  notifyListeners();
  return updated;
}

export function restockInventoryItem(id: string, quantity: number, batchNote?: string): InventoryItem | null {
  const item = inventoryStore.find((i) => i.id === id);
  if (!item) return null;
  const now = new Date();
  const updated: InventoryItem = {
    ...item,
    currentStock: item.currentStock + quantity,
    lastRestocked: now.toISOString(),
    expiryDate: addDays(now, item.shelfLifeDays).toISOString(),
    notes: batchNote ? `${item.notes ? item.notes + ' | ' : ''}Restocked: ${batchNote}` : item.notes,
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

export function getDefaultShelfLife(category: InventoryCategory): number {
  switch (category) {
    case 'raw_material':
      return 7;
    case 'ingredient':
      return 30;
    case 'packaging':
      return 730;
    case 'spice':
      return 180;
    case 'other':
      return 90;
    default:
      return 30;
  }
}
