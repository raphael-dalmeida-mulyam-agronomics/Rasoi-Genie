import { Page, Locator } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('search-input');
  }

  async goto() {
    await this.page.goto('/search');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async search(query: string) {
    await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.searchInput.fill(query);
    // Allow debounce to trigger filtering
    await this.page.waitForTimeout(500);
  }

  getSearchResultCard(kitId: string): Locator {
    return this.page.getByTestId(`search-result-card-${kitId}`);
  }

  async selectSearchResult(kitId: string) {
    const card = this.getSearchResultCard(kitId);
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await card.click();
  }

  async isSearchResultVisible(kitId: string): Promise<boolean> {
    return await this.getSearchResultCard(kitId).isVisible({ timeout: 5000 }).catch(() => false);
  }
}
