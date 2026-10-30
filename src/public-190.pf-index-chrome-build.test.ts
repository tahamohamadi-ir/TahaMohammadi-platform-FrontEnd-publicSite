import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

// Empty-state policy: an unpublished page-family index/detail renders one
// honest ContentState (title, message, a real way home) — not a wireframe
// replica of a populated page (fake filters, disabled chips, placeholder
// rows, fake pagination, fake "featured"/sidebar/sub-nav shells). See
// Docs/04-design/CONTENT-STATE-MATRIX.md and the equivalent per-page tests
// in src/components/{about,contact,creative,cv,projects,publications,
// research,teaching,writing}/*.test.ts.
const PF_INDEX_UNAVAILABLE_ROUTES = [
  'en/publications/index.html',
  'en/research/index.html',
  'en/contact/index.html',
  'en/cv/index.html',
  'en/about/index.html',
  'en/projects/index.html',
  'en/gallery/index.html',
  'en/blog/index.html',
  'en/education/index.html',
  // "empty-shell" is a reserved design-QA fixture slug; it now renders the
  // same honest unavailable-detail ContentState as a real unavailable
  // creative detail page (see CreativeDetailContent.astro).
  'en/gallery/empty-shell/index.html',
  'fa/gallery/empty-shell/index.html',
] as const

const FABRICATED_CHROME_MARKERS = [
  'PageFamilySubNavShell',
  'PageFamilyPublicationsSidebarShell',
  'PageFamilySelectedPublicationsShell',
  'PageFamilyBibliographyRowPlaceholder',
  'PageFamilyConstellationShell',
  'PageFamilyResearchDirectionsShell',
  'PageFamilyResearchFitShell',
  'PageFamilyContactHeroShell',
  'PageFamilyTopicCardsShell',
  'PageFamilyContactSidebarShell',
  'PageFamilyProfileHeroShell',
  'PageFamilyIndexHero',
  'PageFamilyFeaturedShell',
  'PageFamilyContentRowPlaceholder',
  'PageFamilyEvidenceGridShell',
  'PageFamilySortShell',
  'PageFamilyPaginationShell',
  'PageFamilyCollaborateBandShell',
  'PageFamilyMediaGridPlaceholder',
  'PageFamilyListCardShell',
  'PageFamilyPathProcessShell',
  'PageFamilyFeaturedPathShell',
  'PageFamilyTeachingFilterDropdowns',
  'PageFamilyCreativeDetailShell',
  'Awaiting approved CMS copy',
] as const

describe('PUBLIC-190 PF index/detail build chrome', () => {
  it('ships one honest ContentState in static build HTML, never fabricated chrome', () => {
    for (const route of PF_INDEX_UNAVAILABLE_ROUTES) {
      const filePath = path.join(repositoryRoot, 'dist', route)
      expect(existsSync(filePath), `${route} must exist in dist`).toBe(true)
      const html = readFileSync(filePath, 'utf8')
      expect(html, route).toContain('data-visual-id="ContentState"')
      expect(html, route).toMatch(/data-state-variant="(unavailable|empty)"/)
      expect(html, route).toMatch(/<h1[\s>]/)
      for (const marker of FABRICATED_CHROME_MARKERS) {
        expect(html, `${route} must not contain ${marker}`).not.toContain(
          marker,
        )
      }
    }
  })
})
