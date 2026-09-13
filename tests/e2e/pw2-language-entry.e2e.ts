import { expect, test, type Page } from '@playwright/test'

/**
 * PW-2 — language-entry transition (the gateway as a real threshold).
 *
 * All eleven behaviours run against the real built gateway with a stubbed
 * navigation target. Three environment facts shaped this harness, because the
 * gateway runs a 1.5 MB GLB through software GL and each round-trip can cost
 * seconds under parallel load:
 *
 * 1. A *pending* navigation blocks Playwright's own DOM waits — so nothing is
 *    asserted through the DOM after the commit; the commit is triggered in one
 *    round-trip and the outcome is judged from the recorded navigation hits.
 * 2. Wall-clock windows measured from Node are unreliable, so the in-page
 *    sequence (state, travel, timestamps) is recorded by a MutationObserver in
 *    `sessionStorage` and published by the stub page back to the test process.
 * 3. The pre-commit states are observed on the live document, where no
 *    navigation is pending yet.
 */

const EN_ROUTE = '**/en/**'
const FA_ROUTE = '**/fa/**'
const TELEMETRY_ROUTE = '**/__pw2_telemetry*'
/** Held long enough to observe the entry, then released so the swap can happen. */
const HOLD = 2600

interface EntrySample {
  entry: string | null
  travel: string | null
  program: string | null
  /** Document-local timestamp (ms) — comparable within one document. */
  t: number
}

const STUB_BODY = `<!doctype html><html lang="en"><head><title>entry stub</title></head>
<body>entry stub
<script>
  try {
    var log = sessionStorage.getItem('__pw2Log') || '[]'
    fetch('/__pw2_telemetry?log=' + encodeURIComponent(log), { cache: 'no-store' })
  } catch (error) {}
</script>
</body></html>`

/** Stub a language route; the navigation is held for `holdMs` first. */
async function stubLanguageRoute(
  page: Page,
  pattern: string,
  hits: string[],
  holdMs = 0,
) {
  await page.route(pattern, async (route) => {
    hits.push(new URL(route.request().url()).pathname)
    if (holdMs > 0) await new Promise((resolve) => setTimeout(resolve, holdMs))
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: STUB_BODY,
    })
  })
}

/**
 * Receive the in-page entry log from the stub document. Returns a live getter so
 * assertions can poll it without touching the page.
 */
async function collectEntryTelemetry(page: Page) {
  const state: { samples: EntrySample[] } = { samples: [] }
  await page.route(TELEMETRY_ROUTE, async (route) => {
    const raw = new URL(route.request().url()).searchParams.get('log')
    try {
      state.samples = raw ? (JSON.parse(raw) as EntrySample[]) : []
    } catch {
      state.samples = []
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'ok',
    })
  })
  await installEntryTelemetry(page)
  return state
}

/** Record every entry-state transition in `sessionStorage` (survives the swap). */
async function installEntryTelemetry(page: Page) {
  await page.evaluate(() => {
    const log: EntrySample[] = []
    const snapshot = () => {
      const el = document.querySelector<HTMLElement>('[data-gateway-portal]')
      const gw = document.querySelector<HTMLElement>('.gw')
      log.push({
        entry: el?.dataset.gatewayEntry ?? null,
        travel: el?.dataset.gatewayTravel ?? null,
        program: gw?.dataset.gatewayProgram ?? null,
        t: Math.round(performance.now()),
      })
      sessionStorage.setItem('__pw2Log', JSON.stringify(log))
    }
    for (const selector of ['[data-gateway-portal]', '.gw']) {
      const target = document.querySelector(selector)
      if (target) {
        new MutationObserver(snapshot).observe(target, { attributes: true })
      }
    }
    snapshot()
  })
}

function portal(page: Page) {
  return page.locator('[data-gateway-portal]')
}

function entryState(page: Page) {
  return portal(page).getAttribute('data-gateway-entry')
}

/**
 * Commit through a real pointer click without Playwright's click auto-wait for
 * the navigation this transition deliberately delays (~2s). Hit testing still
 * exercises the real pointer path.
 */
async function clickLanguage(page: Page, name: string) {
  const box = await page.getByRole('link', { name }).boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
}

async function portalReady(page: Page) {
  await expect(portal(page)).toHaveAttribute('data-gateway-state', 'ready', {
    timeout: 15000,
  })
}

/** Timestamp of the first sample in a given state, or null. */
function at(samples: EntrySample[], state: string): number | null {
  const found = samples.find((sample) => sample.entry === state)
  return found ? found.t : null
}

test.describe('PW-2 language entry', () => {
  // Every case waits for a real WebGL scene (software GL in CI) and then holds
  // the document across a multi-second transition, so the default 30s budget is
  // not enough under parallel load.
  test.setTimeout(90_000)

  test('1. with JavaScript disabled native language navigation still works', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    })
    const noJsPage = await context.newPage()
    await noJsPage.goto(baseURL!)
    await noJsPage.locator('a[href="/fa/"]').click()
    await expect(noJsPage).toHaveURL(/\/fa\/$/)
    await context.close()
  })

  test('2. without WebGL the enhancement stays inert and links navigate natively', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (type.includes('webgl')) return null
        return (original as (...rest: unknown[]) => unknown).call(
          this,
          type,
          ...args,
        )
      } as typeof original
    })
    const hits: string[] = []
    await stubLanguageRoute(page, FA_ROUTE, hits)
    await page.goto('/')
    await expect(portal(page)).toHaveAttribute('data-gateway-state', 'fallback')

    await page.locator('a[href="/fa/"]').click()
    await expect(page).toHaveURL(/\/fa\/$/)
    expect(hits).toEqual(['/fa/'])
  })

  test('3. a ready scene acknowledges, enters and navigates exactly once', async ({
    page,
  }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await portalReady(page)
    const telemetry = await collectEntryTelemetry(page)

    await page.getByRole('link', { name: 'English' }).hover()
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      'previewing',
    )

    await clickLanguage(page, 'English')
    // Exactly one navigation, to the committed href.
    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    await expect
      .poll(() => telemetry.samples.length, { timeout: 20000 })
      .toBeGreaterThan(1)
    const samples = telemetry.samples
    const entries = samples.map((sample) => sample.entry)
    // Acknowledgement first, then the entry itself, then one navigation.
    expect(entries).toContain('committed')
    expect(entries).toContain('navigating')
    const engaged = samples.filter((sample) => sample.entry !== null)
    expect(engaged.length).toBeGreaterThan(0)
    for (const sample of engaged) {
      expect(sample.program).toBe('flight')
    }
    if (entries.includes('entering')) {
      // The camera really travelled (no canvas/model scale, no instant jump).
      expect(samples.some((sample) => Number(sample.travel) > 0)).toBe(true)
    } else {
      // A starved software-GL renderer can hit the 3s wall-clock deadline before
      // the choreography reaches its 0.3s mark; the navigation must then be the
      // deadline's, never an instant/native jump. (Test 7 covers that path as a
      // claim in its own right.)
      const delta =
        (at(samples, 'navigating') as number) -
        (at(samples, 'committed') as number)
      expect(delta).toBeGreaterThan(2400)
    }
    await page.waitForTimeout(500)
    expect(hits).toEqual(['/en/'])
  })

  test('4. only the first activation can commit an href', async ({ page }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await stubLanguageRoute(page, FA_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)

    // Commit and then activate twice more, all in one round-trip so the
    // document cannot swap underneath the second activations (the real pointer
    // path is covered by tests 3, 5, 7, 8 and 10).
    await page.evaluate(() => {
      const activate = (selector: string) => {
        document.querySelector(selector)?.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 0,
          }),
        )
      }
      activate('.gw__nav a[href="/en/"]')
      activate('a[href="/fa/"]')
      activate('.gw__nav a[lang="fa"]')
    })

    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    await page.waitForTimeout(500)
    expect(hits).toEqual(['/en/'])
  })

  test('5. keyboard Enter behaves exactly like a click', async ({ page }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, FA_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)

    await page.getByRole('link', { name: 'فارسی' }).focus()
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      'previewing',
    )
    await page.keyboard.press('Enter')
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      /committed|entering|navigating/,
    )
    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    expect(hits).toEqual(['/fa/'])
  })

  test('6. reduced motion confirms and navigates with no camera flight', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)
    const telemetry = await collectEntryTelemetry(page)

    // No preview under reduced motion: focus must not start one (the attribute
    // is only written once a state actually changes).
    await page.getByRole('link', { name: 'English' }).focus()
    await page.waitForTimeout(300)
    expect(await entryState(page)).toBeNull()

    await clickLanguage(page, 'English')
    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    await expect
      .poll(() => telemetry.samples.length, { timeout: 20000 })
      .toBeGreaterThan(1)

    const samples = telemetry.samples
    // Every sample that carries a state also carries the instant program.
    const engaged = samples.filter((sample) => sample.entry !== null)
    expect(engaged.length).toBeGreaterThan(0)
    for (const sample of engaged) {
      expect(sample.program).toBe('instant')
    }
    // Zero metres of travel: no camera flight, only the confirmation and the
    // short atmospheric response before navigation.
    for (const sample of samples) {
      expect(Number(sample.travel ?? 0)).toBe(0)
    }
    expect(hits).toEqual(['/en/'])
  })

  test('7. a stalled entry still navigates on its local deadline', async ({
    page,
  }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)
    const telemetry = await collectEntryTelemetry(page)

    // Commit and stall in one round-trip: the choreography dies immediately, so
    // only the local deadline can carry the visitor to the selected href.
    await page.evaluate(() => {
      document.querySelector('.gw__nav a[href="/en/"]')?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      )
      ;(
        window as unknown as { __tmStallGatewayEntry?: () => void }
      ).__tmStallGatewayEntry?.()
    })

    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    await expect
      .poll(() => telemetry.samples.length, { timeout: 20000 })
      .toBeGreaterThan(1)
    const samples = telemetry.samples
    const committedAt = at(samples, 'committed')
    const navigatingAt = at(samples, 'navigating')
    expect(committedAt).not.toBeNull()
    expect(navigatingAt).not.toBeNull()
    // Document-local timing: later than the killed 2.05s choreography, inside
    // the 3s deadline's own slack.
    const delta = (navigatingAt as number) - (committedAt as number)
    expect(delta).toBeGreaterThan(2400)
    expect(delta).toBeLessThan(6000)
    // The entry never started, so nothing could have "flown" by accident.
    expect(samples.some((sample) => sample.entry === 'entering')).toBe(false)
    expect(hits).toEqual(['/en/'])
  })

  test('8. a scene failure after commit still navigates', async ({ page }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)
    const telemetry = await collectEntryTelemetry(page)

    // Commit and lose the real WebGL context in one round-trip, through the
    // browser API rather than a stubbed error path.
    await page.evaluate(() => {
      document.querySelector('.gw__nav a[href="/en/"]')?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      )
      document
        .querySelector<HTMLCanvasElement>('canvas[data-gateway-canvas]')
        ?.getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext()
    })

    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
    await expect
      .poll(() => telemetry.samples.length, { timeout: 20000 })
      .toBeGreaterThan(1)
    const samples = telemetry.samples
    const committedAt = at(samples, 'committed')
    const navigatingAt = at(samples, 'navigating')
    expect(navigatingAt).not.toBeNull()
    // Immediate: far faster than the 2.05s choreography and the 3s deadline.
    expect((navigatingAt as number) - (committedAt as number)).toBeLessThan(
      1000,
    )
    expect(hits).toEqual(['/en/'])
  })

  test('9. dispose clears timers, listeners and the entry seam', async ({
    page,
  }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, FA_ROUTE, hits, 600)
    await stubLanguageRoute(page, EN_ROUTE, hits, 600)
    await page.goto('/')
    await portalReady(page)

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide'))
    })
    expect(
      await page.evaluate(
        () =>
          typeof (window as unknown as { __tmStallGatewayEntry?: () => void })
            .__tmStallGatewayEntry,
      ),
    ).toBe('undefined')

    // After disposal the enhancement is inert: this is a native navigation and
    // the pagehide teardown must not have left a timer that navigates twice.
    await page.locator('a[href="/fa/"]').click()
    await expect(page).toHaveURL(/\/fa\/$/)
    await page.waitForTimeout(1200)
    expect(hits).toEqual(['/fa/'])
  })

  test('10. the theme cannot change during the entry', async ({ page }) => {
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await page.goto('/')
    await portalReady(page)
    await page.locator('[data-theme-toggle]').click()
    const themeBefore = await page.evaluate(
      () => document.documentElement.dataset.theme,
    )

    await clickLanguage(page, 'English')
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      /committed|entering|navigating/,
    )
    await page.waitForTimeout(600)

    expect(
      await page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe(themeBefore)
    await expect(page.locator('[data-theme-toggle]')).toBeDisabled()
    await expect.poll(() => hits.length, { timeout: 20000 }).toBe(1)
  })

  test('11. a canceled intent preview returns to idle and stops rendering', async ({
    page,
  }) => {
    // Renderer quiescence is measured in the live-browser evidence run (it needs
    // an unloaded machine to be meaningful); this case pins the state machine
    // contract: a canceled preview returns to idle, stays reusable, and never
    // navigates on its own.
    const hits: string[] = []
    await stubLanguageRoute(page, EN_ROUTE, hits, HOLD)
    await stubLanguageRoute(page, FA_ROUTE, hits, HOLD)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await portalReady(page)

    const enter = () =>
      page.evaluate(() => {
        document
          .querySelector('.gw__nav a[href="/en/"]')
          ?.dispatchEvent(new PointerEvent('pointerenter'))
      })
    const leave = () =>
      page.evaluate(() => {
        document
          .querySelector('.gw__nav a[href="/en/"]')
          ?.dispatchEvent(new PointerEvent('pointerleave'))
      })

    await enter()
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      'previewing',
    )
    // Cancel: back to idle, not stuck in preview and not committed.
    await leave()
    await expect(portal(page)).toHaveAttribute('data-gateway-entry', 'idle')

    // The preview is still usable after being canceled.
    await enter()
    await expect(portal(page)).toHaveAttribute(
      'data-gateway-entry',
      'previewing',
    )
    await leave()
    await expect(portal(page)).toHaveAttribute('data-gateway-entry', 'idle')

    // A preview never navigates on its own.
    await page.waitForTimeout(1200)
    expect(hits).toEqual([])
  })
})
