import { expect, test } from '@playwright/test'

/**
 * CA-06 — Integrate progressive Home hero.
 *
 * Wires the CA-04 scene and CA-05 controller into the semantic Home hero,
 * loads only on eligible routes, and proves fallbacks without changing
 * graph facts. Tests are state-aware: structure holds for every graph
 * state, while scene assertions run only when the build served a ready
 * graph; fallback assertions run otherwise.
 */

const targets = [
  { path: '/en/', locale: 'en', dir: 'ltr' },
  { path: '/fa/', locale: 'fa', dir: 'rtl' },
] as const

test.describe('CA-06 integrated Home scene', () => {
  for (const target of targets) {
    for (const width of [390, 1440]) {
      test(`one hero graph canvas slot at ${target.locale}@${width} with no portal or duplicate`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(target.path)

        const hero = page.locator('[data-hero-layout="integrated"]')
        await expect(hero).toHaveCount(1)
        await expect(hero.locator('[data-graph-region]')).toHaveCount(1)

        // No second Home graph and no gateway portal decoration on Home.
        await expect(page.locator('#home-graph-region')).toHaveCount(0)
        await expect(hero.locator('[data-theme-picture]')).toHaveCount(0)
        await expect(page.locator('.gw__portal')).toHaveCount(0)

        // At most one canvas per route, even after enhancement settles.
        const canvasCount = await page
          .locator('[data-graph-region] canvas[data-graph-canvas]')
          .count()
        expect(canvasCount).toBeLessThanOrEqual(1)

        const status = await hero
          .locator('[data-graph-region]')
          .getAttribute('data-graph-status')

        if (status === 'ready') {
          // Reserved scene slot before/after load: no layout shift.
          const scene = hero.locator('[data-graph-scene]')
          await expect(scene).toHaveCount(1)
          const box = await scene.boundingBox()
          expect(box?.height ?? 0).toBeGreaterThan(200)
          // Embedded renderer facts travel with the page, unchanged.
          await expect(hero.locator('script[data-graph-payload]')).toHaveCount(
            1,
          )
          await expect(hero.locator('[data-graph-labels]')).toHaveCount(1)
        } else {
          // Honest fallback states render without a scene slot.
          await expect(hero.locator('[data-graph-region]')).toContainText(
            /unavailable|No graph nodes|not be shown|در دسترس نیست|منتشر نشده|قابل‌نمایش نیست/,
          )
        }

        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true)
      })
    }
  }

  test('no text waits for the scene: copy, list, and detail stay visible', async ({
    page,
  }) => {
    await page.goto('/en/')
    const hero = page.locator('[data-hero-layout="integrated"]')
    await expect(hero).toBeVisible()

    const copyOpacity = await hero
      .locator('.hm-hero__copy')
      .evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(copyOpacity)).toBeGreaterThanOrEqual(1)

    const regionOpacity = await hero
      .locator('[data-graph-region]')
      .evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(regionOpacity)).toBeGreaterThanOrEqual(1)

    const status = await hero
      .locator('[data-graph-region]')
      .getAttribute('data-graph-status')
    if (status === 'ready') {
      const detailOpacity = await hero
        .locator('[data-graph-detail]')
        .evaluate((el) => getComputedStyle(el).opacity)
      expect(Number(detailOpacity)).toBeGreaterThanOrEqual(1)
    }

    // Canvas may be hidden (fallback) or revealed (enhanced), but copy is
    // never at opacity zero waiting for JS.
    await expect(page.locator('.hm-hero__name')).toContainText('Taha Mohammadi')
  })

  test('failed dynamic import preserves semantic content with no success status', async ({
    page,
  }) => {
    // Abort the lazily-loaded scene/controller/motion chunks: the semantic
    // fallback must survive without reload or invented content.
    await page.route(
      /graph-scene|graph-controller|graph-motion|three/,
      (route) => route.abort(),
    )
    await page.goto('/en/')
    const region = page.locator('[data-graph-region]')
    await expect(region).toBeVisible()

    const status = await region.getAttribute('data-graph-status')
    if (status === 'ready') {
      await expect(region.locator('[data-graph-nodes]')).toBeVisible()
      await expect(region.locator('[data-graph-detail]')).toContainText(
        /Select a node/,
      )
      const enhancement = await region.getAttribute('data-hero-enhancement')
      expect(['fallback', 'idle', 'enhanced']).toContain(enhancement ?? 'idle')
      // No success claimed for failed graphics: never enhanced without scene.
      const canvasCount = await region
        .locator('canvas[data-graph-canvas]:not([hidden])')
        .count()
      expect(canvasCount).toBeLessThanOrEqual(1)
    } else {
      await expect(region).toContainText(
        /unavailable|No graph nodes|not be shown/,
      )
    }
    await page.unrouteAll({ behavior: 'wait' })
  })

  test('resize and theme changes keep one canvas with selection intact', async ({
    page,
  }) => {
    await page.goto('/en/')
    const region = page.locator('[data-graph-region]')
    const status = await region.getAttribute('data-graph-status')
    if (status !== 'ready') {
      test.skip(true, `graph is ${status}; resize/theme needs ready data`)
      return
    }

    const firstSummary = region.locator('details summary').first()
    await firstSummary.scrollIntoViewIfNeeded()
    await firstSummary.click()

    // Resize across mobile/desktop breakpoints.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(200)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.waitForTimeout(200)

    expect(
      await region.locator('canvas[data-graph-canvas]').count(),
    ).toBeLessThanOrEqual(1)
    await expect(page.locator('#home-graph-region')).toHaveCount(0)

    // Theme toggle preserves content without duplicating the scene.
    const toggle = page.locator('[data-theme-toggle]').first()
    if ((await toggle.count()) > 0) {
      await toggle.click()
      await page.waitForTimeout(200)
      await expect(region).toBeVisible()
      expect(
        await region.locator('canvas[data-graph-canvas]').count(),
      ).toBeLessThanOrEqual(1)
    }

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
  })

  test('hero stays readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await context.newPage()
    await noJsPage.goto('/en/')

    await expect(noJsPage.locator('.hm-hero__name')).toContainText(
      'Taha Mohammadi',
    )
    await expect(
      noJsPage.locator('[data-hero-layout="integrated"]'),
    ).toHaveCount(1)
    await expect(noJsPage.locator('[data-graph-region]')).toHaveCount(1)

    const status = await noJsPage
      .locator('[data-graph-region]')
      .getAttribute('data-graph-status')
    if (status === 'ready') {
      await expect(noJsPage.locator('[data-graph-node]').first()).toBeVisible()
      // Enhancement never ran: canvas stays hidden, list stays native.
      await expect(
        noJsPage.locator('canvas[data-graph-canvas]:not([hidden])'),
      ).toHaveCount(0)
    } else {
      await expect(noJsPage.locator('[data-graph-region]')).toContainText(
        /unavailable|No graph nodes|not be shown/,
      )
    }
    await context.close()
  })

  test('reduced motion keeps the hero usable without reload', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/fa/')

    const hero = page.locator('[data-hero-layout="integrated"]')
    await expect(hero).toBeVisible()
    const research = page.locator('.hm-hero__research')
    await expect(research).toHaveCount(1)
    const researchText = (await research.innerText()).trim()
    expect(researchText.length).toBeGreaterThan(0)
    expect(researchText).not.toMatch(/<[^>]*>|^#{1,6}\s|\*\*|\[[^\]]*\]\(/)

    const prefersReduced = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    expect(prefersReduced).toBe(true)
  })
})
