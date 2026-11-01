import { expect, test } from '@playwright/test'

/**
 * ADR-0011 — the live constellation is an upgrade of the SVG poster, never a requirement:
 * motion-allowed WebGL devices crossfade to the Three.js scene, reduced motion keeps the poster.
 */

test.describe('Home Hero v3 live constellation', () => {
  test('upgrades the poster to the scene, or keeps the poster on renderer failure', async ({
    page,
  }) => {
    await page.goto('/en/')
    const figure = page.locator('[data-hv3-live]')
    await expect(figure).toHaveCount(1)
    await expect
      .poll(
        () =>
          figure.evaluate(
            (node) =>
              'hv3LiveReady' in (node as HTMLElement).dataset ||
              'hv3LiveError' in (node as HTMLElement).dataset,
          ),
        { timeout: 15_000 },
      )
      .toBe(true)
    if (await figure.evaluate((node) => 'hv3LiveReady' in node.dataset)) {
      await expect(figure.locator('canvas')).toHaveCSS('opacity', '1')
    } else {
      await expect(figure.locator('.hv3-const__poster')).toBeVisible()
    }
    await expect(figure.locator('.hv3-const__label').first()).toBeVisible()
  })

  test('reduced motion keeps the static poster and never loads the scene', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    const sceneRequests: string[] = []
    page.on('request', (request) => {
      if (/three|graph-scene/.test(request.url()))
        sceneRequests.push(request.url())
    })
    await page.goto('/en/')
    await page.waitForTimeout(2500)
    const figure = page.locator('[data-hv3-live]')
    await expect(figure).not.toHaveAttribute('data-hv3-live-ready', /.*/)
    await expect(figure.locator('.hv3-const__poster')).toBeVisible()
    expect(sceneRequests).toEqual([])
    await context.close()
  })
})
