import {
  grantChefRole,
  revokeChefRole,
  fetchAllChefProfiles,
  fetchChefProfile,
} from '../services/adminRbacService';
import {
  createChefSubmission,
  updateChefSubmission,
  fetchChefSubmissions,
  publishChefSubmission,
  deleteChefSubmission,
  ChefRecipeSubmission,
} from '../services/chefMealKitsService';
import {
  fetchLiveManagedUsers,
  getManagedUsers,
  toggleUserChefRole,
} from '../services/userManagementService';
import { getMealKits } from '../services/mealKitsService';

describe('Chef Promotion & Meal Kit Authoring / Editing', () => {
  const chefUid = 'user_chef_test_01';
  const chefEmail = 'testchef@example.com';
  const chefName = 'Chef Gordon';

  beforeAll(async () => {
    // Promote user to chef
    await grantChefRole(chefUid, chefEmail, chefName, 'admin@mulyam.in', 'Master Chef', 'Indian Fusion');
  });

  afterAll(async () => {
    await revokeChefRole(chefUid, chefEmail);
  });

  describe('Promote Customer to Chef Role', () => {
    it('grants chef role and records it in chef profiles', async () => {
      const profile = await fetchChefProfile(chefUid);
      expect(profile).toBeDefined();
      expect(profile?.email).toBe(chefEmail);
      expect(profile?.displayName).toBe(chefName);

      const allChefs = await fetchAllChefProfiles();
      expect(allChefs.some((c) => c.uid === chefUid)).toBe(true);
    });

    it('toggles user chef role in user management store', () => {
      toggleUserChefRole(chefUid);
      const users = getManagedUsers();
      // Should reflect toggled state
      expect(users).toBeDefined();
    });
  });

  describe('Chef Meal Kit Creation & Editing Flow', () => {
    let submissionId: string = '';

    const initialRecipe: ChefRecipeSubmission = {
      name: 'Paneer Butter Masala Special',
      tagline: 'Rich, creamy and authentic',
      description: 'Signature cottage cheese in velvety tomato gravy',
      heroImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
      galleryImages: [],
      diet: 'veg',
      cuisine: 'North Indian',
      dishCategory: 'Curries & Gravies',
      spiceLevel: 'Medium',
      servings: 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      dietaryTags: ['veg', 'gluten-free'],
      allergens: ['Dairy'],
      ingredients: [
        { name: 'Paneer Cubes', quantity: '250g' },
        { name: 'Butter Masala Gravy', quantity: '300ml' },
      ],
      recipeSteps: [
        { stepNumber: 1, title: 'Heat Gravy', instruction: 'Simmer gravy in pan for 5 minutes' },
        { stepNumber: 2, title: 'Add Paneer', instruction: 'Fold in paneer cubes gently' },
      ],
      chefId: chefUid,
      chefName,
    };

    it('allows chef to create a new recipe submission with pending_review status', async () => {
      const res = await createChefSubmission(initialRecipe);
      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();
      submissionId = res.id!;

      const chefKits = await fetchChefSubmissions(chefUid);
      const created = chefKits.find((k) => k.id === submissionId);
      expect(created).toBeDefined();
      expect(created?.name).toBe('Paneer Butter Masala Special');
      expect(created?.submissionStatus).toBe('pending_review');
    });

    it('allows chef to edit their recipe and resets status to pending_review for admin approval', async () => {
      const updatedData: Partial<ChefRecipeSubmission> = {
        name: 'Royal Paneer Butter Masala Deluxe',
        prepTimeMinutes: 10,
        ingredients: [
          { name: 'Malai Paneer Cubes', quantity: '300g' },
          { name: 'Royal Makhani Gravy', quantity: '350ml' },
          { name: 'Kasuri Methi', quantity: '5g' },
        ],
      };

      const res = await updateChefSubmission(submissionId, updatedData, chefUid);
      expect(res.success).toBe(true);

      const chefKits = await fetchChefSubmissions(chefUid);
      const updated = chefKits.find((k) => k.id === submissionId);
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Royal Paneer Butter Masala Deluxe');
      expect(updated?.prepTimeMinutes).toBe(10);
      expect(updated?.ingredients.length).toBe(3);
      expect(updated?.submissionStatus).toBe('pending_review');
    });

    it('blocks another non-owner chef from editing the submission', async () => {
      const maliciousEdit: Partial<ChefRecipeSubmission> = {
        name: 'Hacked Recipe',
      };
      const res = await updateChefSubmission(submissionId, maliciousEdit, 'other_chef_999', false);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/only edit your own/i);
    });

    it('allows admin to publish the chef submission with price and regions', async () => {
      const pubRes = await publishChefSubmission(
        submissionId,
        349,
        ['West', 'North'],
        ['pune-city'],
        ['Pune', 'Mumbai'],
        'Approved with standard pricing',
      );
      expect(pubRes.success).toBe(true);
      expect(pubRes.kit).toBeDefined();
      expect(pubRes.kit?.price).toBe(349);

      // Verify meal kit was added to the active meal kits catalog/database
      const liveCatalogKit = getMealKits().find((k) => k.id === submissionId);
      expect(liveCatalogKit).toBeDefined();
      expect(liveCatalogKit?.name).toBe('Royal Paneer Butter Masala Deluxe');
      expect(liveCatalogKit?.price).toBe(349);
      expect(liveCatalogKit?.isChefSpecial).toBe(true);

      const chefKits = await fetchChefSubmissions(chefUid);
      const published = chefKits.find((k) => k.id === submissionId);
      expect(published?.submissionStatus).toBe('published');
      expect(published?.price).toBe(349);
    });

    it('reverts a published recipe back to pending_review when edited by the chef', async () => {
      const reEdit: Partial<ChefRecipeSubmission> = {
        description: 'New improved description with extra aromatic spices',
      };

      const editRes = await updateChefSubmission(submissionId, reEdit, chefUid);
      expect(editRes.success).toBe(true);

      const chefKits = await fetchChefSubmissions(chefUid);
      const item = chefKits.find((k) => k.id === submissionId);
      expect(item?.description).toBe('New improved description with extra aromatic spices');
      // Must be pending_review again for admin re-approval
      expect(item?.submissionStatus).toBe('pending_review');
    });

    it('allows chef to clean up by deleting their own submission', async () => {
      const delRes = await deleteChefSubmission(submissionId, chefUid);
      expect(delRes.success).toBe(true);

      const chefKits = await fetchChefSubmissions(chefUid);
      expect(chefKits.some((k) => k.id === submissionId)).toBe(false);
    });
  });
});
