import { estimateNutritionWithAI } from '../../features/admin/nutritionEstimatorService';

describe('nutritionEstimatorService', () => {
  it('correctly calculates macros for paneer butter masala ingredients', () => {
    const ingredients = [
      { name: 'Fresh Malai Paneer', quantity: '250g' },
      { name: 'Pure Cow Desi Ghee', quantity: '2 tbsp' },
      { name: 'Diced Onions & Tomatoes', quantity: '200g' },
      { name: 'Fresh Dairy Cream', quantity: '50ml' },
      { name: 'Sachet 1: Whole Khada Spices', quantity: '15g', isMasalaSachet: true },
    ];

    const result = estimateNutritionWithAI(ingredients, 2);

    expect(result.perServing).toBeDefined();
    expect(result.perServing.calories).toBeGreaterThan(250);
    expect(result.perServing.protein).toBeGreaterThan(15);
    expect(result.perServing.fat).toBeGreaterThan(15);
    expect(result.perServing.carbs).toBeGreaterThan(10);
    expect(result.breakdownSummary.length).toBeGreaterThan(0);
    expect(result.keyHighlights).toBeDefined();
  });

  it('correctly scales macros between 2 and 4 servings', () => {
    const ingredients = [
      { name: 'Boneless Tender Chicken', quantity: '400g' },
      { name: 'Aged Basmati Rice', quantity: '300g' },
      { name: 'Pure Cow Desi Ghee', quantity: '3 tbsp' },
    ];

    const resultFor2 = estimateNutritionWithAI(ingredients, 2);
    const resultFor4 = estimateNutritionWithAI(ingredients, 4);

    // Total recipe calories should be approximately identical
    expect(resultFor2.totalRecipe.calories).toBeCloseTo(resultFor4.totalRecipe.calories, -1);
    // Per-serving calories for 4 servings should be roughly half of per-serving for 2
    expect(resultFor4.perServing.calories).toBeLessThan(resultFor2.perServing.calories);
  });

  it('provides safe baseline values for empty ingredients list', () => {
    const result = estimateNutritionWithAI([], 2);
    expect(result.perServing.calories).toBe(380);
    expect(result.perServing.protein).toBe(14);
    expect(result.breakdownSummary).toContain('Balanced meal baseline estimation applied.');
  });
});
