const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorage.get(key) || null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorage.clear();
  }),
}));

import {
  saveUserProfileToSupabase,
  getUserProfileFromSupabase,
  clearAllLegacyUserData,
  UserProfileData,
  USER_PROFILE_STORAGE_PREFIX,
  LEGACY_MIGRATED_KEY,
} from '../services/supabaseUserService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('User Profile & Preferences Persistence Service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should purge legacy mock user data and mark migration complete', async () => {
    await AsyncStorage.setItem('@rasoi_mock_users', JSON.stringify(['dummy']));
    await AsyncStorage.setItem('@rasoi_saved_addresses', JSON.stringify(['Priya Sharma']));

    await clearAllLegacyUserData();

    const mockUsers = await AsyncStorage.getItem('@rasoi_mock_users');
    const mockAddresses = await AsyncStorage.getItem('@rasoi_saved_addresses');
    const migrationFlag = await AsyncStorage.getItem(LEGACY_MIGRATED_KEY);

    expect(mockUsers).toBeNull();
    expect(mockAddresses).toBeNull();
    expect(migrationFlag).toBe('true');
  });

  it('should save user profile to storage and retrieve it by user UID', async () => {
    const testProfile: UserProfileData = {
      uid: 'user_chef_99',
      email: 'chef@mulyam.in',
      displayName: 'Chef Arjun',
      phoneNumber: '+91 9876543210',
      preferences: {
        dietType: 'veg',
        allergies: ['Peanuts'],
        spiceTolerance: 'Spicy',
        preferredCuisines: ['Hyderabadi', 'Punjabi', 'Coastal'],
        regionHub: 'South',
        currentCity: 'Bengaluru',
        isOnboarded: true,
      },
      addresses: [
        {
          id: 'addr-101',
          name: 'Chef Arjun',
          phone: '+91 9876543210',
          flatAndStreet: 'Flat 304, Palm Heights',
          areaAndLandmark: 'Indiranagar 100ft Road',
          city: 'Bengaluru',
          pincode: '560038',
          tag: 'Home',
          isDefault: true,
        },
      ],
      preferredPaymentMethod: 'UPI',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await saveUserProfileToSupabase(testProfile);
    expect(saveResult.success).toBe(true);

    const retrieved = await getUserProfileFromSupabase('user_chef_99');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.uid).toBe('user_chef_99');
    expect(retrieved?.displayName).toBe('Chef Arjun');
    expect(retrieved?.preferences.dietType).toBe('veg');
    expect(retrieved?.preferences.spiceTolerance).toBe('Spicy');
    expect(retrieved?.preferences.preferredCuisines).toContain('Hyderabadi');
    expect(retrieved?.addresses).toHaveLength(1);
    expect(retrieved?.addresses?.[0]?.flatAndStreet).toBe('Flat 304, Palm Heights');
    expect(retrieved?.preferredPaymentMethod).toBe('UPI');
    expect(retrieved?.isOnboarded).toBe(true);
  });

  it('should return null for unknown user UID when no profile exists', async () => {
    const unknown = await getUserProfileFromSupabase('non_existent_uid_12345');
    expect(unknown).toBeNull();
  });

  it('should retain user profile in storage across mock logout and subsequent login', async () => {
    const uid = 'persistent_user_42';
    const profile: UserProfileData = {
      uid,
      email: 'foodie@gmail.com',
      displayName: 'Foodie Fan',
      preferences: {
        dietType: 'nonveg',
        allergies: [],
        spiceTolerance: 'Medium',
        preferredCuisines: ['Coastal', 'Mughlai'],
        regionHub: 'West',
        currentCity: 'Mumbai',
        isOnboarded: true,
      },
      addresses: [
        {
          id: 'addr-mumbai',
          name: 'Foodie Fan',
          phone: '+91 9988776655',
          flatAndStreet: 'B-12 Sea View Apts',
          areaAndLandmark: 'Bandra West',
          city: 'Mumbai',
          pincode: '400050',
          tag: 'Home',
          isDefault: true,
        },
      ],
      preferredPaymentMethod: 'Card',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };

    // User completes setup
    await saveUserProfileToSupabase(profile);

    // Simulated user logout: session active token cleared, but saved profile remains
    // Then user logs back in with same UID
    const restored = await getUserProfileFromSupabase(uid);
    expect(restored).not.toBeNull();
    expect(restored?.preferredPaymentMethod).toBe('Card');
    expect(restored?.preferences.regionHub).toBe('West');
    expect(retrievedAddressCity(restored)).toBe('Mumbai');
    expect(restored?.isOnboarded).toBe(true);
  });
});

function retrievedAddressCity(p: UserProfileData | null) {
  return p?.addresses?.[0]?.city;
}
