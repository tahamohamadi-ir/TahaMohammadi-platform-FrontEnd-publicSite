import type { Browser, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  NO_JS_AUDIT_ROUTES,
  getBrandName,
  getPrimaryNavLabel,
  getSearchTitle,
  type NoJsAuditRoute,
} from '../../src/test-harness/no-js-audit';

async function withNoJsPage(browser: Browser, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await run(page);
  } finally {
    await context.close();
  }
}

async function assertLocaleShell(page: Page, route: NoJsAuditRoute) {
  if (!route.locale || !route.dir) {
    throw new Error(`Route ${route.id} is missing locale metadata`);
  }

  await expect(page.locator('html')).toHaveAttribute('lang', route.locale);
  await expect(page.locator('html')).toHaveAttribute('dir', route.dir);
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();

  const desktopNav = page.locator('.site-header__nav--desktop');
  await expect(desktopNav).toBeVisible();

  const aboutLabel = getPrimaryNavLabel(route.locale, 'about');
  if (aboutLabel) {
    await expect(desktopNav.getByRole('link', { name: aboutLabel })).toBeVisible();
  }

  const mainText = await page.locator('#main-content').innerText();
  expect(mainText.trim().length, `${route.id} main content length`).toBeGreaterThan(20);
}

async function assertRouteReadable(page: Page, route: NoJsAuditRoute) {
  const response = await page.goto(route.path);
  expect(response?.ok(), `${route.id} HTTP status`).toBeTruthy();

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

  switch (route.profile) {
    case 'gateway':
      await expect(page.getByRole('navigation', { name: 'Language selection' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/');
      await expect(page.getByRole('link', { name: 'فارسی' })).toHaveAttribute('href', '/fa/');
      break;
    case 'home':
      await assertLocaleShell(page, route);
      await expect(page.locator('.hm-hero__lead h1')).toContainText(getBrandName(route.locale!));
      await expect(page.locator('.hm-graph__node-label')).toHaveCount(5);
      break;
    case 'locale-index':
      await assertLocaleShell(page, route);
      break;
    case 'search':
      await assertLocaleShell(page, route);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(getSearchTitle(route.locale!));
      await expect(page.locator('form[role="search"]')).toBeVisible();
      await expect(page.locator('input[name="q"]')).toBeVisible();
      break;
    default: {
      const _exhaustive: never = route.profile;
      throw new Error(`Unhandled profile: ${String(_exhaustive)}`);
    }
  }
}

test.describe('PUBLIC-300 no-JS crawl audit', () => {
  for (const route of NO_JS_AUDIT_ROUTES) {
    test(`PUBLIC-300 ${route.id} readable without JavaScript @nojs`, async ({ browser }) => {
      await withNoJsPage(browser, async (page) => {
        await assertRouteReadable(page, route);
      });
    });
  }
});
