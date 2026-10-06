import { MealKit, RegionHub, addMealKit, getMealKits } from './mealKitsService';
import { saveMealKitToSupabase } from './supabaseMealKitsService';
import { hubForCity } from '../../features/admin/cityKitsSeederService';

/**
 * Known Indian cities and signature dish keywords for regional specialty detection.
 */
export const CITY_REGIONAL_SPECIALTY_KEYWORDS: Record<string, string[]> = {
  pune: [
    'misal',
    'puneri',
    'pithla',
    'bhakri',
    'thecha',
    'thalipeeth',
    'sabudana khichdi',
    'matki usal',
    'bakarwadi',
    'katachi amti',
    'mastani',
    'kharda',
    'bhajani',
  ],
  mumbai: [
    'vada pav',
    'bombay',
    'pav bhaji',
    'bombil',
    'kanda poha',
    'frankie',
    'bhelpuri',
    'ragda pattice',
  ],
  hyderabad: [
    'hyderabadi',
    'dum biryani',
    'haleem',
    'mirchi ka salan',
    'double ka meetha',
    'khatti dal',
  ],
  lucknow: ['awadhi', 'galouti', 'tunday', 'shahi biryani', 'shahi tukda', 'sheermal', 'lucknowi'],
  kolkata: [
    'kathi roll',
    'kosha mangsho',
    'macher jhol',
    'shorshe ilish',
    'mishti doi',
    'sandesh',
    'kolkata',
  ],
  delhi: ['chole bhature', 'butter chicken', 'dal makhani', 'parathe', 'nihari', 'chaat'],
  chennai: ['chettinad', 'masala dosa', 'sambar', 'rasam', 'idli', 'pongal', 'filter coffee'],
  amritsar: ['amritsari kulcha', 'dal makhani', 'sarson da saag', 'makki di roti', 'chole'],
  ahmedabad: ['dal dhokli', 'undhiyu', 'khaman dhokla', 'thepla', 'handvo', 'gujarati kadhi'],
  bengaluru: ['bisi bele bath', 'mysore pak', 'benne dosa', 'rava idli', 'mangalorean'],
};

/**
 * Normalises a city string for comparison (trim + lowercase).
 */
export function normaliseCity(city: string): string {
  return (city || '').trim().toLowerCase();
}

/**
 * Checks if a meal kit is recognized as an authentic regional specialty of a specific city.
 * Matches via:
 * 1. Explicit `originCity` matching the target city.
 * 2. Explicit target city in `kit.cities`.
 * 3. Name / slug / tagline / description / ingredients matching signature specialty keywords.
 */
export function isRegionalSpecialtyOfCity(kit: MealKit, city: string): boolean {
  if (!city || !city.trim() || !kit) return false;
  const targetCity = normaliseCity(city);

  // 1. Explicit origin city match
  if (kit.originCity && normaliseCity(kit.originCity) === targetCity) {
    return true;
  }

  // 2. Explicit city in kit's targeted cities (and not an all-cities empty list)
  if (Array.isArray(kit.cities) && kit.cities.length > 0) {
    if (kit.cities.some((c) => normaliseCity(c) === targetCity)) {
      // If kit specifically targets this city or origin matches
      if (kit.originCity && normaliseCity(kit.originCity) === targetCity) {
        return true;
      }
    }
  }

  // 3. Keyword / signature match for known cities
  const keywords = CITY_REGIONAL_SPECIALTY_KEYWORDS[targetCity];
  if (keywords && keywords.length > 0) {
    const kitText = [
      kit.name,
      kit.slug,
      kit.tagline,
      kit.description,
      ...(kit.masalaSachets || []),
      ...(kit.ingredients || []).map((i) => i.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return keywords.some((kw) => kitText.includes(kw));
  }

  return false;
}

/**
 * Returns the detected origin city of a kit, checking its originCity property
 * or resolving via known city specialty keywords.
 */
export function getOriginCityForKit(kit: MealKit): string | undefined {
  if (kit.originCity && kit.originCity.trim()) {
    return kit.originCity.trim();
  }

  const kitText = [kit.name, kit.slug, kit.tagline, kit.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [cityKey, keywords] of Object.entries(CITY_REGIONAL_SPECIALTY_KEYWORDS)) {
    if (keywords.some((kw) => kitText.includes(kw))) {
      return cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
    }
  }

  return undefined;
}

/**
 * Returns the human-readable list of regional specialty names for a city.
 */
export function getCitySpecialtyNames(city: string): string[] {
  const norm = normaliseCity(city);
  if (norm === 'pune') {
    return [
      'Authentic Puneri Misal Pav',
      'Puneri Pithla Bhakri & Thecha',
      'Puneri Bhajani Thalipeeth',
      'Puneri Sabudana Khichdi',
    ];
  }
  return [];
}

/**
 * Ranks meal kits for the "Trending in [City]" section:
 * 1. Regional specialties of this city appear FIRST (e.g. Pune regional specialties like Misal Pav, Pithla Bhakri).
 * 2. Followed by other trending / popular meal kits available in that region hub.
 * 3. Guarantees no duplicates.
 *
 * @param allKits    All available kits from the catalog
 * @param city       The user's current city (e.g. 'Pune')
 * @param regionHub  The user's regional hub (e.g. 'West')
 */
export function rankMealKitsForCityTrending(
  allKits: MealKit[],
  city: string,
  regionHub?: RegionHub,
): MealKit[] {
  if (!allKits || allKits.length === 0) return [];
  const targetHub = regionHub || hubForCity(city);

  // Filter pool of kits that are either trending or available in this region
  const candidateKits = allKits.filter(
    (k) =>
      k.isTrending || (Array.isArray(k.availableRegions) && k.availableRegions.includes(targetHub)),
  );

  const adminTrending: MealKit[] = [];
  const regionalSpecialties: MealKit[] = [];
  const otherTrending: MealKit[] = [];
  const seenIds = new Set<string>();

  // 1. Admin-marked trending dishes appear at the very top
  candidateKits.forEach((kit) => {
    if (kit.isTrending) {
      if (!seenIds.has(kit.id)) {
        seenIds.add(kit.id);
        adminTrending.push(kit);
      }
    }
  });
  adminTrending.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // 2. Collect regional specialties of this specific city
  candidateKits.forEach((kit) => {
    if (isRegionalSpecialtyOfCity(kit, city)) {
      if (!seenIds.has(kit.id)) {
        seenIds.add(kit.id);
        regionalSpecialties.push(kit);
      }
    }
  });
  regionalSpecialties.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // 3. Collect other regional kits
  candidateKits.forEach((kit) => {
    if (!seenIds.has(kit.id)) {
      seenIds.add(kit.id);
      otherTrending.push(kit);
    }
  });
  otherTrending.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return [...adminTrending, ...regionalSpecialties, ...otherTrending];
}

/**
 * Pune-specific starter kits used if none exist in the database/store.
 */
const PUNE_SPECIALTY_SEEDS: Omit<MealKit, 'id'>[] = [
  {
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
        id: 'sachet-pune-misal-1',
        name: 'Puneri Goda Masala & Hing Tadka',
        weight: '15g',
        spices: [
          { name: 'Traditional Maharashtrian Goda Masala', quantity: '8g' },
          { name: 'Roasted Cumin & Coriander Powder', quantity: '4g' },
          { name: 'Asafoetida (Hing) & Turmeric', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-pune-misal-2',
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
        id: 'rev-pune-1',
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
      { name: 'Fresh Green Chillies', quantity: '30g' },
      { name: 'Garlic Pods', quantity: '20g' },
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
        id: 'sachet-pune-pithla-1',
        name: 'Puneri Pithla Tempering Spice Blend',
        weight: '12g',
        spices: [
          { name: 'Mustard Seeds & Cumin', quantity: '5g' },
          { name: 'Turmeric & Rock Salt', quantity: '4g' },
          { name: 'Compound Hing', quantity: '3g' },
        ],
      },
      {
        id: 'sachet-pune-pithla-2',
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
        id: 'rev-pune-2',
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
];

/**
 * Checks if regional specialty meal kits for a city exist in the store/database.
 * If not, generates and seeds them to in-memory store and Supabase.
 *
 * @param city - Target city (e.g. "Pune")
 * @returns The generated/seeded kits (or empty array if already present)
 */
export async function ensureCitySpecialtiesSeeded(city: string): Promise<MealKit[]> {
  if (!city || !city.trim()) return [];
  const targetCity = normaliseCity(city);

  // Check if regional specialty kits already exist in current catalog
  const existingKits = getMealKits();
  const hasSpecialties = existingKits.some((k) => isRegionalSpecialtyOfCity(k, city));
  if (hasSpecialties) {
    return [];
  }

  // If Pune is requested and missing, seed the authentic Pune specialty kits
  if (targetCity === 'pune') {
    const timestamp = Date.now();
    const newKits: MealKit[] = PUNE_SPECIALTY_SEEDS.map((template, idx) => ({
      ...template,
      id: `pune-spec-${timestamp}-${idx + 1}`,
    }));

    // Add to in-memory store
    newKits.forEach((kit) => addMealKit(kit));

    // Persist to Supabase in parallel
    try {
      await Promise.allSettled(newKits.map((kit) => saveMealKitToSupabase(kit, true)));
      console.log(`[DishOrigin] Seeded ${newKits.length} Pune regional specialty kits`);
    } catch (err) {
      console.warn('[DishOrigin] Could not persist specialty seeds to Supabase:', err);
    }

    return newKits;
  }

  return [];
}
