import { expect, test, type Locator } from '@playwright/test';

const ATMOSPHERE_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1672];
const GRAPH_WIDTHS = [320, 480, 640, 768, 1024];
const PREVIEW_WIDTHS = [320, 480, 640, 800, 1024];

async function loadedSelection(locator: Locator) {
  await locator.evaluate((element: HTMLImageElement) => element.scrollIntoView({ block: 'center' }));
  await expect
    .poll(() => locator.evaluate((element: HTMLImageElement) => element.currentSrc))
    .not.toBe('');
  return locator.evaluate((element: HTMLImageElement) => {
    const image = element;
    // The selected candidate can come from any <source> in the <picture>;
    // collect width descriptors from the img and every source srcset.
    const picture = image.closest('picture');
    const sets = [image.getAttribute('srcset') ?? ''];
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
    const width = widthByCandidate.get(image.currentSrc) ?? null;
    const format =
      image.currentSrc.includes('f=avif') || image.currentSrc.endsWith('.avif')
        ? 'avif'
        : (image.currentSrc.split('.').pop() ?? '');
    return { currentSrc: image.currentSrc, width, format };
  });
}

test.describe('WP-40 theme media selection', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`WP-40 home media: downloads only the ${theme} variant per slot and selects AVIF at a suitable width`, async ({ page }) => {
      await page.addInitScript((requestedTheme) => localStorage.setItem('tm-theme', requestedTheme), theme);
      await page.setViewportSize({ width: 1440, height: 900 });

      const requested: string[] = [];
      page.on('request', (request) => requested.push(request.url()));

      await page.goto('/en/');
      await expect(page.locator('[data-theme-picture-mount] img').first()).toBeVisible();

      for (const [slot, variants] of [
        ['hero atmosphere', ['portal-orbit-light', 'portal-orbit-dark']],
        ['graph backplate', ['home-graph-backplate-light', 'home-graph-backplate-dark']],
      ] as const) {
        for (const variant of variants) {
          const downloads = requested.filter((url) => url.includes(variant));
          expect(downloads.length, `${slot} ${variant} download count`).toBeLessThanOrEqual(1);
        }
        const resolved = variants.find((variant) => variant.includes(`-${theme}`));
        expect(requested.some((url) => url.includes(resolved!)), `${slot} ${theme} variant requested`).toBe(true);
      }

      const hero = await loadedSelection(page.locator('.hm-hero__atmosphere-img'));
      expect(hero.format).toBe('avif');
      expect(ATMOSPHERE_WIDTHS).toContain(hero.width);

      const backplate = await loadedSelection(page.locator('.hm-graph__backplate-img'));
      expect(backplate.format).toBe('avif');
      expect(GRAPH_WIDTHS).toContain(backplate.width);
    });
  }

  test('WP-40 FA mobile selects one theme variant per slot with AVIF at mobile widths and visible focus', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tm-theme', 'dark'));
    await page.setViewportSize({ width: 390, height: 844 });

    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));

    await page.goto('/fa/');
    await expect(page.locator('.hm-hero__atmosphere-img')).toBeVisible();

    // RTL keyboard parity first: from a fresh page, Tab reaches the skip link
    // with a visible outline. (Scrolling first would move the browser's
    // sequential-focus starting point and defeat the check.)
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    for (const [slot, variants] of [
      ['hero atmosphere', ['portal-orbit-light', 'portal-orbit-dark']],
      ['graph backplate', ['home-graph-backplate-light', 'home-graph-backplate-dark']],
    ] as const) {
      for (const variant of variants) {
        expect(
          requested.filter((url) => url.includes(variant)).length,
          `${slot} ${variant} download count`,
        ).toBeLessThanOrEqual(1);
      }
      const resolved = variants.find((variant) => variant.endsWith('-dark'));
      expect(requested.some((url) => url.includes(resolved!)), `${slot} dark variant requested`).toBe(true);
    }

    const hero = await loadedSelection(page.locator('.hm-hero__atmosphere-img'));
    expect(hero.format).toBe('avif');
    expect(ATMOSPHERE_WIDTHS).toContain(hero.width);
    expect(hero.width ?? 0).toBeLessThanOrEqual(768);

    const backplate = await loadedSelection(page.locator('.hm-graph__backplate-img'));
    expect(backplate.format).toBe('avif');
    expect(GRAPH_WIDTHS).toContain(backplate.width);
  });

  test('WP-40 project previews use mapped assets at preview widths and no raw /media/ art is fetched', async ({ page }) => {
    const mediaRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/media\/(art|brand|icons)\//.test(new URL(request.url()).pathname)) {
        mediaRequests.push(request.url());
      }
    });

    await page.goto('/en/');
    await expect(page.locator('.hm-projects__image')).toHaveCount(2);

    const previewLocators = await page.locator('.hm-projects__image').all();
    const previews: Awaited<ReturnType<typeof loadedSelection>>[] = [];
    for (const preview of previewLocators) {
      previews.push(await loadedSelection(preview));
    }
    expect(previews.length).toBe(2);
    for (const preview of previews) {
      expect(preview.format).toBe('avif');
      expect(PREVIEW_WIDTHS).toContain(preview.width);
    }

    for (const asset of ['project-data-architecture', 'project-dashboard-systems', 'blog-coral-stairs', 'learning-sage-library', 'gallery-ivory-forms']) {
      expect(
        await page.locator(`img[srcset*="${asset}"], img[src*="${asset}"]`).count(),
      ).toBeGreaterThanOrEqual(1);
    }

    // Page-owned art must never be served from the legacy /media/ proxy.
    // (Shared shell chrome may still fetch /media/brand until its own migration.)
    expect(mediaRequests.filter((url) => /\/media\/art\//.test(url))).toEqual([]);
    const ownedRawMedia = await page.evaluate(() =>
      [...document.querySelectorAll('main img, [data-theme-picture] img')]
        .filter((img) => /\/media\//.test(img.getAttribute('src') ?? ''))
        .map((img) => img.outerHTML),
    );
    expect(ownedRawMedia).toEqual([]);
  });
});
