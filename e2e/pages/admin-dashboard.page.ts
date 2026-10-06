import { Page, Locator } from '@playwright/test';
import { AdminTab } from '../../features/admin/AdminNavigationMenu';

export class AdminDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('domcontentloaded');
  }

  getTab(tabId: AdminTab): Locator {
    return this.page.getByTestId(`admin-tab-${tabId}`);
  }

  async switchTab(tabId: AdminTab) {
    const tab = this.getTab(tabId);
    await tab.waitFor({ state: 'visible', timeout: 5000 });
    await tab.click();
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
    const btn = this.page.getByTestId(`admin-approve-order-${orderId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this.page.waitForTimeout(1000);
  }

  async rejectOrder(orderId: string) {
    const btn = this.page.getByTestId(`admin-reject-order-${orderId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this.page.waitForTimeout(1000);
  }

  async getOrderStatus(orderId: string): Promise<string> {
    const statusEl = this.page.getByTestId(`admin-order-status-${orderId}`);
    await statusEl.waitFor({ state: 'visible', timeout: 5000 });
    return (await statusEl.textContent()) || '';
  }

  async openChefSubmissionReview(submissionId: string) {
    const btn = this.page.getByTestId(`admin-review-chef-btn-${submissionId}`);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
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
