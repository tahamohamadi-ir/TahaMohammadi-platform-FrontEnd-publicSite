import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md',
)
const e2ePath = path.join(
  repositoryRoot,
  'tests',
  'e2e',
  'public-270-page-families.visual.e2e.ts',
)

const PAGE_FAMILY_ROUTE_MAP = [
  {
    pf: 'PF-01',
    concept: 'creative-index-light.png',
    routes: ['/{locale}/creative/'],
  },
  {
    pf: 'PF-02',
    concept: 'creative-detail-dark.png',
    routes: ['/{locale}/creative/{slug}/'],
  },
  {
    pf: 'PF-03',
    concept: 'writing-index-light.png',
    routes: ['/{locale}/writing/'],
  },
  {
    pf: 'PF-04',
    concept: 'projects-index-dark.png',
    routes: ['/{locale}/projects/'],
  },
  {
    pf: 'PF-05',
    concept: 'research-publications-index-light.png',
    routes: ['/{locale}/research/', '/{locale}/publications/'],
  },
  {
    pf: 'PF-06',
    concept: 'teaching-index-dark.png',
    routes: ['/{locale}/teaching/'],
  },
  {
    pf: 'PF-07',
    concept: 'about-cv-light.png',
    routes: ['/{locale}/about/', '/{locale}/cv/'],
  },
  { pf: 'PF-08', concept: 'contact-dark.png', routes: ['/{locale}/contact/'] },
] as const

describe('PUBLIC-270 page-family visual evidence scaffold', () => {
  it('ships the PF-01..PF-08 checklist mapping routes to concept references', () => {
    expect(existsSync(checklistPath)).toBe(true)
    const checklist = readFileSync(checklistPath, 'utf8')

    for (const entry of PAGE_FAMILY_ROUTE_MAP) {
      expect(checklist).toContain(entry.pf)
      expect(checklist).toContain(entry.concept)
      for (const route of entry.routes) {
        expect(checklist).toContain(route)
      }
    }

    expect(checklist).toContain('concepts/page-families/')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
  })

  it('registers Playwright @visual capture stubs at 1440 and 390', () => {
    expect(existsSync(e2ePath)).toBe(true)
    const source = readFileSync(e2ePath, 'utf8')

    expect(source).toContain('@visual')
    expect(source).toContain('PUBLIC_270_CAPTURE_WIDTHS')
    expect(source).toContain('PUBLIC-270')
    expect(source).toContain('/en/creative/')
    expect(source).toContain('/en/contact/')
  })
})
