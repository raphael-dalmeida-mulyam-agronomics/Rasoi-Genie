import { test, expect } from '@playwright/test';
import { ChefStudioPage } from '../pages/chef-studio.page';
import { AdminDashboardPage } from '../pages/admin-dashboard.page';
import { HomePage } from '../pages/home.page';
import { TEST_USERS } from '../fixtures/test-data';
import { seedBrowserSession } from '../fixtures/auth.fixtures';

test.describe('Flow 3: Chef Studio Meal Kit Lifecycle & Admin Moderation', () => {
  test('Happy Path: Chef submits recipe -> Admin reviews & publishes with pricing -> Meal kit goes live', async ({
    browser,
  }) => {
    // Context 1: Chef
    const chefContext = await browser.newContext();
    const chefPage = await chefContext.newPage();
    await seedBrowserSession(chefPage, TEST_USERS.chef);

    // Context 2: Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await seedBrowserSession(adminPage, TEST_USERS.admin);

    const chefStudio = new ChefStudioPage(chefPage);
    const adminDash = new AdminDashboardPage(adminPage);

    // 1. Chef creates and submits a new meal kit recipe
    const recipeName = `Kashmiri Rogan Josh Special ${Date.now()}`;
    await chefStudio.goto();
    await chefStudio.openCreateRecipeModal();

    await chefStudio.fillBasicInfo(
      recipeName,
      'Aromatic slow-cooked lamb curry infused with fennel and dry ginger',
      'Traditional Kashmiri wazwan delight prepared with whole spices and ratanjot extract.',
    );

    await chefStudio.fillIngredientsAndSteps(
      [
        { name: 'Tender Mutton Chops', qty: '500g' },
        { name: 'Kashmiri Spice Pot', qty: '1 pot' },
      ],
      [{ instruction: 'Sear meat in mustard oil and simmer with spiced broth.' }],
    );

    await chefStudio.submitRecipe();

    // 2. Admin inspects Chef Submissions tab
    await adminDash.goto();
    await adminDash.switchTab('chefs');

    // Locate the newly submitted recipe card
    const reviewBtn = adminPage.locator('[data-testid^="admin-review-chef-btn-"]').first();
    await reviewBtn.waitFor({ state: 'visible', timeout: 10000 });
    await reviewBtn.click();

    // Admin sets price and publishes
    await adminDash.approveChefSubmission(449);

    // 3. Customer views Home catalog to confirm the newly published kit is live
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    await seedBrowserSession(customerPage, TEST_USERS.customer);

    const home = new HomePage(customerPage);
    await home.goto();
    await customerPage.waitForLoadState('domcontentloaded');

    // Verify recipe title appears in the catalog
    await expect(customerPage.getByText(recipeName).first()).toBeVisible({ timeout: 10000 });

    await chefContext.close();
    await adminContext.close();
    await customerContext.close();
  });

  test('Rejection Branch: Chef submits recipe -> Admin reviews and rejects with feedback', async ({
    browser,
  }) => {
    // Context 1: Chef
    const chefContext = await browser.newContext();
    const chefPage = await chefContext.newPage();
    await seedBrowserSession(chefPage, TEST_USERS.chef);

    // Context 2: Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await seedBrowserSession(adminPage, TEST_USERS.admin);

    const chefStudio = new ChefStudioPage(chefPage);
    const adminDash = new AdminDashboardPage(adminPage);

    // 1. Chef submits recipe
    const rejectRecipeName = `Experimental Spicy Dish ${Date.now()}`;
    await chefStudio.goto();
    await chefStudio.openCreateRecipeModal();

    await chefStudio.fillBasicInfo(
      rejectRecipeName,
      'Experimental recipe needing revision',
      'Draft recipe test for rejection flow verification.',
    );

    await chefStudio.fillIngredientsAndSteps(
      [{ name: 'Raw Spices', qty: '50g' }],
      [{ instruction: 'Mix everything together.' }],
    );

    await chefStudio.submitRecipe();

    // 2. Admin inspects chefs tab and opens review modal
    await adminDash.goto();
    await adminDash.switchTab('chefs');

    const reviewBtn = adminPage.locator('[data-testid^="admin-review-chef-btn-"]').first();
    await reviewBtn.waitFor({ state: 'visible', timeout: 10000 });
    await reviewBtn.click();

    // Admin rejects with notes
    const rejectionReason = 'Portion ratios incomplete. Please update allergen info.';
    await adminDash.rejectChefSubmission(rejectionReason);

    // 3. Chef reloads studio and verifies rejection feedback
    await chefPage.reload();
    await chefPage.waitForLoadState('domcontentloaded');

    const rejectedBadge = chefPage.getByText('Rejected').first();
    await expect(rejectedBadge).toBeVisible({ timeout: 10000 });

    await chefContext.close();
    await adminContext.close();
  });
});
