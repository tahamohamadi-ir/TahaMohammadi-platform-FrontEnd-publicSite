import { expect, test } from '@playwright/test'

test('orbital arrival stops rendering when settled and respects live reduced motion', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counters = { draws: 0 }
    Object.assign(window, { gatewayFrameCounters: counters })
    for (const method of [
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced',
    ] as const) {
      const original = WebGL2RenderingContext.prototype[method]
      Object.defineProperty(WebGL2RenderingContext.prototype, method, {
        value: function (...args: unknown[]) {
          counters.draws++
          return Reflect.apply(original, this, args)
        },
      })
    }
  })
  const draws = () =>
    page.evaluate(
      () =>
        (window as unknown as { gatewayFrameCounters: { draws: number } })
          .gatewayFrameCounters.draws,
    )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('[data-gateway-portal]')).toHaveAttribute(
    'data-gateway-state',
    'ready',
  )
  await expect(page.locator('[data-theme-picture]').first()).toHaveCSS(
    'opacity',
    '0',
  )
  const duringArrival = await draws()
  await page.waitForTimeout(4500)
  const settled = await draws()
  expect(settled).toBeGreaterThan(duringArrival)
  await page.waitForTimeout(400)
  expect(await draws()).toBe(settled)
  const bounds = await page.locator('[data-gateway-portal]').boundingBox()
  await page.mouse.move(bounds!.x + 40, bounds!.y + 40)
  await expect.poll(draws).toBeGreaterThan(settled)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(150)
  const reduced = await draws()
  await page.mouse.move(bounds!.x + bounds!.width - 40, bounds!.y + 80)
  await page.waitForTimeout(400)
  expect(await draws()).toBe(reduced)
})

test('a ready gateway never leaves its portal invisible during entrance', async ({
  page,
}) => {
  await page.goto('/')
  const portal = page.locator('[data-gateway-portal]')
  const canvas = portal.locator('[data-gateway-canvas]')
  await expect(portal).toHaveAttribute('data-gateway-state', 'ready')
  await page.waitForTimeout(150)
  await expect(canvas).toHaveCSS('opacity', '1')
})

test('language links remain usable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(baseURL!)
  await expect(page.locator('[data-gateway-canvas]')).toBeHidden()
  await expect(page.locator('a[href="/en/"]')).toBeVisible()
  await expect(page.locator('.gw h1')).toHaveCount(1)
  await expect(page.locator('.gw__prompt')).not.toBeEmpty()
  await expect(page.locator('.gw__nav')).toHaveAccessibleName(/.+/)
  await page.locator('a[href="/fa/"]').click()
  await expect(page).toHaveURL(/\/fa\/$/)
  await context.close()
})

test('language entry never lands on a visually empty Home', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('a[href="/en/"]').click()
  await expect(page).toHaveURL(/\/en\/$/)
  await expect(page.locator('[data-home-state="unavailable"]')).toBeVisible()
  const status = page.getByRole('status')
  await expect(status.getByRole('heading')).toHaveText('Content unavailable')
  await expect(status).toContainText('Published content is not available yet.')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('gateway WebGL failure cannot be promoted back to ready', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null
      return original.call(this, type, ...args)
    } as typeof original
  })
  await page.goto('/')
  const portal = page.locator('[data-gateway-portal]')
  await expect(portal).toHaveAttribute('data-gateway-state', 'fallback')
  await expect(portal.locator('canvas')).toBeHidden()
  await expect(portal.locator('[data-theme-picture]')).toHaveCSS('opacity', '1')
  await page.locator('a[href="/fa/"]').click()
  await expect(page).toHaveURL(/\/fa\/$/)
})

for (const width of [320, 390, 768, 1440]) {
  test(`rendered portal survives motion/theme/context changes at ${width}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const portal = page.locator('[data-gateway-portal]')
    await expect(portal).toHaveAttribute('data-gateway-state', 'ready')
    await expect(portal.locator('[data-theme-picture]')).toHaveCSS(
      'opacity',
      '0',
    )
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    await expect(portal.locator('canvas')).toHaveCSS('opacity', '1')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await portal.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      canvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext()
    })
    await expect(portal).toHaveAttribute('data-gateway-state', 'fallback')
    await expect(portal.locator('[data-theme-picture]')).toHaveCSS(
      'opacity',
      '1',
    )
    await page.locator('a[href="/en/"]').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/en\/$/)
    expect(errors).toEqual([])
  })
}
