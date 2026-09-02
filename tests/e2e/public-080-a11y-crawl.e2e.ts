import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  A11Y_AUDIT_ROUTES,
  A11Y_AXE_WCAG_TAGS,
  type A11yAuditRoute,
} from '../../src/test-harness/a11y-audit'

async function assertRouteLandmarks(
  page: import('@playwright/test').Page,
  route: A11yAuditRoute,
) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

  switch (route.profile) {
    case 'gateway':
      await expect(
        page.getByRole('navigation', { name: 'Language selection' }),
      ).toBeVisible()
      break
    default:
      await expect(page.locator('#main-content')).toBeVisible()
      await expect(page.locator('.site-header')).toBeVisible()
      await expect(page.locator('.site-footer')).toBeVisible()

      if (route.locale && route.dir) {
        await expect(page.locator('html')).toHaveAttribute('lang', route.locale)
        await expect(page.locator('html')).toHaveAttribute('dir', route.dir)
      }
      break
  }
}

test.describe('PUBLIC-080 automated accessibility crawl', () => {
  for (const route of A11Y_AUDIT_ROUTES) {
    test(`PUBLIC-080 ${route.id} landmarks and WCAG 2.2 AA axe scan @a11y`, async ({
      page,
    }) => {
      const response = await page.goto(route.path)
      expect(response?.ok(), `${route.id} HTTP status`).toBeTruthy()

      await assertRouteLandmarks(page, route)

      const results = await new AxeBuilder({ page })
        .withTags([...A11Y_AXE_WCAG_TAGS])
        .analyze()

      expect(
        results.violations,
        `${route.id} axe violations: ${JSON.stringify(results.violations, null, 2)}`,
      ).toEqual([])
    })
  }
})
