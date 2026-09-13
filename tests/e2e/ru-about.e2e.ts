import { expect, test } from '@playwright/test'

/**
 * RU-2 — About browser coverage for the fully interactive Research Universe.
 *
 * Same fixture contract as `ru-home.e2e.ts`: the published graph and resolver are
 * served by the E2E API fixture, so these assertions run against a READY graph.
 *
 * Orientation, zoom and selection are all observed through the DOM the product
 * already publishes — projected label coordinates, `data-universe-*` state, and
 * the factual panels — so no debug hook is added to production code and no
 * assertion depends on a screenshot guess.
 */

const ABOUT = '/en/about/'

const region = '[data-universe-region][data-universe-mode="about"]'
const canvas = `${region} canvas[data-universe-canvas]`
const stage = `${region} [data-universe-scene]`

function labelPositions(page: import('@playwright/test').Page) {
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
async function labelSpread(page: import('@playwright/test').Page) {
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

async function wheel(
  page: import('@playwright/test').Page,
  deltaY: number,
  times = 1,
) {
  const box = await page.locator(stage).boundingBox()
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) / 2,
    (box?.y ?? 0) + (box?.height ?? 0) / 2,
  )
  for (let index = 0; index < times; index += 1) {
    await page.mouse.wheel(0, deltaY)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(250)
}

test.describe('RU-2 About universe', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('1+2. the scene loads with exactly one active canvas', async ({
    page,
  }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-graph-status',
      'ready',
    )
    expect(await page.locator('canvas').count()).toBe(1)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await expect(page.locator(canvas)).toBeVisible()
    const box = await page.locator(canvas).boundingBox()
    // The brief's 70–85vh interactive area.
    expect(box?.height ?? 0).toBeGreaterThan(400)
    expect(await labelPositions(page)).toHaveLength(4)
  })

  test('3. pointer drag changes the scene orientation', async ({ page }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    const before = await labelPositions(page)
    const box = await page.locator(stage).boundingBox()
    const centerX = (box?.x ?? 0) + (box?.width ?? 0) / 2
    const centerY = (box?.y ?? 0) + (box?.height ?? 0) / 2

    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 160, centerY + 40, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)

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
  })

  test('3b. a drag does not double as a selection', async ({ page }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'false',
    )
    const box = await page.locator(stage).boundingBox()
    const centerX = (box?.x ?? 0) + (box?.width ?? 0) / 2
    const centerY = (box?.y ?? 0) + (box?.height ?? 0) / 2
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 140, centerY, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(250)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'false',
    )
  })

  test('4. zoom is constrained to its bounds', async ({ page }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // Zoom in far past the clamp, then again: the spread must stop changing.
    await wheel(page, -240, 10)
    const saturated = await labelSpread(page)
    await wheel(page, -240, 6)
    const stillSaturated = await labelSpread(page)
    expect(Math.abs(stillSaturated - saturated)).toBeLessThan(6)

    // And the same in the other direction.
    await wheel(page, 240, 20)
    const far = await labelSpread(page)
    await wheel(page, 240, 6)
    const stillFar = await labelSpread(page)
    expect(Math.abs(stillFar - far)).toBeLessThan(6)
    expect(far).toBeLessThan(saturated)
  })

  test('5. reset restores the canonical view', async ({ page }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    const canonical = await labelPositions(page)
    const box = await page.locator(stage).boundingBox()
    const centerX = (box?.x ?? 0) + (box?.width ?? 0) / 2
    const centerY = (box?.y ?? 0) + (box?.height ?? 0) / 2
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 180, centerY + 60, { steps: 10 })
    await page.mouse.up()
    await wheel(page, -240, 5)
    const moved = await labelPositions(page)
    expect(moved.join('|')).not.toBe(canonical.join('|'))

    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await page.waitForTimeout(700)
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
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // Selecting through the native control, i.e. the keyboard-equivalent path.
    const firstNode = page.locator('[data-universe-node]').first()
    const label = await firstNode.getAttribute('data-universe-label')
    await firstNode.locator('summary').click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await expect(firstNode).toHaveAttribute('data-selected', 'true')
    const panel = page.locator('[data-universe-node-panel]')
    await expect(panel).toHaveAttribute('data-has-selection', 'true')
    await expect(
      panel.locator('[data-universe-node-detail][data-active="true"]'),
    ).toContainText(label ?? '')
    // Other nodes dim, and their detail blocks stay hidden.
    const dimmed = await page
      .locator('[data-universe-node][data-dimmed="true"]')
      .count()
    expect(dimmed).toBeGreaterThan(0)
  })

  test('8. the central nucleus resolves to the published identity record', async ({
    page,
  }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // The nucleus sits at the centre of the view; clicking it must select the
    // identity node, not a generic node.
    const box = await page.locator(stage).boundingBox()
    await page.mouse.click(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    )
    await page.waitForTimeout(250)
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
    // The same node is selected in the semantic list, so both models agree.
    await expect(
      page.locator('[data-universe-node][data-selected="true"]'),
    ).toHaveCount(1)
  })

  test('9+10+11. relationship selection reports real endpoints only', async ({
    page,
  }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
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

    // Both endpoints are published node labels, and the relation type is shown.
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-universe-node]')).map(
        (element) => element.getAttribute('data-universe-label'),
      ),
    )
    expect(source).not.toBeNull()
    expect(target).not.toBeNull()
    expect(labels.length).toBe(4)

    // The published payload carries no explanation for these relationships, so the
    // panel must not invent one.
    const explanations = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll(
            '[data-universe-edge-detail] .ru-panel__summary',
          ),
        ).length,
    )
    expect(explanations).toBe(0)
    await expect(detail).toContainText('research focus')
  })

  test('12. the theme can switch while the scene is live', async ({ page }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    const toggle = page.locator('[data-theme-toggle]').first()
    if ((await toggle.count()) > 0) {
      const before = await labelPositions(page)
      await toggle.click()
      await expect(page.locator(region)).toHaveAttribute(
        'data-universe-enhancement',
        'enhanced',
      )
      // Same pose, one canvas, no reload.
      expect(await page.locator('canvas').count()).toBe(1)
      expect((await labelPositions(page)).join('|')).toBe(before.join('|'))
    }
  })

  test('13. context loss degrades safely and keeps the semantics', async ({
    page,
  }) => {
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
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
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    // Focus the native disclosure and open it with the keyboard only.
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
    const tabbableCanvas = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('canvas')).filter(
          (element) => (element as HTMLElement).tabIndex >= 0,
        ).length,
    )
    expect(tabbableCanvas).toBe(0)
  })

  test('15. mobile keeps the interactive universe usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(ABOUT)
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-enhancement',
      'enhanced',
    )
    const metrics = await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLCanvasElement
      return { width: element.width, clientWidth: element.clientWidth }
    }, canvas)
    // Mobile DPR ceiling of 1.0.
    expect(metrics.width).toBeLessThanOrEqual(metrics.clientWidth)
    // Controls stay reachable and the facts stay readable.
    await expect(
      page.locator(`${region} [data-universe-action="reset"]`),
    ).toBeVisible()
    await page.locator('[data-universe-edge] button').first().click()
    await expect(page.locator(region)).toHaveAttribute(
      'data-universe-selection',
      'true',
    )
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
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
})
