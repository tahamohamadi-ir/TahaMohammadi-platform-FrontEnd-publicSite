import { describe, expect, it } from 'vitest'

import { buildPageSeo } from './seo'

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
