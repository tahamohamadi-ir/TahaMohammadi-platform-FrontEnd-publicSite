import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('WP-10 focus and motion accessibility', () => {
  test('retains a visible keyboard focus treatment and reduces motion @wp10-foundation', async ({ page }) => {
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

  test('has no automatic accessibility violations on the theme control @wp10-foundation', async ({ page }) => {
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
