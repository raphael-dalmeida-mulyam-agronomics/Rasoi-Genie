import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../supabase/client';
import { UserDietaryPreferences, AddressItem } from '../context/PreferencesContext';
import { PaymentMethod } from '../context/CartContext';

export interface UserProfileData {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  preferences: UserDietaryPreferences;
  addresses: AddressItem[];
  preferredPaymentMethod: PaymentMethod;
  isOnboarded: boolean;
  updatedAt: string;
}

export const USER_PROFILE_STORAGE_PREFIX = '@rasoi_user_profile_';
export const LEGACY_MIGRATED_KEY = '@rasoi_legacy_data_purged_v1';

/**
 * Purges legacy mock user data (e.g. Priya Sharma mock addresses, old mock preference blobs)
 * so users start with a clean slate.
 */
export async function clearAllLegacyUserData(): Promise<void> {
  try {
    const legacyKeys = [
      '@rasoi_user_preferences',
      '@rasoi_saved_addresses',
      '@rasoi_mock_users',
      'rasoi_user_prefs',
    ];

    if (typeof window !== 'undefined' && window.localStorage) {
      for (const key of legacyKeys) {
        window.localStorage.removeItem(key);
      }
      window.localStorage.setItem(LEGACY_MIGRATED_KEY, 'true');
    }

    for (const key of legacyKeys) {
      await AsyncStorage.removeItem(key);
    }
    await AsyncStorage.setItem(LEGACY_MIGRATED_KEY, 'true');
  } catch (err) {
    console.warn('[UserService] Could not clear legacy mock data:', err);
  }
}

/**
 * Persists user profile to both Supabase `user_profiles` table and local device storage.
 */
export async function saveUserProfileToSupabase(
  profile: UserProfileData,
): Promise<{ success: boolean; error?: string }> {
  if (!profile.uid) {
    return { success: false, error: 'User ID is required to save profile.' };
  }

  const storageKey = `${USER_PROFILE_STORAGE_PREFIX}${profile.uid}`;
  const serialized = JSON.stringify(profile);

  // 1. Always persist locally first (cross-platform offline-first)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, serialized);
    }
    await AsyncStorage.setItem(storageKey, serialized);
  } catch (localErr) {
    console.warn('[UserService] Error saving profile to local storage:', localErr);
  }

  // 2. Persist to Supabase `user_profiles` table
  try {
    const supabase = getSupabaseClient();
    const row = {
      uid: profile.uid,
      email: profile.email || null,
      display_name: profile.displayName || null,
      phone_number: profile.phoneNumber || null,
      preferences: profile.preferences,
      addresses: profile.addresses,
      preferred_payment_method: profile.preferredPaymentMethod,
      is_onboarded: profile.isOnboarded,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'uid' });

    if (error) {
      console.warn('[UserService] Supabase upsert error (using local cache):', error.message);
      return { success: true }; // Local cache is active
    }

    return { success: true };
  } catch (dbErr: any) {
    console.warn('[UserService] Supabase exception (using local cache):', dbErr?.message || dbErr);
    return { success: true };
  }
}

/**
 * Loads user profile for a specific user UID.
 * Checks Supabase first, falls back to local cache.
 */
export async function getUserProfileFromSupabase(uid: string): Promise<UserProfileData | null> {
  if (!uid) return null;

  const storageKey = `${USER_PROFILE_STORAGE_PREFIX}${uid}`;

  // 1. Check local storage cache for instant response
  let cachedProfile: UserProfileData | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const webData = window.localStorage.getItem(storageKey);
      if (webData) {
        cachedProfile = JSON.parse(webData) as UserProfileData;
      }
    }
    if (!cachedProfile) {
      const nativeData = await AsyncStorage.getItem(storageKey);
      if (nativeData) {
        cachedProfile = JSON.parse(nativeData) as UserProfileData;
      }
    }
  } catch (err) {
    console.warn('[UserService] Error reading local profile cache:', err);
  }

  // 2. Try fetching freshest profile from Supabase
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();

    if (!error && data) {
      const remoteProfile: UserProfileData = {
        uid: data.uid,
        email: data.email || undefined,
        displayName: data.display_name || undefined,
        phoneNumber: data.phone_number || undefined,
        preferences: data.preferences,
        addresses: data.addresses || [],
        preferredPaymentMethod: data.preferred_payment_method || 'UPI',
        isOnboarded: data.is_onboarded ?? false,
        updatedAt: data.updated_at || new Date().toISOString(),
      };

      // Update local cache
      const serialized = JSON.stringify(remoteProfile);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, serialized);
      }
      await AsyncStorage.setItem(storageKey, serialized);

      return remoteProfile;
    }
  } catch (dbErr: any) {
    console.warn('[UserService] Exception fetching from Supabase:', dbErr?.message || dbErr);
  }

  // Return local cache if remote fetch failed or returned null
  return cachedProfile;
}
