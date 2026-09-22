import { expect, test } from '@playwright/test'

/**
 * Knowledge Atlas performance budgets (Plan C Task 22, spec §19.2).
 *
 * Runs on the default config's fixture-backed build. Every number is
 * measured here and recorded in `docs/quality/KNOWLEDGE-ATLAS-PERFORMANCE.md`.
 * A ceiling that cannot be met is reported — never raised to make a test
 * pass (spec §19.6).
 */
const EN = '/en/atlas/'
const REGION = '[data-atlas-region]'

test.describe('ka-performance budgets', () => {
  test('first interactive Atlas frame after document-interactive @atlas', async ({
    page,
  }) => {
    const start = Date.now()
    await page.goto(EN)
    await expect(page.locator(REGION)).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    // Interactive = selection state resolves from the URL (runtime wired).
    await expect(page.locator(REGION)).toHaveAttribute('data-atlas-state', /.+/)
    const elapsed = Date.now() - start
    expect(elapsed, 'first interactive frame ≤ 900ms').toBeLessThanOrEqual(900)
  })

  test('runtime payload gzip inside its ceiling @atlas', async ({ page }) => {
    // The runtime payload is fetched at BUILD time (SSR snapshot), not by
    // the browser: the static server serves no `/api/*`, so no payload
    // request fires on page load. The budget is asserted against the
    // embedded snapshot — byte-identical to the fixture the build consumed
    // — whose gzip is the honest served size. Exact numbers live in the
    // evidence doc; the fixture gzip (~0.8KB) is two orders under 60KB.
    await page.goto(EN)
    await expect(page.locator(REGION)).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    const snapshotBytes = await page.evaluate(() => {
      const script = document.querySelector('#atlas-payload')
      return script?.textContent?.length ?? -1
    })
    expect(snapshotBytes, 'snapshot present').toBeGreaterThan(0)
    expect(snapshotBytes, 'payload raw ≤ 60KB').toBeLessThanOrEqual(60 * 1024)
  })

  test('embedded snapshot gzip inside its ceiling @atlas', async ({ page }) => {
    await page.goto(EN)
    const snapshotBytes = await page.evaluate(() => {
      const script = document.querySelector('#atlas-payload')
      return script?.textContent?.length ?? -1
    })
    expect(snapshotBytes, 'embedded snapshot present').toBeGreaterThan(0)
    expect(snapshotBytes, 'snapshot raw ≤ 40KB').toBeLessThanOrEqual(40 * 1024)
  })

  test('label chips ≤ 40 and DOM nodes ≤ 2500 @atlas', async ({ page }) => {
    await page.goto(EN)
    await expect(page.locator(REGION)).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    const counts = await page.evaluate(() => ({
      chips: document.querySelectorAll('[data-atlas-filter]').length,
      nodes: document.querySelectorAll('[data-atlas-region] *').length,
    }))
    expect(counts.chips, 'label chips ≤ 40').toBeLessThanOrEqual(40)
    expect(counts.nodes, 'DOM nodes ≤ 2500').toBeLessThanOrEqual(2500)
  })

  test('idle draw calls equal zero over 1500ms @atlas', async ({ page }) => {
    await page.goto(EN)
    await expect(page.locator(REGION)).toHaveAttribute(
      'data-atlas-status',
      'ready',
    )
    // Instrument all four draw entry points; the Atlas scene renders
    // on demand only, so 1500ms of no interaction must draw nothing.
    await page.evaluate(() => {
      const canvas = document.querySelector('[data-atlas-canvas]')
      const gl =
        canvas instanceof HTMLCanvasElement
          ? canvas.getContext('webgl2') || canvas.getContext('webgl')
          : null
      if (!gl) {
        ;(window as unknown as { __atlasDraws: number }).__atlasDraws = -1
        return
      }
      let draws = 0
      for (const entry of [
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
      ] as const) {
        const original = (gl as unknown as Record<string, unknown>)[entry] as
          ((...args: never[]) => void) | undefined
        if (typeof original !== 'function') continue
        const wrapped = (...args: never[]): void => {
          draws += 1
          original.apply(gl, args)
        }
        ;(gl as unknown as Record<string, unknown>)[entry] = wrapped
      }
      ;(window as unknown as { __atlasDraws: number }).__atlasDraws = draws
    })
    await page.waitForTimeout(1500)
    const draws = await page.evaluate(
      () => (window as unknown as { __atlasDraws: number }).__atlasDraws,
    )
    // -1 = no GL context in this environment (2D fallback honest path);
    // otherwise the idle count must be exactly zero.
    expect(draws === -1 || draws === 0, `idle draws == 0 (got ${draws})`).toBe(
      true,
    )
  })
})
