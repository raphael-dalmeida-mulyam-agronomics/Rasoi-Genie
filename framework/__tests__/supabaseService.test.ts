import {
  createOrderInSupabase,
  approveOrderInSupabase,
  updateOrderStatusInSupabase,
  fetchAllOrdersFromSupabase,
  refreshPendingApprovalCount,
} from '../services/supabaseOrdersService';
import {
  setPendingApprovalOrdersCount,
  getPendingApprovalOrdersCount,
  subscribeToPendingApprovalCount,
  playOrderAlertSound,
} from '../services/notificationService';
import {
  saveMealKitToSupabase,
  fetchPublishedMealKitsFromSupabase,
} from '../services/supabaseMealKitsService';
import { seedSupabaseDatabase } from '../services/supabaseSeedService';
import { INITIAL_MEAL_KITS } from '../services/mealKitsService';

describe('Supabase Backend & End-to-End Order Flow', () => {
  it('should initialize pending count and notify subscribers', () => {
    let notifiedCount = -1;
    const unsub = subscribeToPendingApprovalCount((count) => {
      notifiedCount = count;
    });

    setPendingApprovalOrdersCount(3);
    expect(getPendingApprovalOrdersCount()).toBe(3);
    expect(notifiedCount).toBe(3);

    unsub();
  });

  it('should safely play order alert chime without throwing errors', () => {
    expect(() => {
      playOrderAlertSound();
    }).not.toThrow();
  });

  it('should create an order with initial status "Placed" awaiting admin approval', async () => {
    const result = await createOrderInSupabase({
      userId: 'test_firebase_uid_123',
      customerName: 'Aarav Mehta',
      customerPhone: '+91 9876500000',
      customerEmail: 'aarav@example.com',
      deliveryAddress: 'Flat 101, Indiranagar, Bengaluru',
      deliverySlot: '6:00 PM - 8:00 PM',
      items: [
        {
          kitId: 'kit-101',
          name: 'Paneer Butter Masala Kit',
          quantity: 2,
          price: 299,
          servings: 2,
          spiceLevel: 'Medium',
          masalaSachets: ['Whole Khada Masala', 'Shahi Gravy Premix'],
        },
      ],
      subtotal: 598,
      discount: 50,
      deliveryFee: 0,
      totalAmount: 548,
      paymentMethod: 'UPI',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    const orders = await fetchAllOrdersFromSupabase();
    const placedOrder = orders.find((o) => o.id === result.orderId);
    expect(placedOrder).toBeDefined();
    expect(placedOrder?.status).toBe('Placed');
    expect(placedOrder?.totalAmount).toBe(548);
  });

  it('should allow admin to approve an order transitioning directly from "Placed" to "Confirmed"', async () => {
    const createRes = await createOrderInSupabase({
      userId: 'user_approval_test',
      customerName: 'Neha Verma',
      customerPhone: '+91 9811122233',
      deliveryAddress: 'Bandra West, Mumbai',
      items: [
        {
          kitId: 'kit-102',
          name: 'Hyderabadi Dum Biryani Kit',
          quantity: 1,
          price: 349,
          servings: 2,
        },
      ],
      subtotal: 349,
      totalAmount: 349,
      paymentMethod: 'Card',
    });

    const approveRes = await approveOrderInSupabase(createRes.orderId, 'admin@mulyam.in');
    expect(approveRes.success).toBe(true);

    const orders = await fetchAllOrdersFromSupabase();
    const confirmedOrder = orders.find((o) => o.id === createRes.orderId);
    expect(confirmedOrder?.status).toBe('Confirmed');
  });

  it('should update order status to subsequent stages (Preparing, Out for Delivery, Delivered)', async () => {
    const createRes = await createOrderInSupabase({
      userId: 'user_lifecycle_test',
      customerName: 'Rohan Gupta',
      customerPhone: '+91 9988776655',
      deliveryAddress: 'Sector 62, Noida',
      items: [
        {
          kitId: 'kit-103',
          name: 'Slow-Brew Dal Makhani Kit',
          quantity: 1,
          price: 249,
        },
      ],
      subtotal: 249,
      totalAmount: 249,
      paymentMethod: 'UPI',
    });

    await updateOrderStatusInSupabase(createRes.orderId, 'Preparing');
    let orders = await fetchAllOrdersFromSupabase();
    expect(orders.find((o) => o.id === createRes.orderId)?.status).toBe('Preparing');

    await updateOrderStatusInSupabase(createRes.orderId, 'Out for Delivery');
    orders = await fetchAllOrdersFromSupabase();
    expect(orders.find((o) => o.id === createRes.orderId)?.status).toBe('Out for Delivery');

    await updateOrderStatusInSupabase(createRes.orderId, 'Delivered');
    orders = await fetchAllOrdersFromSupabase();
    expect(orders.find((o) => o.id === createRes.orderId)?.status).toBe('Delivered');
  });

  it('should handle meal kit saving and publishing to Supabase gracefully', async () => {
    const newKit = INITIAL_MEAL_KITS[0]!;
    const saveRes = await saveMealKitToSupabase(newKit, true);
    expect(typeof saveRes.success).toBe('boolean');

    const publishedKits = await fetchPublishedMealKitsFromSupabase();
    expect(Array.isArray(publishedKits)).toBe(true);
    expect(publishedKits.length).toBeGreaterThan(0);
  });

  it('should run seedSupabaseDatabase without throwing errors', async () => {
    const seedResult = await seedSupabaseDatabase(false);
    expect(typeof seedResult.success).toBe('boolean');
    expect(typeof seedResult.kitsCount).toBe('number');
  });
});
