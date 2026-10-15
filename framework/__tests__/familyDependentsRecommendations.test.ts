import {
  addDependentMember,
  updateDependentPreferences,
  fetchFamilyMembers,
  createFamily,
  FamilyMember,
} from '../services/familyService';
import { getMealKits, MealKit } from '../services/mealKitsService';

describe('Family Managed Dependents (Child / Senior) & Recommendations', () => {
  let testFamilyId: string;
  const ownerId = 'test_owner_dep_suite';

  beforeAll(async () => {
    const fam = await createFamily('Kapoor', 'Kapoor Family', ownerId);
    testFamilyId = fam.family!.id;
  });

  it('directly creates a child profile with age, gender, and dietary preferences without sending an invitation', async () => {
    const childPrefs = {
      age: 8,
      gender: 'Male',
      dietTypes: ['veg'],
      allergies: ['Peanuts'],
      spiceTolerance: 'Mild',
      preferredCuisines: ['Italian'],
    };

    const res = await addDependentMember(testFamilyId, 'child', 'Aarav', childPrefs, ownerId);

    expect(res.success).toBe(true);
    expect(res.member).toBeDefined();
    expect(res.member?.display_name).toBe('Aarav');
    expect(res.member?.role).toBe('dependent');
    expect(res.member?.dependent_type).toBe('child');
    expect(res.member?.age).toBe(8);
    expect(res.member?.gender).toBe('Male');
    expect(res.member?.preferences).toEqual(childPrefs);

    const members = await fetchFamilyMembers(testFamilyId);
    const aarav = members.find((m) => m.display_name === 'Aarav');
    expect(aarav).toBeDefined();
    expect(aarav?.age).toBe(8);
    expect(aarav?.gender).toBe('Male');
    expect(aarav?.preferences?.spiceTolerance).toBe('Mild');
  });

  it('directly creates a senior citizen profile with age, gender, and gentle digestive preferences', async () => {
    const seniorPrefs = {
      age: 72,
      gender: 'Female',
      dietTypes: ['veg'],
      allergies: ['Gluten / Wheat'],
      spiceTolerance: 'Mild',
      preferredCuisines: ['South Indian', 'Gujarati'],
    };

    const res = await addDependentMember(testFamilyId, 'senior', 'Dadi', seniorPrefs, ownerId);

    expect(res.success).toBe(true);
    expect(res.member?.dependent_type).toBe('senior');
    expect(res.member?.age).toBe(72);
    expect(res.member?.gender).toBe('Female');
    expect(res.member?.preferences?.preferredCuisines).toContain('South Indian');
  });

  it('rejects child profiles with ages outside 4-15', async () => {
    const tooYoung = await addDependentMember(testFamilyId, 'child', 'Infant', { age: 2 }, ownerId);
    expect(tooYoung.success).toBe(false);
    expect(tooYoung.error).toContain('between 4 and 15');

    const tooOld = await addDependentMember(testFamilyId, 'child', 'Teen', { age: 17 }, ownerId);
    expect(tooOld.success).toBe(false);
    expect(tooOld.error).toContain('between 4 and 15');
  });

  it('rejects senior profiles with ages outside 60-120', async () => {
    const tooYoung = await addDependentMember(
      testFamilyId,
      'senior',
      'Uncle',
      { age: 52 },
      ownerId,
    );
    expect(tooYoung.success).toBe(false);
    expect(tooYoung.error).toContain('between 60 and 120');

    const tooOld = await addDependentMember(
      testFamilyId,
      'senior',
      'Centenarian',
      { age: 125 },
      ownerId,
    );
    expect(tooOld.success).toBe(false);
    expect(tooOld.error).toContain('between 60 and 120');
  });

  it('allows owner to edit preferences for child or senior profile', async () => {
    const members = await fetchFamilyMembers(testFamilyId);
    const aarav = members.find((m) => m.display_name === 'Aarav');
    expect(aarav).toBeDefined();

    const updatedPrefs = {
      dietTypes: ['veg', 'jain'],
      allergies: ['Peanuts', 'Dairy'],
      spiceTolerance: 'Mild',
      preferredCuisines: ['Italian', 'Mexican'],
    };

    const res = await updateDependentPreferences(
      testFamilyId,
      aarav!.user_id,
      updatedPrefs,
      ownerId,
    );
    expect(res.success).toBe(true);

    const refreshedMembers = await fetchFamilyMembers(testFamilyId);
    const refreshedAarav = refreshedMembers.find((m) => m.user_id === aarav!.user_id);
    expect(refreshedAarav?.preferences?.allergies).toContain('Dairy');
    expect(refreshedAarav?.preferences?.preferredCuisines).toContain('Mexican');
  });

  it('filters and recommends meal kits matching child preferences strictly', () => {
    const allKits = getMealKits();
    expect(allKits.length).toBeGreaterThan(0);

    const childPrefs = {
      dietTypes: ['veg'],
      allergies: ['Dairy'],
      spiceTolerance: 'Mild',
      preferredCuisines: ['Italian'],
    };

    // Filter matching kits
    const matching = allKits
      .filter((k) => k.diet === 'veg' || (k.dietaryTags && k.dietaryTags.includes('veg')))
      .filter((k) => {
        const kitAllergens = (k.allergens || []).map((a) => a.toLowerCase());
        return !childPrefs.allergies.some((a) =>
          kitAllergens.some((ka) => ka.includes(a.toLowerCase())),
        );
      });

    expect(matching.length).toBeGreaterThan(0);
    // Every matching kit must be veg
    matching.forEach((k) => {
      expect(k.diet === 'veg' || k.dietaryTags?.includes('veg')).toBe(true);
      // None should contain Dairy
      const allergensStr = (k.allergens || []).join(' ').toLowerCase();
      expect(allergensStr.includes('dairy')).toBe(false);
    });
  });

  it('strictly filters meal kits by cuisine preference and excludes European dishes like Ratatouille for Indian preferences', () => {
    const allKits = getMealKits();
    const seniorPrefs = {
      dietTypes: ['veg'],
      allergies: [],
      spiceTolerance: 'Mild',
      preferredCuisines: ['North Indian', 'South Indian'],
    };

    const preferredSet = new Set(seniorPrefs.preferredCuisines.map((c) => c.toLowerCase().trim()));

    const matching = allKits
      .filter((k) => k.diet === 'veg' || (k.dietaryTags && k.dietaryTags.includes('veg')))
      .filter((k) => {
        if (!k.cuisine) return false;
        return preferredSet.has(k.cuisine.toLowerCase().trim());
      });

    expect(matching.length).toBeGreaterThan(0);
    // All matching must have North Indian or South Indian cuisine
    matching.forEach((k) => {
      expect(['North Indian', 'South Indian']).toContain(k.cuisine);
      expect(k.cuisine).not.toBe('European');
      expect(k.name.toLowerCase()).not.toContain('ratatouille');
    });

    // Ratatouille is specifically excluded
    const ratatouille = allKits.find((k) => k.name.toLowerCase().includes('ratatouille'));
    expect(ratatouille).toBeDefined();
    expect(matching.some((k) => k.id === ratatouille?.id)).toBe(false);
  });

  it('enforces total seat capacity limit of 6 members including dependents', async () => {
    // Add members until 6
    const current = await fetchFamilyMembers(testFamilyId);
    for (let i = current.length; i < 6; i++) {
      await addDependentMember(testFamilyId, 'child', `Kid${i}`, {}, ownerId);
    }

    // 7th should fail
    const overflow = await addDependentMember(
      testFamilyId,
      'senior',
      'OverflowMember',
      {},
      ownerId,
    );
    expect(overflow.success).toBe(false);
    expect(overflow.error).toContain('capacity');
  });
});
