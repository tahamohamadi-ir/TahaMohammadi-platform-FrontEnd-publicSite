import { expect, test } from '@playwright/test';

const ATMOSPHERE_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1672];
const GRAPH_WIDTHS = [320, 480, 640, 768, 1024];

async function settleLazyMedia(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.querySelectorAll('img')].map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
            if (img.complete) resolve();
          }),
      ),
    );
  });
}

function requestedCount(requested: string[], variant: string) {
  return requested.filter((url) => url.includes(variant)).length;
}

function expectSingleThemeVariant(
  requested: string[],
  prefix: 'portal-centered' | 'portal-orbit' | 'home-graph-backplate',
  theme: 'light' | 'dark',
) {
  for (const variant of [`${prefix}-light`, `${prefix}-dark`]) {
    expect(requestedCount(requested, variant), `${prefix} ${variant} download count`).toBeLessThanOrEqual(1);
  }
  expect(requestedCount(requested, `${prefix}-${theme}`), `${prefix} ${theme} variant requested`).toBe(1);
  const inactive = theme === 'light' ? 'dark' : 'light';
  expect(requestedCount(requested, `${prefix}-${inactive}`), `${prefix} ${inactive} variant skipped`).toBe(0);
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
}

async function resetCaptureToTop(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}

async function selectedPictureSource(
  page: import('@playwright/test').Page,
  selector: string,
) {
  const locator = page.locator(selector);
  await locator.evaluate((element: HTMLImageElement) => element.scrollIntoView({ block: 'center' }));
  await expect
    .poll(() => locator.evaluate((element: HTMLImageElement) => element.currentSrc))
    .not.toBe('');
  return locator.evaluate((element: HTMLImageElement) => {
    const picture = element.closest('picture');
    const sets = [element.getAttribute('srcset') ?? ''];
    if (picture) {
      for (const source of picture.querySelectorAll('source')) {
        sets.push(source.getAttribute('srcset') ?? '');
      }
    }
    const widthByCandidate = new Map<string, number>();
    for (const set of sets) {
      for (const entry of set.split(',')) {
        const parts = entry.trim().split(/\s+/);
        if (parts.length >= 2 && parts[1].endsWith('w') && parts[0]) {
          widthByCandidate.set(new URL(parts[0], location.href).href, Number(parts[1].replace('w', '')));
        }
      }
    }
    return {
      currentSrc: element.currentSrc,
      width: widthByCandidate.get(element.currentSrc) ?? null,
      format: element.currentSrc.includes('f=avif') || element.currentSrc.endsWith('.avif') ? 'avif' : '',
    };
  });
}

test.describe('WP-40 release evidence', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`gateway ${theme}@${viewport.width}: overflow, focus, one theme media variant, capture`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.addInitScript((requested) => localStorage.setItem('tm-theme', requested), theme);
        await page.setViewportSize(viewport);

        const requested: string[] = [];
        page.on('request', (request) => requested.push(request.url()));

        await page.goto('/');
        await settleLazyMedia(page);
        await expectNoHorizontalOverflow(page);

        await page.keyboard.press('Tab');
        await expect(page.locator('[data-theme-toggle]')).toBeFocused();
        await expect(page.locator('[data-theme-toggle]')).toHaveCSS('outline-style', 'solid');

        expectSingleThemeVariant(requested, 'portal-centered', theme);

        const atmosphere = await selectedPictureSource(page, '[data-theme-picture-mount] img');
        expect(atmosphere.format).toBe('avif');
        expect(ATMOSPHERE_WIDTHS).toContain(atmosphere.width);
        if (viewport.width === 390) {
          expect(atmosphere.width ?? 0).toBeLessThanOrEqual(768);
        }

        await page.screenshot({
          path: `test-results/visual/wp40-gateway-${viewport.width}-${theme}.png`,
          fullPage: true,
        });
      });

      if (viewport.width === 1440) {
        test(`home en ${theme}@1440: overflow, focus, one theme media variant, capture`, async ({ page }) => {
          test.setTimeout(120_000);
          await page.addInitScript((requested) => localStorage.setItem('tm-theme', requested), theme);
          await page.setViewportSize(viewport);

          const requested: string[] = [];
          page.on('request', (request) => requested.push(request.url()));

          await page.goto('/en/');
          await settleLazyMedia(page);
          await expectNoHorizontalOverflow(page);

          await page.keyboard.press('Tab');
          await expect(page.locator('.skip-link')).toBeFocused();
          await expect(page.locator('.skip-link')).toHaveCSS('outline-style', 'solid');

          expectSingleThemeVariant(requested, 'portal-orbit', theme);
          expectSingleThemeVariant(requested, 'home-graph-backplate', theme);

          const hero = await selectedPictureSource(page, '.hm-hero__atmosphere-img');
          expect(hero.format).toBe('avif');
          expect(ATMOSPHERE_WIDTHS).toContain(hero.width);

          const backplate = await selectedPictureSource(page, '.hm-graph__backplate-img');
          expect(backplate.format).toBe('avif');
          expect(GRAPH_WIDTHS).toContain(backplate.width);
          await resetCaptureToTop(page);

          await page.screenshot({
            path: `test-results/visual/wp40-home-en-1440-${theme}.png`,
            fullPage: true,
          });
        });
      }

      if (viewport.width === 390) {
        test(`home fa ${theme}@390: overflow, focus, one theme media variant, capture`, async ({ page }) => {
          test.setTimeout(120_000);
          await page.addInitScript((requested) => localStorage.setItem('tm-theme', requested), theme);
          await page.setViewportSize(viewport);

          const requested: string[] = [];
          page.on('request', (request) => requested.push(request.url()));

          await page.goto('/fa/');
          await settleLazyMedia(page);
          await expectNoHorizontalOverflow(page);

          await page.keyboard.press('Tab');
          await expect(page.locator('.skip-link')).toBeFocused();
          await expect(page.locator('.skip-link')).toHaveCSS('outline-style', 'solid');

          expectSingleThemeVariant(requested, 'portal-orbit', theme);
          expectSingleThemeVariant(requested, 'home-graph-backplate', theme);

          const hero = await selectedPictureSource(page, '.hm-hero__atmosphere-img');
          expect(hero.format).toBe('avif');
          expect(ATMOSPHERE_WIDTHS).toContain(hero.width);
          expect(hero.width ?? 0).toBeLessThanOrEqual(768);

          const backplate = await selectedPictureSource(page, '.hm-graph__backplate-img');
          expect(backplate.format).toBe('avif');
          expect(GRAPH_WIDTHS).toContain(backplate.width);
          await resetCaptureToTop(page);

          await page.screenshot({
            path: `test-results/visual/wp40-home-fa-390-${theme}.png`,
            fullPage: true,
          });
        });
      }
    }
  }
});
