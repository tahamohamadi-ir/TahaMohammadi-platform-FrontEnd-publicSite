import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { RESPONSIVE_MATRIX_WIDTHS } from '../../src/test-harness/responsive-matrix-widths';

const visualOutputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/visual');

test.beforeAll(() => {
  mkdirSync(visualOutputDir, { recursive: true });
});

/**
 * PUBLIC-280 scaffold: prove six-width capture harness on PF-01 before expanding
 * to the full PF-01..PF-08 matrix (follows PUBLIC-270 index route map).
 */
const scaffoldCaptures = [
  { id: 'pf01', pf: 'PF-01', path: '/en/creative/', theme: 'light' as const, locale: 'en' as const, dir: 'ltr' as const },
  { id: 'pf01', pf: 'PF-01', path: '/fa/creative/', theme: 'light' as const, locale: 'fa' as const, dir: 'rtl' as const },
] as const;

test.describe('PUBLIC-280 responsive matrix scaffold', () => {
  for (const target of scaffoldCaptures) {
    for (const width of RESPONSIVE_MATRIX_WIDTHS) {
      test(`PUBLIC-280 ${target.pf} ${target.path}@${width} ${target.theme} @visual`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.addInitScript((theme) => localStorage.setItem('tm-theme', theme), target.theme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(target.path);

        await expect(page.locator('html')).toHaveAttribute('lang', target.locale);
        await expect(page.locator('html')).toHaveAttribute('dir', target.dir);
        await expect(page.locator('html')).toHaveAttribute('data-theme', target.theme);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);

        await page.screenshot({
          path: path.join(
            visualOutputDir,
            `public-280-${target.id}-${target.locale}-${width}-${target.theme}.png`,
          ),
          fullPage: true,
        });
      });
    }
  }
});
