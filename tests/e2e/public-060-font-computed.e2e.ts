import { expect, test } from '@playwright/test';
import { FONT_COMPUTED_PROBE_ROUTES, LOCALE_FONT_STACKS } from '../../src/test-harness/font-tokens';

test.describe('PUBLIC-060 locale font computed styles', () => {
  for (const route of FONT_COMPUTED_PROBE_ROUTES) {
    test(`PUBLIC-060 ${route.label} body and display fonts match locale tokens @foundation`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page.locator('html')).toHaveAttribute('lang', route.locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

      const stack = LOCALE_FONT_STACKS[route.locale];
      await expect(page.locator('body')).toHaveCSS('font-family', stack.body.computedPattern);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', stack.display.computedPattern);
    });
  }

  test('PUBLIC-060 html locale tokens expose --font-display and --font-body per FONT-ACQUISITION-PLAN @foundation', async ({
    page,
  }) => {
    for (const locale of ['en', 'fa'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/fa/');
      const stack = LOCALE_FONT_STACKS[locale];

      const tokens = await page.evaluate((loc) => {
        const style = getComputedStyle(document.documentElement);
        return {
          display: style.getPropertyValue('--font-display').trim(),
          body: style.getPropertyValue('--font-body').trim(),
          displayLocale: style.getPropertyValue(`--font-display-${loc}`).trim(),
          bodyLocale: style.getPropertyValue(`--font-body-${loc}`).trim(),
        };
      }, locale);

      expect(tokens.displayLocale).toContain(stack.display.primary);
      expect(tokens.bodyLocale).toContain(stack.body.primary);
      expect(tokens.display).toContain(stack.display.primary);
      expect(tokens.body).toContain(stack.body.primary);
    }
  });

  test('PUBLIC-060 retains locale font stacks at 200% root font size @foundation', async ({ page }) => {
    await page.goto('/fa/');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    const stack = LOCALE_FONT_STACKS.fa;
    await expect(page.locator('body')).toHaveCSS('font-family', stack.body.computedPattern);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', stack.display.computedPattern);
  });
});
