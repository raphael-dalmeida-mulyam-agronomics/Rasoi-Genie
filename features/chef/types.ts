/**
 * Chef Studio Types
 * Strongly-typed definitions for the full-page multi-step recipe authoring experience.
 */

import { DietTag, CuisineType, DishCategory, SpiceLevel } from '../../framework/services/mealKitsService';

export const VALID_UNITS = [
  'g',
  'kg',
  'ml',
  'L',
  'piece',
  'packet',
  'sachet',
  'bunch',
  'clove',
] as const;

export type MeasurementUnit = (typeof VALID_UNITS)[number];

export interface StructuredIngredient {
  id: string; // Internal temporary or inventory ID
  ingredientId?: string; // Inventory reference ID
  name: string;
  amount: number;
  unit: MeasurementUnit;
  quantityStr: string; // e.g. "200 g"
}

export interface StructuredStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl: string;
}

export type ChefStudioStage = 'details' | 'ingredients' | 'steps' | 'review';

export interface ChefRecipeFormState {
  // Step 1: Details
  name: string;
  tagline: string;
  description: string;
  thumbnailUrl: string;
  dietType: DietTag;
  cuisine: CuisineType;
  dishCategory: DishCategory;
  spiceLevel: SpiceLevel;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  dietaryTags: DietTag[];
  allergens: string[];

  // Step 2: Ingredients
  ingredients: StructuredIngredient[];

  // Step 3: Cooking Steps
  steps: StructuredStep[];
}

export interface ReadinessCheckItem {
  key: string;
  label: string;
  stage: ChefStudioStage;
  isValid: boolean;
  errorMessage?: string;
}
