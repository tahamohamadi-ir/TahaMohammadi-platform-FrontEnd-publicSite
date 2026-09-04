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
const hashExtractScriptPath = path.join(
  repositoryRoot,
  'scripts/extract-visual-signoff-hashes.mjs',
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
    expect(requiredRows.length).toBe(40)
    expect(rows.length).toBe(40)

    for (const row of rows) {
      expect(row.captureFile).toMatch(/^public-270-/)
      expect(row.captureFile).toMatch(/-(1440|390)-(light|dark)\.png$/)
      expect(row.conceptRelative).toContain('concepts/page-families/')
      expect(row.conceptPath).toContain(row.conceptFile)
    }

    const pf01 = rows.filter((row) => row.pf === 'PF-01')
    expect(pf01).toHaveLength(4)
    expect(
      pf01.every((row) => row.conceptFile === 'creative-index-light.png'),
    ).toBe(true)
  })

  it('resolves concept PNGs when DESIGN_AUTHORITY_ROOT points at agent-kit', async () => {
    const {
      buildPublic270CompareRows,
      defaultDesignAuthorityRoot,
      resolveVisualConceptAuthorityRoot,
    } = await import(mappingModuleUrl)

    const agentKitRoot = path.join(defaultDesignAuthorityRoot, 'agent-kit')
    expect(resolveVisualConceptAuthorityRoot(agentKitRoot)).toBe(
      defaultDesignAuthorityRoot,
    )

    const rows = buildPublic270CompareRows(agentKitRoot)
    expect(rows[0]?.conceptPath).toBe(
      path.join(
        defaultDesignAuthorityRoot,
        'concepts/page-families/creative-index-light.png',
      ),
    )
  })

  it('maps home WP-40 captures to viewport-matched concept references', async () => {
    const {
      HOME_VISUAL_ENTRIES,
      buildHomeCompareRows,
      defaultDesignAuthorityRoot,
      resolveHomeConceptReference,
    } = await import(mappingModuleUrl)

    const rows = buildHomeCompareRows(defaultDesignAuthorityRoot)
    expect(rows.length).toBe(HOME_VISUAL_ENTRIES.length)

    const en768 = rows.filter((row) => row.captureFile.includes('en-768'))
    expect(en768).toHaveLength(2)
    expect(en768.every((row) => row.conceptRelative === null)).toBe(true)

    const fa768Light = rows.find(
      (row) => row.captureFile === 'wp40-home-fa-768-light.png',
    )
    expect(fa768Light?.conceptRelative).toBe(
      'concepts/home-mobile-fa-light-concept-v1.png',
    )
    expect(fa768Light?.conceptViewport).toBe(390)

    const fa768Dark = rows.find(
      (row) => row.captureFile === 'wp40-home-fa-768-dark.png',
    )
    expect(fa768Dark?.conceptRelative).toBeNull()

    const en200 = rows.filter((row) => row.captureFile.includes('en-200pct'))
    expect(en200.every((row) => row.conceptRelative === null)).toBe(true)

    const gateway = rows.find((row) => row.captureFile.includes('gateway'))
    expect(gateway?.conceptRelative).toBe(
      'concepts/language-gateway-dark-concept-v1.png',
    )

    for (const entry of HOME_VISUAL_ENTRIES) {
      const resolved = resolveHomeConceptReference(entry)
      const row = rows.find(
        (candidate) => candidate.captureFile === entry.captureFile,
      )
      expect(row?.conceptFile).toBe(resolved?.concept ?? null)
    }

    const withConcept = rows.filter((row) => row.conceptRelative)
    expect(
      withConcept.every((row) => row.conceptRelative.startsWith('concepts/')),
    ).toBe(true)
  })

  it('ships the HTML report generator without claiming acceptance', () => {
    expect(existsSync(reportScriptPath)).toBe(true)
    const source = readFileSync(reportScriptPath, 'utf8')
    expect(source).toContain('does not change PUBLIC-190')
    expect(source).toContain('buildPublic270CompareRows')
    expect(source).toContain('buildHomeCompareRows')
  })

  it('ships the SHA-256 extract helper without claiming acceptance', () => {
    expect(existsSync(hashExtractScriptPath)).toBe(true)
    const source = readFileSync(hashExtractScriptPath, 'utf8')
    expect(source).toContain('Does NOT auto-approve')
    expect(source).toContain('buildPublic270CompareRows')
    expect(source).toContain('buildHomeCompareRows')
  })

  it('documents the owner compare workflow in the evidence checklist', () => {
    expect(existsSync(checklistPath)).toBe(true)
    const checklist = readFileSync(checklistPath, 'utf8')
    expect(checklist).toContain('report:visual-compare')
    expect(checklist).toContain('report:signoff-hashes')
    expect(checklist).toContain('generate-visual-compare-report.mjs')
    expect(checklist).toContain('extract-visual-signoff-hashes.mjs')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
  })
})
