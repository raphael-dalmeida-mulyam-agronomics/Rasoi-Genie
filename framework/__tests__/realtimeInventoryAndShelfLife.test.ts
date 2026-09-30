import {
  getMealKits,
  getMealKitById,
  updateMealKit,
  updateMealKitStock,
  deductMealKitStock,
  restoreMealKitStock,
  calculateMealKitFreshness,
  updateMealKitShelfLife,
  getMealKitDefaultShelfLife,
  MealKit,
} from '../services/mealKitsService';
import {
  createOrderInSupabase,
  updateOrderStatusInSupabase,
  fetchAllOrdersFromSupabase,
} from '../services/supabaseOrdersService';
import {
  subscribeToOutOfStockAlerts,
  getActiveOutOfStockAlerts,
  notifyRegionalAdminsOutOfStock,
  dismissOutOfStockAlert,
  OutOfStockAlertPayload,
} from '../services/notificationService';

describe('Real-Time Inventory Updates, Admin Order Cancellation Reversion & Shelf Life', () => {
  const TEST_KIT_ID = 'kit-test-inv-101';

  beforeEach(() => {
    // Reset test kit in memory
    const existing = getMealKitById(TEST_KIT_ID);
    if (!existing) {
      const { addMealKit } = require('../services/mealKitsService');
      addMealKit({
        id: TEST_KIT_ID,
        name: 'Gourmet Test Dal Makhani',
        slug: 'gourmet-test-dal-makhani',
        tagline: 'Slow-cooked black lentils simmered overnight',
        description: 'Test kit for inventory and shelf life verification',
        heroImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
        galleryImages: [],
        price: 320,
        servings: 2,
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        diet: 'veg',
        cuisine: 'North Indian',
        spiceLevel: 'Medium',
        difficulty: 'Easy',
        dietaryTags: ['veg'],
        availableRegions: ['North', 'West', 'South', 'East'],
        cities: [],
        stockByRegion: { North: 15, West: 10, South: 25, East: 20 },
        isOutOfStock: false,
        shelfLifeDays: 4,
        shelfLife: '4 days (Keep refrigerated at 2°C - 5°C)',
        storageCondition: 'Refrigerated at 2°C - 5°C',
        rating: 5,
        reviewCount: 1,
        nutrition: { calories: 380, protein: 14, carbs: 45, fat: 12, fiber: 8 },
        allergens: ['Dairy (Butter & Cream)'],
        ingredients: [{ name: 'Black Urad Dal', quantity: '200g' }],
        masalaSachets: ['Dal Makhani Masala'],
        recipeSteps: [],
        reviews: [],
        salesByRegion: {},
      });
    } else {
      updateMealKitStock(TEST_KIT_ID, 'West', 10);
      updateMealKitStock(TEST_KIT_ID, 'North', 15);
      updateMealKit(TEST_KIT_ID, {
        isOutOfStock: false,
        shelfLifeDays: 4,
        shelfLife: '4 days (Keep refrigerated at 2°C - 5°C)',
        storageCondition: 'Refrigerated at 2°C - 5°C',
      });
    }
    dismissOutOfStockAlert(TEST_KIT_ID);
  });

  describe('1. Inventory Shelf Life Specifications & Freshness', () => {
    it('should assign valid shelf life and storage conditions to all catalog items', () => {
      const allKits = getMealKits();
      expect(allKits.length).toBeGreaterThan(0);

      allKits.forEach((kit) => {
        expect(kit.shelfLifeDays).toBeDefined();
        expect(kit.shelfLifeDays).toBeGreaterThan(0);
        expect(kit.shelfLife).toBeDefined();
        expect(typeof kit.shelfLife).toBe('string');
        expect(kit.storageCondition).toBeDefined();
      });
    });

    it('should correctly calculate freshness status, expiration date and remaining days', () => {
      const kit = getMealKitById(TEST_KIT_ID);
      expect(kit).toBeDefined();

      // Fresh calculation (today's batch)
      const freshness = calculateMealKitFreshness(kit!);
      expect(freshness.shelfLifeDays).toBe(4);
      expect(freshness.daysRemaining).toBe(4);
      expect(freshness.status).toBe('fresh');
      expect(freshness.batchExpiryDate).toBeDefined();

      // Near expiry calculation (prepared 3 days ago for a 4-day shelf life kit)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const nearExpiry = calculateMealKitFreshness(kit!, threeDaysAgo);
      expect(nearExpiry.daysRemaining).toBe(1);
      expect(nearExpiry.status).toBe('near_expiry');

      // Expired calculation (prepared 5 days ago for a 4-day shelf life kit)
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const expired = calculateMealKitFreshness(kit!, fiveDaysAgo);
      expect(expired.daysRemaining).toBe(0);
      expect(expired.status).toBe('expired');
    });

    it('should allow admin to update meal kit shelf life days and storage condition', () => {
      updateMealKitShelfLife(TEST_KIT_ID, 6, 'Keep frozen at -18°C');
      const updated = getMealKitById(TEST_KIT_ID);
      expect(updated?.shelfLifeDays).toBe(6);
      expect(updated?.storageCondition).toBe('Keep frozen at -18°C');
      expect(updated?.shelfLife).toContain('6 days');
    });
  });

  describe('2. Real-Time Inventory Updates on Order Placement', () => {
    it('should deduct stock in the designated fulfillment region when user places an order', async () => {
      const initialStockWest = getMealKitById(TEST_KIT_ID)?.stockByRegion['West'] || 0;
      expect(initialStockWest).toBe(10);

      // Place order for 3 kits in Pune (West region)
      const orderRes = await createOrderInSupabase({
        userId: 'test-user-pune',
        customerName: 'Rohit Kulkarni',
        customerPhone: '+91 9922000000',
        deliveryAddress: 'Flat 402, FC Road, Shivajinagar, Pune, Maharashtra 411005',
        paymentMethod: 'UPI',
        subtotal: 960,
        totalAmount: 960,
        items: [
          {
            kitId: TEST_KIT_ID,
            name: 'Gourmet Test Dal Makhani',
            quantity: 3,
            price: 320,
          },
        ],
      });

      expect(orderRes.success).toBe(true);

      // Verify stock in West region is deducted by 3 (from 10 to 7)
      const afterOrderKit = getMealKitById(TEST_KIT_ID);
      expect(afterOrderKit?.stockByRegion['West']).toBe(7);
      expect(afterOrderKit?.isOutOfStock).toBe(false);
    });
  });

  describe('3. Automated Out-of-Stock and Regional Admin Alerts', () => {
    it('should automatically mark item out of stock and inform regional admins when stock hits 0', async () => {
      // Set West stock to exactly 2
      updateMealKitStock(TEST_KIT_ID, 'West', 2);
      expect(getMealKitById(TEST_KIT_ID)?.stockByRegion['West']).toBe(2);

      let capturedAlert: OutOfStockAlertPayload | null = null;
      const unsub = subscribeToOutOfStockAlerts((alerts) => {
        const found = alerts.find((a) => a.kitId === TEST_KIT_ID);
        if (found) capturedAlert = found;
      });

      // Order remaining 2 units in Pune (West)
      const orderRes = await createOrderInSupabase({
        userId: 'test-user-oos',
        customerName: 'Sanjay Shinde',
        customerPhone: '+91 9822110000',
        deliveryAddress: 'Baner Road, Pune, Maharashtra',
        paymentMethod: 'UPI',
        subtotal: 640,
        totalAmount: 640,
        items: [
          {
            kitId: TEST_KIT_ID,
            name: 'Gourmet Test Dal Makhani',
            quantity: 2,
            price: 320,
          },
        ],
      });

      expect(orderRes.success).toBe(true);

      const kitAfter = getMealKitById(TEST_KIT_ID);
      expect(kitAfter?.stockByRegion['West']).toBe(0);
      expect(kitAfter?.isOutOfStock).toBe(true);

      // Verify regional admin alert was broadcasted
      expect(capturedAlert).not.toBeNull();
      expect(capturedAlert?.kitId).toBe(TEST_KIT_ID);
      expect(capturedAlert?.region).toBe('West');
      expect(capturedAlert?.remainingStock).toBe(0);

      unsub();
    });
  });

  describe('4. Inventory Reversion upon Admin Order Cancellation', () => {
    it('should revert inventory back to pre-order level when admin cancels the order', async () => {
      // Ensure initial stock is 10
      updateMealKitStock(TEST_KIT_ID, 'West', 10);
      updateMealKit(TEST_KIT_ID, { isOutOfStock: false });

      // 1. User orders 4 units
      const createRes = await createOrderInSupabase({
        userId: 'test-user-cancel',
        customerName: 'Priya Joshi',
        customerPhone: '+91 9888776655',
        deliveryAddress: 'Kothrud, Pune, Maharashtra',
        paymentMethod: 'Card',
        subtotal: 1280,
        totalAmount: 1280,
        items: [
          {
            kitId: TEST_KIT_ID,
            name: 'Gourmet Test Dal Makhani',
            quantity: 4,
            price: 320,
          },
        ],
      });

      expect(createRes.success).toBe(true);
      const orderId = createRes.orderId;

      // Stock should now be 6
      expect(getMealKitById(TEST_KIT_ID)?.stockByRegion['West']).toBe(6);

      // 2. Admin cancels order
      const cancelRes = await updateOrderStatusInSupabase(
        orderId,
        'Cancelled',
        'Customer requested cancellation before prep',
      );
      expect(cancelRes.success).toBe(true);

      // Stock must be restored back to 10
      const restoredKit = getMealKitById(TEST_KIT_ID);
      expect(restoredKit?.stockByRegion['West']).toBe(10);

      // 3. Cancelling a second time must NOT double revert (idempotent)
      await updateOrderStatusInSupabase(orderId, 'Cancelled', 'Re-confirming cancellation');
      const recheckedKit = getMealKitById(TEST_KIT_ID);
      expect(recheckedKit?.stockByRegion['West']).toBe(10);
    });

    it('should restore item out-of-stock flag back to false when cancelled order returns positive stock', async () => {
      // Set stock to 2
      updateMealKitStock(TEST_KIT_ID, 'West', 2);
      updateMealKit(TEST_KIT_ID, { isOutOfStock: false });

      // User buys 2, depleting to 0 and marking out of stock
      const orderRes = await createOrderInSupabase({
        userId: 'test-user-deplete',
        customerName: 'Anil Deshmukh',
        customerPhone: '+91 9112233445',
        deliveryAddress: 'Wakad, Pune',
        paymentMethod: 'UPI',
        subtotal: 640,
        totalAmount: 640,
        items: [
          {
            kitId: TEST_KIT_ID,
            name: 'Gourmet Test Dal Makhani',
            quantity: 2,
            price: 320,
          },
        ],
      });

      const oosKit = getMealKitById(TEST_KIT_ID);
      expect(oosKit?.stockByRegion['West']).toBe(0);
      expect(oosKit?.isOutOfStock).toBe(true);

      // Admin cancels order
      await updateOrderStatusInSupabase(orderRes.orderId, 'Cancelled', 'Out of stock cancellation');

      // Stock is restored to 2, and isOutOfStock is automatically cleared
      const backInStockKit = getMealKitById(TEST_KIT_ID);
      expect(backInStockKit?.stockByRegion['West']).toBe(2);
      expect(backInStockKit?.isOutOfStock).toBe(false);
    });
  });
});
