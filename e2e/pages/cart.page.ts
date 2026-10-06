import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly couponInput: Locator;
  readonly applyCouponBtn: Locator;
  readonly proceedCheckoutBtn: Locator;
  readonly grandTotalText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.couponInput = page.getByTestId('cart-coupon-input');
    this.applyCouponBtn = page.getByTestId('cart-apply-coupon-btn');
    this.proceedCheckoutBtn = page.getByTestId('cart-proceed-checkout-btn');
    this.grandTotalText = page.getByTestId('cart-grand-total');
  }

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async applyCoupon(code: string) {
    await this.couponInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.couponInput.fill(code);
    await this.applyCouponBtn.click();
    await this.page.waitForTimeout(500);
  }

  async applyPopularCoupon(type: 'RASOI100' | 'FREEDEL') {
    const testId = type === 'RASOI100' ? 'cart-coupon-rasoi100' : 'cart-coupon-freedel';
    const pill = this.page.getByTestId(testId);
    await pill.waitFor({ state: 'visible', timeout: 5000 });
    await pill.click();
    await this.page.waitForTimeout(500);
  }

  async getAppliedCouponText(): Promise<string> {
    const el = this.page.getByTestId('cart-applied-coupon-text');
    await el.waitFor({ state: 'visible', timeout: 5000 });
    return (await el.textContent()) || '';
  }

  async getGrandTotal(): Promise<string> {
    await this.grandTotalText.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.grandTotalText.textContent()) || '';
  }

  async proceedToCheckout() {
    await this.proceedCheckoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await this.proceedCheckoutBtn.click();
    await this.page.waitForTimeout(500);
  }
}
