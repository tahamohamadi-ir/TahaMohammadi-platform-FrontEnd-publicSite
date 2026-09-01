import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { GROUP_B_ASSET_IDS } from './lib/media/authority-checksums'
import {
  BRAND_MARK_ASSET_ID,
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
} from './lib/media/project-mappings'
import { PROMOTED_ASSET_REGISTRY } from './lib/media/promoted-media-registry'
import { PREVIEW_WIDTHS, PROMOTED_FORMATS } from './lib/media/transform-recipes'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const publicMediaRoot = path.join(repositoryRoot, 'public', 'media')
const runtimeMediaRoot = path.join(repositoryRoot, 'src', 'assets', 'media')

describe('PUBLIC-261 asset promotion group B (previews, rails, brand shell)', () => {
  it('registers project previews with consumer-content alt and preview transforms', () => {
    expect(HOME_PROJECT_ASSET_BY_SLUG).toEqual({
      'pars-sql-vtd-edge': 'project-data-architecture',
      'organizational-dashboard-research': 'project-dashboard-systems',
    })

    for (const id of [
      'project-dashboard-systems',
      'project-data-architecture',
    ] as const) {
      const record = PROMOTED_ASSET_REGISTRY[id]
      expect(record.semantics).toEqual({ kind: 'consumer-content' })
      expect(record.placement.slot).toBe('home.project.preview')
      expect(record.transform.widths).toEqual(PREVIEW_WIDTHS)
      expect(record.transform.formats).toEqual(PROMOTED_FORMATS)
      expect(existsSync(path.join(runtimeMediaRoot, record.assetFile))).toBe(
        true,
      )
    }
  })

  it('registers rail decorative assets with decorative alt and definitive path mappings', () => {
    expect(HOME_RAIL_ASSET_BY_PATH).toEqual({
      writing: 'blog-coral-stairs',
      teaching: 'learning-sage-library',
      creative: 'gallery-ivory-forms',
    })

    for (const id of [
      'blog-coral-stairs',
      'learning-sage-library',
      'gallery-ivory-forms',
    ] as const) {
      const record = PROMOTED_ASSET_REGISTRY[id]
      expect(record.semantics).toEqual({ kind: 'decorative', alt: '' })
      expect(record.placement.slot).toBe('home.rail.preview')
      expect(record.transform.widths).toEqual(PREVIEW_WIDTHS)
      expect(record.transform.formats).toEqual(PROMOTED_FORMATS)
      expect(existsSync(path.join(runtimeMediaRoot, record.assetFile))).toBe(
        true,
      )
    }
  })

  it('registers brand mark with localized content alt in runtime asset tree', () => {
    const record = PROMOTED_ASSET_REGISTRY[BRAND_MARK_ASSET_ID]
    expect(record.semantics.kind).toBe('content')
    expect(record.placement.slot).toBe('brand.mark')
    expect(existsSync(path.join(runtimeMediaRoot, record.assetFile))).toBe(true)
  })

  it('includes every group B asset in the runtime tree with exact authority paths', () => {
    for (const id of GROUP_B_ASSET_IDS) {
      const record = PROMOTED_ASSET_REGISTRY[id]
      expect(existsSync(path.join(runtimeMediaRoot, record.assetFile))).toBe(
        true,
      )
    }
  })

  it('removes legacy raw public group B art after promotion to src/assets/media', () => {
    const legacyPaths = [
      path.join(publicMediaRoot, 'art', 'project-dashboard-systems.png'),
      path.join(publicMediaRoot, 'art', 'project-data-architecture.png'),
      path.join(publicMediaRoot, 'brand', 'taha-mark-primary.png'),
    ]
    for (const legacyPath of legacyPaths) {
      expect(
        existsSync(legacyPath),
        `legacy public file must be removed: ${legacyPath}`,
      ).toBe(false)
    }
  })

  it('wires Header and Footer shell to PromotedPicture brand.mark pipeline', () => {
    for (const component of ['Header.astro', 'Footer.astro'] as const) {
      const source = readFileSync(
        path.join(repositoryRoot, 'src', 'components', component),
        'utf8',
      )
      expect(source).toContain('PromotedPicture')
      expect(source).toContain('BRAND_MARK_ASSET_ID')
      expect(source).toContain('mediaSlot="brand.mark"')
      expect(source).not.toContain('/media/brand/taha-mark-primary.png')
    }
  })

  it('documents PromotedPicture consumer wiring for home project and rail previews', () => {
    const featured = readFileSync(
      path.join(
        repositoryRoot,
        'src',
        'components',
        'home',
        'HomeFeaturedProjects.astro',
      ),
      'utf8',
    )
    expect(featured).toContain('PromotedPicture')
    expect(featured).toContain('mediaSlot="home.project.preview"')

    const rails = readFileSync(
      path.join(
        repositoryRoot,
        'src',
        'components',
        'home',
        'HomeExploreRails.astro',
      ),
      'utf8',
    )
    expect(rails).toContain('PromotedPicture')
    expect(rails).toContain('mediaSlot="home.rail.preview"')
  })
})
