import { expect, test } from '@playwright/test';

test.describe('PUBLIC-150 shell skip-link destination focus', () => {
  test('activates SkipLink, focuses #main-content, and shows a tokenized outline @a11y', async ({ page }) => {
    await page.goto('/en/');

    const skipLink = page.locator('.skip-link');
    for (
      let attempt = 0;
      attempt < 10 && !(await skipLink.evaluate((element) => element === document.activeElement));
      attempt += 1
    ) {
      await page.keyboard.press('Tab');
    }

    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');

    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
    await expect(mainContent).toHaveCSS('outline-width', '2px');
    await expect(mainContent).toHaveCSS('outline-style', 'solid');
  });
});
