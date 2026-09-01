import { expect, test } from '@playwright/test';

import {
  STAGING_API_PROBES,
  STAGING_SITE_ROUTES,
  acceptsStatus,
  buildStagingApiUrl,
  isSameOriginStaging,
  resolveStagingSmokeConfig,
} from '../../src/test-harness/staging-smoke';

const config = resolveStagingSmokeConfig();

test.describe('PUBLIC-320 integrated staging smoke @smoke @staging', () => {
  test.skip(!config.ready, config.skipReason ?? 'staging not configured');

  if (!config.ready) {
    test('PUBLIC-320 staging env missing @smoke', () => {
      // Vitest scaffold covers wiring; this file stays importable when staging is unset.
    });
    return;
  }

  const readyConfig = config;

  for (const probe of STAGING_API_PROBES) {
    test(`PUBLIC-320 API ${probe.id} @smoke`, async ({ request }) => {
      const response = await request.get(buildStagingApiUrl(readyConfig, probe.path));
      expect(
        acceptsStatus(response.status(), probe.expectStatus),
        `${probe.id} status`,
      ).toBe(true);

      if (response.status() === 200 && probe.path.startsWith('/api/')) {
        expect(response.headers()['content-type'] ?? '').toMatch(/application\/json/i);
      }
    });
  }

  for (const route of STAGING_SITE_ROUTES) {
    test(`PUBLIC-320 site ${route.id} @smoke`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.ok(), `${route.id} HTTP status`).toBeTruthy();

      if (route.locale) {
        await expect(page.locator('html')).toHaveAttribute('lang', route.locale);
      }

      if (route.path === '/') {
        await expect(page.getByRole('navigation', { name: 'Language selection' })).toBeVisible();
        return;
      }

      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
  }

  test('PUBLIC-320 same-origin /api proxy from browser @smoke', async ({ page }) => {
    test.skip(
      !isSameOriginStaging(readyConfig),
      'Same-origin proxy check applies only when PUBLIC_STAGING_API_BASE_URL is empty',
    );

    await page.goto('/en/');
    const response = await page.request.get('/api/site');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type'] ?? '').toMatch(/application\/json/i);
  });
});
