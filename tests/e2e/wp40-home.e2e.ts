import { expect, test } from '@playwright/test';

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

test.describe('WP-40 home structure acceptance', () => {
  const pages = [
    { path: '/en/', locale: 'en', dir: 'ltr' },
    { path: '/fa/', locale: 'fa', dir: 'rtl' },
  ] as const;

  for (const target of pages) {
    for (const width of [1440, 390]) {
      test(`WP-40 home ${target.locale}@${width}: one H1, no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(target.path);

        await expect(page.locator('html')).toHaveAttribute('lang', target.locale);
        await expect(page.locator('html')).toHaveAttribute('dir', target.dir);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);
      });
    }
  }

  test('WP-40 home keyboard order keeps visible focus through hero controls', async ({ page }) => {
    await page.goto('/en/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    const heroChipList = page.locator('.hm-hero__focus-list');
    await expect(heroChipList).toBeInViewport();

    const themeToggle = page.locator('[data-theme-toggle]');
    await themeToggle.focus();
    await expect(themeToggle).toHaveCSS('outline-style', 'solid');

    const languageToggle = page.getByRole('link', { name: 'FA' });
    await languageToggle.focus();
    await expect(languageToggle).toHaveCSS('outline-style', 'solid');
  });

  test('WP-40 graph nodes carry the explicit non-interactive unavailable contract', async ({ page }) => {
    for (const path of ['/en/', '/fa/']) {
      await page.goto(path);
      const list = page.locator('[data-graph-state="unavailable-route"]');
      await expect(list).toHaveCount(1);
      await expect(list.locator('a')).toHaveCount(0);
      await expect(list.locator('[data-graph-node-state="unavailable"]')).toHaveCount(5);
      await expect(list.locator('[tabindex]')).toHaveCount(0);
      await expect(list.locator('.hm-graph__node-label').first()).toBeVisible();
    }
  });

  test('WP-40 home stays readable with images unavailable', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'image' ? route.abort() : route.continue(),
    );
    await page.goto('/en/');

    const nodes = page.locator('.hm-graph__node-label');
    await expect(nodes).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await expect(nodes.nth(index)).toBeVisible();
    }
    await expect(page.locator('.hm-hero__lead .ui-section-lead__title')).toContainText('Taha Mohammadi');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });

  test('WP-40 home stays readable with JavaScript disabled', async ({ page, browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    await noJsPage.goto('/en/');

    await expect(noJsPage.locator('.hm-hero__lead h1')).toContainText('Taha Mohammadi');
    await expect(noJsPage.locator('.hm-graph__node-label')).toHaveCount(5);
    await expect(noJsPage.locator('.hm-projects__image')).toHaveCount(2);
    await context.close();
  });

  test('WP-40 home and gateway capture 200% effective-width reflow evidence', async ({ page, browser }) => {
    test.setTimeout(120_000);
    // A 720 CSS-pixel viewport exercises the layout width produced by a
    // 1440px viewport at 200% browser zoom. This is automated reflow evidence,
    // not a substitute for the manual real-browser zoom acceptance check.
    const reflowContext = await browser.newContext({
      viewport: { width: 720, height: 810 },
    });
    const reflowPage = await reflowContext.newPage();

    const expectNoOverflow = () =>
      expect
        .poll(() => reflowPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);

    await reflowPage.goto('/en/');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-home-en-200pct-light.png', fullPage: true });

    await reflowPage.evaluate(() => window.__tmApplyTheme('dark'));
    await expect(reflowPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-home-en-200pct-dark.png', fullPage: true });

    await reflowPage.goto('/fa/');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-home-fa-200pct-light.png', fullPage: true });

    await reflowPage.evaluate(() => window.__tmApplyTheme('dark'));
    await expect(reflowPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-home-fa-200pct-dark.png', fullPage: true });

    await reflowPage.goto('/');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-gateway-200pct-light.png', fullPage: true });

    await reflowPage.evaluate(() => window.__tmApplyTheme('dark'));
    await expect(reflowPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settleLazyMedia(reflowPage);
    await expectNoOverflow();
    await reflowPage.screenshot({ path: 'test-results/visual/wp40-gateway-200pct-dark.png', fullPage: true });

    await reflowContext.close();
  });

  test('WP-40 FA mobile keeps the 320 authority reflow floor clear in both themes', async ({ page }) => {
    test.setTimeout(120_000);
    for (const width of [320, 390]) {
      for (const theme of ['light', 'dark'] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((requested) => localStorage.setItem('tm-theme', requested), theme);
        await page.goto('/fa/');

        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      }
    }
  });

  test('WP-40 home captures 768 reflow evidence for both locales and themes', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/en/');
    await settleLazyMedia(page);
    await page.screenshot({ path: 'test-results/visual/wp40-home-en-768-light.png', fullPage: true });
    await page.evaluate(() => window.__tmApplyTheme('dark'));
    await page.screenshot({ path: 'test-results/visual/wp40-home-en-768-dark.png', fullPage: true });

    await page.goto('/fa/');
    await settleLazyMedia(page);
    await page.screenshot({ path: 'test-results/visual/wp40-home-fa-768-light.png', fullPage: true });
    await page.evaluate(() => window.__tmApplyTheme('dark'));
    await page.screenshot({ path: 'test-results/visual/wp40-home-fa-768-dark.png', fullPage: true });
  });

  test('WP-40 home keeps project and publication content readable at 768', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/en/');

    const hero = await page.locator('.hm-hero').boundingBox();
    const heroImage = await page.locator('.hm-hero__atmosphere-img').boundingBox();
    expect(hero).not.toBeNull();
    expect(heroImage).not.toBeNull();
    expect(heroImage?.height ?? 0).toBeGreaterThanOrEqual((hero?.height ?? 0) - 2);

    const projectTitles = await page.locator('.hm-projects__card .ui-featured-record__title').evaluateAll(
      (titles) => titles.map((title) => {
        const rect = title.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    expect(projectTitles).toHaveLength(2);
    for (const title of projectTitles) {
      expect(title.width).toBeGreaterThanOrEqual(240);
      expect(title.height).toBeLessThanOrEqual(120);
    }

    const publicationRows = await page.locator('.hm-publications__row').evaluateAll((rows) =>
      rows.map((row) => {
        const labels = row.querySelector('.ui-publication-row__labels')?.getBoundingClientRect();
        const citation = row.querySelector('.ui-publication-row__citation')?.getBoundingClientRect();
        return {
          labelsWidth: labels?.width ?? 0,
          separated: Boolean(labels && citation && (
            citation.top >= labels.bottom || citation.left >= labels.right
          )),
        };
      }),
    );
    expect(publicationRows).toHaveLength(2);
    for (const row of publicationRows) {
      expect(row.labelsWidth).toBeGreaterThan(0);
      expect(row.separated).toBe(true);
    }
  });
});
