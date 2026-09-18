import { supabase } from '../supabase/client';
import { MealKit, INITIAL_MEAL_KITS } from './mealKitsService';

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

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      tagline: row.tagline || '',
      description: row.description || '',
      heroImage:
        row.image_url ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      galleryImages: [
        row.image_url ||
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
      difficulty: 'Medium',
      dietaryTags: [row.diet_type || 'veg'],
      availableRegions: [row.region || 'North'],
      stockByRegion: {
        North: 50,
        South: 50,
        West: 50,
        East: 50,
      },
      rating: 4.8,
      reviewCount: 24,
      nutrition: row.nutrition || {
        calories: row.calories || 450,
        protein: 18,
        carbs: 45,
        fat: 12,
        fiber: 6,
      },
      allergens: [],
      ingredients: row.ingredients || [],
      masalaSachets: row.masala_sachets || [],
      recipeSteps: (row.instructions || []).map((ins: any, idx: number) => ({
        stepNumber: ins.step || idx + 1,
        title: ins.title || `Step ${idx + 1}`,
        instruction: ins.instruction || '',
      })),
      reviews: [],
      salesByRegion: {},
      slug: (row.name || '').toLowerCase().replace(/\s+/g, '-'),
    }));
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
      is_published: isPublished,
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
