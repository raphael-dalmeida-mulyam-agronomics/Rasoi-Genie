export type DietTag = 'veg' | 'nonveg' | 'jain' | 'vegan' | 'keto' | 'gluten-free';
export type CuisineType =
  | 'North Indian'
  | 'South Indian'
  | 'Hyderabadi'
  | 'Punjabi'
  | 'Mughlai'
  | 'Coastal'
  | 'Gujarati'
  | 'Indo-Chinese'
  | 'Italian'
  | 'Mexican'
  | 'American'
  | 'Continental';

export type DishCategory =
  | 'Curries & Gravies'
  | 'Biryani & Rice'
  | 'Burgers & Sliders'
  | 'Pizzas'
  | 'Tacos'
  | 'Burritos & Bowls'
  | 'Pastas'
  | 'Street Food';
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
  stockByRegion: Record<RegionHub, number>;
  rating: number;
  reviewCount: number;
  nutrition: NutritionFacts;
  allergens: string[];
  ingredients: IngredientItem[];
  masalaSachets: string[];
  recipeSteps: RecipeStep[];
  reviews: BuyerReview[];
  salesByRegion: Record<string, number>; // state -> units sold
}

export const INITIAL_MEAL_KITS: MealKit[] = [
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
      { name: 'White Butter & Cream Pack', quantity: '30g' },
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
      { name: 'Pure Desi Ghee & Saffron Infusion', quantity: '25ml' },
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
      { name: 'Pre-Cooked Slow-Brew Black Lentils & Rajma', quantity: '350g' },
      { name: 'Artisanal White Butter & Cream Tub', quantity: '40g' },
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
    spiceLevel: 'Fiery',
    difficulty: 'Chef Special',
    dietaryTags: ['nonveg', 'keto', 'gluten-free'],
    isTrending: true,
    availableRegions: ['South', 'West'],
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
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
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
    spiceLevel: 'Medium',
    difficulty: 'Easy',
    dietaryTags: ['veg', 'vegan', 'keto', 'gluten-free'],
    isTrending: false,
    availableRegions: ['North', 'South', 'West', 'East'],
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
      { name: 'Charred Bell Pepper & Red Onion Fajita Mix', quantity: '120g' },
      { name: 'Sweet Roasted Corn & Black Bean Medley', quantity: '100g' },
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
      { name: 'Finely Diced White Onions & Fresh Cilantro', quantity: '50g' },
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
];

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
  sortBy?: 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime';
}

export function searchAndFilterMealKits(options: FilterOptions): MealKit[] {
  let results = [...catalogStore];

  // Search by meal name, ingredient, cuisine, or dish category
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

      return matchName || matchIngredient || matchSachet;
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
export function addMealKit(newKit: MealKit): void {
  catalogStore = [newKit, ...catalogStore];
}

export function updateMealKit(id: string, updatedFields: Partial<MealKit>): void {
  catalogStore = catalogStore.map((kit) => (kit.id === id ? { ...kit, ...updatedFields } : kit));
}

export function deleteMealKit(id: string): void {
  catalogStore = catalogStore.filter((kit) => kit.id !== id);
}

export function updateMealKitStock(id: string, region: RegionHub, stock: number): void {
  catalogStore = catalogStore.map((kit) => {
    if (kit.id === id) {
      return {
        ...kit,
        stockByRegion: {
          ...kit.stockByRegion,
          [region]: stock,
        },
      };
    }
    return kit;
  });
}
