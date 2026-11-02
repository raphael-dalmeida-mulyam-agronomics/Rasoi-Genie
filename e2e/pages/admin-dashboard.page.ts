import { Page, Locator } from '@playwright/test';
import { AdminTab } from '../../features/admin/AdminNavigationMenu';

export class AdminDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async dismissDialogIfPresent() {
    try {
      const card = this.page.locator('[data-testid="in-app-dialog-card"]');
      if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
        const okBtn = card
          .locator('[data-testid="dialog-btn-ok"], [role="button"], button')
          .first();
        if (await okBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await okBtn.click({ force: true }).catch(() => {});
        } else {
          await card.click({ force: true }).catch(() => {});
        }
        await card.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  getTab(tabId: AdminTab): Locator {
    return this.page.getByTestId(`admin-tab-${tabId}`);
  }

  async switchTab(tabId: AdminTab) {
    await this.dismissDialogIfPresent();
    const tab = this.getTab(tabId);
    await tab.waitFor({ state: 'visible', timeout: 5000 });
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.dismissDialogIfPresent();
      try {
        await tab.click({ timeout: 2000, force: attempt > 0 });
        break;
      } catch {
        await this.dismissDialogIfPresent();
        await this.page.waitForTimeout(500);
      }
    }
    await this.page.waitForTimeout(400);
  }

  async getPendingChefSubmissionsBadge(): Promise<string | null> {
    const badge = this.page.getByTestId('admin-tab-chefs-badge');
    if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
      return (await badge.textContent()) || null;
    }
    return null;
  }

  async approveOrder(orderId: string) {
    await this.dismissDialogIfPresent();
    const btn = this.page.getByTestId(`admin-approve-order-${orderId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    try {
      await btn.click({ timeout: 3000 });
    } catch {
      await this.dismissDialogIfPresent();
      await btn.click({ timeout: 5000 });
    }
    await this.page.waitForTimeout(1000);
  }

  async rejectOrder(orderId: string) {
    await this.dismissDialogIfPresent();
    const btn = this.page.getByTestId(`admin-reject-order-${orderId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    try {
      await btn.click({ timeout: 3000 });
    } catch {
      await this.dismissDialogIfPresent();
      await btn.click({ timeout: 5000 });
    }
    const confirmBtn = this.page.getByTestId('admin-confirm-cancel-order-btn');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async getOrderStatus(orderId: string): Promise<string> {
    const statusEl = this.page.getByTestId(`admin-order-status-${orderId}`);
    await statusEl.waitFor({ state: 'visible', timeout: 5000 });
    return (await statusEl.textContent()) || '';
  }

  async openChefSubmissionReview(submissionId: string) {
    await this.dismissDialogIfPresent();
    const btn = this.page.getByTestId(`admin-review-chef-btn-${submissionId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    try {
      await btn.click({ timeout: 3000 });
    } catch {
      await this.dismissDialogIfPresent();
      await btn.click({ timeout: 5000 });
    }
    await this.page.waitForTimeout(400);
  }

  async approveChefSubmission(price: number = 299) {
    const priceInput = this.page.getByTestId('admin-chef-price-input');
    await priceInput.waitFor({ state: 'visible', timeout: 5000 });
    await priceInput.fill(String(price));

    const publishBtn = this.page.getByTestId('admin-chef-publish-btn');
    await publishBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async rejectChefSubmission(reason: string = 'Incomplete ingredients formulation') {
    const notesInput = this.page.getByTestId('admin-chef-reject-notes');
    await notesInput.waitFor({ state: 'visible', timeout: 5000 });
    await notesInput.fill(reason);

    const rejectBtn = this.page.getByTestId('admin-chef-reject-btn');
    await rejectBtn.click();
    await this.page.waitForTimeout(1000);
  }
}
