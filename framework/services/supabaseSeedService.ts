import { supabase } from '../supabase/client';
import { INITIAL_MEAL_KITS, MealKit } from './mealKitsService';

export interface SeedResult {
  success: boolean;
  kitsCount: number;
  ordersCount: number;
  message: string;
  error?: string;
}

/**
 * Seeds existing Indian regional meal kits and initial orders into Supabase database.
 */
export async function seedSupabaseDatabase(forceReseed = false): Promise<SeedResult> {
  let kitsCount = 0;
  let ordersCount = 0;

  try {
    // 1. Check existing meal kits in Supabase
    const { data: existingKits, error: fetchKitsError } = await supabase
      .from('meal_kits')
      .select('id');

    const shouldSeedKits = forceReseed || !existingKits || existingKits.length === 0;

    if (shouldSeedKits) {
      const rowsToInsert = INITIAL_MEAL_KITS.map((kit: MealKit) => ({
        id: kit.id,
        name: kit.name,
        tagline: kit.tagline,
        description: kit.description,
        price: kit.price,
        original_price: kit.originalPrice || kit.price,
        cuisine: kit.cuisine,
        region: kit.availableRegions?.[0] || 'North',
        category: kit.dishCategory || 'Curries & Gravies',
        diet_type: kit.diet,
        spice_level: kit.spiceLevel,
        prep_time_minutes: kit.prepTimeMinutes + kit.cookTimeMinutes,
        servings: kit.servings,
        calories: kit.nutrition?.calories || 450,
        image_url: kit.heroImage,
        is_published: true,
        stock_status: 'in_stock',
        ingredients: kit.ingredients || [],
        instructions: (kit.recipeSteps || []).map((s) => ({
          step: s.stepNumber,
          title: s.title,
          instruction: s.instruction,
        })),
        nutrition: kit.nutrition || {},
        masala_sachets: kit.masalaSachets || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertKitsError } = await supabase
        .from('meal_kits')
        .upsert(rowsToInsert, { onConflict: 'id' });

      if (insertKitsError) {
        console.warn('[Supabase Seed] Error upserting meal kits:', insertKitsError.message);
      } else {
        kitsCount = rowsToInsert.length;
      }
    } else {
      kitsCount = existingKits.length;
    }

    // 2. Count existing orders in Supabase (do not seed filler orders)
    try {
      const { data: existingOrders } = await supabase.from('orders').select('id');
      ordersCount = (existingOrders || []).filter(
        (o: any) => !['ORD-9821', 'ORD-9820', 'ORD-9819'].includes(o.id),
      ).length;
    } catch {
      ordersCount = 0;
    }

    return {
      success: true,
      kitsCount,
      ordersCount,
      message: `Successfully synced ${kitsCount} meal kits and ${ordersCount} orders with Supabase!`,
    };
  } catch (err: any) {
    return {
      success: false,
      kitsCount,
      ordersCount,
      message: 'Failed to seed Supabase database',
      error: err?.message || String(err),
    };
  }
}
