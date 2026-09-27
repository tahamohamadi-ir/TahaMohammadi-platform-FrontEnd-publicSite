import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { A11Y_AXE_WCAG_TAGS } from '../../src/test-harness/a11y-audit'

/**
 * Plan D Task 9 — About coverage for the Atlas preview.
 *
 * Replaces `tests/e2e/ru-about.e2e.ts` (retired scene assertions) and subsumes
 * `tests/e2e/about-atlas.e2e.ts` (its two tests are a strict subset of the EN/FA
 * cases below; the file is deleted in the same commit).
 *
 * Ruling (recorded, not faked): the about-preview SVG is aria-hidden pure
 * presentation (design spec §14.1, Plan C Task 13) — it renders NO per-node
 * anchors, so "one link per preview node" cannot be asserted here. Per-node
 * `focus=node:<key>` deep links live on the Atlas index and are covered by
 * `tests/e2e/product-atlas.e2e.ts`. This spec asserts node presence and count
 * instead.
 *
 * Hermetic fixture truth: `tests/fixtures/atlas/{en,fa}.json` (4 nodes /
 * 3 relations per locale) plus the Task 9 scratch profile fixture served at
 * build time — run with `PUBLIC_API_BASE_URL=http://127.0.0.1:4488` so the
 * preview renders `ready` with `ready` prose sections.
 */
const ABOUT_EN = '/en/about/'
const ABOUT_FA = '/fa/about/'
const FIXTURE_NODE_COUNT = 4

async function expectReadyPreview(
  page: import('@playwright/test').Page,
  locale: 'en' | 'fa',
) {
  const region = page.locator('[data-about-atlas]')
  await expect(region).toBeVisible()
  await expect(region).toHaveAttribute('data-atlas-status', 'ready')
  await expect(
    region.locator('[data-atlas-projection="about-preview"]'),
  ).toBeVisible()
  await expect(region.locator('g.atlas-projection__node')).toHaveCount(
    FIXTURE_NODE_COUNT,
  )
  await expect(
    page.locator(`a.about-atlas__link[href="/${locale}/atlas/"]`),
  ).toBeVisible()
}

async function expectNoUniverse(page: import('@playwright/test').Page) {
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.locator('[data-universe-region]')).toHaveCount(0)
}

async function expectProseSections(page: import('@playwright/test').Page) {
  // NOTE: the engineering section is intentionally absent — `about-profile.ts`
  // hardcodes `engineering_body: null`, so `AboutPageContent` never renders
  // `#about-engineering`. Asserting it here would pin a section the loader
  // cannot produce. If engineering copy is added to the API later, extend.
  for (const id of [
    'about-intro-title',
    'about-education-title',
    'about-experience-title',
  ]) {
    await expect(page.locator(`h2#${id}`)).toBeVisible()
  }
}

test.describe('About Atlas preview @product', () => {
  test('EN About shows ready preview, CTA, prose and no canvas', async ({
    page,
  }) => {
    await page.goto(ABOUT_EN)
    await expectReadyPreview(page, 'en')
    await expectProseSections(page)
    await expectNoUniverse(page)
  })

  test('FA About mirrors preview, CTA, prose and no canvas', async ({
    page,
  }) => {
    await page.goto(ABOUT_FA)
    await expectReadyPreview(page, 'fa')
    await expectProseSections(page)
    await expectNoUniverse(page)
  })

  test('reduced motion keeps the preview stable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(ABOUT_EN)
    await expectReadyPreview(page, 'en')
    await expectNoUniverse(page)
  })

  test('EN About has no WCAG axe violations', async ({ page }) => {
    await page.goto(ABOUT_EN)
    await expect(page.locator('[data-about-atlas]')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags([...A11Y_AXE_WCAG_TAGS])
      .analyze()
    expect(
      results.violations,
      `About axe violations: ${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })
})
