// framework/services/supabaseInventoryService.ts
// Supabase Backend integration for the Inventory Hub:
// Provides full CRUD operations, live Realtime subscription, and automatic seed synchronization.

import { supabase } from '../supabase/client';
import { isMissingSchemaError } from './supabaseUtils';
import {
  addDays,
  addInventoryItem,
  deduplicateAndCleanInventoryStore,
  deleteInventoryItem,
  getInventoryItems,
  InventoryItem,
  InventorySection,
  restockInventoryItem,
  setInventoryStore,
  updateInventoryItem,
} from './inventoryService';
import { cleanIngredientName, guessSection, guessUnit } from './seedInventoryFromMealKits';

/**
 * Maps a raw Supabase inventory_items table row to strongly-typed InventoryItem
 */
export function mapSupabaseRowToInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: cleanIngredientName(row.name),
    section: (row.section as InventorySection) || guessSection(row.name),
    currentStock: Number(row.current_stock) || 0,
    unit: row.unit || guessUnit(row.name),
    shelfLifeDays: Number(row.shelf_life_days) || 7,
    thresholdLow: Number(row.threshold_low) || 10,
    region: row.region || 'West',
    lastRestocked: row.last_restocked || new Date().toISOString(),
    expiryDate:
      row.expiry_date || addDays(new Date(), Number(row.shelf_life_days) || 7).toISOString(),
    storageCondition: row.storage_condition || 'Cool & dry / Refrigerated',
    supplier: row.supplier || '',
    costPerUnit: Number(row.cost_per_unit) || 0,
    notes: row.notes || '',
  };
}

/**
 * Maps an InventoryItem object to a Supabase table row
 */
export function mapInventoryItemToRow(item: InventoryItem): any {
  return {
    id: item.id,
    name: item.name,
    section: item.section,
    current_stock: item.currentStock,
    unit: item.unit,
    shelf_life_days: item.shelfLifeDays,
    threshold_low: item.thresholdLow,
    region: item.region || 'West',
    last_restocked: item.lastRestocked,
    expiry_date: item.expiryDate,
    storage_condition: item.storageCondition,
    supplier: item.supplier,
    cost_per_unit: item.costPerUnit,
    notes: item.notes,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetches all inventory items from the Supabase backend.
 * - Deduplicates and normalizes names.
 * - If the remote database is empty, automatically seeds it from local catalog.
 * - Gracefully falls back to local cached store on connection issues.
 */
export async function fetchInventoryFromSupabase(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Fetch error, using local fallback:', error.message);
      }
      deduplicateAndCleanInventoryStore(cleanIngredientName);
      return getInventoryItems();
    }

    if (data && data.length > 0) {
      // Map remote rows to InventoryItem objects
      const mapped = data.map(mapSupabaseRowToInventoryItem);
      // Synchronize in-memory and local storage with deduplication
      setInventoryStore(mapped);
      deduplicateAndCleanInventoryStore(cleanIngredientName);
      return getInventoryItems();
    }

    // Database is online but empty -> seed from local catalog
    const localItems = getInventoryItems();
    if (localItems.length > 0) {
      await seedSupabaseInventory(localItems);
    }
    return getInventoryItems();
  } catch (err: any) {
    console.warn('[Supabase Inventory] Network exception:', err?.message || err);
    deduplicateAndCleanInventoryStore(cleanIngredientName);
    return getInventoryItems();
  }
}

/**
 * Seeds the Supabase database with all clean inventory items.
 */
export async function seedSupabaseInventory(items: InventoryItem[]): Promise<number> {
  let seeded = 0;
  try {
    const rows = items.map(mapInventoryItemToRow);
    const { error } = await supabase.from('inventory_items').upsert(rows, { onConflict: 'id' });

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Seed upsert error:', error.message);
      }
    } else {
      seeded = rows.length;
      console.log(`[Supabase Inventory] Seeded ${seeded} items into Supabase.`);
    }
  } catch (e: any) {
    if (!isMissingSchemaError(e)) {
      console.warn('[Supabase Inventory] Seed exception:', e?.message || e);
    }
  }
  return seeded;
}

/**
 * Adds a new inventory item both to Supabase and the local in-memory store.
 */
export async function addInventoryItemToSupabase(
  itemData: Omit<InventoryItem, 'id' | 'lastRestocked' | 'expiryDate'>,
): Promise<InventoryItem> {
  const cleanName = cleanIngredientName(itemData.name);
  const normalizedItem = {
    ...itemData,
    name: cleanName,
  };

  // 1. Immediately update local store for instant UI response
  const localItem = addInventoryItem(normalizedItem);

  // 2. Persist to Supabase database
  try {
    const row = mapInventoryItemToRow(localItem);
    const { error } = await supabase.from('inventory_items').insert(row);
    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Insert error:', error.message);
      }
    }
  } catch (err: any) {
    if (!isMissingSchemaError(err)) {
      console.warn('[Supabase Inventory] Insert exception:', err?.message || err);
    }
  }

  return localItem;
}

/**
 * Updates an existing inventory item in Supabase and the local store.
 */
export async function updateInventoryItemInSupabase(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<InventoryItem | null> {
  if (updates.name) {
    updates.name = cleanIngredientName(updates.name);
  }

  // 1. Immediately update local store
  const updated = updateInventoryItem(id, updates);
  if (!updated) return null;

  // 2. Persist update to Supabase
  try {
    const row = mapInventoryItemToRow(updated);
    const { error } = await supabase.from('inventory_items').update(row).eq('id', id);

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Update error:', error.message);
      }
    }
  } catch (err: any) {
    if (!isMissingSchemaError(err)) {
      console.warn('[Supabase Inventory] Update exception:', err?.message || err);
    }
  }

  return updated;
}

/**
 * Restocks an item in Supabase and local store.
 */
export async function restockInventoryItemInSupabase(
  id: string,
  quantity: number,
  batchNote?: string,
): Promise<InventoryItem | null> {
  // 1. Immediately restock local store
  const updated = restockInventoryItem(id, quantity, batchNote);
  if (!updated) return null;

  // 2. Persist update to Supabase
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        current_stock: updated.currentStock,
        last_restocked: updated.lastRestocked,
        expiry_date: updated.expiryDate,
        notes: updated.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Restock error:', error.message);
      }
    }
  } catch (err: any) {
    if (!isMissingSchemaError(err)) {
      console.warn('[Supabase Inventory] Restock exception:', err?.message || err);
    }
  }

  return updated;
}

export interface BulkRestockEntry {
  id: string;
  quantity: number;
  shelfLifeDays?: number;
}

/**
 * Bulk restocks multiple items simultaneously in Supabase and the local store.
 * Also saves any configured shelf life for each item so future restocks reuse it.
 */
export async function bulkRestockInventoryItemsInSupabase(
  itemsToRestock: BulkRestockEntry[],
  batchNote?: string,
): Promise<{ success: boolean; count: number }> {
  let restockedCount = 0;
  const now = new Date();

  for (const entry of itemsToRestock) {
    if (entry.quantity <= 0) continue;

    // 1. If shelfLifeDays configured, update shelfLifeDays first
    if (entry.shelfLifeDays !== undefined && entry.shelfLifeDays > 0) {
      updateInventoryItem(entry.id, {
        shelfLifeDays: entry.shelfLifeDays,
        expiryDate: addDays(now, entry.shelfLifeDays).toISOString(),
      });
    }

    // 2. Restock quantity and calculate new expiry
    const updated = restockInventoryItem(entry.id, entry.quantity, batchNote);
    if (updated) {
      restockedCount++;
      // Sync to Supabase
      try {
        await supabase
          .from('inventory_items')
          .update({
            current_stock: updated.currentStock,
            shelf_life_days: updated.shelfLifeDays,
            last_restocked: updated.lastRestocked,
            expiry_date: updated.expiryDate,
            notes: updated.notes,
            updated_at: now.toISOString(),
          })
          .eq('id', entry.id);
      } catch (err) {
        if (!isMissingSchemaError(err)) {
          console.warn('[Supabase Inventory] Bulk restock sync error for item:', entry.id, err);
        }
      }
    }
  }

  return { success: restockedCount > 0, count: restockedCount };
}

/**
 * Deletes an inventory item from Supabase and the local store.
 */
export async function deleteInventoryItemFromSupabase(id: string): Promise<boolean> {
  // 1. Immediately delete from local store
  const localSuccess = deleteInventoryItem(id);

  // 2. Persist delete to Supabase
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn('[Supabase Inventory] Delete error:', error.message);
      }
    }
  } catch (err: any) {
    if (!isMissingSchemaError(err)) {
      console.warn('[Supabase Inventory] Delete exception:', err?.message || err);
    }
  }

  return localSuccess;
}

/**
 * Subscribes to Realtime changes on public.inventory_items table.
 * Automatically synchronizes changes from other admin sessions or database updates.
 */
export function subscribeToRealtimeInventory(onSync?: () => void): () => void {
  try {
    const channel = supabase
      .channel('public:inventory_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        (payload) => {
          try {
            if (payload.eventType === 'INSERT' && payload.new) {
              const item = mapSupabaseRowToInventoryItem(payload.new);
              const exists = getInventoryItems().some((i) => i.id === item.id);
              if (!exists) {
                addInventoryItem(item);
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const item = mapSupabaseRowToInventoryItem(payload.new);
              updateInventoryItem(item.id, item);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              deleteInventoryItem(payload.old.id);
            }
            deduplicateAndCleanInventoryStore(cleanIngredientName);
            onSync?.();
          } catch (e) {
            console.warn('[Supabase Inventory Realtime] Event handling error:', e);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Inventory] Realtime setup error:', err);
    return () => {};
  }
}
