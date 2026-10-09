import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  CITY_HUB_MAP,
  isServiceableCity,
  canonicalCityName,
  hubForCity,
  SERVICEABLE_CITIES,
  ServiceableCityItem,
} from '../../features/admin/cityKitsSeederService';
import { RegionHub } from './mealKitsService';

export const USER_LOCATION_STORAGE_KEY = '@rasoi_user_location_v1';

export interface StoredLocation {
  city: string;
  pincode: string;
  hub: RegionHub;
  state?: string;
  isAutoDetected?: boolean;
}

export type LocationDetectionResult =
  | {
      status: 'granted_serviceable';
      city: string;
      pincode: string;
      hub: RegionHub;
      state?: string;
    }
  | {
      status: 'granted_unserviceable';
      detectedCity: string;
      pincode: string;
      state?: string;
    }
  | {
      status: 'denied';
      reason?: string;
    }
  | {
      status: 'error';
      error: string;
    };

/**
 * Reads the persisted user location from AsyncStorage.
 */
export async function getStoredUserLocation(): Promise<StoredLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.city && isServiceableCity(parsed.city)) {
      return {
        city: canonicalCityName(parsed.city),
        pincode: parsed.pincode || '',
        hub: parsed.hub || hubForCity(parsed.city),
        state: parsed.state || '',
        isAutoDetected: Boolean(parsed.isAutoDetected),
      };
    }
    return null;
  } catch (err) {
    console.warn('[LocationService] Failed to load stored location:', err);
    return null;
  }
}

/**
 * Persists chosen location to AsyncStorage.
 */
export async function saveStoredUserLocation(loc: StoredLocation): Promise<void> {
  try {
    const hub = loc.hub || hubForCity(loc.city);
    const canonical = canonicalCityName(loc.city);
    const payload: StoredLocation = {
      city: canonical,
      pincode: loc.pincode || '',
      hub,
      state: loc.state || '',
      isAutoDetected: loc.isAutoDetected ?? false,
    };
    await AsyncStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[LocationService] Failed to save location:', err);
  }
}

/**
 * Requests foreground permission, obtains coordinates, and reverse-geocodes.
 */
export async function detectCurrentLocation(): Promise<LocationDetectionResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return { status: 'denied', reason: 'Foreground location permission not granted' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = position?.coords;
    if (!coords) {
      return { status: 'error', error: 'Could not retrieve coordinates from device' };
    }

    const addresses = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    const best = addresses && addresses.length > 0 ? addresses[0] : null;
    if (!best) {
      return { status: 'error', error: 'Geocoding returned no address for coordinates' };
    }

    const detectedCity = (best.city || best.subregion || best.district || best.region || '').trim();

    const postalCode = (best.postalCode || '').trim();
    const state = (best.region || '').trim();

    if (!detectedCity) {
      return { status: 'error', error: 'Could not determine city from geocoded address' };
    }

    if (!isServiceableCity(detectedCity)) {
      return {
        status: 'granted_unserviceable',
        detectedCity,
        pincode: postalCode,
        state,
      };
    }

    const canonical = canonicalCityName(detectedCity);
    const hub = hubForCity(detectedCity);

    return {
      status: 'granted_serviceable',
      city: canonical,
      pincode: postalCode,
      hub,
      state,
    };
  } catch (err: any) {
    console.warn('[LocationService] Location detection exception:', err);
    return {
      status: 'error',
      error: err?.message || 'Unexpected error detecting location',
    };
  }
}

/**
 * Searches serviceable cities by city name or 6-digit pincode prefix.
 */
export function searchServiceableCities(query: string): ServiceableCityItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return SERVICEABLE_CITIES;

  const isNumeric = /^\d+$/.test(clean);

  return SERVICEABLE_CITIES.filter((city) => {
    if (isNumeric) {
      if (city.defaultPincode.startsWith(clean)) return true;
      return city.pincodePrefixes.some((pref) => pref.startsWith(clean) || clean.startsWith(pref));
    }

    if (city.name.toLowerCase().includes(clean)) return true;
    if (city.hub.toLowerCase().includes(clean)) return true;
    if (city.state.toLowerCase().includes(clean)) return true;
    if (city.aliases.some((a) => a.includes(clean))) return true;

    return false;
  });
}
