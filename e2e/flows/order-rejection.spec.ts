import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { AdminDashboardPage } from '../pages/admin-dashboard.page';
import { TEST_USERS, TEST_MEAL_KITS } from '../fixtures/test-data';
import { seedBrowserSession } from '../fixtures/auth.fixtures';

test.describe('Flow 2: Dual-Context Order Approval and Rejection', () => {
  test('Branch A: Customer places order -> Admin approves -> Customer sees Confirmed status', async ({
    browser,
  }) => {
    // Context 1: Customer
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    await seedBrowserSession(customerPage, TEST_USERS.customer);

    // Context 2: Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await seedBrowserSession(adminPage, TEST_USERS.admin);

    const home = new HomePage(customerPage);
    const cart = new CartPage(customerPage);
    const checkout = new CheckoutPage(customerPage);
    const adminDash = new AdminDashboardPage(adminPage);

    // 1. Customer places order
    await home.goto();
    await home.selectMealKit(TEST_MEAL_KITS[0]!.id);
    await home.addToCart();

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.selectPaymentMethod('Cash on Delivery');
    await checkout.placeOrder();

    // 2. Extract placed order ID from customer orders page
    await customerPage.goto('/orders');
    await customerPage.waitForLoadState('domcontentloaded');

    const firstOrderCard = customerPage.locator('[data-testid^="order-card-"]').first();
    await firstOrderCard.waitFor({ state: 'visible', timeout: 10000 });
    const orderTestId = await firstOrderCard.getAttribute('data-testid');
    const orderId = orderTestId?.replace('order-card-', '');
    expect(orderId).toBeTruthy();

    // 3. Admin navigates to Orders tab and locates the placed order
    await adminDash.goto();
    await adminDash.switchTab('orders');

    // Approve the order
    await adminDash.approveOrder(orderId!);

    // Verify admin sees updated status
    const adminStatus = await adminDash.getOrderStatus(orderId!);
    expect(adminStatus).toMatch(/Confirmed|Preparing/);

    // 4. Customer verifies status reflection
    await customerPage.reload();
    await customerPage.waitForLoadState('domcontentloaded');

    const customerStatusBadge = customerPage.getByTestId(`order-status-badge-${orderId}`);
    await expect(customerStatusBadge).toBeVisible({ timeout: 10000 });
    const statusText = await customerStatusBadge.textContent();
    expect(statusText).toMatch(/Confirmed|Preparing/);

    await customerContext.close();
    await adminContext.close();
  });

  test('Branch B: Customer places order -> Admin rejects/cancels -> Customer sees Cancelled status', async ({
    browser,
  }) => {
    // Context 1: Customer
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    await seedBrowserSession(customerPage, TEST_USERS.customer);

    // Context 2: Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await seedBrowserSession(adminPage, TEST_USERS.admin);

    const home = new HomePage(customerPage);
    const cart = new CartPage(customerPage);
    const checkout = new CheckoutPage(customerPage);
    const adminDash = new AdminDashboardPage(adminPage);

    // 1. Customer places order
    await home.goto();
    await home.selectMealKit(TEST_MEAL_KITS[1]!.id);
    await home.addToCart();

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.selectPaymentMethod('Cash on Delivery');
    await checkout.placeOrder();

    // 2. Extract placed order ID
    await customerPage.goto('/orders');
    await customerPage.waitForLoadState('domcontentloaded');

    const firstOrderCard = customerPage.locator('[data-testid^="order-card-"]').first();
    await firstOrderCard.waitFor({ state: 'visible', timeout: 10000 });
    const orderTestId = await firstOrderCard.getAttribute('data-testid');
    const orderId = orderTestId?.replace('order-card-', '');
    expect(orderId).toBeTruthy();

    // 3. Admin rejects order
    await adminDash.goto();
    await adminDash.switchTab('orders');
    await adminDash.rejectOrder(orderId!);

    // Verify admin view shows Cancelled
    const adminStatus = await adminDash.getOrderStatus(orderId!);
    expect(adminStatus).toContain('Cancelled');

    // 4. Customer verifies status reflection
    await customerPage.reload();
    await customerPage.waitForLoadState('domcontentloaded');

    const customerStatusBadge = customerPage.getByTestId(`order-status-badge-${orderId}`);
    await expect(customerStatusBadge).toBeVisible({ timeout: 10000 });
    const statusText = await customerStatusBadge.textContent();
    expect(statusText).toContain('Cancelled');

    await customerContext.close();
    await adminContext.close();
  });
});
