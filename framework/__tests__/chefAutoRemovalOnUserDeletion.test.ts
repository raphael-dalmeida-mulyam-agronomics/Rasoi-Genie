import {
  grantChefRole,
  revokeChefRole,
  fetchAllChefProfiles,
  fetchChefProfile,
} from '../services/adminRbacService';
import {
  deleteManagedUser,
  fetchLiveManagedUsers,
  getManagedUsers,
} from '../services/userManagementService';
import {
  saveUserProfileToSupabase,
  deleteUserProfileFromSupabase,
} from '../services/supabaseUserService';

describe('Chef Auto-Removal on User Deletion (Frontend & Backend Sync)', () => {
  const testUserUid = 'user_chef_autoremove_test';
  const testUserEmail = 'autoremove_chef@test.com';
  const testUserName = 'Chef Vikram';

  beforeEach(async () => {
    // 1. Setup user profile
    await saveUserProfileToSupabase({
      uid: testUserUid,
      email: testUserEmail,
      displayName: testUserName,
      phoneNumber: '+919999988888',
      preferences: {
        city: 'Mumbai',
        state: 'Maharashtra',
        subRegion: 'West Mumbai',
        allergies: [],
        dietTypes: ['veg'],
        regionHub: 'West',
        currentCity: 'Mumbai',
        isOnboarded: true,
        spiceTolerance: 'Medium',
        preferredCuisines: ['North Indian'],
      },
      addresses: [],
      preferredPaymentMethod: 'UPI',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    });

    // 2. Grant chef role
    await grantChefRole(
      testUserUid,
      testUserEmail,
      testUserName,
      'admin@mulyam.in',
      'Executive Chef',
      'Modern Mughlai',
    );
  });

  afterEach(async () => {
    // Cleanup if test didn't already delete
    await revokeChefRole(testUserUid, testUserEmail);
    await deleteUserProfileFromSupabase(testUserUid, testUserEmail);
  });

  it('promotes user to chef and confirms presence in approved chefs', async () => {
    const profile = await fetchChefProfile(testUserUid);
    expect(profile).toBeDefined();
    expect(profile?.email).toBe(testUserEmail);

    const allChefs = await fetchAllChefProfiles();
    expect(allChefs.some((c) => c.uid === testUserUid)).toBe(true);
  });

  it('automatically revokes and removes chef profile when deleteManagedUser is executed', async () => {
    // Confirm chef is present initially
    let allChefs = await fetchAllChefProfiles();
    expect(allChefs.some((c) => c.uid === testUserUid)).toBe(true);

    // Act: Delete user through managed user service (as triggered by admin delete button)
    const deleteResult = await deleteManagedUser(testUserUid);
    expect(deleteResult.success).toBe(true);

    // Assert: User is removed from managed users store
    const managedUsers = getManagedUsers();
    expect(managedUsers.some((u) => u.id === testUserUid)).toBe(false);

    // Assert: Chef is automatically removed from approved chefs
    allChefs = await fetchAllChefProfiles();
    expect(allChefs.some((c) => c.uid === testUserUid)).toBe(false);

    // Assert: Direct fetch returns null
    const chefProfile = await fetchChefProfile(testUserUid, testUserEmail);
    expect(chefProfile).toBeNull();
  });

  it('automatically purges orphan chef records when user profile is deleted from Supabase', async () => {
    // Confirm chef is present
    let allChefs = await fetchAllChefProfiles();
    expect(allChefs.some((c) => c.uid === testUserUid)).toBe(true);

    // Act: Delete user directly from Supabase user service
    await deleteUserProfileFromSupabase(testUserUid, testUserEmail);

    // Assert: Approved chefs list automatically prunes the orphan record
    allChefs = await fetchAllChefProfiles();
    expect(allChefs.some((c) => c.uid === testUserUid)).toBe(false);
  });
});
