import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  A11Y_AUDIT_ROUTE_COUNT,
  A11Y_AUDIT_ROUTES,
  A11Y_AXE_WCAG_TAGS,
} from './test-harness/a11y-audit'
import { PAGE_FAMILY_INDEX_CAPTURES } from './test-harness/page-family-index-captures'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-080-A11Y-AUDIT.md',
)
const e2ePath = path.join(
  repositoryRoot,
  'tests',
  'e2e',
  'public-080-a11y-crawl.e2e.ts',
)
const harnessPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'a11y-audit.ts',
)
const packageJsonPath = path.join(repositoryRoot, 'package.json')

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

describe('PUBLIC-080 automated accessibility crawl scaffold', () => {
  it('covers all 23 static build routes (gateway, home, PF index, search)', () => {
    expect(A11Y_AUDIT_ROUTES).toHaveLength(A11Y_AUDIT_ROUTE_COUNT)
    expect(A11Y_AUDIT_ROUTES.map((route) => route.path)).toContain('/')
    expect(A11Y_AUDIT_ROUTES.map((route) => route.path)).toContain('/en/')
    expect(A11Y_AUDIT_ROUTES.map((route) => route.path)).toContain('/fa/')
    expect(existsSync(harnessPath)).toBe(true)
  })

  it('includes PF-01 and PF-03..PF-08 index routes for both locales', () => {
    for (const capture of PAGE_FAMILY_INDEX_CAPTURES) {
      expect(
        A11Y_AUDIT_ROUTES.some((route) => route.path === capture.path),
      ).toBe(true)
    }

    for (const id of INDEX_ROUTE_IDS) {
      expect(A11Y_AUDIT_ROUTES.some((route) => route.id.startsWith(id))).toBe(
        true,
      )
    }
  })

  it('ships checklist, Playwright @a11y crawl, and test:a11y script', () => {
    expect(existsSync(checklistPath)).toBe(true)
    expect(existsSync(e2ePath)).toBe(true)

    const checklist = readFileSync(checklistPath, 'utf8')
    const e2eSource = readFileSync(e2ePath, 'utf8')
    const packageJson = readFileSync(packageJsonPath, 'utf8')

    expect(checklist).toContain('PUBLIC-080')
    expect(checklist).toContain('wcag22aa')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
    expect(checklist).toContain('PF-02 detail')

    expect(e2eSource).toContain('@a11y')
    expect(e2eSource).toContain('PUBLIC-080')
    expect(e2eSource).toContain('A11Y_AUDIT_ROUTES')
    expect(e2eSource).toContain('A11Y_AXE_WCAG_TAGS')

    expect(packageJson).toContain('"test:a11y"')
    expect(packageJson).toContain('@a11y')
    expect(A11Y_AXE_WCAG_TAGS).toContain('wcag22aa')
  })
})
