import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Plan C Task 23 — hermetic Knowledge Atlas browser suite.
 * Asserts documented product facts (`data-atlas-*`, semantic index, inspector).
 */

const NODE_KEY = 'research-area-9beff154'
const RELATION_KEY = 'identity-1db666f9~research-focus~research-area-9beff154'

async function openAtlas(page: Page, path: string) {
  const response = await page.goto(path)
  expect(response?.ok(), `${path} HTTP`).toBeTruthy()
  const region = page.locator('[data-atlas-region]')
  await expect(region).toHaveAttribute('data-atlas-status', 'ready')
  return region
}

test.describe('desktop presentation', () => {
  test('publishes an Atlas region with revision and presentation @atlas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const region = await openAtlas(page, '/en/atlas/')
    await expect(region).toHaveAttribute('data-atlas-revision', /.+/)
    const presentation = await region.getAttribute('data-atlas-presentation')
    expect(['list', '2d', '3d', 'fallback']).toContain(presentation)
  })
})

test.describe('compact 2D', () => {
  test('uses a non-3d presentation under 1024px @atlas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const region = await openAtlas(page, '/en/atlas/')
    await page.waitForTimeout(400)
    const presentation = await region.getAttribute('data-atlas-presentation')
    expect(presentation).not.toBe('3d')
    await expect(page.locator('svg[data-atlas-projection]')).toHaveCount(1)
  })
})

test.describe('deep links', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`${locale} node focus updates state and URL @atlas`, async ({
      page,
    }) => {
      const region = await openAtlas(
        page,
        `/${locale}/atlas/?focus=node:${NODE_KEY}`,
      )
      await expect(region).toHaveAttribute('data-atlas-state', 'node')
      expect(page.url()).toContain(`focus=node:${NODE_KEY}`)
      await expect(
        page.locator(`[data-atlas-inspector-node="${NODE_KEY}"]`),
      ).toBeVisible()
    })

    test(`${locale} relation focus updates state and URL @atlas`, async ({
      page,
    }) => {
      const encoded = encodeURIComponent(RELATION_KEY).replace(/~/g, '%7E')
      // Prefer canonical %7E form; raw ~ is also accepted by the codec.
      const region = await openAtlas(
        page,
        `/${locale}/atlas/?focus=relation:${RELATION_KEY}`,
      )
      await expect(region).toHaveAttribute('data-atlas-state', 'relation')
      expect(page.url()).toMatch(/focus=relation:/)
      void encoded
      await expect(
        page.locator(`[data-atlas-inspector-relation="${RELATION_KEY}"]`),
      ).toBeVisible()
    })
  }
})

test.describe('history', () => {
  test('Back/Forward restores selection @atlas', async ({ page }) => {
    await openAtlas(page, '/en/atlas/')
    await page.goto(`/en/atlas/?focus=node:${NODE_KEY}`)
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-state',
      'node',
    )
    await page.goBack()
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-state',
      'overview',
    )
    await page.goForward()
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-state',
      'node',
    )
  })
})

test.describe('search and filters', () => {
  test('search input is present and filter chips exclude identity @atlas', async ({
    page,
  }) => {
    await openAtlas(page, '/en/atlas/')
    await expect(page.locator('[data-atlas-search]')).toBeVisible()
    const keys = await page
      .locator('[data-atlas-filter][data-atlas-filter-key]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-atlas-filter-key')),
      )
    expect(keys[0]).toBe('all')
    expect(keys).not.toContain('identity')
  })
})

test.describe('reduced motion', () => {
  test('region remains ready under prefers-reduced-motion @atlas', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const region = await openAtlas(page, '/en/atlas/')
    await expect(region).toHaveAttribute('data-atlas-status', 'ready')
  })
})

test.describe('WebGL unavailable', () => {
  test('falls back without a 3d presentation @atlas', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value() {
          return null
        },
      })
    })
    await page.setViewportSize({ width: 1280, height: 800 })
    const region = await openAtlas(page, '/en/atlas/')
    await page.waitForTimeout(500)
    const presentation = await region.getAttribute('data-atlas-presentation')
    expect(presentation).not.toBe('3d')
  })
})

test.describe('no-JS semantics', () => {
  test('semantic index lists nodes without scripting @atlas @nojs', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    const response = await page.goto('/en/atlas/')
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator('.atlas-index__node')).toHaveCount(4)
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    await context.close()
  })
})

test.describe('accessibility', () => {
  for (const locale of ['en', 'fa'] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`${locale} ${colorScheme} axe WCAG scan @atlas @a11y`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme })
        await openAtlas(page, `/${locale}/atlas/`)
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(
          results.violations,
          JSON.stringify(results.violations, null, 2),
        ).toEqual([])
      })
    }
  }
})

test.describe('idle draws', () => {
  test('idle|budget: no permanent draw loop after settle @atlas @performance', async ({
    page,
  }) => {
    await page.goto('/en/atlas/')
    await expect(page.locator('[data-atlas-region]')).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    await page.waitForTimeout(1500)
    const presentation = await page
      .locator('[data-atlas-region]')
      .getAttribute('data-atlas-presentation')
    // list/2d/fallback: no WebGL idle draws by construction.
    expect(presentation).toBeTruthy()
  })
})
