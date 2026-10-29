import { test, expect } from '../fixtures/auth.fixtures';
import { seedBrowserSession } from '../fixtures/auth.fixtures';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Flow: Weekly Meal Subscriptions', () => {
  test('Individual Subscription: View plans, select Keto plan, pay upfront via Mock Gateway and verify active subscription', async ({
    page,
  }) => {
    // 1. Seed customer session
    await seedBrowserSession(page, TEST_USERS.customer);

    // 2. Navigate to Profile
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // 3. Open Recurring Meal Plan
    const subscriptionMenuRow = page.getByTestId('profile-menu-subscription');
    await expect(subscriptionMenuRow).toBeVisible({ timeout: 8000 });
    await subscriptionMenuRow.click();

    // 4. Verify standard plans exist
    const highProteinCard = page.getByTestId('standard-plan-high-protein');
    const ketoCard = page.getByTestId('standard-plan-keto');
    const veganCard = page.getByTestId('standard-plan-vegan');

    await expect(highProteinCard).toBeVisible({ timeout: 6000 });
    await expect(ketoCard).toBeVisible();
    await expect(veganCard).toBeVisible();

    // 5. Select Keto plan
    await ketoCard.click();

    // 6. Verify 7-day weekly schedule cells are rendered
    const mondayCell = page.getByTestId('day-cell-0');
    await expect(mondayCell).toBeVisible();

    // 7. Verify Upfront Subscribe Button and click it
    const subscribeBtn = page.getByTestId('subscribe-upfront-btn');
    await expect(subscribeBtn).toBeVisible();
    await subscribeBtn.click();

    // 8. Handle Mock Payment Gateway Modal if payable amount > 0
    const paymentModal = page.getByTestId('mock-payment-gateway-modal');
    const modalVisible = await paymentModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      const paySuccessBtn = page.getByTestId('mock-gateway-pay-success-btn');
      await expect(paySuccessBtn).toBeVisible();
      await paySuccessBtn.click();
    }

    // 9. Verify Active Subscription view is displayed
    const activeBadge = page.getByText(/Active/i);
    await expect(activeBadge.first()).toBeVisible({ timeout: 10000 });

    // Verify Pause and Cancel options exist
    const pauseBtn = page.getByText(/Pause Deliveries/i);
    await expect(pauseBtn).toBeVisible();
  });

  test('Family Owner Subscription: Open calendar weekly matrix, review family member assignments, pay upfront', async ({
    page,
  }) => {
    // 1. Seed customer session
    await seedBrowserSession(page, TEST_USERS.customer);

    // 2. Inject family store with owner role and a child dependent
    const familyId = 'fam_e2e_subscription_test';
    const mockFamilyData = {
      families: {
        [familyId]: {
          id: familyId,
          name: 'Sharma Family Kitchen',
          owner_id: TEST_USERS.customer.uid,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      members: {
        [familyId]: [
          {
            family_id: familyId,
            user_id: TEST_USERS.customer.uid,
            role: 'owner',
            dependent_type: null,
            display_name: 'Rahul (Owner)',
            joined_at: new Date().toISOString(),
          },
          {
            family_id: familyId,
            user_id: 'dep_child_aarav',
            role: 'member',
            dependent_type: 'child',
            display_name: 'Aarav (Child)',
            joined_at: new Date().toISOString(),
            dietary_preferences: {
              dietTypes: ['veg'],
              allergies: [],
              spiceTolerance: 'Mild',
              preferredCuisines: ['North Indian'],
            },
          },
        ],
      },
      cartItems: { [familyId]: [] },
      invites: { [familyId]: [] },
      links: { [familyId]: [] },
      holds: {},
      auditLog: {},
      history: {},
    };

    await page.addInitScript(
      ({ storeKey, storeData }) => {
        window.localStorage.setItem(storeKey, JSON.stringify(storeData));
      },
      {
        storeKey: '@rasoi_family_store_v1',
        storeData: mockFamilyData,
      },
    );

    // 3. Navigate to Family Hub
    await page.goto('/family', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // 4. Owner should see the Weekly Subscription action card
    const subscriptionActionCard = page.getByTestId('family-subscription-btn');
    await expect(subscriptionActionCard).toBeVisible({ timeout: 8000 });
    await subscriptionActionCard.click();

    // 5. Verify navigation into Google Calendar matrix view
    await page.waitForURL('**/family/subscription', { timeout: 6000 });

    // 6. Verify calendar matrix rows for both members
    const ownerRow = page.getByTestId(`calendar-row-${TEST_USERS.customer.uid}`);
    const childRow = page.getByTestId('calendar-row-dep_child_aarav');
    await expect(ownerRow).toBeVisible({ timeout: 6000 });
    await expect(childRow).toBeVisible();

    // 7. Verify upfront family subscribe button is present
    const familySubscribeBtn = page.getByTestId('family-subscribe-upfront-btn');
    await expect(familySubscribeBtn).toBeVisible();
    await familySubscribeBtn.click();

    // 8. Handle Mock Payment Gateway Modal
    const paymentModal = page.getByTestId('mock-payment-gateway-modal');
    const modalVisible = await paymentModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      const paySuccessBtn = page.getByTestId('mock-gateway-pay-success-btn');
      await expect(paySuccessBtn).toBeVisible();
      await paySuccessBtn.click();
    }

    // 9. Verify family subscription status is confirmed
    const statusText = page.getByText(/Active/i);
    await expect(statusText.first()).toBeVisible({ timeout: 10000 });
  });
});
