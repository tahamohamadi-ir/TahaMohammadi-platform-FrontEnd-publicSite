import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SHELL_MUTED_LABEL_SELECTORS =
  '.site-header__brand-role, .site-footer__nav-title'

test.describe('PUBLIC-150 shell muted label contrast', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`passes color contrast for shell muted labels in ${theme} theme @a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/en/projects/')
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme
      }, theme)

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
    const brandName = locale === 'en' ? 'TAHA MOHAMMADI' : 'طه محمدی'

    test(`brand link keeps its locale name at 390px (${locale}) @a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/${locale}/`)

      // Brand text is visually hidden below 768px, so the header link
      // must carry its own accessible name instead of going unnamed on
      // mobile (the footer brand link stays visible and named throughout).
      const headerBrand = page
        .locator('.site-header')
        .getByRole('link', { name: brandName })
      await expect(headerBrand).toHaveAttribute('href', `/${locale}/`)
    })

    test(`mobile menu toggles by keyboard with no trap (${locale}) @a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/${locale}/`)

      const trigger = page.locator('.site-header__menu-trigger')
      await expect(trigger).toBeVisible()
      await trigger.focus()
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveCSS('outline-style', 'solid')
      await expect(trigger).toHaveCSS('outline-width', '2px')

      // Keyboard toggles the drawer open; its links become visible with no
      // horizontal overflow and focus keeps moving (no trap).
      await page.keyboard.press('Enter')
      const mobileNav = page.locator('.site-header__nav--mobile')
      await expect(mobileNav).toBeVisible()
      const firstLink = mobileNav.getByRole('link').first()
      await expect(firstLink).toBeVisible()
      await firstLink.focus()
      await expect(firstLink).toBeFocused()
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true)

      // Toggling again closes the drawer.
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(mobileNav).toBeHidden()
    })
  }
})

test.describe('PUBLIC-150 shell skip-link destination focus', () => {
  test('activates SkipLink, focuses #main-content, and shows a tokenized outline @a11y', async ({
    page,
  }) => {
    await page.goto('/en/')

    const skipLink = page.locator('.skip-link')
    for (
      let attempt = 0;
      attempt < 10 &&
      !(await skipLink.evaluate(
        (element) => element === document.activeElement,
      ));
      attempt += 1
    ) {
      await page.keyboard.press('Tab')
    }

    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')

    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeFocused()
    await expect(mainContent).toHaveCSS('outline-width', '2px')
    await expect(mainContent).toHaveCSS('outline-style', 'solid')
  })
})
