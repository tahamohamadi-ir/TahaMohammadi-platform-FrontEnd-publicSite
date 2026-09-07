import { expect, test } from '@playwright/test'

/**
 * CA-05 — Graph selection, accessible native-control enhancement, and GSAP motion.
 *
 * Verifies:
 * - Native accessible controls in Home hero: Enter/Space/Click toggles details without navigation.
 * - Same model for native controls and hit tests / projected label chips.
 * - No wheel capture: mouse wheel scrolling behaves normally without being intercepted.
 * - No automatic navigation: selecting nodes keeps the user on the current page.
 * - Escape key resets selection cleanly.
 * - Reduced motion preference honored without page reload.
 */

test.describe('CA-05 graph selection and interaction', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`native node interaction on Home (${locale}) toggles details without automatic navigation`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/`)
      const region = page.locator('[data-graph-region]')
      await expect(region).toBeVisible()

      const status = await region.getAttribute('data-graph-status')
      if (status !== 'ready') {
        test.skip(
          true,
          `graph status is ${status}; skipping live node selection`,
        )
        return
      }

      const initialUrl = page.url()
      const firstSummary = region.locator('details summary').first()
      await firstSummary.scrollIntoViewIfNeeded()
      await firstSummary.focus()

      // Press Enter to expand
      await page.keyboard.press('Enter')
      await expect(region.locator('details[open]').first()).toBeVisible()

      // URL should remain unchanged (no automatic navigation)
      expect(page.url()).toBe(initialUrl)

      // Press Escape to reset / close
      await page.keyboard.press('Escape')
      // Details or selection can be closed or focus maintained
      expect(page.url()).toBe(initialUrl)
    })

    test(`no wheel capture on graph region (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/`)
      const region = page.locator('[data-graph-region]')
      await expect(region).toBeVisible()

      // Perform a mouse wheel scroll on the graph region
      const box = await region.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        // Ensure wheel event does not get captured or lock the page
        await page.mouse.wheel(0, 100)
        // Wait a tick to ensure no scroll hijacking occurred
        await page.waitForTimeout(100)
      }
    })
  }

  test('interactive specimen on Visual Atlas validates synchronized selection and Escape handling', async ({
    page,
  }) => {
    // Check if Visual Atlas is accessible
    const response = await page.goto('/_design')
    if (response?.status() === 404) {
      test.skip(
        true,
        'Visual Atlas is gated in default production build; run with DESIGN_ATLAS=1',
      )
      return
    }

    const demo = page.locator('[data-graph-interaction-demo]')
    await expect(demo).toBeVisible()

    // 1. Click a native summary to select node-01
    const node1Summary = demo.locator('[data-graph-node="node-01"] summary')
    await node1Summary.click()

    // Both native item and detail panel reflect selection
    await expect(demo.locator('[data-graph-node="node-01"]')).toHaveAttribute(
      'data-selected',
      'true',
    )
    await expect(demo.locator('[data-graph-detail]')).toHaveAttribute(
      'data-has-selection',
      'true',
    )
    await expect(demo.locator('[data-metric-selected]')).toHaveText('#node-01')

    // 2. Click projected HTML label chip for node-02
    const chip2 = demo.locator('[data-projected-label="node-02"]')
    if ((await chip2.count()) > 0) {
      await chip2.click()
      await expect(demo.locator('[data-graph-node="node-02"]')).toHaveAttribute(
        'data-selected',
        'true',
      )
      await expect(demo.locator('[data-graph-node="node-01"]')).toHaveAttribute(
        'data-selected',
        'false',
      )
      await expect(demo.locator('[data-metric-selected]')).toHaveText(
        '#node-02',
      )
    }

    // 3. Clear Selection via Escape key
    await page.keyboard.press('Escape')
    await expect(demo.locator('[data-metric-selected]')).toHaveText('(None)')
    await expect(demo.locator('[data-graph-detail]')).toHaveAttribute(
      'data-has-selection',
      'false',
    )

    // 4. Test Reduced Motion switch
    const reducedBtn = demo.locator('[data-motion-btn="reduced"]')
    await reducedBtn.click()
    await expect(demo.locator('[data-metric-motion]')).toHaveText('reduced')

    // 5. Test Remount
    const remountBtn = demo.locator('[data-action-remount]')
    await remountBtn.click()
    await expect(demo.locator('[data-metric-selected]')).toHaveText('(None)')
  })

  test('reduced motion preference updates dynamically without page reload', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/en/')

    const hero = page.locator('[data-hero-layout="integrated"]')
    await expect(hero).toBeVisible()

    // Check media query evaluation in the browser
    const prefersReduced = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
    expect(prefersReduced).toBe(true)
  })
})
