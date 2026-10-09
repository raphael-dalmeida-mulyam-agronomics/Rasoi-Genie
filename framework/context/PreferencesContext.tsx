import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CuisineType, DietTag, RegionHub, SpiceLevel } from '../services/mealKitsService';
import { legacyHubForCity } from '../services/regionService';
import {
  clearAllLegacyUserData,
  getUserProfileFromSupabase,
  saveUserProfileToSupabase,
  UserProfileData,
} from '../services/supabaseUserService';
import { useAuth } from './AuthContext';
import { PaymentMethod } from './CartContext';
import { getStoredUserLocation, saveStoredUserLocation } from '../services/locationService';
import { hubForCity, canonicalCityName } from '../../features/admin/cityKitsSeederService';

const GUEST_PREFS_KEY = '@rasoi_guest_preferences_v1';

export interface AddressItem {
  id: string;
  name: string;
  phone: string;
  flatAndStreet: string;
  areaAndLandmark: string;
  city: string;
  pincode: string;
  tag: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface UserDietaryPreferences {
  dietTypes: DietTag[]; // multi-select; empty array = no filter (all diets shown)
  allergies: string[];
  spiceTolerance: SpiceLevel;
  preferredCuisines: CuisineType[];
  // ── Location hierarchy (replaces old single RegionHub) ─────────────────────
  state: string; // e.g. 'Maharashtra'
  city: string; // e.g. 'Pune'
  subRegion: string; // sub-region id, e.g. 'pune-koregaon-park' (empty = all sub-regions)
  // Legacy alias — kept for backwards-compat with Supabase schema & admin RBAC; derived from city
  regionHub: RegionHub;
  /** @deprecated Use city instead */
  currentCity: string;
  isOnboarded: boolean;
}

export interface NotificationSettings {
  orderUpdates: boolean;
  promotionsAndOffers: boolean;
  newKitLaunches: boolean;
  smsAlerts: boolean;
  emailDigest: boolean;
}

export interface OnboardingData {
  cuisines: CuisineType[];
  dietTypes: DietTag[];
  allergies: string[];
  spiceTolerance: SpiceLevel;
  address: Omit<AddressItem, 'id'>;
  paymentMethod: PaymentMethod;
  state: string;
  city: string;
  subRegion?: string;
  /** @deprecated kept for any legacy callers; prefer state/city */
  regionHub?: RegionHub;
  /** @deprecated kept for any legacy callers; prefer city */
  currentCity?: string;
}

export interface PreferencesContextValue {
  preferences: UserDietaryPreferences;
  updatePreferences: (updates: Partial<UserDietaryPreferences>) => Promise<void>;
  addresses: AddressItem[];
  addAddress: (address: Omit<AddressItem, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<AddressItem>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  defaultAddress?: AddressItem;
  preferredPaymentMethod: PaymentMethod;
  setPreferredPaymentMethod: (method: PaymentMethod) => Promise<void>;
  notifications: NotificationSettings;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  isLoadingProfile: boolean;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const DEFAULT_PREFERENCES: UserDietaryPreferences = {
  dietTypes: ['veg'],
  allergies: [],
  spiceTolerance: 'Medium',
  preferredCuisines: ['North Indian', 'South Indian', 'Punjabi'],
  state: 'Karnataka',
  city: 'Bengaluru',
  subRegion: '',
  regionHub: 'South', // derived: legacyHubForCity('Bengaluru')
  currentCity: 'Bengaluru',
  isOnboarded: false,
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  orderUpdates: true,
  promotionsAndOffers: true,
  newKitLaunches: true,
  smsAlerts: true,
  emailDigest: false,
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Gracefully read user from AuthContext (handles test environments where AuthProvider may not exist)
  let authUser: any = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    // AuthContext not mounted
  }

  const [preferences, setPreferences] = useState<UserDietaryPreferences>(DEFAULT_PREFERENCES);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [preferredPaymentMethod, setPreferredPaymentMethodState] = useState<PaymentMethod>('UPI');
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  // Purge legacy mock data once on boot
  useEffect(() => {
    clearAllLegacyUserData();
  }, []);

  // Sync profile from Supabase & storage whenever authUser changes
  useEffect(() => {
    let isMounted = true;

    if (!authUser || !authUser.uid) {
      // Guest user: load preferences and location from local storage
      const loadGuest = async () => {
        setIsLoadingProfile(true);
        try {
          const storedLoc = await getStoredUserLocation();
          const storedGuestRaw = await AsyncStorage.getItem(GUEST_PREFS_KEY);
          let guestPrefs = { ...DEFAULT_PREFERENCES };
          if (storedGuestRaw) {
            try {
              guestPrefs = { ...DEFAULT_PREFERENCES, ...JSON.parse(storedGuestRaw) };
            } catch {}
          }
          if (storedLoc) {
            const canonical = canonicalCityName(storedLoc.city);
            const hub = storedLoc.hub || hubForCity(canonical);
            guestPrefs = {
              ...guestPrefs,
              city: canonical,
              currentCity: canonical,
              regionHub: hub,
              state: storedLoc.state || guestPrefs.state || '',
            };
          }
          if (isMounted) {
            setPreferences(guestPrefs);
            setAddresses([]);
            setPreferredPaymentMethodState('UPI');
          }
        } catch (err) {
          console.warn('[PreferencesContext] Error loading guest preferences:', err);
        } finally {
          if (isMounted) {
            setIsLoadingProfile(false);
          }
        }
      };
      loadGuest();
      return () => {
        isMounted = false;
      };
    }

    const load = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfileFromSupabase(authUser.uid);
        if (isMounted) {
          if (profile && profile.isOnboarded) {
            const raw = profile.preferences || DEFAULT_PREFERENCES;
            // Migrate old profiles that only have regionHub/currentCity
            const city = raw.city || (raw as any).currentCity || '';
            const migratedPrefs: UserDietaryPreferences = {
              ...DEFAULT_PREFERENCES,
              ...raw,
              city,
              currentCity: city,
              state: raw.state || '',
              subRegion: raw.subRegion || '',
              regionHub: raw.regionHub ?? legacyHubForCity(city),
            };
            setPreferences(migratedPrefs);
            setAddresses(profile.addresses || []);
            setPreferredPaymentMethodState(profile.preferredPaymentMethod || 'UPI');
          } else {
            // New user without completed onboarding
            setPreferences({
              ...DEFAULT_PREFERENCES,
              isOnboarded: false,
            });
            setAddresses([]);
          }
        }
      } catch (err) {
        console.warn('[PreferencesContext] Error loading user profile:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [authUser?.uid]);

  // Helper to persist current state to Supabase & local storage
  const persistState = async (
    newPrefs: UserDietaryPreferences,
    newAddrs: AddressItem[],
    newPayment: PaymentMethod,
  ) => {
    if (newPrefs.city) {
      const hub = newPrefs.regionHub || hubForCity(newPrefs.city);
      const canonical = canonicalCityName(newPrefs.city);
      saveStoredUserLocation({
        city: canonical,
        pincode: '',
        hub,
        state: newPrefs.state,
      }).catch(() => {});
    }

    if (!authUser?.uid) {
      AsyncStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(newPrefs)).catch(() => {});
      return;
    }

    const payload: UserProfileData = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      phoneNumber: authUser.phoneNumber,
      preferences: newPrefs,
      addresses: newAddrs,
      preferredPaymentMethod: newPayment,
      isOnboarded: newPrefs.isOnboarded,
      updatedAt: new Date().toISOString(),
    };

    await saveUserProfileToSupabase(payload);
  };

  const updatePreferences = async (updates: Partial<UserDietaryPreferences>) => {
    const merged = { ...preferences, ...updates };
    // Keep legacy aliases in sync whenever city changes
    if (updates.city) {
      merged.currentCity = updates.city;
      merged.regionHub = legacyHubForCity(updates.city);
    }
    setPreferences(merged);
    await persistState(merged, addresses, preferredPaymentMethod);
  };

  const setPreferredPaymentMethod = async (method: PaymentMethod) => {
    setPreferredPaymentMethodState(method);
    await persistState(preferences, addresses, method);
  };

  const addAddress = async (newAddrData: Omit<AddressItem, 'id'>) => {
    const id = 'addr-' + Date.now();
    const newAddr: AddressItem = { ...newAddrData, id };
    let updatedAddrs: AddressItem[];
    if (newAddr.isDefault || addresses.length === 0) {
      updatedAddrs = [
        { ...newAddr, isDefault: true },
        ...addresses.map((a) => ({ ...a, isDefault: false })),
      ];
    } else {
      updatedAddrs = [...addresses, newAddr];
    }
    setAddresses(updatedAddrs);
    await persistState(preferences, updatedAddrs, preferredPaymentMethod);
  };

  const updateAddress = async (id: string, updates: Partial<AddressItem>) => {
    const updatedAddrs = addresses.map((a) => {
      if (a.id === id) {
        return { ...a, ...updates };
      }
      if (updates.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });
    setAddresses(updatedAddrs);
    await persistState(preferences, updatedAddrs, preferredPaymentMethod);
  };

  const deleteAddress = async (id: string) => {
    const updatedAddrs = addresses.filter((a) => a.id !== id);
    if (updatedAddrs.length > 0 && !updatedAddrs.some((a) => a.isDefault) && updatedAddrs[0]) {
      updatedAddrs[0].isDefault = true;
    }
    setAddresses(updatedAddrs);
    await persistState(preferences, updatedAddrs, preferredPaymentMethod);
  };

  const setDefaultAddress = async (id: string) => {
    const updatedAddrs = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(updatedAddrs);
    await persistState(preferences, updatedAddrs, preferredPaymentMethod);
  };

  const completeOnboarding = async (data: OnboardingData) => {
    const newAddress: AddressItem = {
      id: 'addr-' + Date.now(),
      name: data.address.name,
      phone: data.address.phone,
      flatAndStreet: data.address.flatAndStreet,
      areaAndLandmark: data.address.areaAndLandmark,
      city: data.address.city,
      pincode: data.address.pincode,
      tag: data.address.tag,
      isDefault: true,
    };

    const resolvedCity = data.city || data.currentCity || data.address.city || '';
    const resolvedState = data.state || '';
    const resolvedSubRegion = data.subRegion || '';
    const resolvedHub: RegionHub = data.regionHub ?? legacyHubForCity(resolvedCity);

    const newPreferences: UserDietaryPreferences = {
      dietTypes: data.dietTypes,
      allergies: data.allergies,
      spiceTolerance: data.spiceTolerance,
      preferredCuisines: data.cuisines,
      state: resolvedState,
      city: resolvedCity,
      subRegion: resolvedSubRegion,
      regionHub: resolvedHub,
      currentCity: resolvedCity,
      isOnboarded: true,
    };

    const newAddresses = [newAddress];
    const newPayment = data.paymentMethod;

    setPreferences(newPreferences);
    setAddresses(newAddresses);
    setPreferredPaymentMethodState(newPayment);

    await persistState(newPreferences, newAddresses, newPayment);

    // Patch the stored auth session's displayName with the name the user entered during onboarding.
    // Without this the name stays as the email prefix (e.g. "john.doe" from "john.doe@gmail.com").
    const enteredName = data.address.name?.trim();
    if (enteredName) {
      try {
        const { getStoredUser, saveStoredUser } = await import('../firebase/authService');
        const stored = await getStoredUser();
        if (stored && (!stored.displayName || stored.displayName !== enteredName)) {
          await saveStoredUser({ ...stored, displayName: enteredName });
        }
      } catch {
        // Non-critical — profile name will still show via address
      }
    }
  };

  const reloadProfile = async () => {
    if (!authUser?.uid) return;
    setIsLoadingProfile(true);
    try {
      const profile = await getUserProfileFromSupabase(authUser.uid);
      if (profile) {
        setPreferences(profile.preferences || DEFAULT_PREFERENCES);
        setAddresses(profile.addresses || []);
        setPreferredPaymentMethodState(profile.preferredPaymentMethod || 'UPI');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  const updateNotifications = (updates: Partial<NotificationSettings>) => {
    setNotifications((prev) => ({ ...prev, ...updates }));
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        defaultAddress,
        preferredPaymentMethod,
        setPreferredPaymentMethod,
        notifications,
        updateNotifications,
        isLoadingProfile,
        completeOnboarding,
        reloadProfile,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
