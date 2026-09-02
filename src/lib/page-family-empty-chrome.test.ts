import { describe, expect, it } from 'vitest'

import {
  getAboutHowIWorkPillars,
  getAboutSubNavLabels,
  getCmsPlaceholderCopy,
  getContactFaqItems,
  getGatewayRoleLine,
  getPublicationsInterestItems,
  getResearchConstellationLegend,
  getResearchDirectionRows,
  getPageFamilyFeaturedActionLabel,
  getPageFamilyFeaturedCardLabel,
  getPageFamilyFeaturedSectionLabel,
  getPageFamilyHeroMedia,
  getPageFamilyListSectionLabel,
  getPageFamilyPreviewAsset,
  getPageFamilyRowPreviewAssets,
  getPageFamilySkillsSectionLabel,
  getPageFamilyThemeExploreLabels,
  getPageFamilyThemeExploreSectionLabel,
  getProfileHeroCtaLabels,
  getTeachingPathProcessSteps,
} from './page-family-empty-chrome'

describe('page-family empty chrome', () => {
  it('maps hero media from promoted authority assets', () => {
    expect(getPageFamilyHeroMedia('creative')).toEqual({
      kind: 'theme',
      lightAssetId: 'portal-centered-light',
      darkAssetId: 'portal-centered-dark',
      mediaSlot: 'gateway.atmosphere',
    })
    expect(getPageFamilyHeroMedia('projects')).toEqual({
      kind: 'single',
      assetId: 'project-data-architecture',
      mediaSlot: 'home.project.preview',
    })
    expect(getPageFamilyHeroMedia('research')).toEqual({
      kind: 'single',
      assetId: 'blog-coral-stairs',
      mediaSlot: 'home.rail.preview',
    })
    expect(getPageFamilyHeroMedia('contact').kind).toBe('theme')
  })

  it('exposes approved CMS placeholder copy per locale', () => {
    expect(getCmsPlaceholderCopy('en')).toBe('Awaiting approved CMS copy')
    expect(getCmsPlaceholderCopy('fa')).toContain('CMS')
  })

  it('exposes PF-05 structural research chrome labels', () => {
    expect(getGatewayRoleLine('en')).toContain('Researcher')
    expect(getGatewayRoleLine('fa')).toContain('پژوهشگر')
    expect(getResearchConstellationLegend('en')).toHaveLength(5)
    expect(getResearchDirectionRows('en')).toHaveLength(5)
    expect(getPublicationsInterestItems('fa')).toHaveLength(5)
  })

  it('exposes About sub-nav and profile CTA structural labels', () => {
    expect(getAboutSubNavLabels('en')).toHaveLength(7)
    expect(getProfileHeroCtaLabels('fa').research).toBeTruthy()
    expect(getAboutHowIWorkPillars('en')).toHaveLength(4)
    expect(getTeachingPathProcessSteps('en')).toHaveLength(4)
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

  it('exposes PF-03 explore-by-theme structural labels', () => {
    expect(getPageFamilyThemeExploreSectionLabel('en', 'writing')).toBe(
      'Explore by theme',
    )
    expect(getPageFamilyThemeExploreSectionLabel('fa', 'creative')).toBeNull()
    expect(getPageFamilyThemeExploreLabels('en', 'writing')).toEqual([
      'Essays',
      'Notes',
      'Memories',
      'Society',
      'Archive',
    ])
    expect(getPageFamilyThemeExploreLabels('fa', 'writing')).toHaveLength(5)
  })

  it('exposes PF-08 FAQ structural rows', () => {
    expect(getContactFaqItems('en')).toHaveLength(3)
  })
})
