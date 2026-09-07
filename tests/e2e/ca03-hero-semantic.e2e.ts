import { expect, test } from '@playwright/test'

/**
 * CA-03 — Semantic integrated Home hero. The graph lives inside the hero;
 * Home has no separate graph section and no portal imagery. Tests are
 * state-aware: structure holds for every graph state, while node-selection
 * assertions run only when the build served a ready graph.
 */

const targets = [
  { path: '/en/', locale: 'en', dir: 'ltr' },
  { path: '/fa/', locale: 'fa', dir: 'rtl' },
] as const

test.describe('CA-03 semantic integrated Home hero', () => {
  for (const target of targets) {
    for (const width of [390, 1440]) {
      test(`one H1 with the graph inside the hero at ${target.locale}@${width}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(target.path)

        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          target.locale,
        )
        await expect(page.locator('html')).toHaveAttribute('dir', target.dir)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

        const hero = page.locator('[data-hero-layout="integrated"]')
        await expect(hero).toHaveCount(1)
        await expect(hero.locator('[data-graph-region]')).toHaveCount(1)

        // No separate Home graph placement and no portal on Home.
        await expect(page.locator('#home-graph-region')).toHaveCount(0)
        await expect(hero.locator('[data-theme-picture]')).toHaveCount(0)

        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true)
      })
    }
  }

  test('research-statement text is retained in the hero copy', async ({
    page,
  }) => {
    await page.goto('/en/')
    await expect(page.locator('.hm-hero__research')).toContainText(
      'intelligent systems extend human capability',
    )
    await page.goto('/fa/')
    await expect(page.locator('.hm-hero__research')).toContainText(
      'امکان کنترل',
    )
  })

  test('native node selection toggles without scripts or navigation', async ({
    page,
  }) => {
    await page.goto('/en/')
    const region = page.locator('[data-graph-region]')
    const status = await region.getAttribute('data-graph-status')
    test.skip(
      status !== 'ready',
      `graph is ${status ?? 'missing'} in this build; selection needs ready data`,
    )

    const firstSummary = region.locator('details summary').first()
    await firstSummary.scrollIntoViewIfNeeded()
    await firstSummary.focus()
    await page.keyboard.press('Enter')
    await expect(region.locator('details[open]').first()).toBeVisible()

    const before = page.url()
    const firstLink = region.locator('[data-graph-detail] a').first()
    if ((await firstLink.count()) > 0) {
      await expect(firstLink).toHaveAttribute('href', new RegExp('^/en/'))
    }
    expect(page.url()).toBe(before)
  })

  test('hero stays readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await context.newPage()
    await noJsPage.goto('/en/')

    await expect(noJsPage.locator('.hm-hero__name')).toContainText(
      'Taha Mohammadi',
    )
    await expect(noJsPage.locator('.hm-hero__research')).toContainText(
      'intelligent systems extend human capability',
    )
    await expect(
      noJsPage.locator('[data-hero-layout="integrated"]'),
    ).toHaveCount(1)
    await expect(noJsPage.locator('[data-graph-region]')).toHaveCount(1)
    await expect(noJsPage.locator('#home-graph-region')).toHaveCount(0)

    const status = await noJsPage
      .locator('[data-graph-region]')
      .getAttribute('data-graph-status')
    if (status === 'ready') {
      await expect(noJsPage.locator('[data-graph-node]').first()).toBeVisible()
    } else {
      await expect(noJsPage.locator('[data-graph-region]')).toContainText(
        /unavailable|No graph nodes|not be shown/,
      )
    }
    await context.close()
  })
})
