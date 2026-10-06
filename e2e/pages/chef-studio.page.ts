import { Page, Locator } from '@playwright/test';

export class ChefStudioPage {
  readonly page: Page;
  readonly newRecipeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newRecipeBtn = page.getByTestId('chef-create-recipe-btn');
  }

  async goto() {
    await this.page.goto('/chef');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openCreateRecipeModal() {
    await this.newRecipeBtn.waitFor({ state: 'visible', timeout: 8000 });
    await this.newRecipeBtn.click();
    await this.page.waitForTimeout(400);
  }

  async fillBasicInfo(name: string, tagline: string, description: string) {
    const nameInput = this.page.getByTestId('chef-recipe-name-input');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill(name);

    const taglineInput = this.page.getByTestId('chef-recipe-tagline-input');
    await taglineInput.fill(tagline);

    const descInput = this.page.getByTestId('chef-recipe-desc-input');
    await descInput.fill(description);

    const nextBtn = this.page.getByTestId('chef-next-recipe-btn');
    await nextBtn.click();
    await this.page.waitForTimeout(400);
  }

  async fillIngredientsAndSteps(
    ingredients: Array<{ name: string; qty: string }>,
    steps: Array<{ instruction: string }>,
  ) {
    // Fill first ingredient
    if (ingredients.length > 0 && ingredients[0]) {
      const name0 = this.page.getByTestId('chef-ingredient-name-0');
      await name0.waitFor({ state: 'visible', timeout: 5000 });
      await name0.fill(ingredients[0].name);

      const qty0 = this.page.getByTestId('chef-ingredient-qty-0');
      await qty0.fill(ingredients[0].qty);
    }

    // If there is an intermediate button to navigate to steps, click it
    const nextStepsBtn = this.page.getByTestId('chef-next-steps-btn');
    if (await nextStepsBtn.isVisible()) {
      await nextStepsBtn.click();
      await this.page.waitForTimeout(400);
    }

    // Fill first step
    if (steps.length > 0 && steps[0]) {
      const step0 = this.page.getByTestId('chef-step-instruction-0');
      await step0.waitFor({ state: 'visible', timeout: 5000 });
      await step0.fill(steps[0].instruction);
    }

    const nextBtn = this.page.getByTestId('chef-next-review-btn');
    await nextBtn.click();
    await this.page.waitForTimeout(400);
  }

  async submitRecipe() {
    const submitBtn = this.page.getByTestId('chef-submit-recipe-btn');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    await this.page.waitForTimeout(1500);
  }
}
