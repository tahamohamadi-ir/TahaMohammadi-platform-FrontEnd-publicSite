import { expect, test, type Locator } from '@playwright/test'

const ATMOSPHERE_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1672]
const PREVIEW_WIDTHS = [320, 480, 640, 800, 1024]

async function loadedSelection(locator: Locator) {
  await locator.evaluate((element: HTMLImageElement) =>
    element.scrollIntoView({ block: 'center' }),
  )
  await expect
    .poll(() =>
      locator.evaluate((element: HTMLImageElement) => element.currentSrc),
    )
    .not.toBe('')
  return locator.evaluate((element: HTMLImageElement) => {
    const image = element
    // The selected candidate can come from any <source> in the <picture>;
    // collect width descriptors from the img and every source srcset.
    const picture = image.closest('picture')
    const sets = [image.getAttribute('srcset') ?? '']
    if (picture) {
      for (const source of picture.querySelectorAll('source')) {
        sets.push(source.getAttribute('srcset') ?? '')
      }
    }
    const widthByCandidate = new Map<string, number>()
    for (const set of sets) {
      for (const entry of set.split(',')) {
        const parts = entry.trim().split(/\s+/)
        if (parts.length >= 2 && parts[1].endsWith('w') && parts[0]) {
          widthByCandidate.set(
            new URL(parts[0], location.href).href,
            Number(parts[1].replace('w', '')),
          )
        }
      }
    }
    const width = widthByCandidate.get(image.currentSrc) ?? null
    const format =
      image.currentSrc.includes('f=avif') || image.currentSrc.endsWith('.avif')
        ? 'avif'
        : (image.currentSrc.split('.').pop() ?? '')
    return { currentSrc: image.currentSrc, width, format }
  })
}

test.describe('WP-40 theme media selection', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`WP-40 gateway portal media: downloads only the ${theme} variant and selects AVIF at a suitable width`, async ({
      page,
    }) => {
      await page.addInitScript(
        (requestedTheme) => localStorage.setItem('tm-theme', requestedTheme),
        theme,
      )
      await page.setViewportSize({ width: 1440, height: 900 })

      const requested: string[] = []
      page.on('request', (request) => requested.push(request.url()))

      await page.goto('/')
      const mount = page.locator('[data-theme-picture-mount] img').first()
      await expect(mount).toBeVisible()

      for (const [slot, variants] of [
        ['gateway portal', ['portal-centered-light', 'portal-centered-dark']],
      ] as const) {
        for (const variant of variants) {
          const downloads = requested.filter((url) => url.includes(variant))
          expect(
            downloads.length,
            `${slot} ${variant} download count`,
          ).toBeLessThanOrEqual(1)
        }
        const resolved = variants.find((variant) =>
          variant.includes(`-${theme}`),
        )
        expect(
          requested.some((url) => url.includes(resolved!)),
          `${slot} ${theme} variant requested`,
        ).toBe(true)
      }

      const hero = await loadedSelection(mount)
      expect(hero.format).toBe('avif')
      expect(ATMOSPHERE_WIDTHS).toContain(hero.width)
    })
  }

  test('WP-40 project previews use mapped assets at preview widths and no raw /media/ art is fetched', async ({
    page,
  }) => {
    const mediaRequests: string[] = []
    page.on('request', (request) => {
      if (
        /\/media\/(art|brand|icons)\//.test(new URL(request.url()).pathname)
      ) {
        mediaRequests.push(request.url())
      }
    })

    // Home renders project previews only when featured projects are selected.
    await page.goto('/en/')
    const previewLocators = await page.locator('.hm-projects__image').all()
    for (const preview of previewLocators) {
      const selection = await loadedSelection(preview)
      expect(selection.format).toBe('avif')
      expect(PREVIEW_WIDTHS).toContain(selection.width)
    }

    // The projects index always carries page-owned preview media.
    await page.goto('/en/projects/')
    const indexPreview = await loadedSelection(
      page.locator('.pf-index-hero__image').first(),
    )
    expect(indexPreview.format).toBe('avif')
    expect(PREVIEW_WIDTHS).toContain(indexPreview.width)
    expect(
      await page
        .locator(
          'img[srcset*="project-data-architecture"], img[src*="project-data-architecture"]',
        )
        .count(),
    ).toBeGreaterThanOrEqual(1)

    // Page-owned art and shell brand must never be served from the legacy /media/ proxy.
    expect(
      mediaRequests.filter((url) => /\/media\/(art|brand)\//.test(url)),
    ).toEqual([])
    const ownedRawMedia = await page.evaluate(() =>
      [...document.querySelectorAll('main img, [data-theme-picture] img')]
        .filter((img) => /\/media\//.test(img.getAttribute('src') ?? ''))
        .map((img) => img.outerHTML),
    )
    expect(ownedRawMedia).toEqual([])
  })
})
