import React, { createContext, useContext, useState, useEffect } from 'react';
import { CuisineType, DietTag, RegionHub, SpiceLevel } from '../services/mealKitsService';
import { useAuth } from './AuthContext';
import { PaymentMethod } from './CartContext';
import {
  saveUserProfileToSupabase,
  getUserProfileFromSupabase,
  clearAllLegacyUserData,
  UserProfileData,
} from '../services/supabaseUserService';

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
  dietType: DietTag | 'all';
  allergies: string[];
  spiceTolerance: SpiceLevel;
  preferredCuisines: CuisineType[];
  regionHub: RegionHub;
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
  dietType: DietTag | 'all';
  allergies: string[];
  spiceTolerance: SpiceLevel;
  address: Omit<AddressItem, 'id'>;
  paymentMethod: PaymentMethod;
  regionHub: RegionHub;
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
  dietType: 'veg',
  allergies: [],
  spiceTolerance: 'Medium',
  preferredCuisines: ['North Indian', 'South Indian', 'Punjabi'],
  regionHub: 'South',
  currentCity: 'Bengaluru',
  isOnboarded: false, // Default false until first-time onboarding is completed
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
      // User logged out: clear active state from memory so no previous data leaks
      setPreferences(DEFAULT_PREFERENCES);
      setAddresses([]);
      setPreferredPaymentMethodState('UPI');
      return;
    }

    const load = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfileFromSupabase(authUser.uid);
        if (isMounted) {
          if (profile && profile.isOnboarded) {
            setPreferences(profile.preferences || DEFAULT_PREFERENCES);
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
    if (!authUser?.uid) return;

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
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    await persistState(updated, addresses, preferredPaymentMethod);
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

    const newPreferences: UserDietaryPreferences = {
      dietType: data.dietType,
      allergies: data.allergies,
      spiceTolerance: data.spiceTolerance,
      preferredCuisines: data.cuisines,
      regionHub: data.regionHub,
      currentCity: data.currentCity || data.address.city || 'Bengaluru',
      isOnboarded: true,
    };

    const newAddresses = [newAddress];
    const newPayment = data.paymentMethod;

    setPreferences(newPreferences);
    setAddresses(newAddresses);
    setPreferredPaymentMethodState(newPayment);

    await persistState(newPreferences, newAddresses, newPayment);
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
