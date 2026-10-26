export type DietTag = 'veg' | 'nonveg' | 'jain' | 'vegan' | 'keto' | 'gluten-free';
export type CuisineType =
  | 'North Indian'
  | 'South Indian'
  | 'Hyderabadi'
  | 'Punjabi'
  | 'Mughlai'
  | 'Coastal'
  | 'Gujarati'
  | 'Maharashtrian'
  | 'Indo-Chinese'
  | 'Italian'
  | 'Mexican'
  | 'American'
  | 'Continental'
  | 'European'
  | 'Mediterranean';

export type DishCategory =
  | 'Curries & Gravies'
  | 'Biryani & Rice'
  | 'Burgers & Sliders'
  | 'Pizzas'
  | 'Tacos'
  | 'Burritos & Bowls'
  | 'Pastas'
  | 'Street Food'
  | 'Soups & Stews';
export type SpiceLevel = 'Mild' | 'Medium' | 'Spicy' | 'Fiery';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Chef Special';
export type RegionHub = 'North' | 'South' | 'West' | 'East';

export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  timerSeconds?: number;
  imageUrl?: string;
  originalImageUrl?: string;
  tip?: string;
}

export interface IngredientItem {
  name: string;
  quantity: string;
  icon?: string;
  isMasalaSachet?: boolean;
}

export interface MasalaSpiceEntry {
  name: string;
  quantity: string;
}

export interface SachetItem {
  id: string;
  name: string;
  weight?: string;
  spices: MasalaSpiceEntry[];
}

export interface NutritionFacts {
  calories: number; // kcal per serving
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
}

export interface BuyerReview {
  id: string;
  userName: string;
  userCity: string;
  rating: number;
  comment: string;
  date: string;
  verifiedBuyer: boolean;
  photoUrl?: string;
  helpfulCount: number;
}

export interface MealKit {
  id: string;
  name: string;
  hindiName?: string;
  slug: string;
  tagline: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  price: number;
  originalPrice?: number;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  diet: DietTag;
  cuisine: CuisineType;
  dishCategory?: DishCategory;
  spiceLevel: SpiceLevel;
  difficulty: DifficultyLevel;
  dietaryTags: DietTag[];
  isTrending?: boolean;
  isChefSpecial?: boolean;
  availableRegions: RegionHub[];
  cities: string[]; // city-level targeting, e.g. ['Bengaluru', 'Mumbai']. Empty = all cities in the hub.
  availableStates?: string[]; // state-level targeting, e.g. ['Maharashtra', 'Karnataka']. Empty = all states.
  subRegions?: string[]; // sub-region ids, e.g. ['pune-koregaon-park', 'pune-baner']. Empty = all sub-regions in city.
  originCity?: string; // Origin / regional specialty city, e.g. 'Pune', 'Mumbai', 'Hyderabad'
  availableStorageCentres?: string[]; // Smaller fulfillment regions / storage centres, e.g. ['pune-city', 'pune-pcmc']
  isOutOfStock?: boolean;
  stockByRegion: Record<RegionHub, number>;
  // Shelf life & Freshness fields
  shelfLifeDays?: number; // Shelf life in days (e.g. 3, 4, 5, 7)
  shelfLife?: string; // Human readable description, e.g. "4 days (Keep refrigerated at 2°C - 5°C)"
  storageCondition?: string; // e.g. "Refrigerated at 2°C - 5°C" or "Cool & Dry"
  batchExpiryDate?: string; // Specific batch expiration date YYYY-MM-DD or ISO string
  rating: number;
  reviewCount: number;
  nutrition: NutritionFacts;
  allergens: string[];
  tags?: string[]; // Categorized tags: Diet, Cuisine, Dish Type, Region, Allergens
  ingredients: IngredientItem[];
  masalaSachets: string[];
  sachets?: SachetItem[];
  recipeSteps: RecipeStep[];
  instructionType?: 'steps' | 'video' | 'both';
  videoUrl?: string;
  reviews: BuyerReview[];
  salesByRegion: Record<string, number>; // state -> units sold
  // Chef submission fields
  chefId?: string; // UID of the chef who submitted this recipe (null for admin-created kits)
  chefName?: string; // Display name of the submitting chef
  submissionStatus?: 'draft' | 'pending_review' | 'published' | 'rejected'; // Review lifecycle
  submittedAt?: string; // ISO timestamp when chef submitted for review
  reviewedAt?: string; // ISO timestamp when admin acted on the submission
  reviewNotes?: string; // Admin feedback to the chef (e.g. reason for rejection)
  createdAt?: string; // ISO timestamp when meal kit was created
  updatedAt?: string; // ISO timestamp when meal kit was last updated
}

export const COMMON_ALLERGENS = [
  'Dairy',
  'Gluten',
  'Tree Nuts',
  'Peanuts',
  'Mustard',
  'Sesame',
  'Soy',
  'Shellfish',
  'Eggs',
] as const;

export interface CategorizedTag {
  category: 'diet' | 'cuisine' | 'dishType' | 'region' | 'allergy' | 'specialty';
  label: string;
  prefix: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
}

export function compileMealKitTags(kit: Partial<MealKit>): string[] {
  const tags: string[] = [];

  // 1. Diet Type Tag
  if (kit.diet) {
    const dietLabel =
      kit.diet === 'veg' ? 'Veg' : kit.diet === 'nonveg' ? 'Non-Veg' : kit.diet.toUpperCase();
    tags.push(`Diet: ${dietLabel}`);
  }

  // 2. Cuisine Type Tag
  if (kit.cuisine) {
    tags.push(`Cuisine: ${kit.cuisine}`);
  }

  // 3. Dish Type Tag
  const dishType = kit.dishCategory || 'Curries & Gravies';
  tags.push(`Dish: ${dishType}`);

  // 4. Region Tag (State, Cities, Sub-regions, Storage Centres)
  if (kit.availableStates && kit.availableStates.length > 0) {
    for (const st of kit.availableStates) {
      tags.push(`State: ${st}`);
    }
  }
  if (kit.subRegions && kit.subRegions.length > 0) {
    for (const sr of kit.subRegions) {
      tags.push(`SubRegion: ${sr}`);
    }
  } else if (kit.availableStorageCentres && kit.availableStorageCentres.length > 0) {
    for (const sc of kit.availableStorageCentres) {
      tags.push(`Region: ${sc}`);
    }
  } else if (kit.availableRegions && kit.availableRegions.length > 0) {
    if (kit.availableRegions.length >= 4) {
      tags.push('Region: Pan-India');
    } else {
      tags.push(`Region: ${kit.availableRegions.join(', ')}`);
    }
  }

  // 5. Allergens Tag
  if (kit.allergens && kit.allergens.length > 0) {
    for (const allergen of kit.allergens) {
      tags.push(`Allergy: ${allergen}`);
    }
  } else {
    tags.push('Allergy: None Reported');
  }

  // 6. Additional Dietary / Specialty Tags
  if (kit.dietaryTags) {
    for (const dt of kit.dietaryTags) {
      if (dt !== kit.diet) {
        tags.push(dt.toUpperCase());
      }
    }
  }

  if (kit.shelfLifeDays) {
    tags.push(`Shelf Life: ${kit.shelfLifeDays} Days`);
  }

  if (kit.isTrending) {
    tags.push('Trending');
  }

  return tags;
}

export function parseCategorizedTags(tags?: string[]): CategorizedTag[] {
  if (!tags || tags.length === 0) return [];
  return tags.map((t) => {
    if (t.startsWith('Diet:')) {
      const isVeg = t.toLowerCase().includes('veg') && !t.toLowerCase().includes('non-veg');
      const isNonVeg = t.toLowerCase().includes('non-veg');
      return {
        category: 'diet',
        prefix: 'Diet',
        label: t,
        variant: isVeg ? 'success' : isNonVeg ? 'danger' : 'accent',
      };
    }
    if (t.startsWith('Cuisine:')) {
      return {
        category: 'cuisine',
        prefix: 'Cuisine',
        label: t,
        variant: 'accent',
      };
    }
    if (t.startsWith('Dish:')) {
      return {
        category: 'dishType',
        prefix: 'Dish',
        label: t,
        variant: 'info',
      };
    }
    if (t.startsWith('Region:')) {
      return {
        category: 'region',
        prefix: 'Region',
        label: t,
        variant: 'neutral',
      };
    }
    if (t.startsWith('Allergy:')) {
      const isNone = t.toLowerCase().includes('none');
      return {
        category: 'allergy',
        prefix: 'Allergy',
        label: t,
        variant: isNone ? 'neutral' : 'warning',
      };
    }
    // Strip any legacy 'Tag: ' prefix from older data
    const cleanLabel = t.replace(/^Tag:\s*/i, '');
    return {
      category: 'specialty',
      prefix: 'Tag',
      label: cleanLabel,
      variant: cleanLabel.toLowerCase() === 'trending' ? 'warning' : 'accent',
    };
  });
}

const BASE_INITIAL_MEAL_KITS: MealKit[] = [
  {
    id: 'e2e-kit-butter-chicken',
    name: 'Delhi Style Butter Chicken Kit',
    hindiName: 'दिल्ली बटर चिकन',
    slug: 'delhi-style-butter-chicken',
    tagline: 'Rich tomato gravy with velvety spiced butter sauce',
    description:
      'Authentic Old Delhi style makhani gravy with marinated tender chicken and freshly ground garam masala sachets.',
    heroImage:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    ],
    price: 349,
    originalPrice: 399,
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    diet: 'nonveg',
    cuisine: 'North Indian',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['nonveg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 50, South: 50, West: 50, East: 50 },
    salesByRegion: { North: 0, South: 0, West: 0, East: 0 },
    rating: 4.9,
    reviewCount: 120,
    nutrition: {
      calories: 520,
      protein: 28,
      carbs: 18,
      fat: 32,
      fiber: 3,
    },
    allergens: ['Dairy (Butter & Cream)', 'Tree Nuts (Cashew)'],
    ingredients: [
      { name: 'Marinated Tender Chicken', quantity: '350g' },
      { name: 'Makhani Tomato Puree', quantity: '200g' },
      { name: 'Cashew Butter Cream', quantity: '40g' },
      { name: 'Kashmiri Mirch & Garam Masala', quantity: '10g', isMasalaSachet: true },
      { name: 'Kasuri Methi Fragrance Pack', quantity: '5g', isMasalaSachet: true },
    ],
    masalaSachets: ['Old Delhi Makhani Spices', 'Kasuri Methi Aroma Finish'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sear Chicken',
        instruction: 'Sear pre-marinated chicken pieces in butter until golden.',
        timerSeconds: 300,
      },
      {
        stepNumber: 2,
        title: 'Simmer Makhani Gravy',
        instruction: 'Add tomato puree, cashew butter cream, and simmer with spice sachets.',
        timerSeconds: 400,
      },
    ],
    reviews: [],
  },
  {
    id: 'e2e-kit-paneer-tikka',
    name: 'Amritsari Paneer Tikka Kit',
    hindiName: 'अमृतसरी पनीर टिक्का',
    slug: 'amritsari-paneer-tikka',
    tagline: 'Smoky grilled paneer cubes with mint chutney marinade',
    description:
      'Fresh malai paneer cubes marinated in hung curd, carom seeds, mustard oil and kasuri methi.',
    heroImage:
      'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    ],
    price: 299,
    originalPrice: 349,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Punjabi',
    dishCategory: 'Street Food',
    spiceLevel: 'Spicy',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 50, South: 50, West: 50, East: 50 },
    salesByRegion: { North: 0, South: 0, West: 0, East: 0 },
    rating: 4.8,
    reviewCount: 88,
    nutrition: {
      calories: 380,
      protein: 20,
      carbs: 14,
      fat: 26,
      fiber: 4,
    },
    allergens: ['Dairy (Paneer)'],
    ingredients: [
      { name: 'Fresh Malai Paneer Cubes', quantity: '250g' },
      { name: 'Tikka Marinade Hung Curd', quantity: '100g' },
      { name: 'Amritsari Tikka Masala', quantity: '15g', isMasalaSachet: true },
      { name: 'Mint Chutney Sachet', quantity: '40g', isMasalaSachet: true },
    ],
    masalaSachets: ['Amritsari Tikka Sachet', 'Chaat Finishing Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Marinate & Skewer',
        instruction: 'Toss paneer cubes in tikka marinade pouch and rest for 5 minutes.',
        timerSeconds: 300,
      },
      {
        stepNumber: 2,
        title: 'Pan Roast or Grill',
        instruction: 'Roast on high heat with a brush of butter until charred on edges.',
        timerSeconds: 360,
      },
    ],
    reviews: [],
  },
  {
    id: 'kit-101',
    name: 'Paneer Butter Masala Kit',
    hindiName: 'शाही पनीर मक्खन मसाला',
    slug: 'paneer-butter-masala',
    tagline: 'Melt-in-mouth malai paneer with rich cashew-tomato velvet gravy',
    description:
      'Experience restaurant-grade Shahi Paneer Butter Masala in just 20 minutes! Includes artisanal paneer cubes vacuum-packed fresh, vine-ripened tomato purée, and 3 signature pre-measured masala sachets.',
    heroImage:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 299,
    originalPrice: 349,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'North Indian',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'gluten-free', 'jain'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 45, South: 38, West: 50, East: 22 },
    rating: 4.8,
    reviewCount: 342,
    nutrition: {
      calories: 420,
      protein: 18,
      carbs: 22,
      fat: 28,
      fiber: 4,
    },
    allergens: ['Dairy (Paneer & Butter)', 'Tree Nuts (Cashew)'],
    ingredients: [
      { name: 'Paneer Cubes', quantity: '250g' },
      { name: 'Tomato Puree', quantity: '180g' },
      { name: 'Cashew & Melon Seed Paste', quantity: '45g' },
      { name: 'White Butter', quantity: '20g' },
      { name: 'Cooking Cream', quantity: '10g' },
      {
        name: 'Whole Khada Masala',
        quantity: '8g',
        isMasalaSachet: true,
      },
      {
        name: 'Shahi Gravy Premix',
        quantity: '18g',
        isMasalaSachet: true,
      },
      {
        name: 'Kasuri Methi & Garam Masala',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: [
      'Whole Khada Masala Pot',
      'Shahi Gravy Premix',
      'Roasted Kasuri Methi & Shahi Garam Masala',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Temper Whole Spices in Butter',
        instruction:
          'Melt the pre-portioned White Butter (20g) in a wide non-stick pan over medium heat. Empty Sachet 1: Whole Khada Masala (Cardamom, Clove, Cinnamon, Bayleaf) and sauté for 45 seconds until fragrant crackles release.',
        timerSeconds: 45,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Keep the flame on medium to avoid scorching the whole green cardamoms.',
      },
      {
        stepNumber: 2,
        title: 'Sauté Tomato Puree & Cashew Paste',
        instruction:
          'Pour the fresh Tomato Puree Pouch (180g) and Cashew & Melon Seed Paste (45g) into the pan. Cook for 4 minutes, stirring continuously until the butter gently glistens at the edges.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Stirring continuously keeps the velvety cashew paste from catching at the bottom.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Shahi Gravy Premix',
        instruction:
          'Add 1/2 cup warm water along with Sachet 2: Shahi Gravy Premix. Stir thoroughly to dissolve any lumps and bring to a gentle rolling simmer for 3 minutes.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Add a splash more warm water if you prefer a lighter gravy consistency.',
      },
      {
        stepNumber: 4,
        title: 'Fold in Paneer & Aroma Finish',
        instruction:
          'Gently slide in the Fresh Malai Paneer Cubes (250g) and drizzle the Fresh Cream (10g). Simmer for 3 minutes. Finish by crushing Sachet 3: Roasted Kasuri Methi & Garam Masala Aroma Finish between your palms and sprinkling over the hot gravy.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Avoid vigorous stirring once paneer is added so the tender cubes remain intact.',
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Pooja Hegde',
        userCity: 'Bengaluru',
        rating: 5,
        comment:
          'Tastes better than any fine dining restaurant! The spice sachets smelled divine right out of the pouch.',
        date: '2 days ago',
        verifiedBuyer: true,
        helpfulCount: 28,
      },
      {
        id: 'rev-2',
        userName: 'Karan Malhotra',
        userCity: 'Mumbai',
        rating: 5,
        comment:
          'My family finished the entire pot in 10 minutes. Step 4 aroma finish was unbelievable.',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 19,
      },
    ],
    salesByRegion: {
      Maharashtra: 1240,
      Karnataka: 1480,
      'Delhi NCR': 980,
      Gujarat: 760,
      'Tamil Nadu': 540,
    },
  },
  {
    id: 'kit-102',
    name: 'Hyderabadi Dum Chicken Biryani Kit',
    hindiName: 'हैदराबादी दम चिकन बिरयानी',
    slug: 'hyderabadi-chicken-biryani',
    tagline: 'Pre-marinated tender chicken, 2-year aged basmati & signature 4-sachet pot',
    description:
      'Authentic Nizam-style Kachchi Dum Biryani made effortless. Features farm-fresh marinated chicken pieces, aged royal long-grain basmati rice, saffron water essence, and fried barista onions.',
    heroImage:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 399,
    originalPrice: 479,
    servings: 3,
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    diet: 'nonveg',
    cuisine: 'Hyderabadi',
    dishCategory: 'Biryani & Rice',
    spiceLevel: 'Spicy',
    difficulty: 'Medium',
    dietaryTags: ['nonveg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 30, South: 65, West: 42, East: 18 },
    rating: 4.9,
    reviewCount: 512,
    nutrition: {
      calories: 580,
      protein: 34,
      carbs: 62,
      fat: 20,
      fiber: 5,
    },
    allergens: ['Dairy (Yogurt Marinade & Ghee)'],
    ingredients: [
      { name: 'Chicken Curry Cut', quantity: '450g' },
      { name: 'Basmati Rice', quantity: '300g' },
      { name: 'Crispy Onions', quantity: '60g' },
      { name: 'Desi Ghee', quantity: '20ml' },
      { name: 'Saffron', quantity: '5ml' },
      {
        name: 'Biryani Marinade Booster',
        quantity: '12g',
        isMasalaSachet: true,
      },
      { name: 'Parboiling Whole Spices', quantity: '10g', isMasalaSachet: true },
      {
        name: 'Dum Mint Spice Blend',
        quantity: '8g',
        isMasalaSachet: true,
      },
      { name: 'Rose & Kewra Water', quantity: '5ml', isMasalaSachet: true },
    ],
    masalaSachets: [
      'Biryani Marinade Booster',
      'Rice Parboiling Whole Spice Pot',
      'Dum Layering Potpourri',
      'Rose & Kewra Aroma Mist',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Parboil the Aged Basmati Rice',
        instruction:
          'Bring 4 cups of water to a rolling boil with 1 tsp salt. Add the pre-soaked Aged Basmati Rice (250g) and parboil for exactly 5 minutes until 70% cooked (grain breaks into 3 pieces). Drain completely.',
        timerSeconds: 300,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not overcook the rice during parboiling, as it finishes cooking during the dum stage.',
      },
      {
        stepNumber: 2,
        title: 'Layer Marinated Chicken in Handi',
        instruction:
          'In a heavy-bottom handi or pot, heat 1 tbsp Desi Ghee. Layer the Marinated Farm Chicken (350g) evenly across the base. Sprinkle half of Sachet 1: Hyderabadi Khada Masala and Sachet 2: Royal Dum Masala over the chicken.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Spreading the chicken in a single layer ensures even cooking under dum.',
      },
      {
        stepNumber: 3,
        title: 'Layer Rice, Saffron Milk & Desi Ghee',
        instruction:
          'Spread the parboiled basmati rice evenly over the chicken. Drizzle Sachet 3: Kashmiri Saffron Milk & Kewra Essence along with Golden Fried Onions (Birista, 40g) and remaining Desi Ghee (25g).',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        tip: 'Drizzle the saffron milk in concentric circles for picturesque contrasting white and golden rice grains.',
      },
      {
        stepNumber: 4,
        title: 'Seal & Dum Cook to Perfection',
        instruction:
          'Cover the handi tightly with the provided heatproof foil or tight lid. Cook on high flame for 4 minutes, then lower heat to minimum (or place over a tawa) and dum cook for 15 minutes. Rest 5 minutes before opening.',
        timerSeconds: 900,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Letting the biryani rest for 5 minutes after turning off heat redistributes the aromatic juices.',
      },
    ],
    reviews: [
      {
        id: 'rev-3',
        userName: 'Zeeshan Ali',
        userCity: 'Hyderabad',
        rating: 5,
        comment:
          'Born and raised in Hyderabad, I was skeptical. But this kit hit every authentic note. The rice grains stayed separate and fragrant!',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 45,
      },
    ],
    salesByRegion: {
      Karnataka: 1680,
      Telangana: 2200,
      Maharashtra: 1350,
      'Delhi NCR': 1100,
      'Tamil Nadu': 890,
    },
  },
  {
    id: 'kit-103',
    name: 'Slow-Brew Dal Makhani Kit',
    hindiName: 'धीमी आंच दाल मखनी',
    slug: 'slow-brew-dal-makhani',
    tagline: '16-hour pre-soaked black urad, white butter richness & smoked clove aroma',
    description:
      'Rich, velvety, authentic Punjabi Dal Makhani. We pre-soak premium black lentils and rajma so you can achieve the legendary dhaba-style creamy texture in just 25 minutes on your stovetop.',
    heroImage:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 249,
    originalPrice: 299,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    diet: 'veg',
    cuisine: 'Punjabi',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'gluten-free', 'jain'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 60, South: 25, West: 40, East: 30 },
    rating: 4.7,
    reviewCount: 220,
    nutrition: {
      calories: 380,
      protein: 16,
      carbs: 45,
      fat: 16,
      fiber: 9,
    },
    allergens: ['Dairy (Butter & Cream)'],
    ingredients: [
      { name: 'Boiled Urad Dal', quantity: '280g' },
      { name: 'Boiled Rajma', quantity: '70g' },
      { name: 'White Butter', quantity: '25g' },
      { name: 'Cooking Cream', quantity: '15g' },
      { name: 'Tomato Garlic Base', quantity: '120g' },
      {
        name: 'Kashmiri Chilli & Degi Mirch Premix',
        quantity: '10g',
        isMasalaSachet: true,
      },
      {
        name: 'Clove & Nutmeg Spice Dust',
        quantity: '6g',
        isMasalaSachet: true,
      },
      { name: 'Kasuri Methi', quantity: '4g', isMasalaSachet: true },
    ],
    masalaSachets: [
      'Smoked Kashmiri Mirch Premix',
      'Clove & Nutmeg Slow-Roast Dust',
      'Sun-Dried Kasuri Methi',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Aromatics in White Butter',
        instruction:
          'Melt half of the Artisanal White Butter (25g) in a heavy pan. Empty Sachet 1: Ginger-Garlic Confit & Cumin Sachet and sauté on medium flame for 1 minute until fragrant.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Fresh ginger-garlic paste should sizzle gently without turning brown.',
      },
      {
        stepNumber: 2,
        title: 'Add Slow-Cooked Lentils & Tomato Puree',
        instruction:
          'Pour the slow-cooked Black Urad Lentils & Rajma Pouch (300g) along with the Smoked Tomato Puree (120g). Mash 30% of the lentils using the back of a ladle to release natural starch.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Mashing a small portion of the black lentils creates that signature velvety restaurant texture.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Makhani Spice Blend & Butter',
        instruction:
          'Stir in 1/2 cup warm water, Sachet 2: Slow-Brew Makhani Spice Dust, and remaining White Butter (25g). Simmer on low heat for 12 minutes, stirring occasionally as the gravy thickens.',
        timerSeconds: 720,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Dal Makhani loves slow simmering on gentle heat—the longer it simmers, the creamier it gets.',
      },
      {
        stepNumber: 4,
        title: 'Finish with Dairy Cream & Kasuri Methi',
        instruction:
          'Swirl in the Fresh Dairy Cream (30ml) and sprinkle Sachet 3: Roasted Kasuri Methi & Green Cardamom. Simmer for 1 minute and serve hot with garlic naan or steamed basmati.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Reserve a spoonful of fresh cream to drizzle on top right before serving.',
      },
    ],
    reviews: [
      {
        id: 'rev-4',
        userName: 'Aman Deep',
        userCity: 'Chandigarh',
        rating: 5,
        comment: 'Closest you can get to authentic Amritsari dal without cooking for 12 hours!',
        date: '4 days ago',
        verifiedBuyer: true,
        helpfulCount: 16,
      },
    ],
    salesByRegion: {
      'Delhi NCR': 1850,
      Punjab: 1420,
      Maharashtra: 680,
      Karnataka: 510,
    },
  },
  {
    id: 'kit-104',
    name: 'Coastal Prawns Ghee Roast Kit',
    hindiName: 'तटीय झींगा घी रोस्ट',
    slug: 'coastal-prawns-ghee-roast',
    tagline: 'Fresh de-veined tiger prawns with roasted Byadgi chili & tangy tamarind masala',
    description:
      'Mangalorean culinary royalty in your kitchen. Juicy ocean-fresh tiger prawns pre-cleaned and de-veined, cooked in generous artisanal desi ghee with roasted Byadgi & Guntur masala paste.',
    heroImage:
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 499,
    originalPrice: 569,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    diet: 'nonveg',
    cuisine: 'Coastal',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Fiery',
    difficulty: 'Chef Special',
    dietaryTags: ['nonveg', 'keto', 'gluten-free'],
    isTrending: true,
    availableRegions: ['South', 'West'],
    cities: [],
    stockByRegion: { North: 0, South: 45, West: 35, East: 0 },
    rating: 4.9,
    reviewCount: 184,
    nutrition: {
      calories: 340,
      protein: 38,
      carbs: 8,
      fat: 18,
      fiber: 2,
    },
    allergens: ['Crustacean Shellfish (Prawns)', 'Dairy (Desi Ghee)'],
    ingredients: [
      { name: 'Tiger Prawns', quantity: '300g' },
      { name: 'Desi Ghee', quantity: '50ml' },
      { name: 'Byadgi Chili Paste', quantity: '80g' },
      { name: 'Tamarind & Jaggery Extract', quantity: '25g' },
      { name: 'Curry Leaves', quantity: '10 leaves' },
      {
        name: 'Ghee Roast Spice Powder',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Peppercorn & Stone Flower Masala',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Ghee Roast Cumin-Fennel Spice Blend', 'Peppercorn & Kalpasi Finishing Masala'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sear Coastal Prawns in Desi Ghee',
        instruction:
          'Heat 1 tbsp Pure Desi Ghee (from the 40g ghee pouch) in a heavy tawa or skillet. Sear the Fresh Cleaned Prawns (250g) on high heat for 90 seconds until they turn pink and firm. Remove and set aside.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not overcook prawns in step 1; they will finish cooking in the spicy ghee roast paste.',
      },
      {
        stepNumber: 2,
        title: 'Roast Kundapur Byadgi Masala Paste',
        instruction:
          'In the same pan with remaining Desi Ghee, add Sachet 1: Kundapur Stone-Ground Byadgi Chilli Paste (50g) and minced garlic. Roast over medium flame for 4 minutes until ghee separates.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Byadgi chillies provide brilliant ruby red color and deep smoky aroma with mild, sweet heat.',
      },
      {
        stepNumber: 3,
        title: 'Glaze with Tamarind & Spice Sachet',
        instruction:
          'Stir in Sachet 2: Ghee Roast Finishing Spices (roasted coriander, cumin, fennel, black pepper) and the Tangy Tamarind Glaze Pouch (20g). Sauté for 2 minutes into a glossy masala.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Tamarind balances the rich ghee and intensifies the spice profile.',
      },
      {
        stepNumber: 4,
        title: 'Toss Prawns in Fiery Masala & Curry Leaves',
        instruction:
          'Return the seared prawns to the pan along with fresh coastal curry leaves. Toss vigorously on high heat for 2 minutes until every prawn is coated in a thick, roasted ghee glaze.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve immediately with soft neer dosas or warm parottas.',
      },
    ],
    reviews: [
      {
        id: 'rev-5',
        userName: 'Siddharth Pai',
        userCity: 'Mangaluru',
        rating: 5,
        comment:
          'Authentic Kudla taste right in my kitchen. The Byadgi chilli aroma filled my whole apartment!',
        date: '5 days ago',
        verifiedBuyer: true,
        helpfulCount: 31,
      },
    ],
    salesByRegion: {
      Karnataka: 1540,
      Maharashtra: 980,
      Goa: 420,
    },
  },
  {
    id: 'kit-105',
    name: 'Kolkata Kathi Paneer Roll Kit',
    hindiName: 'कोलकाता काठी पनीर रोल',
    slug: 'kolkata-kathi-paneer-roll',
    tagline: 'Flaky handmade laccha parathas, tandoori marinated paneer & tangy kasundi dip',
    description:
      'Iconic Park Street street-food right at home. 4 layered flaky laccha parathas, spiced cottage cheese strips, pickled red onion salad, and signature mustard-kasundi drizzle.',
    heroImage:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 279,
    originalPrice: 329,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    diet: 'veg',
    cuisine: 'North Indian',
    dishCategory: 'Street Food',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 30, West: 25, East: 55 },
    rating: 4.6,
    reviewCount: 165,
    nutrition: {
      calories: 460,
      protein: 17,
      carbs: 52,
      fat: 21,
      fiber: 4,
    },
    allergens: ['Wheat / Gluten', 'Dairy (Paneer)'],
    ingredients: [
      { name: 'Paratha Dough Sheets', quantity: '4 pcs' },
      { name: 'Paneer Batons', quantity: '220g' },
      { name: 'Pickled Onion Salad', quantity: '80g' },
      { name: 'Kasundi Mustard Dip', quantity: '40g' },
      {
        name: 'Chaat Masala & Cumin Dust',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Kolkata Street Chaat & Bhuna Jeera Spice Blend'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toss Paneer with Kolkata Chaat Masala',
        instruction:
          'Heat 1 tsp oil in a cast iron skillet. Add Diced Paneer Cubes (200g) and Sliced Bell Peppers & Onions (80g). Sprinkle Sachet 1: Kolkata Street Style Chaat Masala & Kasundi Mustard Blend and toss over high heat for 3 minutes until lightly charred.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'A quick toss on high heat gives that authentic street-side smoky tawa flavor.',
      },
      {
        stepNumber: 2,
        title: 'Crisp the Flaky Layered Parathas',
        instruction:
          'Place the Pre-Rolled Flaky Parathas (2 pcs) on a hot tawa. Drizzle with 1 tsp ghee or butter per side and toast for 2 minutes on each side until blistered, golden, and flaky.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Gently scrunch the hot paratha between your hands to fluff up the flaky layers.',
      },
      {
        stepNumber: 3,
        title: 'Assemble with Chutney & Roll',
        instruction:
          'Spread Sachet 2: Tangy Kolkata Mint-Coriander Chutney across each paratha. Lay the spiced paneer filling down the center, top with Pickled Red Onions and a squeeze of fresh lemon, then roll tightly into parchment paper.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Rolling firmly in parchment paper makes it easy to eat without any drips.',
      },
    ],
    reviews: [
      {
        id: 'rev-6',
        userName: 'Rina Mukherjee',
        userCity: 'Kolkata',
        rating: 5,
        comment: 'Tastes identical to Nizam’s on New Market. Parathas were super flaky!',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 14,
      },
    ],
    salesByRegion: {
      'West Bengal': 1420,
      'Delhi NCR': 810,
      Maharashtra: 620,
    },
  },
  {
    id: 'kit-106',
    name: 'Keto Cauliflower Tikka Masala Kit',
    hindiName: 'कीटो गोभी टिक्का मसाला',
    slug: 'keto-cauliflower-tikka-masala',
    tagline: 'Charred spiced florets in rich almond-coconut cream gravy (under 9g net carbs)',
    description:
      'Ultra low-carb gourmet Indian comfort food. Fresh crisp cauliflower florets pre-tossed in smoked paprika tikka marinade, simmered with silky almond milk cream sauce.',
    heroImage:
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 259,
    originalPrice: 319,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    diet: 'vegan',
    cuisine: 'North Indian',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'keto', 'gluten-free'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 45, West: 40, East: 20 },
    rating: 4.7,
    reviewCount: 94,
    nutrition: {
      calories: 260,
      protein: 8,
      carbs: 9,
      fat: 22,
      fiber: 6,
    },
    allergens: ['Tree Nuts (Almond)'],
    ingredients: [
      { name: 'Cauliflower Florets', quantity: '300g' },
      { name: 'Almond Coconut Cream Base', quantity: '150ml' },
      { name: 'Tikka Marinade Paste', quantity: '50g' },
      {
        name: 'Garam Masala & Fenugreek Blend',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Keto Tikka Roasted Spice Blend'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Roast Spiced Cauliflower Florets',
        instruction:
          'Toss Fresh Cauliflower Florets (300g) with 1 tbsp olive oil and Sachet 1: Tandoori Tikka Marinade Powder (roasted cumin, Kashmiri mirch, dry mango powder). Roast in a preheated oven at 200°C or pan-sear on medium-high heat for 7 minutes until edges char golden.',
        timerSeconds: 420,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Golden charred edges on the florets mimic the intense flavor of a clay tandoor oven.',
      },
      {
        stepNumber: 2,
        title: 'Simmer Keto Tikka Masala Sauce',
        instruction:
          'In a saucepan, heat 1 tsp butter. Add Low-Carb Tomato Confit Puree (120g), Sachet 2: Tikka Masala Gravy Seasoning, and Coconut Cream (60ml). Simmer on low heat for 5 minutes until creamy and fragrant.',
        timerSeconds: 300,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Coconut cream keeps this recipe 100% keto-compliant while providing luxurious richness.',
      },
      {
        stepNumber: 3,
        title: 'Fold Florets & Kasuri Methi Garnish',
        instruction:
          'Fold the roasted cauliflower florets into the simmering tikka gravy. Cook for 2 minutes to let flavors infuse. Sprinkle Sachet 3: Toasted Kasuri Methi & Ginger Juliennes and serve hot.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not overcook the florets in the sauce so they retain a satisfying tender-crisp bite.',
      },
    ],
    reviews: [
      {
        id: 'rev-7',
        userName: 'Vikram Joshi',
        userCity: 'Pune',
        rating: 5,
        comment:
          'Finding genuine low-carb Indian food that actually tastes rich is impossible. This kit is a savior!',
        date: '2 weeks ago',
        verifiedBuyer: true,
        helpfulCount: 22,
      },
    ],
    salesByRegion: {
      Maharashtra: 890,
      Karnataka: 720,
      'Delhi NCR': 650,
    },
  },
  {
    id: 'kit-201',
    name: 'Truffle Mushroom Smash Burger Kit',
    hindiName: 'ट्रफल मशरूम स्मैश बर्गर',
    slug: 'truffle-mushroom-smash-burger',
    tagline:
      'Artisanal brioche buns, smashed portobello patties, melted English cheddar & black truffle aioli',
    description:
      'Gourmet diner quality burgers at home in 15 minutes! Includes freshly baked buttery brioche buns, pre-seasoned mushroom smash patties, aged cheddar slices, slow-caramelized onion jam, and artisanal black truffle garlic aioli.',
    heroImage:
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 349,
    originalPrice: 419,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    diet: 'veg',
    cuisine: 'American',
    dishCategory: 'Burgers & Sliders',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 45, South: 55, West: 60, East: 30 },
    rating: 4.9,
    reviewCount: 278,
    nutrition: {
      calories: 520,
      protein: 22,
      carbs: 48,
      fat: 26,
      fiber: 5,
    },
    allergens: ['Gluten / Wheat (Brioche)', 'Dairy (Cheddar & Butter)'],
    ingredients: [
      { name: 'Brioche Buns', quantity: '2 buns' },
      { name: 'Mushroom Black Bean Patties', quantity: '220g' },
      { name: 'White Cheddar Slices', quantity: '2 slices' },
      { name: 'Caramelized Onion Jam', quantity: '40g' },
      {
        name: 'Truffle Garlic Aioli',
        quantity: '35g',
        isMasalaSachet: true,
      },
      {
        name: 'Smoked Paprika & Sea Salt Dust',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Black Truffle Garlic Aioli Pouch', 'Smoked Paprika & Sea Salt Finishing Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toast the Brioche Buns in Butter',
        instruction:
          'Halve the Artisanal Brioche Buns (2 pcs). Spread with the provided Herb Butter (15g) and toast cut-side down in a hot skillet for 2 minutes until golden brown and crisp.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'A crisp toasted surface prevents the bun from getting soggy when aioli is spread.',
      },
      {
        stepNumber: 2,
        title: 'Sear & Hard Smash the Patties',
        instruction:
          'Heat a heavy cast iron skillet until smoking hot. Place the Plant/Gourmet Mushroom Burger Patties (2x 110g) in the pan. Sprinkle Sachet 1: Smoked Sea Salt & Cracked Pepper Blend and smash flat using a firm spatula. Sear for 2.5 minutes until a deep brown caramelized crust forms.',
        timerSeconds: 150,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Smash firmly only during the first 30 seconds to lock in natural savory juices.',
      },
      {
        stepNumber: 3,
        title: 'Melt Swiss Cheese & Sauté Mushrooms',
        instruction:
          'Flip the patties. Immediately top each patty with Sautéed Portobello Mushrooms (60g) and Aged Swiss Cheese Slices (2 pcs). Cover with a pan lid for 1 minute to melt the cheese completely.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Covering with a lid traps steam and melts the cheese rapidly without burning the crust.',
      },
      {
        stepNumber: 4,
        title: 'Assemble with Black Truffle Aioli',
        instruction:
          'Generously spread Sachet 2: Artisanal Black Truffle Aioli on both bottom and top buns. Lay down fresh arugula leaves, stack the mushroom-cheese smash patty, crown with top bun and enjoy immediately.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve with crisp shoestring fries or sweet potato wedges.',
      },
    ],
    reviews: [
      {
        id: 'rev-201',
        userName: 'Ayesha Khan',
        userCity: 'Bengaluru',
        rating: 5,
        comment:
          'Tastes like a ₹700 gourmet cafe burger. The truffle aioli alone is worth the entire kit!',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 38,
      },
    ],
    salesByRegion: {
      Karnataka: 1420,
      Maharashtra: 1190,
      'Delhi NCR': 940,
    },
  },
  {
    id: 'kit-202',
    name: 'Artisanal Sourdough Burrata Pizza Kit',
    hindiName: 'कारीगरी बुर्राटा पिज़्ज़ा',
    slug: 'sourdough-burrata-pizza',
    tagline:
      '48-hour cold fermented dough, crushed San Marzano sugo, fresh burrata & Genovese basil',
    description:
      'Neapolitan pizzeria mastery on your home baking tray or tawa! Includes 2 slow-fermented sourdough pizza dough balls, authentic Italian tomato sugo, fresh Fior di Latte mozzarella, whole creamy burrata, and garlic herb oil.',
    heroImage:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 389,
    originalPrice: 469,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 12,
    diet: 'veg',
    cuisine: 'Italian',
    dishCategory: 'Pizzas',
    spiceLevel: 'Mild',
    difficulty: 'Medium',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 60, West: 50, East: 25 },
    rating: 4.8,
    reviewCount: 310,
    nutrition: {
      calories: 490,
      protein: 20,
      carbs: 58,
      fat: 19,
      fiber: 4,
    },
    allergens: ['Wheat / Gluten (Sourdough)', 'Dairy (Burrata & Mozzarella)'],
    ingredients: [
      { name: 'Sourdough Dough Balls', quantity: '360g' },
      { name: 'Tomato Sugo', quantity: '140g' },
      { name: 'Diced Mozzarella', quantity: '120g' },
      { name: 'Burrata', quantity: '100g' },
      { name: 'Basil Leaves', quantity: '8 leaves' },
      {
        name: 'Tuscan Oregano & Chili Flakes',
        quantity: '8g',
        isMasalaSachet: true,
      },
      {
        name: 'Garlic Olive Oil',
        quantity: '20ml',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: [
      'Tuscan Oregano & Chili Flake Crust Seasoning',
      'Extra Virgin Garlic Infused Olive Oil',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Stretch the Fermented Sourdough Crust',
        instruction:
          'Dust your kitchen counter with the Semolina Dusting Flour (30g). Gently press and stretch the 48-Hour Fermented Sourdough Dough Ball (260g) from the center outward into an 11-inch disc, preserving an airy outer crust rim.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not use a rolling pin; using your fingers preserves the fermented airy bubbles in the cornicione.',
      },
      {
        stepNumber: 2,
        title: 'Ladle San Marzano Sauce & Mozzarella',
        instruction:
          'Ladle the crushed San Marzano Tomato Sauce Pouch (90g) in spiral motions over the dough. Scatter Sachet 1: Italian Oregano & Sea Salt Blend followed by Shredded Low-Moisture Mozzarella (100g).',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Leave a 1/2-inch border bare around the edges for that dramatic artisanal blistered puff.',
      },
      {
        stepNumber: 3,
        title: 'Bake Until Blistered & Bubbly',
        instruction:
          'Slide pizza onto a preheated baking steel or heavy baking tray in an oven preheated to maximum heat (240°C-250°C). Bake for 7-8 minutes until the crust is blistered and the cheese is melted and bubbling.',
        timerSeconds: 480,
        imageUrl:
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        tip: 'Bake on the highest oven rack position or use broil for the final 2 minutes for authentic wood-fired char marks.',
      },
      {
        stepNumber: 4,
        title: 'Tear Fresh Burrata & Basil Finish',
        instruction:
          'Remove the pizza from the oven. Tear the Fresh Creamy Burrata Ball (125g) over the center so the rich stracciatella flows across the slices. Scatter Fresh Genovese Basil Leaves and drizzle with Extra Virgin Olive Oil.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Always add fresh burrata after baking so it stays creamy and cool against the piping hot crust.',
      },
    ],
    reviews: [
      {
        id: 'rev-202',
        userName: 'Rohan Deshmukh',
        userCity: 'Mumbai',
        rating: 5,
        comment:
          'The crust bubbles up like a real wood-fired oven pizza! Cutting into the cold burrata on hot pizza was pure heaven.',
        date: '4 days ago',
        verifiedBuyer: true,
        helpfulCount: 42,
      },
    ],
    salesByRegion: {
      Maharashtra: 1650,
      Karnataka: 1380,
      'Delhi NCR': 1120,
    },
  },
  {
    id: 'kit-203',
    name: 'Baja Crispy Avocado & Black Bean Tacos Kit',
    hindiName: 'बाहा एवोकैडो टाकोस',
    slug: 'baja-avocado-tacos',
    tagline:
      'Stone-ground corn tortillas, panko avocado spears, spiced black beans & chipotle lime crema',
    description:
      'SoCal-Baja street taco bliss! 6 warm artisanal corn tortillas, golden panko-crusted avocado spears, slow-simmered spiced black bean mash, crunchy purple cabbage slaw, and zesty chipotle lime crema.',
    heroImage:
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 329,
    originalPrice: 389,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    diet: 'veg',
    cuisine: 'Mexican',
    dishCategory: 'Tacos',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'gluten-free'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 50, West: 45, East: 20 },
    rating: 4.8,
    reviewCount: 165,
    nutrition: {
      calories: 410,
      protein: 14,
      carbs: 52,
      fat: 18,
      fiber: 9,
    },
    allergens: ['Dairy (Crema)'],
    ingredients: [
      { name: 'Corn Tortillas', quantity: '6 tortillas' },
      { name: 'Avocado Wedges', quantity: '180g' },
      { name: 'Black Bean Mash', quantity: '150g' },
      { name: 'Pickled Cabbage Slaw', quantity: '80g' },
      { name: 'Tomato Salsa', quantity: '60g' },
      {
        name: 'Chipotle Lime Crema',
        quantity: '40g',
        isMasalaSachet: true,
      },
      {
        name: 'Tajin & Cumin Seasoning',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Smoky Chipotle Lime Crema Pouch', 'Mexican Tajin & Toasted Cumin Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Pan-Sear Panko Crusted Avocado Wedges',
        instruction:
          'Heat 2 tbsp oil in a skillet. Coat the Fresh Avocado Wedges (160g) with Sachet 1: Baja Crispy Tempura-Panko Dredge. Pan-fry for 2 minutes per side until golden brown and super crunchy. Drain on paper towels.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Gentle handling ensures the avocado stays luscious inside while developing a crunchy shell.',
      },
      {
        stepNumber: 2,
        title: 'Warm the White Corn Tortillas',
        instruction:
          'Heat a dry tawa or skillet over high flame. Warm each Artisanal White Corn Tortilla (4 pcs) for 30 seconds per side until soft, pliable, and lightly toasted.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Stack warmed tortillas in a clean kitchen towel to keep them soft and steamy.',
      },
      {
        stepNumber: 3,
        title: 'Warm Seasoned Black Beans',
        instruction:
          'Empty the Seasoned Black Beans Pouch (150g) with Sachet 2: Cumin & Smoked Lime Spice Blend into a small pot. Warm over medium heat for 2 minutes until hot.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'A squeeze of fresh lime into the beans brightens up the earthy flavors.',
      },
      {
        stepNumber: 4,
        title: 'Build Tacos with Chipotle Crema Drizzle',
        instruction:
          'Spoon warm black beans onto each tortilla, lay down crispy avocado wedges, top with Crunchy Pickled Cabbage Slaw (60g), and drizzle generously with Sachet 3: Smoky Chipotle Crema.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve with fresh lime wedges and spicy jalapeño slices.',
      },
    ],
    reviews: [
      {
        id: 'rev-203',
        userName: 'Meera Nambiar',
        userCity: 'Kochi',
        rating: 5,
        comment:
          'Fresh, crunchy, and tangy. The tortillas stayed soft and the crema has the perfect smoky kick!',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 26,
      },
    ],
    salesByRegion: {
      Karnataka: 980,
      Maharashtra: 870,
      'Tamil Nadu': 540,
    },
  },
  {
    id: 'kit-204',
    name: 'Smoky Grilled Chipotle Chicken Burrito Bowl Kit',
    hindiName: 'चिपोटल चिकन बुरिटो बाउल',
    slug: 'chipotle-chicken-burrito-bowl',
    tagline:
      'Citrus adobo chicken, fragrant cilantro lime rice, charred fajita peppers & roasted corn salsa',
    description:
      'Chipotle-style hearty Mexican bowl made effortless! Includes tender chicken breast strips marinated in citrus adobo, fluffy cilantro-lime basmati rice, charred bell peppers & onions, black beans, Monterey Jack cheese, and salsa verde.',
    heroImage:
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 399,
    originalPrice: 479,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    diet: 'nonveg',
    cuisine: 'Mexican',
    dishCategory: 'Burritos & Bowls',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['nonveg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 50, South: 55, West: 48, East: 28 },
    rating: 4.9,
    reviewCount: 340,
    nutrition: {
      calories: 560,
      protein: 42,
      carbs: 58,
      fat: 16,
      fiber: 8,
    },
    allergens: ['Dairy (Monterey Jack Cheese & Sour Cream)'],
    ingredients: [
      { name: 'Chicken Strips', quantity: '320g' },
      { name: 'Cilantro Lime Rice', quantity: '280g' },
      { name: 'Fajita Bell Pepper Strips', quantity: '80g' },
      { name: 'Sliced Red Onions', quantity: '40g' },
      { name: 'Sweet Corn Kernels', quantity: '60g' },
      { name: 'Black Beans', quantity: '40g' },
      { name: 'Monterey Jack Cheese', quantity: '40g' },
      { name: 'Tomatillo Salsa Verde', quantity: '50g', isMasalaSachet: true },
      {
        name: 'Ancho Chili & Lime Seasoning',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Tomatillo Salsa Verde Pouch', 'Ancho Chili & Mexican Lime Seasoning'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sear Smoky Chipotle Chicken Breasts',
        instruction:
          'Heat 1 tbsp oil in a skillet or grill pan. Rub Chicken Breast Strips (280g) with Sachet 1: Smoky Chipotle & Mexican Oregano Rub. Sear over high heat for 3-4 minutes per side until deeply browned and thoroughly cooked through.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Let the seared chicken rest for 2 minutes on a cutting board before slicing into bite-sized medallions.',
      },
      {
        stepNumber: 2,
        title: 'Char the Fajita Sweet Peppers & Corn',
        instruction:
          'In the same hot pan, toss Sliced Bell Peppers & Red Onions (100g) and Sweet Corn (60g) with Sachet 2: Char-Grill Seasoning. Flash-sear for 3 minutes until blistered with charred edges.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'High heat creates delicious restaurant-style charred fajita flavor.',
      },
      {
        stepNumber: 3,
        title: 'Warm Cilantro Lime Rice & Black Beans',
        instruction:
          'Warm the Steamed Cilantro-Lime Rice Pouch (220g) and Cuban Black Beans (150g) in a saucepan or microwave for 2 minutes with a splash of water.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Fluff the rice gently with a fork to keep grains separate and light.',
      },
      {
        stepNumber: 4,
        title: 'Assemble Chipotle Burrito Bowls',
        instruction:
          'Divide warm rice and black beans between two bowls. Top with sliced chipotle chicken, charred fajita veggies, Fire-Roasted Tomato Salsa (60g), diced avocado, and Sachet 3: Lime Crema Dressing.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Garnish with fresh cilantro sprigs and a lime wedge.',
      },
    ],
    reviews: [
      {
        id: 'rev-204',
        userName: 'Tanmay Saxena',
        userCity: 'Gurugram',
        rating: 5,
        comment:
          'Macros are amazing! Over 40g protein and tastes fresher than ordering delivery from any Tex-Mex restaurant.',
        date: '2 days ago',
        verifiedBuyer: true,
        helpfulCount: 34,
      },
    ],
    salesByRegion: {
      'Delhi NCR': 1520,
      Karnataka: 1240,
      Maharashtra: 1090,
    },
  },
  {
    id: 'kit-205',
    name: 'Sun-Dried Tomato & Basil Fettuccine Kit',
    hindiName: 'सन-ड्राइड टमाटर फेतुचिनी पास्ता',
    slug: 'sundried-tomato-fettuccine',
    tagline:
      'Handmade durum wheat fettuccine ribbons, velvety sun-dried tomato pesto & grated Parmigiano',
    description:
      'Authentic Tuscan trattoria dinner in 12 minutes! Fresh artisan fettuccine pasta nests, sun-dried tomato and roasted garlic pesto pouch, aged Parmigiano Reggiano block for grating, and toasted Mediterranean pine nuts.',
    heroImage:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 319,
    originalPrice: 379,
    servings: 2,
    prepTimeMinutes: 3,
    cookTimeMinutes: 10,
    diet: 'veg',
    cuisine: 'Italian',
    dishCategory: 'Pastas',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 45, West: 50, East: 30 },
    rating: 4.8,
    reviewCount: 198,
    nutrition: {
      calories: 460,
      protein: 16,
      carbs: 64,
      fat: 16,
      fiber: 6,
    },
    allergens: [
      'Wheat / Gluten (Durum Wheat)',
      'Dairy (Parmigiano Reggiano)',
      'Tree Nuts (Pine Nuts)',
    ],
    ingredients: [
      { name: 'Fettuccine Pasta', quantity: '240g' },
      { name: 'Tomato Basil Pesto', quantity: '140g' },
      { name: 'Parmigiano Reggiano', quantity: '40g' },
      { name: 'Pine Nuts', quantity: '20g' },
      {
        name: 'Tuscan Herb Blend',
        quantity: '8g',
        isMasalaSachet: true,
      },
      { name: 'Extra Virgin Olive Oil', quantity: '20ml', isMasalaSachet: true },
    ],
    masalaSachets: ['Tuscan Herb & Cracked Pepper Dust', 'Extra Virgin Olive Oil Pouch'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Fresh Bronze-Die Fettuccine',
        instruction:
          'Bring 3 liters of salted water to a rolling boil. Drop the Fresh Bronze-Die Fettuccine Ribbons (240g) and cook for exactly 3.5 minutes until perfectly al dente. Reserve 1/2 cup starchy pasta cooking water and drain.',
        timerSeconds: 210,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Never rinse freshly cooked pasta; the natural starch helps the luscious sauce cling to each ribbon.',
      },
      {
        stepNumber: 2,
        title: 'Warm Sun-Dried Tomato Pesto & Garlic Oil',
        instruction:
          'In a wide sauté pan, heat Extra Virgin Olive Oil (20ml) over gentle heat. Empty Sachet 1: Sun-Dried Tomato & Sweet Basil Pesto Base (70g) and minced garlic. Warm for 90 seconds until fragrant.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Keep flame low so the aromatic Mediterranean herbs and garlic gently infuse without scorching.',
      },
      {
        stepNumber: 3,
        title: 'Emulsify Pasta with Velvety Sauce',
        instruction:
          'Add the drained fettuccine directly to the warm pesto along with 4 tbsp of reserved pasta cooking water. Toss and swirl vigorously for 2 minutes until a silky glossy emulsion coats every strand.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Vigorous tossing binds the olive oil and starchy pasta water into a glossy restaurant-quality emulsion.',
      },
      {
        stepNumber: 4,
        title: 'Parmigiano-Reggiano & Toasted Pine Nut Finish',
        instruction:
          'Remove pan from heat. Fold in Sachet 2: 24-Month Aged Parmigiano-Reggiano Grated Cheese (30g) and Sachet 3: Toasted Mediterranean Pine Nuts & Torn Fresh Basil Leaves. Serve immediately in warm bowls.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Adding cheese off the heat prevents clumping and creates a mirror-smooth sauce.',
      },
    ],
    reviews: [
      {
        id: 'rev-205',
        userName: 'Natasha Fernandez',
        userCity: 'Goa',
        rating: 5,
        comment:
          'The pasta texture is silk-soft and the sun-dried tomato pesto has incredible depth of flavor. Restaurant date night at home!',
        date: '5 days ago',
        verifiedBuyer: true,
        helpfulCount: 29,
      },
    ],
    salesByRegion: {
      Maharashtra: 860,
      Karnataka: 790,
      Goa: 420,
    },
  },
  {
    id: 'kit-206',
    name: 'Texas Double Smash Cheeseburger Kit',
    hindiName: 'टेक्सास डबल स्मैश चीज़बर्गर',
    slug: 'texas-double-smash-cheeseburger',
    tagline:
      'Twin seasoned smash patties, toasted brioche buns, aged cheddar, tangy dill pickles & secret burger relish',
    description:
      'The ultimate diner smash burger! Two seasoned patties that sear to crispy-edged perfection in minutes. Includes artisanal brioche buns, 4 thick slices of aged sharp cheddar, crinkle-cut dill pickles, caramelized diced onions, and our signature secret smash burger sauce pouch.',
    heroImage:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 379,
    originalPrice: 449,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 8,
    diet: 'nonveg',
    cuisine: 'American',
    dishCategory: 'Burgers & Sliders',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['nonveg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 60, South: 55, West: 50, East: 35 },
    rating: 4.9,
    reviewCount: 412,
    nutrition: {
      calories: 620,
      protein: 38,
      carbs: 42,
      fat: 28,
      fiber: 3,
    },
    allergens: ['Wheat / Gluten (Brioche Buns)', 'Dairy (Sharp Cheddar)', 'Mustard'],
    ingredients: [
      { name: 'Smash Patties', quantity: '320g' },
      { name: 'Brioche Buns', quantity: '140g' },
      { name: 'Cheddar Slices', quantity: '4 slices' },
      { name: 'Dill Pickles', quantity: '60g' },
      { name: 'Caramelized Onions', quantity: '50g' },
      {
        name: 'Burger Relish',
        quantity: '45g',
        isMasalaSachet: true,
      },
      { name: 'Burger Seasoning Salt', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: ['Secret Diner Burger Relish Pouch', 'House Umami Smash Burger Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toast the Potato Brioche Buns',
        instruction:
          'Slice the Potato Brioche Buns (2 pcs). Lightly butter the cut sides with 15g butter and toast in a cast-iron skillet on medium heat for 2 minutes until deep golden brown.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Toasting builds a crispy barrier so the bottom bun stays sturdy against the juicy smashed patties.',
      },
      {
        stepNumber: 2,
        title: 'Hard Smash Dual Beef/Veg Patties',
        instruction:
          'Heat skillet over maximum heat until smoking hot. Divide ground blend into 4 loose balls (75g each). Place two balls onto the dry pan, sprinkle Sachet 1: Texas Steakhouse Char Seasoning, and smash ultra-thin with parchment paper and a heavy press. Sear for 2 minutes for crispy lacy edges.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'A hard smash creates maximum surface contact for that prized crispy Maillard crust.',
      },
      {
        stepNumber: 3,
        title: 'Melt Twin American Cheddar Slices',
        instruction:
          'Flip the smashed patties. Immediately top each patty with an American Cheddar Cheese Slice (4 slices total). Stack two patties on top of each other and cover pan for 45 seconds to melt into gooey perfection.',
        timerSeconds: 45,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Stacking the patties while melting holds in residual heat and creates double-decker decadence.',
      },
      {
        stepNumber: 4,
        title: 'Stack & Sauce with Texas BBQ Crema',
        instruction:
          'Spread Sachet 2: Smoky Texas Sweet BBQ & Mustard Secret Sauce on both buns. Lay down Dill Pickle Chips (6 pcs) and sliced red onions, stack the double cheesy smash patties, top with bun and press gently.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Enjoy hot with crispy onion rings or salted fries.',
      },
    ],
    reviews: [
      {
        id: 'rev-206',
        userName: 'Vikramaditya Roy',
        userCity: 'Bengaluru',
        rating: 5,
        comment:
          'Crispy lacy edges on the patties and the brioche bun is pillowy soft. Best burger in India hands down!',
        date: '1 day ago',
        verifiedBuyer: true,
        helpfulCount: 51,
      },
    ],
    salesByRegion: {
      Karnataka: 1720,
      Maharashtra: 1480,
      'Delhi NCR': 1310,
    },
  },
  {
    id: 'kit-207',
    name: 'Smoked Pepperoni & Hot Honey Artisanal Pizza Kit',
    hindiName: 'पेपरोनी और हॉट हनी पिज़्ज़ा',
    slug: 'pepperoni-hot-honey-pizza',
    tagline:
      'Slow fermented dough, crispy cupping pepperoni, San Marzano sugo & chili-infused wildflower honey',
    description:
      'Brooklyn style spicy pepperoni meets hot honey! Two 48-hour cold fermented sourdough dough balls, genuine smoked cured pepperoni slices that curl into crispy flavor cups, whole-milk shredded mozzarella, San Marzano marinara, and a bottle of habanero infused wildflower hot honey.',
    heroImage:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 419,
    originalPrice: 499,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 12,
    diet: 'nonveg',
    cuisine: 'Italian',
    dishCategory: 'Pizzas',
    spiceLevel: 'Medium',
    difficulty: 'Medium',
    dietaryTags: ['nonveg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 45, South: 50, West: 60, East: 25 },
    rating: 4.9,
    reviewCount: 388,
    nutrition: {
      calories: 540,
      protein: 26,
      carbs: 55,
      fat: 24,
      fiber: 4,
    },
    allergens: ['Wheat / Gluten (Sourdough)', 'Dairy (Mozzarella)'],
    ingredients: [
      { name: 'Sourdough Dough Balls', quantity: '360g' },
      { name: 'Pepperoni Slices', quantity: '90g' },
      { name: 'Mozzarella Cheese', quantity: '140g' },
      { name: 'Marinara Sauce', quantity: '120g' },
      {
        name: 'Hot Honey',
        quantity: '30ml',
        isMasalaSachet: true,
      },
      { name: 'Oregano & Sea Salt', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: [
      'Wildflower Habanero Hot Honey Pouch',
      'Sicilian Oregano & Sea Salt Crust Dust',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Stretch the Fermented Sourdough Crust',
        instruction:
          'Dust your work surface with the coarse Semolina Flour (30g). Stretch the 48-Hour Fermented Dough Ball (260g) into an 11-inch round pizza base, leaving a 1-inch puffy raised crust along the border.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Handle dough gently from underneath to avoid deflating natural fermentation air pockets.',
      },
      {
        stepNumber: 2,
        title: 'Ladle Sauce, Mozzarella & Artisan Pepperoni',
        instruction:
          'Spread the Herbed San Marzano Tomato Sauce (90g) evenly across the base. Scatter Whole Milk Shredded Mozzarella (110g), Sachet 1: Italian Herb Dust, and arrange Artisanal Smoked Pepperoni Slices (24 pcs) edge-to-edge.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Spacing pepperoni slices evenly allows each slice to cup and crisp up in the oven heat.',
      },
      {
        stepNumber: 3,
        title: 'Bake Until Pepperoni Cups Crisp & Blister',
        instruction:
          'Bake on a preheated pizza stone or baking tray at maximum oven temperature (240°C-250°C) for 7-9 minutes until the cheese is deeply browned and pepperoni edges cup into crispy bowls.',
        timerSeconds: 500,
        imageUrl:
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        tip: 'Pepperoni fat renders into the crust creating rich savory depth.',
      },
      {
        stepNumber: 4,
        title: 'Hot Honey Drizzle & Fresh Basil Finish',
        instruction:
          'Remove pizza from oven and transfer to a cutting board. Drizzle Sachet 2: Calabrian Chili Infused Hot Honey (30ml) in zig-zags all over the hot pizza, finish with fresh basil leaves and slice.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'The sweet and spicy contrast of hot honey cut through the smoky pepperoni is sublime.',
      },
    ],
    reviews: [
      {
        id: 'rev-207',
        userName: 'Karan Mehra',
        userCity: 'Delhi NCR',
        rating: 5,
        comment:
          'The combination of spicy pepperoni, bubbly cheese, and sweet spicy hot honey is addictive! 10/10 kit.',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 45,
      },
    ],
    salesByRegion: {
      'Delhi NCR': 1680,
      Maharashtra: 1350,
      Karnataka: 1210,
    },
  },
  {
    id: 'kit-208',
    name: 'Birria Pulled Chicken Tacos with Consomé Dip Kit',
    hindiName: 'बिरिया चिकन टाकोस और कोन्सोमे',
    slug: 'birria-chicken-tacos-consome',
    tagline:
      'Shredded guajillo chile chicken, dipped crispy corn tortillas, melted Oaxaca cheese & dipping consomé',
    description:
      'The sensational Jalisco street taco sensation! Includes 6 corn tortillas dipped in rich spiced chili oil, shredded adobo chicken simmered in guajillo & ancho broth, melt-in-your-mouth Oaxaca-style cheese, chopped fresh cilantro-onions, lime wedges, and a warm rich dipping consomé bowl.',
    heroImage:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 369,
    originalPrice: 439,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 12,
    diet: 'nonveg',
    cuisine: 'Mexican',
    dishCategory: 'Tacos',
    spiceLevel: 'Spicy',
    difficulty: 'Easy',
    dietaryTags: ['nonveg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 45, West: 55, East: 20 },
    rating: 4.9,
    reviewCount: 295,
    nutrition: {
      calories: 480,
      protein: 34,
      carbs: 46,
      fat: 18,
      fiber: 6,
    },
    allergens: ['Dairy (Oaxaca Cheese)'],
    ingredients: [
      { name: 'Shredded Chicken', quantity: '280g' },
      { name: 'Corn Tortillas', quantity: '6 tortillas' },
      { name: 'Oaxaca Cheese', quantity: '100g' },
      { name: 'Spiced Chili Consomé Broth', quantity: '200ml' },
      { name: 'Diced White Onions', quantity: '35g' },
      { name: 'Coriander Leaves', quantity: '15g' },
      {
        name: 'Spiced Chili Oil',
        quantity: '25ml',
        isMasalaSachet: true,
      },
      { name: 'Lime Oregano Dust', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: ['Spiced Birria Chili Oil Pouch', 'Toasted Mexican Lime & Mexican Oregano Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Warm the Spiced Birria Consomé',
        instruction:
          'Empty the Guajillo-Ancho Chilli Braising Broth (200ml) into a saucepan. Add Sachet 1: Mexican Oregano & Roasted Cumin Seasoning and simmer on low for 3 minutes until steaming and rich red.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Keep the consomé hot on low flame; you will dip the tortillas into this rich broth before searing.',
      },
      {
        stepNumber: 2,
        title: 'Dip Tortillas in Consomé & Place on Tawa',
        instruction:
          'Heat a wide cast iron skillet over medium-high heat. Using tongs, quickly dip each White Corn Tortilla (4 pcs) into the surface of the hot broth, then lay flat onto the hot skillet.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Dipping tortillas in the oily top layer of broth gives them that famous crimson crispy exterior.',
      },
      {
        stepNumber: 3,
        title: 'Stuff with Oaxaca Cheese & Pulled Chicken',
        instruction:
          'Immediately top one half of each tortilla with Shredded Oaxaca Melting Cheese (80g) and Slow-Braised Shredded Birria Chicken (200g). Fold the other half over to form a taco. Sear for 2 minutes per side until ultra crispy.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Press gently with a spatula so the cheese melts and glues the taco firmly together.',
      },
      {
        stepNumber: 4,
        title: 'Garnish, Dip in Consomé & Devour',
        instruction:
          'Ladle the hot birria consomé into two small dipping bowls. Top the hot tacos with Sachet 2: Chopped White Onions & Fresh Cilantro Garnish, serve with lime wedges, and dip each bite into the hot consomé.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Dip each taco deep into the warm consomé broth before every single bite!',
      },
    ],
    reviews: [
      {
        id: 'rev-208',
        userName: 'Sanya Malhotra',
        userCity: 'Mumbai',
        rating: 5,
        comment:
          'Dipping the crunchy cheesy taco into the warm birria broth is unbelievable! Better than any Mexican restaurant in town.',
        date: '2 days ago',
        verifiedBuyer: true,
        helpfulCount: 39,
      },
    ],
    salesByRegion: {
      Maharashtra: 1220,
      Karnataka: 980,
      'Delhi NCR': 890,
    },
  },
  {
    id: 'kit-209',
    name: 'Fiesta Roasted Fajita & Black Bean Burrito Bowl Kit',
    hindiName: 'फिएस्टा फजीता वेज बरीटो बाउल',
    slug: 'fiesta-roasted-fajita-black-bean-burrito-bowl',
    tagline:
      'Charred sweet peppers, smoky chipotle black beans, cilantro-lime brown rice, avocado crema & fire-roasted salsa',
    description:
      'A fiesta in a bowl! Fluffy cilantro-lime infused brown rice topped with fire-roasted fajita bell peppers, simmered Cuban black beans, charred sweet corn, tangy Pico de Gallo, and our signature cooling avocado-lime crema drizzle.',
    heroImage:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 279,
    originalPrice: 329,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Mexican',
    dishCategory: 'Burritos & Bowls',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 45, West: 50, East: 30 },
    rating: 4.8,
    reviewCount: 148,
    nutrition: {
      calories: 440,
      protein: 15,
      carbs: 68,
      fat: 12,
      fiber: 14,
    },
    allergens: [],
    ingredients: [
      { name: 'Cilantro Lime Rice', quantity: '200g' },
      { name: 'Black Beans', quantity: '200g' },
      { name: 'Fajita Bell Pepper Strips', quantity: '140g' },
      { name: 'Sliced Red Onions', quantity: '40g' },
      { name: 'Tomato Salsa', quantity: '80g' },
      { name: 'Avocado Lime Crema', quantity: '50g' },
      {
        name: 'Fajita Seasoning',
        quantity: '12g',
        isMasalaSachet: true,
      },
      { name: 'Tortilla Strips', quantity: '30g' },
    ],
    masalaSachets: ['Smoky Fajita Char Seasoning'],
    sachets: [
      {
        id: 'sachet-209-1',
        name: 'Smoky Fajita Char Seasoning',
        weight: '12g',
        spices: [
          { name: 'Smoked Paprika & Oregano', quantity: '5g' },
          { name: 'Cumin & Garlic Powder', quantity: '4g' },
          { name: 'Chipotle Chilli & Sea Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Steam Cilantro-Lime Rice',
        instruction:
          'Warm the Pre-Steamed Basmati Rice Pouch (220g) in a covered pan with 2 tbsp water for 2 minutes. Stir in the Lime Juice Sachet and fresh chopped cilantro until fragrant.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Fluff gently with a fork to maintain light and fluffy grains.',
      },
      {
        stepNumber: 2,
        title: 'Sizzle Fajita Veggies on High Heat',
        instruction:
          'Heat 1 tbsp oil in a skillet until smoking. Add Sliced Trio Bell Peppers & Red Onions (140g) and Sweet Corn (60g). Sprinkle Sachet 1: Smoky Fajita Char Seasoning (Smoked Paprika, Mexican Oregano, Chipotle) and sauté on high heat for 3.5 minutes until tender-crisp with charred blisters.',
        timerSeconds: 210,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not crowd the skillet so the vegetables sear rather than steam.',
      },
      {
        stepNumber: 3,
        title: 'Warm Smoky Black Beans',
        instruction:
          'In a small pan, simmer Seasoned Black Beans (160g) with 2 tbsp water and Sachet 2: Toasted Cumin & Garlic Powder Blend for 2 minutes until piping hot.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Black beans provide satisfying plant-based protein and fiber.',
      },
      {
        stepNumber: 4,
        title: 'Assemble Fiesta Bowls with Salsa',
        instruction:
          'Divide rice between two bowls. Arrange charred fajita veggies, warm black beans, Roasted Tomato & Jalapeño Salsa (80g), and sliced fresh avocado. Drizzle with Lime Crema and sprinkle toasted pepitas.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve with crispy tortilla chips for extra crunch.',
      },
    ],
    reviews: [
      {
        id: 'rev-209',
        userName: 'Rahul Nair',
        userCity: 'Bengaluru',
        rating: 5,
        comment:
          'Fresh, colorful, and super satisfying! The avocado crema ties the whole bowl together.',
        date: '4 days ago',
        verifiedBuyer: true,
        helpfulCount: 24,
      },
    ],
    salesByRegion: {
      Karnataka: 820,
      Maharashtra: 710,
      'Delhi NCR': 590,
    },
  },
  {
    id: 'kit-210',
    name: 'Creamy Truffle & Wild Mushroom Pappardelle Kit',
    hindiName: 'क्रीमी ट्रफल और मशरूम पास्ता',
    slug: 'creamy-truffle-wild-mushroom-pappardelle',
    tagline:
      'Handcrafted wide ribbon pasta tossed in black truffle cream, sautéed porcini mushrooms & aged Pecorino Romano',
    description:
      'An opulent Italian classic. Velvety wide ribbon pappardelle nests tossed in a rich, buttery sauce infused with black summer truffle oil, wild porcini and cremini mushrooms, finished with freshly grated aged Pecorino Romano cheese.',
    heroImage:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 339,
    originalPrice: 389,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Italian',
    dishCategory: 'Pastas',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 40, West: 45, East: 25 },
    rating: 4.9,
    reviewCount: 172,
    nutrition: {
      calories: 480,
      protein: 17,
      carbs: 62,
      fat: 19,
      fiber: 5,
    },
    allergens: ['Wheat / Gluten (Durum Wheat)', 'Dairy (Cream, Butter & Pecorino)'],
    ingredients: [
      { name: 'Pappardelle Pasta', quantity: '240g' },
      { name: 'Porcini Mushrooms', quantity: '90g' },
      { name: 'Cremini Mushrooms', quantity: '90g' },
      { name: 'Cooking Cream', quantity: '120ml' },
      { name: 'Truffle Olive Oil', quantity: '15ml' },
      { name: 'Pecorino Romano', quantity: '35g' },
      {
        name: 'Tuscan Rosemary Garlic Dust',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Tuscan Rosemary, Garlic & Cracked Pepper Dust'],
    sachets: [
      {
        id: 'sachet-210-1',
        name: 'Tuscan Rosemary, Garlic & Cracked Pepper Dust',
        weight: '8g',
        spices: [
          { name: 'Rosemary & Thyme', quantity: '3g' },
          { name: 'Garlic Powder', quantity: '2.5g' },
          { name: 'Cracked Black Pepper', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Fresh Pappardelle Ribbons',
        instruction:
          'Bring 3.5 liters of salted water to a rolling boil. Drop the Handcrafted Egg Pappardelle Ribbons (240g) and boil for 4 minutes until al dente. Reserve 1/2 cup starchy pasta cooking water and drain.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Egg pappardelle cooks quickly; test a ribbon at 3.5 minutes for that perfect toothsome bite.',
      },
      {
        stepNumber: 2,
        title: 'Caramelize Wild Forest Mushrooms in Butter',
        instruction:
          'Melt Artisanal Butter (25g) in a wide skillet over medium-high heat. Add Sliced Porcini, Cremini & Shiitake Mushrooms (160g). Sprinkle Sachet 1: Tuscan Rosemary, Garlic & Cracked Pepper Dust. Sauté for 4 minutes until deeply caramelized.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Resist stirring mushrooms for the first 90 seconds to allow deep golden browning.',
      },
      {
        stepNumber: 3,
        title: 'Simmer Silky Black Truffle Cream',
        instruction:
          'Pour the Heavy Dairy Cream Pouch (100ml) and Sachet 2: Black Truffle Reduction Infusion into the pan with mushrooms. Simmer gently for 2 minutes until the sauce coats the back of a spoon.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Keep heat medium-low to prevent the decadent cream from reducing too quickly.',
      },
      {
        stepNumber: 4,
        title: 'Coat Pappardelle & Grate Pecorino',
        instruction:
          'Toss the boiled pappardelle into the hot truffle mushroom cream along with 3 tbsp reserved pasta water. Swirl vigorously until each ribbon is cloaked in sauce. Top with Sachet 3: Aged Pecorino Romano (30g) and fresh Italian parsley.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve immediately in warmed pasta bowls for the ultimate fine-dining experience.',
      },
    ],
    reviews: [
      {
        id: 'rev-210',
        userName: 'Alia Merchant',
        userCity: 'Mumbai',
        rating: 5,
        comment:
          'The truffle aroma when opening the pan is sublime! Feels like dining in Florence.',
        date: '2 days ago',
        verifiedBuyer: true,
        helpfulCount: 37,
      },
    ],
    salesByRegion: {
      Maharashtra: 950,
      Karnataka: 840,
      'Delhi NCR': 710,
    },
  },
  {
    id: 'kit-301',
    name: 'Mediterranean Chickpea & Spinach Stew Kit',
    hindiName: 'मेडिटेरेनियन चना और पालक स्टू',
    slug: 'mediterranean-chickpea-spinach-stew',
    tagline:
      'Rustic Spanish-style potaje with tender chickpeas, baby spinach, roasted garlic & smoked paprika broth',
    description:
      'Warm up with this comforting Mediterranean chickpea and spinach stew inspired by Andalusian potaje. Packed with wholesome plant protein, simmered in a velvety San Marzano tomato broth infused with cold-pressed olive oil, toasted cumin, and Spanish smoked pimentón.',
    heroImage:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 269,
    originalPrice: 319,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 20,
    diet: 'veg',
    cuisine: 'Mediterranean',
    dishCategory: 'Soups & Stews',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 40, West: 45, East: 25 },
    rating: 4.8,
    reviewCount: 156,
    nutrition: {
      calories: 340,
      protein: 14,
      carbs: 48,
      fat: 10,
      fiber: 11,
    },
    allergens: [],
    ingredients: [
      { name: 'Boiled Chickpeas', quantity: '250g' },
      { name: 'Baby Spinach', quantity: '120g' },
      { name: 'Tomato Passata', quantity: '180g' },
      { name: 'Garlic Cloves', quantity: '5 pieces' },
      { name: 'Olive Oil', quantity: '25ml' },
      {
        name: 'Smoked Paprika & Cumin Infusion',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Garlic Herb Salt',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Smoked Paprika & Cumin Infusion', 'Toasted Garlic Herb Salt'],
    sachets: [
      {
        id: 'sachet-301-1',
        name: 'Smoked Paprika & Cumin Infusion',
        weight: '12g',
        spices: [
          { name: 'Smoked Paprika', quantity: '6g' },
          { name: 'Roasted Cumin Powder', quantity: '4g' },
          { name: 'Cracked Black Pepper', quantity: '2g' },
        ],
      },
      {
        id: 'sachet-301-2',
        name: 'Toasted Garlic Herb Salt',
        weight: '6g',
        spices: [
          { name: 'Garlic Powder', quantity: '3g' },
          { name: 'Dried Oregano', quantity: '1.5g' },
          { name: 'Pink Salt', quantity: '1.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Infuse Extra Virgin Olive Oil with Garlic',
        instruction:
          'Heat Extra Virgin Olive Oil (25ml) in a heavy casserole over medium heat. Empty Sachet 1: Smoked Paprika & Cumin Infusion along with minced garlic and diced yellow onions (60g). Sauté for 2 minutes until fragrant and translucent.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Low-to-medium heat extracts the maximum aroma from Spanish smoked pimentón without bitterness.',
      },
      {
        stepNumber: 2,
        title: 'Build the Smoky Tomato Broth',
        instruction:
          'Add Crushed Mediterranean Tomatoes Pouch (160g), Sachet 2: Toasted Garlic Herb Salt, and 1 cup warm vegetable stock. Bring to a bubbling simmer for 4 minutes.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Crushing the tomatoes slightly enhances the rustic texture of this classic stew.',
      },
      {
        stepNumber: 3,
        title: 'Simmer Chickpeas in Rich Broth',
        instruction:
          'Add the Cooked Organic Chickpeas (250g) into the simmering tomato broth. Cover and simmer on low heat for 8 minutes so the chickpeas absorb all the smoked paprika and cumin notes.',
        timerSeconds: 480,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Simmering covered keeps the broth rich and allows spices to penetrate the chickpeas.',
      },
      {
        stepNumber: 4,
        title: 'Wilt Baby Spinach & Season with Herbs',
        instruction:
          'Uncover and fold in Fresh Baby Spinach Leaves (120g). Cook for 90 seconds just until wilted and vibrant green. Drizzle with cold-pressed olive oil, sprinkle fresh oregano, and serve with toasted sourdough or warm pita bread.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Add spinach right at the end to keep its vibrant emerald color and nutrients.',
      },
    ],
    reviews: [
      {
        id: 'rev-301',
        userName: 'Kavita Sundaram',
        userCity: 'Bengaluru',
        rating: 5,
        comment:
          'Incredible smoky depth and so nourishing! Perfect cozy dinner after a long workday.',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 22,
      },
    ],
    salesByRegion: {
      Karnataka: 680,
      Maharashtra: 520,
      'Delhi NCR': 410,
    },
  },
  {
    id: 'kit-302',
    name: 'Classic French Provencal Ratatouille Stew Kit',
    hindiName: 'क्लासिक फ्रेंच रतातूई स्टू',
    slug: 'classic-french-provencal-ratatouille-stew',
    tagline:
      'Sun-ripened zucchini, aubergine & sweet bell peppers slow-braised with herbes de Provence & extra virgin olive oil',
    description:
      'A fragrant, hearty vegetable stew from the sun-drenched hills of Provence. Tender layers of golden zucchini, sweet bell peppers, and silky aubergine braised slowly in crushed plum tomatoes with garlic, thyme, and fragrant rosemary.',
    heroImage:
      'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 299,
    originalPrice: 349,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    diet: 'veg',
    cuisine: 'European',
    dishCategory: 'Soups & Stews',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 30, South: 35, West: 40, East: 20 },
    rating: 4.7,
    reviewCount: 112,
    nutrition: {
      calories: 290,
      protein: 7,
      carbs: 32,
      fat: 15,
      fiber: 9,
    },
    allergens: [],
    ingredients: [
      { name: 'Zucchini Rounds', quantity: '150g' },
      { name: 'Aubergine Cubes', quantity: '150g' },
      { name: 'Diced Yellow Bell Pepper', quantity: '60g' },
      { name: 'Diced Red Bell Pepper', quantity: '60g' },
      { name: 'Crushed Tomatoes', quantity: '200g' },
      { name: 'Diced White Onions', quantity: '80g' },
      { name: 'Extra Virgin Olive Oil', quantity: '30ml' },
      {
        name: 'Herbes de Provence',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Herbes de Provence & Sea Salt Blend'],
    sachets: [
      {
        id: 'sachet-302-1',
        name: 'Herbes de Provence & Sea Salt Blend',
        weight: '10g',
        spices: [
          { name: 'Thyme & Rosemary', quantity: '4g' },
          { name: 'Marjoram & Oregano', quantity: '3g' },
          { name: 'Sea Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Onions & Sweet Peppers with Herbes de Provence',
        instruction:
          'Heat 2 tbsp Olive Oil in a large pan. Sauté Diced Sweet Bell Peppers & Yellow Onions (140g) with Sachet 1: Herbes de Provence & Brittany Sea Salt Blend for 3 minutes until tender.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'French thyme, rosemary and marjoram blossom when bloomed gently in warm olive oil.',
      },
      {
        stepNumber: 2,
        title: 'Sear Zucchini & Aubergine Rounds',
        instruction:
          'Add Sliced Zucchini Rounds (120g) and Aubergine / Eggplant Cubes (120g). Sauté over medium-high flame for 4 minutes until golden on edges.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Searing the vegetables first ensures each retains its distinct texture rather than turning into mush.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Provencal Crushed Tomatoes',
        instruction:
          'Pour the Rustic Crushed Tomatoes Pouch (180g) and minced garlic over the vegetables. Stir gently, cover, and let slow-simmer on low heat for 10 minutes until meltingly tender.',
        timerSeconds: 600,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Low, slow simmering melds the sweet summer vegetable flavors together.',
      },
      {
        stepNumber: 4,
        title: 'Rest & Serve with Crusty French Baguette',
        instruction:
          'Remove lid and let rest off heat for 3 minutes. Finish with a drizzle of cold-pressed olive oil, cracked black pepper, and torn fresh basil leaves. Serve warm alongside toasted crusty baguette.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Ratatouille actually tastes even richer after resting for a few minutes.',
      },
    ],
    reviews: [
      {
        id: 'rev-302',
        userName: 'Arjun Sen',
        userCity: 'Kolkata',
        rating: 5,
        comment: 'Authentic French taste! The aroma of herbes de Provence filled the kitchen.',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 18,
      },
    ],
    salesByRegion: {
      West: 490,
      South: 430,
      North: 380,
    },
  },
  {
    id: 'kit-303',
    name: 'Spiced Tomato & Red Lentil Shorba Kit',
    hindiName: 'टमाटर और मसूर दाल शोरबा',
    slug: 'spiced-tomato-red-lentil-shorba',
    tagline:
      'Silky roasted tomato and red masoor lentil soup tempered with cumin, fresh coriander, ginger & lime',
    description:
      'A soothing, aromatic Indian shorba uniting fire-roasted tomatoes with protein-rich pink masoor dal. Tempered with a sizzled tadka of cumin, curry leaves, and grated fresh ginger, finished with a zesty squeeze of fresh lime.',
    heroImage:
      'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 219,
    originalPrice: 259,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 18,
    diet: 'veg',
    cuisine: 'North Indian',
    dishCategory: 'Soups & Stews',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'gluten-free'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 50, South: 40, West: 45, East: 35 },
    rating: 4.9,
    reviewCount: 184,
    nutrition: {
      calories: 230,
      protein: 12,
      carbs: 36,
      fat: 4,
      fiber: 8,
    },
    allergens: [],
    ingredients: [
      { name: 'Red Masoor Dal', quantity: '120g' },
      { name: 'Tomato Puree', quantity: '180g' },
      { name: 'Ginger Garlic Paste', quantity: '15g' },
      { name: 'Coriander Leaves', quantity: '20g' },
      { name: 'Mustard Oil', quantity: '15ml' },
      {
        name: 'Roasted Cumin & Black Salt',
        quantity: '10g',
        isMasalaSachet: true,
      },
      { name: 'Lime', quantity: '1 piece' },
    ],
    masalaSachets: ['Roasted Cumin & Black Salt Tadka'],
    sachets: [
      {
        id: 'sachet-303-1',
        name: 'Roasted Cumin & Black Salt',
        weight: '10g',
        spices: [
          { name: 'Roasted Cumin Powder', quantity: '5g' },
          { name: 'Black Salt', quantity: '2.5g' },
          { name: 'Garam Masala', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Split Red Lentils & Tomato Puree',
        instruction:
          'In a soup pot, bring 2.5 cups of water to a boil. Add the washed Red Masoor Dal (150g), Ripe Tomato Confit Puree (120g), and turmeric. Simmer on medium heat for 10 minutes until lentils are soft.',
        timerSeconds: 600,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Red masoor lentils cook quickly and break down into a naturally silky smooth base.',
      },
      {
        stepNumber: 2,
        title: 'Whisk into Silky Velvety Shorba',
        instruction:
          'Whisk the cooked lentils vigorously with a hand whisk (or immersion blender) for 1 minute until completely smooth and velvety. Adjust consistency with 1/2 cup warm water.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'A quick whisk creates that classic lightweight royal shorba broth texture.',
      },
      {
        stepNumber: 3,
        title: 'Prepare Sizzling Aromatic Desi Ghee Tadka',
        instruction:
          'In a small tadka pan, heat Desi Ghee (20g). Empty Sachet 1: Roasted Cumin & Black Salt Tadka (Bhuna Jeera, Kala Namak, Garam Masala) and sizzle for 30 seconds until aromatic.',
        timerSeconds: 30,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Pour the sizzling tadka immediately into the soup while still crackling hot.',
      },
      {
        stepNumber: 4,
        title: 'Pour Tadka & Garnish with Lemon',
        instruction:
          'Pour the sizzling tadka into the shorba with a loud hiss! Cover for 1 minute to trap the smoke and aroma. Ladle into bowls, squeeze fresh lemon juice, and garnish with chopped fresh coriander.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Covering the pot right after pouring the tadka infuses the whole soup with roasted cumin aroma.',
      },
    ],
    reviews: [
      {
        id: 'rev-303',
        userName: 'Deepa Verma',
        userCity: 'Lucknow',
        rating: 5,
        comment:
          'Pure comfort in a bowl! Tastes just like homestyle shorba with a restaurant twist.',
        date: '4 days ago',
        verifiedBuyer: true,
        helpfulCount: 26,
      },
    ],
    salesByRegion: {
      North: 810,
      'Delhi NCR': 650,
      West: 420,
    },
  },
  {
    id: 'kit-304',
    name: 'Chettinad Pepper Chicken Curry Kit',
    hindiName: 'चेट्टिनाड पेप्पर चिकन करी',
    slug: 'chettinad-pepper-chicken-curry',
    tagline:
      'Fiery Karaikudi-style chicken curry with stone-ground black pepper, roasted fennel & fresh curry leaf tadka',
    description:
      'Experience the bold, legendary spices of Karaikudi. Succulent tender chicken pieces simmered in a dark, aromatic gravy made with freshly roasted black peppercorns, star anise, shallots, and toasted coconut.',
    heroImage:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 349,
    originalPrice: 399,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    diet: 'nonveg',
    cuisine: 'South Indian',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Spicy',
    difficulty: 'Medium',
    dietaryTags: ['nonveg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 55, West: 40, East: 25 },
    rating: 4.9,
    reviewCount: 240,
    nutrition: {
      calories: 430,
      protein: 32,
      carbs: 12,
      fat: 28,
      fiber: 5,
    },
    allergens: ['Tree Nuts (Coconut)'],
    ingredients: [
      { name: 'Chicken Curry Cut', quantity: '400g' },
      { name: 'Sambar Shallots', quantity: '100g' },
      { name: 'Sesame Oil', quantity: '25ml' },
      { name: 'Curry Leaves', quantity: '15 leaves' },
      { name: 'Coconut & Poppy Seed Paste', quantity: '60g' },
      {
        name: 'Karaikudi Masala',
        quantity: '25g',
        isMasalaSachet: true,
      },
      {
        name: 'Black Pepper & Fennel Tadka',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Stone-Ground Karaikudi Masala', 'Tellicherry Black Pepper & Fennel Tadka'],
    sachets: [
      {
        id: 'sachet-304-1',
        name: 'Stone-Ground Karaikudi Masala',
        weight: '25g',
        spices: [
          { name: 'Coriander Seeds', quantity: '10g' },
          { name: 'Kashmiri & Guntur Red Chillies', quantity: '8g' },
          { name: 'Star Anise & Kalpasi', quantity: '4g' },
          { name: 'Cinnamon & Cloves', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-304-2',
        name: 'Tellicherry Black Pepper & Fennel Tadka',
        weight: '10g',
        spices: [
          { name: 'Cracked Black Pepper', quantity: '6g' },
          { name: 'Fennel Seeds', quantity: '4g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Shallots in Gingelly Oil',
        instruction:
          'Heat Cold-Pressed Sesame/Gingelly Oil (30ml) in a heavy pot. Add Sliced Small Sambar Shallots (80g) and Fresh Curry Leaves. Sauté for 3 minutes until translucent and golden.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Authentic Chettinad flavor begins with cold-pressed gingelly oil and small shallots.',
      },
      {
        stepNumber: 2,
        title: 'Roast Chicken with Chettinad Stone-Ground Masala',
        instruction:
          'Add Farm-Fresh Bone-in Chicken Pieces (350g) and Sachet 1: Stone-Ground Karaikudi Masala (roasted coriander, Guntur chillies, star anise, kalpasi stone flower). Sear on high heat for 4 minutes until spices coat the meat.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Kalpasi (black stone flower) lends that signature earthy wood-fired Chettinad aroma.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Fresh Coconut Paste',
        instruction:
          'Pour the Fresh Coconut & Poppy Seed Paste (50g) along with 1 cup warm water. Bring to a boil, cover, and simmer over medium-low flame for 12 minutes until chicken is tender.',
        timerSeconds: 720,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'The poppy seeds in the coconut paste create thick, luxurious restaurant body.',
      },
      {
        stepNumber: 4,
        title: 'Finish with Tellicherry Black Pepper Tadka',
        instruction:
          'In a small pan, heat 1 tsp oil with Sachet 2: Tellicherry Black Pepper & Fennel Tadka. Sizzle for 30 seconds and pour over the simmering curry. Stir well and serve hot with steamed rice or parotta.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Tellicherry black pepper provides pungent lingering warmth that defines true Chettinad cuisine.',
      },
    ],
    reviews: [
      {
        id: 'rev-304',
        userName: 'Manoj Subramaniam',
        userCity: 'Chennai',
        rating: 5,
        comment:
          'Authentic Chettinad flavor! The stone flower and Tellicherry pepper balance is spot on.',
        date: 'Yesterday',
        verifiedBuyer: true,
        helpfulCount: 41,
      },
    ],
    salesByRegion: {
      South: 1450,
      West: 980,
      North: 620,
    },
  },
  {
    id: 'kit-305',
    name: 'Crispy Veg Manchurian & Hakka Noodles Kit',
    hindiName: 'वेज मंचूरियन और हक्का नूडल्स',
    slug: 'crispy-veg-manchurian-hakka-noodles',
    tagline:
      'Golden crispy vegetable dumplings in tangy dark garlic soya sauce paired with wok-tossed Hakka noodles',
    description:
      'Indias favorite street-food fusion! Crisp hand-rolled veggie dumplings tossed in a sizzling ginger-garlic and dark soya Manchurian gravy, served with springy eggless Hakka noodles and toasted sesame.',
    heroImage:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 289,
    originalPrice: 339,
    servings: 2,
    prepTimeMinutes: 12,
    cookTimeMinutes: 18,
    diet: 'veg',
    cuisine: 'Indo-Chinese',
    dishCategory: 'Street Food',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 45, South: 40, West: 50, East: 40 },
    rating: 4.8,
    reviewCount: 167,
    nutrition: {
      calories: 470,
      protein: 13,
      carbs: 72,
      fat: 15,
      fiber: 6,
    },
    allergens: ['Gluten / Wheat', 'Soy'],
    ingredients: [
      { name: 'Manchurian Base Mix', quantity: '220g' },
      { name: 'Hakka Noodles', quantity: '180g' },
      { name: 'Spring Onions', quantity: '40g' },
      { name: 'Capsicum', quantity: '40g' },
      { name: 'Minced Ginger', quantity: '10g' },
      { name: 'Minced Garlic', quantity: '10g' },
      { name: 'Green Chillies', quantity: '5g' },
      {
        name: 'Manchurian Sauce',
        quantity: '60ml',
        isMasalaSachet: true,
      },
      {
        name: 'Wok Spice Seasoning',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Tangy Manchurian Dark Sauce Pouch', 'Indo-Chinese Wok Spice Seasoning'],
    sachets: [
      {
        id: 'sachet-305-1',
        name: 'Tangy Manchurian Dark Sauce Pouch',
        weight: '60ml',
        spices: [
          { name: 'Dark Soya Sauce', quantity: '25ml' },
          { name: 'Chilli Garlic Paste', quantity: '20ml' },
          { name: 'Vinegar & Sugar Blend', quantity: '15ml' },
        ],
      },
      {
        id: 'sachet-305-2',
        name: 'Indo-Chinese Wok Spice Seasoning',
        weight: '10g',
        spices: [
          { name: 'White Pepper Powder', quantity: '4g' },
          { name: 'White Sesame Seeds', quantity: '3g' },
          { name: 'Celery & Onion Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Hakka Noodles with Wok Seasoning',
        instruction:
          'Boil 4 cups water with 1 tsp oil. Drop the Springy Hakka Wheat Noodles (180g) and cook for 3.5 minutes until tender. Drain, rinse in cold water, and toss with Sachet 2: Indo-Chinese Wok Seasoning (white pepper, garlic salt, toasted sesame oil).',
        timerSeconds: 210,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Rinsing noodles in cold water immediately stops cooking and prevents sticking.',
      },
      {
        stepNumber: 2,
        title: 'Pan-Fry Pre-Rolled Vegetable Manchurian Balls',
        instruction:
          'Heat 2 tbsp oil in a skillet over medium-high heat. Place the Pre-Formed Vegetable Manchurian Balls (8 pcs) in the pan. Roll and pan-fry for 4 minutes until crisp and golden brown on all sides. Set aside.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        tip: 'Medium-high heat ensures a crunchy outer crust while keeping the vegetable center tender.',
      },
      {
        stepNumber: 3,
        title: 'Wok-Toss the Sizzling Manchurian Sauce',
        instruction:
          'In a smoking hot wok or skillet, add 1 tbsp oil, minced garlic, ginger, and diced bell peppers (60g). Pour Sachet 1: Tangy Manchurian Dark Sauce Pouch (dark soy, chilli garlic, vinegar) with 1/2 cup water. Bring to a rapid bubbling glaze.',
        timerSeconds: 150,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'A smoking wok imparts the essential wok-hei char to the garlic and peppers.',
      },
      {
        stepNumber: 4,
        title: 'Glaze Manchurian Balls & Serve with Noodles',
        instruction:
          'Toss the crisp Manchurian balls into the simmering sauce for 1 minute until glistening and coated. Garnish with chopped spring onion greens and serve piping hot alongside the seasoned hakka noodles.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Toss Manchurian balls right before serving so they stay delightfully crispy on the outside.',
      },
    ],
    reviews: [
      {
        id: 'rev-305',
        userName: 'Pooja Agarwal',
        userCity: 'Kolkata',
        rating: 5,
        comment: 'Better than roadside Chinese van! Crunchy Manchurian balls in rich glossy sauce.',
        date: '5 days ago',
        verifiedBuyer: true,
        helpfulCount: 31,
      },
    ],
    salesByRegion: {
      East: 890,
      West: 760,
      North: 690,
    },
  },
  {
    id: 'kit-306',
    name: 'Royal Awadhi Shahi Biryani Kit',
    hindiName: 'शाही अवधी दम बिरयानी',
    slug: 'royal-awadhi-shahi-biryani',
    tagline:
      'Aromatic long-grain basmati layered with royal saffron, caramelised onions, fresh paneer & rose essence',
    description:
      'A royal Nawabi feast prepared with the slow-dum technique. Aged basmati rice scented with Kashmiri saffron and royal zafran, layered over marinated malai paneer, fried golden onions, and crushed cardamom.',
    heroImage:
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 329,
    originalPrice: 379,
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    diet: 'veg',
    cuisine: 'Mughlai',
    dishCategory: 'Biryani & Rice',
    spiceLevel: 'Medium',
    difficulty: 'Chef Special',
    dietaryTags: ['veg', 'jain'],
    isTrending: true,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 45, South: 35, West: 40, East: 30 },
    rating: 4.9,
    reviewCount: 215,
    nutrition: {
      calories: 510,
      protein: 18,
      carbs: 68,
      fat: 18,
      fiber: 5,
    },
    allergens: ['Dairy (Paneer & Ghee)', 'Tree Nuts (Cashew & Almond)'],
    ingredients: [
      { name: 'Basmati Rice', quantity: '250g' },
      { name: 'Paneer Cubes', quantity: '200g' },
      { name: 'Crispy Onions', quantity: '40g' },
      { name: 'Desi Ghee', quantity: '30g' },
      { name: 'Saffron Kewra Infusion', quantity: '15ml' },
      {
        name: 'Khada Potli Masala',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Zafrani Shahi Spice Blend',
        quantity: '20g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Awadhi Khada Potli Masala', 'Royal Zafrani Shahi Spice Blend'],
    sachets: [
      {
        id: 'sachet-306-1',
        name: 'Awadhi Khada Potli Masala',
        weight: '15g',
        spices: [
          { name: 'Green Cardamom', quantity: '4g' },
          { name: 'Black Cardamom & Cinnamon', quantity: '4g' },
          { name: 'Mace & Nutmeg', quantity: '3g' },
          { name: 'Cloves & Shahi Jeera', quantity: '4g' },
        ],
      },
      {
        id: 'sachet-306-2',
        name: 'Royal Zafrani Shahi Spice Blend',
        weight: '20g',
        spices: [
          { name: 'Saffron', quantity: '1g' },
          { name: 'Cashew Paste Powder', quantity: '10g' },
          { name: 'Garam Masala', quantity: '5g' },
          { name: 'Rose Petal Powder', quantity: '4g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Parboil Royal Basmati with Awadhi Potli Spices',
        instruction:
          'In 5 cups boiling salted water, drop Sachet 1: Awadhi Khada Potli Masala (green & black cardamom, mace, cinnamon, cloves, shahi jeera). Add Aged Long-Grain Basmati Rice (250g) and parboil for 5 minutes until 70% done. Drain and remove potli.',
        timerSeconds: 300,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'The potli pouch infuses whole spice fragrance without leaving whole spices in the teeth.',
      },
      {
        stepNumber: 2,
        title: 'Sear Malai Paneer in Shahi Zafrani Masala',
        instruction:
          'In a heavy handi, heat 1 tbsp Pure Desi Ghee. Sear Fresh Malai Paneer Cubes (220g) with Greek Yogurt (50g) and Sachet 2: Royal Zafrani Shahi Spice Blend (saffron, cashew powder, rose petal dust) for 3 minutes over gentle flame.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Gentle heat prevents yogurt from splitting and allows saffron notes to develop.',
      },
      {
        stepNumber: 3,
        title: 'Layer Basmati, Saffron Milk & Golden Birista',
        instruction:
          'Spread the fragrant parboiled rice evenly over the paneer base. Drizzle Saffron Infused Milk (30ml), Kewra Essence, and scatter Golden Fried Onions (Birista, 40g) and fresh mint leaves.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        tip: 'Layering creates distinct white, yellow, and saffron rice grains prized in Awadhi banquet cooking.',
      },
      {
        stepNumber: 4,
        title: 'Slow Dum Cook on Sealed Low Flame',
        instruction:
          'Seal handi tightly with lid or aluminum foil. Place over low flame (or atop a hot tawa) and dum cook for 14 minutes. Rest for 5 minutes before gently fluffing with a flat spoon.',
        timerSeconds: 840,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Always fluff biryani from the edges inward to avoid breaking long rice grains.',
      },
    ],
    reviews: [
      {
        id: 'rev-306',
        userName: 'Sameer Rizvi',
        userCity: 'Lucknow',
        rating: 5,
        comment:
          'Reminds me of traditional Aminabad dum biryani! The aroma of saffron and mace is divine.',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 35,
      },
    ],
    salesByRegion: {
      North: 1120,
      West: 650,
      South: 450,
    },
  },
  {
    id: 'kit-307',
    name: 'Traditional Gujarati Dal Dhokli Stew Kit',
    hindiName: 'पारंपरिक गुजराती दाल ढोकली',
    slug: 'traditional-gujarati-dal-dhokli-stew',
    tagline:
      'Sweet and tangy spiced toor dal stew with tender hand-cut spiced whole wheat pasta dumplings',
    description:
      'The soul of Gujarati comfort cuisine. Nutritious pigeon pea dal cooked with jaggery, kokum, and roasted peanuts, into which spiced whole-wheat dumplings are simmered to chewy perfection with ghee-tempered mustard seeds.',
    heroImage:
      'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 249,
    originalPrice: 289,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    diet: 'veg',
    cuisine: 'Gujarati',
    dishCategory: 'Soups & Stews',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'jain'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 35, South: 25, West: 60, East: 20 },
    rating: 4.8,
    reviewCount: 142,
    nutrition: {
      calories: 380,
      protein: 14,
      carbs: 62,
      fat: 9,
      fiber: 7,
    },
    allergens: ['Gluten / Wheat', 'Peanuts', 'Dairy (Ghee)'],
    ingredients: [
      { name: 'Dhokli Dough Cuts', quantity: '180g' },
      { name: 'Toor Dal Base', quantity: '250g' },
      { name: 'Roasted Peanuts', quantity: '30g' },
      { name: 'Jaggery & Kokum Extract', quantity: '35g' },
      { name: 'Desi Ghee', quantity: '20g' },
      {
        name: 'Rai-Hing Tadka Masala',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Kathiyawadi Rai-Hing Tadka Masala'],
    sachets: [
      {
        id: 'sachet-307-1',
        name: 'Kathiyawadi Rai-Hing Tadka Masala',
        weight: '10g',
        spices: [
          { name: 'Mustard Seeds', quantity: '3g' },
          { name: 'Asafoetida (Hing)', quantity: '1.5g' },
          { name: 'Cumin & Fenugreek Seeds', quantity: '2.5g' },
          { name: 'Kashmiri Chillies', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Simmer Gujarati Toor Dal Base',
        instruction:
          'In a pot, bring Cooked Gujarati Toor Dal (250g) and 1.5 cups water to a boil. Stir in Jaggery Powder (20g), Kokum Pouch, and Roasted Peanuts (30g). Simmer for 3 minutes for that signature sweet and tangy Gujarati base.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Kokum and jaggery together create the authentic khatta-meetha Gujarati balance.',
      },
      {
        stepNumber: 2,
        title: 'Drop Fresh Spiced Wheat Dhokli Ribbons',
        instruction:
          'Drop the Fresh Diamond-Cut Spiced Whole Wheat Dhokli Strips (140g) one by one into the bubbling dal. Stir very gently once so dhoklis do not stick together.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Drop dhoklis one at a time into rapidly boiling dal so they cook individually.',
      },
      {
        stepNumber: 3,
        title: 'Simmer Dhoklis to Tender Perfection',
        instruction:
          'Cover and simmer on medium flame for 7 minutes. The dhoklis will cook through, float to the top, and thicken the golden dal stew into a comforting consistency.',
        timerSeconds: 420,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Cook until a dhokli cut in half shows no raw dough in the center.',
      },
      {
        stepNumber: 4,
        title: 'Sizzle Kathiyawadi Rai-Hing Desi Ghee Tadka',
        instruction:
          'In a tadka pan, heat Desi Ghee (20g). Empty Sachet 1: Kathiyawadi Rai-Hing Tadka Masala (mustard seeds, hing, cumin, fenugreek, dry red chillies). Sizzle for 30 seconds and pour over the hot dal. Garnish with fresh coriander.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve piping hot in deep bowls with an extra dollop of desi ghee.',
      },
    ],
    reviews: [
      {
        id: 'rev-307',
        userName: 'Nirav Patel',
        userCity: 'Ahmedabad',
        rating: 5,
        comment:
          'Authentic sweet, sour, and spicy Gujarati taste! Just like mom makes on Sunday afternoons.',
        date: '6 days ago',
        verifiedBuyer: true,
        helpfulCount: 28,
      },
    ],
    salesByRegion: {
      West: 1380,
      North: 810,
      South: 320,
    },
  },
  {
    id: 'kit-308',
    name: 'Creamy Wild Mushroom & Corn Chowder Kit',
    hindiName: 'मशरूम और कॉर्न चाउडर सूप',
    slug: 'creamy-wild-mushroom-corn-chowder',
    tagline:
      'Velvety golden sweet corn and sautéed button mushroom chowder with thyme, cracked black pepper & garlic croutons',
    description:
      'A rich, comforting Continental chowder loaded with sweet golden corn kernels and pan-seared earthy mushrooms. Simmered in herb-infused cream and served with crispy herb-garlic croutons.',
    heroImage:
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 259,
    originalPrice: 299,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 18,
    diet: 'veg',
    cuisine: 'Continental',
    dishCategory: 'Soups & Stews',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
    cities: [],
    stockByRegion: { North: 40, South: 35, West: 45, East: 25 },
    rating: 4.8,
    reviewCount: 129,
    nutrition: {
      calories: 360,
      protein: 9,
      carbs: 42,
      fat: 18,
      fiber: 5,
    },
    allergens: ['Dairy (Butter & Cream)', 'Gluten / Wheat (Croutons)'],
    ingredients: [
      { name: 'Button Mushrooms', quantity: '100g' },
      { name: 'Shiitake Mushrooms', quantity: '80g' },
      { name: 'Sweet Corn Kernels', quantity: '150g' },
      { name: 'Cooking Cream', quantity: '100ml' },
      { name: 'Salted Butter', quantity: '25g' },
      { name: 'Garlic Herb Croutons', quantity: '40g' },
      {
        name: 'Thyme & White Pepper Chowder Dust',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['French Thyme & White Pepper Chowder Dust'],
    sachets: [
      {
        id: 'sachet-308-1',
        name: 'French Thyme & White Pepper Chowder Dust',
        weight: '8g',
        spices: [
          { name: 'Dried Thyme', quantity: '3g' },
          { name: 'White Pepper Powder', quantity: '2.5g' },
          { name: 'Sea Salt & Onion Powder', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Sliced Wild Mushrooms in Butter',
        instruction:
          'Melt Fresh Butter (25g) in a soup pot over medium heat. Sauté Sliced Cremini & Shiitake Mushrooms (150g) and diced onions (50g) for 3.5 minutes until golden brown.',
        timerSeconds: 210,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Caramelizing mushrooms in butter builds deep savory umami broth foundation.',
      },
      {
        stepNumber: 2,
        title: 'Add Sweet Corn & Velvety Broth',
        instruction:
          'Add Golden Sweet Corn Kernels (120g), Sachet 1: French Thyme & White Pepper Chowder Dust, and 1.5 cups vegetable broth. Bring to a gentle boil for 5 minutes.',
        timerSeconds: 300,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'French thyme and mild white pepper infuse delicate herbal warmth without darkening the creamy chowder.',
      },
      {
        stepNumber: 3,
        title: 'Enrich with Heavy Cooking Cream',
        instruction:
          'Lower heat to gentle simmer. Pour in the Heavy Cooking Cream (80ml). Simmer for 3 minutes, stirring constantly until chowder turns velvety, rich, and lightly thickened.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Keep the heat low after adding cream so it stays smooth and silky.',
      },
      {
        stepNumber: 4,
        title: 'Crown with Garlic Herb Croutons & Serve',
        instruction:
          'Ladle hot chowder into warmed soup bowls. Scatter Sachet 2: Crunchy Roasted Garlic Herb Croutons (40g) and chopped fresh chives on top right before serving.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Add croutons at the table so they maintain maximum crisp crunch.',
      },
    ],
    reviews: [
      {
        id: 'rev-308',
        userName: 'Tanya Dsouza',
        userCity: 'Mumbai',
        rating: 5,
        comment:
          'So creamy and comforting on a rainy evening! The croutons stayed crunchy and delicious.',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 20,
      },
    ],
    salesByRegion: {
      West: 640,
      South: 520,
      North: 480,
    },
  },
  {
    id: 'kit-309',
    name: 'Authentic Puneri Misal Pav Kit',
    hindiName: 'पुणेरी मिसळ पाव',
    slug: 'authentic-puneri-misal-pav',
    tagline:
      'Fiery sprouted matki usal in deep red Pune kat (tarri) rassa with crisp farsan & fresh ladi pav',
    description:
      'The crown jewel of Pune street cuisine! Sprouted organic matki (moth beans) slow-simmered in an aromatic, fiery-red Puneri "kat" rassa made with roasted coconut and authentic goda masala. Layered with crunchy Kolhapuri farsan, chopped red onions, and lemon, served with buttered ladi pav.',
    heroImage:
      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 199,
    originalPrice: 249,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Maharashtrian',
    dishCategory: 'Street Food',
    spiceLevel: 'Fiery',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['West', 'South', 'North', 'East'],
    cities: ['Pune'],
    originCity: 'Pune',
    stockByRegion: { West: 120, South: 45, North: 30, East: 20 },
    rating: 4.95,
    reviewCount: 382,
    nutrition: {
      calories: 470,
      protein: 16,
      carbs: 64,
      fat: 17,
      fiber: 9,
    },
    allergens: ['Gluten / Wheat (Ladi Pav & Farsan)'],
    ingredients: [
      { name: 'Sprouted Moth Beans', quantity: '200g' },
      { name: 'Ladi Pav', quantity: '4 pcs' },
      { name: 'Farsan', quantity: '90g' },
      { name: 'Diced Red Onions', quantity: '60g' },
      { name: 'Coriander Leaves', quantity: '20g' },
      { name: 'Lemon', quantity: '1 pc' },
      {
        name: 'Goda Masala & Hing Tadka',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Teja Kat Tarri Gravy Paste',
        quantity: '35g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Puneri Goda Masala & Hing Tadka', 'Teja Kat Tarri Gravy Paste'],
    sachets: [
      {
        id: 'sachet-309-1',
        name: 'Puneri Goda Masala & Hing Tadka',
        weight: '15g',
        spices: [
          { name: 'Goda Masala', quantity: '8g' },
          { name: 'Cumin & Coriander Powder', quantity: '4g' },
          { name: 'Asafoetida (Hing) & Turmeric', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-309-2',
        name: 'Teja Kat Tarri Gravy Paste',
        weight: '35g',
        spices: [
          { name: 'Roasted Coconut & Onion Paste', quantity: '18g' },
          { name: 'Red Chilli Essence', quantity: '10g' },
          { name: 'Ginger Garlic & Spiced Oil Base', quantity: '7g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Sprouted Organic Matki Usal',
        instruction:
          'In a saucepan, boil the Sprouted Organic Matki (200g) in 1.5 cups water with 1/2 tsp turmeric and salt for 5 minutes until tender-soft yet retaining its shape. Drain and reserve cooking water.',
        timerSeconds: 300,
        imageUrl:
          'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
        tip: 'Do not overboil the sprouts; tender matki with a slight bite creates the best misal texture.',
      },
      {
        stepNumber: 2,
        title: 'Cook Fragrant Fiery Kat Tarri Gravy',
        instruction:
          'Heat 2 tbsp oil in a deep kadai. Add Sachet 1: Puneri Goda Masala & Hing Tadka and Sachet 2: Teja Kat Tarri Gravy Paste (charred onion-coconut paste with Byadgi chillies). Cook for 3 minutes, then add 2 cups water and simmer on medium flame for 6 minutes until fiery red oil (tarri) separates on top.',
        timerSeconds: 360,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Letting the gravy simmer gently allows the vibrant red tarri layer to float naturally to the surface.',
      },
      {
        stepNumber: 3,
        title: 'Butter-Toast Fresh Pune Ladi Pav',
        instruction:
          'Warm Fresh Pune Bakery Ladi Pav (4 pcs) on a hot tawa with 1 tbsp butter for 2 minutes until warm, soft, and lightly toasted.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Buttered ladi pav is the classic pairing to cut through the fiery misal tarri.',
      },
      {
        stepNumber: 4,
        title: 'Assemble Misal Bowls with Crunchy Farsan',
        instruction:
          'Layer boiled matki usal in deep bowls. Ladle generous amounts of boiling spicy kat tarri gravy over the sprouts. Top with Crispy Puneri Farsan (90g), finely chopped red onions, and fresh coriander. Squeeze fresh lemon and serve piping hot with warm pav.',
        timerSeconds: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'Serve extra kat tarri in a small metal wati on the side for authentic Pune street style!',
      },
    ],
    reviews: [
      {
        id: 'rev-309-1',
        userName: 'Sanket Kulkarni',
        userCity: 'Pune',
        rating: 5,
        comment:
          'Hands down the most authentic Puneri misal taste! The kat has that exact fiery kick and roasted coconut-goda aroma from FC Road.',
        date: '2 days ago',
        verifiedBuyer: true,
        helpfulCount: 46,
      },
    ],
    salesByRegion: {
      West: 1420,
      South: 310,
      North: 180,
    },
  },
  {
    id: 'kit-310',
    name: 'Puneri Pithla Bhakri & Thecha Kit',
    hindiName: 'झुणका-पिठलं भाकरी आणि खर्डा',
    slug: 'puneri-pithla-bhakri-thecha',
    tagline:
      'Velvety spiced gram flour pithla with stone-ground jowar bhakri & fiery green chilli garlic thecha',
    description:
      'The rustic soul of Maharashtra! Comforting, velvety gram flour (besan) seasoned with mustard seeds, curry leaves, garlic, and fresh green chillies. Served alongside wholesome stone-ground jowar bhakri flour and freshly pounded spicy green chilli garlic kharda (thecha).',
    heroImage:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 219,
    originalPrice: 269,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 18,
    diet: 'veg',
    cuisine: 'Maharashtrian',
    dishCategory: 'Curries & Gravies',
    spiceLevel: 'Spicy',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['West', 'South', 'North', 'East'],
    cities: ['Pune'],
    originCity: 'Pune',
    stockByRegion: { West: 95, South: 30, North: 20, East: 15 },
    rating: 4.88,
    reviewCount: 224,
    nutrition: {
      calories: 420,
      protein: 15,
      carbs: 58,
      fat: 14,
      fiber: 8,
    },
    allergens: [],
    ingredients: [
      { name: 'Roasted Chana Besan', quantity: '120g' },
      { name: 'Jowar Bhakri Flour', quantity: '200g' },
      { name: 'Green Chillies', quantity: '20g' },
      { name: 'Garlic Cloves', quantity: '30g' },
      { name: 'Curry Leaves', quantity: '8g' },
      { name: 'Mustard Seeds', quantity: '7g' },
      {
        name: 'Pithla Tempering Spice Blend',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Thecha Masala',
        quantity: '18g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Puneri Pithla Tempering Spice Blend', 'Authentic Maharashtrian Thecha Masala'],
    sachets: [
      {
        id: 'sachet-310-1',
        name: 'Puneri Pithla Tempering Spice Blend',
        weight: '12g',
        spices: [
          { name: 'Mustard Seeds & Cumin', quantity: '5g' },
          { name: 'Turmeric & Rock Salt', quantity: '4g' },
          { name: 'Asafoetida (Hing)', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-310-2',
        name: 'Authentic Maharashtrian Thecha Masala',
        weight: '18g',
        spices: [
          { name: 'Roasted Cumin Powder', quantity: '6g' },
          { name: 'Rock Salt & Garlic Flakes', quantity: '7g' },
          { name: 'Crushed Peanuts', quantity: '5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Whisk Lump-Free Besan Batter',
        instruction:
          'In a bowl, whisk Stone-Ground Gram Flour (Besan, 100g) with 1.5 cups water until completely smooth, lump-free, and pouring consistency.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Whisking besan with water before adding to the pan ensures lump-free, velvety pithla.',
      },
      {
        stepNumber: 2,
        title: 'Temper Aromatics & Cook Velvety Pithla',
        instruction:
          'Heat 2 tbsp peanut oil in a kadai. Add Sachet 1: Puneri Pithla Tempering Spice Blend (mustard, cumin, turmeric, hing) along with sliced garlic and green chillies. Pour in the besan batter, stir continuously on medium heat for 5 minutes until glossy and thick, then cover and steam for 3 minutes.',
        timerSeconds: 480,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Continuous stirring prevents lumps and creates that coveted glossy Maharashtrian texture.',
      },
      {
        stepNumber: 3,
        title: 'Prepare Pounded Garlic Thecha',
        instruction:
          'In a small bowl, mix Sachet 2: Authentic Maharashtrian Thecha Masala (roasted peanuts, dry garlic, coarse cumin) with 1 tsp hot oil or ghee into a coarse, fiery green chutney condiment.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Pounded thecha brings spicy rustic pungency that cuts through comforting pithla.',
      },
      {
        stepNumber: 4,
        title: 'Toast Jowar Bhakris on Cast Iron Tawa',
        instruction:
          'Place Traditional Jowar Bhakris (2 pcs) on a hot cast iron tawa. Sprinkle a few drops of water, flip and roast for 2 minutes per side until puffed and charred with golden spots. Serve hot with pithla, thecha, and raw onion wedges.',
        timerSeconds: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'A little fresh white butter (loni) melted over hot bhakri is heaven on a plate.',
      },
    ],
    reviews: [
      {
        id: 'rev-310-1',
        userName: 'Tanvi Joshi',
        userCity: 'Pune',
        rating: 5,
        comment:
          'Pithla was silky smooth and the thecha has the true rustic kick. Nostalgic Sinhagad fort vibes right at home!',
        date: '3 days ago',
        verifiedBuyer: true,
        helpfulCount: 31,
      },
    ],
    salesByRegion: {
      West: 980,
      South: 190,
      North: 110,
    },
  },
  {
    id: 'kit-311',
    name: 'Puneri Bhajani Thalipeeth Kit',
    hindiName: 'पुणेरी खमंग भाजणी थालीपीठ',
    slug: 'puneri-bhajani-thalipeeth',
    tagline:
      'Traditional roasted multigrain spiced flatbreads with fresh white butter & peanut thecha',
    description:
      'Handcrafted from authentic 5-grain roasted Bhajani flour (jowar, bajra, chana dal, rice, coriander seeds & cumin). Mixed with finely diced red onions, cilantro, and roasted sesame seeds, cooked crisp with a dollop of white homemade makkhan and peanut garlic chutney.',
    heroImage:
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 209,
    originalPrice: 249,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Maharashtrian',
    dishCategory: 'Street Food',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['West', 'South', 'North', 'East'],
    cities: ['Pune'],
    originCity: 'Pune',
    stockByRegion: { West: 85, South: 25, North: 20, East: 15 },
    rating: 4.9,
    reviewCount: 198,
    nutrition: {
      calories: 390,
      protein: 13,
      carbs: 52,
      fat: 15,
      fiber: 7,
    },
    allergens: ['Dairy (White Butter)'],
    ingredients: [
      { name: '5-Grain Bhajani Flour', quantity: '220g' },
      { name: 'Diced Red Onions', quantity: '80g' },
      { name: 'White Sesame Seeds', quantity: '15g' },
      { name: 'White Butter', quantity: '40g' },
      {
        name: 'Thalipeeth Seasoning',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Peanut Garlic Chutney',
        quantity: '25g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Puneri Thalipeeth Seasoning Sachet', 'Shengdana (Peanut) Garlic Chutney'],
    sachets: [
      {
        id: 'sachet-311-1',
        name: 'Puneri Thalipeeth Seasoning Sachet',
        weight: '15g',
        spices: [
          { name: 'Cumin & Ajwain', quantity: '6g' },
          { name: 'Red Chilli Powder & Turmeric', quantity: '5g' },
          { name: 'Black Salt & Sea Salt', quantity: '4g' },
        ],
      },
      {
        id: 'sachet-311-2',
        name: 'Shengdana (Peanut) Garlic Chutney',
        weight: '25g',
        spices: [
          { name: 'Roasted Peanuts', quantity: '14g' },
          { name: 'Garlic & Byadgi Chilli', quantity: '8g' },
          { name: 'Salt & Cumin', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Knead Spiced Bhajani Dough',
        instruction:
          'In a mixing bowl, combine Roasted Multigrain Bhajani Flour (200g, roasted jowar, bajra, chana, wheat, rice), Finely Chopped Onions (60g), Fresh Coriander, and Sachet 1: Puneri Thalipeeth Seasoning Sachet (ajwain, cumin, turmeric, red chilli, rock salt). Gradually add 1/2 cup warm water to knead into a soft, pliable dough.',
        timerSeconds: 180,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'The dough should be soft and moist—not stiff—so it pats out easily without cracking.',
      },
      {
        stepNumber: 2,
        title: 'Pat Out Thalipeeth with Traditional Center Holes',
        instruction:
          'Grease a sheet of butter paper or clean damp cloth with a few drops of oil. Take a lemon-sized portion of dough and pat it out gently with wet fingers into a 6-inch round flatbread. Make 3 small holes using your finger to let ghee circulate during roasting.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'The iconic center holes allow ghee to circulate and crisp the flatbread evenly from the inside out.',
      },
      {
        stepNumber: 3,
        title: 'Roast with Pure Desi Ghee Until Crisp',
        instruction:
          'Carefully invert thalipeeth onto a medium-hot cast iron tawa. Drizzle 1 tsp Pure Desi Ghee around edges and into the holes. Cover and cook on medium flame for 2.5 minutes, flip, drizzle ghee, and roast uncovered for 2 minutes until crispy and golden brown.',
        timerSeconds: 270,
        imageUrl:
          'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        tip: 'Cast iron tawa gives that signature authentic Maharashtrian roasted aroma.',
      },
      {
        stepNumber: 4,
        title: 'Serve with Fresh White Loni & Peanut Chutney',
        instruction:
          'Transfer hot crispy thalipeeth to plate. Place a generous scoop of Fresh White Butter (Loni, 30g) in the center, and serve with Sachet 2: Shengdana (Peanut) Garlic Chutney and cool curd.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'The white butter melting into the hot thalipeeth is an unforgettable breakfast indulgence.',
      },
    ],
    reviews: [
      {
        id: 'rev-311-1',
        userName: 'Aditya Deshmukh',
        userCity: 'Pune',
        rating: 5,
        comment:
          'Crispy edges, soft center, and the bhajani aroma is completely authentic. Best evening snack kit.',
        date: '5 days ago',
        verifiedBuyer: true,
        helpfulCount: 22,
      },
    ],
    salesByRegion: {
      West: 820,
      South: 160,
      North: 95,
    },
  },
  {
    id: 'kit-312',
    name: 'Puneri Sabudana Khichdi Kit',
    hindiName: 'पुणेरी साबुदाणा खिचडी',
    slug: 'puneri-sabudana-khichdi',
    tagline:
      'Non-sticky sago pearls tossed with roasted crushed peanuts, green chillies & pure desi ghee',
    description:
      'The iconic Pune breakfast favorite. Pre-soaked premium non-sticky sago pearls roasted in pure cow ghee with coarse roasted peanuts, cumin, diced potatoes, and spicy green chillies. Served with chilled spiced curd and sweet cucumber koshimbir.',
    heroImage:
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    ],
    price: 189,
    originalPrice: 229,
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 12,
    diet: 'veg',
    cuisine: 'Maharashtrian',
    dishCategory: 'Street Food',
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'gluten-free'],
    isTrending: true,
    availableRegions: ['West', 'South', 'North', 'East'],
    cities: ['Pune'],
    originCity: 'Pune',
    stockByRegion: { West: 90, South: 30, North: 25, East: 15 },
    rating: 4.92,
    reviewCount: 276,
    nutrition: {
      calories: 410,
      protein: 8,
      carbs: 68,
      fat: 13,
      fiber: 4,
    },
    allergens: ['Peanuts'],
    ingredients: [
      { name: 'Sabudana', quantity: '250g' },
      { name: 'Crushed Peanuts', quantity: '60g' },
      { name: 'Boiled Baby Potatoes', quantity: '80g' },
      { name: 'Desi Ghee', quantity: '30g' },
      { name: 'Green Chillies', quantity: '10g' },
      { name: 'Curry Leaves', quantity: '10g' },
      {
        name: 'Jeera & Sendha Namak Blend',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Puneri Khichdi Jeera & Sendha Namak Blend'],
    sachets: [
      {
        id: 'sachet-312-1',
        name: 'Puneri Khichdi Jeera & Sendha Namak Blend',
        weight: '10g',
        spices: [
          { name: 'Cumin Seeds', quantity: '4g' },
          { name: 'Sendha Namak (Rock Salt)', quantity: '4g' },
          { name: 'Cane Sugar Powder', quantity: '2g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Coat Sabudana with Roasted Peanuts & Seasoning',
        instruction:
          'In a bowl, take the perfectly soaked, fluffy Non-Sticky Sabudana Pearls (250g). Mix in the Coarsely Crushed Roasted Peanuts (70g) and Sachet 1: Puneri Khichdi Jeera & Sendha Namak Blend (whole jeera, rock salt, raw cane sugar). Mix gently with your fingers so every pearl is coated.',
        timerSeconds: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        tip: 'Mixing peanuts and rock salt with soaked sabudana beforehand prevents pearls from sticking together during cooking.',
      },
      {
        stepNumber: 2,
        title: 'Temper Cumin & Green Chillies in Desi Ghee',
        instruction:
          'Heat 2 tbsp Pure Desi Ghee in a heavy kadai over medium heat. Add Whole Cumin Seeds (1 tsp) and Slit Green Chillies (2 pcs). Sauté for 45 seconds until chillies blister lightly and ghee is fragrant.',
        timerSeconds: 45,
        imageUrl:
          'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80',
        tip: 'Desi ghee is traditional and gives sabudana khichdi its rich festive fragrance.',
      },
      {
        stepNumber: 3,
        title: 'Gentle Steam-Roast Khichdi on Low Flame',
        instruction:
          'Add the coated sabudana mixture and Diced Boiled Potatoes (60g) to the pan. Sauté gently on low-medium flame for 3 minutes, then cover tightly with lid and steam for 3 minutes until sabudana pearls turn soft and beautifully translucent.',
        timerSeconds: 360,
        imageUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        tip: 'Cook on low heat; sabudana turns completely translucent when fully cooked and tender.',
      },
      {
        stepNumber: 4,
        title: 'Finish with Lemon Juice & Fresh Coriander',
        instruction:
          'Remove lid, squeeze fresh lemon juice all over the hot khichdi, and toss gently with finely chopped fresh coriander leaves. Serve hot with a bowl of sweet spiced dahi.',
        timerSeconds: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        tip: 'A squeeze of fresh lemon balances the rich roasted peanuts and ghee.',
      },
    ],
    reviews: [
      {
        id: 'rev-312-1',
        userName: 'Pradnya Shinde',
        userCity: 'Pune',
        rating: 5,
        comment:
          'Perfect pearl separation! Ghee aroma and generous peanut crunch make it just like the authentic Pune Appa Balwant Chowk style.',
        date: '1 week ago',
        verifiedBuyer: true,
        helpfulCount: 28,
      },
    ],
    salesByRegion: {
      West: 1120,
      South: 240,
      North: 150,
    },
  },
];

export function getMealKitDefaultShelfLife(kit: Partial<MealKit>): {
  shelfLifeDays: number;
  shelfLife: string;
  storageCondition: string;
} {
  let shelfLifeDays = 4;
  let storageCondition = 'Refrigerated at 2°C - 5°C';

  if (
    kit.allergens?.some((a) => {
      const lower = a.toLowerCase();
      return (
        lower.includes('fish') ||
        lower.includes('prawn') ||
        lower.includes('shellfish') ||
        lower.includes('seafood')
      );
    })
  ) {
    shelfLifeDays = 2; // Fresh seafood
    storageCondition = 'Refrigerated at 0°C - 2°C';
  } else if (kit.diet === 'nonveg') {
    shelfLifeDays = 3; // Fresh meat & poultry
    storageCondition = 'Refrigerated at 2°C - 4°C';
  } else if (
    kit.allergens?.some((a) => {
      const lower = a.toLowerCase();
      return lower.includes('paneer') || lower.includes('dairy');
    })
  ) {
    shelfLifeDays = 3; // Fresh paneer & artisanal dairy
    storageCondition = 'Refrigerated at 2°C - 5°C';
  } else if (
    kit.dishCategory === 'Burgers & Sliders' ||
    kit.dishCategory === 'Tacos' ||
    kit.dishCategory === 'Pizzas'
  ) {
    shelfLifeDays = 5;
    storageCondition = 'Chilled Vacuum Pack (4°C)';
  } else if (kit.dishCategory === 'Pastas' || kit.dishCategory === 'Street Food') {
    shelfLifeDays = 6;
    storageCondition = 'Cool Dry Place & Chilled Sauces';
  }

  return {
    shelfLifeDays,
    shelfLife: `${shelfLifeDays} days (${storageCondition})`,
    storageCondition,
  };
}

export const INITIAL_MEAL_KITS: MealKit[] = BASE_INITIAL_MEAL_KITS.map((kit) => {
  const defaults = getMealKitDefaultShelfLife(kit);
  const shelfLifeDays = kit.shelfLifeDays || defaults.shelfLifeDays;
  const storageCondition = kit.storageCondition || defaults.storageCondition;
  const shelfLife = kit.shelfLife || `${shelfLifeDays} days (${storageCondition})`;

  return {
    ...kit,
    shelfLifeDays,
    shelfLife,
    storageCondition,
    tags:
      kit.tags && kit.tags.length > 0 ? kit.tags : compileMealKitTags({ ...kit, shelfLifeDays }),
  };
});

// In-memory catalog state with helper queries
let catalogStore: MealKit[] = [...INITIAL_MEAL_KITS];

export function getMealKits(): MealKit[] {
  return [...catalogStore];
}

export function getMealKitById(id: string): MealKit | undefined {
  return catalogStore.find((kit) => kit.id === id);
}

export interface FilterOptions {
  searchQuery?: string;
  diet?: 'all' | 'veg' | 'nonveg' | 'jain' | 'vegan' | 'keto' | 'gluten-free';
  cuisine?: CuisineType | 'All';
  dishCategory?: DishCategory | 'All';
  spiceLevel?: SpiceLevel | 'All';
  maxPrepTime?: number;
  maxPrice?: number;
  dietaryTags?: DietTag[];
  region?: RegionHub;
  city?: string; // filter to kits available in a specific city (case-insensitive). Kits with empty cities[] are shown to all cities in the hub.
  state?: string; // filter to kits available in a specific state
  subRegion?: string; // filter to kits available in a specific sub-region id
  sortBy?: 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime';
}

export function searchAndFilterMealKits(options: FilterOptions): MealKit[] {
  let results = [...catalogStore];

  // Search by meal name, ingredient, cuisine, dish category, tags, or allergens
  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    results = results.filter((kit) => {
      const matchName =
        kit.name.toLowerCase().includes(q) ||
        (kit.hindiName && kit.hindiName.includes(q)) ||
        kit.tagline.toLowerCase().includes(q) ||
        kit.description.toLowerCase().includes(q) ||
        kit.cuisine.toLowerCase().includes(q) ||
        (kit.dishCategory && kit.dishCategory.toLowerCase().includes(q));

      const matchIngredient = kit.ingredients.some((ing) => ing.name.toLowerCase().includes(q));

      const matchSachet = kit.masalaSachets.some((sachet) => sachet.toLowerCase().includes(q));

      const matchTags = kit.tags ? kit.tags.some((t) => t.toLowerCase().includes(q)) : false;

      const matchAllergens = kit.allergens
        ? kit.allergens.some((a) => a.toLowerCase().includes(q))
        : false;

      const matchDiet = kit.diet ? kit.diet.toLowerCase().includes(q) : false;

      const matchRegion =
        kit.availableRegions && kit.availableRegions.some((r) => r.toLowerCase().includes(q));

      return (
        matchName ||
        matchIngredient ||
        matchSachet ||
        matchTags ||
        matchAllergens ||
        matchDiet ||
        matchRegion
      );
    });
  }

  // Filter by diet
  if (options.diet && options.diet !== 'all') {
    if (options.diet === 'veg') {
      results = results.filter((kit) => kit.diet === 'veg' || kit.dietaryTags.includes('veg'));
    } else if (options.diet === 'nonveg') {
      results = results.filter((kit) => kit.diet === 'nonveg');
    } else {
      results = results.filter((kit) => kit.dietaryTags.includes(options.diet as DietTag));
    }
  }

  // Filter by dietary tags multi-select
  if (options.dietaryTags && options.dietaryTags.length > 0) {
    results = results.filter((kit) =>
      options.dietaryTags!.some((tag) => kit.dietaryTags.includes(tag)),
    );
  }

  // Filter by cuisine
  if (options.cuisine && options.cuisine !== 'All') {
    results = results.filter((kit) => kit.cuisine === options.cuisine);
  }

  // Filter by dish category
  if (options.dishCategory && options.dishCategory !== 'All') {
    results = results.filter((kit) => kit.dishCategory === options.dishCategory);
  }

  // Filter by spice level
  if (options.spiceLevel && options.spiceLevel !== 'All') {
    results = results.filter((kit) => kit.spiceLevel === options.spiceLevel);
  }

  // Filter by max prep time
  if (options.maxPrepTime) {
    results = results.filter(
      (kit) => kit.prepTimeMinutes + kit.cookTimeMinutes <= options.maxPrepTime!,
    );
  }

  // Filter by max price
  if (options.maxPrice) {
    results = results.filter((kit) => kit.price <= options.maxPrice!);
  }

  // Filter by region availability
  if (options.region) {
    results = results.filter((kit) => kit.availableRegions.includes(options.region!));
  }

  // Filter by city — kits with an empty cities[] are available to ALL cities in their hub
  if (options.city && options.city.trim()) {
    const targetCity = options.city.trim().toLowerCase();
    results = results.filter(
      (kit) =>
        !kit.cities ||
        kit.cities.length === 0 ||
        kit.cities.some((c) => c.toLowerCase() === targetCity),
    );
  }

  // Filter by state — kits with no availableStates are available in all states
  if (options.state && options.state.trim()) {
    const targetState = options.state.trim().toLowerCase();
    results = results.filter(
      (kit) =>
        !kit.availableStates ||
        kit.availableStates.length === 0 ||
        kit.availableStates.some((s) => s.toLowerCase() === targetState),
    );
  }

  // Filter by sub-region — kits with no subRegions are available in all sub-regions in the city
  if (options.subRegion && options.subRegion.trim()) {
    const targetSR = options.subRegion.trim().toLowerCase();
    results = results.filter(
      (kit) =>
        !kit.subRegions ||
        kit.subRegions.length === 0 ||
        kit.subRegions.some((sr) => sr.toLowerCase() === targetSR),
    );
  }

  // Sort
  if (options.sortBy) {
    switch (options.sortBy) {
      case 'priceLowHigh':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'priceHighLow':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'prepTime':
        results.sort(
          (a, b) => a.prepTimeMinutes + a.cookTimeMinutes - (b.prepTimeMinutes + b.cookTimeMinutes),
        );
        break;
      case 'popularity':
      default:
        results.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
        break;
    }
  }

  return results;
}

// Admin Catalog Operations
const mealKitsListeners = new Set<() => void>();

const CUSTOM_MEAL_KITS_KEY = '@rasoi_custom_meal_kits_v1';
const CHEF_SUBMISSIONS_STORAGE_KEY = '@rasoi_genie_chef_submissions_v1';

function persistCustomKits(): void {
  try {
    const initialIds = new Set(INITIAL_MEAL_KITS.map((k) => k.id));
    const custom = catalogStore.filter((k) => !initialIds.has(k.id) || k.isChefSpecial || k.chefId);
    const json = JSON.stringify(custom);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CUSTOM_MEAL_KITS_KEY, json);
    }
  } catch (e) {
    console.warn('[MealKitsService] Error persisting custom kits:', e);
  }
}

export function isFillerMealKit(kit: MealKit | { id: string; name?: string }): boolean {
  const id = kit.id || '';
  const name = (kit.name || '').toLowerCase();

  // Generated city templates and test kits
  if (id.startsWith('city-')) return true;
  if (id.startsWith('pune-spec-')) return true;
  if (id.startsWith('kit-test-')) return true;
  if (id.startsWith('e2e-kit-')) return true;
  if (id.startsWith('temp-')) return true;
  if (id.startsWith('test-')) return true;
  if (id.startsWith('chef-submission-')) return true;
  if (id.startsWith('kit-custom-zafrani')) return true;

  // Junk test recipe names
  if (name.includes('experimental spicy dish')) return true;
  if (name.includes('kashmiri rogan josh special')) return true;
  if (name.includes('dummy') || name.startsWith('test ') || name === 'test' || name === 'temp')
    return true;
  if (name.includes('dwqd dsadas')) return true;

  return false;
}

function loadCustomKitsSync(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 1. Load directly saved custom meal kits (filtering out any filler kits)
      const rawCustom = window.localStorage.getItem(CUSTOM_MEAL_KITS_KEY);
      if (rawCustom) {
        const parsed: MealKit[] = JSON.parse(rawCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanCustom = parsed.filter((k) => !isFillerMealKit(k));
          window.localStorage.setItem(CUSTOM_MEAL_KITS_KEY, JSON.stringify(cleanCustom));

          const map = new Map<string, MealKit>();
          for (const k of catalogStore) map.set(k.id, k);
          for (const k of cleanCustom) map.set(k.id, k);
          catalogStore = Array.from(map.values());
        }
      }

      // 2. Also check published chef submissions (filtering out test submissions)
      const rawChefSubs = window.localStorage.getItem(CHEF_SUBMISSIONS_STORAGE_KEY);
      if (rawChefSubs) {
        const subs = JSON.parse(rawChefSubs);
        if (Array.isArray(subs)) {
          const published = subs.filter(
            (s: any) => s.submissionStatus === 'published' && !isFillerMealKit(s),
          );
          for (const s of published) {
            if (!catalogStore.some((k) => k.id === s.id)) {
              const heroImg =
                s.heroImage ||
                'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80';
              const kit: MealKit = {
                id: s.id,
                name: s.name,
                slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                tagline: s.tagline || '',
                description: s.description || '',
                heroImage: heroImg,
                galleryImages:
                  s.galleryImages && s.galleryImages.length > 0 ? s.galleryImages : [heroImg],
                price: s.price || 299,
                originalPrice: s.price || 299,
                servings: s.servings || 2,
                prepTimeMinutes: s.prepTimeMinutes || 15,
                cookTimeMinutes: s.cookTimeMinutes || 30,
                diet: s.diet || 'veg',
                cuisine: s.cuisine || 'North Indian',
                dishCategory: s.dishCategory || 'Curries & Gravies',
                spiceLevel: s.spiceLevel || 'Medium',
                difficulty: 'Chef Special',
                dietaryTags:
                  s.dietaryTags && s.dietaryTags.length > 0 ? s.dietaryTags : [s.diet || 'veg'],
                allergens: s.allergens || [],
                ingredients: s.ingredients || [],
                recipeSteps: s.recipeSteps || [],
                availableRegions: (s.availableRegions && s.availableRegions.length > 0
                  ? s.availableRegions
                  : ['North', 'South', 'West', 'East']) as RegionHub[],
                availableStorageCentres: s.availableStorageCentres || [],
                cities: s.cities || [],
                stockByRegion: { North: 99, South: 99, West: 99, East: 99 },
                isChefSpecial: true,
                chefId: s.chefId,
                chefName: s.chefName,
                submissionStatus: 'published',
                rating: 5.0,
                reviewCount: 0,
                nutrition: { calories: 450, protein: 15, carbs: 40, fat: 12, fiber: 5 },
                masalaSachets: [],
                reviews: [],
                salesByRegion: { North: 0, South: 0, West: 0, East: 0 },
              };
              catalogStore.unshift(kit);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[MealKitsService] Error loading custom kits sync:', e);
  }
}

/**
 * Purges all junk/filler meal kits from memory catalogStore and local device storage.
 * Leaves authentic meal kits (kit-101..312 and authentic chef submissions) intact.
 */
export function purgeFillerMealKits(): number {
  const initialLength = catalogStore.length;
  catalogStore = catalogStore.filter((kit) => !isFillerMealKit(kit));
  const purgedCount = initialLength - catalogStore.length;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawCustom = window.localStorage.getItem(CUSTOM_MEAL_KITS_KEY);
      if (rawCustom) {
        const parsed: MealKit[] = JSON.parse(rawCustom);
        const cleaned = (Array.isArray(parsed) ? parsed : []).filter((k) => !isFillerMealKit(k));
        window.localStorage.setItem(CUSTOM_MEAL_KITS_KEY, JSON.stringify(cleaned));
      }

      const rawChef = window.localStorage.getItem(CHEF_SUBMISSIONS_STORAGE_KEY);
      if (rawChef) {
        const parsedSubs = JSON.parse(rawChef);
        const cleanedSubs = (Array.isArray(parsedSubs) ? parsedSubs : []).filter(
          (s) => !isFillerMealKit(s),
        );
        window.localStorage.setItem(CHEF_SUBMISSIONS_STORAGE_KEY, JSON.stringify(cleanedSubs));
      }
    } catch (e) {
      console.warn('[MealKitsService] Error purging storage:', e);
    }
  }

  persistCustomKits();
  notifyMealKitsChanged();
  return purgedCount;
}

// Hydrate and sanitize custom kits immediately
loadCustomKitsSync();
purgeFillerMealKits();

export function subscribeToMealKits(listener: (kits: MealKit[]) => void): () => void {
  mealKitsListeners.add(listener as any);
  return () => {
    mealKitsListeners.delete(listener as any);
  };
}

export function notifyMealKitsChanged(): void {
  const current = [...catalogStore];
  mealKitsListeners.forEach((fn: any) => {
    try {
      fn(current);
    } catch (e) {
      console.error('[MealKitsService] Error in listener:', e);
    }
  });
}

export async function syncMealKitsWithSupabase(): Promise<MealKit[]> {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return [...catalogStore];
    }
    const { fetchPublishedMealKitsFromSupabase } = await import('./supabaseMealKitsService');
    const liveKits = await fetchPublishedMealKitsFromSupabase();
    if (liveKits && liveKits.length > 0) {
      // Merge liveKits with any locally stored custom / chef kits that might not yet be in remote DB
      const initialIds = new Set(INITIAL_MEAL_KITS.map((k) => k.id));
      const customLocal = catalogStore.filter(
        (k) => !initialIds.has(k.id) || k.isChefSpecial || k.chefId,
      );

      const map = new Map<string, MealKit>();
      for (const k of liveKits) map.set(k.id, k);
      for (const k of customLocal) {
        if (!map.has(k.id)) map.set(k.id, k);
      }
      catalogStore = Array.from(map.values());
      persistCustomKits();
      notifyMealKitsChanged();
    }
    return [...catalogStore];
  } catch (err) {
    console.warn('[MealKitsService] sync failed, retaining catalogStore:', err);
    return [...catalogStore];
  }
}

// Auto-sync in background on module load (skip in unit test runner)
if (
  typeof setTimeout !== 'undefined' &&
  (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')
) {
  setTimeout(() => {
    syncMealKitsWithSupabase().catch(() => {});
  }, 100);
}

export function addMealKit(newKit: MealKit): void {
  const kitWithDates: MealKit = {
    ...newKit,
    createdAt: newKit.createdAt || new Date().toISOString(),
    updatedAt: newKit.updatedAt || new Date().toISOString(),
  };
  catalogStore = [kitWithDates, ...catalogStore.filter((k) => k.id !== kitWithDates.id)];
  persistCustomKits();
  notifyMealKitsChanged();
}

export function updateMealKit(id: string, updatedFields: Partial<MealKit>): void {
  catalogStore = catalogStore.map((kit) => (kit.id === id ? { ...kit, ...updatedFields } : kit));
  persistCustomKits();
  notifyMealKitsChanged();
}

export function deleteMealKit(id: string): void {
  catalogStore = catalogStore.filter((kit) => kit.id !== id);
  persistCustomKits();
  notifyMealKitsChanged();
}

/**
 * Realtime synchronization helpers that update the in-memory catalog store
 * WITHOUT any write-back to Supabase (preventing echo loops).
 */
export function applyRealtimeMealKitInsert(kit: MealKit): void {
  catalogStore = [kit, ...catalogStore.filter((k) => k.id !== kit.id)];
  persistCustomKits();
  notifyMealKitsChanged();
}

export function applyRealtimeMealKitUpdate(id: string, updatedFields: Partial<MealKit>): void {
  catalogStore = catalogStore.map((kit) => (kit.id === id ? { ...kit, ...updatedFields } : kit));
  persistCustomKits();
  notifyMealKitsChanged();
}

export function applyRealtimeMealKitDelete(id: string): void {
  catalogStore = catalogStore.filter((kit) => kit.id !== id);
  persistCustomKits();
  notifyMealKitsChanged();
}

export function updateMealKitStock(id: string, region: RegionHub, stock: number): void {
  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      const updatedStockByRegion = {
        ...kit.stockByRegion,
        [region]: stock,
      };
      // Check if all regional stock is zero
      const totalStock = Object.values(updatedStockByRegion).reduce(
        (acc, val) => acc + (Number(val) || 0),
        0,
      );
      return {
        ...kit,
        stockByRegion: updatedStockByRegion,
        isOutOfStock: totalStock === 0 ? true : kit.isOutOfStock,
      };
    }
    return kit;
  });
  notifyMealKitsChanged();
}

/**
 * Deducts inventory stock for a meal kit in a specific region hub.
 * If region stock or total stock drops to 0, automatically marks the item as out of stock.
 */
export function deductMealKitStock(
  id: string,
  region: RegionHub,
  quantity: number,
): { updatedKit?: MealKit; remainingStock: number; wentOutOfStock: boolean } {
  let wentOutOfStock = false;
  let remainingStock = 0;
  let updatedKit: MealKit | undefined;

  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      const currentStock = kit.stockByRegion?.[region] ?? 0;
      remainingStock = Math.max(0, currentStock - quantity);
      const isNowZero = remainingStock === 0;

      const updatedStockByRegion = {
        ...kit.stockByRegion,
        [region]: remainingStock,
      };

      const totalRemainingAcrossRegions = Object.values(updatedStockByRegion).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      );

      const shouldMarkOutOfStock = isNowZero || totalRemainingAcrossRegions === 0;
      if (shouldMarkOutOfStock && !kit.isOutOfStock) {
        wentOutOfStock = true;
      }

      updatedKit = {
        ...kit,
        stockByRegion: updatedStockByRegion,
        isOutOfStock: shouldMarkOutOfStock ? true : kit.isOutOfStock,
      };
      return updatedKit;
    }
    return kit;
  });

  notifyMealKitsChanged();
  return { updatedKit, remainingStock, wentOutOfStock };
}

/**
 * Restores/reverts inventory stock for a meal kit in a specific region hub.
 * Used when an admin cancels an order.
 * If the item was marked out of stock and now has positive stock restored, it can be marked back in stock.
 */
export function restoreMealKitStock(
  id: string,
  region: RegionHub,
  quantity: number,
): { updatedKit?: MealKit; restoredStock: number; backInStock: boolean } {
  let backInStock = false;
  let restoredStock = 0;
  let updatedKit: MealKit | undefined;

  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      const currentStock = kit.stockByRegion?.[region] ?? 0;
      restoredStock = currentStock + quantity;

      const updatedStockByRegion = {
        ...kit.stockByRegion,
        [region]: restoredStock,
      };

      if (kit.isOutOfStock && restoredStock > 0) {
        backInStock = true;
      }

      updatedKit = {
        ...kit,
        stockByRegion: updatedStockByRegion,
        isOutOfStock: backInStock ? false : kit.isOutOfStock,
      };
      return updatedKit;
    }
    return kit;
  });

  notifyMealKitsChanged();
  return { updatedKit, restoredStock, backInStock };
}

export interface FreshnessInfo {
  shelfLifeDays: number;
  storageCondition: string;
  batchExpiryDate: string;
  daysRemaining: number;
  status: 'fresh' | 'near_expiry' | 'expired';
  statusLabel: string;
}

/**
 * Calculates current freshness metrics and expiration information for a meal kit.
 */
export function calculateMealKitFreshness(
  kit: Partial<MealKit>,
  batchDate?: string | Date,
): FreshnessInfo {
  const defaults = getMealKitDefaultShelfLife(kit);
  const shelfLifeDays = kit.shelfLifeDays ?? defaults.shelfLifeDays;
  const storageCondition = kit.storageCondition ?? defaults.storageCondition;

  const baseDate = batchDate ? new Date(batchDate) : new Date();
  const expiry = new Date(baseDate.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let status: 'fresh' | 'near_expiry' | 'expired' = 'fresh';
  let statusLabel = `Fresh (${daysRemaining}d shelf life)`;

  if (diffMs <= 0 || daysRemaining === 0) {
    status = 'expired';
    statusLabel = 'Expired';
  } else if (daysRemaining <= 1) {
    status = 'near_expiry';
    statusLabel = 'Near Expiry (1d left)';
  } else if (daysRemaining <= 2) {
    status = 'near_expiry';
    statusLabel = `Expiring Soon (${daysRemaining}d)`;
  }

  return {
    shelfLifeDays,
    storageCondition,
    batchExpiryDate: expiry.toISOString().split('T')[0] || '',
    daysRemaining,
    status,
    statusLabel,
  };
}

/**
 * Updates the shelf life and storage conditions of a meal kit in the catalog.
 */
export function updateMealKitShelfLife(
  id: string,
  shelfLifeDays: number,
  storageCondition?: string,
): void {
  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      const condition = storageCondition || kit.storageCondition || 'Refrigerated at 2°C - 5°C';
      return {
        ...kit,
        shelfLifeDays,
        shelfLife: `${shelfLifeDays} days (${condition})`,
        storageCondition: condition,
      };
    }
    return kit;
  });
  notifyMealKitsChanged();
}

export function toggleMealKitTrending(id: string, isTrending?: boolean): MealKit | undefined {
  let updatedKit: MealKit | undefined;
  if (!catalogStore.some((kit) => kit.id === id)) {
    const fallback = INITIAL_MEAL_KITS.find((k) => k.id === id);
    if (fallback) {
      catalogStore.push(fallback);
    }
  }
  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      const nextTrending = typeof isTrending === 'boolean' ? isTrending : !kit.isTrending;
      updatedKit = {
        ...kit,
        isTrending: nextTrending,
      };
      return updatedKit;
    }
    return kit;
  });
  notifyMealKitsChanged();
  return updatedKit;
}
