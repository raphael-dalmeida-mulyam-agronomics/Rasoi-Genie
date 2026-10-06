import {
  isRegionalSpecialtyOfCity,
  rankMealKitsForCityTrending,
  getOriginCityForKit,
  getCitySpecialtyNames,
  ensureCitySpecialtiesSeeded,
} from '../services/dishOriginService';
import { MealKit, getMealKits } from '../services/mealKitsService';

describe('dishOriginService', () => {
  const samplePuneMisal: MealKit = {
    id: 'test-pune-misal',
    name: 'Authentic Puneri Misal Pav Kit',
    slug: 'authentic-puneri-misal-pav',
    tagline: 'Fiery sprouted matki usal in deep red Pune kat rassa',
    description: 'Iconic Pune street food with spicy kat and farsan',
    heroImage: 'https://example.com/misal.jpg',
    galleryImages: [],
    price: 199,
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Maharashtrian',
    spiceLevel: 'Fiery',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['West', 'South'],
    cities: ['Pune'],
    originCity: 'Pune',
    stockByRegion: { West: 100, South: 50, North: 0, East: 0 },
    rating: 4.95,
    reviewCount: 300,
    nutrition: { calories: 450, protein: 15, carbs: 60, fat: 15, fiber: 8 },
    allergens: [],
    ingredients: [],
    masalaSachets: ['Puneri Goda Masala'],
    recipeSteps: [],
    reviews: [],
    salesByRegion: {},
  };

  const sampleGenericWestKit: MealKit = {
    id: 'test-generic-west',
    name: 'Sourdough Burrata Pizza Kit',
    slug: 'sourdough-burrata-pizza',
    tagline: 'Fresh burrata with basil pesto',
    description: 'Neapolitan style pizza',
    heroImage: 'https://example.com/pizza.jpg',
    galleryImages: [],
    price: 349,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    diet: 'veg',
    cuisine: 'Italian',
    spiceLevel: 'Mild',
    difficulty: 'Easy',
    dietaryTags: ['veg'],
    isTrending: true,
    availableRegions: ['West', 'North'],
    cities: [],
    stockByRegion: { West: 50, South: 0, North: 50, East: 0 },
    rating: 4.7,
    reviewCount: 150,
    nutrition: { calories: 600, protein: 20, carbs: 70, fat: 22, fiber: 4 },
    allergens: [],
    ingredients: [],
    masalaSachets: [],
    recipeSteps: [],
    reviews: [],
    salesByRegion: {},
  };

  const sampleHyderabadBiryani: MealKit = {
    id: 'test-hyd-biryani',
    name: 'Hyderabadi Dum Chicken Biryani Kit',
    slug: 'hyderabadi-chicken-biryani',
    tagline: 'Royal dum biryani',
    description: 'Authentic Hyderabadi biryani',
    heroImage: 'https://example.com/biryani.jpg',
    galleryImages: [],
    price: 399,
    servings: 3,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    diet: 'nonveg',
    cuisine: 'Hyderabadi',
    spiceLevel: 'Spicy',
    difficulty: 'Medium',
    dietaryTags: ['nonveg'],
    isTrending: true,
    availableRegions: ['South', 'West'],
    cities: ['Hyderabad'],
    originCity: 'Hyderabad',
    stockByRegion: { West: 40, South: 100, North: 20, East: 10 },
    rating: 4.9,
    reviewCount: 500,
    nutrition: { calories: 650, protein: 35, carbs: 75, fat: 22, fiber: 5 },
    allergens: [],
    ingredients: [],
    masalaSachets: [],
    recipeSteps: [],
    reviews: [],
    salesByRegion: {},
  };

  describe('isRegionalSpecialtyOfCity', () => {
    it('recognizes a kit with explicit originCity matching Pune', () => {
      expect(isRegionalSpecialtyOfCity(samplePuneMisal, 'Pune')).toBe(true);
      expect(isRegionalSpecialtyOfCity(samplePuneMisal, 'pune')).toBe(true);
      expect(isRegionalSpecialtyOfCity(samplePuneMisal, '  PUNE  ')).toBe(true);
    });

    it('recognizes a Pune specialty from signature keywords in name or description', () => {
      const keywordKit: MealKit = {
        ...sampleGenericWestKit,
        id: 'kw-test',
        name: 'Spicy Misal Pav Kit',
        originCity: undefined,
        cities: [],
      };
      expect(isRegionalSpecialtyOfCity(keywordKit, 'Pune')).toBe(true);
    });

    it('returns false for kits from other regions when querying Pune', () => {
      expect(isRegionalSpecialtyOfCity(sampleGenericWestKit, 'Pune')).toBe(false);
      expect(isRegionalSpecialtyOfCity(sampleHyderabadBiryani, 'Pune')).toBe(false);
    });

    it('correctly identifies Hyderabad specialties', () => {
      expect(isRegionalSpecialtyOfCity(sampleHyderabadBiryani, 'Hyderabad')).toBe(true);
    });
  });

  describe('getOriginCityForKit', () => {
    it('returns explicit originCity when present', () => {
      expect(getOriginCityForKit(samplePuneMisal)).toBe('Pune');
      expect(getOriginCityForKit(sampleHyderabadBiryani)).toBe('Hyderabad');
    });

    it('infers origin city from keyword heuristics if originCity is absent', () => {
      const unannotatedKit: MealKit = {
        ...sampleGenericWestKit,
        name: 'Puneri Pithla Bhakri Kit',
        originCity: undefined,
      };
      expect(getOriginCityForKit(unannotatedKit)).toBe('Pune');
    });
  });

  describe('getCitySpecialtyNames', () => {
    it('returns known specialty dishes for Pune', () => {
      const specialties = getCitySpecialtyNames('Pune');
      expect(specialties).toContain('Authentic Puneri Misal Pav');
      expect(specialties.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('rankMealKitsForCityTrending', () => {
    it('ranks Pune regional specialties FIRST, followed by other trending kits', () => {
      const kits = [sampleGenericWestKit, sampleHyderabadBiryani, samplePuneMisal];
      const ranked = rankMealKitsForCityTrending(kits, 'Pune', 'West');

      // First kit MUST be the Pune regional specialty
      expect(ranked[0]!.id).toBe(samplePuneMisal.id);
      expect(ranked[0]!.name).toContain('Misal');

      // Total items should include the other eligible candidates
      expect(ranked.length).toBe(3);

      // No duplicate items
      const ids = ranked.map((k) => k.id);
      expect(new Set(ids).size).toBe(ranked.length);
    });

    it('ranks correctly when multiple Pune regional specialties exist', () => {
      const secondPuneKit: MealKit = {
        ...samplePuneMisal,
        id: 'pune-pithla',
        name: 'Puneri Pithla Bhakri & Thecha Kit',
        rating: 4.88,
      };
      const kits = [sampleGenericWestKit, secondPuneKit, samplePuneMisal];
      const ranked = rankMealKitsForCityTrending(kits, 'Pune', 'West');

      // The first two items must both be Pune regional specialties
      expect(isRegionalSpecialtyOfCity(ranked[0]!, 'Pune')).toBe(true);
      expect(isRegionalSpecialtyOfCity(ranked[1]!, 'Pune')).toBe(true);

      // Highest rated Pune specialty comes first
      expect(ranked[0]!.id).toBe(samplePuneMisal.id);
      expect(ranked[1]!.id).toBe(secondPuneKit.id);

      // Generic trending kit follows afterwards
      expect(ranked[2]!.id).toBe(sampleGenericWestKit.id);
    });
  });

  describe('ensureCitySpecialtiesSeeded', () => {
    it('checks current catalog and does not duplicate if Pune specialties are present', async () => {
      // In-memory catalog already contains the new Pune INITIAL_MEAL_KITS
      const currentKits = getMealKits();
      const hasPune = currentKits.some((k) => isRegionalSpecialtyOfCity(k, 'Pune'));
      expect(hasPune).toBe(true);

      // Calling ensureCitySpecialtiesSeeded should return empty array since already seeded
      const result = await ensureCitySpecialtiesSeeded('Pune');
      expect(result).toEqual([]);
    });
  });
});
