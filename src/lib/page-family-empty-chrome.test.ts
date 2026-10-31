import { describe, expect, it } from 'vitest'

import {
  getCmsPlaceholderCopy,
  getContactFaqItems,
  getGatewayRoleLine,
  getPageFamilyHeroMedia,
  getPageFamilyHeroSummary,
  getProfileHeroCtaLabels,
  getResearchConstellationLegend,
  getWritingHeroEyebrow,
} from './page-family-empty-chrome'

describe('page-family empty chrome', () => {
  it('maps hero media from promoted authority assets', () => {
    expect(getPageFamilyHeroMedia('creative')).toEqual({
      kind: 'theme',
      lightAssetId: 'portal-world-light',
      darkAssetId: 'portal-world-dark',
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
  })

  it('exposes profile CTA structural labels', () => {
    expect(getProfileHeroCtaLabels('fa').research).toBeTruthy()
  })

  it('exposes PF-03 writing structural chrome helpers', () => {
    expect(getWritingHeroEyebrow('en')).toBe('Independent writing')
    expect(getPageFamilyHeroSummary('en', 'writing')).toContain(
      'independent from project records',
    )
  })

  it('exposes PF-08 FAQ structural rows', () => {
    expect(getContactFaqItems('en')).toHaveLength(3)
  })
})
