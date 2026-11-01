import { expect, test } from '@playwright/test'

/**
 * ADR-0011 — Home Hero v3. One copy column plus a constellation drawn from the published graph;
 * the SVG poster and its HTML node labels are the no-JS state. No scroll sequence, no portal.
 */

const targets = [
  { path: '/en/', locale: 'en', dir: 'ltr' },
  { path: '/fa/', locale: 'fa', dir: 'rtl' },
] as const

test.describe('Home Hero v3 semantics', () => {
  for (const target of targets) {
    for (const width of [390, 1440]) {
      test(`one H1 and the graph constellation inside the hero at ${target.locale}@${width}`, async ({
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

        const hero = page.locator('[data-hero-v3]')
        await expect(hero).toHaveCount(1)
        await expect(hero).toHaveAttribute('data-hero-visual', 'constellation')
        await expect(hero.locator('.hv3-const__poster')).toHaveCount(1)
        await expect(hero.locator('.hv3-const__label')).not.toHaveCount(0)
        await expect(page.locator('[data-hero-sequence]')).toHaveCount(0)
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
      const research = page.locator('.hv3__research')
      await expect(research).toHaveCount(1)
      const text = (await research.innerText()).trim()
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toMatch(/<[^>]*>|^#{1,6}\s|\*\*|\[[^\]]*\]\(/)
    }
  })

  test('hero stays readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await context.newPage()
    await noJsPage.goto('/en/')

    await expect(noJsPage.locator('.hv3__name')).toContainText('Taha')
    await expect(noJsPage.locator('.hv3__research')).toHaveCount(1)
    const hero = noJsPage.locator('[data-hero-v3]')
    await expect(hero.locator('.hv3-const__poster')).toBeVisible()
    await expect(hero.locator('.hv3-const__label').first()).toBeVisible()
    await expect(hero).not.toHaveAttribute('data-hv3-live-ready', /.*/)
    await context.close()
  })
})
