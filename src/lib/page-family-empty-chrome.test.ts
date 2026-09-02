import { describe, expect, it } from 'vitest'

import {
  getPageFamilyFeaturedActionLabel,
  getPageFamilyFeaturedCardLabel,
  getPageFamilyFeaturedSectionLabel,
  getPageFamilyHeroMedia,
  getPageFamilyListSectionLabel,
  getPageFamilyPreviewAsset,
  getPageFamilyRowPreviewAssets,
  getPageFamilySkillsSectionLabel,
} from './page-family-empty-chrome'

describe('page-family empty chrome', () => {
  it('maps hero media from promoted authority assets', () => {
    expect(getPageFamilyHeroMedia('creative')).toEqual({
      kind: 'single',
      assetId: 'gallery-ivory-forms',
      mediaSlot: 'home.rail.preview',
    })
    expect(getPageFamilyHeroMedia('projects')).toEqual({
      kind: 'single',
      assetId: 'project-data-architecture',
      mediaSlot: 'home.project.preview',
    })
    expect(getPageFamilyHeroMedia('research')).toEqual({
      kind: 'single',
      assetId: 'learning-sage-library',
      mediaSlot: 'home.rail.preview',
    })
    expect(getPageFamilyHeroMedia('contact').kind).toBe('theme')
  })

  it('exposes featured labels for editorial and project families', () => {
    expect(getPageFamilyFeaturedSectionLabel('en', 'writing')).toBe('Featured')
    expect(getPageFamilyFeaturedSectionLabel('fa', 'creative')).toBe('برگزیده')
    expect(getPageFamilyFeaturedSectionLabel('en', 'projects')).toBe(
      'Featured project',
    )
  })

  it('exposes structural featured card and action labels', () => {
    expect(getPageFamilyFeaturedCardLabel('en', 'creative')).toBe(
      'Selected visual work',
    )
    expect(getPageFamilyFeaturedCardLabel('en', 'projects')).toBe(
      'Featured project',
    )
    expect(getPageFamilyFeaturedActionLabel('en', 'projects')).toBe(
      'View case study',
    )
    expect(getPageFamilyFeaturedActionLabel('fa', 'writing')).toBe(
      'خواندن مقاله',
    )
  })

  it('maps list preview assets without inventing runtime ids', () => {
    expect(getPageFamilyPreviewAsset('projects')).toEqual({
      assetId: 'project-data-architecture',
      mediaSlot: 'home.project.preview',
    })
    expect(getPageFamilyRowPreviewAssets('projects')).toHaveLength(2)
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
