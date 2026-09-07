import { describe, expect, it } from 'vitest'

import {
  buildAlternateLinks,
  buildCanonicalUrl,
  canonicalPath,
  isReservedSlug,
  localeFromPath,
  resolveLegacyMigrationRedirect,
  stripLocalePrefix,
} from './routes'

describe('locale route helpers', () => {
  it('reads locale prefixes', () => {
    expect(localeFromPath('/fa/about/')).toBe('fa')
    expect(localeFromPath('/en/')).toBe('en')
    expect(localeFromPath('/')).toBeNull()
  })

  it('strips locale prefixes', () => {
    expect(stripLocalePrefix('/fa/about/')).toBe('about')
    expect(stripLocalePrefix('/en/')).toBe('')
  })

  it('builds canonical URLs', () => {
    expect(buildCanonicalUrl('https://tahamohamadi.ir', 'fa', 'about')).toBe(
      'https://tahamohamadi.ir/fa/about/',
    )
  })

  it('builds hreflang alternates when available', () => {
    expect(
      buildAlternateLinks('https://tahamohamadi.ir', 'en', 'about', true),
    ).toEqual([
      { hreflang: 'en', href: 'https://tahamohamadi.ir/en/about/' },
      { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/about/' },
      { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/about/' },
    ])
  })

  it('generates canonical paths for all target families and explicit statement routes', () => {
    expect(canonicalPath('research-statement', 'en', 'ai-alignment')).toBe(
      '/en/research/statements/ai-alignment/',
    )
    expect(canonicalPath('series', 'fa', 'nlp-to-sql')).toBe(
      '/fa/blog/series/nlp-to-sql/',
    )
    expect(canonicalPath('lesson', 'en', 'intro', 'machine-learning')).toBe(
      '/en/education/machine-learning/lessons/intro/',
    )
    expect(canonicalPath('book', 'en', 'human-centered-ai')).toBe(
      '/en/books/human-centered-ai/',
    )
    expect(canonicalPath('talk', 'fa', 'edge-intelligence')).toBe(
      '/fa/talks/edge-intelligence/',
    )
    expect(canonicalPath('resource', 'en', 'dataset-v1')).toBe(
      '/en/resources/dataset-v1/',
    )
    expect(canonicalPath('collection', 'en', 'core-papers')).toBe(
      '/en/collections/core-papers/',
    )
  })

  it('detects reserved segments for blog and research families', () => {
    expect(isReservedSlug('blog', 'series')).toBe(true)
    expect(isReservedSlug('blog', 'regular-article')).toBe(false)
    expect(isReservedSlug('research', 'statements')).toBe(true)
    expect(isReservedSlug('research', 'projects')).toBe(true)
    expect(isReservedSlug('research', 'publications')).toBe(true)
    expect(isReservedSlug('research', 'human-ai-systems')).toBe(false)
  })

  it('resolves legacy migration redirects correctly', () => {
    expect(resolveLegacyMigrationRedirect('/en/writing/my-post/')).toEqual({
      target: '/en/blog/my-post/',
      permanent: true,
    })
    expect(resolveLegacyMigrationRedirect('/fa/teaching/course-101/')).toEqual({
      target: '/fa/education/course-101/',
      permanent: true,
    })
    expect(resolveLegacyMigrationRedirect('/en/creative/poster-art/')).toEqual({
      target: '/en/gallery/poster-art/',
      permanent: true,
    })
    expect(resolveLegacyMigrationRedirect('/en/research/projects/')).toEqual({
      target: '/en/projects/',
      permanent: true,
    })
  })
})
