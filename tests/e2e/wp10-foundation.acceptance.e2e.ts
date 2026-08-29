import { expect, test } from '@playwright/test';

type ThemeEventDetail = { requested: 'system' | 'light' | 'dark'; resolved: 'light' | 'dark' };

declare global {
  interface Window {
    __tmThemeEvents: ThemeEventDetail[];
  }
}

test.describe('WP-10 foundation acceptance', () => {
  const matrix = [
    { id: 'gateway-1440-light', name: 'Gateway desktop light', path: '/', theme: 'light', width: 1440 },
    { id: 'gateway-1440-dark', name: 'Gateway desktop dark', path: '/', theme: 'dark', width: 1440 },
    { id: 'gateway-390-light', name: 'Gateway mobile light', path: '/', theme: 'light', width: 390 },
    { id: 'gateway-390-dark', name: 'Gateway mobile dark', path: '/', theme: 'dark', width: 390 },
    { id: 'home-en-1440-light', name: 'Home EN desktop light', path: '/en/', locale: 'en', dir: 'ltr', theme: 'light', width: 1440 },
    { id: 'home-en-1440-dark', name: 'Home EN desktop dark', path: '/en/', locale: 'en', dir: 'ltr', theme: 'dark', width: 1440 },
    { id: 'home-fa-390-light', name: 'Home FA mobile RTL light', path: '/fa/', locale: 'fa', dir: 'rtl', theme: 'light', width: 390 },
    { id: 'home-fa-390-dark', name: 'Home FA mobile RTL dark', path: '/fa/', locale: 'fa', dir: 'rtl', theme: 'dark', width: 390 },
    { id: 'home-en-768-light', name: 'Home EN tablet light', path: '/en/', locale: 'en', dir: 'ltr', theme: 'light', width: 768 },
    { id: 'home-en-768-dark', name: 'Home EN tablet dark', path: '/en/', locale: 'en', dir: 'ltr', theme: 'dark', width: 768 },
    { id: 'home-fa-768-light', name: 'Home FA tablet RTL light', path: '/fa/', locale: 'fa', dir: 'rtl', theme: 'light', width: 768 },
    { id: 'home-fa-768-dark', name: 'Home FA tablet RTL dark', path: '/fa/', locale: 'fa', dir: 'rtl', theme: 'dark', width: 768 },
  ] as const;

  for (const target of matrix) {
    test(`WP-40 screenshot discovery: ${target.name} has the required locale, theme, H1, overflow, and capture evidence @later-packet-acceptance`, async ({ page }) => {
      await page.addInitScript((theme) => localStorage.setItem('tm-theme', theme), target.theme);
      await page.setViewportSize({ width: target.width, height: 900 });
      await page.goto(target.path);

      if ('locale' in target) {
        await expect(page.locator('html')).toHaveAttribute('lang', target.locale);
        await expect(page.locator('html')).toHaveAttribute('dir', target.dir);
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', target.theme);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await page.screenshot({ path: `test-results/visual/wp40-${target.id}.png`, fullPage: true });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test('keeps multiple theme controls independent and cycles system light dark @wp10-foundation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.setItem('tm-theme', 'system');
      window.__tmThemeEvents = [];
      window.addEventListener('tm-themechange', (event) => window.__tmThemeEvents.push(event.detail));
    });
    await page.goto('/en/');
    const controls = page.locator('[data-theme-toggle]');

    await expect(controls).toHaveCount(1);
    await expect(controls.first()).toHaveAttribute('data-theme-mode', 'system');
    await expect(controls.first()).toHaveAccessibleName('Toggle color theme');
    await expect(controls.first()).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.theme-toggle__mode')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => page.evaluate(() => window.__tmThemeEvents)).toEqual([{ requested: 'system', resolved: 'dark' }]);
    await page.evaluate(() => {
      const clone = document.querySelector('[data-theme-toggle]')?.cloneNode(true);
      document.body.append(clone);
    });
    const clonedControl = controls.nth(1);
    await expect(controls).toHaveCount(2);
    await clonedControl.click({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'light');
    await expect(clonedControl).toHaveAttribute('data-theme-mode', 'light');
    await expect(clonedControl).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => window.__tmThemeEvents)).toEqual([
      { requested: 'system', resolved: 'dark' },
      { requested: 'light', resolved: 'light' },
    ]);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm-theme'))).toBe('light');
    await controls.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'dark');
    await controls.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'system');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.evaluate(() => window.__tmThemeEvents.at(-1))).toEqual({ requested: 'system', resolved: 'light' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('persists an explicit requested mode and emits one resolution event after reload @wp10-foundation', async ({ page }) => {
    await page.addInitScript(() => {
      window.__tmThemeEvents = [];
      window.addEventListener('tm-themechange', (event) => window.__tmThemeEvents.push(event.detail));
    });
    await page.goto('/en/');
    const toggle = page.locator('[data-theme-toggle]');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'light');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm-theme'))).toBe('light');
    await expect.poll(() => page.evaluate(() => window.__tmThemeEvents)).toEqual([
      { requested: 'system', resolved: 'light' },
      { requested: 'light', resolved: 'light' },
    ]);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.evaluate(() => window.__tmThemeEvents)).toEqual([
      { requested: 'light', resolved: 'light' },
    ]);
  });
});
