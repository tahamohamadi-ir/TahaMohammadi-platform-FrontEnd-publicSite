import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { installWebVitalsCollector, readWebVitals, waitForInteractionTiming } from '../../src/test-harness/collect-web-vitals';
import {
  LOCALE_FONT_PRELOADS,
  PERFORMANCE_BUDGET,
  PERFORMANCE_PROBE_ROUTES,
} from '../../src/test-harness/performance-budget';

const evidenceOutputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/performance');

test.describe('PUBLIC-290 performance budget', () => {
  for (const route of PERFORMANCE_PROBE_ROUTES) {
    test(`PUBLIC-290 ${route.label} LCP/CLS within local budget @performance`, async ({ page }) => {
      test.setTimeout(120_000);
      await installWebVitalsCollector(page);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route.path);

      await expect(page.locator('html')).toHaveAttribute('lang', route.locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

      const vitals = await readWebVitals(page);

      expect(vitals.lcpMs, `${route.id} LCP missing`).not.toBeNull();
      expect(vitals.lcpMs!, `${route.id} LCP`).toBeLessThanOrEqual(PERFORMANCE_BUDGET.lcpMs);
      expect(vitals.cls, `${route.id} CLS`).toBeLessThanOrEqual(PERFORMANCE_BUDGET.cls);

      await test.info().attach(`${route.id}-vitals.json`, {
        body: JSON.stringify(
          {
            route: route.path,
            locale: route.locale,
            lcpMs: vitals.lcpMs,
            cls: vitals.cls,
            budget: PERFORMANCE_BUDGET,
            environment: 'local static preview (Playwright build + serve-dist)',
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }

  test('PUBLIC-290 locale font preloads match BaseLayout body/display faces @performance', async ({ page }) => {
    for (const locale of ['en', 'fa'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/fa/');
      const hrefs = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter(Boolean),
      );

      expect(hrefs, `${locale} preload count`).toHaveLength(LOCALE_FONT_PRELOADS[locale].length);
      for (const expected of LOCALE_FONT_PRELOADS[locale]) {
        expect(hrefs, `${locale} preload href`).toContain(expected);
      }

      for (const href of hrefs) {
        const response = await page.request.get(href!);
        expect(response.ok(), `${locale} font asset ${href}`).toBeTruthy();
        expect(response.headers()['content-type']).toMatch(/font|woff2|octet-stream/i);
      }
    }
  });

  test('PUBLIC-290 bundled CSS retains font-display swap @performance', async ({ page }) => {
    await page.goto('/en/');
    const hasFontSwap = await page.evaluate(async () => {
      const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map((link) => link.getAttribute('href'))
        .filter(Boolean) as string[];
      const texts = await Promise.all(hrefs.map((href) => fetch(href).then((response) => response.text())));
      return texts.some((text) => /font-display\s*:\s*swap/.test(text));
    });

    expect(hasFontSwap).toBe(true);

    await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable|system-ui/);
  });
});



  test('PUBLIC-290 home EN theme toggle INP within local budget @performance', async ({ page }) => {
    test.setTimeout(120_000);
    await installWebVitalsCollector(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/');

    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await waitForInteractionTiming(page);

    const vitals = await readWebVitals(page);

    expect(vitals.inpMs, 'home-en theme toggle INP missing').not.toBeNull();
    expect(vitals.inpMs!, 'home-en theme toggle INP').toBeLessThanOrEqual(PERFORMANCE_BUDGET.inpMs);

    await test.info().attach('home-en-theme-toggle-inp.json', {
      body: JSON.stringify(
        {
          route: '/en/',
          interaction: 'theme-toggle',
          inpMs: vitals.inpMs,
          budgetInpMs: PERFORMANCE_BUDGET.inpMs,
          environment: 'local static preview (Playwright build + serve-dist)',
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });


test.afterAll(() => {
  void evidenceOutputDir;
});
