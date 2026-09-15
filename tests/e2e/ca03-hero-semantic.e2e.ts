import { expect, test } from '@playwright/test'

/**
 * CA-03 → Stage 4 — Semantic integrated Home hero. The visual column is the authored Hero v2
 * scroll sequence (image states, no scene runtime); the interactive graph moved to About, and
 * Home still has no separate graph section and no portal imagery. Node-selection assertions are
 * state-aware and self-skip when no scene is present on Home.
 */

const targets = [
  { path: '/en/', locale: 'en', dir: 'ltr' },
  { path: '/fa/', locale: 'fa', dir: 'rtl' },
] as const

test.describe('CA-03 semantic integrated Home hero', () => {
  for (const target of targets) {
    for (const width of [390, 1440]) {
      test(`one H1 with the authored sequence inside the hero at ${target.locale}@${width}`, async ({
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
        await expect(hero.locator('[data-hero-sequence]')).toHaveCount(1)
        await expect(hero.locator('canvas')).toHaveCount(0)

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
    for (const path of ['/en/', '/fa/']) {
      await page.goto(path)
      const research = page.locator('.hm-hero__research')
      await expect(research).toHaveCount(1)
      const text = (await research.innerText()).trim()
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toMatch(/<[^>]*>|^#{1,6}\s|\*\*|\[[^\]]*\]\(/)
    }
  })

  test('native node selection toggles without scripts or navigation', async ({
    page,
  }) => {
    await page.goto('/en/')
    // Stage 4.1: Home has no graph region at all, so this case retires explicitly rather than
    // waiting on a locator that can never appear. The interaction contract lives on About
    // (tests/e2e/ru-about.e2e.ts).
    test.skip(
      (await page.locator('[data-graph-region]').count()) === 0,
      'Home ships the authored image sequence; no graph region to select from',
    )
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
    const noJsResearch = noJsPage.locator('.hm-hero__research')
    await expect(noJsResearch).toHaveCount(1)
    const noJsResearchText = (await noJsResearch.innerText()).trim()
    expect(noJsResearchText.length).toBeGreaterThan(0)
    expect(noJsResearchText).not.toMatch(/<[^>]*>|^#{1,6}\s|\*\*|\[[^\]]*\]\(/)
    await expect(
      noJsPage.locator('[data-hero-layout="integrated"]'),
    ).toHaveCount(1)
    // Stage 4.1: the hero's visual is the authored image sequence, and Home ships no scene
    // runtime at all (the interactive graph lives on About).
    const noJsSequence = noJsPage.locator('[data-hero-sequence]')
    await expect(noJsSequence).toHaveCount(1)
    await expect(
      noJsSequence.locator('[data-hero-sequence-frame]'),
    ).toHaveCount(8)
    await expect(noJsPage.locator('canvas')).toHaveCount(0)
    await expect(noJsPage.locator('[data-graph-region]')).toHaveCount(0)
  })
})
