import { expect, test } from '@playwright/test';

test.describe('WP-10 foundation acceptance', () => {
  test('WP-40 Home DOM acceptance publishes locale and direction metadata with exactly one page heading @later-packet-acceptance', async ({ page }) => {
    await page.goto('/en/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('WP-40 screenshot matrix has no horizontal overflow at each required width @later-packet-acceptance', async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en/');
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }
  });

  test('keeps multiple theme controls independent and cycles system light dark @wp10-foundation', async ({ page }) => {
    await page.goto('/en/');
    const controls = page.getByRole('button', { name: /theme/i });

    await expect(controls).toHaveCount(1);
    await page.evaluate(() => {
      const clone = document.querySelector('[data-theme-toggle]')?.cloneNode(true);
      clone?.setAttribute('aria-label', 'Theme clone');
      document.body.append(clone);
    });
    const clonedControl = page.getByRole('button', { name: 'Theme clone' });
    await expect(clonedControl).toHaveCount(1);
    await clonedControl.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'light');
    await controls.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'dark');
    await controls.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'system');
  });
});
