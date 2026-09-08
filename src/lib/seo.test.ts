import { describe, expect, it } from 'vitest'

import { buildPageSeo, pickDetailSeo } from './seo'

describe('buildPageSeo', () => {
  const origin = 'https://tahamohamadi.ir'

  it('builds canonical and alternates for a locale home page', () => {
    expect(buildPageSeo(origin, 'fa', '', false)).toEqual({
      canonical: 'https://tahamohamadi.ir/fa/',
      alternates: [
        { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/' },
        { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/' },
      ],
    })
  })

  it('includes the alternate locale when available', () => {
    expect(buildPageSeo(origin, 'en', 'contact', true)).toEqual({
      canonical: 'https://tahamohamadi.ir/en/contact/',
      alternates: [
        { hreflang: 'en', href: 'https://tahamohamadi.ir/en/contact/' },
        { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/contact/' },
        { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/contact/' },
      ],
    })
  })
})

describe('pickDetailSeo', () => {
  it('forwards typed PublicSeoOut description and image', () => {
    expect(
      pickDetailSeo({
        title: 'Book',
        description: 'Edited description',
        image: 'https://cdn.example.test/cover.jpg',
      }),
    ).toEqual({
      description: 'Edited description',
      socialImage: 'https://cdn.example.test/cover.jpg',
    })
  })

  it('omits absent or blank values so layouts skip the meta tags', () => {
    expect(pickDetailSeo(null)).toEqual({})
    expect(pickDetailSeo(undefined)).toEqual({})
    expect(pickDetailSeo({ title: 'Book' })).toEqual({})
    expect(
      pickDetailSeo({ title: 'Book', description: '   ', image: '' }),
    ).toEqual({})
  })
})
