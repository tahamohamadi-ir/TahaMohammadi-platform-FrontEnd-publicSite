import { expect, test } from '@playwright/test'

/**
 * RU-2 — Home browser coverage for the Research Universe.
 *
 * Requires the E2E API fixture (published graph + resolver), which the Playwright
 * web server starts automatically; every assertion below therefore runs against a
 * READY published graph rather than a fallback, and the suite fails loudly if that
 * input disappears instead of silently skipping the 3D layer.
 *
 * Drawing is measured by instrumenting the WebGL draw entry points from an init
 * script. That is test-only, deterministic and independent of how the scene is
 * written internally — no debug surface is added to production code, and no
 * screenshot-diff guesswork is involved.
 */

const HOME = '/en/'

declare global {
  interface Window {
    __ru?: { draws: number }
  }
}

async function installDrawCounter(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const state = { draws: 0 }
    window.__ru = state
    type DrawProto = {
      drawArrays: (...args: unknown[]) => unknown
      drawElements: (...args: unknown[]) => unknown
    }
    for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const ctor = (window as unknown as Record<string, unknown>)[name] as
        { prototype?: DrawProto } | undefined
      const proto = ctor?.prototype
      if (!proto) continue
      for (const method of ['drawArrays', 'drawElements'] as const) {
        const original = proto[method]
        if (typeof original !== 'function') continue
        proto[method] = function patched(this: unknown, ...args: unknown[]) {
          state.draws += 1
          return original.apply(this, args)
        }
      }
    }
  })
}

function draws(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.__ru?.draws ?? 0)
}

async function resetDraws(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    if (window.__ru) window.__ru.draws = 0
  })
}

function labelPositions(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.ru-label'))
      .filter((element) => !(element as HTMLElement).hidden)
      .map(
        (element) =>
          `${element.getAttribute('data-projected-label')}@${(element as HTMLElement).style.left},${(element as HTMLElement).style.top}`,
      ),
  )
}

const region = '[data-universe-region][data-universe-mode="home"]'
const canvas = `${region} canvas[data-universe-canvas]`

test.describe('RU-2 Home universe', () => {
  test.beforeEach(async ({ page }) => {
    await installDrawCounter(page)
  })

  test('1. semantic content exists before enhancement and without JavaScript', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
    })
    const noJs = await context.newPage()
    await noJs.goto(HOME)

    // The published graph is rendered as HTML: list, relationship controls, and
    // factual panels, all without a single script running.
    await expect(noJs.locator('[data-universe-node]')).toHaveCount(4)
    await expect(noJs.locator('[data-universe-edge]')).toHaveCount(3)
    await expect(noJs.locator('[data-universe-edge] button')).toHaveCount(3)
    await expect(
      noJs.locator('[data-universe-node] .hg-node__label').first(),
    ).toBeVisible()
    // No enhancement ran: the canvas stays hidden and nothing claims success. The
    // enhancement attribute is written BY the enhancement module, so without
    // JavaScript it must be absent rather than a claim of any state.
    await expect(noJs.locator(canvas)).toHaveCount(1)
    await expect(noJs.locator(canvas)).toBeHidden()
    await expect(noJs.locator(region)).toHaveAttribute(
      'data-hero-enhancement',
      'idle',
    )
    expect(
      await noJs.locator(region).getAttribute('data-universe-enhancement'),
    ).not.toBe('enhanced')
    await context.close()
  })

  test('2+3. exactly one active canvas, and the scene enhances', async ({
    page,
  }) => {
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-graph-status',
      'ready',
    )
    // Exactly one canvas for the universe, and no second one anywhere.
    expect(await page.locator('[data-universe-canvas]').count()).toBe(1)
    expect(await page.locator('canvas').count()).toBe(1)

    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await expect(page.locator(canvas)).toBeVisible()
    const box = await page.locator(canvas).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(100)
    expect(box?.height ?? 0).toBeGreaterThan(100)
    // One frame of real drawing proves the renderer is alive, not just mounted.
    await resetDraws(page)
    await page.setViewportSize({ width: 1200, height: 900 })
    await expect.poll(() => draws(page)).toBeGreaterThan(0)
    // HTML labels are projected onto the same viewport.
    expect(await labelPositions(page)).toHaveLength(4)
  })

  test('4. dark theme renders', async ({ page }) => {
    // The theme bootstrap resolves the system preference, so the dark case is
    // requested explicitly rather than assumed.
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(HOME)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await resetDraws(page)
    await page.setViewportSize({ width: 1180, height: 880 })
    await expect.poll(() => draws(page)).toBeGreaterThan(0)
    // Leader stems are the signature-token line in both themes.
    const stroke = await page.evaluate(() => {
      const line = document.querySelector('.ru-leaders line')
      return line ? getComputedStyle(line).stroke : null
    })
    expect(stroke).not.toBeNull()
  })

  test('5. light theme renders, and the theme can switch while the scene is live', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(HOME)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await resetDraws(page)
    await page.setViewportSize({ width: 1170, height: 870 })
    await expect.poll(() => draws(page)).toBeGreaterThan(0)

    // Switching theme re-tints the SAME scene: no reload, no second canvas.
    // The site's control is a cycle rather than a two-state switch, so click until
    // the requested theme is actually reached.
    const toggle = page.locator('[data-theme-toggle]').first()
    await expect(toggle).toHaveCount(1)
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if ((await page.locator('html').getAttribute('data-theme')) === 'dark')
        break
      await toggle.click()
      await page.waitForTimeout(200)
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    expect(await page.locator('canvas').count()).toBe(1)
    await resetDraws(page)
    await page.setViewportSize({ width: 1160, height: 860 })
    await expect.poll(() => draws(page)).toBeGreaterThan(0)
  })

  test('6+7+8. scroll changes the pose deterministically, without scaling the scene', async ({
    page,
  }) => {
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )

    const before = await labelPositions(page)
    const canvasBoxBefore = await page.locator(canvas).boundingBox()
    const transformBefore = await page.evaluate(
      (selector) =>
        getComputedStyle(document.querySelector(selector)!).transform,
      canvas,
    )

    // Drive the track through its travel. `data-universe-progress` is the scene's
    // own record of the scroll input, so it is asserted directly.
    await page.evaluate(() => {
      const track = document.querySelector('[data-universe-track]')
      track?.scrollIntoView({ block: 'start' })
    })
    await page.waitForTimeout(150)
    await expect
      .poll(async () =>
        Number(
          (await page.locator(region).getAttribute('data-universe-progress')) ??
            '0',
        ),
      )
      .toBeGreaterThan(0)

    const state = await page.locator(region).getAttribute('data-universe-state')
    expect(['1', '2', '3', '4']).toContain(state ?? '')
    const progress = Number(
      await page.locator(region).getAttribute('data-universe-progress'),
    )
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThanOrEqual(1)

    // The pose is expressed as camera and group transforms, so the projected
    // labels move while the canvas element itself does NOT scale or resize.
    const after = await labelPositions(page)
    expect(after.join('|')).not.toBe(before.join('|'))
    const canvasBoxAfter = await page.locator(canvas).boundingBox()
    expect(Math.round(canvasBoxAfter?.width ?? 0)).toBe(
      Math.round(canvasBoxBefore?.width ?? 0),
    )
    expect(Math.round(canvasBoxAfter?.height ?? 0)).toBe(
      Math.round(canvasBoxBefore?.height ?? 0),
    )
    const transformAfter = await page.evaluate(
      (selector) =>
        getComputedStyle(document.querySelector(selector)!).transform,
      canvas,
    )
    expect(transformAfter).toBe(transformBefore)
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transformAfter)
  })

  test('9. reduced motion keeps the universe static and usable', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await expect(page.locator(canvas)).toBeVisible()
    // No scroll driver is attached in reduced motion, so the storyboard never
    // advances: the scene holds its front pose.
    await page.evaluate(() => window.scrollBy(0, 600))
    await page.waitForTimeout(200)
    expect(
      await page.locator(region).getAttribute('data-universe-state'),
    ).toBeNull()
    expect(
      await page.locator(region).getAttribute('data-universe-progress'),
    ).toBeNull()
    // Content is still fully readable.
    await expect(
      page.locator('[data-universe-node] .hg-node__label').first(),
    ).toBeVisible()
  })

  test.describe('device pixel ratio ceilings', () => {
    // Force a high ratio so the clamps are actually exercised instead of being a
    // no-op on a headless default of 1.
    test.use({ deviceScaleFactor: 3 })

    test('10. desktop is capped at 1.5 and mobile at 1.0', async ({ page }) => {
      // A viewport small enough that the drawing-buffer ceiling does not bite first,
      // so this measures the DPR ceiling itself.
      await page.setViewportSize({ width: 900, height: 600 })
      await page.goto(HOME)
      await expect(page.locator(region)).toHaveAttribute(
        'data-universe-enhancement',
        'enhanced',
      )
      const desktop = await page.evaluate((selector) => {
        const element = document.querySelector(selector) as HTMLCanvasElement
        return {
          ratio: element.width / Math.max(element.clientWidth, 1),
          dpr: window.devicePixelRatio,
        }
      }, canvas)
      expect(desktop.dpr).toBeGreaterThan(1.5)
      expect(desktop.ratio).toBeCloseTo(1.5, 2)

      // At a large viewport the buffer-pixel ceiling reduces the ratio further:
      // either way it can never exceed the declared 1.5.
      await page.setViewportSize({ width: 1440, height: 900 })
      await expect
        .poll(async () =>
          page.evaluate((selector) => {
            const element = document.querySelector(
              selector,
            ) as HTMLCanvasElement
            return (
              Math.round(
                (element.width / Math.max(element.clientWidth, 1)) * 100,
              ) / 100
            )
          }, canvas),
        )
        .toBeLessThanOrEqual(1.5)

      await page.setViewportSize({ width: 390, height: 844 })
      // Wait for the resize handler to land, exactly like the desktop case above.
      // Measured without this wait the read can still see the DESKTOP backing store
      // (638/260 = 2.4538) purely because the scene applies its clamp on the resize
      // event. Polling does not weaken the ceiling: a genuine violation stays above
      // 1 and times the poll out.
      await expect
        .poll(async () =>
          page.evaluate((selector) => {
            const element = document.querySelector(
              selector,
            ) as HTMLCanvasElement
            return (
              Math.round(
                (element.width / Math.max(element.clientWidth, 1)) * 100,
              ) / 100
            )
          }, canvas),
        )
        .toBeLessThanOrEqual(1)
      const mobile = await page.evaluate((selector) => {
        const element = document.querySelector(selector) as HTMLCanvasElement
        return {
          ratio: element.width / Math.max(element.clientWidth, 1),
          heightRatio: element.height / Math.max(element.clientHeight, 1),
          clientWidth: element.clientWidth,
        }
      }, canvas)
      expect(mobile.clientWidth).toBeLessThan(768)
      // Mobile ceiling is 1.0: the drawing buffer never exceeds the CSS box.
      expect(mobile.ratio).toBeLessThanOrEqual(1)
      expect(mobile.heightRatio).toBeLessThanOrEqual(1)
    })
  })

  test('11. the scene does not render while idle', async ({ page }) => {
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // Settle, then measure a defined idle window with no input at all.
    await page.waitForTimeout(400)
    await resetDraws(page)
    await page.waitForTimeout(1200)
    const idleDraws = await draws(page)

    // ...and prove the counter observes real work, so a zero is meaningful.
    await page.evaluate(() => window.scrollBy(0, 400))
    await expect.poll(() => draws(page)).toBeGreaterThan(0)
    expect(idleDraws).toBe(0)
  })

  test('12. a failed scene keeps the semantic fallback usable', async ({
    page,
  }) => {
    // Abort the lazily-imported graphics chunks: the semantic presentation must
    // survive without reload, without a canvas, and without claiming success.
    // Abort ONLY the scene chunks: the enhancement module must load and take its
    // documented fallback path, which is what keeps the semantic HTML working when
    // WebGL cannot start. Aborting the enhancement too would test nothing.
    await page.route(/(home-scene|about-scene)\./, (route) => route.abort())
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'fallback',
    )
    await expect(page.locator(canvas)).toBeHidden()
    await expect(page.locator('[data-universe-node]')).toHaveCount(4)
    await expect(page.locator('[data-universe-edge] button')).toHaveCount(3)
    await expect(page.locator('[data-universe-node-panel]')).toBeVisible()
    // The relationship index is still operable as HTML.
    await page.locator('[data-universe-edge] button').first().click()
    await expect(
      page.locator('[data-universe-edge][data-selected="true"]'),
    ).toHaveCount(1)
    await page.unrouteAll({ behavior: 'wait' })
  })

  test('context loss degrades to the semantic fallback', async ({ page }) => {
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLCanvasElement
      const event = new Event('webglcontextlost', { cancelable: true })
      element.dispatchEvent(event)
    }, canvas)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'fallback',
    )
    await expect(page.locator(region)).toHaveAttribute(
      'data-enhancement-reason',
      'context-lost',
    )
    await expect(page.locator(canvas)).toBeHidden()
    await expect(page.locator('[data-universe-node]')).toHaveCount(4)
  })

  test('label leader stems track their nodes and hide with them', async ({
    page,
  }) => {
    await page.goto(HOME)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await page.waitForTimeout(300)

    const leaders = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ru-leaders line')).map((line) => ({
        id: line.getAttribute('data-leader-for'),
        visible: line.getAttribute('data-visible'),
        x1: line.getAttribute('x1'),
        x2: line.getAttribute('x2'),
      })),
    )
    expect(leaders.length).toBeGreaterThan(0)
    const visibleLeaders = leaders.filter((line) => line.visible === 'true')
    expect(visibleLeaders.length).toBeGreaterThan(0)
    // A stem is vertical and anchored on its node's x coordinate.
    for (const line of visibleLeaders) {
      expect(line.x1).toBe(line.x2)
      expect(Number(line.x1)).toBeGreaterThan(0)
    }
    // Every stem belongs to a projected label, so no line exists without a chip.
    const labelIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ru-label')).map((element) =>
        element.getAttribute('data-projected-label'),
      ),
    )
    for (const line of leaders) {
      expect(labelIds).toContain(line.id)
    }
  })
})
