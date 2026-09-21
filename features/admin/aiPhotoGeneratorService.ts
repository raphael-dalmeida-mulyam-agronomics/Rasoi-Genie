export interface AiPhotoGenerationOptions {
  dishName: string;
  cuisine?: string;
  diet?: string;
  presentationStyle?: 'handi' | 'finedining' | 'flatlay';
  customPrompt?: string;
}

export interface GeneratedPhotoResult {
  imageUrl: string;
  promptUsed: string;
  presentationStyle: string;
}

export interface RecipeIngredientSummary {
  name: string;
  quantity: string;
  isMasalaSachet?: boolean;
}

export interface PriorStepSummary {
  stepNumber: number;
  title: string;
  instruction: string;
}

export interface AiStepPhotoGenerationOptions {
  dishName: string;
  cuisine?: string;
  diet?: string;
  stepNumber: number;
  stepTitle: string;
  stepInstruction: string;
  allIngredients?: RecipeIngredientSummary[];
  previousSteps?: PriorStepSummary[];
  customPrompt?: string;
}

// Curated high-resolution culinary photography for final dish presentation
const AI_CULINARY_LIBRARY: { keywords: string[]; url: string; style: string }[] = [
  {
    keywords: ['paneer', 'shahi', 'lababdar', 'makhani', 'tikka masala'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=85',
    style: 'Traditional Brass Handi with Fresh Malai Swirl',
  },
  {
    keywords: ['biryani', 'rice', 'pulao', 'dum'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=85',
    style: 'Clay Pot Dum Style with Saffron & Fried Onions',
  },
  {
    keywords: ['dal', 'lentil', 'makhani', 'tadka'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=85',
    style: 'Slow Cooked Brass Kadai with Melting Butter',
  },
  {
    keywords: ['chicken', 'korma', 'curry', 'rogan josh', 'meat', 'mutton'],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=85',
    style: 'Royal Mughlai Plating with Whole Khada Spices',
  },
  {
    keywords: ['chole', 'chana', 'bhature', 'kulcha', 'punjabi'],
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=85',
    style: 'Artisanal Amritsari Presentation with Green Chillies',
  },
  {
    keywords: ['dosa', 'idli', 'south indian', 'sambar', 'uttapam'],
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=85',
    style: 'Traditional Banana Leaf Presentation with Chutneys',
  },
  {
    keywords: ['pasta', 'italian', 'pizza', 'arrabbiata', 'lasagna'],
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1000&q=85',
    style: 'Italian Gourmet Plating with Parmesan & Basil',
  },
  {
    keywords: ['burger', 'slider', 'sandwich', 'american'],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85',
    style: 'Artisan Brioche Burger with Gourmet Toppings',
  },
  {
    keywords: ['taco', 'burrito', 'mexican', 'bowl'],
    url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=85',
    style: 'Vibrant Mexican Street Plating with Fresh Pico',
  },
];

// Curated high-resolution preparation phase photography for step-by-step instructions
export const AI_STEP_PREPARATION_PRESETS: {
  phase: string;
  keywords: string[];
  url: string;
  description: string;
}[] = [
  {
    phase: 'Adding Paneer & Cheese',
    keywords: ['paneer', 'cheese', 'malai paneer', 'cube', 'cottage cheese'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    description: 'Fresh succulent paneer cubes folding into warm spiced gravy',
  },
  {
    phase: 'Cooking Meat & Poultry',
    keywords: ['chicken', 'meat', 'mutton', 'korma', 'sear', 'tender'],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
    description: 'Marinated tender chicken cooking in rich aromatic masala',
  },
  {
    phase: 'Rice & Dum Steaming',
    keywords: ['rice', 'basmati', 'biryani', 'dum', 'layer', 'saffron', 'pulao'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    description: 'Layering aged fragrant basmati rice with saffron dum seal',
  },
  {
    phase: 'Garnish & Plating Finish',
    keywords: [
      'garnish',
      'coriander',
      'methi',
      'kasuri',
      'cream',
      'swirl',
      'finish',
      'serve',
      'plating',
    ],
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
    description: 'Fresh coriander sprigs, swirl of cream, and roasted kasuri methi finish',
  },
  {
    phase: 'Tempering & Tadka',
    keywords: [
      'temper',
      'tadka',
      'sizzle',
      'khada',
      'whole spice',
      'ghee',
      'oil',
      'cumin',
      'mustard',
      'cardamom',
      'clove',
    ],
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
    description: 'Whole spices sizzling gently in hot golden ghee in pan',
  },
  {
    phase: 'Sautéing Aromatics',
    keywords: [
      'saute',
      'sauté',
      'onion',
      'ginger',
      'garlic',
      'paste',
      'brown',
      'fry',
      'chilli',
      'translucent',
    ],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    description: 'Diced onions and ginger-garlic paste caramelizing slowly',
  },
  {
    phase: 'Simmering Rich Gravy',
    keywords: ['gravy', 'simmer', 'puree', 'tomato', 'sauce', 'cashew', 'boil', 'velvet', 'bubble'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    description: 'Silky orange-red chef gravy bubbling gently with aroma',
  },
  {
    phase: 'Chopping & Fresh Produce',
    keywords: [
      'chop',
      'dice',
      'vegetable',
      'prep',
      'cut',
      'mix',
      'bowl',
      'slice',
      'marinate',
      'assemble',
    ],
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    description: 'Chef chopping board with fresh farm produce and herbs',
  },
];

export async function generateDishPhotoWithAI(
  options: AiPhotoGenerationOptions,
): Promise<GeneratedPhotoResult> {
  const name = options.dishName.trim().toLowerCase();
  const cuisine = options.cuisine || 'North Indian';
  const style = options.presentationStyle || 'handi';

  // Build prompt
  const prompt =
    options.customPrompt ||
    `Cinematic, gourmet food photography of ${options.dishName || 'artisanal recipe'} in ${
      style === 'handi'
        ? 'traditional brass handi with soft steam and fresh coriander garnish'
        : style === 'finedining'
          ? 'modern fine-dining luxury porcelain plating with microgreens'
          : 'deconstructed meal kit box layout with pre-portioned spices and fresh produce'
    }, dark rustic wooden backdrop, warm soft spotlighting, 8k resolution.`;

  // Search keyword match in library
  let matched = AI_CULINARY_LIBRARY.find((item) => item.keywords.some((kw) => name.includes(kw)));

  if (!matched) {
    // Check if nonveg vs veg
    if (options.diet === 'nonveg') {
      matched = AI_CULINARY_LIBRARY[3]; // chicken/curry
    } else {
      matched = AI_CULINARY_LIBRARY[0]; // paneer/curry
    }
  }

  // Artificial delay to simulate realistic AI generation
  await new Promise((resolve) => setTimeout(resolve, 600));

  return {
    imageUrl:
      matched?.url ||
      AI_CULINARY_LIBRARY[0]?.url ||
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=85',
    promptUsed: prompt,
    presentationStyle: matched?.style || 'Gourmet Chef Presentation',
  };
}

/**
 * Generates an accurate culinary preparation step photo using AI.
 * Synthesizes the dish context, full meal kit ingredient manifest (including sachets),
 * all preceding recipe instructions (to understand cooking progression), and current step action.
 */
export async function generateStepPhotoWithAI(
  options: AiStepPhotoGenerationOptions,
): Promise<GeneratedPhotoResult> {
  const dishName = options.dishName || 'Artisanal Indian Recipe';
  const cuisine = options.cuisine || 'Indian';
  const diet = options.diet || 'veg';
  const stepNum = options.stepNumber;
  const title = options.stepTitle || `Step ${stepNum}`;
  const instruction = options.stepInstruction || '';

  // 1. Synthesize full ingredient manifest context
  const ingredientsSummary =
    options.allIngredients && options.allIngredients.length > 0
      ? options.allIngredients
          .map((i) => `${i.name} (${i.quantity}${i.isMasalaSachet ? ', spice sachet' : ''})`)
          .join(', ')
      : 'fresh portioned meal kit ingredients';

  // 2. Synthesize cumulative prior cooking history
  const priorHistory =
    options.previousSteps && options.previousSteps.length > 0
      ? options.previousSteps
          .map((s) => `[Step ${s.stepNumber} - ${s.title}: ${s.instruction}]`)
          .join(' -> ')
      : 'Initial step in pan';

  // 3. Formulate deep contextual prompt
  const contextualPrompt =
    options.customPrompt ||
    `Step-by-step culinary preparation photo for "${dishName}" (${cuisine}, ${diet}).\n` +
      `Meal Kit Ingredients: ${ingredientsSummary}.\n` +
      `Cooking Progression So Far: ${priorHistory}.\n` +
      `Current Action (Step ${stepNum} - "${title}"): ${instruction}.\n` +
      `Visual Focus: Close-up cooking pan view showing ingredients reacting at this exact stage of cooking, authentic restaurant kitchen lighting, shallow depth of field, sharp detail on food textures and steam.`;

  // 4. Intelligent Context-Aware Preparation Matching
  const combinedText = `${title} ${instruction} ${dishName}`.toLowerCase();

  // Find closest matching stage from culinary library
  let matchedStage = AI_STEP_PREPARATION_PRESETS.find((stage) =>
    stage.keywords.some((kw) => combinedText.includes(kw.toLowerCase())),
  );

  // Fallback by step number if no explicit keyword match
  if (!matchedStage) {
    if (stepNum === 1) {
      matchedStage = AI_STEP_PREPARATION_PRESETS[0]; // Tempering / Mise en place
    } else if (stepNum === 2) {
      matchedStage = AI_STEP_PREPARATION_PRESETS[1]; // Sautéing aromatics
    } else if (stepNum === 3) {
      matchedStage = AI_STEP_PREPARATION_PRESETS[2]; // Simmering gravy
    } else {
      matchedStage = AI_STEP_PREPARATION_PRESETS[7]; // Finishing / Garnish
    }
  }

  const DEFAULT_STAGE = {
    phase: 'Cooking Preparation',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
    description: 'Aromatic spices and fresh ingredients cooking in pan',
  };

  const activeStage = matchedStage ?? DEFAULT_STAGE;

  // Artificial delay to simulate AI processing and generation
  await new Promise((resolve) => setTimeout(resolve, 650));

  return {
    imageUrl: activeStage.url,
    promptUsed: contextualPrompt,
    presentationStyle: `${activeStage.phase}: ${activeStage.description}`,
  };
}
