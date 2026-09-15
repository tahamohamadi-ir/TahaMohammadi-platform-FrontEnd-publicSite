import { expect, test } from '@playwright/test'

/**
 * CA-06 → Stage 4 — The integrated Home hero now carries the authored Hero v2 image sequence
 * (four rendered states, one set per authored theme, separate desktop and mobile compositions).
 * The interactive scene — canvas, payload, labels, node list — is About-only, so this spec pins
 * that Home ships no scene runtime at all and that scroll progress stays the only motion driver.
 */

const targets = [
  { path: '/en/', locale: 'en' },
  { path: '/fa/', locale: 'fa' },
] as const

test.describe('Home hero ships the authored image sequence, not a scene runtime', () => {
  for (const target of targets) {
    for (const width of [390, 1440]) {
      test(`one hero, four authored states, no canvas at ${target.locale}@${width}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(target.path)

        const hero = page.locator('[data-hero-layout="integrated"]')
        await expect(hero).toHaveCount(1)

        const sequence = hero.locator('[data-hero-sequence]')
        await expect(sequence).toHaveCount(1)
        await expect(sequence).toHaveAttribute(
          'data-hero-sequence-frame-count',
          '4',
        )
        // Four authored states, one set per authored theme; the inactive set is hidden, not cloned.
        await expect(
          sequence.locator('[data-hero-sequence-frame]'),
        ).toHaveCount(8)
        await expect(
          sequence.locator('[data-hero-sequence-theme]'),
        ).toHaveCount(2)

        // No scene runtime of any kind on Home.
        await expect(hero.locator('canvas')).toHaveCount(0)
        await expect(hero.locator('[data-graph-region]')).toHaveCount(0)
        await expect(hero.locator('[data-graph-node]')).toHaveCount(0)
        await expect(hero.locator('script[data-graph-payload]')).toHaveCount(0)
        await expect(page.locator('#home-graph-region')).toHaveCount(0)

        // The visual is a real box, and the copy is DOM text that never waits for it.
        const box = await sequence.boundingBox()
        expect(box?.height ?? 0).toBeGreaterThan(120)
        await expect(page.locator('.hm-hero__copy')).toBeVisible()
        await expect(
          sequence.locator('[data-hero-sequence-theme="light"]'),
        ).toBeVisible()
      })
    }
  }

  test('only the active theme decodes frames', async ({ page }) => {
    await page.goto('/en/')
    const decoded = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll<HTMLImageElement>(
            '[data-hero-sequence] img',
          ),
        ].filter((img) => img.complete && img.naturalWidth > 0).length,
    )
    // Four authored states, at most: the hidden theme must not have downloaded its set.
    expect(decoded).toBeGreaterThan(0)
    expect(decoded).toBeLessThanOrEqual(4)
  })

  test('scroll progress drives the authored states, two frames at most', async ({
    page,
  }) => {
    await page.goto('/en/')
    const sequence = page.locator('[data-hero-sequence]')
    await expect(sequence).toHaveCount(1)

    const readProgress = async () =>
      Number(
        (await sequence.getAttribute('data-hero-sequence-progress')) ?? '0',
      )
    expect(await readProgress()).toBeLessThanOrEqual(0.05)

    const travel = await page.evaluate(
      () =>
        Number(
          document.querySelector('[data-hero-sequence]')?.dataset
            .heroSequenceTravel,
        ) || 0,
    )
    expect(travel).toBeGreaterThan(200)
    expect(travel).toBeGreaterThan(200)

    const samples: number[] = []
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      await page.evaluate(
        (offset) =>
          window.scrollTo({
            top: offset,
            behavior: 'instant' as ScrollBehavior,
          }),
        Math.round(100 + fraction * travel),
      )
      await page.waitForTimeout(250)
      const progress = await readProgress()
      samples.push(progress)

      const visibleStates = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
          ),
        ]
          .map((el, index) => ({
            index,
            opacity: Number(getComputedStyle(el).opacity),
          }))
          .filter((entry) => entry.opacity > 0.01)
          .map((entry) => entry.index),
      )
      expect(visibleStates.length).toBeLessThanOrEqual(2)
      expect(visibleStates.length).toBeGreaterThan(0)
      // Only ADJACENT authored states may show: a strided mapping (0 and 2) is the bug this
      // guards, because it reads as two unrelated frames rather than motion.
      if (visibleStates.length === 2) {
        expect(visibleStates[1] - visibleStates[0]).toBe(1)
      }
    }

    // The scrub advances through the authored states and reaches the last one.
    expect(samples[0]).toBeGreaterThan(0)
    expect([...samples].sort((a, b) => a - b)).toEqual(samples)
    expect(samples[samples.length - 1]).toBeGreaterThan(0.9)
  })

  test('reduced motion shows one static state and never scrubs', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/en/')

    const sequence = page.locator('[data-hero-sequence]')
    await expect(sequence).toHaveCount(1)

    const before = await sequence.getAttribute('data-hero-sequence-progress')
    await page.evaluate(() =>
      window.scrollTo({ top: 2400, behavior: 'instant' as ScrollBehavior }),
    )
    await page.waitForTimeout(400)
    const after = await sequence.getAttribute('data-hero-sequence-progress')
    expect(after).toBe(before)

    const visibleFrames = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
          ),
        ].filter((el) => Number(getComputedStyle(el).opacity) > 0.01).length,
    )
    expect(visibleFrames).toBe(1)
  })
})
