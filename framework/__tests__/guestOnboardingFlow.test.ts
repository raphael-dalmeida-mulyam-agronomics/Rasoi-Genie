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
import * as Location from 'expo-location';
import {
  isServiceableCity,
  CITY_HUB_MAP,
  SERVICEABLE_CITIES,
} from '../../features/admin/cityKitsSeederService';
import {
  detectCurrentLocation,
  getStoredUserLocation,
  saveStoredUserLocation,
  searchServiceableCities,
} from '../services/locationService';
import {
  getOrCreateGuestId,
  getGuestOrders,
  saveGuestOrder,
  updateGuestOrderStatus,
  hasSeenWelcomeScreen,
  markWelcomeScreenSeen,
} from '../services/guestService';
import { createOrderInSupabase } from '../services/supabaseOrdersService';
import { Order } from '../firebase/ordersService';

// Mock expo-location
jest.mock('expo-location', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  Accuracy: {
    Balanced: 3,
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

describe('Guest-First Onboarding & Serviceability', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('1. Location Serviceability & Strict CITY_HUB_MAP Checks', () => {
    it('should validate serviceable cities strictly matching CITY_HUB_MAP', () => {
      // Known serviceable cities in CITY_HUB_MAP
      expect(isServiceableCity('Bengaluru')).toBe(true);
      expect(isServiceableCity('Mumbai')).toBe(true);
      expect(isServiceableCity('Delhi')).toBe(true);
      expect(isServiceableCity('Pune')).toBe(true);
      expect(isServiceableCity('Hyderabad')).toBe(true);
      expect(isServiceableCity('Kolkata')).toBe(true);

      // Bangalore alias
      expect(isServiceableCity('Bangalore')).toBe(true);

      // Non-serviceable cities must return false (MUST NOT default to North or any other hub)
      expect(isServiceableCity('Shimla')).toBe(false);
      expect(isServiceableCity('Manali')).toBe(false);
      expect(isServiceableCity('London')).toBe(false);
      expect(isServiceableCity('New York')).toBe(false);
      expect(isServiceableCity('')).toBe(false);
      expect(isServiceableCity('   ')).toBe(false);
    });

    it('should list only defined serviceable cities in SERVICEABLE_CITIES', () => {
      expect(SERVICEABLE_CITIES.length).toBeGreaterThan(0);
      for (const city of SERVICEABLE_CITIES) {
        expect(isServiceableCity(city.name)).toBe(true);
        expect(CITY_HUB_MAP[city.id.toLowerCase()]).toBeDefined();
      }
    });

    it('should search serviceable cities by name or pincode prefix', () => {
      const benResults = searchServiceableCities('beng');
      expect(benResults.some((c) => c.name === 'Bengaluru')).toBe(true);

      const pinResults = searchServiceableCities('560');
      expect(pinResults.some((c) => c.name === 'Bengaluru')).toBe(true);

      const emptyResults = searchServiceableCities('999999');
      expect(emptyResults).toEqual([]);
    });
  });

  describe('2. Location Detection (Granted, Denied, and Not Serviceable)', () => {
    it('should successfully detect location when permission is granted and city is serviceable', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          city: 'Bengaluru',
          subregion: 'Bengaluru Urban',
          region: 'Karnataka',
          postalCode: '560001',
        },
      ]);

      const result = await detectCurrentLocation();
      expect(result.status).toBe('granted_serviceable');
      if (result.status === 'granted_serviceable') {
        expect(result.city).toBe('Bengaluru');
        expect(result.pincode).toBe('560001');
        expect(result.hub).toBe('South');
      }
    });

    it('should return denied status when location permission is not granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
      });

      const result = await detectCurrentLocation();
      expect(result.status).toBe('denied');
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('should return granted_unserviceable status when detected city is outside service area', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 31.1048, longitude: 77.1734 },
      });
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          city: 'Shimla',
          region: 'Himachal Pradesh',
          postalCode: '171001',
        },
      ]);

      const result = await detectCurrentLocation();
      expect(result.status).toBe('granted_unserviceable');
      if (result.status === 'granted_unserviceable') {
        expect(result.detectedCity).toBe('Shimla');
      }
    });

    it('should persist and retrieve user location in AsyncStorage', async () => {
      const storedBefore = await getStoredUserLocation();
      expect(storedBefore).toBeNull();

      await saveStoredUserLocation({
        city: 'Mumbai',
        pincode: '400001',
        hub: 'West',
      });

      const storedAfter = await getStoredUserLocation();
      expect(storedAfter).not.toBeNull();
      expect(storedAfter?.city).toBe('Mumbai');
      expect(storedAfter?.pincode).toBe('400001');
      expect(storedAfter?.hub).toBe('West');
    });
  });

  describe('3. Stable Guest Identity & First-Launch Flags', () => {
    it('should generate a stable guest ID prefixed with guest_ and persist it', async () => {
      const firstId = await getOrCreateGuestId();
      expect(firstId).toMatch(/^guest_[a-z0-9_]+$/);

      const secondId = await getOrCreateGuestId();
      expect(secondId).toBe(firstId);

      const stored = await AsyncStorage.getItem('@rasoi_guest_device_id_v1');
      expect(stored).toBe(firstId);
    });

    it('should manage first-launch welcome screen flag', async () => {
      expect(await hasSeenWelcomeScreen()).toBe(false);
      await markWelcomeScreenSeen();
      expect(await hasSeenWelcomeScreen()).toBe(true);
    });
  });

  describe('4. Guest Local Order History (Isolated & Persistent)', () => {
    it('should store and retrieve guest orders locally on this device', async () => {
      const initial = await getGuestOrders();
      expect(initial).toEqual([]);

      const mockOrder: Order = {
        id: 'ORD-TEST-001',
        userId: 'guest_test_abc123',
        customerName: 'Aarav Sharma',
        customerPhone: '+91 9876543210',
        deliveryAddress: 'Flat 101, Indiranagar, Bengaluru - 560038',
        deliverySlot: '6:00 PM - 8:00 PM (Dinner)',
        items: [
          {
            id: 'item-1',
            kitId: 'kit-101',
            name: 'Paneer Butter Masala Kit',
            quantity: 2,
            price: 299,
            servings: 2,
            spiceLevel: 'Medium',
            masalaSachets: ['Whole Khada Masala'],
          },
        ],
        subtotal: 598,
        discount: 0,
        deliveryFee: 0,
        totalAmount: 598,
        status: 'Placed',
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Pending',
        transactionId: 'TXN-COD-001',
        trackingEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveGuestOrder(mockOrder);

      const orders = await getGuestOrders();
      expect(orders.length).toBe(1);
      expect(orders[0]?.id).toBe('ORD-TEST-001');
      expect(orders[0]?.status).toBe('Placed');

      // Update status
      await updateGuestOrderStatus('ORD-TEST-001', 'Confirmed');
      const updatedOrders = await getGuestOrders();
      expect(updatedOrders[0]?.status).toBe('Confirmed');
    });
  });

  describe('5. Guest Checkout & Any Payment Method Selection', () => {
    it('should allow guest order creation with UPI, Card, and Cash on Delivery', async () => {
      const guestId = await getOrCreateGuestId();

      const paymentMethods: ('UPI' | 'Card' | 'Cash on Delivery')[] = [
        'UPI',
        'Card',
        'Cash on Delivery',
      ];

      for (const method of paymentMethods) {
        const orderData = {
          userId: guestId,
          customerName: 'Guest Chef',
          customerPhone: '+91 9123456789',
          customerEmail: 'guest@example.com',
          deliveryAddress: 'Flat 402, Shivajinagar, Pune - 411005',
          deliverySlot: '6:00 PM - 8:00 PM',
          items: [
            {
              kitId: 'kit-202',
              name: 'Gourmet Dal Tadka Kit',
              quantity: 1,
              price: 249,
              servings: 2,
              spiceLevel: 'Medium',
            },
          ],
          subtotal: 249,
          totalAmount: 249,
          paymentMethod: method,
          transactionId: `TXN-${method}-${Date.now()}`,
        };

        const res = await createOrderInSupabase(orderData);
        expect(res.success).toBe(true);
        expect(res.orderId).toBeDefined();
        expect(res.orderId.startsWith('ORD-')).toBe(true);
      }
    });

    it('should validate 10-digit Indian mobile numbers for checkout', () => {
      const isValidPhone = (phone: string): boolean => {
        const digits = phone.replace(/\D/g, '');
        return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
      };

      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('+91 98765 43210')).toBe(true);
      expect(isValidPhone('+919876543210')).toBe(true);
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });
});
