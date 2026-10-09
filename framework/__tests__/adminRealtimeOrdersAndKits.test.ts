import {
  subscribeToOrders,
  recordInitialOrderIds,
  _resetSessionChimedOrderIds,
  filterOrdersByAdminRegions,
} from '../services/supabaseOrdersService';
import {
  subscribeToMealKits,
  filterMealKitsByAdminRegions,
} from '../services/supabaseMealKitsService';
import {
  getMealKits,
  addMealKit,
  getMealKitById,
  deleteMealKit,
} from '../services/mealKitsService';
import * as realtimeModule from '../services/realtimeService';
import * as notificationModule from '../services/notificationService';
import { Order } from '../firebase/ordersService';

jest.mock('../supabase/client', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  }));
  return {
    supabase: { from: mockFrom },
    getSupabaseClient: jest.fn(() => ({
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      })),
      removeChannel: jest.fn(),
    })),
  };
});

describe('Admin Realtime: Orders & Meal Kits Subscriptions', () => {
  let playAlertSpy: jest.SpyInstance;
  let subscribeToTableSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetSessionChimedOrderIds();
    playAlertSpy = jest
      .spyOn(notificationModule, 'playOrderAlertSound')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    playAlertSpy.mockRestore();
    if (subscribeToTableSpy) {
      subscribeToTableSpy.mockRestore();
    }
  });

  describe('Orders Realtime & Chime deduplication', () => {
    it('subscribes to orders table and handles INSERT, UPDATE, DELETE with chime firing once', () => {
      let registeredOptions: any = null;
      subscribeToTableSpy = jest
        .spyOn(realtimeModule, 'subscribeToTable')
        .mockImplementation((opts: any) => {
          registeredOptions = opts;
          return jest.fn();
        });

      const onInsert = jest.fn();
      const onUpdate = jest.fn();
      const onDelete = jest.fn();

      const unsubscribe = subscribeToOrders({
        onInsert,
        onUpdate,
        onDelete,
      });

      expect(subscribeToTableSpy).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'orders' }),
      );

      // Simulate INSERT of placed order
      const rawRow = {
        id: 'ORD-TEST-101',
        user_id: 'user_123',
        customer_name: 'Aditi Sharma',
        customer_phone: '9876543210',
        delivery_address: 'FC Road, Shivajinagar, Pune',
        total_amount: 540,
        status: 'Placed',
        created_at: new Date().toISOString(),
      };

      registeredOptions.onInsert(rawRow);

      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ORD-TEST-101',
          customerName: 'Aditi Sharma',
          status: 'Placed',
        }),
      );
      // Chime should play once
      expect(playAlertSpy).toHaveBeenCalledTimes(1);

      // Simulate duplicate INSERT event for same order ID (e.g. echo or reconnect)
      registeredOptions.onInsert(rawRow);
      expect(onInsert).toHaveBeenCalledTimes(2);
      // Chime should NOT fire a second time for the same order ID
      expect(playAlertSpy).toHaveBeenCalledTimes(1);

      // Simulate UPDATE event
      registeredOptions.onUpdate({ ...rawRow, status: 'Preparing' }, rawRow);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ORD-TEST-101', status: 'Preparing' }),
        rawRow,
      );

      // Simulate DELETE event
      registeredOptions.onDelete({ id: 'ORD-TEST-101' });
      expect(onDelete).toHaveBeenCalledWith('ORD-TEST-101', { id: 'ORD-TEST-101' });

      unsubscribe();
    });

    it('suppresses chime for orders recorded during initial load', () => {
      let registeredOptions: any = null;
      subscribeToTableSpy = jest
        .spyOn(realtimeModule, 'subscribeToTable')
        .mockImplementation((opts: any) => {
          registeredOptions = opts;
          return jest.fn();
        });

      // Record initial load order IDs
      recordInitialOrderIds(['ORD-EXISTING-1', 'ORD-EXISTING-2']);

      const onInsert = jest.fn();
      subscribeToOrders({ onInsert });

      // An INSERT event arriving for an order already present on initial load should not chime
      registeredOptions.onInsert({
        id: 'ORD-EXISTING-1',
        customer_name: 'Existing Customer',
        status: 'Placed',
      });

      expect(onInsert).toHaveBeenCalledTimes(1);
      expect(playAlertSpy).not.toHaveBeenCalled();
    });

    it('correctly filters orders for regional admins vs super admin', () => {
      const sampleOrders: any[] = [
        {
          id: 'ORD-PUNE-1',
          userId: 'u1',
          customerName: 'Rahul',
          customerPhone: '9999999991',
          deliveryAddress: 'Flat 401, FC Road, Shivajinagar, Pune, Maharashtra 411005',
          fulfillmentRegion: 'pune-city',
          items: [],
          totalAmount: 399,
          status: 'Placed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ORD-MUMBAI-1',
          userId: 'u2',
          customerName: 'Priya',
          customerPhone: '9999999992',
          deliveryAddress: 'Bandra West, Mumbai, Maharashtra 400050',
          fulfillmentRegion: 'mumbai-city',
          items: [],
          totalAmount: 499,
          status: 'Placed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ORD-DELHI-1',
          userId: 'u3',
          customerName: 'Karan',
          customerPhone: '9999999993',
          deliveryAddress: 'Connaught Place, Central Delhi, 110001',
          fulfillmentRegion: 'North',
          items: [],
          totalAmount: 699,
          status: 'Placed',
          createdAt: new Date().toISOString(),
        },
      ];

      // Super admin sees all orders
      const superAdminView = filterOrdersByAdminRegions(sampleOrders, ['pune-city'], true);
      expect(superAdminView).toHaveLength(3);

      // Regional admin assigned only to 'pune-city' only sees Pune order
      const puneAdminView = filterOrdersByAdminRegions(sampleOrders, ['pune-city'], false);
      expect(puneAdminView).toHaveLength(1);
      expect(puneAdminView[0]?.id).toBe('ORD-PUNE-1');

      // Admin with no assigned regions sees nothing
      const unassignedView = filterOrdersByAdminRegions(sampleOrders, [], false);
      expect(unassignedView).toHaveLength(0);
    });
  });

  describe('Meal Kits Realtime & In-Memory Store Updates', () => {
    it('subscribes to meal_kits and updates in-memory store without write-back loop', () => {
      let registeredOptions: any = null;
      subscribeToTableSpy = jest
        .spyOn(realtimeModule, 'subscribeToTable')
        .mockImplementation((opts: any) => {
          registeredOptions = opts;
          return jest.fn();
        });

      const onInsert = jest.fn();
      const onUpdate = jest.fn();
      const onDelete = jest.fn();

      const unsubscribe = subscribeToMealKits({
        onInsert,
        onUpdate,
        onDelete,
      });

      expect(subscribeToTableSpy).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'meal_kits' }),
      );

      const testKitRow = {
        id: 'kit-rt-paneer-tikka',
        name: 'Realtime Paneer Tikka Masala',
        hindi_name: 'पनीर टिक्का मसाला',
        price: 299,
        diet: 'veg',
        cuisine: 'North Indian',
        servings: 2,
        spice_level: 'Medium',
        available_regions: ['West'],
        cities: ['Pune'],
        is_published: true,
      };

      // 1. Simulate INSERT
      registeredOptions.onInsert(testKitRow);

      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'kit-rt-paneer-tikka',
          name: 'Realtime Paneer Tikka Masala',
        }),
      );

      // Verify in-memory store was updated
      const foundInStore = getMealKitById('kit-rt-paneer-tikka');
      expect(foundInStore).toBeDefined();
      expect(foundInStore?.name).toBe('Realtime Paneer Tikka Masala');

      // 2. Simulate UPDATE
      const updatedKitRow = {
        ...testKitRow,
        name: 'Realtime Paneer Tikka Masala (Chef Special)',
        price: 349,
      };
      registeredOptions.onUpdate(updatedKitRow, testKitRow);

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'kit-rt-paneer-tikka',
          name: 'Realtime Paneer Tikka Masala (Chef Special)',
        }),
        testKitRow,
      );

      const updatedInStore = getMealKitById('kit-rt-paneer-tikka');
      expect(updatedInStore?.name).toBe('Realtime Paneer Tikka Masala (Chef Special)');
      expect(updatedInStore?.price).toBe(349);

      // 3. Simulate DELETE
      registeredOptions.onDelete({ id: 'kit-rt-paneer-tikka' });
      expect(onDelete).toHaveBeenCalledWith('kit-rt-paneer-tikka', { id: 'kit-rt-paneer-tikka' });

      const deletedFromStore = getMealKitById('kit-rt-paneer-tikka');
      expect(deletedFromStore).toBeUndefined();

      unsubscribe();
    });

    it('correctly scopes meal kits for regional admin vs super admin', () => {
      const sampleKits = [
        {
          id: 'kit-pune-misal',
          name: 'Kolhapuri Misal Pav',
          price: 180,
          diet: 'veg' as const,
          cuisine: 'Maharashtrian' as const,
          availableRegions: ['West' as const],
          cities: ['Pune', 'Kolhapur'],
          isPublished: true,
          stockByRegion: { West: 15 },
        },
        {
          id: 'kit-south-dosa',
          name: 'Mysore Masala Dosa',
          price: 160,
          diet: 'veg' as const,
          cuisine: 'South Indian' as const,
          availableRegions: ['South' as const],
          cities: ['Bengaluru', 'Mysuru'],
          isPublished: true,
          stockByRegion: { South: 20 },
        },
      ];

      // Super admin sees all kits
      const superAdminKits = filterMealKitsByAdminRegions(sampleKits as any, ['pune-city'], true);
      expect(superAdminKits).toHaveLength(2);

      // Regional admin with 'pune-city' sees Maharashtra / Pune kit
      const puneAdminKits = filterMealKitsByAdminRegions(sampleKits as any, ['pune-city'], false);
      expect(puneAdminKits).toHaveLength(1);
      expect(puneAdminKits[0]?.id).toBe('kit-pune-misal');
    });
  });
});
