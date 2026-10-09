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
  saveVerifiedContactInfo,
  getVerifiedContactInfo,
  clearVerifiedContactInfo,
  VERIFIED_GUEST_CONTACT_STORAGE_KEY,
  SAVED_DELIVERY_ADDRESS_STORAGE_KEY,
} from '../services/verifiedContactService';
import {
  getUserProfileFromSupabase,
  saveUserProfileToSupabase,
  UserProfileData,
} from '../services/supabaseUserService';
import { saveStoredUser, getStoredUser, UserProfile } from '../firebase/authService';

describe('Verified Customer Contact & Address Persistence Service', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await AsyncStorage.clear();
  });

  it('rejects saving contact info if name is empty or phone is invalid', async () => {
    const res1 = await saveVerifiedContactInfo({
      userId: 'user_1',
      name: '   ',
      phone: '9876543210',
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Valid name and 10-digit phone number');

    const res2 = await saveVerifiedContactInfo({
      userId: 'user_1',
      name: 'Arjun Das',
      phone: '12345',
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Valid name and 10-digit phone number');
  });

  it('persists verified contact details and delivery address for signed-in user across databases and caches', async () => {
    const userId = 'customer_rohit_44';

    // Pre-create user profile with preferences
    const initialProfile: UserProfileData = {
      uid: userId,
      displayName: 'Rohit',
      phoneNumber: '+919988776655',
      preferences: {
        dietTypes: ['veg'],
        allergies: [],
        spiceTolerance: 'Medium',
        preferredCuisines: ['North Indian'],
        state: 'Karnataka',
        city: 'Bengaluru',
        subRegion: '',
        regionHub: 'South',
        currentCity: 'Bengaluru',
        isOnboarded: true,
      },
      addresses: [],
      preferredPaymentMethod: 'UPI',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };
    await saveUserProfileToSupabase(initialProfile);

    // Seed auth user
    const authUser: UserProfile = {
      uid: userId,
      displayName: 'Rohit',
      phoneNumber: '+919988776655',
      email: 'rohit@example.com',
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    await saveStoredUser(authUser);

    // Save newly verified contact details with delivery address
    const result = await saveVerifiedContactInfo({
      userId,
      name: 'Rohit Verma',
      phone: '+91 98765 43210',
      email: 'rohit.verma@example.com',
      address: {
        flatAndStreet: 'Flat 402, Sunshine Residency',
        areaAndLandmark: '12th Main Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        deliveryInstructions: 'Ring bell twice',
        tag: 'Home',
      },
    });

    expect(result.success).toBe(true);

    // 1. Check verified contact query retrieves contact AND delivery address
    const verified = await getVerifiedContactInfo(userId);
    expect(verified).not.toBeNull();
    expect(verified?.name).toBe('Rohit Verma');
    expect(verified?.phone).toBe('9876543210');
    expect(verified?.email).toBe('rohit.verma@example.com');
    expect(verified?.isVerified).toBe(true);
    expect(verified?.address).toBeDefined();
    expect(verified?.address?.flatAndStreet).toBe('Flat 402, Sunshine Residency');
    expect(verified?.address?.areaAndLandmark).toBe('12th Main Indiranagar');
    expect(verified?.address?.city).toBe('Bengaluru');
    expect(verified?.address?.pincode).toBe('560038');

    // 2. Check updated profile in Supabase table preserves preferences and holds saved address
    const updatedProfile = await getUserProfileFromSupabase(userId);
    expect(updatedProfile?.displayName).toBe('Rohit Verma');
    expect(updatedProfile?.phoneNumber).toBe('+919876543210');
    expect(updatedProfile?.email).toBe('rohit.verma@example.com');
    expect(updatedProfile?.preferences.preferredCuisines).toContain('North Indian');
    expect(updatedProfile?.addresses).toHaveLength(1);
    expect(updatedProfile?.addresses[0]?.flatAndStreet).toBe('Flat 402, Sunshine Residency');
    expect(updatedProfile?.addresses[0]?.isDefault).toBe(true);

    // 3. Check updated auth session
    const updatedAuth = await getStoredUser();
    expect(updatedAuth?.displayName).toBe('Rohit Verma');
    expect(updatedAuth?.phoneNumber).toBe('+919876543210');
    expect(updatedAuth?.email).toBe('rohit.verma@example.com');
  });

  it('persists and retrieves verified contact details and delivery address for guest users without sign-in', async () => {
    // Guest places first order with contact details and delivery address
    const guestSave = await saveVerifiedContactInfo({
      name: 'Sneha Patel',
      phone: '9811223344',
      email: 'sneha@guestmail.com',
      isGuest: true,
      address: {
        flatAndStreet: 'House No 12, Park Lane',
        areaAndLandmark: 'Koramangala 4th Block',
        city: 'Bengaluru',
        pincode: '560034',
        deliveryInstructions: 'Leave with security guard',
        tag: 'Home',
      },
    });
    expect(guestSave.success).toBe(true);

    // Next time guest opens checkout, retrieve saved contact and delivery address
    const retrieved = await getVerifiedContactInfo();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Sneha Patel');
    expect(retrieved?.phone).toBe('9811223344');
    expect(retrieved?.email).toBe('sneha@guestmail.com');
    expect(retrieved?.isVerified).toBe(true);
    expect(retrieved?.address).toBeDefined();
    expect(retrieved?.address?.flatAndStreet).toBe('House No 12, Park Lane');
    expect(retrieved?.address?.areaAndLandmark).toBe('Koramangala 4th Block');
    expect(retrieved?.address?.pincode).toBe('560034');

    // Check persistent storage key directly
    const rawGuest = await AsyncStorage.getItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY);
    expect(rawGuest).not.toBeNull();
    const parsed = JSON.parse(rawGuest!);
    expect(parsed.name).toBe('Sneha Patel');
    expect(parsed.address?.flatAndStreet).toBe('House No 12, Park Lane');

    const rawAddress = await AsyncStorage.getItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY);
    expect(rawAddress).not.toBeNull();
  });

  it('clears verified guest contact and saved address when requested', async () => {
    await saveVerifiedContactInfo({
      name: 'Temp Guest',
      phone: '9000000001',
      isGuest: true,
      address: {
        flatAndStreet: 'Temp House',
        areaAndLandmark: 'Temp Road',
        city: 'Bengaluru',
        pincode: '560001',
      },
    });

    let before = await getVerifiedContactInfo();
    expect(before?.name).toBe('Temp Guest');
    expect(before?.address?.flatAndStreet).toBe('Temp House');

    await clearVerifiedContactInfo();

    let after = await getVerifiedContactInfo();
    expect(after).toBeNull();
  });
});
