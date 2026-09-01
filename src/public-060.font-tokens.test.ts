import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FONT_COMPUTED_PROBE_ROUTES,
  LOCALE_FONT_STACKS,
} from './test-harness/font-tokens'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-060-FONT-COMPUTED-EVIDENCE.md',
)
const e2ePath = path.join(
  repositoryRoot,
  'tests',
  'e2e',
  'public-060-font-computed.e2e.ts',
)
const tokensCssPath = path.join(repositoryRoot, 'src', 'styles', 'tokens.css')
const fontsCssPath = path.join(repositoryRoot, 'src', 'styles', 'fonts.css')
const harnessPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'font-tokens.ts',
)

describe('PUBLIC-060 locale font tokens', () => {
  it('defines EN and FA display/body stacks from FONT-ACQUISITION-PLAN', () => {
    expect(LOCALE_FONT_STACKS.en.display.primary).toBe('Newsreader Variable')
    expect(LOCALE_FONT_STACKS.en.body.primary).toBe('Inter Variable')
    expect(LOCALE_FONT_STACKS.fa.display.primary).toBe('Estedad Variable')
    expect(LOCALE_FONT_STACKS.fa.body.primary).toBe('Vazirmatn Variable')
    expect(existsSync(harnessPath)).toBe(true)
  })

  it('ships checklist, Playwright @foundation probes, and locale token wiring', () => {
    expect(existsSync(checklistPath)).toBe(true)
    expect(existsSync(e2ePath)).toBe(true)
    expect(existsSync(tokensCssPath)).toBe(true)
    expect(existsSync(fontsCssPath)).toBe(true)

    const checklist = readFileSync(checklistPath, 'utf8')
    const e2eSource = readFileSync(e2ePath, 'utf8')
    const tokensCss = readFileSync(tokensCssPath, 'utf8')
    const fontsCss = readFileSync(fontsCssPath, 'utf8')

    for (const route of FONT_COMPUTED_PROBE_ROUTES) {
      expect(checklist).toContain(route.path)
    }

    for (const locale of ['en', 'fa'] as const) {
      const stack = LOCALE_FONT_STACKS[locale]
      expect(tokensCss).toContain(`--font-display-${locale}:`)
      expect(tokensCss).toContain(`'${stack.display.primary}'`)
      expect(tokensCss).toContain(`--font-body-${locale}:`)
      expect(tokensCss).toContain(`'${stack.body.primary}'`)
      expect(tokensCss).toContain(`html[lang='${locale}']`)
      expect(tokensCss).toContain(`var(--font-display-${locale})`)
      expect(tokensCss).toContain(`var(--font-body-${locale})`)
      expect(fontsCss).toContain(`font-family: '${stack.display.primary}'`)
      expect(fontsCss).toContain(`font-family: '${stack.body.primary}'`)
      expect(checklist).toContain(stack.display.primary)
      expect(checklist).toContain(stack.body.primary)
    }

    expect(e2eSource).toContain('FONT_COMPUTED_PROBE_ROUTES')
    expect(e2eSource).toContain('LOCALE_FONT_STACKS')
    expect(e2eSource).toContain('@foundation')
    expect(e2eSource).toContain('PUBLIC-060')
    expect(checklist).toContain('FONT-ACQUISITION-PLAN.md')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
    expect(fontsCss).toContain('font-display: swap')
  })
})
