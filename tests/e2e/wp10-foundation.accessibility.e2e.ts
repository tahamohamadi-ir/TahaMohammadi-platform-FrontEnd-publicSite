import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('WP-10 focus and motion accessibility', () => {
  test('moves keyboard focus from the SkipLink to main content while preserving visible focus @a11y', async ({ page }) => {
    await page.goto('/en/');

    const skipLink = page.locator('.skip-link');
    for (let attempt = 0; attempt < 10 && !(await skipLink.evaluate((element) => element === document.activeElement)); attempt += 1) {
      await page.keyboard.press('Tab');
    }

    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS('outline-style', 'solid');
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('retains a visible keyboard focus treatment and reduces motion @a11y', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /theme/i });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS('outline-style', 'solid');
    expect(
      await toggle.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
    ).toBeLessThanOrEqual(0.00001);
  });

  test('has no automatic accessibility violations on the theme control @a11y', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).include('[data-theme-toggle]').analyze();
    expect(results.violations).toEqual([]);
  });

  test('WP-40 Home accessibility acceptance is isolated from the WP-10 green gate @later-packet-acceptance', async ({ page }) => {
    await page.goto('/en/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
