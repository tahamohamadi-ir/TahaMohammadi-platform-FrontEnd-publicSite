import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import {
  PAGE_FAMILY_INDEX_CAPTURES,
  RESPONSIVE_MATRIX_THEMES,
  expandIndexCapturesWithThemes,
} from '../../src/test-harness/page-family-index-captures'
import { RESPONSIVE_MATRIX_WIDTHS } from '../../src/test-harness/responsive-matrix-widths'

const visualOutputDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test-results/visual',
)

test.beforeAll(() => {
  mkdirSync(visualOutputDir, { recursive: true })
})

/**
 * PUBLIC-280: six-width responsive matrix for built index routes (PUBLIC-270 map).
 * Dual-theme expansion: light and dark for every locale-route.
 * PF-02 detail remains open until a published creative detail route exists.
 */
const indexCaptures = expandIndexCapturesWithThemes(
  PAGE_FAMILY_INDEX_CAPTURES,
  RESPONSIVE_MATRIX_THEMES,
)

test.describe('PUBLIC-280 responsive matrix', () => {
  for (const target of indexCaptures) {
    for (const width of RESPONSIVE_MATRIX_WIDTHS) {
      test(`PUBLIC-280 ${target.pf} ${target.path}@${width} ${target.theme} @visual`, async ({
        page,
      }) => {
        test.setTimeout(120_000)
        await page.addInitScript(
          (theme) => localStorage.setItem('tm-theme', theme),
          target.theme,
        )
        await page.setViewportSize({ width, height: 900 })
        await page.goto(target.path)

        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          target.locale,
        )
        await expect(page.locator('html')).toHaveAttribute('dir', target.dir)
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          target.theme,
        )
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true)

        await page.screenshot({
          path: path.join(
            visualOutputDir,
            `public-280-${target.id}-${target.locale}-${width}-${target.theme}.png`,
          ),
          fullPage: true,
        })
      })
    }
  }
})
