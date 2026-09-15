import { expect, test } from '@playwright/test'

// V2 checks semantic content in the state actually delivered by this build.
/** Stage 4: the hero's semantic contract is the authored image sequence — no scene runtime. */
async function expectHeroSequence(page: import('@playwright/test').Page) {
  const hero = page.locator('[data-hero-layout="integrated"]')
  await expect(hero).toHaveCount(1)
  const sequence = hero.locator('[data-hero-sequence]')
  await expect(sequence).toHaveCount(1)
  await expect(sequence).toBeVisible()
  await expect(sequence).toHaveAttribute('data-hero-sequence-frame-count', '4')
  await expect(sequence.locator('[data-hero-sequence-frame]')).toHaveCount(8)
  await expect(sequence.locator('[data-hero-sequence-theme]')).toHaveCount(2)
  await expect(hero.locator('canvas')).toHaveCount(0)
  await expect(hero.locator('[data-graph-node]')).toHaveCount(0)
  await expect(page.locator('#home-graph-region')).toHaveCount(0)
}

async function settleLazyMedia(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
    await Promise.all(
      [...document.querySelectorAll('img')].map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
              return
            }
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
            if (img.complete) resolve()
          }),
      ),
    )
  })
}

test.describe('WP-40 home structure acceptance', () => {
  const pages = [
    { path: '/en/', locale: 'en', dir: 'ltr' },
    { path: '/fa/', locale: 'fa', dir: 'rtl' },
  ] as const

  for (const target of pages) {
    for (const width of [1440, 390]) {
      test(`WP-40 home ${target.locale}@${width}: one H1, no horizontal overflow`, async ({
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

  test('WP-40 home keyboard order keeps visible focus through hero controls', async ({
    page,
  }) => {
    await page.goto('/en/')
    await page.keyboard.press('Tab')
    await expect(page.locator('.skip-link')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    await expect(page.locator('.hm-hero__focus-list')).toHaveCount(1)

    const themeToggle = page.locator('[data-theme-toggle]')
    await themeToggle.focus()
    await expect(themeToggle).toHaveCSS('outline-style', 'solid')

    const languageToggle = page.getByRole('link', { name: 'FA' })
    await languageToggle.focus()
    await expect(languageToggle).toHaveCSS('outline-style', 'solid')
  })

  test('V2 Home exposes one truthful semantic graph in both locales', async ({
    page,
  }) => {
    for (const path of ['/en/', '/fa/']) {
      await page.goto(path)
      await expectHeroSequence(page)
    }
  })

  test('WP-40 home stays readable with images unavailable', async ({
    page,
  }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'image'
        ? route.abort()
        : route.continue(),
    )
    await page.goto('/en/')

    await expectHeroSequence(page)
    await expect(page.locator('.hm-hero__name')).toContainText('Taha Mohammadi')
    await expect(
      page.locator('.hm-hero[data-hero-layout="integrated"]'),
    ).toHaveCount(1)
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
  })

  test('WP-40 home stays readable with JavaScript disabled', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await context.newPage()
    await noJsPage.goto('/en/')

    await expect(noJsPage.locator('.hm-hero__name')).toContainText(
      'Taha Mohammadi',
    )
    await expectHeroSequence(noJsPage)
    // Stage 4.1: no scene runtime on Home, with or without JavaScript.
    await expect(noJsPage.locator('[data-graph-node]')).toHaveCount(0)
    await expect(noJsPage.locator('canvas')).toHaveCount(0)
    await expect
      .poll(() =>
        noJsPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await context.close()
  })

  test('WP-40 home and gateway capture 200% zoom composition evidence', async ({
    browser,
  }) => {
    // Stage 4.1 note: the hero now owns a pinned scroll shell, so a full-page capture of Home
    // is a taller, stickier page to stitch. The budget is raised rather than weakening what the
    // evidence has to show.
    test.setTimeout(300_000)
    const zoomContext = await browser.newContext({
      viewport: { width: 720, height: 810 },
      deviceScaleFactor: 2,
    })
    const zoomPage = await zoomContext.newPage()

    await zoomPage.goto('/en/')
    await settleLazyMedia(zoomPage)
    await zoomPage.screenshot({
      path: 'test-results/visual/wp40-home-en-200pct-light.png',
      fullPage: true,
    })

    await zoomPage.evaluate(() => window.__tmApplyTheme('dark'))
    await expect(zoomPage.locator('html')).toHaveAttribute('data-theme', 'dark')
    await settleLazyMedia(zoomPage)
    await zoomPage.screenshot({
      path: 'test-results/visual/wp40-home-en-200pct-dark.png',
      fullPage: true,
    })

    await zoomPage.goto('/fa/')
    await settleLazyMedia(zoomPage)
    await zoomPage.screenshot({
      path: 'test-results/visual/wp40-home-fa-200pct-light.png',
      fullPage: true,
    })

    await zoomPage.goto('/')
    await settleLazyMedia(zoomPage)
    await zoomPage.screenshot({
      path: 'test-results/visual/wp40-gateway-200pct-light.png',
      fullPage: true,
    })

    await expect
      .poll(() =>
        zoomPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await zoomContext.close()
  })

  test('WP-40 home captures 768 reflow evidence for both locales and themes', async ({
    page,
  }) => {
    // Stage 4.1 note: raised for the same reason as the 200% zoom capture above.
    test.setTimeout(300_000)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/en/')
    await settleLazyMedia(page)
    await page.screenshot({
      path: 'test-results/visual/wp40-home-en-768-light.png',
      fullPage: true,
    })
    await page.evaluate(() => window.__tmApplyTheme('dark'))
    await page.screenshot({
      path: 'test-results/visual/wp40-home-en-768-dark.png',
      fullPage: true,
    })

    await page.goto('/fa/')
    await settleLazyMedia(page)
    await page.screenshot({
      path: 'test-results/visual/wp40-home-fa-768-light.png',
      fullPage: true,
    })
    await page.evaluate(() => window.__tmApplyTheme('dark'))
    await page.screenshot({
      path: 'test-results/visual/wp40-home-fa-768-dark.png',
      fullPage: true,
    })
  })
})
