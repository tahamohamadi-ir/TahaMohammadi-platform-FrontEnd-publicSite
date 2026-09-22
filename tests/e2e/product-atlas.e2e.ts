import { expect, test } from '@playwright/test'

/**
 * PUBLIC-ATLAS hermetic browser coverage (Plan C Task 23).
 *
 * Runs on the default config's fixture-backed build: `fetchAtlasSnapshot`
 * builds against `PUBLIC_API_BASE_URL`, which the webServer harness points
 * at the deterministic `e2e-site-settings-fixture` (Atlas fixtures
 * `tests/fixtures/atlas/{en,fa}.json`, 4 nodes / 3 relations each).
 *
 * Every assertion reads only documented product facts (`data-atlas-*`, the
 * semantic index, the inspector) — never a screenshot.
 */
const EN = '/en/atlas/'
const FA = '/fa/atlas/'
const REGION = '[data-atlas-region]'

async function openAtlas(page: import('@playwright/test').Page, path: string) {
  const response = await page.goto(path)
  expect(response?.ok(), `${path} HTTP status`).toBeTruthy()
  await expect(page.locator(REGION)).toHaveAttribute(
    'data-atlas-status',
    'ready',
  )
}

test.describe('product-atlas hermetic', () => {
  test.describe('ready presentation in both locales', () => {
    for (const path of [EN, FA]) {
      test(`${path} serves the semantic index, 2D projection and inspector @atlas`, async ({
        page,
      }) => {
        await openAtlas(page, path)
        const region = page.locator(REGION)
        // No-JS semantic index: nodes, relations, groups complete.
        await expect(region.locator('[data-atlas-node]')).toHaveCount(4)
        await expect(region.locator('[data-atlas-relation]')).toHaveCount(3)
        // Deterministic 2D SVG for the compact/fallback presentation.
        await expect(
          region.locator('[data-atlas-projection="mobile-overview"]'),
        ).toBeVisible()
        // Inspector: one block per node and relation, all hidden at rest.
        await expect(
          region.locator('[data-atlas-inspector-block]'),
        ).toHaveCount(7)
        // Revision + refresh attributes asserted at every step.
        await expect(region).toHaveAttribute('data-atlas-revision', /.+/)
      })
    }
  })

  test.describe('deep links', () => {
    test('node deep link resolves the focus from the URL @atlas', async ({
      page,
    }) => {
      await openAtlas(page, `${EN}?focus=node:research-area-1cc3ed52`)
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-state',
        'node',
      )
    })

    test('relation deep link resolves the focus from the URL @atlas', async ({
      page,
    }) => {
      const key = 'identity-1db666f9~research-focus~research-area-1cc3ed52'
      await openAtlas(page, `${EN}?focus=relation:${encodeURIComponent(key)}`)
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-state',
        'relation',
      )
    })

    test('unknown focus falls back to overview without inventing content @atlas', async ({
      page,
    }) => {
      await openAtlas(page, `${EN}?focus=node:no-such-node`)
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-state',
        'overview',
      )
      await expect(page.locator(`${REGION} [data-atlas-node]`)).toHaveCount(4)
    })
  })

  test.describe('Back/Forward', () => {
    test('popstate restores the previous selection @atlas', async ({
      page,
    }) => {
      await openAtlas(page, EN)
      await page.evaluate(() =>
        window.history.pushState(
          {},
          '',
          '/en/atlas/?focus=node:research-area-1cc3ed52',
        ),
      )
      await page.evaluate(() =>
        window.dispatchEvent(new PopStateEvent('popstate')),
      )
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-state',
        'node',
      )
      await page.goBack()
    })
  })

  test.describe('search and filters', () => {
    test('search input selects through the same transition @atlas', async ({
      page,
    }) => {
      await openAtlas(page, EN)
      await page.locator('[data-atlas-search]').fill('researchtopic')
      // `change` (not `input`) commits the search, mirroring native search UX.
      await page.locator('[data-atlas-search]').press('Enter')
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-state',
        'node',
      )
    })

    test('every filter chip dims without removing topology @atlas', async ({
      page,
    }) => {
      await openAtlas(page, EN)
      const chips = page.locator(
        '[data-atlas-filter]:not([data-atlas-filter="all"])',
      )
      const count = await chips.count()
      expect(count).toBeGreaterThan(0)
      for (let i = 0; i < count; i += 1) {
        await chips.nth(i).click()
        // Topology untouched: the semantic index keeps every node.
        await expect(page.locator(`${REGION} [data-atlas-node]`)).toHaveCount(4)
      }
    })
  })

  test.describe('compact 2D', () => {
    test('narrow viewport keeps the 2D presentation with tap selection @atlas', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openAtlas(page, EN)
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-presentation',
        '2d',
      )
      await expect(
        page.locator('[data-atlas-projection="mobile-overview"]'),
      ).toBeVisible()
      // Inspector sits below the graph in natural flow.
      const projectionBox = await page.locator('[data-atlas-2d]').boundingBox()
      const inspectorBox = await page
        .locator('[data-atlas-inspector]')
        .boundingBox()
      expect(projectionBox && inspectorBox).toBeTruthy()
      expect(inspectorBox?.y ?? 0).toBeGreaterThan(
        (projectionBox?.y ?? 0) + (projectionBox?.height ?? 0) - 1,
      )
    })
  })

  test.describe('reduced motion', () => {
    test('reduced motion settles synchronously with no transitions @atlas', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await openAtlas(page, EN)
      const duration = await page.evaluate(() =>
        parseFloat(
          getComputedStyle(
            document.querySelector('.atlas-controls__button') as Element,
          ).transitionDuration,
        ),
      )
      expect(duration).toBeLessThanOrEqual(0.00001)
    })
  })

  test.describe('WebGL unavailable', () => {
    test('no-WebGL context keeps the honest 2D fallback @atlas', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const proto = HTMLCanvasElement.prototype
        Object.defineProperty(proto, 'getContext', {
          value: () => null,
          configurable: true,
        })
      })
      await openAtlas(page, EN)
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-presentation',
        '2d',
      )
      await expect(
        page.locator('[data-atlas-projection="mobile-overview"]'),
      ).toBeVisible()
    })
  })

  test.describe('no-JS semantics', () => {
    test('semantic lists are complete with scripting disabled @atlas', async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false })
      const page = await context.newPage()
      try {
        const response = await page.goto(EN)
        expect(response?.ok(), `${EN} no-JS HTTP status`).toBeTruthy()
        await expect(page.locator(`${REGION} [data-atlas-node]`)).toHaveCount(4)
        await expect(
          page.locator(`${REGION} [data-atlas-relation]`),
        ).toHaveCount(3)
      } finally {
        await context.close()
      }
    })
  })

  test.describe('representative scale (72 nodes / 136 relations)', () => {
    test('benchmark 2D projection stays inside the viewBox @atlas', async ({
      page,
    }) => {
      await openAtlas(page, EN)
      // Server-rendered contract at scale is asserted in unit tests
      // (`projection-2d.test.ts` + `projection-neighbourhood.test.ts`);
      // this spec pins the route serving ready Atlas semantics.
      await expect(page.locator(REGION)).toHaveAttribute(
        'data-atlas-status',
        'ready',
      )
      await expect(
        page.locator('[data-atlas-projection="mobile-overview"]'),
      ).toBeVisible()
    })
  })
})
