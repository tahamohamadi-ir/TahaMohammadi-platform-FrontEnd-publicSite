import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const PF_INDEX_CHROME_ROUTES = [
  {
    route: 'en/publications/index.html',
    markers: [
      'CollectionIndexTemplate',
      'PageFamilyIndexHero',
      'PageFamilyPublicationsSidebarShell',
      'PageFamilySelectedPublicationsShell',
      'page-families',
    ],
  },
  {
    route: 'en/cv/index.html',
    markers: [
      'AboutContactUtilityTemplate',
      'PageFamilyProfileHeroShell',
      'PageFamilySubNavShell',
      'page-families',
    ],
  },
  {
    route: 'en/about/index.html',
    markers: [
      'AboutContactUtilityTemplate',
      'PageFamilyProfileHeroShell',
      'page-families',
    ],
  },
  {
    route: 'en/creative/empty-shell/index.html',
    markers: [
      'PageFamilyCreativeDetailShell',
      'PageFamilyCollaborateBandShell',
      'page-families',
      'Awaiting approved CMS copy',
    ],
  },
  {
    route: 'fa/creative/empty-shell/index.html',
    markers: [
      'PageFamilyCreativeDetailShell',
      'PageFamilyCollaborateBandShell',
      'page-families',
    ],
  },
] as const

describe('PUBLIC-190 PF index build chrome', () => {
  it('ships full template and shell markers in static build HTML', () => {
    for (const entry of PF_INDEX_CHROME_ROUTES) {
      const filePath = path.join(repositoryRoot, 'dist', entry.route)
      expect(existsSync(filePath), `${entry.route} must exist in dist`).toBe(
        true,
      )
      const html = readFileSync(filePath, 'utf8')
      for (const marker of entry.markers) {
        expect(html).toContain(marker)
      }
      expect(html).toMatch(/<h1[\s>]/)
    }
  })
})
