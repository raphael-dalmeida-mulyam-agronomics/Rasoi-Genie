import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredUser, saveStoredUser } from '../firebase/authService';
import {
  getUserProfileFromSupabase,
  saveUserProfileToSupabase,
  emitUserProfileUpdated,
  UserProfileData,
} from './supabaseUserService';
import { getOrCreateGuestId } from './guestService';
import { AddressItem } from '../context/PreferencesContext';

export interface SavedDeliveryAddress {
  flatAndStreet: string;
  areaAndLandmark: string;
  city: string;
  pincode: string;
  deliveryInstructions?: string;
  tag?: 'Home' | 'Work' | 'Other';
}

export interface VerifiedContactInfo {
  name: string;
  phone: string; // 10-digit mobile number
  email?: string;
  isVerified: boolean;
  verifiedAt: string;
  address?: SavedDeliveryAddress;
}

export const VERIFIED_GUEST_CONTACT_STORAGE_KEY = '@rasoi_verified_guest_contact_v1';
export const SAVED_DELIVERY_ADDRESS_STORAGE_KEY = '@rasoi_saved_delivery_address_v1';

/**
 * Persists verified customer contact information (name, 10-digit phone number, email)
 * and delivery address across the database (Supabase `user_profiles`, Firestore `customers`,
 * and persistent local storage).
 * Ensures users are not prompted or asked to re-enter details for every order they place.
 */
export async function saveVerifiedContactInfo(params: {
  userId?: string | null;
  name: string;
  phone: string;
  email?: string;
  isGuest?: boolean;
  address?: SavedDeliveryAddress;
}): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = params.phone.replace(/\D/g, '').slice(-10);
  const cleanName = params.name.trim();
  const cleanEmail = params.email?.trim() || undefined;

  if (!cleanName || cleanPhone.length !== 10) {
    return { success: false, error: 'Valid name and 10-digit phone number are required.' };
  }

  let cleanAddress: SavedDeliveryAddress | undefined = undefined;
  if (params.address?.flatAndStreet?.trim() && params.address?.areaAndLandmark?.trim()) {
    cleanAddress = {
      flatAndStreet: params.address.flatAndStreet.trim(),
      areaAndLandmark: params.address.areaAndLandmark.trim(),
      city: params.address.city?.trim() || 'Bengaluru',
      pincode: params.address.pincode?.trim() || '560001',
      deliveryInstructions: params.address.deliveryInstructions?.trim() || undefined,
      tag: params.address.tag || 'Home',
    };
  }

  const verifiedRecord: VerifiedContactInfo = {
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    isVerified: true,
    verifiedAt: new Date().toISOString(),
    address: cleanAddress,
  };

  // 1. Always persist to local device storage (offline-first & guest redundancy)
  try {
    const serialized = JSON.stringify(verifiedRecord);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY, serialized);
    }
    await AsyncStorage.setItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY, serialized);

    if (cleanAddress) {
      const addrSerialized = JSON.stringify(cleanAddress);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY, addrSerialized);
      }
      await AsyncStorage.setItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY, addrSerialized);
    }
  } catch (err) {
    console.warn('[VerifiedContactService] Error saving local contact:', err);
  }

  // 2. Resolve database UID (signed-in user UID or persistent stable guest ID)
  let targetUid = params.userId?.trim();
  if (!targetUid) {
    try {
      targetUid = await getOrCreateGuestId();
    } catch {
      targetUid = `guest_fallback_${Date.now()}`;
    }
  }

  // 3. Prepare addresses array for database persistence
  const existing = await getUserProfileFromSupabase(targetUid);
  let updatedAddresses: AddressItem[] = existing?.addresses ? [...existing.addresses] : [];
  if (cleanAddress) {
    const newAddressItem: AddressItem = {
      id: `addr_${targetUid}_${Date.now()}`,
      name: cleanName,
      phone: `+91${cleanPhone}`,
      flatAndStreet: cleanAddress.flatAndStreet,
      areaAndLandmark: cleanAddress.areaAndLandmark,
      city: cleanAddress.city,
      pincode: cleanAddress.pincode,
      tag: cleanAddress.tag || 'Home',
      isDefault: true,
    };
    const otherAddresses = updatedAddresses
      .filter(
        (a) =>
          a.flatAndStreet !== cleanAddress?.flatAndStreet ||
          a.areaAndLandmark !== cleanAddress?.areaAndLandmark,
      )
      .map((a) => ({ ...a, isDefault: false }));
    updatedAddresses = [newAddressItem, ...otherAddresses];
  }

  // 4. Persist to database (Supabase user_profiles, Firestore customers, and local storage)
  try {
    const profileToSave: UserProfileData = {
      uid: targetUid,
      displayName: cleanName,
      phoneNumber: `+91${cleanPhone}`,
      email: cleanEmail || existing?.email || undefined,
      preferences: existing?.preferences || ({} as any),
      addresses: updatedAddresses,
      preferredPaymentMethod: existing?.preferredPaymentMethod || 'UPI',
      isOnboarded: existing?.isOnboarded ?? true,
      updatedAt: new Date().toISOString(),
    };
    await saveUserProfileToSupabase(profileToSave);
  } catch (dbErr) {
    console.warn('[VerifiedContactService] Error saving user profile to database:', dbErr);
  }

  // 5. Update local Auth session storage if the active session matches
  try {
    const authUser = await getStoredUser();
    if (authUser && (!params.userId || authUser.uid === targetUid)) {
      authUser.displayName = cleanName;
      authUser.phoneNumber = `+91${cleanPhone}`;
      if (cleanEmail) authUser.email = cleanEmail;
      await saveStoredUser(authUser);
    }
  } catch (authErr) {
    console.warn('[VerifiedContactService] Error updating auth session storage:', authErr);
  }

  emitUserProfileUpdated();
  return { success: true };
}

/**
 * Helper to extract the primary delivery address from a list of address items.
 */
function extractPrimaryAddress(addresses?: AddressItem[]): SavedDeliveryAddress | undefined {
  if (!addresses || addresses.length === 0) return undefined;
  const def = addresses.find((a) => a.isDefault) || addresses[0];
  if (!def || !def.flatAndStreet || !def.areaAndLandmark) return undefined;
  return {
    flatAndStreet: def.flatAndStreet,
    areaAndLandmark: def.areaAndLandmark,
    city: def.city || 'Bengaluru',
    pincode: def.pincode || '560001',
    tag: def.tag || 'Home',
  };
}

/**
 * Retrieves verified contact details and saved delivery address for a given user or guest device.
 * Checks profile database, auth storage, and local verified contact cache.
 */
export async function getVerifiedContactInfo(
  userId?: string | null,
): Promise<VerifiedContactInfo | null> {
  // 1. If signed-in user provided, check profile database
  if (userId && userId.trim()) {
    try {
      const profile = await getUserProfileFromSupabase(userId.trim());
      if (
        profile &&
        profile.phoneNumber &&
        profile.phoneNumber.replace(/\D/g, '').length >= 10 &&
        profile.displayName?.trim()
      ) {
        return {
          name: profile.displayName.trim(),
          phone: profile.phoneNumber.replace(/\D/g, '').slice(-10),
          email: profile.email?.trim() || undefined,
          isVerified: true,
          verifiedAt: profile.updatedAt || new Date().toISOString(),
          address: extractPrimaryAddress(profile.addresses),
        };
      }
    } catch {}

    // Check active auth user session
    try {
      const authUser = await getStoredUser();
      if (
        authUser &&
        authUser.uid === userId.trim() &&
        authUser.phoneNumber &&
        authUser.phoneNumber.replace(/\D/g, '').length >= 10 &&
        authUser.displayName?.trim()
      ) {
        return {
          name: authUser.displayName.trim(),
          phone: authUser.phoneNumber.replace(/\D/g, '').slice(-10),
          email: authUser.email?.trim() || undefined,
          isVerified: true,
          verifiedAt: authUser.createdAt || new Date().toISOString(),
        };
      }
    } catch {}
  }

  // 2. Check local persistent guest contact storage
  try {
    let rawGuest: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      rawGuest = window.localStorage.getItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY);
    }
    if (!rawGuest) {
      rawGuest = await AsyncStorage.getItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY);
    }
    if (rawGuest) {
      const parsed = JSON.parse(rawGuest) as VerifiedContactInfo;
      if (parsed.name?.trim() && parsed.phone?.replace(/\D/g, '').length === 10) {
        let savedAddr = parsed.address;
        if (!savedAddr) {
          try {
            const rawAddr =
              typeof window !== 'undefined' && window.localStorage
                ? window.localStorage.getItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY)
                : await AsyncStorage.getItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY);
            if (rawAddr) savedAddr = JSON.parse(rawAddr);
          } catch {}
        }

        return {
          name: parsed.name.trim(),
          phone: parsed.phone.replace(/\D/g, '').slice(-10),
          email: parsed.email?.trim() || undefined,
          isVerified: Boolean(parsed.isVerified),
          verifiedAt: parsed.verifiedAt || new Date().toISOString(),
          address: savedAddr,
        };
      }
    }
  } catch (err) {
    console.warn('[VerifiedContactService] Error reading guest contact:', err);
  }

  // 3. Fallback: check device guest profile in Supabase
  try {
    const guestId = await getOrCreateGuestId();
    if (guestId) {
      const guestProfile = await getUserProfileFromSupabase(guestId);
      if (
        guestProfile &&
        guestProfile.phoneNumber &&
        guestProfile.phoneNumber.replace(/\D/g, '').length >= 10 &&
        guestProfile.displayName?.trim()
      ) {
        return {
          name: guestProfile.displayName.trim(),
          phone: guestProfile.phoneNumber.replace(/\D/g, '').slice(-10),
          email: guestProfile.email?.trim() || undefined,
          isVerified: true,
          verifiedAt: guestProfile.updatedAt || new Date().toISOString(),
          address: extractPrimaryAddress(guestProfile.addresses),
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Clears verified guest contact details and saved addresses.
 */
export async function clearVerifiedContactInfo(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY);
      window.localStorage.removeItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY);
    }
    await AsyncStorage.removeItem(VERIFIED_GUEST_CONTACT_STORAGE_KEY);
    await AsyncStorage.removeItem(SAVED_DELIVERY_ADDRESS_STORAGE_KEY);
  } catch {}

  try {
    const guestId = await getOrCreateGuestId();
    if (guestId) {
      const storageKey = `@rasoi_user_profile_${guestId}`;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(storageKey);
      }
      await AsyncStorage.removeItem(storageKey);
    }
  } catch {}
}
