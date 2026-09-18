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
});
