import { expect, test } from '@playwright/test';

test.describe('WP-40 gateway reconstruction', () => {
  test('WP-40 gateway: serves promoted theme media without any direct /media/ URL', async ({ page }) => {
    const mediaResponses: string[] = [];
    page.on('response', (response) => {
      if (/\/media\/(art|brand|icons)\//.test(new URL(response.url()).pathname)) {
        mediaResponses.push(response.url());
      }
    });

    await page.goto('/');
    const html = await page.content();

    expect(html).not.toMatch(/src="\/media\//);
    expect(html).not.toMatch(/srcset="[^"]*\/media\//);
    expect(mediaResponses).toEqual([]);
  });

  test('WP-40 gateway: mounts exactly one centered-portal theme variant on first load', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tm-theme', 'light'));
    const requested: string[] = [];
    page.on('request', (request) => {
      if (/portal-centered-(light|dark)/.test(request.url())) {
        requested.push(request.url());
      }
    });

    await page.goto('/');
    await expect.poll(() => requested.length).toBeGreaterThanOrEqual(1);

    for (const variant of ['portal-centered-light', 'portal-centered-dark']) {
      const variantRequests = requested.filter((url) => url.includes(variant));
      expect(variantRequests.length, `${variant} download count`).toBeLessThanOrEqual(1);
    }

    const root = page.locator('[data-theme-picture]');
    await expect(root).toHaveAttribute('data-active-theme', 'light');
    await expect(root.locator('[data-theme-picture-mount] img')).toHaveCount(1);
  });

  test('WP-40 gateway: renders the accurate 1672x941 source ratio for the atmosphere', async ({ page }) => {
    await page.goto('/');
    const image = page.locator('[data-theme-picture-mount] img').first();
    await expect(image).toHaveAttribute('width', '1672');
    await expect(image).toHaveAttribute('height', '941');
  });

  test('WP-40 gateway: keeps semantic language selection and a single accessible page name', async ({ page }) => {
    await page.goto('/');

    const headings = page.getByRole('heading', { level: 1 });
    await expect(headings).toHaveCount(1);
    await expect(headings.first()).toHaveAccessibleName(/Taha\s+Mohammadi/);

    const nav = page.getByRole('navigation', { name: 'Language selection' });
    await expect(nav.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/');
    await expect(nav.getByRole('link', { name: 'فارسی' })).toHaveAttribute('href', '/fa/');
  });

  test('WP-40 gateway: keeps the gateway free of horizontal overflow with keyboard-visible focus', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-theme-toggle]')).toBeFocused();
    await expect(page.locator('[data-theme-toggle]')).toHaveCSS('outline-style', 'solid');

    await page.getByRole('link', { name: 'English' }).focus();
    await expect(page.getByRole('link', { name: 'English' })).toHaveCSS('outline-style', 'solid');
  });

  test('WP-40 gateway: preserves the portal atmosphere across the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const atmosphere = await page.locator('.gw__atmosphere-img').boundingBox();
    expect(atmosphere).not.toBeNull();
    expect(atmosphere?.height ?? 0).toBeGreaterThanOrEqual(844);
  });
});
