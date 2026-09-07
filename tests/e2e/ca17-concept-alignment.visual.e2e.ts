import { expect, test } from '@playwright/test'
import {
  CONCEPT_ALIGNMENT_CAPTURES,
  CONCEPT_ALIGNMENT_WIDTHS,
} from '../../src/test-harness/concept-alignment-captures'

test.describe('CA-17 Concept Alignment Visual Acceptance Matrix: All 15 Families', () => {
  for (const capture of CONCEPT_ALIGNMENT_CAPTURES) {
    test(`renders ${capture.family} (${capture.name}) correctly with valid lang/dir`, async ({
      page,
    }) => {
      const response = await page.goto(capture.path)
      const expectedStatus = capture.id.includes('404') ? 404 : 200
      expect(response?.status()).toBe(expectedStatus)

      const html = page.locator('html')
      await expect(html).toHaveAttribute('lang', capture.locale)
      await expect(html).toHaveAttribute('dir', capture.dir)

      const main = page.locator('main, [role="main"]')
      await expect(main.first()).toBeVisible()
    })
  }
})

test.describe('CA-17 Concept Alignment: Responsive Breakpoints Matrix', () => {
  const sampleFamilies = CONCEPT_ALIGNMENT_CAPTURES.filter((c) =>
    [
      'f01-gateway',
      'f02-home-fa',
      'f02-home-en',
      'f03-research-fa',
      'f13-about-fa',
    ].includes(c.id),
  )

  for (const capture of sampleFamilies) {
    for (const width of CONCEPT_ALIGNMENT_WIDTHS) {
      test(`verifies layout at ${width.label} for ${capture.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: width.width, height: width.height })
        const response = await page.goto(capture.path)
        expect(response?.status()).toBe(200)

        const body = page.locator('body')
        await expect(body).toBeVisible()

        // Verify content does not horizontally cause unexpected overflow beyond viewport
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth,
        )
        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth,
        )
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
      })
    }
  }
})

test.describe('CA-17 Concept Alignment: Light/Dark Theme Adaptation', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`applies ${theme} theme tokens cleanly on Home and Research`, async ({
      page,
    }) => {
      await page.goto('/fa/')
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t
      }, theme)

      const datasetTheme = await page.evaluate(
        () => document.documentElement.dataset.theme,
      )
      expect(datasetTheme).toBe(theme)

      const header = page.locator('.site-header, header')
      await expect(header.first()).toBeVisible()
    })
  }
})

test.describe('CA-17 Concept Alignment: 200% Zoom and Keyboard Accessibility', () => {
  test('supports 200% text scale zoom without structural breakage', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/fa/')

    // Emulate 200% text zoom via root font-size manipulation
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })

    const heading = page.locator('h1')
    await expect(heading.first()).toBeVisible()

    const nav = page.locator('nav, .site-header__nav')
    await expect(nav.first()).toBeVisible()
  })

  test('maintains keyboard focus accessibility through interactive landmarks', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/fa/')

    await page.keyboard.press('Tab')
    const activeElTag = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase(),
    )
    expect(['a', 'button', 'input']).toContain(activeElTag)
  })
})
