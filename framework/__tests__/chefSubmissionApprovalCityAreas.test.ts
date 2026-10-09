import { ALL_GEO_CITIES, POPULAR_CITIES } from '../../features/admin/ChefSubmissionApprovalView';
import { getSubRegionsForCity, legacyHubForCity, getStateForCity } from '../services/regionService';
import {
  createChefSubmission,
  publishChefSubmission,
  deleteChefSubmission,
  ChefRecipeSubmission,
} from '../services/chefMealKitsService';
import { getMealKits, deleteMealKit } from '../services/mealKitsService';
import { deleteMealKitFromSupabase } from '../services/supabaseMealKitsService';

describe('ChefSubmissionApprovalCityAreas', () => {
  it('exposes comprehensive Indian cities dataset without macro-region pills', () => {
    expect(ALL_GEO_CITIES.length).toBeGreaterThan(15);
    const pune = ALL_GEO_CITIES.find((c) => c.name === 'Pune');
    const mumbai = ALL_GEO_CITIES.find((c) => c.name === 'Mumbai');
    const blr = ALL_GEO_CITIES.find((c) => c.name === 'Bengaluru');

    expect(pune).toBeDefined();
    expect(pune?.state).toBe('Maharashtra');
    expect(pune?.subRegionCount).toBeGreaterThanOrEqual(5);

    expect(mumbai).toBeDefined();
    expect(blr).toBeDefined();

    expect(POPULAR_CITIES).toContain('Pune');
    expect(POPULAR_CITIES).toContain('Mumbai');
    expect(POPULAR_CITIES).toContain('Bengaluru');
  });

  it('provides granular deliverable sub-areas for Pune', () => {
    const puneSubs = getSubRegionsForCity('Pune');
    expect(puneSubs.length).toBeGreaterThanOrEqual(8);

    const baner = puneSubs.find((s) => s.id === 'pune-baner');
    const kothrud = puneSubs.find((s) => s.id === 'pune-kothrud');
    const hinjewadi = puneSubs.find((s) => s.id === 'pune-hinjewadi');

    expect(baner).toBeDefined();
    expect(baner?.name).toMatch(/Baner/i);
    expect(kothrud).toBeDefined();
    expect(hinjewadi).toBeDefined();
  });

  it('correctly maps cities to their legacy regional hub behind the scenes for DB compatibility', () => {
    expect(legacyHubForCity('Pune')).toBe('West');
    expect(legacyHubForCity('Mumbai')).toBe('West');
    expect(legacyHubForCity('Bengaluru')).toBe('South');
    expect(legacyHubForCity('Hyderabad')).toBe('South');
    expect(legacyHubForCity('New Delhi')).toBe('North');
    expect(legacyHubForCity('Kolkata')).toBe('East');
  });

  it('correctly looks up the state for cities', () => {
    expect(getStateForCity('Pune')).toBe('Maharashtra');
    expect(getStateForCity('Bengaluru')).toBe('Karnataka');
    expect(getStateForCity('Hyderabad')).toBe('Telangana');
  });

  it('publishes a chef submission with targeted city and manually selected sub-areas', async () => {
    const chefId = 'chef_city_test_001';
    const submissionData: ChefRecipeSubmission = {
      name: 'Pune Misal Pav Specialty',
      tagline: 'Authentic Kolhapuri & Puneri spiced misal',
      description: 'Zesty sprout curry served with soft pav and farsan toppings.',
      heroImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
      galleryImages: [],
      diet: 'veg',
      cuisine: 'Maharashtrian',
      dishCategory: 'Curries & Gravies',
      spiceLevel: 'Fiery',
      servings: 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      dietaryTags: ['veg'],
      allergens: [],
      ingredients: [{ name: 'Sprouted Matki', quantity: '200g' }],
      recipeSteps: [
        { stepNumber: 1, title: 'Temper Spices', instruction: 'Heat oil with mustard seeds.' },
      ],
      chefId,
      chefName: 'Chef Rahul Joshi',
    };

    const createRes = await createChefSubmission(submissionData);
    expect(createRes.success).toBe(true);
    const subId = createRes.id!;

    const selectedCity = 'Pune';
    const selectedSubAreas = ['pune-baner', 'pune-kothrud', 'pune-hinjewadi'];
    const legacyHub = legacyHubForCity(selectedCity);

    const pubRes = await publishChefSubmission(
      subId,
      279,
      [legacyHub],
      ['pune-central-depot'],
      [selectedCity],
      'Approved for Pune West zones',
      selectedSubAreas,
    );

    expect(pubRes.success).toBe(true);
    expect(pubRes.kit).toBeDefined();
    expect(pubRes.kit?.price).toBe(279);
    expect(pubRes.kit?.cities).toEqual(['Pune']);
    expect(pubRes.kit?.subRegions).toEqual(['pune-baner', 'pune-kothrud', 'pune-hinjewadi']);
    expect(pubRes.kit?.originCity).toBe('Pune');

    // Verify it is registered in the live catalog
    const catalogKits = getMealKits();
    const liveKit = catalogKits.find((k) => k.id === subId);
    expect(liveKit).toBeDefined();
    expect(liveKit?.subRegions).toEqual(['pune-baner', 'pune-kothrud', 'pune-hinjewadi']);

    // Integration test requirement: delete created meal kit and verify deletion
    deleteMealKit(subId);
    await deleteMealKitFromSupabase(subId);
    await deleteChefSubmission(subId, chefId, true);
    expect(getMealKits().find((k) => k.id === subId)).toBeUndefined();
  });

  it('supports selecting and publishing across multiple target cities simultaneously', async () => {
    const chefId = 'chef_multicity_002';
    const submissionData: ChefRecipeSubmission = {
      name: 'Western Gateway Biryani Feast',
      tagline: 'Dual-city Mumbai & Pune signature dum biryani',
      description:
        'Fragrant long-grain basmati with slow-cooked marinated vegetables and royal spices.',
      heroImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
      galleryImages: [],
      diet: 'veg',
      cuisine: 'Mughlai',
      dishCategory: 'Biryani & Rice',
      spiceLevel: 'Medium',
      servings: 4,
      prepTimeMinutes: 25,
      cookTimeMinutes: 40,
      dietaryTags: ['veg'],
      allergens: [],
      ingredients: [{ name: 'Aged Basmati Rice', quantity: '500g' }],
      recipeSteps: [
        { stepNumber: 1, title: 'Dum Steam', instruction: 'Steam sealed pot on low flame.' },
      ],
      chefId,
      chefName: 'Chef Ananya Deshmukh',
    };

    const createRes = await createChefSubmission(submissionData);
    expect(createRes.success).toBe(true);
    const subId = createRes.id!;

    // Admin selects multiple target cities: Pune and Mumbai
    const targetCities = ['Pune', 'Mumbai'];
    const targetSubAreas = ['pune-baner', 'pune-kothrud', 'mumbai-bandra', 'mumbai-andheri'];
    const legacyHubs = Array.from(new Set(targetCities.map((c) => legacyHubForCity(c))));

    const pubRes = await publishChefSubmission(
      subId,
      349,
      legacyHubs,
      ['pune-central-depot', 'mumbai-central-depot'],
      targetCities,
      'Approved for dual-city metro rollout',
      targetSubAreas,
    );

    expect(pubRes.success).toBe(true);
    expect(pubRes.kit?.cities).toEqual(['Pune', 'Mumbai']);
    expect(pubRes.kit?.subRegions).toEqual(targetSubAreas);
    expect(pubRes.kit?.price).toBe(349);

    const liveKit = getMealKits().find((k) => k.id === subId);
    expect(liveKit).toBeDefined();
    expect(liveKit?.cities).toEqual(['Pune', 'Mumbai']);
    expect(liveKit?.subRegions).toEqual(targetSubAreas);

    // Integration test requirement: delete created meal kit and verify deletion
    deleteMealKit(subId);
    await deleteMealKitFromSupabase(subId);
    await deleteChefSubmission(subId, chefId, true);
    expect(getMealKits().find((k) => k.id === subId)).toBeUndefined();
  });
});
