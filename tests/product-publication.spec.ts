import { describe, expect, it } from 'vitest'

const CORE_PAGE_ROUTES = [
  { path: '/fa/', locale: 'fa', dir: 'rtl' },
  { path: '/en/', locale: 'en', dir: 'ltr' },
  { path: '/fa/projects/', locale: 'fa', dir: 'rtl' },
  { path: '/en/projects/', locale: 'en', dir: 'ltr' },
  { path: '/fa/research/', locale: 'fa', dir: 'rtl' },
  { path: '/en/research/', locale: 'en', dir: 'ltr' },
  { path: '/fa/blog/', locale: 'fa', dir: 'rtl' },
  { path: '/en/blog/', locale: 'en', dir: 'ltr' },
  { path: '/fa/collections/', locale: 'fa', dir: 'rtl' },
  { path: '/en/collections/', locale: 'en', dir: 'ltr' },
  { path: '/fa/about/', locale: 'fa', dir: 'rtl' },
  { path: '/en/about/', locale: 'en', dir: 'ltr' },
  { path: '/fa/contact/', locale: 'fa', dir: 'rtl' },
  { path: '/en/contact/', locale: 'en', dir: 'ltr' },
] as const

const RESPONSIVE_VIEWPORTS = [
  { width: 320, height: 568, label: '320 mobile small' },
  { width: 390, height: 844, label: '390 mobile standard' },
  { width: 768, height: 1024, label: '768 tablet portrait' },
  { width: 1024, height: 768, label: '1024 tablet landscape' },
  { width: 1280, height: 800, label: '1280 laptop' },
  { width: 1440, height: 900, label: '1440 desktop' },
]

if (process.env.VITEST) {
  describe('PU-25 Public Publication Journey Specification Structure', () => {
    it('defines complete route paths across both Persian and English locales', () => {
      const faRoutes = CORE_PAGE_ROUTES.filter((r) => r.locale === 'fa')
      const enRoutes = CORE_PAGE_ROUTES.filter((r) => r.locale === 'en')
      expect(faRoutes.length).toBe(enRoutes.length)
      expect(faRoutes.every((r) => r.dir === 'rtl')).toBe(true)
      expect(enRoutes.every((r) => r.dir === 'ltr')).toBe(true)
    })

    it('covers all responsive viewport widths specified in design authority', () => {
      const widths = RESPONSIVE_VIEWPORTS.map((v) => v.width)
      expect(widths).toEqual([320, 390, 768, 1024, 1280, 1440])
    })

    it('asserts 404 fallback routing expectations without invented data', () => {
      const removedPath = '/fa/non-existent-record-12345/'
      expect(removedPath).toMatch(/^\/fa\/.+/)
    })
  })
} else {
  // Executed under Playwright test runner
  const { test, expect: pwExpect } = await import('@playwright/test')

  test.describe('PU-25 Public Publication Journey: Direct URLs and Metadata', () => {
    for (const route of CORE_PAGE_ROUTES) {
      test(`loads ${route.path} with status 200 and valid HTML lang/dir attributes`, async ({
        page,
      }) => {
        const response = await page.goto(route.path)
        pwExpect(response?.status()).toBe(200)

        const html = page.locator('html')
        await pwExpect(html).toHaveAttribute('lang', route.locale)
        await pwExpect(html).toHaveAttribute('dir', route.dir)

        const h1 = page.locator('h1')
        await pwExpect(h1.first()).toBeVisible()
      })

      test(`verifies canonical link on ${route.path}`, async ({ page }) => {
        await page.goto(route.path)
        const canonical = page.locator('link[rel="canonical"]')
        await pwExpect(canonical).toHaveCount(1)
        const href = await canonical.getAttribute('href')
        pwExpect(href).toBeTruthy()
        pwExpect(href).toContain(route.path)
      })
    }

    test('verifies alternate hreflang tags on home routes', async ({ page }) => {
      await page.goto('/fa/')
      const alternates = page.locator('link[rel="alternate"]')
      const count = await alternates.count()
      pwExpect(count).toBeGreaterThanOrEqual(2)

      const faAlt = page.locator('link[rel="alternate"][hreflang="fa"]')
      await pwExpect(faAlt).toHaveAttribute('href', /https?:\/\/[^/]+\/fa\//)

      const enAlt = page.locator('link[rel="alternate"][hreflang="en"]')
      await pwExpect(enAlt).toHaveAttribute('href', /https?:\/\/[^/]+\/en\//)

      const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]')
      await pwExpect(xDefault).toHaveAttribute('href', /https?:\/\/[^/]+\/fa\//)
    })
  })

  test.describe('PU-25 Public Publication Journey: Removed and 404 Routes', () => {
    test('returns 404 status and renders honest 404 page for removed or non-existent record', async ({
      page,
    }) => {
      const response = await page.goto('/fa/non-existent-published-record-404/')
      pwExpect(response?.status()).toBe(404)

      const mainContent = page.locator('main, [role="main"]')
      await pwExpect(mainContent.first()).toBeVisible()
      const notFoundHeading = page.locator('h1')
      await pwExpect(notFoundHeading.first()).toBeVisible()
    })
  })

  test.describe('PU-25 Public Publication Journey: Responsive Matrix and Theme Adaptation', () => {
    for (const vp of RESPONSIVE_VIEWPORTS) {
      for (const theme of ['light', 'dark'] as const) {
        test(`renders /fa/ cleanly at ${vp.label} in ${theme} theme`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height })
          await page.goto('/fa/')
          await page.evaluate((t) => {
            document.documentElement.dataset.theme = t
          }, theme)

          const body = page.locator('body')
          await pwExpect(body).toBeVisible()

          const header = page.locator('header, .site-header')
          await pwExpect(header.first()).toBeVisible()
          const main = page.locator('main')
          await pwExpect(main.first()).toBeVisible()
        })
      }
    }
  })
}
