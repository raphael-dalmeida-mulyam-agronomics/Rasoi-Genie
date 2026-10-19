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

const CITY_COORDINATES: Record<
  string,
  { lat: number; lng: number; name: string; state: string; pincode: string }
> = {
  bengaluru: {
    lat: 12.9716,
    lng: 77.5946,
    name: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
  mumbai: { lat: 19.076, lng: 72.8777, name: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  delhi: { lat: 28.6139, lng: 77.209, name: 'Delhi', state: 'Delhi', pincode: '110001' },
  pune: { lat: 18.5204, lng: 73.8567, name: 'Pune', state: 'Maharashtra', pincode: '411001' },
  hyderabad: {
    lat: 17.385,
    lng: 78.4867,
    name: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
  },
  chennai: { lat: 13.0827, lng: 80.2707, name: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  kolkata: { lat: 22.5726, lng: 88.3639, name: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  jaipur: { lat: 26.9124, lng: 75.7873, name: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  lucknow: {
    lat: 26.8467,
    lng: 80.9462,
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226001',
  },
  chandigarh: {
    lat: 30.7333,
    lng: 76.7794,
    name: 'Chandigarh',
    state: 'Punjab',
    pincode: '160017',
  },
  kochi: { lat: 9.9312, lng: 76.2673, name: 'Kochi', state: 'Kerala', pincode: '682001' },
  surat: { lat: 21.1702, lng: 72.8311, name: 'Surat', state: 'Gujarat', pincode: '395001' },
  nagpur: { lat: 21.1458, lng: 79.0882, name: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
  nashik: { lat: 19.9975, lng: 73.7898, name: 'Nashik', state: 'Maharashtra', pincode: '422001' },
  coimbatore: {
    lat: 11.0168,
    lng: 76.9558,
    name: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
  },
  mysuru: { lat: 12.2958, lng: 76.6394, name: 'Mysuru', state: 'Karnataka', pincode: '570001' },
  thiruvananthapuram: {
    lat: 8.5241,
    lng: 76.9366,
    name: 'Thiruvananthapuram',
    state: 'Kerala',
    pincode: '695001',
  },
  visakhapatnam: {
    lat: 17.6868,
    lng: 83.2185,
    name: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530001',
  },
  bhubaneswar: {
    lat: 20.2961,
    lng: 85.8245,
    name: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751001',
  },
  patna: { lat: 25.5941, lng: 85.1376, name: 'Patna', state: 'Bihar', pincode: '800001' },
  ranchi: { lat: 23.3441, lng: 85.3096, name: 'Ranchi', state: 'Jharkhand', pincode: '834001' },
  guwahati: { lat: 26.1445, lng: 91.7362, name: 'Guwahati', state: 'Assam', pincode: '781001' },
  noida: { lat: 28.5355, lng: 77.391, name: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  gurugram: { lat: 28.4595, lng: 77.0266, name: 'Gurugram', state: 'Haryana', pincode: '122001' },
  agra: { lat: 27.1767, lng: 78.0081, name: 'Agra', state: 'Uttar Pradesh', pincode: '282001' },
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

    let detectedCity = '';
    let postalCode = '';
    let state = '';

    // 1. Try native reverse geocoding
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const best = addresses && addresses.length > 0 ? addresses[0] : null;
      if (best) {
        detectedCity = (best.city || best.subregion || best.district || best.region || '').trim();
        postalCode = (best.postalCode || '').trim();
        state = (best.region || '').trim();
      }
    } catch {
      // reverseGeocodeAsync may fail on web
    }

    // 2. If reverse geocoding gave no city, match by distance to known serviceable hubs
    if (!detectedCity) {
      let minDistance = Infinity;
      let closest: { name: string; state: string; pincode: string } | null = null;

      for (const key of Object.keys(CITY_COORDINATES)) {
        const item = CITY_COORDINATES[key];
        if (item) {
          const dist = getDistanceKm(coords.latitude, coords.longitude, item.lat, item.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = item;
          }
        }
      }

      if (closest && minDistance <= 80) {
        detectedCity = closest.name;
        postalCode = closest.pincode;
        state = closest.state;
      } else {
        return {
          status: 'granted_unserviceable',
          detectedCity: 'Your location',
          pincode: '',
          state: '',
        };
      }
    }

    if (!detectedCity) {
      return { status: 'error', error: 'Could not determine city from coordinates' };
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
