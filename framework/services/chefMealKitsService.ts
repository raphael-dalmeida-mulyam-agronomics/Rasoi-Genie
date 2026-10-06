/**
 * Chef Meal Kits Service
 * Handles CRUD operations for chef-submitted meal kit recipes.
 * Chefs can create, view, and delete only their own submissions.
 * Admins review submissions and set price + availability regions before publishing.
 */

import { supabase } from '../supabase/client';
import {
  MealKit,
  DietTag,
  CuisineType,
  DishCategory,
  SpiceLevel,
  IngredientItem,
  RecipeStep,
  RegionHub,
  addMealKit,
  deleteMealKit,
} from './mealKitsService';
import { saveMealKitToSupabase } from './supabaseMealKitsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChefSubmissionStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export interface ChefRecipeSubmission {
  // Core recipe data that a chef fills in
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  diet: DietTag;
  cuisine: CuisineType;
  dishCategory?: DishCategory;
  spiceLevel: SpiceLevel;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  dietaryTags: DietTag[];
  allergens: string[];
  ingredients: IngredientItem[];
  recipeSteps: RecipeStep[];
  // Chef identity
  chefId: string;
  chefName: string;
}

/** Shape of a chef submission as returned by the service */
export interface ChefSubmissionRecord extends ChefRecipeSubmission {
  id: string;
  slug: string;
  submissionStatus: ChefSubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  // Set by admin during review
  price?: number;
  availableRegions?: string[];
  availableStorageCentres?: string[];
  cities?: string[];
}

// ─── Local in-memory and persistent fallback store ────────────────────────────
const CHEF_SUBMISSIONS_KEY = '@rasoi_genie_chef_submissions_v1';
let submissionStore: ChefSubmissionRecord[] = [];

async function loadSubmissionsFromStorage(): Promise<void> {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(CHEF_SUBMISSIONS_KEY);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(CHEF_SUBMISSIONS_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const merged = [...submissionStore];
        for (const s of parsed) {
          if (!merged.some((m) => m.id === s.id)) {
            merged.push(s);
          }
        }
        submissionStore = merged;
      }
    }
  } catch (err) {
    // Ignore storage read error
  }
}

async function persistSubmissionsToStorage(): Promise<void> {
  try {
    const json = JSON.stringify(submissionStore);
    await AsyncStorage.setItem(CHEF_SUBMISSIONS_KEY, json);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CHEF_SUBMISSIONS_KEY, json);
    }
  } catch (err) {
    // Ignore storage write error
  }
}

if (typeof setTimeout !== 'undefined') {
  setTimeout(() => {
    loadSubmissionsFromStorage().catch(() => {});
  }, 100);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetches all recipe submissions created by a specific chef.
 * Supabase-first with local fallback.
 */
export async function fetchChefSubmissions(chefId: string): Promise<ChefSubmissionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('chef_submissions')
      .select('*')
      .eq('chef_id', chefId)
      .order('submitted_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const records = data.map(mapRowToRecord);
      for (const r of records) {
        const idx = submissionStore.findIndex((s) => s.id === r.id);
        if (idx >= 0) submissionStore[idx] = r;
        else submissionStore.push(r);
      }
      return records;
    }
  } catch (err) {
    console.warn('[ChefService] fetchChefSubmissions Supabase error:', err);
  }
  if (submissionStore.length === 0) {
    await loadSubmissionsFromStorage();
  }
  return submissionStore.filter((s) => s.chefId === chefId);
}

/**
 * Fetches ALL pending chef submissions for admin review.
 */
export async function fetchPendingChefSubmissions(): Promise<ChefSubmissionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('chef_submissions')
      .select('*')
      .eq('submission_status', 'pending_review')
      .order('submitted_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const records = data.map(mapRowToRecord);
      for (const r of records) {
        const idx = submissionStore.findIndex((s) => s.id === r.id);
        if (idx >= 0) submissionStore[idx] = r;
        else submissionStore.push(r);
      }
      return records;
    }
  } catch (err) {
    console.warn('[ChefService] fetchPendingChefSubmissions Supabase error:', err);
  }
  if (submissionStore.length === 0) {
    await loadSubmissionsFromStorage();
  }
  return submissionStore.filter((s) => s.submissionStatus === 'pending_review');
}

/**
 * Fetches ALL chef submissions (all statuses) for admin view.
 */
export async function fetchAllChefSubmissions(): Promise<ChefSubmissionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('chef_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const records = data.map(mapRowToRecord);
      for (const r of records) {
        const idx = submissionStore.findIndex((s) => s.id === r.id);
        if (idx >= 0) submissionStore[idx] = r;
        else submissionStore.push(r);
      }
      return records;
    }
  } catch (err) {
    console.warn('[ChefService] fetchAllChefSubmissions Supabase error:', err);
  }
  if (submissionStore.length === 0) {
    await loadSubmissionsFromStorage();
  }
  return [...submissionStore];
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new chef recipe submission as a draft.
 * The submission is stored locally and synced to Supabase.
 */
export async function createChefSubmission(
  data: ChefRecipeSubmission,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = `chef-submission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const slug = slugify(data.name) + '-' + id.slice(-5);
  const now = new Date().toISOString();

  const record: ChefSubmissionRecord = {
    ...data,
    id,
    slug,
    submissionStatus: 'pending_review',
    submittedAt: now,
  };

    // Optimistic local store
    submissionStore.unshift(record);
    persistSubmissionsToStorage().catch(() => {});

    try {
      const { error } = await supabase.from('chef_submissions').insert({
        id,
        slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        hero_image: data.heroImage,
        gallery_images: data.galleryImages,
        diet: data.diet,
        cuisine: data.cuisine,
        dish_category: data.dishCategory ?? null,
        spice_level: data.spiceLevel,
        servings: data.servings,
        prep_time_minutes: data.prepTimeMinutes,
        cook_time_minutes: data.cookTimeMinutes,
        dietary_tags: data.dietaryTags,
        allergens: data.allergens,
        ingredients: data.ingredients,
        recipe_steps: data.recipeSteps,
        chef_id: data.chefId,
        chef_name: data.chefName,
        submission_status: 'pending_review',
        submitted_at: now,
      });

      if (error) {
        console.warn('[ChefService] createChefSubmission Supabase error:', error.message);
      }

      return { success: true, id };
    } catch (err: any) {
      console.warn('[ChefService] createChefSubmission exception:', err?.message || err);
      return { success: true, id }; // Local store updated
    }
  }

  /**
   * Updates an existing chef recipe submission.
   * Reverts submission status to 'pending_review' so that changes are reviewed and approved by admin.
   * Only the authoring chef (or an admin) can update the recipe.
   */
  export async function updateChefSubmission(
    submissionId: string,
    data: Partial<ChefRecipeSubmission>,
    requestingChefId: string,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; error?: string }> {
    let existing = submissionStore.find((s) => s.id === submissionId);
    if (!existing) {
      try {
        const { data: dbData } = await supabase
          .from('chef_submissions')
          .select('*')
          .eq('id', submissionId)
          .maybeSingle();
        if (dbData) {
          existing = mapRowToRecord(dbData);
          submissionStore.unshift(existing);
        }
      } catch {}
    }

    if (!existing) {
      return { success: false, error: 'Recipe submission not found.' };
    }

    if (!isAdmin && existing.chefId !== requestingChefId) {
      return { success: false, error: 'You can only edit your own recipe submissions.' };
    }

    const now = new Date().toISOString();

    // Recipe content only editable by chef
    const updatedRecord: ChefSubmissionRecord = {
      ...existing,
      ...(data.name ? { name: data.name.trim(), slug: slugify(data.name) + '-' + submissionId.slice(-5) } : {}),
      tagline: data.tagline !== undefined ? data.tagline.trim() : existing.tagline,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      heroImage: data.heroImage !== undefined ? data.heroImage.trim() : existing.heroImage,
      galleryImages: data.galleryImages ?? (data.heroImage ? [data.heroImage.trim()] : existing.galleryImages),
      diet: data.diet ?? existing.diet,
      cuisine: data.cuisine ?? existing.cuisine,
      dishCategory: data.dishCategory ?? existing.dishCategory,
      spiceLevel: data.spiceLevel ?? existing.spiceLevel,
      servings: data.servings ?? existing.servings,
      prepTimeMinutes: data.prepTimeMinutes ?? existing.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes ?? existing.cookTimeMinutes,
      dietaryTags: data.dietaryTags ?? existing.dietaryTags,
      allergens: data.allergens ?? existing.allergens,
      ingredients: data.ingredients ?? existing.ingredients,
      recipeSteps: data.recipeSteps ?? existing.recipeSteps,
      submissionStatus: 'pending_review', // Reverts to pending review for admin approval
      submittedAt: now,
      reviewedAt: undefined,
      reviewNotes: undefined,
    };

    const storeIdx = submissionStore.findIndex((s) => s.id === submissionId);
    if (storeIdx >= 0) {
      submissionStore[storeIdx] = updatedRecord;
    } else {
      submissionStore.unshift(updatedRecord);
    }

    persistSubmissionsToStorage().catch(() => {});

    // If it was previously published and live, unpublish until admin re-approves
    deleteMealKit(submissionId);
    try {
      await supabase.from('meal_kits').update({ is_published: false }).eq('id', submissionId);
    } catch {}

    try {
      const { error } = await supabase
        .from('chef_submissions')
        .update({
          name: updatedRecord.name,
          slug: updatedRecord.slug,
          tagline: updatedRecord.tagline,
          description: updatedRecord.description,
          hero_image: updatedRecord.heroImage,
          gallery_images: updatedRecord.galleryImages,
          diet: updatedRecord.diet,
          cuisine: updatedRecord.cuisine,
          dish_category: updatedRecord.dishCategory ?? null,
          spice_level: updatedRecord.spiceLevel,
          servings: updatedRecord.servings,
          prep_time_minutes: updatedRecord.prepTimeMinutes,
          cook_time_minutes: updatedRecord.cookTimeMinutes,
          dietary_tags: updatedRecord.dietaryTags,
          allergens: updatedRecord.allergens,
          ingredients: updatedRecord.ingredients,
          recipe_steps: updatedRecord.recipeSteps,
          submission_status: 'pending_review',
          submitted_at: now,
          reviewed_at: null,
          review_notes: null,
        })
        .eq('id', submissionId);

      if (error) {
        console.warn('[ChefService] updateChefSubmission Supabase error:', error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[ChefService] updateChefSubmission exception:', err?.message || err);
      return { success: true };
    }
  }

  /**
   * Deletes a chef's own submission. Chefs can only delete their own records.
   * Admins can delete any submission.
   */
  export async function deleteChefSubmission(
    submissionId: string,
    requestingChefId: string,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; error?: string }> {
    const record = submissionStore.find((s) => s.id === submissionId);
    if (!isAdmin && record && record.chefId !== requestingChefId) {
      return { success: false, error: 'You can only delete your own submissions.' };
    }

    submissionStore = submissionStore.filter((s) => s.id !== submissionId);
    persistSubmissionsToStorage().catch(() => {});
    deleteMealKit(submissionId);

    try {
      await supabase.from('meal_kits').delete().eq('id', submissionId);
    } catch {}

    try {
      let query = supabase.from('chef_submissions').delete().eq('id', submissionId);
      if (!isAdmin) {
        query = query.eq('chef_id', requestingChefId);
      }
      await query;
      return { success: true };
    } catch (err: any) {
      console.warn('[ChefService] deleteChefSubmission exception:', err?.message || err);
      return { success: true };
    }
  }

  // ─── Admin Review Actions ──────────────────────────────────────────────────────

  /**
   * Admin publishes a chef submission as a live meal kit.
   * Sets price, availability regions, and flips status to 'published'.
   * The published kit is returned and saved to Supabase meal_kits table and active catalog store.
   */
  export async function publishChefSubmission(
    submissionId: string,
    price: number,
    availableRegions: string[],
    availableStorageCentres: string[],
    cities: string[],
    adminNotes?: string,
  ): Promise<{ success: boolean; kit?: MealKit; error?: string }> {
    const now = new Date().toISOString();

    let record = submissionStore.find((s) => s.id === submissionId);
    if (!record) {
      await loadSubmissionsFromStorage();
      record = submissionStore.find((s) => s.id === submissionId);
    }
    if (!record) {
      try {
        const { data: dbData } = await supabase
          .from('chef_submissions')
          .select('*')
          .eq('id', submissionId)
          .maybeSingle();
        if (dbData) {
          record = mapRowToRecord(dbData);
          submissionStore.unshift(record);
        }
      } catch {}
    }

    const idx = submissionStore.findIndex((s) => s.id === submissionId);
    if (idx >= 0) {
      submissionStore[idx] = {
        ...submissionStore[idx]!,
        submissionStatus: 'published',
        reviewedAt: now,
        reviewNotes: adminNotes,
        price,
        availableRegions,
        availableStorageCentres,
        cities,
      };
      record = submissionStore[idx];
    }

    persistSubmissionsToStorage().catch(() => {});

    try {
      const { error } = await supabase
        .from('chef_submissions')
        .update({
          submission_status: 'published',
          reviewed_at: now,
          review_notes: adminNotes ?? null,
          price,
          available_regions: availableRegions,
          available_storage_centres: availableStorageCentres,
          cities,
        })
        .eq('id', submissionId);

      if (error) {
        console.warn('[ChefService] publishChefSubmission Supabase error:', error.message);
      }
    } catch (err: any) {
      console.warn('[ChefService] publishChefSubmission exception:', err?.message || err);
    }

    if (!record) return { success: true };

    const finalRegions = (
      availableRegions && availableRegions.length > 0
        ? availableRegions
        : ['North', 'South', 'West', 'East']
    ) as RegionHub[];

    const heroImg =
      record.heroImage?.trim() ||
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80';

    const kit: MealKit = {
      id: record.id,
      name: record.name,
      slug: record.slug,
      tagline: record.tagline || '',
      description: record.description || '',
      heroImage: heroImg,
      galleryImages:
        record.galleryImages && record.galleryImages.length > 0
          ? record.galleryImages
          : [heroImg],
      price,
      originalPrice: price,
      servings: record.servings || 2,
      prepTimeMinutes: record.prepTimeMinutes || 15,
      cookTimeMinutes: record.cookTimeMinutes || 30,
      diet: record.diet || 'veg',
      cuisine: record.cuisine || 'North Indian',
      dishCategory: record.dishCategory || 'Curries & Gravies',
      spiceLevel: record.spiceLevel || 'Medium',
      difficulty: 'Chef Special',
      dietaryTags:
        record.dietaryTags && record.dietaryTags.length > 0
          ? record.dietaryTags
          : [record.diet || 'veg'],
      allergens: record.allergens || [],
      ingredients: record.ingredients || [],
      recipeSteps: record.recipeSteps || [],
      availableRegions: finalRegions,
      availableStorageCentres: availableStorageCentres || [],
      cities: cities || [],
      stockByRegion: { North: 99, South: 99, West: 99, East: 99 },
      isChefSpecial: true,
      chefId: record.chefId,
      chefName: record.chefName,
      rating: 5.0,
      reviewCount: 0,
      nutrition: { calories: 450, protein: 15, carbs: 40, fat: 12, fiber: 5 },
      masalaSachets: [],
      reviews: [],
      salesByRegion: { North: 0, South: 0, West: 0, East: 0 },
    };

    // 1. Instantly register in the active meal kits catalog (in-memory)
    addMealKit(kit);

    // 2. Persist directly to Supabase meal_kits table
    try {
      const saveRes = await saveMealKitToSupabase(kit, true);
      if (!saveRes.success) {
        console.warn('[ChefService] saveMealKitToSupabase error during publish:', saveRes.error);
      }
    } catch (err: any) {
      console.warn('[ChefService] Failed saving approved meal kit to Supabase:', err?.message || err);
    }

    return { success: true, kit };
  }

  /**
   * Admin rejects a chef submission with an optional reason.
   */
  export async function rejectChefSubmission(
    submissionId: string,
    reviewNotes: string,
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    const idx = submissionStore.findIndex((s) => s.id === submissionId);
    if (idx >= 0) {
      submissionStore[idx] = {
        ...submissionStore[idx]!,
        submissionStatus: 'rejected',
        reviewedAt: now,
        reviewNotes,
      };
    }

    persistSubmissionsToStorage().catch(() => {});
    deleteMealKit(submissionId);

    try {
      await supabase
        .from('chef_submissions')
        .update({
          submission_status: 'rejected',
          reviewed_at: now,
          review_notes: reviewNotes,
        })
        .eq('id', submissionId);
    } catch (err: any) {
      console.warn('[ChefService] rejectChefSubmission exception:', err?.message || err);
    }

    try {
      await supabase.from('meal_kits').update({ is_published: false }).eq('id', submissionId);
    } catch {}

    return { success: true };
  }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapRowToRecord(row: any): ChefSubmissionRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    heroImage: row.hero_image ?? '',
    galleryImages: row.gallery_images ?? [],
    diet: row.diet ?? 'veg',
    cuisine: row.cuisine ?? 'North Indian',
    dishCategory: row.dish_category,
    spiceLevel: row.spice_level ?? 'Medium',
    servings: row.servings ?? 2,
    prepTimeMinutes: row.prep_time_minutes ?? 15,
    cookTimeMinutes: row.cook_time_minutes ?? 30,
    dietaryTags: row.dietary_tags ?? [],
    allergens: row.allergens ?? [],
    ingredients: row.ingredients ?? [],
    recipeSteps: row.recipe_steps ?? [],
    chefId: row.chef_id,
    chefName: row.chef_name ?? 'Chef',
    submissionStatus: row.submission_status ?? 'pending_review',
    submittedAt: row.submitted_at ?? new Date().toISOString(),
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    price: row.price,
    availableRegions: row.available_regions ?? [],
    availableStorageCentres: row.available_storage_centres ?? [],
    cities: row.cities ?? [],
  };
}
