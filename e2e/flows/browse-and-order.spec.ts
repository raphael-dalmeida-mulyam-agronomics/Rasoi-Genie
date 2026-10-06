import { test, expect } from '../fixtures/auth.fixtures';
import { HomePage } from '../pages/home.page';
import { SearchPage } from '../pages/search.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { TEST_COUPONS, TEST_MEAL_KITS, TEST_USERS } from '../fixtures/test-data';
import { seedBrowserSession } from '../fixtures/auth.fixtures';

test.describe('Flow 1: Browse and Order Meal Kit', () => {
  test.beforeEach(async ({ page }) => {
    await seedBrowserSession(page, TEST_USERS.customer);
  });

  test('Happy Path: Search, customize portions & spice, apply valid coupon, and place order', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const searchPage = new SearchPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // 1. Search for meal kit
    await searchPage.goto();
    const targetKit = TEST_MEAL_KITS[0]!;
    await searchPage.search('Butter Chicken');

    // 2. Open detail modal
    await searchPage.selectSearchResult(targetKit.id);

    // 3. Adjust portions (4 Servings) and spice level (Spicy)
    await homePage.adjustServings(4);
    await homePage.adjustSpiceLevel('Spicy');

    // 4. Add to cart
    await homePage.addToCart();

    // 5. Open cart
    await cartPage.goto();

    // 6. Apply valid coupon (RASOI100)
    await cartPage.applyCoupon(TEST_COUPONS.validFlat);
    const appliedText = await cartPage.getAppliedCouponText();
    expect(appliedText).toContain(TEST_COUPONS.validFlat);

    // 7. Proceed to checkout
    await cartPage.proceedToCheckout();

    // 8. Place order via Cash on Delivery / UPI
    await checkoutPage.selectPaymentMethod('Cash on Delivery');
    await checkoutPage.placeOrder();

    // 9. Verify order is recorded and visible in customer orders
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    // Look for placed order card
    const orderCards = page.locator('[data-testid^="order-card-"]');
    await expect(orderCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Failure Branch: Attempting to apply invalid coupon code triggers rejection', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const cartPage = new CartPage(page);

    // 1. Add item from home page
    await homePage.goto();
    const targetKit = TEST_MEAL_KITS[1]!;
    await homePage.selectMealKit(targetKit.id);
    await homePage.addToCart();

    // 2. Open cart
    await cartPage.goto();

    // 3. Listen for window dialog / alert on invalid coupon
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // 4. Attempt to apply invalid coupon
    await cartPage.applyCoupon(TEST_COUPONS.invalid);

    // 5. Verify coupon was rejected (no applied coupon badge with invalid code)
    const appliedBadge = page.getByTestId('cart-applied-coupon-text');
    const isApplied = await appliedBadge.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isApplied).toBeFalsy();
  });
});
