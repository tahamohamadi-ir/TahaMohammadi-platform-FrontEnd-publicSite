import { expect, test } from '@playwright/test'

/**
 * Task 22 — Knowledge Atlas performance probes (browser).
 * Hermetic fixture build. Assertions use product data attributes only.
 */

const ATLAS_EN = '/en/atlas/'

test.describe('Knowledge Atlas performance budgets @performance', () => {
  test('idle draw instrumentation stays at zero after settle', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const counts = {
        drawArrays: 0,
        drawElements: 0,
        drawArraysInstanced: 0,
        drawElementsInstanced: 0,
      }
      ;(
        window as unknown as { __atlasDrawCounts?: typeof counts }
      ).__atlasDrawCounts = counts

      const patch = (
        proto: WebGLRenderingContext | WebGL2RenderingContext,
        name: keyof typeof counts,
      ) => {
        const original = (
          proto as unknown as Record<string, (...args: unknown[]) => unknown>
        )[name]
        if (typeof original !== 'function') return
        ;(proto as unknown as Record<string, (...args: unknown[]) => unknown>)[
          name
        ] = function patched(this: unknown, ...args: unknown[]) {
          counts[name] += 1
          return original.apply(this, args)
        }
      }

      for (const Proto of [WebGLRenderingContext, WebGL2RenderingContext]) {
        if (!Proto) continue
        patch(Proto.prototype, 'drawArrays')
        patch(Proto.prototype, 'drawElements')
        patch(Proto.prototype, 'drawArraysInstanced')
        patch(Proto.prototype, 'drawElementsInstanced')
      }
    })

    await page.goto(ATLAS_EN)
    const region = page.locator('[data-atlas-region]')
    await expect(region).toHaveAttribute('data-atlas-status', 'ready')
    await page.waitForTimeout(1600)

    const idleDraws = await page.evaluate(() => {
      const counts = (
        window as unknown as {
          __atlasDrawCounts?: Record<string, number>
        }
      ).__atlasDrawCounts
      if (!counts) return null
      return Object.values(counts).reduce((sum, value) => sum + value, 0)
    })

    // list/2d paths never create a GL context — treat as 0 idle draws.
    // enhanced 3D paths must not keep drawing while idle after settle.
    expect(idleDraws === null || idleDraws === 0).toBeTruthy()
  })

  test('budget: payload script stays under gzip ceiling proxy', async ({
    page,
  }) => {
    await page.goto(ATLAS_EN)
    const payloadText = await page
      .locator(
        'script#atlas-payload, script[data-atlas-payload], script.atlas-payload',
      )
      .first()
      .textContent()
      .catch(() => null)
    const embedded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      const hit = scripts.find((script) =>
        (script.textContent ?? '').includes('"contractVersion"'),
      )
      return hit?.textContent ?? ''
    })
    const text = payloadText || embedded
    expect(text.length).toBeGreaterThan(0)
    // Raw character length of the small en fixture is far below 40 KiB gzip ceiling.
    expect(text.length).toBeLessThan(40 * 1024)
  })
})
