import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Hero v2 — Stage 4 visual evidence.
 *
 * Captures the four authored scroll states per theme and per device, plus the reduced-motion
 * still, against the deterministic E2E build (fixture API), so the review in the Stage 4 report
 * is reproducible instead of depending on whatever the live CMS answered that day.
 *
 * The progress readback is asserted, so a captured frame is real evidence of the state and not
 * just a file: the scrub has to actually reach p≈0/0.33/0.66/1 for the shot to be taken.
 */

const OUT_ROOT = path.resolve('docs/quality/hero-v2-stage4')

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 430, height: 932 },
] as const

async function gotoProgress(
  page: import('@playwright/test').Page,
  target: number,
  travel: number,
): Promise<number> {
  const readProgress = async () =>
    Number(
      (await page
        .locator('[data-hero-sequence]')
        .getAttribute('data-hero-sequence-progress')) ?? '0',
    )
  let offset = 0
  let progress = 0
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }),
      Math.round(offset),
    )
    await page.waitForTimeout(200)
    progress = await readProgress()
    if (Math.abs(progress - target) <= 0.02) break
    offset += (target - progress) * travel
  }
  return progress
}

test.describe('Hero v2 Stage 4 visual evidence', () => {
  test.describe.configure({ mode: 'serial' })

  for (const viewport of viewports) {
    for (const theme of ['dark', 'light'] as const) {
      test(`four authored states at ${viewport.name}/${theme}`, async ({
        page,
      }) => {
        mkdirSync(OUT_ROOT, { recursive: true })
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.goto('/en/')

        const sequence = page.locator('[data-hero-sequence]')
        await expect(sequence).toHaveCount(1)

        await page.evaluate((nextTheme) => {
          document.documentElement.dataset.theme = nextTheme
          window.dispatchEvent(new Event('tm-themechange'))
        }, theme)
        await page.waitForTimeout(600)

        const travel = await page.evaluate(
          () =>
            Number(
              document.querySelector('[data-hero-sequence]')?.dataset
                .heroSequenceTravel,
            ) || 0,
        )
        expect(travel).toBeGreaterThan(200)

        for (const target of [0, 0.33, 0.66, 1]) {
          const progress = await gotoProgress(page, target, travel)
          expect(Math.abs(progress - target)).toBeLessThanOrEqual(0.05)
          await page.waitForTimeout(250)
          await page.screenshot({
            path: path.join(
              OUT_ROOT,
              `${viewport.name}-${theme}-p${String(Math.round(target * 100)).padStart(3, '0')}.jpg`,
            ),
            type: 'jpeg',
            quality: 72,
          })
        }
      })
    }
  }

  test('reduced motion still frame', async ({ page }) => {
    mkdirSync(OUT_ROOT, { recursive: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en/')

    const sequence = page.locator('[data-hero-sequence]')
    await expect(sequence).toHaveCount(1)
    const before = await sequence.getAttribute('data-hero-sequence-progress')
    await page.evaluate(() => window.scrollTo(0, 1600))
    await page.waitForTimeout(400)
    expect(await sequence.getAttribute('data-hero-sequence-progress')).toBe(
      before,
    )

    const visible = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
          ),
        ].filter((el) => Number(getComputedStyle(el).opacity) > 0.01).length,
    )
    expect(visible).toBe(1)

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(250)
    await page.screenshot({
      path: path.join(OUT_ROOT, 'desktop-reduced-motion.jpg'),
      type: 'jpeg',
      quality: 72,
    })
  })
})
