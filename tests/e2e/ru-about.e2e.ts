import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * RU-2 — About browser coverage for the fully interactive Research Universe.
 *
 * Same fixture contract as `ru-home.e2e.ts`: the published graph and resolver are
 * served by the E2E API fixture, so these assertions run against a READY graph.
 *
 * Orientation, zoom and selection are observed through the DOM the product already
 * publishes — projected label coordinates, `data-universe-*` state, and the factual
 * panels — so no debug hook is added to production code and no assertion depends on
 * a screenshot guess.
 *
 * The stage sits below the fold on this page, so every test scrolls it into view
 * before using viewport coordinates. Without that, `page.mouse` coordinates fall
 * outside the viewport and no pointer event is delivered at all — which silently
 * makes an interaction test pass or fail for the wrong reason.
 */

const ABOUT = '/en/about/'

const region = '[data-universe-region][data-universe-mode="about"]'
const canvas = `${region} canvas[data-universe-canvas]`
const stage = `${region} [data-universe-scene]`

/** Navigate, wait for the real scene, and put the interactive area on screen. */
async function openAbout(page: Page): Promise<void> {
  await page.goto(ABOUT)
  await expect(page.locator(region)).toHaveAttribute(
    'data-universe-enhancement',
    'enhanced',
  )
  await page.locator(stage).scrollIntoViewIfNeeded()
  await page.waitForTimeout(450)
}

/** Centre of the interactive stage, in viewport coordinates. */
async function stageCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator(stage).boundingBox()
  return {
    x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
    y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
  }
}

function labelPositions(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.ru-label'))
      .filter((element) => !(element as HTMLElement).hidden)
      .map(
        (element) =>
          `${element.getAttribute('data-projected-label')}:${(element as HTMLElement).style.left},${(element as HTMLElement).style.top}`,
      ),
  )
}

/** Mean pairwise spread of the visible labels: grows with zoom-in, shrinks out. */
async function labelSpread(page: Page) {
  return page.evaluate(() => {
    const points = Array.from(document.querySelectorAll('.ru-label'))
      .filter((element) => !(element as HTMLElement).hidden)
      .map((element) => {
        const style = (element as HTMLElement).style
        return {
          x: Number.parseFloat(style.left),
          y: Number.parseFloat(style.top),
        }
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    if (points.length < 2) return 0
    let total = 0
    let pairs = 0
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        total += Math.hypot(
          points[i]!.x - points[j]!.x,
          points[i]!.y - points[j]!.y,
        )
        pairs += 1
      }
    }
    return pairs > 0 ? total / pairs : 0
  })
}

async function wheel(page: Page, deltaY: number, times = 1) {
  const centre = await stageCentre(page)
  await page.mouse.move(centre.x, centre.y)
  for (let index = 0; index < times; index += 1) {
    await page.mouse.wheel(0, deltaY)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(250)
}

async function drag(page: Page, dx: number, dy: number) {
  const centre = await stageCentre(page)
  await page.mouse.move(centre.x, centre.y)
  await page.mouse.down()
  const steps = 10
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(
      centre.x + (dx * step) / steps,
      centre.y + (dy * step) / steps,
    )
    await page.waitForTimeout(8)
  }
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test.describe('RU-2 About universe', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    // Objective draw counter: patching the WebGL prototypes is the only way to
    // measure "the scene went quiet" without adding a hook to product code.
    await page.addInitScript(() => {
      const probe = { value: 0 }
      ;(window as unknown as { __ruDraws?: { value: number } }).__ruDraws =
        probe
      const bump = () => {
        probe.value += 1
      }
      for (const name of [
        'WebGLRenderingContext',
        'WebGL2RenderingContext',
      ] as const) {
        const ctor = (
          window as unknown as Record<string, { prototype?: unknown }>
        )[name]
        const proto = ctor?.prototype as
          | {
              drawArrays?: (...args: unknown[]) => unknown
              drawElements?: (...args: unknown[]) => unknown
            }
          | undefined
        if (!proto?.drawArrays || !proto.drawElements) continue
        const originalArrays = proto.drawArrays
        const originalElements = proto.drawElements
        proto.drawArrays = function (this: unknown, ...args: unknown[]) {
          bump()
          return originalArrays.apply(this, args)
        }
        proto.drawElements = function (this: unknown, ...args: unknown[]) {
          bump()
          return originalElements.apply(this, args)
        }
      }
    })
  })

  test('1+2. the scene loads with exactly one active canvas', async ({
    page,
  }) => {
    await openAbout(page)
    await expect(page.locator(region)).toHaveAttribute(
      'data-graph-status',
      'ready',
    )
    expect(await page.locator('canvas').count()).toBe(1)
    await expect(page.locator(canvas)).toBeVisible()
    const box = await page.locator(canvas).boundingBox()
    // The brief's 70-85vh interactive area.
    expect(box?.height ?? 0).toBeGreaterThan(400)
    expect(await labelPositions(page)).toHaveLength(4)
  })

  test('3. pointer drag changes the scene orientation', async ({ page }) => {
    await openAbout(page)
    const before = await labelPositions(page)
    await drag(page, 180, 45)
    const after = await labelPositions(page)

    expect(after.join('|')).not.toBe(before.join('|'))
    // The constellation itself is NOT scaled, rotated or transformed in the DOM:
    // the change came from the camera.
    const transform = await page.evaluate(
      (selector) =>
        getComputedStyle(document.querySelector(selector)!).transform,
      canvas,
    )
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transform)
    // And the canvas is still the only one.
    expect(await page.locator('canvas').count()).toBe(1)
  })

  test('3b. a drag does not double as a selection', async ({ page }) => {
    await openAbout(page)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'false',
    )
    await drag(page, 150, 0)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'false',
    )
    // A drag moved the camera, so the pose must differ from the canonical one.
    const moved = await labelPositions(page)
    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await page.waitForTimeout(700)
    expect((await labelPositions(page)).join('|')).not.toBe(moved.join('|'))
  })

  test('4. zoom is constrained to its bounds', async ({ page }) => {
    await openAbout(page)
    const scrollBefore = await page.evaluate(() => window.scrollY)
    // Zoom in far past the clamp, then again: the spread must stop changing.
    await wheel(page, -240, 10)
    const saturated = await labelSpread(page)
    await wheel(page, -240, 6)
    const stillSaturated = await labelSpread(page)
    expect(Math.abs(stillSaturated - saturated)).toBeLessThan(6)

    // The wheel belongs to the universe: the page must not scroll with it.
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)

    // And the same bound in the other direction.
    await wheel(page, 240, 20)
    const far = await labelSpread(page)
    await wheel(page, 240, 6)
    const stillFar = await labelSpread(page)
    expect(Math.abs(stillFar - far)).toBeLessThan(6)
    expect(far).toBeLessThan(saturated)
  })

  test('5. reset restores the canonical view', async ({ page }) => {
    await openAbout(page)
    const canonical = await labelPositions(page)
    await drag(page, 180, 60)
    await wheel(page, -240, 5)
    const moved = await labelPositions(page)
    expect(moved.join('|')).not.toBe(canonical.join('|'))

    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await page.waitForTimeout(800)
    const restored = await labelPositions(page)
    // Compared per label id: the chip identity is stable, so this proves each node
    // returned to its canonical position rather than comparing sorted strings.
    const parse = (entries: string[]) => {
      const map = new Map<string, { x: number; y: number }>()
      for (const entry of entries) {
        const [id, coords] = entry.split('@')
        const [x, y] = (coords ?? '').split(',').map(Number)
        if (id) map.set(id, { x: x ?? 0, y: y ?? 0 })
      }
      return map
    }
    const canonicalById = parse(canonical)
    const restoredById = parse(restored)
    expect(restoredById.size).toBe(canonicalById.size)
    for (const [id, point] of canonicalById) {
      const back = restoredById.get(id)
      expect(back).toBeDefined()
      expect(Math.abs((back?.x ?? 0) - point.x)).toBeLessThan(14)
      expect(Math.abs((back?.y ?? 0) - point.y)).toBeLessThan(14)
    }
  })

  test('6+7. node selection drives the semantic panels with published facts', async ({
    page,
  }) => {
    await openAbout(page)
    // A leaf topic is selected: the centre is incident to every node, so selecting
    // it would legitimately dim nothing and prove less. Published `research-topic`
    // nodes classify as level-1 `domain`, which is what the DOM publishes.
    const topic = page.locator(
      '[data-universe-node][data-universe-kind="domain"]',
    )
    expect(await topic.count()).toBe(3)
    const node = topic.last()
    const label = await node.getAttribute('data-universe-label')
    expect(label).not.toBeNull()

    await node.locator('summary').click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await expect(node).toHaveAttribute('data-selected', 'true')
    const panel = page.locator('[data-universe-node-panel]')
    await expect(panel).toHaveAttribute('data-has-selection', 'true')
    await expect(
      panel.locator('[data-universe-node-detail][data-active="true"]'),
    ).toContainText(label ?? '')

    // Its two sibling topics dim; the centre stays lit because it is incident.
    const dimmed = page.locator('[data-universe-node][data-dimmed="true"]')
    await expect(dimmed).toHaveCount(2)
    await expect(
      page.locator(
        '[data-universe-node][data-universe-kind="person"][data-dimmed="true"]',
      ),
    ).toHaveCount(0)
  })

  test('8. the central nucleus resolves to the published identity record', async ({
    page,
  }) => {
    await openAbout(page)
    // Click the nucleus where it actually projects: the projector publishes the
    // node's own coordinates on its label chip.
    const target = await page.evaluate(
      (selectors) => {
        const label = document.querySelector(
          `${selectors.region} .ru-label[data-projected-label="identity"]`,
        ) as HTMLElement | null
        const element = document.querySelector(selectors.stage)
        if (!label || !element) return null
        const box = element.getBoundingClientRect()
        return {
          x: box.left + Number.parseFloat(label.style.left),
          y: box.top + Number.parseFloat(label.style.top),
        }
      },
      { region, stage },
    )
    expect(target).not.toBeNull()

    // Prove the click landed on the canvas, not on some overlay.
    const probed = await page.evaluate((point) => {
      const hit = document.elementFromPoint(point.x, point.y)
      return hit ? `${hit.tagName.toLowerCase()}.${hit.className}` : null
    }, target!)
    expect(probed).toContain('canvas')

    await page.mouse.click(target!.x, target!.y)
    await page.waitForTimeout(350)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    const active = page.locator(
      '[data-universe-node-detail][data-active="true"]',
    )
    await expect(active).toContainText('Taha Mohammadi')
    // Its published related record is the profile, so the About route is offered.
    await expect(active.locator('a[href="/en/about/"]')).toHaveCount(1)
    // Exactly one identity is selectable: no duplicate generic node at the centre.
    await expect(
      page.locator('[data-universe-node][data-selected="true"]'),
    ).toHaveCount(1)
    await expect(
      page.locator(
        '[data-universe-node][data-universe-kind="person"][data-selected="true"]',
      ),
    ).toHaveCount(1)
  })

  test('9+10+11. relationship selection reports real endpoints only', async ({
    page,
  }) => {
    await openAbout(page)
    const edge = page.locator('[data-universe-edge]').first()
    const source = await edge.getAttribute('data-source')
    const target = await edge.getAttribute('data-target')
    await edge.locator('button').click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await expect(edge).toHaveAttribute('data-selected', 'true')
    await expect(edge.locator('button')).toHaveAttribute('aria-pressed', 'true')

    const panel = page.locator('[data-universe-edge-panel]')
    await expect(panel).toHaveAttribute('data-has-selection', 'true')
    const detail = panel.locator(
      '[data-universe-edge-detail][data-active="true"]',
    )
    await expect(detail).toBeVisible()
    const text = (await detail.innerText()).trim()
    expect(text.length).toBeGreaterThan(0)

    // Both endpoints are published node ids in the rendered graph.
    const nodeIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-universe-node]')).map(
        (element) => element.getAttribute('data-universe-node'),
      ),
    )
    expect(nodeIds).toHaveLength(4)
    expect(nodeIds).toContain(source)
    expect(nodeIds).toContain(target)

    // The published payload carries no explanation for these relationships, so the
    // panel must not invent one.
    expect(
      await page
        .locator('[data-universe-edge-detail] .ru-panel__summary')
        .count(),
    ).toBe(0)
    await expect(detail).toContainText('research focus')
  })

  test('12. the theme can switch while the scene is live', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await openAbout(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const before = await labelPositions(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // Same pose, one canvas, no reload.
    expect(await page.locator('canvas').count()).toBe(1)
    expect((await labelPositions(page)).join('|')).toBe(before.join('|'))
  })

  test('13. context loss degrades safely and keeps the semantics', async ({
    page,
  }) => {
    await openAbout(page)
    await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLCanvasElement
      element.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    }, canvas)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'fallback',
    )
    await expect(page.locator(canvas)).toBeHidden()
    // The whole universe is still browsable as HTML.
    await expect(page.locator('[data-universe-node]')).toHaveCount(4)
    await page
      .locator('[data-universe-node]')
      .first()
      .locator('summary')
      .click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
  })

  test('14. keyboard semantics work without touching the canvas', async ({
    page,
  }) => {
    await openAbout(page)
    const summary = page.locator('[data-universe-node] summary').first()
    await summary.focus()
    await expect(summary).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await expect(summary).toHaveAttribute('aria-expanded', 'true')

    // Escape clears the selection and returns focus to the initiating control.
    await page.keyboard.press('Escape')
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'false',
    )
    await expect(summary).toBeFocused()

    // The canvas itself is never a tab stop.
    expect(
      await page.evaluate(
        () =>
          Array.from(document.querySelectorAll('canvas')).filter(
            (element) => (element as HTMLElement).tabIndex >= 0,
          ).length,
      ),
    ).toBe(0)
  })

  test('15. mobile keeps the interactive universe usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(450)
    const metrics = await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLCanvasElement
      return { width: element.width, clientWidth: element.clientWidth }
    }, canvas)
    // Mobile DPR ceiling of 1.0.
    expect(metrics.width).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.clientWidth).toBeLessThan(768)

    // The stage must fit the mobile content box. It used to be 293px wide
    // because the section repeated the template's page gutter.
    const stageBox = await page.locator(stage).boundingBox()
    expect(stageBox?.width ?? 0).toBeGreaterThanOrEqual(320)
    expect(stageBox?.width ?? 0).toBeLessThanOrEqual(360)
    // The canvas is the stage's own size, not an independently sized box.
    expect(metrics.clientWidth).toBeLessThanOrEqual(
      await page.locator(stage).evaluate((el) => el.clientWidth),
    )

    // No horizontal page overflow, with a tolerance for scrollbar rounding.
    const scroll = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }))
    expect(scroll.doc).toBeLessThanOrEqual(scroll.inner + 2)

    // The universe is still interactive by real pointer input at this width.
    await drag(page, 90, 30)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    // Controls stay reachable and the facts stay readable.
    await expect(
      page.locator(`${region} [data-universe-action="reset"]`),
    ).toBeVisible()
    await page.locator('[data-universe-edge] button').first().click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
  })

  test('15b. mobile canonical view keeps every node inside the stage', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    const box = await page.locator(stage).boundingBox()
    const width = box?.width ?? 0
    const height = box?.height ?? 0
    expect(width).toBeGreaterThan(0)

    // Node positions are published on the label chips (`style.left/top` is the
    // projected node CENTRE; the chip itself is raised above it), so this needs
    // no debug hook in product code.
    const nodes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ru-label'))
        .filter((element) => !(element as HTMLElement).hidden)
        .map((element) => ({
          id: element.getAttribute('data-projected-label') ?? '',
          x: Number.parseFloat((element as HTMLElement).style.left),
          y: Number.parseFloat((element as HTMLElement).style.top),
        })),
    )
    expect(nodes.length).toBeGreaterThanOrEqual(4)
    // Every main node projects inside the stage, not off its edge.
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(width)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(height)
    }

    // And the constellation is centred, not pushed into a corner.
    const centroidX =
      nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length
    const centroidY =
      nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length
    expect(Math.abs(centroidX - width / 2)).toBeLessThan(width * 0.16)
    expect(Math.abs(centroidY - height / 2)).toBeLessThan(height * 0.16)

    // Labels stay readable: every chip is on screen and intersects the stage.
    const chips = await page.evaluate(() => {
      const scene = document.querySelector('[data-universe-scene]')
      const sceneBox = scene?.getBoundingClientRect()
      return Array.from(document.querySelectorAll('.ru-label'))
        .filter((element) => !(element as HTMLElement).hidden)
        .map((element) => {
          const rect = element.getBoundingClientRect()
          const text = (element as HTMLElement).innerText.trim()
          return {
            text,
            overflowsLeft: sceneBox != null && rect.left < sceneBox.left - 1,
            overflowsRight: sceneBox != null && rect.right > sceneBox.right + 1,
            clippedText: text.length === 0,
          }
        })
    })
    expect(chips.length).toBe(nodes.length)
    for (const chip of chips) {
      expect(chip.clippedText).toBe(false)
      expect(chip.overflowsLeft).toBe(false)
      expect(chip.overflowsRight).toBe(false)
    }
  })

  test('15c. shrinking the viewport can never leave the stage wider than it', async ({
    page,
  }) => {
    // Regression guard: the canvas used to be laid out from its own backing-store
    // attributes, which the scene writes from `stage.clientWidth`. That made the
    // old, wide size an intrinsic floor for every ancestor track, so a shrink to
    // mobile kept the desktop stage width (927px at a 390px viewport), overflowed
    // the page and then grew the canvas again on the next resize event.
    await page.setViewportSize({ width: 1024, height: 800 })
    await openAbout(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(600)

    const state = await page.evaluate(
      (selectors) => {
        const scene = document.querySelector(selectors.stage) as HTMLElement
        const element = document.querySelector(
          selectors.canvas,
        ) as HTMLCanvasElement
        return {
          inner: window.innerWidth,
          doc: document.documentElement.scrollWidth,
          stage: scene.clientWidth,
          canvasCss: element.clientWidth,
          canvasBacking: element.width,
        }
      },
      { stage, canvas },
    )

    expect(state.doc).toBeLessThanOrEqual(state.inner + 2)
    expect(state.stage).toBeLessThanOrEqual(state.inner)
    expect(state.canvasCss).toBeLessThanOrEqual(state.stage)
    // The scene re-measured itself for the new width (mobile DPR ceiling = 1).
    expect(state.canvasBacking).toBeLessThanOrEqual(state.stage)
  })

  test('16. prefers-reduced-motion stays usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await expect(page.locator(canvas)).toBeVisible()
    // Reset/focus become instant instead of animated, but still work.
    await page.locator('[data-universe-node] summary').first().click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
  })

  test('17. no render loop survives the interaction', async ({ page }) => {
    await openAbout(page)
    await drag(page, 160, 40)
    await wheel(page, -240, 4)
    await page.locator(`${region} [data-universe-action="reset"]`).click()
    // Let any finite transition settle, then require the scene to go quiet.
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      const probe = (window as unknown as { __ruDraws?: { value: number } })
        .__ruDraws
      if (probe) probe.value = 0
    })
    await page.waitForTimeout(1200)
    const idleDraws = await page.evaluate(
      () =>
        (window as unknown as { __ruDraws?: { value: number } }).__ruDraws
          ?.value ?? -1,
    )
    expect(idleDraws).toBe(0)
  })
})
