import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly placeOrderBtn: Locator;
  readonly walletToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.placeOrderBtn = page.getByTestId('checkout-place-order-btn');
    this.walletToggle = page.getByTestId('checkout-wallet-toggle');
  }

  async toggleWalletCredits() {
    await this.walletToggle.waitFor({ state: 'visible', timeout: 5000 });
    await this.walletToggle.click();
    await this.page.waitForTimeout(400);
  }

  async selectPaymentMethod(method: 'UPI' | 'Card' | 'Cash on Delivery') {
    const slug = method.replace(/\s+/g, '-').toLowerCase();
    const btn = this.page
      .getByTestId(`payment-method-${slug}`)
      .or(this.page.getByTestId(`checkout-payment-method-${method}`))
      .first();
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    try {
      await btn.click({ timeout: 3000 });
    } catch {
      await btn.click({ force: true });
    }
    await this.page.waitForTimeout(300);
  }

  async placeOrder() {
    await this.placeOrderBtn.waitFor({ state: 'visible', timeout: 8000 });
    try {
      await this.placeOrderBtn.click({ timeout: 3000 });
    } catch {
      await this.placeOrderBtn.click({ force: true });
    }
    // Wait for order placement to finish and confirmation screen to appear
    const confirmation = this.page
      .getByTestId('track-order-status-btn')
      .or(this.page.getByTestId('start-cooking-guide-btn'))
      .or(this.page.getByText(/Order Placed/i));
    await confirmation.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }
}
