import React, { createContext, useContext, useState, useEffect } from 'react';
import { CuisineType, DietTag, RegionHub, SpiceLevel } from '../services/mealKitsService';

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

export interface PreferencesContextValue {
  preferences: UserDietaryPreferences;
  updatePreferences: (updates: Partial<UserDietaryPreferences>) => void;
  addresses: AddressItem[];
  addAddress: (address: Omit<AddressItem, 'id'>) => void;
  updateAddress: (id: string, address: Partial<AddressItem>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  defaultAddress?: AddressItem;
  notifications: NotificationSettings;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
}

const DEFAULT_PREFERENCES: UserDietaryPreferences = {
  dietType: 'veg',
  allergies: [],
  spiceTolerance: 'Medium',
  preferredCuisines: ['North Indian', 'Punjabi', 'Hyderabadi'],
  regionHub: 'South',
  currentCity: 'Bengaluru',
  isOnboarded: true,
};

const DEFAULT_ADDRESSES: AddressItem[] = [
  {
    id: 'addr-1',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    flatAndStreet: 'Flat 402, Green Glen Layout',
    areaAndLandmark: 'Near Outer Ring Road, Bellandur',
    city: 'Bengaluru',
    pincode: '560103',
    tag: 'Home',
    isDefault: true,
  },
  {
    id: 'addr-2',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    flatAndStreet: 'WeWork Galaxy, 43 Residency Rd',
    areaAndLandmark: 'Shanthala Nagar, Ashok Nagar',
    city: 'Bengaluru',
    pincode: '560025',
    tag: 'Work',
    isDefault: false,
  },
];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  orderUpdates: true,
  promotionsAndOffers: true,
  newKitLaunches: true,
  smsAlerts: true,
  emailDigest: false,
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserDietaryPreferences>(DEFAULT_PREFERENCES);
  const [addresses, setAddresses] = useState<AddressItem[]>(DEFAULT_ADDRESSES);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);

  const updatePreferences = (updates: Partial<UserDietaryPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates, isOnboarded: true }));
  };

  const addAddress = (newAddrData: Omit<AddressItem, 'id'>) => {
    const id = 'addr-' + Date.now();
    const newAddr: AddressItem = { ...newAddrData, id };
    if (newAddr.isDefault || addresses.length === 0) {
      setAddresses((prev) => [newAddr, ...prev.map((a) => ({ ...a, isDefault: false }))]);
    } else {
      setAddresses((prev) => [newAddr, ...prev]);
    }
  };

  const updateAddress = (id: string, updates: Partial<AddressItem>) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, ...updates };
        }
        if (updates.isDefault) {
          return { ...a, isDefault: false };
        }
        return a;
      }),
    );
  };

  const deleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
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
        notifications,
        updateNotifications,
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
