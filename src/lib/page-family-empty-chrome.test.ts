import { describe, expect, it } from 'vitest'

import {
  getPageFamilyFeaturedActionLabel,
  getPageFamilyFeaturedCardLabel,
  getPageFamilyFeaturedSectionLabel,
  getPageFamilyHeroMedia,
  getPageFamilyListSectionLabel,
  getPageFamilyPreviewAsset,
  getPageFamilySkillsSectionLabel,
} from './page-family-empty-chrome'

describe('page-family empty chrome', () => {
  it('maps hero media from promoted authority assets', () => {
    expect(getPageFamilyHeroMedia('creative')).toEqual({
      kind: 'single',
      assetId: 'gallery-ivory-forms',
      mediaSlot: 'home.rail.preview',
    })
    expect(getPageFamilyHeroMedia('contact').kind).toBe('theme')
  })

  it('exposes featured labels only for editorial families', () => {
    expect(getPageFamilyFeaturedSectionLabel('en', 'writing')).toBe('Featured')
    expect(getPageFamilyFeaturedSectionLabel('fa', 'creative')).toBe('برگزیده')
    expect(getPageFamilyFeaturedSectionLabel('en', 'projects')).toBeNull()
  })

  it('maps list preview assets without inventing runtime ids', () => {
    expect(getPageFamilyPreviewAsset('projects').assetId).toBe(
      'blog-coral-stairs',
    )
  })

  it('exposes PF-06 list and PF-07 skills section labels', () => {
    expect(getPageFamilyListSectionLabel('en', 'teaching')).toBe(
      'Learning library',
    )
    expect(getPageFamilyListSectionLabel('fa', 'writing')).toBeNull()
    expect(getPageFamilySkillsSectionLabel('en', 'about')).toBe('Skills')
    expect(getPageFamilySkillsSectionLabel('fa', 'cv')).toBeNull()
  })
})
