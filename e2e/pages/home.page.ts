import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  getMealKitCard(kitId: string): Locator {
    return this.page.getByTestId(`meal-kit-card-${kitId}`);
  }

  async selectMealKit(kitId: string) {
    const card = this.getMealKitCard(kitId);
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
  }

  async adjustServings(servings: 2 | 4 | 6) {
    const pill = this.page.getByTestId(`servings-option-${servings}`);
    await pill.waitFor({ state: 'visible', timeout: 5000 });
    await pill.click();
  }

  async adjustSpiceLevel(level: 'Mild' | 'Medium' | 'Spicy' | 'Fiery') {
    const pill = this.page.getByTestId(`spice-option-${level}`);
    await pill.waitFor({ state: 'visible', timeout: 5000 });
    await pill.click();
  }

  async addToCart() {
    const btn = this.page.getByTestId('modal-add-to-cart-btn');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  async closeDetailModal() {
    const btn = this.page.getByTestId('modal-close-detail-btn');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
    }
  }

  async openBasket() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isMealKitVisible(kitId: string): Promise<boolean> {
    return await this.getMealKitCard(kitId).isVisible({ timeout: 5000 }).catch(() => false);
  }
}
