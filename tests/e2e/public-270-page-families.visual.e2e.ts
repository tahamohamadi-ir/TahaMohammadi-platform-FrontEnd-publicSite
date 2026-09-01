import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { PUBLIC_270_CAPTURE_WIDTHS } from '../../src/test-harness/responsive-matrix-widths';

const visualOutputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/visual');

test.beforeAll(() => {
  mkdirSync(visualOutputDir, { recursive: true });
});

type PageFamilyCapture = {
  id: string;
  pf: string;
  path: string;
  theme: 'light' | 'dark';
  locale?: 'en' | 'fa';
  dir?: 'ltr' | 'rtl';
};

const widths = PUBLIC_270_CAPTURE_WIDTHS;

const indexCaptures: PageFamilyCapture[] = [
  { id: 'pf01', pf: 'PF-01', path: '/en/creative/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf01', pf: 'PF-01', path: '/fa/creative/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf03', pf: 'PF-03', path: '/en/writing/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf03', pf: 'PF-03', path: '/fa/writing/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf04', pf: 'PF-04', path: '/en/projects/', theme: 'dark', locale: 'en', dir: 'ltr' },
  { id: 'pf04', pf: 'PF-04', path: '/fa/projects/', theme: 'dark', locale: 'fa', dir: 'rtl' },
  { id: 'pf05-research', pf: 'PF-05', path: '/en/research/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf05-research', pf: 'PF-05', path: '/fa/research/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf05-publications', pf: 'PF-05', path: '/en/publications/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf05-publications', pf: 'PF-05', path: '/fa/publications/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf06', pf: 'PF-06', path: '/en/teaching/', theme: 'dark', locale: 'en', dir: 'ltr' },
  { id: 'pf06', pf: 'PF-06', path: '/fa/teaching/', theme: 'dark', locale: 'fa', dir: 'rtl' },
  { id: 'pf07-about', pf: 'PF-07', path: '/en/about/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf07-about', pf: 'PF-07', path: '/fa/about/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf07-cv', pf: 'PF-07', path: '/en/cv/', theme: 'light', locale: 'en', dir: 'ltr' },
  { id: 'pf07-cv', pf: 'PF-07', path: '/fa/cv/', theme: 'light', locale: 'fa', dir: 'rtl' },
  { id: 'pf08', pf: 'PF-08', path: '/en/contact/', theme: 'dark', locale: 'en', dir: 'ltr' },
  { id: 'pf08', pf: 'PF-08', path: '/fa/contact/', theme: 'dark', locale: 'fa', dir: 'rtl' },
];

test.describe('PUBLIC-270 page-family visual capture stubs', () => {
  for (const target of indexCaptures) {
    for (const width of widths) {
      test(`PUBLIC-270 ${target.pf} ${target.path}@${width} ${target.theme} @visual`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.addInitScript((theme) => localStorage.setItem('tm-theme', theme), target.theme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(target.path);

        if (target.locale) {
          await expect(page.locator('html')).toHaveAttribute('lang', target.locale);
          await expect(page.locator('html')).toHaveAttribute('dir', target.dir ?? 'ltr');
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', target.theme);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);

        const locale = target.locale ?? 'en';
        await page.screenshot({
          path: path.join(visualOutputDir, `public-270-${target.id}-${locale}-${width}-${target.theme}.png`),
          fullPage: true,
        });
      });
    }
  }

  test('PUBLIC-270 PF-02 creative detail capture when a detail route is built @visual', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const candidates = ['/en/creative/ivory-forms/', '/en/creative/'];
    let detailPath: string | null = null;

    for (const candidate of candidates) {
      const response = await page.goto(candidate);
      if (response?.ok() && candidate.endsWith('/') && candidate.split('/').filter(Boolean).length > 2) {
        detailPath = candidate;
        break;
      }
    }

    test.skip(!detailPath, 'No published creative detail route in static build; PF-02 detail evidence remains open.');

    for (const width of widths) {
      await page.addInitScript(() => localStorage.setItem('tm-theme', 'dark'));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(detailPath!);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.screenshot({
        path: path.join(visualOutputDir, `public-270-pf02-en-${width}-dark.png`),
        fullPage: true,
      });
    }

    expect(baseURL).toBeTruthy();
  });
});
