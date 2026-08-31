import { expect, test } from '@playwright/test';

const ATMOSPHERE_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1672];
const GRAPH_WIDTHS = [320, 480, 640, 768, 1024];
const PREVIEW_WIDTHS = [320, 480, 640, 800, 1024];

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

      const heroImage = page.locator('.hm-hero__atmosphere-img');
      const heroSrc = await heroImage.evaluate((element) => (element as HTMLImageElement).currentSrc);
      expect(heroSrc).toMatch(/f=avif/);
      const heroWidth = Number(new URL(heroSrc).searchParams.get('w'));
      expect(ATMOSPHERE_WIDTHS).toContain(heroWidth);

      const backplateImage = page.locator('.hm-graph__backplate-img');
      await backplateImage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await expect
        .poll(() => backplateImage.evaluate((element) => (element as HTMLImageElement).currentSrc))
        .not.toBe('');
      const backplateSrc = await backplateImage.evaluate((element) => (element as HTMLImageElement).currentSrc);
      expect(backplateSrc).toMatch(/f=avif/);
      const backplateWidth = Number(new URL(backplateSrc).searchParams.get('w'));
      expect(GRAPH_WIDTHS).toContain(backplateWidth);
    });
  }

  test('WP-40 project previews use mapped assets at preview widths and no raw /media/ URLs are fetched', async ({ page }) => {
    const mediaRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/media\/(art|brand|icons)\//.test(new URL(request.url()).pathname)) {
        mediaRequests.push(request.url());
      }
    });

    await page.goto('/en/');
    await expect(page.locator('.hm-projects__image')).toHaveCount(2);

    const previewLocators = await page.locator('.hm-projects__image').all();
    const previewSrcs: string[] = [];
    for (const preview of previewLocators) {
      await preview.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await expect
        .poll(() => preview.evaluate((element) => (element as HTMLImageElement).currentSrc))
        .not.toBe('');
      previewSrcs.push(await preview.evaluate((element) => (element as HTMLImageElement).currentSrc));
    }
    expect(previewSrcs.length).toBe(2);
    for (const src of previewSrcs) {
      expect(src).toMatch(/f=avif/);
      expect(PREVIEW_WIDTHS).toContain(Number(new URL(src).searchParams.get('w')));
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
