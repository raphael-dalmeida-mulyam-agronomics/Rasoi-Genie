import { supabase } from '../supabase/client';
import {
  INITIAL_MEAL_KITS,
  MealKit,
  RegionHub,
  compileMealKitTags,
  getMealKitById,
  applyRealtimeMealKitInsert,
  applyRealtimeMealKitUpdate,
  applyRealtimeMealKitDelete,
} from './mealKitsService';
import { subscribeToTable, RealtimeConnectionStatus } from './realtimeService';
import { STORAGE_CENTRE_REGIONS } from './adminRbacService';

/**
 * Maps a raw Supabase meal_kits row to our strongly typed MealKit model.
 */
export function mapSupabaseRowToMealKit(row: any): MealKit {
  const existing = getMealKitById?.(row.id) || INITIAL_MEAL_KITS.find((k) => k.id === row.id);
  return {
    id: row.id,
    name: row.name,
    hindiName: row.hindi_name || existing?.hindiName,
    slug: (row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    tagline: row.tagline || existing?.tagline || '',
    description: row.description || existing?.description || '',
    heroImage:
      row.hero_image ||
      row.image_url ||
      row.nutrition?.hero_image ||
      existing?.heroImage ||
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      row.hero_image ||
        row.image_url ||
        row.nutrition?.hero_image ||
        existing?.heroImage ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    ],
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : Number(row.price),
    servings: Number(row.servings) || 2,
    prepTimeMinutes: Math.round((Number(row.prep_time_minutes) || 30) / 2),
    cookTimeMinutes: Math.round((Number(row.prep_time_minutes) || 30) / 2),
    diet: row.diet_type || 'veg',
    cuisine: row.cuisine || 'North Indian',
    dishCategory: row.category || 'Curries & Gravies',
    spiceLevel: row.spice_level || 'Medium',
    difficulty:
      (row.difficulty as any) || row.nutrition?.difficulty || existing?.difficulty || 'Easy',
    dietaryTags:
      Array.isArray(row.dietary_tags) && row.dietary_tags.length > 0
        ? row.dietary_tags
        : Array.isArray(row.nutrition?.dietary_tags) && row.nutrition.dietary_tags.length > 0
          ? row.nutrition.dietary_tags
          : [row.diet_type || 'veg'],
    isChefSpecial: Boolean(row.nutrition?.is_chef_special ?? existing?.isChefSpecial ?? false),
    chefId: row.nutrition?.chef_id || existing?.chefId,
    chefName: row.nutrition?.chef_name || existing?.chefName,
    availableStorageCentres:
      row.nutrition?.available_storage_centres || existing?.availableStorageCentres || [],
    isTrending:
      row.nutrition?.is_trending !== undefined
        ? Boolean(row.nutrition.is_trending)
        : row.is_trending !== undefined
          ? Boolean(row.is_trending)
          : (existing?.isTrending ?? false),
    availableRegions:
      Array.isArray(row.nutrition?.available_regions) && row.nutrition.available_regions.length > 0
        ? row.nutrition.available_regions
        : Array.isArray(row.available_regions) && row.available_regions.length > 0
          ? row.available_regions
          : existing?.availableRegions || ['North', 'South', 'West', 'East'],
    cities: Array.isArray(row.nutrition?.cities)
      ? row.nutrition.cities
      : Array.isArray(row.cities)
        ? row.cities
        : existing?.cities || [],
    subRegions: Array.isArray(row.nutrition?.sub_regions)
      ? row.nutrition.sub_regions
      : Array.isArray(row.sub_regions)
        ? row.sub_regions
        : existing?.subRegions || [],
    originCity: row.nutrition?.origin_city || row.origin_city || existing?.originCity || null,
    isOutOfStock: row.stock_status === 'out_of_stock' || Boolean(existing?.isOutOfStock),
    stockByRegion: existing?.stockByRegion || {
      North: 50,
      South: 50,
      West: 50,
      East: 50,
    },
    shelfLifeDays:
      Number(row.nutrition?.shelf_life_days) ||
      Number(row.shelf_life_days) ||
      existing?.shelfLifeDays ||
      4,
    shelfLife:
      row.nutrition?.shelf_life ||
      row.shelf_life ||
      existing?.shelfLife ||
      `${existing?.shelfLifeDays || 4} days (Keep refrigerated at 2°C - 5°C)`,
    storageCondition:
      row.nutrition?.storage_condition ||
      row.storage_condition ||
      existing?.storageCondition ||
      'Refrigerated at 2°C - 5°C',
    rating: Number(row.rating) || 5.0,
    reviewCount: Number(row.reviews_count) || 0,
    nutrition: row.nutrition || {
      calories: row.calories || 350,
      protein: 14,
      carbs: 35,
      fat: 10,
      fiber: 4,
    },
    allergens: row.nutrition?.allergens || row.allergens || existing?.allergens || [],
    tags:
      row.nutrition?.tags ||
      row.tags ||
      existing?.tags ||
      compileMealKitTags({
        diet: row.diet_type || 'veg',
        cuisine: row.cuisine || 'North Indian',
        dishCategory: row.category || 'Curries & Gravies',
        availableRegions: row.nutrition?.available_regions ||
          row.available_regions || ['North', 'South', 'West', 'East'],
        allergens: row.nutrition?.allergens || row.allergens || existing?.allergens || [],
      }),
    ingredients: row.ingredients || existing?.ingredients || [],
    masalaSachets: (row.masala_sachets || existing?.masalaSachets || []).map((s: any) =>
      typeof s === 'string' ? s : s.name || s.sachetName || 'Masala Sachet',
    ),
    sachets:
      Array.isArray(row.masala_sachets) &&
      row.masala_sachets.length > 0 &&
      typeof row.masala_sachets[0] === 'object'
        ? row.masala_sachets.map((s: any, idx: number) => ({
            id: s.id || `sachet-${idx + 1}`,
            name: s.name || s.sachetName || `Sachet ${idx + 1}`,
            weight: s.weight,
            spices: s.spices || [],
          }))
        : existing?.sachets,
    recipeSteps: (row.instructions || []).map((ins: any, idx: number) => ({
      stepNumber: ins.step || idx + 1,
      title: ins.title || `Step ${idx + 1}`,
      instruction: ins.instruction || '',
      timerSeconds: ins.timerSeconds,
      imageUrl: ins.imageUrl,
      tip: ins.tip,
    })),
    reviews: existing?.reviews || [],
    salesByRegion: existing?.salesByRegion || {},
    createdAt: row.created_at || existing?.createdAt || existing?.submittedAt,
    updatedAt: row.updated_at || existing?.updatedAt,
  };
}

/**
 * Fetches published meal kits from Supabase.
 * If network or table is not ready, seamlessly falls back to INITIAL_MEAL_KITS.
 */
export async function fetchPublishedMealKitsFromSupabase(): Promise<MealKit[]> {
  try {
    const { data, error } = await supabase
      .from('meal_kits')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_MEAL_KITS;
    }

    const mappedSupabaseKits: MealKit[] = data.map((row: any) => mapSupabaseRowToMealKit(row));

    // Merge: custom Supabase kits appear first, followed by initial kits (omitting any overridden by ID)
    const supabaseKitIds = new Set(mappedSupabaseKits.map((k) => k.id));
    const nonOverriddenInitial = INITIAL_MEAL_KITS.filter((k) => !supabaseKitIds.has(k.id));
    return [...mappedSupabaseKits, ...nonOverriddenInitial];
  } catch (err) {
    console.warn('[Supabase MealKits] Fallback to initial meal kits:', err);
    return INITIAL_MEAL_KITS;
  }
}

/**
 * Creates and publishes a new recipe / meal kit to Supabase.
 */
export async function saveMealKitToSupabase(
  kit: MealKit,
  isPublished: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingNutrition = (kit.nutrition || {}) as Record<string, any>;
    const augmentedNutrition = {
      ...existingNutrition,
      allergens: kit.allergens || existingNutrition.allergens || [],
      available_regions: kit.availableRegions ||
        existingNutrition.available_regions || ['North', 'South', 'West', 'East'],
      cities: kit.cities || existingNutrition.cities || [],
      sub_regions: kit.subRegions || existingNutrition.sub_regions || [],
      origin_city: kit.originCity || existingNutrition.origin_city || null,
      tags: kit.tags && kit.tags.length > 0 ? kit.tags : compileMealKitTags(kit),
      is_trending: kit.isTrending ?? existingNutrition.is_trending ?? false,
      is_chef_special: kit.isChefSpecial ?? existingNutrition.is_chef_special ?? false,
      chef_id: kit.chefId || existingNutrition.chef_id || null,
      chef_name: kit.chefName || existingNutrition.chef_name || null,
      available_storage_centres:
        kit.availableStorageCentres || existingNutrition.available_storage_centres || [],
      shelf_life_days: kit.shelfLifeDays || existingNutrition.shelf_life_days || 4,
      shelf_life:
        kit.shelfLife ||
        existingNutrition.shelf_life ||
        `${kit.shelfLifeDays || 4} days (${kit.storageCondition || 'Keep refrigerated at 2°C - 5°C'})`,
      storage_condition:
        kit.storageCondition || existingNutrition.storage_condition || 'Refrigerated at 2°C - 5°C',
      dietary_tags: kit.dietaryTags || [kit.diet || 'veg'],
      difficulty: kit.difficulty || 'Easy',
      hero_image: kit.heroImage,
    };

    // Columns present in the remote Supabase meal_kits table
    const row = {
      id: kit.id,
      name: kit.name,
      tagline: kit.tagline || '',
      description: kit.description || '',
      price: kit.price,
      original_price: kit.originalPrice || kit.price,
      cuisine: kit.cuisine || 'North Indian',
      region: kit.availableRegions?.[0] || 'North',
      category: kit.dishCategory || 'Curries & Gravies',
      diet_type: kit.diet || 'veg',
      spice_level: kit.spiceLevel || 'Medium',
      prep_time_minutes: (kit.prepTimeMinutes || 10) + (kit.cookTimeMinutes || 20),
      servings: kit.servings || 2,
      calories: kit.nutrition?.calories || 450,
      image_url:
        kit.heroImage ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      is_published: isPublished,
      stock_status: kit.isOutOfStock ? 'out_of_stock' : 'in_stock',
      ingredients: kit.ingredients || [],
      instructions: (kit.recipeSteps || []).map((s) => ({
        step: s.stepNumber,
        title: s.title,
        instruction: s.instruction,
        imageUrl: s.imageUrl,
      })),
      nutrition: augmentedNutrition,
      masala_sachets: kit.sachets && kit.sachets.length > 0 ? kit.sachets : kit.masalaSachets || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('meal_kits').upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase MealKits] Upsert error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Toggles trending status for a meal kit in Supabase and in-memory store.
 */
export async function toggleMealKitTrendingStatus(
  kitId: string,
  isTrending: boolean,
): Promise<{ success: boolean }> {
  try {
    const { data: current } = await supabase
      .from('meal_kits')
      .select('nutrition')
      .eq('id', kitId)
      .maybeSingle();
    const currentNutr = current?.nutrition || {};
    const { error } = await supabase
      .from('meal_kits')
      .update({
        nutrition: { ...currentNutr, is_trending: isTrending },
        updated_at: new Date().toISOString(),
      })
      .eq('id', kitId);

    if (error) {
      console.warn('[Supabase MealKits] Toggle trending error:', error.message);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Filters meal kits by regional admin permissions.
 * Super Admin sees all dishes from all regions.
 * Regional Admins only see dishes that include their assigned region(s).
 */
export function filterMealKitsByAdminRegions(
  kits: MealKit[],
  assignedRegions?: (RegionHub | string)[],
  isSuperAdmin?: boolean,
): MealKit[] {
  if (isSuperAdmin) return kits;
  if (!assignedRegions || assignedRegions.length === 0) return [];
  const assignedSet = new Set(assignedRegions);

  // Derive all cities & zones associated with assigned smaller storage centre regions
  const matchedCities = new Set<string>();
  const matchedZones = new Set<string>();
  for (const reg of assignedRegions) {
    const sc = STORAGE_CENTRE_REGIONS.find(
      (r) => r.id.toLowerCase() === reg.toLowerCase() || r.name.toLowerCase() === reg.toLowerCase(),
    );
    if (sc) {
      matchedCities.add(sc.city.toLowerCase());
      matchedZones.add(sc.zone);
    }
  }

  return kits.filter((k) => {
    // 1. Direct RegionHub match (e.g. 'West')
    if (k.availableRegions && k.availableRegions.some((r) => assignedSet.has(r))) {
      return true;
    }
    // 2. Direct smaller region / storage centre match
    if (k.availableStorageCentres && k.availableStorageCentres.some((sc) => assignedSet.has(sc))) {
      return true;
    }
    // 3. Parent zone match from assigned smaller regions
    if (k.availableRegions && k.availableRegions.some((r) => matchedZones.has(r))) {
      return true;
    }
    // 4. City match (e.g. 'Pune' for pune-city / pune-pcmc)
    if (
      k.cities &&
      k.cities.some((c) => matchedCities.has(c.toLowerCase()) || assignedSet.has(c))
    ) {
      return true;
    }
    if (k.originCity && matchedCities.has(k.originCity.toLowerCase())) {
      return true;
    }
    return false;
  });
}

/**
 * Checks whether Supabase has any kits explicitly targeting a specific city.
 * Used by the city seeder to avoid re-seeding after app reinstalls.
 */
export async function checkCityHasKitsInSupabase(city: string): Promise<boolean> {
  if (!city || !city.trim()) return false;
  try {
    const { data, error } = await supabase
      .from('meal_kits')
      .select('id, nutrition')
      .eq('is_published', true);

    if (error || !data) return false;

    const targetCity = city.trim().toLowerCase();
    return data.some(
      (row: any) =>
        (Array.isArray(row.nutrition?.cities) &&
          row.nutrition.cities.some((c: string) => c.toLowerCase() === targetCity)) ||
        (Array.isArray(row.cities) &&
          row.cities.some((c: string) => c.toLowerCase() === targetCity)) ||
        (row.nutrition?.origin_city &&
          String(row.nutrition.origin_city).toLowerCase() === targetCity),
    );
  } catch {
    return false;
  }
}

/**
 * Toggle publish status of a meal kit in Supabase.
 */
export async function toggleMealKitPublishStatus(
  kitId: string,
  isPublished: boolean,
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('meal_kits')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('id', kitId);

    if (error) {
      console.warn('[Supabase MealKits] Toggle publish error:', error.message);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Toggle out-of-stock status of a meal kit in Supabase.
 */
export async function toggleMealKitOutOfStockStatus(
  kitId: string,
  isOutOfStock: boolean,
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('meal_kits')
      .update({
        stock_status: isOutOfStock ? 'out_of_stock' : 'in_stock',
        updated_at: new Date().toISOString(),
      })
      .eq('id', kitId);

    if (error) {
      console.warn('[Supabase MealKits] Toggle out of stock error:', error.message);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Updates shelf life days and storage condition for a meal kit in Supabase.
 */
export async function updateMealKitShelfLifeInSupabase(
  kitId: string,
  shelfLifeDays: number,
  storageCondition: string = 'Refrigerated at 2°C - 5°C',
): Promise<{ success: boolean }> {
  try {
    const { data: current } = await supabase
      .from('meal_kits')
      .select('nutrition')
      .eq('id', kitId)
      .maybeSingle();
    const currentNutr = current?.nutrition || {};
    const { error } = await supabase
      .from('meal_kits')
      .update({
        nutrition: {
          ...currentNutr,
          shelf_life_days: shelfLifeDays,
          shelf_life: `${shelfLifeDays} days (${storageCondition})`,
          storage_condition: storageCondition,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', kitId);

    if (error) {
      console.warn('[Supabase MealKits] Update shelf life error:', error.message);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Permanently delete a meal kit from Supabase.
 */
export async function deleteMealKitFromSupabase(kitId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.from('meal_kits').delete().eq('id', kitId);

    if (error) {
      console.warn('[Supabase MealKits] Delete error, falling back to unpublish:', error.message);
      await toggleMealKitPublishStatus(kitId, false);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

export interface MealKitRealtimeHandlers {
  onInsert?: (kit: MealKit) => void;
  onUpdate?: (kit: MealKit, oldRow?: Partial<MealKit>) => void;
  onDelete?: (kitId: string, oldRow?: Partial<MealKit>) => void;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  onResync?: () => void | Promise<void>;
}

/**
 * Realtime subscription for meal kits.
 * Directly updates in-memory catalogStore on incoming changes and invokes callbacks.
 * Does NOT write back to Supabase, eliminating echo loops.
 */
export function subscribeToMealKits(handlers: MealKitRealtimeHandlers): () => void {
  return subscribeToTable<any>({
    table: 'meal_kits',
    onInsert: (row) => {
      const kit = mapSupabaseRowToMealKit(row);
      applyRealtimeMealKitInsert(kit);
      handlers.onInsert?.(kit);
    },
    onUpdate: (newRow, oldRow) => {
      const kit = mapSupabaseRowToMealKit(newRow);
      applyRealtimeMealKitUpdate(kit.id, kit);
      handlers.onUpdate?.(kit, oldRow as any);
    },
    onDelete: (oldRow) => {
      const deletedId = oldRow?.id;
      if (deletedId) {
        applyRealtimeMealKitDelete(deletedId);
        handlers.onDelete?.(deletedId, oldRow as any);
      }
    },
    onStatusChange: handlers.onStatusChange,
    onResync: handlers.onResync,
  });
}

/**
 * Shared Supabase Realtime channel for meal_kits (legacy compatibility wrapper).
 */
export function subscribeToMealKitsRealtime(listener: () => void): () => void {
  return subscribeToMealKits({
    onInsert: () => listener(),
    onUpdate: () => listener(),
    onDelete: () => listener(),
    onResync: () => listener(),
  });
}
