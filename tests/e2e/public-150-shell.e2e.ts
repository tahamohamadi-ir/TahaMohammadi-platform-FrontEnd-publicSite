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
