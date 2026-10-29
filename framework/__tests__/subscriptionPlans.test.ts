import {
  STANDARD_SUBSCRIPTION_PLANS,
  STANDARD_PLANS_LIST,
  validateStandardPlanKits,
  resolvePlanMealKits,
  WEEKDAYS,
} from '../services/subscriptionPlans';

describe('Subscription Plan Catalog Validity Tests', () => {
  it('contains the 3 standard weekly plans: High Protein, Keto, and Vegan', () => {
    expect(STANDARD_SUBSCRIPTION_PLANS['high-protein']).toBeDefined();
    expect(STANDARD_SUBSCRIPTION_PLANS['keto']).toBeDefined();
    expect(STANDARD_SUBSCRIPTION_PLANS['vegan']).toBeDefined();
    expect(STANDARD_PLANS_LIST.length).toBe(3);
  });

  it('each standard plan has a 7-day schedule covering Monday through Sunday', () => {
    for (const plan of STANDARD_PLANS_LIST) {
      expect(plan.weeklyMeals).toHaveLength(7);

      // Verify days 0 to 6 are all covered
      const coveredDays = plan.weeklyMeals.map((m) => m.weekday).sort((a, b) => a - b);
      expect(coveredDays).toEqual([0, 1, 2, 3, 4, 5, 6]);

      // Verify pricing fields are positive numbers
      expect(plan.pricePerMemberPerWeek).toBeGreaterThan(0);
      expect(plan.originalPricePerMemberPerWeek).toBeGreaterThan(plan.pricePerMemberPerWeek);
    }
  });

  it('every referenced meal kit in standard plans exists in the real meal kits catalog', () => {
    const validation = validateStandardPlanKits();
    expect(validation.missing).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('resolvePlanMealKits resolves all 7 real meal kit objects with full nutrition and ingredients', () => {
    const resolvedHighProtein = resolvePlanMealKits('high-protein');
    expect(resolvedHighProtein).toHaveLength(7);
    resolvedHighProtein.forEach((dayMeal, idx) => {
      expect(dayMeal.weekday).toBe(idx);
      expect(dayMeal.mealKit).toBeDefined();
      expect(dayMeal.mealKit?.name).toBeTruthy();
      expect(dayMeal.mealKit?.nutrition).toBeDefined();
    });

    const resolvedKeto = resolvePlanMealKits('keto');
    expect(resolvedKeto).toHaveLength(7);
    resolvedKeto.forEach((dayMeal) => {
      expect(dayMeal.mealKit).toBeDefined();
    });

    const resolvedVegan = resolvePlanMealKits('vegan');
    expect(resolvedVegan).toHaveLength(7);
    resolvedVegan.forEach((dayMeal) => {
      expect(dayMeal.mealKit).toBeDefined();
    });
  });

  it('contains valid WEEKDAYS constant matching 0..6 indices', () => {
    expect(WEEKDAYS).toHaveLength(7);
    expect(WEEKDAYS[0]!.full).toBe('Monday');
    expect(WEEKDAYS[6]!.full).toBe('Sunday');
  });
});
