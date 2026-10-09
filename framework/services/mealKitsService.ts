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
      { name: 'Fresh Malai Paneer Cubes', quantity: '250g' },
      { name: 'Fresh Tomato Puree Pouch', quantity: '180g' },
      { name: 'Cashew & Melon Seed Paste', quantity: '45g' },
      { name: 'White Butter', quantity: '20g' },
      { name: 'Fresh Cream', quantity: '10g' },
      {
        name: 'Sachet 1: Whole Khada Masala (Cardamom, Clove, Cinnamon, Bayleaf)',
        quantity: '8g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Shahi Gravy Premix (Kashmiri Mirch, Coriander, Ginger)',
        quantity: '18g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 3: Roasted Kasuri Methi & Garam Masala Aroma Finish',
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
          'Heat 1 tbsp butter and 1 tsp oil in a pan over medium heat. Empty Sachet 1 (Whole Khada Masala) and stir until fragrant crackles begin.',
        timerSeconds: 45,
        tip: 'Keep flame on medium to avoid burning the green cardamoms.',
      },
      {
        stepNumber: 2,
        title: 'Sauté Tomato Puree & Cashew Paste',
        instruction:
          'Pour the tomato puree and cashew paste pouch into the pan. Stir vigorously for 4 minutes until the butter starts separating gently at the edges.',
        timerSeconds: 240,
        tip: 'Stirring continuously keeps the cashew paste silky smooth.',
      },
      {
        stepNumber: 3,
        title: 'Add Shahi Gravy Sachet & Simmer',
        instruction:
          'Add 1/2 cup warm water along with Sachet 2 (Shahi Gravy Premix). Stir well and bring to a gentle rolling simmer.',
        timerSeconds: 180,
      },
      {
        stepNumber: 4,
        title: 'Fold in Paneer & Aroma Finish',
        instruction:
          'Gently slide the fresh paneer cubes into the sauce. Simmer for 3 minutes. Finish by rubbing Sachet 3 (Kasuri Methi & Garam Masala) between your palms and sprinkling over the gravy with cream.',
        timerSeconds: 180,
        tip: 'Do not overcook the paneer so it stays soft and tender.',
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
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Marinated Tender Chicken Cuts', quantity: '450g' },
      { name: 'Royal Aged Basmati Rice', quantity: '300g' },
      { name: 'Crispy Fried Barista Onions', quantity: '60g' },
      { name: 'Pure Desi Ghee', quantity: '20ml' },
      { name: 'Saffron Strands', quantity: '5ml' },
      {
        name: 'Sachet 1: Biryani Marinade Booster (Shahi Jeera, Mace, Star Anise)',
        quantity: '12g',
        isMasalaSachet: true,
      },
      { name: 'Sachet 2: Rice Parboiling Whole Spices', quantity: '10g', isMasalaSachet: true },
      {
        name: 'Sachet 3: Dum Layering Potpourri & Mint Sachet',
        quantity: '8g',
        isMasalaSachet: true,
      },
      { name: 'Sachet 4: Rose & Kewra Aroma Mist Pouch', quantity: '5ml', isMasalaSachet: true },
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
          'Boil 1.5 litres water with Sachet 2 (Rice Parboiling Spices) and 1 tbsp salt. Add soaked rice and cook to 70% done (about 6 minutes). Drain immediately.',
        timerSeconds: 360,
        tip: 'The rice grain should break into three parts when pinched.',
      },
      {
        stepNumber: 2,
        title: 'Layer Chicken in Heavy-Bottom Handi',
        instruction:
          'Arrange marinated chicken in the base of a heavy pot. Sprinkle half the fried onions and Sachet 1 Booster.',
        timerSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Layer Rice, Saffron & Desi Ghee',
        instruction:
          'Spread the parboiled rice over the chicken evenly. Drizzle saffron ghee, remaining barista onions, and sprinkle Sachet 3 & 4.',
        timerSeconds: 120,
      },
      {
        stepNumber: 4,
        title: 'Seal & Dum Cook',
        instruction:
          'Cover tightly with lid and place on high flame for 5 minutes, then reduce to lowest simmer for 18 minutes. Rest for 10 minutes before opening.',
        timerSeconds: 1080,
        tip: 'Keep lid tightly closed to let the trapped aromatic steam tenderize the chicken.',
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
      { name: 'Pre-Cooked Slow-Brew Black Lentils (Urad Dal)', quantity: '280g' },
      { name: 'Pre-Cooked Rajma (Kidney Beans)', quantity: '70g' },
      { name: 'Artisanal White Butter', quantity: '25g' },
      { name: 'Fresh Cream', quantity: '15g' },
      { name: 'Tomato Garlic Reduction Base', quantity: '120g' },
      {
        name: 'Sachet 1: Smoked Kashmiri Chilli & Degi Mirch Premix',
        quantity: '10g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Clove & Nutmeg Slow-Roast Spice Dust',
        quantity: '6g',
        isMasalaSachet: true,
      },
      { name: 'Sachet 3: Sun-Dried Kasuri Methi Sachet', quantity: '4g', isMasalaSachet: true },
    ],
    masalaSachets: [
      'Smoked Kashmiri Mirch Premix',
      'Clove & Nutmeg Slow-Roast Dust',
      'Sun-Dried Kasuri Methi',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Aromatics in Butter',
        instruction:
          'Melt half the white butter in a saucepan. Add the tomato garlic reduction and Sachet 1. Cook for 3 minutes.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Add Lentils & Slow Mash',
        instruction:
          'Add pre-cooked lentils with 1/2 cup water. Lightly mash with back of spoon to release starches and create velvety body.',
        timerSeconds: 300,
      },
      {
        stepNumber: 3,
        title: 'Simmer with White Butter & Spice Dust',
        instruction:
          'Stir in Sachet 2, remaining white butter, and fresh cream. Simmer gently for 12 minutes until lustrous and thick.',
        timerSeconds: 720,
      },
      {
        stepNumber: 4,
        title: 'Kasuri Methi Garnish',
        instruction:
          'Crush Sachet 3 between fingertips and swirl in. Serve with warm naan or jeera rice.',
        timerSeconds: 30,
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
      { name: 'Fresh De-Veined Tiger Prawns', quantity: '300g' },
      { name: 'Pure Cow Desi Ghee Pouch', quantity: '50ml' },
      { name: 'Mangalorean Stone-Ground Byadgi Chili Paste', quantity: '80g' },
      { name: 'Tamarind & Jaggery Extract Pouch', quantity: '25g' },
      { name: 'Fresh Curry Leaves Sprig', quantity: '10 leaves' },
      {
        name: 'Sachet 1: Ghee Roast Cumin-Fennel Roasted Powder',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Peppercorn & Stone Flower Finishing Masala',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Ghee Roast Cumin-Fennel Spice Blend', 'Peppercorn & Kalpasi Finishing Masala'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sear Prawns in Ghee',
        instruction:
          'Heat 2 tbsp desi ghee in a heavy pan. Sear prawns on high flame for 1.5 minutes per side until pink. Set aside.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Roast Byadgi Masala Paste',
        instruction:
          'In remaining ghee, add curry leaves and Byadgi chili paste. Cook on low heat until glistening red oil separates.',
        timerSeconds: 300,
      },
      {
        stepNumber: 3,
        title: 'Glaze with Tamarind & Spice Sachets',
        instruction:
          'Add tamarind extract, Sachet 1, and 2 tbsp water. Simmer until sauce is thick and coats the back of a spoon.',
        timerSeconds: 180,
      },
      {
        stepNumber: 4,
        title: 'Toss Prawns in Fiery Masala',
        instruction:
          'Return seared prawns to the pan. Toss continuously on high heat for 2 minutes. Dust with Sachet 2 and serve piping hot.',
        timerSeconds: 120,
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
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Layered Flaky Paratha Dough Sheets (4 pcs)', quantity: '4 pcs' },
      { name: 'Spiced Paneer Batons', quantity: '220g' },
      { name: 'Pickled Onion & Green Chili Salad', quantity: '80g' },
      { name: 'Authentic Kasundi Mustard Dip Pouch', quantity: '40g' },
      {
        name: 'Sachet 1: Kolkata Chaat & Roasted Cumin Dust',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Kolkata Street Chaat & Bhuna Jeera Spice Blend'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toss Paneer on Hot Tawa',
        instruction:
          'Sear spiced paneer batons on a greased griddle for 3 minutes until lightly charred edges form.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Crisp the Flaky Parathas',
        instruction:
          'Cook parathas on medium-high heat with a dab of butter until golden spots appear on both sides.',
        timerSeconds: 180,
      },
      {
        stepNumber: 3,
        title: 'Assemble & Roll',
        instruction:
          'Place paneer in center of paratha, top with pickled onions, sprinkle Sachet 1, and drizzle tangy Kasundi. Roll snugly in butter paper.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Fresh Cut Cauliflower Florets', quantity: '300g' },
      { name: 'Almond & Coconut Velvet Cream Base', quantity: '150ml' },
      { name: 'Smoked Tikka Marinade Paste', quantity: '50g' },
      {
        name: 'Sachet 1: Garam Masala & Fenugreek Low-Carb Blend',
        quantity: '10g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Keto Tikka Roasted Spice Blend'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Roast Florets',
        instruction:
          'Pan-roast the spiced cauliflower in 1 tbsp olive oil or butter for 6 minutes until tender-crisp.',
        timerSeconds: 360,
      },
      {
        stepNumber: 2,
        title: 'Simmer Cream Gravy',
        instruction:
          'Pour in the almond-coconut cream base with Sachet 1. Simmer for 5 minutes until thick.',
        timerSeconds: 300,
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
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
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
      { name: 'Artisanal Golden Brioche Buns (2 pcs)', quantity: '2 buns' },
      { name: 'Pre-Seasoned Mushroom & Black Bean Smash Patties', quantity: '220g' },
      { name: 'Aged English White Cheddar Slices', quantity: '2 slices' },
      { name: 'Slow-Cooked Caramelized Onion Jam Pouch', quantity: '40g' },
      {
        name: 'Artisanal Black Truffle Garlic Aioli Sachet',
        quantity: '35g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 1: Smoked Paprika & Sea Salt Finishing Dust',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Black Truffle Garlic Aioli Pouch', 'Smoked Paprika & Sea Salt Finishing Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toast the Brioche Buns',
        instruction:
          'Slice brioche buns and toast cut-side down on a medium hot skillet with a dab of butter for 90 seconds until golden brown.',
        timerSeconds: 90,
      },
      {
        stepNumber: 2,
        title: 'Sear & Smash the Patties',
        instruction:
          'Place patties on hot pan. Press down firmly with a spatula. Sear for 3 minutes per side until crispy browned crust forms.',
        timerSeconds: 180,
      },
      {
        stepNumber: 3,
        title: 'Melt Cheddar on Patties',
        instruction:
          'Place cheddar slice atop each patty. Cover pan with lid for 45 seconds to let cheese melt luxuriously over edges.',
        timerSeconds: 45,
      },
      {
        stepNumber: 4,
        title: 'Assemble with Truffle Aioli',
        instruction:
          'Spread black truffle aioli generously on bottom bun, add melted patty, top with caramelized onion jam, sprinkle Sachet 1, and crown with top bun.',
        timerSeconds: 30,
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
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80',
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
      { name: '48-hr Fermented Sourdough Dough Balls (2 pcs)', quantity: '360g' },
      { name: 'Crushed San Marzano Tomato Sugo Pouch', quantity: '140g' },
      { name: 'Fior di Latte Diced Mozzarella', quantity: '120g' },
      { name: 'Artisanal Whole Italian Burrata Ball', quantity: '100g' },
      { name: 'Fresh Genovese Basil Sprig', quantity: '8 leaves' },
      {
        name: 'Sachet 1: Tuscan Oregano & Crushed Chili Flake Blend',
        quantity: '8g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Extra Virgin Garlic Olive Oil Drizzle',
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
        title: 'Stretch the Sourdough Crust',
        instruction:
          'Dust counter with flour. Gently stretch the dough ball from center outwards with fingertips, leaving a puffy 1/2 inch outer cornicione crust.',
        timerSeconds: 120,
      },
      {
        stepNumber: 2,
        title: 'Ladle Sauce & Mozzarella',
        instruction:
          'Spread San Marzano tomato sugo in spiral circles. Scatter diced mozzarella evenly across base.',
        timerSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Bake Until Blistered & Bubbly',
        instruction:
          'Bake at highest oven temperature (250°C / 480°F) or on preheated cast iron tawa with lid for 8-10 minutes until cheese bubbles and crust blisters.',
        timerSeconds: 540,
        tip: 'High heat creates the iconic charred leopard spots on the sourdough crust.',
      },
      {
        stepNumber: 4,
        title: 'Tear Burrata & Basil Finish',
        instruction:
          'Transfer pizza to board. Tear fresh burrata over center, scatter fresh basil, sprinkle Sachet 1, and drizzle garlic olive oil.',
        timerSeconds: 30,
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
      { name: 'Stone-Ground Corn Tortillas (6 pcs)', quantity: '6 tortillas' },
      { name: 'Panko Crusted Avocado Wedges', quantity: '180g' },
      { name: 'Simmered Spiced Black Bean Mash Pouch', quantity: '150g' },
      { name: 'Lime-Pickled Purple Cabbage Slaw', quantity: '80g' },
      { name: 'Fresh Pico de Gallo Tomato Salsa', quantity: '60g' },
      {
        name: 'Sachet 1: Smoky Chipotle Lime Crema Sauce Pouch',
        quantity: '40g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Mexican Tajin & Cumin Seasoning Dust',
        quantity: '6g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Smoky Chipotle Lime Crema Pouch', 'Mexican Tajin & Toasted Cumin Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Pan-Sear the Avocado Wedges',
        instruction:
          'Heat 1 tbsp oil in skillet. Sear panko-crusted avocado wedges for 2 minutes on each side until crisp golden and warm.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Warm the Corn Tortillas',
        instruction:
          'Toast each tortilla directly on dry hot skillet for 20 seconds per side until soft and pliable with slight char marks.',
        timerSeconds: 120,
      },
      {
        stepNumber: 3,
        title: 'Warm the Black Beans',
        instruction:
          'Empty black bean mash into small pot or microwave for 60 seconds until steaming hot.',
        timerSeconds: 60,
      },
      {
        stepNumber: 4,
        title: 'Build Tacos & Crema Drizzle',
        instruction:
          'Spoon black beans onto each tortilla, layer crispy avocado, top with pickled slaw, salsa, drizzle chipotle crema, and dust with Sachet 2.',
        timerSeconds: 45,
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
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Adobo Marinated Tender Chicken Strips', quantity: '320g' },
      { name: 'Cooked Cilantro-Lime Fluffy Rice Pouch', quantity: '280g' },
      { name: 'Charred Bell Pepper Fajita Strips', quantity: '80g' },
      { name: 'Charred Red Onion Slices', quantity: '40g' },
      { name: 'Sweet Roasted Corn Kernels', quantity: '60g' },
      { name: 'Black Beans', quantity: '40g' },
      { name: 'Shredded Monterey Jack Cheese', quantity: '40g' },
      { name: 'Sachet 1: Tomatillo Salsa Verde Pouch', quantity: '50g', isMasalaSachet: true },
      {
        name: 'Sachet 2: Ancho Chili & Lime Fajita Seasoning',
        quantity: '8g',
        isMasalaSachet: true,
      },
    ],
    masalaSachets: ['Tomatillo Salsa Verde Pouch', 'Ancho Chili & Mexican Lime Seasoning'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sear Adobo Chicken',
        instruction:
          'Heat 1 tbsp oil on high. Sear marinated chicken strips for 5 minutes until beautifully charred on edges and cooked through.',
        timerSeconds: 300,
      },
      {
        stepNumber: 2,
        title: 'Char the Fajita Veggies',
        instruction:
          'In same skillet, flash-sauté bell peppers and red onions with Sachet 2 for 3 minutes until tender-crisp.',
        timerSeconds: 180,
      },
      {
        stepNumber: 3,
        title: 'Warm the Cilantro Lime Rice',
        instruction: 'Microwave rice pouch for 60 seconds or steam in pan with 1 tbsp water.',
        timerSeconds: 60,
      },
      {
        stepNumber: 4,
        title: 'Assemble Burrito Bowls',
        instruction:
          'Divide rice into two deep bowls. Arrange grilled chicken, charred peppers, roasted corn black bean salsa, sprinkle Monterey Jack cheese, and dollop salsa verde.',
        timerSeconds: 45,
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
      'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Fresh Handmade Durum Fettuccine Nests', quantity: '240g' },
      { name: 'Sun-Dried Tomato & Basil Pesto Pouch', quantity: '140g' },
      { name: 'Aged Italian Parmigiano Reggiano Block', quantity: '40g' },
      { name: 'Toasted Mediterranean Pine Nuts', quantity: '20g' },
      {
        name: 'Sachet 1: Tuscan Herb Infusion (Oregano, Rosemary & Cracked Pepper)',
        quantity: '8g',
        isMasalaSachet: true,
      },
      { name: 'Sachet 2: Extra Virgin Olive Oil Pouch', quantity: '20ml', isMasalaSachet: true },
    ],
    masalaSachets: ['Tuscan Herb & Cracked Pepper Dust', 'Extra Virgin Olive Oil Pouch'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Fresh Fettuccine Al Dente',
        instruction:
          'Boil 2 litres water with 1 tbsp salt. Drop fresh fettuccine nests and boil for 3.5 minutes. Reserve 1/2 cup pasta water, then drain.',
        timerSeconds: 210,
        tip: 'Fresh pasta cooks much faster than dried pasta! Keep it strictly al dente.',
      },
      {
        stepNumber: 2,
        title: 'Warm the Sun-Dried Tomato Pesto',
        instruction:
          'In skillet, heat Sachet 2 olive oil. Add sun-dried tomato pesto pouch and 3 tbsp reserved starchy pasta water. Simmer on low for 2 minutes.',
        timerSeconds: 120,
      },
      {
        stepNumber: 3,
        title: 'Gloss Pasta in Velvety Sauce',
        instruction:
          'Toss drained fettuccine ribbons directly into simmering sauce. Swirl vigorously until every strand is coated in glossy red-gold pesto.',
        timerSeconds: 90,
      },
      {
        stepNumber: 4,
        title: 'Parmigiano & Pine Nut Finish',
        instruction:
          'Plate into pasta bowls. Grate fresh Parmigiano Reggiano on top, scatter toasted pine nuts, and dust with Sachet 1.',
        timerSeconds: 30,
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
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
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
      { name: 'Prime Seasoned Smash Patties (4 pcs)', quantity: '320g' },
      { name: 'Bakery Butter Brioche Buns (2 pcs)', quantity: '140g' },
      { name: 'Aged Sharp Wisconsin Cheddar Slices', quantity: '4 slices' },
      { name: 'Crinkle-Cut Tangy Dill Pickles', quantity: '60g' },
      { name: 'Slow Caramelized Sweet Diced Onions', quantity: '50g' },
      {
        name: 'Sachet 1: Secret Diner Burger Relish & Sauce Pouch',
        quantity: '45g',
        isMasalaSachet: true,
      },
      { name: 'Sachet 2: House Umami Smash Burger Salt', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: ['Secret Diner Burger Relish Pouch', 'House Umami Smash Burger Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Toast the Brioche Buns',
        instruction:
          'Melt butter in a heavy skillet over medium heat. Toast cut side of brioche buns for 90 seconds until golden and glossy.',
        timerSeconds: 90,
      },
      {
        stepNumber: 2,
        title: 'Hard Smash the Patties',
        instruction:
          'Place cold patties on smoking hot skillet. Press down hard with spatula for 10 seconds. Dust with Sachet 2. Sear 2.5 minutes until crust forms.',
        timerSeconds: 150,
      },
      {
        stepNumber: 3,
        title: 'Melt Twin Cheddar Slices',
        instruction:
          'Flip patties, immediately top each with cheddar slice. Stack two patties together and cover skillet for 40 seconds to melt cheese.',
        timerSeconds: 40,
      },
      {
        stepNumber: 4,
        title: 'Stack & Sauce the Burgers',
        instruction:
          'Slather bottom buns with secret relish sauce, lay caramelized onions, place double cheesy patty stack, crown with pickles, sauce, and top bun.',
        timerSeconds: 30,
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
      { name: '48-hr Fermented Sourdough Dough Balls (2 pcs)', quantity: '360g' },
      { name: 'Smoked Cupping Pepperoni Slices', quantity: '90g' },
      { name: 'Whole-Milk Low-Moisture Mozzarella', quantity: '140g' },
      { name: 'San Marzano Tomato & Oregano Marinara', quantity: '120g' },
      {
        name: 'Sachet 1: Wildflower Hot Honey Drizzle Pouch',
        quantity: '30ml',
        isMasalaSachet: true,
      },
      { name: 'Sachet 2: Dried Oregano & Sicilian Sea Salt', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: [
      'Wildflower Habanero Hot Honey Pouch',
      'Sicilian Oregano & Sea Salt Crust Dust',
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Stretch Sourdough Crust',
        instruction:
          'Press fermented dough ball outward on floured surface to form a 10-inch round with slightly raised cornicione rim.',
        timerSeconds: 120,
      },
      {
        stepNumber: 2,
        title: 'Top with Sauce, Mozzarella & Pepperoni',
        instruction:
          'Spread marinara lightly, scatter mozzarella, and distribute pepperoni slices across the entire surface.',
        timerSeconds: 90,
      },
      {
        stepNumber: 3,
        title: 'Bake Until Pepperoni Cups Crisp',
        instruction:
          'Bake at 250°C (or max oven setting) for 9-11 minutes until crust blisters and pepperoni curls into charred little cups filled with savory oil.',
        timerSeconds: 600,
      },
      {
        stepNumber: 4,
        title: 'Hot Honey Drizzle & Slice',
        instruction:
          'Remove from oven. Immediately drizzle warm Sachet 1 Hot Honey zigzag across pizza and dust with Sachet 2 Sicilian oregano. Slice and enjoy!',
        timerSeconds: 30,
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
      { name: 'Slow-Cooked Shredded Chicken in Birria Adobo', quantity: '280g' },
      { name: 'Artisan Stone-Ground Corn Tortillas (6 pcs)', quantity: '6 tortillas' },
      { name: 'Shredded Mexican Oaxaca Melting Cheese', quantity: '100g' },
      { name: 'Rich Spiced Chili Dipping Consomé Broth', quantity: '200ml' },
      { name: 'Finely Diced White Onions', quantity: '35g' },
      { name: 'Fresh Cilantro', quantity: '15g' },
      {
        name: 'Sachet 1: Mexican Spiced Chili Oil for Tortilla Dip',
        quantity: '25ml',
        isMasalaSachet: true,
      },
      { name: 'Sachet 2: Toasted Mexican Lime Oregano Dust', quantity: '6g', isMasalaSachet: true },
    ],
    masalaSachets: ['Spiced Birria Chili Oil Pouch', 'Toasted Mexican Lime & Mexican Oregano Dust'],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Warm the Dipping Consomé',
        instruction:
          'Pour rich birria consomé broth into small saucepan. Simmer gently for 3 minutes until steaming fragrant.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Dip & Crisp Tortillas',
        instruction:
          'Dip each corn tortilla in Sachet 1 spiced chili oil. Place flat on hot griddle/skillet. Top half with shredded cheese and birria chicken.',
        timerSeconds: 120,
      },
      {
        stepNumber: 3,
        title: 'Fold & Sear Crispy',
        instruction:
          'Fold tortillas in half like quesadillas. Press down and cook for 2 minutes per side until shell is deep golden, crispy and cheese is gooey.',
        timerSeconds: 240,
      },
      {
        stepNumber: 4,
        title: 'Garnish, Dip in Consomé & Devour',
        instruction:
          'Open tacos slightly, scatter fresh onions and cilantro. Serve hot with a bowl of warm consomé for dipping each bite!',
        timerSeconds: 30,
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
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Cilantro-Lime Parboiled Brown Rice', quantity: '200g' },
      { name: 'Seasoned Cuban Black Beans', quantity: '200g' },
      { name: 'Sliced Tri-Color Fajita Bell Peppers', quantity: '140g' },
      { name: 'Sliced Red Onion', quantity: '40g' },
      { name: 'Fire-Roasted Tomato Salsa Pouch', quantity: '80g' },
      { name: 'Avocado-Lime Crema Drizzle Pouch', quantity: '50g' },
      {
        name: 'Sachet 1: Smoky Fajita Char Seasoning',
        quantity: '12g',
        isMasalaSachet: true,
      },
      { name: 'Crispy Tortilla Strips', quantity: '30g' },
    ],
    masalaSachets: ['Smoky Fajita Char Seasoning'],
    sachets: [
      {
        id: 'sachet-209-1',
        name: 'Smoky Fajita Char Seasoning',
        weight: '12g',
        spices: [
          { name: 'Smoked Paprika & Mexican Oregano', quantity: '5g' },
          { name: 'Toasted Cumin & Garlic Powder', quantity: '4g' },
          { name: 'Chipotle Chilli & Sea Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Steam Cilantro-Lime Rice',
        instruction:
          'Warm pre-seasoned cilantro-lime brown rice in a saucepan with 3 tbsp water on low heat for 3 minutes until steaming and fluffy.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Sizzle Fajita Veggies on High Heat',
        instruction:
          'Heat 1 tbsp oil in a skillet on high. Toss sliced tri-color peppers and onions with Sachet 1 for 4 minutes until charred at the edges but crisp-tender.',
        timerSeconds: 240,
        tip: 'High heat creates authentic smoky Mexican cantina flavors.',
      },
      {
        stepNumber: 3,
        title: 'Warm Smoky Black Beans',
        instruction: 'Warm the seasoned black beans with fire-roasted tomato salsa for 2 minutes.',
        timerSeconds: 120,
      },
      {
        stepNumber: 4,
        title: 'Assemble Fiesta Bowls',
        instruction:
          'Divide rice between two wide bowls. Arrange charred fajita veggies and warm black beans in sections. Drizzle avocado-lime crema and top with crunchy tortilla strips.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Fresh Handmade Durum Pappardelle Nests', quantity: '240g' },
      { name: 'Fresh Porcini Mushrooms', quantity: '90g' },
      { name: 'Fresh Cremini Mushrooms', quantity: '90g' },
      { name: 'Italian Dairy Cooking Cream Pouch', quantity: '120ml' },
      { name: 'Pure White Truffle Infused Olive Oil', quantity: '15ml' },
      { name: 'Aged Italian Pecorino Romano Block', quantity: '35g' },
      {
        name: 'Sachet 1: Tuscan Rosemary, Garlic & Cracked Pepper Dust',
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
          { name: 'Crushed Rosemary & Thyme', quantity: '3g' },
          { name: 'Roasted Garlic Powder', quantity: '2.5g' },
          { name: 'Coarse Tellicherry Black Pepper', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Fresh Pappardelle Ribbons',
        instruction:
          'Drop fresh pappardelle into a pot of rolling salted water. Boil for 3.5 minutes until al dente. Reserve 1/3 cup pasta water, then drain.',
        timerSeconds: 210,
        tip: 'Never rinse cooked fresh pasta; the surface starch helps the truffle sauce cling to the ribbons.',
      },
      {
        stepNumber: 2,
        title: 'Caramelize Wild Mushrooms',
        instruction:
          'Melt butter in a wide skillet, add sliced mushrooms and Sachet 1. Sauté over medium-high heat for 4 minutes until golden and deeply caramelized.',
        timerSeconds: 240,
      },
      {
        stepNumber: 3,
        title: 'Simmer Silky Truffle Cream',
        instruction:
          'Pour in cooking cream and reserved pasta water. Simmer for 2 minutes, then take off heat and stir in the fragrant truffle oil.',
        timerSeconds: 120,
      },
      {
        stepNumber: 4,
        title: 'Coat Pappardelle & Grate Pecorino',
        instruction:
          'Toss drained pappardelle ribbons in the pan until thoroughly coated. Plate into pasta bowls and shower with freshly grated Pecorino Romano.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Pre-cooked Tender Chickpeas', quantity: '250g' },
      { name: 'Fresh Baby Spinach Leaves', quantity: '120g' },
      { name: 'Italian San Marzano Tomato Passata', quantity: '180g' },
      { name: 'Peeled Garlic Cloves', quantity: '5 pieces' },
      { name: 'Cold-Pressed Spanish Olive Oil', quantity: '25ml' },
      {
        name: 'Sachet 1: Smoked Paprika & Cumin Infusion',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Toasted Garlic Herb Salt',
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
          { name: 'Spanish Smoked Pimentón', quantity: '6g' },
          { name: 'Roasted Cumin Powder', quantity: '4g' },
          { name: 'Cracked Black Pepper', quantity: '2g' },
        ],
      },
      {
        id: 'sachet-301-2',
        name: 'Toasted Garlic Herb Salt',
        weight: '6g',
        spices: [
          { name: 'Roasted Garlic Granules', quantity: '3g' },
          { name: 'Dried Oregano', quantity: '1.5g' },
          { name: 'Himalayan Pink Salt', quantity: '1.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Infuse Olive Oil with Garlic',
        instruction:
          'Warm olive oil in a heavy saucepan over medium-low heat. Add thinly sliced garlic and sauté gently for 1 minute until fragrant and lightly golden.',
        timerSeconds: 60,
        tip: 'Keep the flame gentle so the garlic infuses without browning or turning bitter.',
      },
      {
        stepNumber: 2,
        title: 'Build the Smoky Tomato Broth',
        instruction:
          'Pour in the San Marzano passata and empty Sachet 1 (Smoked Paprika & Cumin Infusion). Stir and simmer for 4 minutes until the sauce deepens to a rich ruby hue.',
        timerSeconds: 240,
      },
      {
        stepNumber: 3,
        title: 'Simmer Chickpeas in Broth',
        instruction:
          'Add the tender chickpeas and 150ml warm water. Bring to a gentle simmer, cover, and cook for 12 minutes to allow the chickpeas to absorb the smoky aromatic spices.',
        timerSeconds: 720,
      },
      {
        stepNumber: 4,
        title: 'Wilt Spinach & Season',
        instruction:
          'Fold in the fresh baby spinach leaves and season with Sachet 2. Cook for 2 minutes until just wilted. Ladle into warm bowls and drizzle with finishing olive oil.',
        timerSeconds: 120,
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
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Fresh Green Zucchini Rounds', quantity: '150g' },
      { name: 'Tender Purple Aubergine (Brinjal) Cubes', quantity: '150g' },
      { name: 'Diced Yellow Bell Pepper', quantity: '60g' },
      { name: 'Diced Red Bell Pepper', quantity: '60g' },
      { name: 'Crushed Provencal Plum Tomatoes', quantity: '200g' },
      { name: 'Diced White Onions', quantity: '80g' },
      { name: 'Extra Virgin Olive Oil Pouch', quantity: '30ml' },
      {
        name: 'Sachet 1: Herbes de Provence & Sea Salt Blend',
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
          { name: 'Dried Thyme & Rosemary', quantity: '4g' },
          { name: 'French Marjoram & Oregano', quantity: '3g' },
          { name: 'Flaky Brittany Sea Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Onions & Sweet Peppers',
        instruction:
          'Warm 2 tbsp olive oil in a wide skillet. Sauté diced onions and bell peppers for 4 minutes until tender and glossy.',
        timerSeconds: 240,
      },
      {
        stepNumber: 2,
        title: 'Sear Zucchini & Aubergine',
        instruction:
          'Add cubed aubergine and zucchini rounds. Stir on medium heat for 5 minutes until lightly browned on edges.',
        timerSeconds: 300,
        tip: 'Do not crowd the vegetables so each piece caramelizes beautifully.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Crushed Tomatoes',
        instruction:
          'Pour in crushed plum tomatoes and empty Sachet 1 (Herbes de Provence). Reduce heat to low, cover, and gently simmer for 15 minutes.',
        timerSeconds: 900,
      },
      {
        stepNumber: 4,
        title: 'Rest & Serve with Crusty Bread',
        instruction:
          'Uncover, let rest for 2 minutes to allow flavours to meld, and finish with a swirl of extra virgin olive oil.',
        timerSeconds: 120,
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
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Red Masoor Dal (Split Red Lentils)', quantity: '120g' },
      { name: 'Fire-Roasted Tomato Puree', quantity: '180g' },
      { name: 'Fresh Ginger-Garlic Paste', quantity: '15g' },
      { name: 'Fresh Green Coriander Leaves', quantity: '20g' },
      { name: 'Cold-Pressed Mustard Oil Pouch', quantity: '15ml' },
      {
        name: 'Sachet 1: Roasted Cumin & Black Salt Tadka',
        quantity: '10g',
        isMasalaSachet: true,
      },
      { name: 'Fresh Key Lime', quantity: '1 piece' },
    ],
    masalaSachets: ['Roasted Cumin & Black Salt Tadka'],
    sachets: [
      {
        id: 'sachet-303-1',
        name: 'Roasted Cumin & Black Salt Tadka',
        weight: '10g',
        spices: [
          { name: 'Bhuna Jeera (Roasted Cumin)', quantity: '5g' },
          { name: 'Kala Namak (Black Salt)', quantity: '2.5g' },
          { name: 'Garam Masala Dust', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Lentils & Tomato Puree',
        instruction:
          'Rinse red masoor dal. In a soup pot, add dal, roasted tomato puree, and 3 cups water. Bring to a rolling boil.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Simmer until Velvety',
        instruction:
          'Lower heat, stir in ginger-garlic paste, and simmer for 12 minutes until lentils are soft and soup turns velvety.',
        timerSeconds: 720,
        tip: 'Whisk lightly or blend for 10 seconds for a silky restaurant consistency.',
      },
      {
        stepNumber: 3,
        title: 'Prepare Aromatic Tadka',
        instruction:
          'In a small tadka pan, heat oil, add Sachet 1, let spices crackle for 20 seconds, and pour sizzling tadka into the soup.',
        timerSeconds: 30,
      },
      {
        stepNumber: 4,
        title: 'Garnish & Serve Warm',
        instruction:
          'Garnish with freshly chopped coriander and a squeeze of fresh lime juice. Serve piping hot with toasted bread or papad.',
        timerSeconds: 60,
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
      { name: 'Fresh Farm Chicken Curry Cuts', quantity: '400g' },
      { name: 'Peeled Sambar Shallots', quantity: '100g' },
      { name: 'Cold-Pressed Sesame (Gingelly) Oil Pouch', quantity: '25ml' },
      { name: 'Fresh Curry Leaves Sprig', quantity: '15 leaves' },
      { name: 'Coconut & Poppy Seed Paste', quantity: '60g' },
      {
        name: 'Sachet 1: Stone-Ground Karaikudi Masala',
        quantity: '25g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Tellicherry Black Pepper & Fennel Tadka',
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
          { name: 'Roasted Coriander Seeds', quantity: '10g' },
          { name: 'Kashmiri & Guntur Red Chillies', quantity: '8g' },
          { name: 'Star Anise & Kalpasi (Stone Flower)', quantity: '4g' },
          { name: 'Cinnamon & Cloves', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-304-2',
        name: 'Tellicherry Black Pepper & Fennel Tadka',
        weight: '10g',
        spices: [
          { name: 'Coarsely Crushed Black Pepper', quantity: '6g' },
          { name: 'Fennel Seeds (Saunf)', quantity: '4g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Shallots in Gingelly Oil',
        instruction:
          'Heat sesame oil in a kadai. Add sliced shallots and fresh curry leaves, frying until shallots turn caramelized and sweet.',
        timerSeconds: 240,
      },
      {
        stepNumber: 2,
        title: 'Roast Chicken with Chettinad Spices',
        instruction:
          'Add chicken cuts and empty Sachet 1. Sauté briskly on high flame for 5 minutes until chicken is sealed in fragrant spice crust.',
        timerSeconds: 300,
        tip: 'High heat searing locks all the natural juices inside the chicken cuts.',
      },
      {
        stepNumber: 3,
        title: 'Simmer with Coconut Paste',
        instruction:
          'Add coconut paste and 150ml water. Cover and simmer on medium flame for 10 minutes until chicken is tender.',
        timerSeconds: 600,
      },
      {
        stepNumber: 4,
        title: 'Finish with Tellicherry Black Pepper Tadka',
        instruction:
          'Stir in Sachet 2 (Crushed Tellicherry Pepper & Fennel), simmer for 2 minutes to unleash that signature South Indian pepper heat.',
        timerSeconds: 120,
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
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Veg Manchurian Dumpling Base Mix', quantity: '220g' },
      { name: 'Eggless Hakka Noodles Pack', quantity: '180g' },
      { name: 'Fresh Spring Onions', quantity: '40g' },
      { name: 'Capsicum', quantity: '40g' },
      { name: 'Minced Ginger', quantity: '10g' },
      { name: 'Minced Garlic', quantity: '10g' },
      { name: 'Green Chilli', quantity: '5g' },
      {
        name: 'Sachet 1: Tangy Manchurian Dark Sauce Pouch',
        quantity: '60ml',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Indo-Chinese Wok Spice Seasoning',
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
          { name: 'Toasted Sesame Seeds', quantity: '3g' },
          { name: 'Celery & Onion Salt', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Hakka Noodles',
        instruction:
          'Drop noodles into boiling salted water for 4 minutes. Drain, rinse under cold tap water, and toss with 1 tsp oil.',
        timerSeconds: 240,
      },
      {
        stepNumber: 2,
        title: 'Roll & Crisp Manchurian Balls',
        instruction:
          'Shape seasoned veggie mix into 8 bite-sized balls. Shallow fry in 3 tbsp oil for 5 minutes until crispy and golden brown.',
        timerSeconds: 300,
        tip: 'Ensure the oil is hot before adding balls to avoid excess oil absorption.',
      },
      {
        stepNumber: 3,
        title: 'Wok-Toss the Sizzling Sauce',
        instruction:
          'In the wok, flash-fry ginger, garlic, and spring onions for 1 minute. Pour in Manchurian Sauce Sachet with 50ml water and bring to a glaze.',
        timerSeconds: 90,
      },
      {
        stepNumber: 4,
        title: 'Combine & Serve with Noodles',
        instruction:
          'Toss crispy Manchurian balls into the simmering sauce. Dust Hakka noodles with Sachet 2 seasoning and serve side-by-side.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Aged Royal Daawat Basmati Rice', quantity: '250g' },
      { name: 'Fresh Malai Paneer Cubes', quantity: '200g' },
      { name: 'Birista (Crispy Fried Onions)', quantity: '40g' },
      { name: 'Pure Desi Ghee Pouch', quantity: '30g' },
      { name: 'Kashmiri Saffron & Kewra Water Infusion', quantity: '15ml' },
      {
        name: 'Sachet 1: Awadhi Khada Potli Masala',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Royal Zafrani Shahi Spice Blend',
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
          { name: 'Green Cardamom (Elaichi)', quantity: '4g' },
          { name: 'Black Cardamom & Cinnamon', quantity: '4g' },
          { name: 'Mace (Javitri) & Nutmeg', quantity: '3g' },
          { name: 'Cloves & Shahi Jeera', quantity: '4g' },
        ],
      },
      {
        id: 'sachet-306-2',
        name: 'Royal Zafrani Shahi Spice Blend',
        weight: '20g',
        spices: [
          { name: 'Kashmiri Saffron Strands', quantity: '1g' },
          { name: 'Toasted Cashew Paste Powder', quantity: '10g' },
          { name: 'Garam Masala Dust', quantity: '5g' },
          { name: 'Rose Petal Powder', quantity: '4g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Parboil Basmati with Khada Masala',
        instruction:
          'Boil aged basmati in salted water with Sachet 1 (potli spices) for 6 minutes until 70% cooked. Drain and set aside.',
        timerSeconds: 360,
        tip: 'Do not overcook the rice in this stage; it finishes steaming during dum.',
      },
      {
        stepNumber: 2,
        title: 'Sear Malai Paneer in Shahi Masala',
        instruction:
          'In handi, melt desi ghee, add paneer cubes and Sachet 2. Sauté for 3 minutes until paneer is coated in fragrant shahi gravy.',
        timerSeconds: 180,
      },
      {
        stepNumber: 3,
        title: 'Layer Basmati, Birista & Saffron',
        instruction:
          'Layer the parboiled rice over the paneer. Top with golden birista, drizzle Saffron-Kewra infusion, and dot with remaining ghee.',
        timerSeconds: 120,
      },
      {
        stepNumber: 4,
        title: 'Dum Cook on Sealed Flame',
        instruction:
          'Cover handi tightly with lid. Cook on low flame (dum) for 15 minutes. Rest 5 minutes, gently fluff with a fork and serve.',
        timerSeconds: 900,
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
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Spiced Whole Wheat Dhokli Dough Cuts', quantity: '180g' },
      { name: 'Cooked Spiced Toor Dal Base', quantity: '250g' },
      { name: 'Raw Roasted Gujarat Peanuts', quantity: '30g' },
      { name: 'Natural Organic Jaggery & Kokum Pouch', quantity: '35g' },
      { name: 'Pure Desi Cow Ghee', quantity: '20g' },
      {
        name: 'Sachet 1: Kathiyawadi Rai-Hing Tadka Masala',
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
          { name: 'Black Mustard Seeds (Rai)', quantity: '3g' },
          { name: 'Asafoetida (Hing)', quantity: '1.5g' },
          { name: 'Cumin & Fenugreek Seeds', quantity: '2.5g' },
          { name: 'Dried Red Kashmiri Chillies', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Simmer Toor Dal Base',
        instruction:
          'In a deep pot, add toor dal base with 350ml water, roasted peanuts, and Jaggery-Kokum pouch. Bring to a rolling boil.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Drop Fresh Spiced Dhokli Pieces',
        instruction:
          'Drop individual spiced whole wheat dhokli diamond cuts into the boiling dal one by one so they do not stick.',
        timerSeconds: 120,
        tip: 'Keep the dal boiling vigorously when dropping dhoklis to ensure they set immediately.',
      },
      {
        stepNumber: 3,
        title: 'Simmer to Tender Perfection',
        instruction:
          'Simmer on medium flame for 12 minutes until the dhokli dumplings are tender, silky, and float to the top.',
        timerSeconds: 720,
      },
      {
        stepNumber: 4,
        title: 'Sizzle Desi Ghee Tadka',
        instruction:
          'Melt cow ghee in a tadka spoon, crackle Sachet 1 (mustard, hing, chillies), and pour over the hot dal dhokli. Serve hot.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Fresh Button Mushrooms', quantity: '100g' },
      { name: 'Fresh Shiitake Mushrooms', quantity: '80g' },
      { name: 'Sweet Golden Corn Kernels', quantity: '150g' },
      { name: 'Rich Dairy Cooking Cream Pouch', quantity: '100ml' },
      { name: 'Salted Butter Block', quantity: '25g' },
      { name: 'Garlic Herb Croutons', quantity: '40g' },
      {
        name: 'Sachet 1: French Thyme & White Pepper Chowder Dust',
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
          { name: 'Dried French Thyme', quantity: '3g' },
          { name: 'Ground White Pepper', quantity: '2.5g' },
          { name: 'Sea Salt & Onion Powder', quantity: '2.5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Sauté Sliced Mushrooms in Butter',
        instruction:
          'Melt butter in a soup pot over medium heat. Add sliced mushrooms and sauté for 4 minutes until golden brown and aromatic.',
        timerSeconds: 240,
      },
      {
        stepNumber: 2,
        title: 'Add Sweet Corn & Broth',
        instruction:
          'Add sweet corn kernels, 250ml water, and Sachet 1. Bring to a gentle boil and simmer for 8 minutes.',
        timerSeconds: 480,
      },
      {
        stepNumber: 3,
        title: 'Enrich with Cooking Cream',
        instruction:
          'Stir in the rich cooking cream on low heat. Simmer gently for 4 minutes until the chowder thickens to a velvety coat.',
        timerSeconds: 240,
        tip: 'Do not let the chowder boil rapidly after adding cream to keep it silky smooth.',
      },
      {
        stepNumber: 4,
        title: 'Top with Garlic Croutons & Serve',
        instruction:
          'Ladle into heated soup bowls, scatter crisp garlic croutons on top, and finish with a sprinkle of cracked black pepper.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
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
      { name: 'Sprouted Organic Matki (Moth Beans)', quantity: '200g' },
      { name: 'Fresh Pune Bakery Ladi Pav', quantity: '4 pcs' },
      { name: 'Special Puneri Crispy Farsan', quantity: '90g' },
      { name: 'Diced Red Onions', quantity: '60g' },
      { name: 'Fresh Coriander', quantity: '20g' },
      { name: 'Fresh Juicy Lemon', quantity: '1 pc' },
      {
        name: 'Sachet 1: Puneri Goda Masala & Hing Tadka',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Teja Kat Tarri Gravy Paste',
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
          { name: 'Traditional Maharashtrian Goda Masala', quantity: '8g' },
          { name: 'Roasted Cumin & Coriander Powder', quantity: '4g' },
          { name: 'Asafoetida (Hing) & Turmeric', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-309-2',
        name: 'Teja Kat Tarri Gravy Paste',
        weight: '35g',
        spices: [
          { name: 'Roasted Coconut & Charred Onion Paste', quantity: '18g' },
          { name: 'Byadgi & Lavangi Red Chilli Essence', quantity: '10g' },
          { name: 'Ginger Garlic & Spiced Oil Base', quantity: '7g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Boil Sprouted Matki Usal',
        instruction:
          'Boil sprouted matki in 1.5 cups water with a pinch of salt and turmeric for 5 minutes until tender yet retaining a light bite.',
        timerSeconds: 300,
      },
      {
        stepNumber: 2,
        title: 'Cook Fragrant Kat Tarri Gravy',
        instruction:
          'Heat 2 tbsp oil in a deep kadai. Stir in Sachet 1 until aromatic (30 sec), then blend in Sachet 2 paste. Add 2 cups water and simmer for 6 minutes until the fiery red oil layer (tarri/kat) rises to the surface.',
        timerSeconds: 360,
        tip: 'Pune misal is celebrated for its spicy, aromatic, thin tarri rassa.',
      },
      {
        stepNumber: 3,
        title: 'Toast Pav & Assemble Misal Bowls',
        instruction:
          'Lightly toast the ladi pav in butter on a tava. In serving bowls, spoon a hearty base of boiled matki usal, ladle boiling-hot kat rassa over it, then crown with generous crispy farsan, diced onions, and fresh coriander.',
        timerSeconds: 180,
      },
      {
        stepNumber: 4,
        title: 'Squeeze Lemon & Relish Hot',
        instruction:
          'Squeeze fresh lemon over the bowl and dunk the hot buttered pav into the spicy kat broth immediately for peak crunch and savoriness.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Premium Roasted Chana Besan (Gram Flour)', quantity: '120g' },
      { name: 'Stone-Ground Jowar (Sorghum) Bhakri Flour', quantity: '200g' },
      { name: 'Fresh Green Chillies', quantity: '20g' },
      { name: 'Garlic Pods', quantity: '30g' },
      { name: 'Fresh Curry Leaves', quantity: '8g' },
      { name: 'Mustard Seeds', quantity: '7g' },
      {
        name: 'Sachet 1: Puneri Pithla Tempering Spice Blend',
        quantity: '12g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Authentic Maharashtrian Thecha Masala',
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
          { name: 'Compound Hing', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-310-2',
        name: 'Authentic Maharashtrian Thecha Masala',
        weight: '18g',
        spices: [
          { name: 'Coarse Roasted Cumin', quantity: '6g' },
          { name: 'Rock Salt & Garlic Flakes', quantity: '7g' },
          { name: 'Roasted Peanut Dust', quantity: '5g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Whisk Besan Batter',
        instruction:
          'In a bowl, whisk the besan with 1.5 cups water and turmeric until completely smooth and lump-free.',
        timerSeconds: 120,
      },
      {
        stepNumber: 2,
        title: 'Cook Velvety Pithla',
        instruction:
          'Heat 2 tbsp oil, crackle mustard seeds, curry leaves, and green chillies. Pour in the besan batter, stirring continuously on medium flame for 6 minutes until thick, glossy, and fragrant.',
        timerSeconds: 360,
      },
      {
        stepNumber: 3,
        title: 'Prepare Pounded Garlic Thecha',
        instruction:
          'Heat 1 tbsp oil in a small pan, roast green chillies and garlic until blistered. Coarsely crush with Sachet 2 using a mortar or back of a spoon with a splash of lemon.',
        timerSeconds: 180,
      },
      {
        stepNumber: 4,
        title: 'Pan-Cook Jowar Bhakris',
        instruction:
          'Knead the jowar flour with warm water into soft dough. Pat out round bhakris on a dry tava, splash water on the surface, flip and roast until puffed and charred.',
        timerSeconds: 360,
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
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Traditional 5-Grain Roasted Bhajani Flour', quantity: '220g' },
      { name: 'Finely Chopped Red Onions', quantity: '80g' },
      { name: 'Roasted White Sesame Seeds (Til)', quantity: '15g' },
      { name: 'Fresh White Butter (Loni)', quantity: '40g' },
      {
        name: 'Sachet 1: Puneri Thalipeeth Seasoning Sachet',
        quantity: '15g',
        isMasalaSachet: true,
      },
      {
        name: 'Sachet 2: Shengdana (Peanut) Garlic Chutney',
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
          { name: 'Roasted Cumin & Ajwain (Carom)', quantity: '6g' },
          { name: 'Red Chilli Powder & Turmeric', quantity: '5g' },
          { name: 'Kala Namak & Sea Salt', quantity: '4g' },
        ],
      },
      {
        id: 'sachet-311-2',
        name: 'Shengdana (Peanut) Garlic Chutney',
        weight: '25g',
        spices: [
          { name: 'Coarse Roasted Peanuts', quantity: '14g' },
          { name: 'Dry Garlic & Byadgi Chilli', quantity: '8g' },
          { name: 'Salt & Cumin', quantity: '3g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Knead Bhajani Dough',
        instruction:
          'In a bowl, combine Bhajani flour, chopped onions, sesame seeds, and Sachet 1. Add warm water gradually to knead into a pliable, soft dough.',
        timerSeconds: 180,
      },
      {
        stepNumber: 2,
        title: 'Pat Out Thalipeeth on Wet Cloth',
        instruction:
          'Place a damp muslin cloth or butter paper on your counter. Take a ball of dough and pat it evenly thin with wet fingers, making 3 small holes in the center.',
        timerSeconds: 180,
      },
      {
        stepNumber: 3,
        title: 'Roast with Ghee Until Crisp',
        instruction:
          'Flip the thalipeeth gently onto a medium-hot greased tava. Drizzle ghee into the holes and around the edges. Cover and cook on medium flame for 3 minutes per side until golden and crispy.',
        timerSeconds: 360,
      },
      {
        stepNumber: 4,
        title: 'Serve with Fresh Loni & Peanut Chutney',
        instruction:
          'Plate steaming hot with a generous scoop of fresh white loni butter and Shengdana garlic chutney from Sachet 2.',
        timerSeconds: 60,
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
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
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
      { name: 'Pre-Soaked Non-Sticky Sago Pearls (Sabudana)', quantity: '250g' },
      { name: 'Slow-Roasted Crushed Peanuts (Shengdana Kut)', quantity: '60g' },
      { name: 'Boiled Diced Baby Potatoes', quantity: '80g' },
      { name: 'Pure Cow Desi Ghee', quantity: '30g' },
      { name: 'Fresh Green Chillies', quantity: '10g' },
      { name: 'Fresh Curry Leaves', quantity: '10g' },
      {
        name: 'Sachet 1: Puneri Khichdi Jeera & Sendha Namak Blend',
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
          { name: 'Whole Jeera (Cumin)', quantity: '4g' },
          { name: 'Rock Salt (Sendha Namak)', quantity: '4g' },
          { name: 'Raw Cane Sugar Powder', quantity: '2g' },
        ],
      },
    ],
    recipeSteps: [
      {
        stepNumber: 1,
        title: 'Coat Sabudana with Peanuts & Seasoning',
        instruction:
          'In a large mixing bowl, gently toss the drained sabudana pearls with the crushed roasted peanuts, rock salt, and sugar from Sachet 1 until each pearl is coated.',
        timerSeconds: 120,
      },
      {
        stepNumber: 2,
        title: 'Temper Aromatics in Desi Ghee',
        instruction:
          'Melt desi ghee in a heavy non-stick kadai over medium heat. Crackle cumin, sliced green chillies, and curry leaves for 30 seconds, then toss in diced potatoes.',
        timerSeconds: 90,
      },
      {
        stepNumber: 3,
        title: 'Gentle Steam Roast Khichdi',
        instruction:
          'Lower heat, add the coated sabudana mixture. Cover with a tight lid and steam for 4 minutes until the pearls turn translucent and soft. Avoid excessive stirring to keep grains separate.',
        timerSeconds: 240,
        tip: 'Pune-style khichdi is always non-sticky and fluffy.',
      },
      {
        stepNumber: 4,
        title: 'Garnish with Coriander & Lemon',
        instruction:
          'Turn off flame, squeeze fresh lemon juice, fold in chopped cilantro, and serve immediately alongside chilled curd.',
        timerSeconds: 60,
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
