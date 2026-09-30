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
} from './mealKitsService';

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

// ─── Local in-memory fallback store ───────────────────────────────────────────
let submissionStore: ChefSubmissionRecord[] = [];

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

    if (!error && data) {
      return data.map(mapRowToRecord);
    }
  } catch (err) {
    console.warn('[ChefService] fetchChefSubmissions Supabase error:', err);
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

    if (!error && data) {
      return data.map(mapRowToRecord);
    }
  } catch (err) {
    console.warn('[ChefService] fetchPendingChefSubmissions Supabase error:', err);
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

    if (!error && data) {
      return data.map(mapRowToRecord);
    }
  } catch (err) {
    console.warn('[ChefService] fetchAllChefSubmissions Supabase error:', err);
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
 * The published kit is returned so it can be merged into the main meal kits list.
 */
export async function publishChefSubmission(
  submissionId: string,
  price: number,
  availableRegions: string[],
  availableStorageCentres: string[],
  cities: string[],
  adminNotes?: string,
): Promise<{ success: boolean; kit?: Partial<MealKit>; error?: string }> {
  const now = new Date().toISOString();

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
  }

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

  // Return the partial MealKit object to be merged into the main kits list
  const record = submissionStore[idx] ?? submissionStore.find((s) => s.id === submissionId);
  if (!record) return { success: true };

  const kit: Partial<MealKit> = {
    id: record.id,
    name: record.name,
    slug: record.slug,
    tagline: record.tagline,
    description: record.description,
    heroImage: record.heroImage,
    galleryImages: record.galleryImages,
    price,
    servings: record.servings,
    prepTimeMinutes: record.prepTimeMinutes,
    cookTimeMinutes: record.cookTimeMinutes,
    diet: record.diet,
    cuisine: record.cuisine,
    dishCategory: record.dishCategory,
    spiceLevel: record.spiceLevel,
    difficulty: 'Chef Special',
    dietaryTags: record.dietaryTags,
    allergens: record.allergens,
    ingredients: record.ingredients,
    recipeSteps: record.recipeSteps,
    availableRegions: availableRegions as any,
    availableStorageCentres,
    cities,
    stockByRegion: { North: 99, South: 99, West: 99, East: 99 },
    isChefSpecial: true,
    chefId: record.chefId,
    chefName: record.chefName,
    submissionStatus: 'published',
    submittedAt: record.submittedAt,
    reviewedAt: now,
    reviewNotes: adminNotes,
    rating: 0,
    reviewCount: 0,
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    masalaSachets: [],
    reviews: [],
    salesByRegion: {},
  };

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

  try {
    const { error } = await supabase
      .from('chef_submissions')
      .update({
        submission_status: 'rejected',
        reviewed_at: now,
        review_notes: reviewNotes,
      })
      .eq('id', submissionId);

    if (error) {
      console.warn('[ChefService] rejectChefSubmission Supabase error:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[ChefService] rejectChefSubmission exception:', err?.message || err);
    return { success: true };
  }
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
