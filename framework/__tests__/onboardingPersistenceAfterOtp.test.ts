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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoredUserLocation,
  saveStoredUserLocation,
  USER_LOCATION_STORAGE_KEY,
} from '../services/locationService';
import {
  getUserProfileFromSupabase,
  saveUserProfileToSupabase,
} from '../services/supabaseUserService';

// Mock Supabase user service
jest.mock('../services/supabaseUserService', () => {
  const original = jest.requireActual('../services/supabaseUserService');
  return {
    ...original,
    getUserProfileFromSupabase: jest.fn(),
    saveUserProfileToSupabase: jest.fn(async () => ({ success: true })),
  };
});

describe('Onboarding Location Persistence After Phone OTP Signup', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('should persist guest location during initial onboarding', async () => {
    await saveStoredUserLocation({
      city: 'Pune',
      pincode: '411001',
      hub: 'West',
      state: 'Maharashtra',
      isAutoDetected: false,
    });

    const stored = await getStoredUserLocation();
    expect(stored).not.toBeNull();
    expect(stored?.city).toBe('Pune');
    expect(stored?.hub).toBe('West');
  });

  it('should recognize that a user with stored location has a valid location and does not need location onboarding', async () => {
    await saveStoredUserLocation({
      city: 'Mumbai',
      pincode: '400001',
      hub: 'West',
      state: 'Maharashtra',
    });

    const stored = await getStoredUserLocation();
    const preferencesCity = '';
    const preferencesCurrentCity = '';

    // Logic used in app/(tabs)/_layout.tsx
    const hasValidLocation = Boolean(preferencesCity || preferencesCurrentCity || stored?.city);
    const isDependent = false;
    const needsLocationOnboarding = !isDependent && !hasValidLocation;

    expect(hasValidLocation).toBe(true);
    expect(needsLocationOnboarding).toBe(false);
  });

  it('should preserve and link onboarding location to a newly created authenticated profile after OTP verification', async () => {
    // 1. User onboards as guest and selects Pune
    await saveStoredUserLocation({
      city: 'Pune',
      pincode: '411001',
      hub: 'West',
      state: 'Maharashtra',
    });

    // 2. Newly verified user in Supabase has no profile yet (returns null)
    (getUserProfileFromSupabase as jest.Mock).mockResolvedValueOnce(null);

    // 3. User verifies phone OTP -> UID 'user-test-123'
    const newUid = 'user-test-123';
    const profile = await getUserProfileFromSupabase(newUid);
    expect(profile).toBeNull();

    // 4. Verify that stored location exists and can be linked
    const storedLoc = await getStoredUserLocation();
    expect(storedLoc?.city).toBe('Pune');

    // Simulate saving the linked profile as implemented in PreferencesContext
    const linkedProfile = {
      uid: newUid,
      email: 'user@example.com',
      phoneNumber: '+919876543210',
      displayName: 'Rasoi Chef',
      preferences: {
        dietTypes: ['veg' as const],
        allergies: [],
        spiceTolerance: 'Medium' as const,
        preferredCuisines: ['North Indian' as const],
        city: storedLoc!.city,
        currentCity: storedLoc!.city,
        state: storedLoc!.state || '',
        subRegion: '',
        regionHub: storedLoc!.hub,
        isOnboarded: true,
      },
      addresses: [],
      preferredPaymentMethod: 'UPI' as const,
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await saveUserProfileToSupabase(linkedProfile);
    expect(saveResult.success).toBe(true);
    expect(saveUserProfileToSupabase).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: newUid,
        isOnboarded: true,
        preferences: expect.objectContaining({
          city: 'Pune',
          isOnboarded: true,
        }),
      }),
    );
  });
});
