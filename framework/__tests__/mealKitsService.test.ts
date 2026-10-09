import {
  getMealKits,
  searchAndFilterMealKits,
  updateMealKitStock,
} from '../services/mealKitsService';

describe('mealKitsService', () => {
  it('loads initial meal kits catalog with rich metadata', () => {
    const kits = getMealKits();
    expect(kits.length).toBeGreaterThanOrEqual(4);

    const paneerKit = kits.find((k) => k.id === 'kit-101');
    expect(paneerKit).toBeDefined();
    expect(paneerKit?.name).toBe('Paneer Butter Masala Kit');
    expect(paneerKit?.diet).toBe('veg');
    expect(paneerKit?.nutrition.calories).toBeGreaterThan(0);
    expect(paneerKit?.ingredients.length).toBeGreaterThan(0);
    expect(paneerKit?.recipeSteps.length).toBeGreaterThan(0);
  });

  it('searches meal kits by ingredient name', () => {
    // Search for cashew (ingredient in Paneer Butter Masala)
    const results = searchAndFilterMealKits({ searchQuery: 'cashew' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((k) => k.id === 'kit-101')).toBe(true);
  });

  it('filters meal kits by vegetarian diet', () => {
    const vegKits = searchAndFilterMealKits({ diet: 'veg' });
    expect(vegKits.length).toBeGreaterThan(0);
    vegKits.forEach((kit) => {
      expect(kit.diet === 'veg' || kit.dietaryTags.includes('veg')).toBe(true);
    });
  });

  it('filters meal kits by spice level', () => {
    const fieryKits = searchAndFilterMealKits({ spiceLevel: 'Fiery' });
    expect(fieryKits.length).toBeGreaterThan(0);
    fieryKits.forEach((kit) => {
      expect(kit.spiceLevel).toBe('Fiery');
    });
  });

  it('sorts meal kits by price ascending', () => {
    const sorted = searchAndFilterMealKits({ sortBy: 'priceLowHigh' });
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i]!.price).toBeLessThanOrEqual(sorted[i + 1]!.price);
    }
  });

  it('updates stock per regional fulfillment hub', () => {
    updateMealKitStock('kit-101', 'North', 99);
    const kits = getMealKits();
    const updated = kits.find((k) => k.id === 'kit-101');
    expect(updated?.stockByRegion.North).toBe(99);
  });

  it('categorizes foreign meals into high-level cuisines: Italian (pizza, pasta), Mexican (tacos, burritos), American (burgers)', () => {
    // Italian: Pizzas and Pastas
    const italianKits = searchAndFilterMealKits({ cuisine: 'Italian' });
    expect(italianKits.length).toBeGreaterThanOrEqual(3);
    expect(italianKits.some((k) => k.name.includes('Burrata Pizza'))).toBe(true);
    expect(italianKits.some((k) => k.name.includes('Pepperoni'))).toBe(true);
    expect(italianKits.some((k) => k.name.includes('Fettuccine'))).toBe(true);

    // Mexican: Tacos and Burrito Bowls
    const mexicanKits = searchAndFilterMealKits({ cuisine: 'Mexican' });
    expect(mexicanKits.length).toBeGreaterThanOrEqual(3);
    expect(mexicanKits.some((k) => k.name.includes('Tacos'))).toBe(true);
    expect(mexicanKits.some((k) => k.name.includes('Burrito'))).toBe(true);

    // American: Burgers
    const americanKits = searchAndFilterMealKits({ cuisine: 'American' });
    expect(americanKits.length).toBeGreaterThanOrEqual(2);
    expect(americanKits.some((k) => k.name.includes('Smash Burger'))).toBe(true);
    expect(americanKits.some((k) => k.name.includes('Texas Double Smash'))).toBe(true);

    // Filter by dishCategory
    const pizzaDishes = searchAndFilterMealKits({ dishCategory: 'Pizzas' });
    expect(pizzaDishes.every((k) => k.cuisine === 'Italian')).toBe(true);

    const burgerDishes = searchAndFilterMealKits({ dishCategory: 'Burgers & Sliders' });
    expect(burgerDishes.every((k) => k.cuisine === 'American')).toBe(true);
  });

  it('filters meal kits by specialized diets (vegan, keto, jain, gluten-free)', () => {
    const veganKits = searchAndFilterMealKits({ diet: 'vegan' });
    expect(veganKits.length).toBeGreaterThan(0);
    veganKits.forEach((k) => expect(k.dietaryTags).toContain('vegan'));

    const ketoKits = searchAndFilterMealKits({ diet: 'keto' });
    expect(ketoKits.length).toBeGreaterThan(0);
    ketoKits.forEach((k) => expect(k.dietaryTags).toContain('keto'));

    const jainKits = searchAndFilterMealKits({ diet: 'jain' });
    expect(jainKits.length).toBeGreaterThan(0);
    jainKits.forEach((k) => expect(k.dietaryTags).toContain('jain'));

    const gfKits = searchAndFilterMealKits({ diet: 'gluten-free' });
    expect(gfKits.length).toBeGreaterThan(0);
    gfKits.forEach((k) => expect(k.dietaryTags).toContain('gluten-free'));
  });

  it('allows adding and publishing newly created meal kits with sanitized prices', () => {
    const rawPrice = '₹349/-';
    const parsedPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 299;
    expect(parsedPrice).toBe(349);

    const newKit = {
      id: 'kit-custom-zafrani',
      name: 'Awadhi Zafrani Biryani',
      slug: 'awadhi-zafrani-biryani',
      tagline: 'Aromatic layered basmati rice with royal saffron',
      description: 'Royal gourmet biryani',
      heroImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
      galleryImages: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d'],
      price: parsedPrice,
      servings: 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      diet: 'veg' as const,
      cuisine: 'Mughlai' as const,
      spiceLevel: 'Medium' as const,
      difficulty: 'Easy' as const,
      dietaryTags: ['veg'],
      availableRegions: ['North' as const],
      stockByRegion: { North: 25, South: 0, West: 0, East: 0 },
      rating: 5.0,
      reviewCount: 0,
      nutrition: { calories: 420, protein: 12, carbs: 60, fat: 14, fiber: 5 },
      allergens: ['Dairy'],
      ingredients: [{ name: 'Basmati Rice', quantity: '250g', isMasalaSachet: false }],
      recipeSteps: [
        { stepNumber: 1, title: 'Dum Cooking', instruction: 'Steam sealed pot on low flame' },
      ],
      reviews: [],
      salesByRegion: {},
    };

    const { addMealKit } = require('../services/mealKitsService');
    addMealKit(newKit);

    const kits = getMealKits();
    const found = kits.find((k) => k.id === 'kit-custom-zafrani');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Awadhi Zafrani Biryani');
    expect(found?.price).toBe(349);
  });

  it('toggles meal kit out of stock status', () => {
    const { updateMealKit } = require('../services/mealKitsService');
    updateMealKit('kit-101', { isOutOfStock: true });
    let kit = getMealKits().find((k) => k.id === 'kit-101');
    expect(kit?.isOutOfStock).toBe(true);

    updateMealKit('kit-101', { isOutOfStock: false });
    kit = getMealKits().find((k) => k.id === 'kit-101');
    expect(kit?.isOutOfStock).toBe(false);
  });

  it('deletes meal kit from catalog store', () => {
    const { deleteMealKit } = require('../services/mealKitsService');
    const targetId = 'kit-custom-zafrani';
    deleteMealKit(targetId);
    const kit = getMealKits().find((k) => k.id === targetId);
    expect(kit).toBeUndefined();
  });

  it('filters meal kits by diet, cuisine type and dish type', () => {
    const kits = getMealKits();
    // Test search by text
    const paneerKits = kits.filter((k) => k.name.toLowerCase().includes('paneer'));
    expect(paneerKits.length).toBeGreaterThan(0);

    // Test filter by diet
    const vegKits = kits.filter((k) => k.diet === 'veg' || k.dietaryTags.includes('veg'));
    expect(vegKits.length).toBeGreaterThan(0);

    // Test filter by cuisine
    const northIndianKits = kits.filter((k) => k.cuisine === 'North Indian');
    expect(northIndianKits.length).toBeGreaterThan(0);

    // Test filter by dish category
    const curries = kits.filter((k) => k.dishCategory === 'Curries & Gravies');
    expect(curries.length).toBeGreaterThan(0);

    // Combined filter
    const combined = kits.filter(
      (k) =>
        k.diet === 'veg' && k.cuisine === 'North Indian' && k.dishCategory === 'Curries & Gravies',
    );
    expect(combined.length).toBeGreaterThan(0);
    expect(combined.some((k) => k.name.includes('Paneer'))).toBe(true);
  });

  afterAll(async () => {
    const { deleteMealKit } = require('../services/mealKitsService');
    const { deleteMealKitFromSupabase } = require('../services/supabaseMealKitsService');
    deleteMealKit('kit-custom-zafrani');
    await deleteMealKitFromSupabase('kit-custom-zafrani');
  });
});
