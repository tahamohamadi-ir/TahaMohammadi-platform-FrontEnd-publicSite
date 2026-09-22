import { expect, test } from '@playwright/test'

/**
 * Plan D Phase 1 — About page hosts a thin Atlas about-preview, not RU About.
 * Hermetic build uses the E2E settings fixture which serves /api/atlas/{en,fa}.
 */

const ABOUT_EN = '/en/about/'
const ABOUT_FA = '/fa/about/'

test.describe('About Atlas preview @product', () => {
  test('EN About shows about-preview and CTA without RU about mode', async ({
    page,
  }) => {
    await page.goto(ABOUT_EN)
    const region = page.locator('[data-about-atlas]')
    await expect(region).toBeVisible()
    await expect(region).toHaveAttribute(
      'data-atlas-status',
      /ready|unavailable|invalid/,
    )

    const status = await region.getAttribute('data-atlas-status')
    if (status === 'ready') {
      await expect(
        region.locator('[data-atlas-projection="about-preview"]'),
      ).toBeVisible()
    }

    await expect(
      page.locator('a.about-atlas__link[href="/en/atlas/"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-universe-region][data-universe-mode="about"]'),
    ).toHaveCount(0)
  })

  test('FA About mirrors Atlas preview topology', async ({ page }) => {
    await page.goto(ABOUT_FA)
    const region = page.locator('[data-about-atlas]')
    await expect(region).toBeVisible()
    await expect(
      page.locator('a.about-atlas__link[href="/fa/atlas/"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-universe-region][data-universe-mode="about"]'),
    ).toHaveCount(0)
  })
})
