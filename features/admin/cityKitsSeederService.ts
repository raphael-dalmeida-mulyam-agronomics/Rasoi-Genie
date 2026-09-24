/**
 * cityKitsSeederService.ts
 *
 * Generates and seeds city-specific meal kit stubs when a city has no kits.
 * Each city gets a curated set of kits across multiple cuisines and categories,
 * including the new European, Mediterranean, and Soups & Stews categories.
 *
 * Strategy:
 *  - Check in-memory store + Supabase for kits matching the city
 *  - If none found, generate CITY_KIT_TEMPLATES adapted for that city and save them
 *  - Uses addMealKit (in-memory) + saveMealKitToSupabase (persistence)
 *  - Returns the newly seeded kits so the caller can update its UI immediately
 */

import {
  MealKit,
  RegionHub,
  CuisineType,
  DishCategory,
  DietTag,
  SpiceLevel,
  getMealKits,
  addMealKit,
} from '../../framework/services/mealKitsService';
import { saveMealKitToSupabase } from '../../framework/services/supabaseMealKitsService';
import { estimateNutritionWithAI } from './nutritionEstimatorService';

// ─── City → RegionHub mapping ────────────────────────────────────────────────
// Maps normalised city names to their RegionHub. Unrecognised cities default to 'North'.
const CITY_HUB_MAP: Record<string, RegionHub> = {
  // South
  bengaluru: 'South',
  bangalore: 'South',
  hyderabad: 'South',
  chennai: 'South',
  thiruvananthapuram: 'South',
  kochi: 'South',
  coimbatore: 'South',
  mysuru: 'South',
  mysore: 'South',
  vizag: 'South',
  visakhapatnam: 'South',
  // West
  mumbai: 'West',
  pune: 'West',
  ahmedabad: 'West',
  surat: 'West',
  nagpur: 'West',
  nashik: 'West',
  // North
  delhi: 'North',
  'new delhi': 'North',
  'delhi ncr': 'North',
  noida: 'North',
  gurugram: 'North',
  chandigarh: 'North',
  jaipur: 'North',
  lucknow: 'North',
  agra: 'North',
  // East
  kolkata: 'East',
  bhubaneswar: 'East',
  patna: 'East',
  ranchi: 'East',
  guwahati: 'East',
};

export function hubForCity(city: string): RegionHub {
  return CITY_HUB_MAP[city.trim().toLowerCase()] ?? 'North';
}

// ─── Kit template definitions ─────────────────────────────────────────────────
// Each template carries everything needed to create a full MealKit for any city.
interface KitTemplate {
  baseName: string;
  tagline: string;
  cuisine: CuisineType;
  dishCategory: DishCategory;
  diet: DietTag;
  dietaryTags: DietTag[];
  spiceLevel: SpiceLevel;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  price: number;
  heroImage: string;
  ingredients: { name: string; quantity: string; isMasalaSachet?: boolean }[];
  recipeSteps: { title: string; instruction: string; timerSeconds?: number; tip?: string }[];
  allergens: string[];
  isTrending?: boolean;
}

const CITY_KIT_TEMPLATES: KitTemplate[] = [
  // ── North Indian ────────────────────────────────────────────────────────────
  {
    baseName: 'Dal Makhani Kit',
    tagline: 'Slow-simmered black lentils in buttery tomato cream',
    cuisine: 'North Indian',
    dishCategory: 'Curries & Gravies',
    diet: 'veg',
    dietaryTags: ['veg', 'gluten-free'],
    spiceLevel: 'Medium',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    price: 279,
    heroImage:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Whole Black Urad Dal', quantity: '150g' },
      { name: 'Rajma (Kidney Beans)', quantity: '50g' },
      { name: 'Fresh Tomato Puree', quantity: '180g' },
      { name: 'White Butter', quantity: '25g' },
      { name: 'Fresh Cream', quantity: '30g' },
      { name: 'Dal Makhani Masala Sachet', quantity: '20g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Pressure Cook Dal',
        instruction: 'Wash dal, add 2 cups water and pressure cook for 6 whistles until soft.',
        timerSeconds: 360,
        tip: 'Soak dal overnight for creamier results.',
      },
      {
        title: 'Prepare Tomato Base',
        instruction:
          'Heat butter in a pan. Add tomato puree and Dal Makhani Masala Sachet. Cook stirring for 5 minutes until oil separates.',
        timerSeconds: 300,
      },
      {
        title: 'Combine & Simmer',
        instruction:
          'Add cooked dal to the tomato base. Stir well, add ½ cup water and simmer on low flame for 15 minutes.',
        timerSeconds: 900,
        tip: 'The longer it simmers, the richer it tastes.',
      },
      {
        title: 'Finish with Cream',
        instruction: 'Stir in fresh cream, adjust salt and serve hot with a swirl of butter.',
        timerSeconds: 60,
      },
    ],
    allergens: ['Dairy'],
  },

  // ── South Indian ─────────────────────────────────────────────────────────────
  {
    baseName: 'Chettinad Chicken Curry Kit',
    tagline: 'Fiery Tamil Nadu classic with freshly ground Chettinad spices',
    cuisine: 'South Indian',
    dishCategory: 'Curries & Gravies',
    diet: 'nonveg',
    dietaryTags: ['nonveg', 'gluten-free'],
    spiceLevel: 'Spicy',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    price: 329,
    heroImage:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Chicken Curry Pieces', quantity: '400g' },
      { name: 'Shallots (Sambar Onions)', quantity: '100g' },
      { name: 'Fresh Tomatoes', quantity: '150g' },
      { name: 'Coconut Milk', quantity: '100ml' },
      { name: 'Chettinad Masala Sachet', quantity: '25g', isMasalaSachet: true },
      { name: 'Curry Leaf Tadka Sachet', quantity: '5g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Sauté Shallots',
        instruction: 'Heat oil, add shallots and fry until golden brown.',
        timerSeconds: 180,
      },
      {
        title: 'Add Tomatoes & Masala',
        instruction:
          'Add chopped tomatoes and Chettinad Masala Sachet. Cook until tomatoes are mushy and oil separates.',
        timerSeconds: 300,
      },
      {
        title: 'Cook Chicken',
        instruction: 'Add chicken pieces, mix well and cook on medium heat for 12 minutes.',
        timerSeconds: 720,
        tip: 'Cover the pan to keep the moisture in.',
      },
      {
        title: 'Finish with Coconut Milk',
        instruction: 'Pour in coconut milk, add Curry Leaf Sachet, simmer 5 minutes and serve.',
        timerSeconds: 300,
      },
    ],
    allergens: ['Tree Nuts (Coconut)'],
    isTrending: true,
  },

  // ── Soups & Stews ────────────────────────────────────────────────────────────
  {
    baseName: 'Spiced Tomato & Lentil Soup Kit',
    tagline: 'Hearty red lentil soup with roasted cumin and fresh lime',
    cuisine: 'Continental',
    dishCategory: 'Soups & Stews',
    diet: 'veg',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    spiceLevel: 'Mild',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    price: 219,
    heroImage:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Red Masoor Dal', quantity: '120g' },
      { name: 'Fresh Tomatoes', quantity: '200g' },
      { name: 'Garlic Cloves', quantity: '4 pieces' },
      { name: 'Fresh Ginger', quantity: '10g' },
      { name: 'Roasted Cumin & Lime Sachet', quantity: '8g', isMasalaSachet: true },
      { name: 'Coconut Oil', quantity: '1 tbsp' },
    ],
    recipeSteps: [
      {
        title: 'Sauté Aromatics',
        instruction: 'Heat coconut oil, add minced garlic and ginger. Sauté 2 minutes.',
        timerSeconds: 120,
      },
      {
        title: 'Add Dal & Tomatoes',
        instruction: 'Add lentils, chopped tomatoes, Roasted Cumin Sachet and 3 cups water.',
        timerSeconds: 60,
      },
      {
        title: 'Simmer',
        instruction: 'Bring to boil, reduce heat and simmer for 18 minutes until dal is soft.',
        timerSeconds: 1080,
        tip: 'Skim any foam off the top for a cleaner broth.',
      },
      {
        title: 'Blend & Serve',
        instruction: 'Blend until smooth, adjust salt and serve with a squeeze of lime.',
        timerSeconds: 60,
      },
    ],
    allergens: [],
  },

  // ── Mediterranean ────────────────────────────────────────────────────────────
  {
    baseName: 'Mediterranean Chickpea & Spinach Stew Kit',
    tagline: 'Rustic Spanish-style potaje with smoked paprika and fresh herbs',
    cuisine: 'Mediterranean',
    dishCategory: 'Soups & Stews',
    diet: 'veg',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    spiceLevel: 'Mild',
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 20,
    price: 259,
    heroImage:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Pre-cooked Chickpeas', quantity: '240g' },
      { name: 'Fresh Baby Spinach', quantity: '100g' },
      { name: 'San Marzano Tomato Puree', quantity: '150g' },
      { name: 'Garlic Cloves', quantity: '3 pieces' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Mediterranean Spice Sachet', quantity: '12g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Warm the Oil & Garlic',
        instruction: 'Heat olive oil over medium heat, add sliced garlic and cook 1 minute.',
        timerSeconds: 60,
        tip: 'Do not let garlic brown — golden is perfect.',
      },
      {
        title: 'Add Tomatoes & Spices',
        instruction: 'Add tomato puree and Mediterranean Spice Sachet, stir and cook 4 minutes.',
        timerSeconds: 240,
      },
      {
        title: 'Add Chickpeas & Simmer',
        instruction:
          'Add chickpeas and ½ cup water. Simmer 10 minutes until stew thickens slightly.',
        timerSeconds: 600,
      },
      {
        title: 'Wilt Spinach & Serve',
        instruction: 'Stir in baby spinach, cook 2 minutes until wilted. Drizzle with olive oil.',
        timerSeconds: 120,
      },
    ],
    allergens: [],
  },

  // ── European ─────────────────────────────────────────────────────────────────
  {
    baseName: 'Classic French Ratatouille Kit',
    tagline: 'Provençal roasted vegetable casserole with herbes de Provence',
    cuisine: 'European',
    dishCategory: 'Soups & Stews',
    diet: 'veg',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    spiceLevel: 'Mild',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    price: 299,
    heroImage:
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Zucchini / Courgette', quantity: '150g' },
      { name: 'Eggplant (Brinjal)', quantity: '150g' },
      { name: 'Yellow Bell Pepper', quantity: '1 piece' },
      { name: 'Fresh Tomatoes', quantity: '200g' },
      { name: 'Onion', quantity: '1 piece' },
      { name: 'Olive Oil', quantity: '3 tbsp' },
      { name: 'Herbes de Provence Sachet', quantity: '10g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Sauté Onion & Pepper',
        instruction: 'Heat olive oil, add diced onion and pepper. Cook 5 minutes until soft.',
        timerSeconds: 300,
      },
      {
        title: 'Add Eggplant & Zucchini',
        instruction:
          'Add cubed eggplant and zucchini with Herbes de Provence Sachet. Stir and cook 5 minutes.',
        timerSeconds: 300,
      },
      {
        title: 'Add Tomatoes & Simmer',
        instruction:
          'Add chopped tomatoes and ¼ cup water. Cover and simmer on low for 20 minutes.',
        timerSeconds: 1200,
        tip: 'Stir gently every 5 minutes to prevent sticking.',
      },
      {
        title: 'Season & Serve',
        instruction: 'Uncover, season with salt and a drizzle of olive oil. Serve warm or cold.',
        timerSeconds: 60,
      },
    ],
    allergens: [],
  },

  // ── European (Pasta) ─────────────────────────────────────────────────────────
  {
    baseName: 'Creamy Mushroom Pasta Kit',
    tagline: 'Italian-style pappardelle with wild mushrooms and parmesan cream',
    cuisine: 'European',
    dishCategory: 'Pastas',
    diet: 'veg',
    dietaryTags: ['veg'],
    spiceLevel: 'Mild',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    price: 319,
    heroImage:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Pappardelle Pasta', quantity: '200g' },
      { name: 'Mixed Wild Mushrooms', quantity: '200g' },
      { name: 'Cooking Cream', quantity: '150ml' },
      { name: 'Parmesan Cheese (Grated)', quantity: '40g' },
      { name: 'Garlic Cloves', quantity: '3 pieces' },
      { name: 'Butter', quantity: '20g' },
      { name: 'Italian Herb Sachet', quantity: '8g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Boil Pasta',
        instruction:
          'Cook pasta in salted boiling water per pack instructions. Reserve ½ cup pasta water.',
        timerSeconds: 600,
        tip: 'Al dente pasta holds the sauce better.',
      },
      {
        title: 'Sauté Mushrooms',
        instruction: 'Melt butter, add sliced mushrooms and garlic. Sauté 5 minutes until golden.',
        timerSeconds: 300,
      },
      {
        title: 'Make Cream Sauce',
        instruction:
          'Add cream, Italian Herb Sachet and half the parmesan. Stir until sauce coats a spoon.',
        timerSeconds: 180,
      },
      {
        title: 'Toss & Serve',
        instruction:
          'Toss pasta in the sauce. Add pasta water to loosen if needed. Top with remaining parmesan.',
        timerSeconds: 60,
      },
    ],
    allergens: ['Dairy', 'Gluten / Wheat'],
  },

  // ── Mediterranean (Grilled) ──────────────────────────────────────────────────
  {
    baseName: 'Greek Lemon Herb Chicken Kit',
    tagline: 'Marinated chicken with tzatziki, lemon and oregano',
    cuisine: 'Mediterranean',
    dishCategory: 'Curries & Gravies',
    diet: 'nonveg',
    dietaryTags: ['nonveg', 'gluten-free'],
    spiceLevel: 'Mild',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    price: 349,
    heroImage:
      'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Chicken Breast Fillets', quantity: '350g' },
      { name: 'Greek Yogurt', quantity: '80g' },
      { name: 'Lemon Juice', quantity: '2 tbsp' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Greek Herb & Spice Sachet', quantity: '12g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Marinate Chicken',
        instruction:
          'Mix yogurt, lemon juice, olive oil and Greek Herb Sachet. Coat chicken and marinate 10 min.',
        timerSeconds: 600,
        tip: 'Score the chicken so the marinade penetrates deeply.',
      },
      {
        title: 'Sear Chicken',
        instruction:
          'Heat a pan on high. Sear chicken 3 minutes per side until golden and charred at edges.',
        timerSeconds: 360,
      },
      {
        title: 'Finish in Pan',
        instruction:
          'Reduce heat to medium, cover and cook 8 more minutes until fully cooked through.',
        timerSeconds: 480,
      },
      {
        title: 'Rest & Serve',
        instruction: 'Rest 3 minutes, slice and serve with fresh lemon wedges.',
        timerSeconds: 180,
      },
    ],
    allergens: ['Dairy'],
    isTrending: true,
  },

  // ── Indo-Chinese ─────────────────────────────────────────────────────────────
  {
    baseName: 'Veg Manchurian Kit',
    tagline: 'Crispy veggie dumplings in tangy Indo-Chinese dark sauce',
    cuisine: 'Indo-Chinese',
    dishCategory: 'Curries & Gravies',
    diet: 'veg',
    dietaryTags: ['veg', 'vegan'],
    spiceLevel: 'Medium',
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    price: 249,
    heroImage:
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
    ingredients: [
      { name: 'Mixed Veg Dumpling Mix', quantity: '200g' },
      { name: 'Cornflour', quantity: '30g' },
      { name: 'Spring Onions', quantity: '50g' },
      { name: 'Garlic & Ginger Paste', quantity: '20g' },
      { name: 'Oil for Frying', quantity: '3 tbsp' },
      { name: 'Manchurian Sauce Sachet', quantity: '40g', isMasalaSachet: true },
    ],
    recipeSteps: [
      {
        title: 'Shape & Fry Balls',
        instruction:
          'Mix veg dumpling mix with cornflour and a pinch of salt. Shape into balls and shallow-fry until golden.',
        timerSeconds: 360,
        tip: 'Do not overcrowd the pan for even crispiness.',
      },
      {
        title: 'Sauté Aromatics',
        instruction:
          'In the same pan, sauté garlic-ginger paste and white part of spring onions 1 minute.',
        timerSeconds: 60,
      },
      {
        title: 'Add Sauce',
        instruction: 'Add Manchurian Sauce Sachet and ¼ cup water. Bring to a quick boil.',
        timerSeconds: 120,
      },
      {
        title: 'Toss & Garnish',
        instruction: 'Toss fried balls in sauce. Garnish with green spring onions and serve hot.',
        timerSeconds: 60,
      },
    ],
    allergens: ['Gluten / Wheat', 'Soy'],
  },
];

// ─── Seeder logic ─────────────────────────────────────────────────────────────

/**
 * Returns all kits in the in-memory store that are available in a specific city.
 * Kits with cities: [] are considered available everywhere within their hub.
 */
export function getKitsForCity(city: string): MealKit[] {
  if (!city || !city.trim()) return [];
  const targetCity = city.trim().toLowerCase();
  const hub = hubForCity(city);
  return getMealKits().filter((kit) => {
    const inHub = kit.availableRegions.includes(hub);
    if (!inHub) return false;
    if (!kit.cities || kit.cities.length === 0) return true; // hub-wide kit
    return kit.cities.some((c) => c.toLowerCase() === targetCity);
  });
}

/**
 * Checks whether the given city already has any city-specific kits seeded.
 * Returns true if there is at least one kit explicitly targeting this city.
 */
export function hasCitySpecificKits(city: string): boolean {
  if (!city || !city.trim()) return false;
  const targetCity = city.trim().toLowerCase();
  return getMealKits().some(
    (kit) => Array.isArray(kit.cities) && kit.cities.some((c) => c.toLowerCase() === targetCity),
  );
}

/**
 * Generates a MealKit from a KitTemplate for a specific city.
 */
function buildKitForCity(template: KitTemplate, city: string, index: number): MealKit {
  const hub = hubForCity(city);
  const capitalCity = city.trim().charAt(0).toUpperCase() + city.trim().slice(1).toLowerCase();
  const id = `city-${city.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`;
  const slug = `${template.baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${city.trim().toLowerCase().replace(/\s+/g, '-')}`;

  // Compute nutrition from ingredients
  const nutritionResult = estimateNutritionWithAI(
    template.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      isMasalaSachet: i.isMasalaSachet,
    })),
    template.servings,
  );

  const stockByRegion: Record<string, number> = { North: 0, South: 0, West: 0, East: 0 };
  stockByRegion[hub] = 50;

  return {
    id,
    name: `${template.baseName}`,
    slug,
    tagline: template.tagline,
    description: `Freshly prepared ${template.baseName} — crafted for ${capitalCity} food lovers with locally sourced ingredients and chef-curated spice sachets.`,
    heroImage: template.heroImage,
    galleryImages: [template.heroImage],
    price: template.price,
    originalPrice: Math.round(template.price * 1.15),
    servings: template.servings,
    prepTimeMinutes: template.prepTimeMinutes,
    cookTimeMinutes: template.cookTimeMinutes,
    diet: template.diet,
    cuisine: template.cuisine,
    dishCategory: template.dishCategory,
    spiceLevel: template.spiceLevel,
    difficulty: 'Easy',
    dietaryTags: template.dietaryTags,
    isTrending: template.isTrending ?? false,
    availableRegions: [hub],
    cities: [capitalCity],
    stockByRegion: stockByRegion as Record<'North' | 'South' | 'West' | 'East', number>,
    rating: 4.5 + Math.round(Math.random() * 4) / 10,
    reviewCount: 0,
    nutrition: nutritionResult.perServing,
    allergens: template.allergens,
    ingredients: template.ingredients,
    masalaSachets: template.ingredients.filter((i) => i.isMasalaSachet).map((i) => i.name),
    sachets: [],
    recipeSteps: template.recipeSteps.map((s, idx) => ({
      stepNumber: idx + 1,
      title: s.title,
      instruction: s.instruction,
      timerSeconds: s.timerSeconds,
      tip: s.tip,
    })),
    reviews: [],
    salesByRegion: {},
  };
}

/**
 * Seeds city-specific kits if none exist yet.
 *
 * @param city   - The user's current city string (e.g. "Bengaluru")
 * @returns      - The newly created kits (empty array if seeds already existed)
 */
export async function seedKitsForCityIfNeeded(city: string): Promise<MealKit[]> {
  if (!city || !city.trim()) return [];
  if (hasCitySpecificKits(city)) return []; // already seeded

  const newKits: MealKit[] = CITY_KIT_TEMPLATES.map((template, idx) =>
    buildKitForCity(template, city, idx),
  );

  // Add to in-memory store first so the UI updates immediately
  newKits.forEach((kit) => addMealKit(kit));

  // Persist to Supabase in parallel (fire-and-forget; UI already has them)
  await Promise.allSettled(newKits.map((kit) => saveMealKitToSupabase(kit, true)));

  console.log(`[CitySeeder] Seeded ${newKits.length} kits for city "${city.trim()}"`);

  return newKits;
}
