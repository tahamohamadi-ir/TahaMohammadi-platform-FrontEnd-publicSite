import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  NO_JS_AUDIT_ROUTE_COUNT,
  NO_JS_AUDIT_ROUTES,
} from './test-harness/no-js-audit'
import { PAGE_FAMILY_INDEX_CAPTURES } from './test-harness/page-family-index-captures'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-300-NO-JS-AUDIT.md',
)
const e2ePath = path.join(
  repositoryRoot,
  'tests',
  'e2e',
  'public-300-nojs-crawl.e2e.ts',
)
const harnessPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'no-js-audit.ts',
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

describe('PUBLIC-300 no-JS crawl audit scaffold', () => {
  it('covers all 23 static build routes (gateway, home, PF index, search)', () => {
    expect(NO_JS_AUDIT_ROUTES).toHaveLength(NO_JS_AUDIT_ROUTE_COUNT)
    expect(NO_JS_AUDIT_ROUTES.map((route) => route.path)).toContain('/')
    expect(NO_JS_AUDIT_ROUTES.map((route) => route.path)).toContain('/en/')
    expect(NO_JS_AUDIT_ROUTES.map((route) => route.path)).toContain('/fa/')
    expect(NO_JS_AUDIT_ROUTES.map((route) => route.path)).toContain(
      '/en/search/',
    )
    expect(NO_JS_AUDIT_ROUTES.map((route) => route.path)).toContain(
      '/fa/search/',
    )
    expect(existsSync(harnessPath)).toBe(true)
  })

  it('includes PF-01 and PF-03..PF-08 index routes for both locales', () => {
    for (const capture of PAGE_FAMILY_INDEX_CAPTURES) {
      expect(
        NO_JS_AUDIT_ROUTES.some((route) => route.path === capture.path),
      ).toBe(true)
    }

    for (const id of INDEX_ROUTE_IDS) {
      expect(NO_JS_AUDIT_ROUTES.some((route) => route.id.startsWith(id))).toBe(
        true,
      )
    }
  })

  it('ships checklist, Playwright @nojs crawl, and test:nojs script', () => {
    expect(existsSync(checklistPath)).toBe(true)
    expect(existsSync(e2ePath)).toBe(true)

    const checklist = readFileSync(checklistPath, 'utf8')
    const e2eSource = readFileSync(e2ePath, 'utf8')
    const packageJson = readFileSync(packageJsonPath, 'utf8')

    expect(checklist).toContain('PUBLIC-300')
    expect(checklist).toContain('javaScriptEnabled: false')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
    expect(checklist).toContain('PF-02 detail')

    expect(e2eSource).toContain('@nojs')
    expect(e2eSource).toContain('PUBLIC-300')
    expect(e2eSource).toContain('NO_JS_AUDIT_ROUTES')
    expect(e2eSource).toContain('javaScriptEnabled: false')

    expect(packageJson).toContain('"test:nojs"')
    expect(packageJson).toContain('@nojs')
  })
})
