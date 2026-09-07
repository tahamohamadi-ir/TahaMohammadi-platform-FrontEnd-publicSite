import { expect, test } from '@playwright/test'

/**
 * CA-07 — Procedural gateway portal.
 *
 * The `/` language gateway renders one procedural Three.js arch/threshold
 * portal (geometry + GSAP, no raster-on-a-plane, no baked text) while HTML
 * language links and brand stay immediately usable. The approved
 * `portal-centered-*` raster remains the static fallback until the scene
 * succeeds; everything stays usable with JS disabled, reduced motion, or
 * unavailable WebGL.
 */

test.describe('CA-07 procedural gateway portal', () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`one procedural portal canvas at ${width}px with no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')

      const portal = page.locator('[data-gateway-portal]')
      await expect(portal).toHaveCount(1)
      await expect(portal.locator('canvas[data-gateway-canvas]')).toHaveCount(1)

      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true)
    })
  }

  test('language navigation never waits for the scene', async ({ page }) => {
    await page.goto('/')

    const english = page.getByRole('link', { name: 'English' })
    const farsi = page.getByRole('link', { name: 'فارسی' })
    await expect(english).toHaveAttribute('href', '/en/')
    await expect(farsi).toHaveAttribute('href', '/fa/')

    // Navigation starts immediately even while the entrance plays.
    await Promise.all([page.waitForURL('/en/'), english.click()])
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('keyboard reaches both languages with visible focus and no trap', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'English' }).focus()
    await expect(page.getByRole('link', { name: 'English' })).toHaveCSS(
      'outline-style',
      'solid',
    )
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'فارسی' })).toBeFocused()
    await expect(page.getByRole('link', { name: 'فارسی' })).toHaveCSS(
      'outline-style',
      'solid',
    )
    // One more Tab leaves the nav instead of trapping inside the portal.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'فارسی' })).not.toBeFocused()
  })

  test('scene failure keeps an accessible fallback with working links', async ({
    page,
  }) => {
    // Abort the lazily-loaded portal chunks: brand, heading, both language
    // links, and the raster fallback must survive with no success status.
    await page.route(/gateway-scene|gateway-motion|three/, (route) =>
      route.abort(),
    )
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Taha/)
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/',
    )
    await expect(page.getByRole('link', { name: 'فارسی' })).toHaveAttribute(
      'href',
      '/fa/',
    )
    const portal = page.locator('[data-gateway-portal]')
    await expect(portal).toHaveAttribute('data-gateway-state', 'fallback')
    await expect(
      portal.locator('canvas[data-gateway-canvas]:not([hidden])'),
    ).toHaveCount(0)
    await page.unrouteAll({ behavior: 'wait' })
  })

  test('gateway never imports the Home graph path', async ({ page }) => {
    await page.goto('/')
    const html = await page.content()
    expect(html).not.toMatch(/graph-scene/)
    expect(html).not.toMatch(/hero-enhancement/)
    expect(html).not.toMatch(/data-graph-region/)
  })

  test('gateway stays readable with JavaScript disabled', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await context.newPage()
    await noJsPage.goto('/')

    await expect(noJsPage.locator('.gw__title')).toContainText('Taha')
    await expect(
      noJsPage.getByRole('navigation', { name: 'Language selection' }),
    ).toBeVisible()
    await expect(
      noJsPage.getByRole('link', { name: 'English' }),
    ).toHaveAttribute('href', '/en/')
    await expect(noJsPage.getByRole('link', { name: 'فارسی' })).toHaveAttribute(
      'href',
      '/fa/',
    )
    // No procedural canvas without scripts; raster noscript fallback covers it.
    await expect(
      noJsPage.locator('canvas[data-gateway-canvas]:not([hidden])'),
    ).toHaveCount(0)
    await context.close()
  })

  test('reduced motion keeps the gateway usable without reload', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    await expect(page.locator('.gw__title')).toBeVisible()
    await expect(page.getByRole('link', { name: 'English' })).toBeVisible()

    const prefersReduced = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    expect(prefersReduced).toBe(true)
  })

  test('portal survives light and dark themes with one canvas', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('tm-theme', 'dark'))
    await page.goto('/')
    const portal = page.locator('[data-gateway-portal]')
    await expect(portal).toHaveAttribute('data-gateway-state', 'ready')
    await expect(
      portal.locator('canvas[data-gateway-canvas]:not([hidden])'),
    ).toHaveCount(1)

    await page.locator('[data-theme-toggle]').click()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .not.toBe('dark')
    await expect(portal).toHaveAttribute('data-gateway-state', 'ready')
    await expect(
      portal.locator('canvas[data-gateway-canvas]:not([hidden])'),
    ).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'English' })).toBeVisible()
  })

  test('gateway stays usable at 200% zoom', async ({ page }) => {
    // 200% zoom on a 1440px window leaves a 720 CSS px viewport: emulate it
    // directly instead of scaling content twice.
    await page.setViewportSize({ width: 720, height: 900 })
    await page.goto('/')

    await expect(page.locator('[data-gateway-portal]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'English' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'فارسی' })).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
  })
})
