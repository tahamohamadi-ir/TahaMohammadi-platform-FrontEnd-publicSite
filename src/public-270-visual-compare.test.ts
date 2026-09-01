import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const mappingModuleUrl = pathToFileURL(
  path.join(repositoryRoot, 'scripts/page-family-visual-compare.mjs'),
).href
const reportScriptPath = path.join(
  repositoryRoot,
  'scripts/generate-visual-compare-report.mjs',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs/quality/PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md',
)

describe('PUBLIC-270 visual compare owner assist', () => {
  it('maps every PUBLIC-270 capture to a concept reference path', async () => {
    const {
      PAGE_FAMILY_VISUAL_ENTRIES,
      PUBLIC_270_CAPTURE_WIDTHS,
      buildPublic270CompareRows,
      defaultDesignAuthorityRoot,
    } = await import(mappingModuleUrl)

    expect(PAGE_FAMILY_VISUAL_ENTRIES.length).toBeGreaterThanOrEqual(8)
    expect(PUBLIC_270_CAPTURE_WIDTHS).toEqual([1440, 390])

    const rows = buildPublic270CompareRows(defaultDesignAuthorityRoot)
    const requiredRows = rows.filter((row) => !row.optional)
    expect(requiredRows.length).toBe(36)
    expect(rows.length).toBe(40)

    for (const row of rows) {
      expect(row.captureFile).toMatch(/^public-270-/)
      expect(row.captureFile).toMatch(/-(1440|390)-(light|dark)\.png$/)
      expect(row.conceptRelative).toContain('concepts/page-families/')
      expect(row.conceptPath).toContain(row.conceptFile)
    }

    const pf01 = rows.filter((row) => row.pf === 'PF-01')
    expect(pf01).toHaveLength(4)
    expect(pf01.every((row) => row.conceptFile === 'creative-index-light.png')).toBe(
      true,
    )
  })

  it('maps home WP-40 captures to concept references under concepts/', async () => {
    const { buildHomeCompareRows, defaultDesignAuthorityRoot } = await import(
      mappingModuleUrl
    )

    const rows = buildHomeCompareRows(defaultDesignAuthorityRoot)
    expect(rows.length).toBeGreaterThanOrEqual(7)

    const withConcept = rows.filter((row) => row.conceptRelative)
    expect(withConcept.every((row) => row.conceptRelative.startsWith('concepts/'))).toBe(
      true,
    )

    const gateway = rows.find((row) => row.captureFile.includes('gateway'))
    expect(gateway?.conceptRelative).toBeNull()
  })

  it('ships the HTML report generator without claiming acceptance', () => {
    expect(existsSync(reportScriptPath)).toBe(true)
    const source = readFileSync(reportScriptPath, 'utf8')
    expect(source).toContain('does not change PUBLIC-190')
    expect(source).toContain('buildPublic270CompareRows')
    expect(source).toContain('buildHomeCompareRows')
  })

  it('documents the owner compare workflow in the evidence checklist', () => {
    expect(existsSync(checklistPath)).toBe(true)
    const checklist = readFileSync(checklistPath, 'utf8')
    expect(checklist).toContain('report:visual-compare')
    expect(checklist).toContain('generate-visual-compare-report.mjs')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
  })
})
