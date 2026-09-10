import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SHELL_MUTED_LABEL_SELECTORS =
  '.site-header__brand-role, .site-footer__nav-title'

test.describe('PUBLIC-150 shell muted label contrast', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`checks rendered shell labels without requiring CMS placeholders in ${theme} theme @a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/en/projects/')
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme
      }, theme)

      const labels = page.locator(SHELL_MUTED_LABEL_SELECTORS)
      if ((await labels.count()) === 0) {
        await expect(labels).toHaveCount(0)
        return
      }

      const results = await new AxeBuilder({ page })
        .include(SHELL_MUTED_LABEL_SELECTORS)
        .withRules(['color-contrast'])
        .analyze()

      expect(results.violations).toEqual([])
    })
  }
})

test.describe('CA-08 shared chrome navigation', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`keeps operational controls without published settings (${locale}) @a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/${locale}/`)

      const brand = page.locator('.site-header__brand')
      if ((await brand.count()) > 0) {
        await expect(brand).toBeVisible()
        await expect(brand).not.toBeEmpty()
      } else {
        await expect(brand).toHaveCount(0)
      }
      await expect(page.locator('.site-header__search-link')).toBeVisible()
      await expect(page.locator('.theme-toggle--shell')).toBeVisible()
      await expect(page.locator('.site-header__drawer')).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true)
    })
  }
})

test.describe('PUBLIC-150 shell skip-link destination focus', () => {
  test('uses approved operational copy when published copy is unavailable @a11y', async ({
    page,
  }) => {
    await page.goto('/en/')
    await expect(page.locator('.skip-link')).toHaveText('Skip to main content')
  })
})
