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
  soya: { calories: 345, protein: 52, carbs: 33, fat: 0.5, fiber: 13 },
  soy: { calories: 345, protein: 52, carbs: 33, fat: 0.5, fiber: 13 },
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  mutton: { calories: 250, protein: 25, carbs: 0, fat: 16, fiber: 0 },
  lamb: { calories: 250, protein: 25, carbs: 0, fat: 16, fiber: 0 },
  fish: { calories: 120, protein: 22, carbs: 0, fat: 3, fiber: 0 },
  prawn: { calories: 85, protein: 18, carbs: 0.2, fat: 1, fiber: 0 },
  shrimp: { calories: 85, protein: 18, carbs: 0.2, fat: 1, fiber: 0 },
  egg: { calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 },
  anda: { calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 },
  yogurt: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  curd: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  dahi: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  cream: { calories: 345, protein: 2.2, carbs: 3.8, fat: 37, fiber: 0 },
  malai: { calories: 345, protein: 2.2, carbs: 3.8, fat: 37, fiber: 0 },
  milk: { calories: 62, protein: 3.2, carbs: 4.8, fat: 3.5, fiber: 0 },
  doodh: { calories: 62, protein: 3.2, carbs: 4.8, fat: 3.5, fiber: 0 },
  cheese: { calories: 350, protein: 22, carbs: 2, fat: 28, fiber: 0 },
  khoya: { calories: 360, protein: 14, carbs: 25, fat: 23, fiber: 0 },
  mawa: { calories: 360, protein: 14, carbs: 25, fat: 23, fiber: 0 },
  makhana: { calories: 350, protein: 9.7, carbs: 77, fat: 0.1, fiber: 7.6 },

  // Lentils & Pulses
  dal: { calories: 340, protein: 24, carbs: 60, fat: 1.5, fiber: 15 },
  lentil: { calories: 340, protein: 24, carbs: 60, fat: 1.5, fiber: 15 },
  chana: { calories: 364, protein: 19, carbs: 61, fat: 6, fiber: 17 },
  chickpeas: { calories: 364, protein: 19, carbs: 61, fat: 6, fiber: 17 },
  chhole: { calories: 364, protein: 19, carbs: 61, fat: 6, fiber: 17 },
  rajma: { calories: 333, protein: 24, carbs: 60, fat: 1, fiber: 25 },
  moong: { calories: 347, protein: 24, carbs: 63, fat: 1.2, fiber: 16 },
  urad: { calories: 341, protein: 25, carbs: 59, fat: 1.6, fiber: 18 },
  toor: { calories: 343, protein: 22, carbs: 63, fat: 1.5, fiber: 15 },
  arhar: { calories: 343, protein: 22, carbs: 63, fat: 1.5, fiber: 15 },
  masoor: { calories: 343, protein: 25, carbs: 60, fat: 1, fiber: 11 },

  // Grains & Rice
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  basmati: { calories: 130, protein: 3, carbs: 28, fat: 0.4, fiber: 0.6 },
  atta: { calories: 340, protein: 12, carbs: 72, fat: 1.7, fiber: 11 },
  flour: { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7 },
  maida: { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7 },
  sooji: { calories: 360, protein: 12, carbs: 73, fat: 1, fiber: 3.9 },
  suji: { calories: 360, protein: 12, carbs: 73, fat: 1, fiber: 3.9 },
  rava: { calories: 360, protein: 12, carbs: 73, fat: 1, fiber: 3.9 },
  besan: { calories: 387, protein: 22, carbs: 58, fat: 6.7, fiber: 10.8 },
  noodles: { calories: 138, protein: 4.5, carbs: 25, fat: 2.1, fiber: 1.2 },
  poha: { calories: 350, protein: 6.8, carbs: 77, fat: 1.2, fiber: 2.8 },

  // Cooking Fats & Oils
  ghee: { calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  oil: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  butter: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
  makhan: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
  mustard: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  sarson: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  olive: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  coconut: { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0 },

  // Vegetables & Aromatics
  onion: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  pyaz: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  tamatar: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  aloo: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  peas: { calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7 },
  matar: { calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7 },
  spinach: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  palak: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  garlic: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1 },
  lahsun: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1 },
  ginger: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2 },
  adrak: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2 },
  capsicum: { calories: 26, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  shimla: { calories: 26, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  mushroom: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  cauliflower: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  gobi: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  carrot: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  gajar: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  cabbage: { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 },
  bhindi: { calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2 },
  okra: { calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2 },
  corn: { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2 },
  coriander: { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
  dhania: { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
  mint: { calories: 44, protein: 3.3, carbs: 8.4, fat: 0.7, fiber: 6.8 },
  pudina: { calories: 44, protein: 3.3, carbs: 8.4, fat: 0.7, fiber: 6.8 },

  // Nuts & Spices
  cashew: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  kaju: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  almond: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  badam: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  spices: { calories: 250, protein: 10, carbs: 40, fat: 12, fiber: 20 },
  masala: { calories: 250, protein: 10, carbs: 40, fat: 12, fiber: 20 },
  turmeric: { calories: 312, protein: 9.7, carbs: 67, fat: 3.3, fiber: 22.7 },
  haldi: { calories: 312, protein: 9.7, carbs: 67, fat: 3.3, fiber: 22.7 },
  chilli: { calories: 282, protein: 13.4, carbs: 50, fat: 14.3, fiber: 27 },
  mirch: { calories: 282, protein: 13.4, carbs: 50, fat: 14.3, fiber: 27 },
  cumin: { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 10.5 },
  jeera: { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 10.5 },
  cardamom: { calories: 311, protein: 11, carbs: 68, fat: 6.7, fiber: 28 },
  elaichi: { calories: 311, protein: 11, carbs: 68, fat: 6.7, fiber: 28 },
  cinnamon: { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53 },
  dalchini: { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53 },
  clove: { calories: 274, protein: 6, carbs: 65, fat: 13, fiber: 34 },
  laung: { calories: 274, protein: 6, carbs: 65, fat: 13, fiber: 34 },
  methi: { calories: 323, protein: 23, carbs: 58, fat: 6.4, fiber: 24.6 },
  kasuri: { calories: 323, protein: 23, carbs: 58, fat: 6.4, fiber: 24.6 },
  amchur: { calories: 360, protein: 3, carbs: 80, fat: 1, fiber: 9 },
  hing: { calories: 290, protein: 4, carbs: 68, fat: 1, fiber: 4 },
  asafoetida: { calories: 290, protein: 4, carbs: 68, fat: 1, fiber: 4 },
  pepper: { calories: 251, protein: 10.4, carbs: 64, fat: 3.3, fiber: 25.3 },
  saffron: { calories: 310, protein: 11, carbs: 65, fat: 6, fiber: 4 },
  kesar: { calories: 310, protein: 11, carbs: 65, fat: 6, fiber: 4 },
  salt: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  namak: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
};

/**
 * Parses a natural language quantity into grams, supporting fractions,
 * metric, imperial, volume, and unit-less counts.
 */
export function parseQuantityToGrams(qtyStr: string): number {
  if (!qtyStr || typeof qtyStr !== 'string') return 50;
  const str = qtyStr.toLowerCase().trim();

  // 1. Support fractions like "1/2", "1/4", "3/4", "1 1/2"
  let num = 1;
  const fractionMatch = str.match(/(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const numPart = parseFloat(fractionMatch[2]!);
    const denPart = parseFloat(fractionMatch[3]!);
    if (denPart > 0) {
      num = whole + numPart / denPart;
    }
  } else {
    const numMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (numMatch && numMatch[1]) {
      num = parseFloat(numMatch[1]);
    }
  }

  // 2. Unit conversion
  if (str.includes('kg') || str.includes('kilo')) return num * 1000;
  if (
    str.includes('ltr') ||
    str.includes('liter') ||
    str.includes('litre') ||
    (str.includes(' l ') && !str.includes('ml'))
  ) {
    return num * 1000;
  }
  if (str.includes('cup')) return num * 180;
  if (str.includes('tbsp') || str.includes('tablespoon')) return num * 15;
  if (str.includes('tsp') || str.includes('teaspoon')) return num * 5;
  if (str.includes('pinch')) return num * 0.4;
  if (str.includes('strand')) return num * 0.02;
  if (str.includes('leaf') || str.includes('leaves')) return num * 0.2;
  if (str.includes('clove')) return num * 3;
  if (str.includes('piece') || str.includes('pc')) return num * 60;
  if (str.includes('slice')) return num * 25;
  if (str.includes('g') || str.includes('gm') || str.includes('gram') || str.includes('ml')) {
    return num;
  }

  // Fallback heuristic:
  // If raw number >= 10, likely entered as grams (e.g. "250" = 250g)
  if (num >= 10) return num;
  // If num < 10, likely piece / portion count (e.g. "2" = 2 portions ~ 100g)
  return num * 50;
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
    'prawn',
    'tofu',
    'soya',
    'dal',
    'chana',
    'chhole',
    'rajma',
    'egg',
    'rice',
    'basmati',
    'atta',
    'maida',
    'sooji',
    'besan',
    'ghee',
    'butter',
    'oil',
    'cream',
    'cashew',
    'almond',
  ];
  for (const word of words) {
    if (ANCHOR_STAPLES.includes(word) && INGREDIENT_DATABASE[word]) {
      return INGREDIENT_DATABASE[word]!;
    }
  }

  // 2. Check any exact word match
  for (const word of words) {
    if (INGREDIENT_DATABASE[word]) {
      return INGREDIENT_DATABASE[word]!;
    }
  }

  // 3. Partial match
  for (const key of Object.keys(INGREDIENT_DATABASE)) {
    const profile = INGREDIENT_DATABASE[key];
    if (clean.includes(key) && profile) {
      return profile;
    }
  }

  // Generic culinary fallback: typical vegetable / mild gravy ingredient
  return { calories: 65, protein: 2, carbs: 8, fat: 2, fiber: 2 };
}

/**
 * Estimates nutritional values in real time from ingredients and exact portion sizes.
 * Dynamically computes calories, protein, carbs, fat, and fiber without artificial clamping.
 */
export function estimateNutritionWithAI(
  ingredients: IngredientInput[],
  servings: number = 2,
): NutritionEstimationResult {
  const activeServings = Math.max(1, servings);

  if (!ingredients || ingredients.length === 0) {
    return {
      perServing: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      totalRecipe: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
      breakdownSummary: [
        'Add ingredients and sachet spices to compute real-time nutritional values.',
      ],
      keyHighlights: 'Live nutrition calculation ready.',
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

    // Highlight key nutrient contributors
    if (pro >= 6) {
      highlights.push(`• ${ing.name} (${ing.quantity}): +${Math.round(pro)}g protein`);
    } else if (cal >= 100) {
      highlights.push(`• ${ing.name} (${ing.quantity}): +${Math.round(cal)} kcal energy`);
    } else if (fib >= 3) {
      highlights.push(`• ${ing.name} (${ing.quantity}): +${Math.round(fib)}g dietary fiber`);
    }
  });

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

  if (highlights.length === 0 && ingredients.length > 0) {
    highlights.push(
      `• Calculated across ${ingredients.length} ingredients (${Math.round(totalCalories)} total kcal).`,
    );
    highlights.push(`• Standardized for ${activeServings} chef portions.`);
  }

  const keyHighlights =
    perServing.protein >= 20
      ? `High-Protein Formula (${perServing.protein}g protein per serving)`
      : perServing.carbs <= 20 && perServing.protein >= 12
        ? `Low-Carb / Keto Recipe (${perServing.carbs}g carbs per serving)`
        : perServing.fiber >= 6
          ? `High-Fiber Wholesome Kit (${perServing.fiber}g fiber per serving)`
          : `Nutritionally Balanced Formula (${perServing.calories} kcal per serving)`;

  return {
    perServing,
    totalRecipe,
    breakdownSummary: highlights.slice(0, 5),
    keyHighlights,
  };
}
