import { NutritionFacts } from '../../framework/services/mealKitsService';

export interface IngredientInput {
  name: string;
  quantity: string;
  isMasalaSachet?: boolean;
}

export interface NutritionEstimationResult {
  perServing: NutritionFacts;
  totalRecipe: NutritionFacts;
  breakdownSummary: string[];
  keyHighlights: string;
}

// Nutritional profile per 100 grams (or standard measure)
interface NutrientProfile {
  calories: number; // kcal per 100g
  protein: number; // g per 100g
  carbs: number; // g per 100g
  fat: number; // g per 100g
  fiber: number; // g per 100g
}

const INGREDIENT_DATABASE: Record<string, NutrientProfile> = {
  // Proteins & Dairy
  paneer: { calories: 296, protein: 18, carbs: 4.5, fat: 23, fiber: 0 },
  tofu: { calories: 83, protein: 10, carbs: 1.5, fat: 5, fiber: 0.5 },
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  mutton: { calories: 250, protein: 25, carbs: 0, fat: 16, fiber: 0 },
  fish: { calories: 120, protein: 22, carbs: 0, fat: 3, fiber: 0 },
  egg: { calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 },
  yogurt: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  curd: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  dahi: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  cream: { calories: 345, protein: 2.2, carbs: 3.8, fat: 37, fiber: 0 },
  malai: { calories: 345, protein: 2.2, carbs: 3.8, fat: 37, fiber: 0 },
  milk: { calories: 62, protein: 3.2, carbs: 4.8, fat: 3.5, fiber: 0 },
  cheese: { calories: 350, protein: 22, carbs: 2, fat: 28, fiber: 0 },

  // Lentils & Pulses
  dal: { calories: 340, protein: 24, carbs: 60, fat: 1.5, fiber: 15 },
  lentil: { calories: 340, protein: 24, carbs: 60, fat: 1.5, fiber: 15 },
  chana: { calories: 364, protein: 19, carbs: 61, fat: 6, fiber: 17 },
  rajma: { calories: 333, protein: 24, carbs: 60, fat: 1, fiber: 25 },
  moong: { calories: 347, protein: 24, carbs: 63, fat: 1.2, fiber: 16 },
  urad: { calories: 341, protein: 25, carbs: 59, fat: 1.6, fiber: 18 },

  // Grains & Rice
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  basmati: { calories: 130, protein: 3, carbs: 28, fat: 0.4, fiber: 0.6 },
  atta: { calories: 340, protein: 12, carbs: 72, fat: 1.7, fiber: 11 },
  flour: { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7 },
  noodles: { calories: 138, protein: 4.5, carbs: 25, fat: 2.1, fiber: 1.2 },
  poha: { calories: 350, protein: 6.8, carbs: 77, fat: 1.2, fiber: 2.8 },

  // Cooking Fats & Oils
  ghee: { calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  oil: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  butter: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
  mustard: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },

  // Vegetables & Aromatics
  onion: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  aloo: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  peas: { calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7 },
  matar: { calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7 },
  spinach: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  palak: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  garlic: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1 },
  ginger: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2 },
  capsicum: { calories: 26, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  mushroom: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  cauliflower: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  gobi: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },

  // Nuts & Spices
  cashew: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  kaju: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  almond: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  spices: { calories: 250, protein: 10, carbs: 40, fat: 12, fiber: 20 },
  masala: { calories: 250, protein: 10, carbs: 40, fat: 12, fiber: 20 },
};

/**
 * Parses a natural language quantity into grams
 */
function parseQuantityToGrams(qtyStr: string): number {
  if (!qtyStr || typeof qtyStr !== 'string') return 50;
  const str = qtyStr.toLowerCase().trim();

  // Match number + unit
  const match = str.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?/);
  if (!match || !match[1]) return 50;

  const num = parseFloat(match[1]);
  const unit = match[2] || 'g';

  switch (unit) {
    case 'kg':
      return num * 1000;
    case 'g':
    case 'gm':
    case 'gms':
    case 'gram':
    case 'grams':
      return num;
    case 'ml':
      return num; // approx 1g per ml
    case 'l':
    case 'ltr':
    case 'liter':
      return num * 1000;
    case 'tbsp':
    case 'tablespoon':
      return num * 15;
    case 'tsp':
    case 'teaspoon':
      return num * 5;
    case 'cup':
    case 'cups':
      return num * 180;
    case 'piece':
    case 'pieces':
    case 'pc':
    case 'pcs':
      return num * 60;
    default:
      return num;
  }
}

/**
 * Finds the closest nutritional profile match for an ingredient name
 */
function matchNutrientProfile(ingredientName: string): NutrientProfile {
  const clean = ingredientName.toLowerCase().replace(/[^a-z\s]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  // 1. Prioritize primary proteins, staples & bases (e.g. 'paneer' in 'fresh malai paneer')
  const ANCHOR_STAPLES = [
    'paneer',
    'chicken',
    'mutton',
    'fish',
    'tofu',
    'dal',
    'chana',
    'rajma',
    'egg',
    'rice',
    'basmati',
    'atta',
    'noodles',
  ];
  for (const word of words) {
    if (ANCHOR_STAPLES.includes(word) && INGREDIENT_DATABASE[word]) {
      const profile = INGREDIENT_DATABASE[word];
      if (profile) return profile;
    }
  }

  // 2. Check any exact word match
  for (const word of words) {
    const profile = INGREDIENT_DATABASE[word];
    if (profile) {
      return profile;
    }
  }

  // 3. Check substring matches
  for (const key of Object.keys(INGREDIENT_DATABASE)) {
    if (clean.includes(key)) {
      const profile = INGREDIENT_DATABASE[key];
      if (profile) return profile;
    }
  }

  // Generic culinary fallback: typical vegetable / mild gravy ingredient
  return { calories: 65, protein: 2, carbs: 8, fat: 2, fiber: 2 };
}

/**
 * Estimates nutritional values from ingredients and portion sizes
 */
export function estimateNutritionWithAI(
  ingredients: IngredientInput[],
  servings: number = 2,
): NutritionEstimationResult {
  const activeServings = Math.max(1, servings);

  if (!ingredients || ingredients.length === 0) {
    // Default balanced meal kit estimate
    return {
      perServing: { calories: 380, protein: 14, carbs: 36, fat: 18, fiber: 5 },
      totalRecipe: {
        calories: 380 * activeServings,
        protein: 14 * activeServings,
        carbs: 36 * activeServings,
        fat: 18 * activeServings,
        fiber: 5 * activeServings,
      },
      breakdownSummary: [
        'Balanced meal baseline estimation applied.',
        'Add ingredients to compute exact macro composition.',
      ],
      keyHighlights: 'Standard chef-curated balanced meal profile.',
    };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  const highlights: string[] = [];

  ingredients.forEach((ing) => {
    if (!ing.name.trim()) return;

    const grams = parseQuantityToGrams(ing.quantity);
    const profile = matchNutrientProfile(ing.name);
    const factor = grams / 100;

    const cal = profile.calories * factor;
    const pro = profile.protein * factor;
    const carb = profile.carbs * factor;
    const fat = profile.fat * factor;
    const fib = profile.fiber * factor;

    totalCalories += cal;
    totalProtein += pro;
    totalCarbs += carb;
    totalFat += fat;
    totalFiber += fib;

    // Highlight key contributors
    if (pro >= 8) {
      highlights.push(`• ${ing.name} (${ing.quantity}): Rich in protein (+${Math.round(pro)}g)`);
    } else if (cal >= 150) {
      highlights.push(
        `• ${ing.name} (${ing.quantity}): Core energy driver (+${Math.round(cal)} kcal)`,
      );
    } else if (fib >= 4) {
      highlights.push(
        `• ${ing.name} (${ing.quantity}): Excellent dietary fiber (+${Math.round(fib)}g)`,
      );
    }
  });

  // Minimum thresholds for gourmet cooked meals (aromatics, pan roasting oil, etc.)
  totalCalories = Math.max(totalCalories, 250 * activeServings);
  totalProtein = Math.max(totalProtein, 8 * activeServings);
  totalCarbs = Math.max(totalCarbs, 20 * activeServings);
  totalFat = Math.max(totalFat, 10 * activeServings);
  totalFiber = Math.max(totalFiber, 3 * activeServings);

  const perServing: NutritionFacts = {
    calories: Math.round(totalCalories / activeServings),
    protein: Math.round((totalProtein / activeServings) * 10) / 10,
    carbs: Math.round((totalCarbs / activeServings) * 10) / 10,
    fat: Math.round((totalFat / activeServings) * 10) / 10,
    fiber: Math.round((totalFiber / activeServings) * 10) / 10,
  };

  const totalRecipe: NutritionFacts = {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    fiber: Math.round(totalFiber * 10) / 10,
  };

  if (highlights.length === 0) {
    highlights.push(`• Computed across ${ingredients.length} fresh ingredients and spice sachets.`);
    highlights.push(`• Standardized for ${activeServings} generous chef portions.`);
  }

  const keyHighlights =
    perServing.protein >= 20
      ? 'High-Protein Gourmet Meal Kit (20g+ per serving)'
      : perServing.carbs <= 25
        ? 'Low-Carb / Keto Friendly Meal Kit'
        : perServing.fiber >= 6
          ? 'High-Fiber Wholesome Kitchen Recipe'
          : 'Nutritionally Balanced Artisan Meal Kit';

  return {
    perServing,
    totalRecipe,
    breakdownSummary: highlights.slice(0, 4),
    keyHighlights,
  };
}
