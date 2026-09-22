import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Knowledge Atlas live-API confirmation (Plan C Task 23).
 *
 * Runs on `playwright.knowledge-atlas.config.ts`, which builds the site
 * against a real published API (`TM_E2E_API_BASE_URL`). Confirms topology
 * parity + contract version against live data.
 *
 * Honest skip: when the production API has no active Atlas version yet, the
 * specs skip with the reason recorded — the fixture build remains the
 * acceptance surface until Plan D activates the migrated version.
 */
const EN = '/en/atlas/'
const FA = '/fa/atlas/'

test.describe('ka-live', () => {
  test('serves ready Atlas topology with the accepted contract version @atlas', async ({
    page,
  }) => {
    const response = await page.goto(EN)
    expect(response?.ok(), `${EN} live HTTP status`).toBeTruthy()
    const region = page.locator('[data-atlas-region]')
    const status = await region.getAttribute('data-atlas-status')
    if (status !== 'ready') {
      test.skip(
        true,
        `live API has no active Atlas version (status=${status}); fixture build remains the acceptance surface`,
      )
    }
    await expect(region).toHaveAttribute('data-atlas-contract', 'atlas01-1.0.0')
    const nodes = await region.locator('[data-atlas-node]').count()
    const relations = await region.locator('[data-atlas-relation]').count()
    expect(nodes, 'live node count').toBeGreaterThan(0)
    expect(relations, 'live relation count').toBeGreaterThan(0)
  })

  test('FA locale mirrors the EN topology @atlas', async ({ page }) => {
    await page.goto(EN)
    const enStatus = await page
      .locator('[data-atlas-region]')
      .getAttribute('data-atlas-status')
    if (enStatus !== 'ready') {
      test.skip(
        true,
        `live API has no active Atlas version (status=${enStatus}); fixture build remains the acceptance surface`,
      )
    }
    const enNodes = await page
      .locator('[data-atlas-region] [data-atlas-node]')
      .count()
    await page.goto(FA)
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    const faNodes = await page
      .locator('[data-atlas-region] [data-atlas-node]')
      .count()
    expect(faNodes, 'FA/EN topology parity').toBe(enNodes)
  })

  test('axe scan covers /en/atlas/ and /fa/atlas/ @atlas', async ({ page }) => {
    for (const path of [EN, FA]) {
      await page.goto(path)
      const status = await page
        .locator('[data-atlas-region]')
        .getAttribute('data-atlas-status')
      if (status !== 'ready') {
        test.skip(
          true,
          `live API has no active Atlas version at ${path} (status=${status})`,
        )
      }
      const results = await new AxeBuilder({ page }).analyze()
      expect(
        results.violations,
        `${path} axe violations: ${JSON.stringify(results.violations, null, 2)}`,
      ).toEqual([])
    }
  })
})
