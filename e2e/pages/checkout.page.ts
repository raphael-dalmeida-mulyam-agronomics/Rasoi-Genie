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
    const btn = this.page.getByTestId(`checkout-payment-method-${method}`);
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async placeOrder() {
    await this.placeOrderBtn.waitFor({ state: 'visible', timeout: 8000 });
    await this.placeOrderBtn.click();
    // Wait for order placement processing
    await this.page.waitForTimeout(2000);
  }
}
