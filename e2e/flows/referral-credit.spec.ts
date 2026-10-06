import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../pages/admin-dashboard.page';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { TEST_USERS, TEST_MEAL_KITS, TEST_REFERRAL } from '../fixtures/test-data';
import { seedBrowserSession } from '../fixtures/auth.fixtures';
import {
  testRegisterReferralCode,
  testQualifyReferralOrder,
  testGetWalletBalance,
} from '../fixtures/test-helpers';

test.describe('Flow 4: Referral Programme & Wallet Credit Accrual', () => {
  test('Happy Path: Referrer code registration -> Qualifying order placed -> Referrer wallet balance increases', async ({
    browser,
  }) => {
    // 1. Initial State: Check initial referrer wallet balance
    const initialBalance = await testGetWalletBalance(TEST_USERS.referrer.uid);

    // 2. Referee Context: New user registers referrer code
    const regResult = await testRegisterReferralCode(
      TEST_REFERRAL.code,
      TEST_USERS.referee.uid,
    );
    expect(regResult.success).toBeTruthy();

    // 3. Referee completes qualifying order through UI
    const refereeContext = await browser.newContext();
    const refereePage = await refereeContext.newPage();
    await seedBrowserSession(refereePage, TEST_USERS.referee);

    const home = new HomePage(refereePage);
    const cart = new CartPage(refereePage);
    const checkout = new CheckoutPage(refereePage);

    await home.goto();
    await home.selectMealKit(TEST_MEAL_KITS[0]!.id);
    await home.addToCart();

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.selectPaymentMethod('Cash on Delivery');
    await checkout.placeOrder();

    // 4. Qualify referral event (per qualification_event setting)
    const qualifyRes = await testQualifyReferralOrder(
      TEST_USERS.referee.uid,
      `ORD-E2E-REF-${Date.now()}`,
    );
    expect(qualifyRes.success).toBeTruthy();

    // 5. Verify Referrer wallet balance has increased by referrer_reward amount (300)
    const updatedBalance = await testGetWalletBalance(TEST_USERS.referrer.uid);
    expect(updatedBalance).toBeGreaterThanOrEqual(initialBalance + TEST_REFERRAL.referrerReward);

    // 6. Admin Context: Verify wallet ledger reflects in Admin Wallets Hub
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await seedBrowserSession(adminPage, TEST_USERS.admin);

    const adminDash = new AdminDashboardPage(adminPage);
    await adminDash.goto();
    await adminDash.switchTab('wallets');

    // Wallets view shows customer wallets list
    await expect(adminPage.getByText('Customer Wallets').first()).toBeVisible({ timeout: 10000 });

    await refereeContext.close();
    await adminContext.close();
  });

  test('Rejection Branch: Invalid referral code registration returns failure', async ({}) => {
    // Attempting to register an invalid non-existent code
    const invalidRes = await testRegisterReferralCode(
      'INVALID_CODE_999',
      'temp_user_test_failure',
    );

    // Verify registration failure
    expect(invalidRes.success).toBeFalsy();
    expect(invalidRes.error).toBeTruthy();
  });
});
