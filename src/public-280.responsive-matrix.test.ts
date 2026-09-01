import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  PAGE_FAMILY_INDEX_CAPTURES,
  RESPONSIVE_MATRIX_THEMES,
  expandIndexCapturesWithThemes,
} from './test-harness/page-family-index-captures'
import { RESPONSIVE_MATRIX_WIDTHS } from './test-harness/responsive-matrix-widths'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md',
)
const e2ePath = path.join(
  repositoryRoot,
  'tests',
  'e2e',
  'public-280-responsive-matrix.visual.e2e.ts',
)
const widthsPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'responsive-matrix-widths.ts',
)
const capturesPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'page-family-index-captures.ts',
)

const INDEX_ROUTE_IDS = [
  'pf01',
  'pf03',
  'pf04',
  'pf05-research',
  'pf05-publications',
  'pf06',
  'pf07-about',
  'pf07-cv',
  'pf08',
] as const

describe('PUBLIC-280 responsive matrix', () => {
  it('defines the six-width contract (320–1440 CSS px)', () => {
    expect(RESPONSIVE_MATRIX_WIDTHS).toEqual([320, 390, 768, 1024, 1280, 1440])
    expect(existsSync(widthsPath)).toBe(true)
  })

  it('ships checklist and Playwright @visual captures for PF-01 and PF-03..PF-08 index routes', () => {
    expect(existsSync(checklistPath)).toBe(true)
    expect(existsSync(e2ePath)).toBe(true)
    expect(existsSync(capturesPath)).toBe(true)

    const checklist = readFileSync(checklistPath, 'utf8')
    const source = readFileSync(e2ePath, 'utf8')
    const capturesSource = readFileSync(capturesPath, 'utf8')

    for (const width of RESPONSIVE_MATRIX_WIDTHS) {
      expect(checklist).toContain(String(width))
    }

    for (const id of INDEX_ROUTE_IDS) {
      expect(capturesSource).toContain(`id: '${id}'`)
      expect(checklist).toContain(id)
    }

    expect(source).toContain('RESPONSIVE_MATRIX_WIDTHS')
    expect(source).toContain('PAGE_FAMILY_INDEX_CAPTURES')
    expect(checklist).toContain('PUBLIC-270')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
    expect(source).toContain('@visual')
    expect(source).toContain('PUBLIC-280')
    expect(capturesSource).toContain('/en/contact/')
    expect(source).not.toContain('scaffoldCaptures')
  })

  it('expands index routes to dual-theme matrix (light and dark per locale-route)', () => {
    const themed = expandIndexCapturesWithThemes(PAGE_FAMILY_INDEX_CAPTURES)
    expect(RESPONSIVE_MATRIX_THEMES).toEqual(['light', 'dark'])
    expect(themed).toHaveLength(
      PAGE_FAMILY_INDEX_CAPTURES.length * RESPONSIVE_MATRIX_THEMES.length,
    )
    expect(themed).toHaveLength(36)

    const source = readFileSync(e2ePath, 'utf8')
    expect(source).toContain('expandIndexCapturesWithThemes')
    expect(source).toContain('PAGE_FAMILY_INDEX_CAPTURES')
    expect(source).toContain('RESPONSIVE_MATRIX_THEMES')
  })
})
