import { test as base, Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserAccount } from './test-data';

const AUTH_STORAGE_KEY = '@rasoi_auth_user';

/**
 * Injects a authenticated session directly into browser localStorage.
 * Used for fast, reliable context initialization across tests.
 */
export async function seedBrowserSession(page: Page, user: TestUserAccount) {
  const profile = {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber || null,
    role: user.role,
    displayName: user.displayName,
    photoURL: null,
    createdAt: new Date().toISOString(),
  };

  await page.addInitScript(
    ({ storageKey, userProfile }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(userProfile));
    },
    { storageKey: AUTH_STORAGE_KEY, userProfile: profile },
  );
}

/**
 * Performs a complete UI-driven login via the UnifiedLoginForm.
 * Uses the OTP bypass code '123456' supported natively by authService.ts.
 */
export async function loginViaUI(page: Page, user: TestUserAccount) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Check if already authenticated as this user
  const currentUrl = page.url();
  const emailInput = page.getByTestId('input-email');
  const isLoginFormVisible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);

  if (!isLoginFormVisible) {
    // If on account view or root, check if already signed in
    const tabLoginEmail = page.getByTestId('tab-login-email');
    if (await tabLoginEmail.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabLoginEmail.click();
    }
  } else {
    // Already on email form or need to switch to email tab
    const tabLoginEmail = page.getByTestId('tab-login-email');
    if (await tabLoginEmail.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabLoginEmail.click();
    }
  }

  // Switch to email mode tab if visible
  const emailTab = page.getByTestId('tab-login-email');
  if (await emailTab.isVisible({ timeout: 1500 }).catch(() => false)) {
    await emailTab.click();
  }

  // Enter email address
  await page.getByTestId('input-email').fill(user.email);
  await page.getByTestId('btn-request-otp').click();

  // Enter OTP code (123456 test bypass)
  await page.getByTestId('input-otp').waitFor({ state: 'visible', timeout: 8000 });
  await page.getByTestId('input-otp').fill('123456');
  await page.getByTestId('btn-verify-otp').click();

  // Ensure login completed and user is redirected or authenticated
  await page.waitForTimeout(1000);
}

/**
 * Extended Playwright test fixtures providing pre-authenticated pages.
 */
type AuthFixtures = {
  customerPage: Page;
  adminPage: Page;
  chefPage: Page;
};

export const test = base.extend<AuthFixtures>({
  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedBrowserSession(page, TEST_USERS.customer);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedBrowserSession(page, TEST_USERS.admin);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await context.close();
  },

  chefPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedBrowserSession(page, TEST_USERS.chef);
    await page.goto('/chef');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await context.close();
  },
});

export { expect };
