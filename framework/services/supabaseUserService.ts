import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { PaymentMethod } from '../context/CartContext';
import { AddressItem, UserDietaryPreferences } from '../context/PreferencesContext';
import { db } from '../firebase/config';
import { getSupabaseClient } from '../supabase/client';
import { isMissingSchemaError } from './supabaseUtils';

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
      if (!isMissingSchemaError(error)) {
        console.warn('[UserService] Supabase upsert error (using local cache):', error.message);
      }
      emitUserProfileUpdated();
      return { success: true }; // Local cache is active
    }

    // 3. Persist to Firestore `customers` collection for real-time cross-client sync
    try {
      const custDoc = doc(db, 'customers', profile.uid);
      await setDoc(
        custDoc,
        {
          uid: profile.uid,
          email: profile.email || null,
          displayName: profile.displayName || null,
          phoneNumber: profile.phoneNumber || null,
          preferences: profile.preferences || {},
          addresses: profile.addresses || [],
          preferredPaymentMethod: profile.preferredPaymentMethod || 'UPI',
          isOnboarded: profile.isOnboarded ?? false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch {
      // Ignore offline Firestore hiccups
    }

    emitUserProfileUpdated();
    return { success: true };
  } catch (dbErr: any) {
    if (!isMissingSchemaError(dbErr)) {
      console.warn(
        '[UserService] Supabase exception (using local cache):',
        dbErr?.message || dbErr,
      );
    }
    emitUserProfileUpdated();
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
    if (!isMissingSchemaError(dbErr)) {
      console.warn('[UserService] Exception fetching from Supabase:', dbErr?.message || dbErr);
    }
  }

  // Return local cache if remote fetch failed or returned null
  return cachedProfile;
}

// In-app profile update event listeners for instantaneous cross-component sync
type ProfileUpdateListener = () => void;
const profileListeners = new Set<ProfileUpdateListener>();

export function emitUserProfileUpdated(): void {
  profileListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[UserService] Error in profile listener:', e);
    }
  });
}

export function subscribeToUserProfileEvents(callback: ProfileUpdateListener): () => void {
  profileListeners.add(callback);
  return () => {
    profileListeners.delete(callback);
  };
}

/**
 * Fetches all actual registered customer profiles dynamically from Firestore,
 * Supabase orders, and local session caches.
 * No filler/fake mock accounts are injected.
 */
export async function fetchAllUserProfilesFromSupabase(): Promise<UserProfileData[]> {
  const profileMap = new Map<string, UserProfileData>();

  // 1. Fetch from Firestore `customers` collection
  try {
    const custSnap = await getDocs(collection(db, 'customers'));
    custSnap.forEach((d) => {
      const data = d.data();
      if (!data?.uid) return;
      profileMap.set(data.uid, {
        uid: data.uid,
        email: data.email || undefined,
        displayName: data.displayName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        preferences: data.preferences || {},
        addresses: data.addresses || [],
        preferredPaymentMethod: data.preferredPaymentMethod || 'UPI',
        isOnboarded: data.isOnboarded ?? false,
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
  } catch {}

  // 2. Discover customers from Firestore `orders` collection
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    ordersSnap.forEach((d) => {
      const order = d.data();
      if (!order?.userId) return;
      const existing = profileMap.get(order.userId);
      let parsedCity = 'Pan-India';
      if (typeof order.deliveryAddress === 'string') {
        const parts = order.deliveryAddress.split(',');
        parsedCity = parts[parts.length - 1]?.replace(/\d|-/g, '').trim() || 'Pan-India';
      }

      profileMap.set(order.userId, {
        uid: order.userId,
        displayName: order.customerName || existing?.displayName || 'Customer',
        phoneNumber: order.customerPhone || existing?.phoneNumber || undefined,
        email: order.customerEmail || existing?.email || undefined,
        preferences: { city: parsedCity } as any,
        addresses: [
          {
            id: `addr_${order.userId}`,
            name: order.customerName || 'Customer',
            phone: order.customerPhone || '',
            addressLine: typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '',
            city: parsedCity,
            pincode: '',
            isDefault: true,
          } as any,
        ],
        preferredPaymentMethod: (order.paymentMethod as PaymentMethod) || 'UPI',
        isOnboarded: true,
        updatedAt: order.createdAt || existing?.updatedAt || new Date().toISOString(),
      });
    });
  } catch {}

  // 3. Discover actual customer accounts from the live Supabase `orders` table
  try {
    const supabase = getSupabaseClient();
    const { data: ordersData, error: ordersErr } = await supabase
      .from('orders')
      .select(
        'user_id, customer_name, customer_phone, customer_email, delivery_address, created_at',
      )
      .order('created_at', { ascending: false });

    if (!ordersErr && Array.isArray(ordersData)) {
      ordersData.forEach((order: any) => {
        if (!order.user_id) return;
        const existing = profileMap.get(order.user_id);
        let parsedCity = 'Pan-India';
        if (typeof order.delivery_address === 'string') {
          const parts = order.delivery_address.split(',');
          parsedCity = parts[parts.length - 1]?.replace(/\d|-/g, '').trim() || 'Pan-India';
        }

        profileMap.set(order.user_id, {
          uid: order.user_id,
          displayName: order.customer_name || existing?.displayName || 'Customer',
          phoneNumber: order.customer_phone || existing?.phoneNumber || undefined,
          email: order.customer_email || existing?.email || undefined,
          preferences: { city: parsedCity } as any,
          addresses: [
            {
              id: `addr_${order.user_id}`,
              name: order.customer_name || 'Customer',
              phone: order.customer_phone || '',
              addressLine: typeof order.delivery_address === 'string' ? order.delivery_address : '',
              city: parsedCity,
              pincode: '',
              isDefault: true,
            } as any,
          ],
          preferredPaymentMethod: 'UPI',
          isOnboarded: true,
          updatedAt: order.created_at || existing?.updatedAt || new Date().toISOString(),
        });
      });
    }
  } catch (orderScanErr) {
    // Ignore schema or network hiccups
  }

  // 4. Fetch from Supabase `user_profiles` table if available
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (!row.uid) return;
        profileMap.set(row.uid, {
          uid: row.uid,
          email: row.email || undefined,
          displayName: row.display_name || undefined,
          phoneNumber: row.phone_number || undefined,
          preferences: row.preferences || {},
          addresses: row.addresses || [],
          preferredPaymentMethod: row.preferred_payment_method || 'UPI',
          isOnboarded: row.is_onboarded ?? false,
          updatedAt: row.updated_at || new Date().toISOString(),
        });
      });
    }
  } catch (err) {
    if (!isMissingSchemaError(err)) {
      console.warn('[UserService] Could not fetch all profiles from Supabase:', err);
    }
  }

  // 5. Scan AsyncStorage and localStorage for local profile keys
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(USER_PROFILE_STORAGE_PREFIX)) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as UserProfileData;
              if (parsed.uid) {
                profileMap.set(parsed.uid, parsed);
              }
            } catch {
              // Ignore invalid JSON
            }
          }
        }
      }

      // Check current auth user session
      const authRaw = window.localStorage.getItem('@rasoi_auth_user');
      if (authRaw) {
        try {
          const authUser = JSON.parse(authRaw);
          if (authUser?.uid && !profileMap.has(authUser.uid)) {
            profileMap.set(authUser.uid, {
              uid: authUser.uid,
              email: authUser.email || undefined,
              displayName: authUser.displayName || undefined,
              phoneNumber: authUser.phoneNumber || undefined,
              preferences: {} as any,
              addresses: [],
              preferredPaymentMethod: 'UPI',
              isOnboarded: false,
              updatedAt: authUser.createdAt || new Date().toISOString(),
            });
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch (localErr) {
    console.warn('[UserService] Error scanning local storage for user profiles:', localErr);
  }

  return Array.from(profileMap.values());
}

/**
 * Subscribes to real-time changes on the Supabase `user_profiles` table,
 * as well as in-app local profile mutation events.
 */
export function subscribeToUserProfilesRealtime(callback: () => void): () => void {
  // Local event subscription
  const unsubLocal = subscribeToUserProfileEvents(callback);

  // Supabase Realtime subscription
  let supabaseChannel: any = null;
  try {
    const supabase = getSupabaseClient();
    const channelTopic = `realtime_user_profiles_admin_${Math.random().toString(36).substring(2, 9)}`;
    supabaseChannel = supabase
      .channel(channelTopic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        callback();
      })
      .subscribe();
  } catch (err) {
    console.warn(
      '[UserService] Could not initialize Supabase Realtime channel for user_profiles:',
      err,
    );
  }

  return () => {
    unsubLocal();
    if (supabaseChannel) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(supabaseChannel);
      } catch {
        // Ignore
      }
    }
  };
}
