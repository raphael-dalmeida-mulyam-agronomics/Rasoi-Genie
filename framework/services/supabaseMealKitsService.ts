import { supabase } from '../supabase/client';
import { INITIAL_MEAL_KITS, MealKit, RegionHub, compileMealKitTags } from './mealKitsService';
import { STORAGE_CENTRE_REGIONS } from './adminRbacService';

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

    const mappedSupabaseKits: MealKit[] = data.map((row: any) => {
      const existing = INITIAL_MEAL_KITS.find((k) => k.id === row.id);
      return {
        id: row.id,
        name: row.name,
        hindiName: row.hindi_name || existing?.hindiName,
        slug: (row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tagline: row.tagline || existing?.tagline || '',
        description: row.description || existing?.description || '',
        heroImage:
          row.image_url ||
          existing?.heroImage ||
          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
        galleryImages: [
          row.image_url ||
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
        difficulty: 'Easy',
        dietaryTags: [row.diet_type || 'veg'],
        isTrending:
          row.is_trending !== undefined
            ? Boolean(row.is_trending)
            : (existing?.isTrending ?? false),
        availableRegions:
          Array.isArray(row.available_regions) && row.available_regions.length > 0
            ? row.available_regions
            : ['North', 'South', 'West', 'East'],
        cities: Array.isArray(row.cities) ? row.cities : [],
        originCity: row.origin_city || existing?.originCity,
        isOutOfStock: row.stock_status === 'out_of_stock' || Boolean(existing?.isOutOfStock),
        stockByRegion: existing?.stockByRegion || {
          North: 50,
          South: 50,
          West: 50,
          East: 50,
        },
        shelfLifeDays: Number(row.shelf_life_days) || existing?.shelfLifeDays || 4,
        shelfLife:
          row.shelf_life ||
          existing?.shelfLife ||
          `${existing?.shelfLifeDays || 4} days (Keep refrigerated at 2°C - 5°C)`,
        storageCondition:
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
        allergens: row.allergens || existing?.allergens || [],
        tags:
          row.tags ||
          existing?.tags ||
          compileMealKitTags({
            diet: row.diet_type || 'veg',
            cuisine: row.cuisine || 'North Indian',
            dishCategory: row.category || 'Curries & Gravies',
            availableRegions: row.available_regions || ['North', 'South', 'West', 'East'],
            allergens: row.allergens || existing?.allergens || [],
          }),
        ingredients: row.ingredients || [],
        masalaSachets: (row.masala_sachets || []).map((s: any) =>
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
      };
    });

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
    const row = {
      id: kit.id,
      name: kit.name,
      tagline: kit.tagline || '',
      description: kit.description || '',
      price: kit.price,
      original_price: kit.originalPrice || kit.price,
      cuisine: kit.cuisine || 'North Indian',
      region: kit.availableRegions?.[0] || 'North',
      available_regions: kit.availableRegions || ['North', 'South', 'West', 'East'],
      cities: kit.cities || [],
      origin_city: kit.originCity || null,
      category: kit.dishCategory || 'Curries & Gravies',
      dish_type: kit.dishCategory || 'Curries & Gravies',
      diet_type: kit.diet || 'veg',
      dietary_tags: kit.dietaryTags || [kit.diet || 'veg'],
      allergens: kit.allergens || [],
      tags: kit.tags && kit.tags.length > 0 ? kit.tags : compileMealKitTags(kit),
      spice_level: kit.spiceLevel || 'Medium',
      is_trending: kit.isTrending ?? false,
      prep_time_minutes: (kit.prepTimeMinutes || 10) + (kit.cookTimeMinutes || 20),
      servings: kit.servings || 2,
      calories: kit.nutrition?.calories || 450,
      image_url:
        kit.heroImage ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      is_published: isPublished,
      stock_status: kit.isOutOfStock ? 'out_of_stock' : 'in_stock',
      shelf_life_days: kit.shelfLifeDays || 4,
      shelf_life:
        kit.shelfLife || `${kit.shelfLifeDays || 4} days (${kit.storageCondition || 'Keep refrigerated at 2°C - 5°C'})`,
      storage_condition: kit.storageCondition || 'Refrigerated at 2°C - 5°C',
      ingredients: kit.ingredients || [],
      instructions: (kit.recipeSteps || []).map((s) => ({
        step: s.stepNumber,
        title: s.title,
        instruction: s.instruction,
      })),
      nutrition: kit.nutrition || {},
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
    const { error } = await supabase
      .from('meal_kits')
      .update({ is_trending: isTrending, updated_at: new Date().toISOString() })
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
      .select('id, cities')
      .eq('is_published', true);

    if (error || !data) return false;

    const targetCity = city.trim().toLowerCase();
    return data.some(
      (row: any) =>
        Array.isArray(row.cities) && row.cities.some((c: string) => c.toLowerCase() === targetCity),
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
    const { error } = await supabase
      .from('meal_kits')
      .update({
        shelf_life_days: shelfLifeDays,
        shelf_life: `${shelfLifeDays} days (${storageCondition})`,
        storage_condition: storageCondition,
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

/**
 * Shared Supabase Realtime channel for meal_kits.
 * Broadcasts instant updates (trending toggles, stock changes, etc.) to all connected clients.
 */
let sharedMealKitsRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const realtimeMealKitListeners = new Set<() => void>();

export function subscribeToMealKitsRealtime(listener: () => void): () => void {
  realtimeMealKitListeners.add(listener);
  ensureSharedMealKitsRealtimeChannel();
  return () => {
    realtimeMealKitListeners.delete(listener);
  };
}

function ensureSharedMealKitsRealtimeChannel() {
  if (sharedMealKitsRealtimeChannel) return;

  try {
    const channelTopic = `rasoi_mealkits_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelTopic);

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meal_kits' },
      async (payload: any) => {
        try {
          const { updateMealKit, syncMealKitsWithSupabase } = await import('./mealKitsService');
          if (payload?.eventType === 'UPDATE' && payload?.new) {
            const updatedRow = payload.new;
            updateMealKit(updatedRow.id, {
              isTrending:
                typeof updatedRow.is_trending === 'boolean' ? updatedRow.is_trending : undefined,
              isOutOfStock: updatedRow.stock_status === 'out_of_stock',
              price: typeof updatedRow.price === 'number' ? updatedRow.price : undefined,
            });
          } else {
            await syncMealKitsWithSupabase();
          }

          realtimeMealKitListeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.warn('[Supabase Realtime MealKits] Listener callback error:', err);
            }
          });
        } catch (err) {
          console.warn('[Supabase Realtime MealKits] Error in change event handler:', err);
        }
      },
    );

    channel.subscribe((status: string, err?: any) => {
      if (err) {
        console.warn('[Supabase Realtime MealKits] Subscription error:', status, err);
      }
    });

    sharedMealKitsRealtimeChannel = channel;
  } catch (err) {
    console.warn('[Supabase Realtime MealKits] Could not initialize realtime channel:', err);
  }
}
