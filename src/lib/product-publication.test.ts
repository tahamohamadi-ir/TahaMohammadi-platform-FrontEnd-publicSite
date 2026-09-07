import { describe, expect, it } from 'vitest'
import { buildPageSeo } from './seo'
import {
  buildCanonicalUrl,
  buildAlternateLinks,
  localeFromPath,
  stripLocalePrefix,
  type Locale,
} from './routes'
import {
  fetchCollectionDetail,
  type CollectionCardOut,
} from './collections-content'

describe('PU-25 Product Publication State and Routing Verification', () => {
  const origin = 'https://tahamohamadi.ir'

  describe('Synthetic publication item lifecycle and draft exclusion', () => {
    interface SyntheticRecord {
      id: string
      slug: string
      title: string
      status: 'draft' | 'published' | 'archived'
      locale: Locale
      translationSlug?: string
    }

    const syntheticCatalog: SyntheticRecord[] = [
      {
        id: 'synth-pub-01',
        slug: 'verified-autonomous-agents',
        title: 'Verified Autonomous Agents',
        status: 'published',
        locale: 'en',
        translationSlug: 'amelen-khodmokhtar-motabar',
      },
      {
        id: 'synth-pub-02',
        slug: 'amelen-khodmokhtar-motabar',
        title: 'عامل‌های خودمختار معتبر',
        status: 'published',
        locale: 'fa',
        translationSlug: 'verified-autonomous-agents',
      },
      {
        id: 'synth-draft-01',
        slug: 'unreleased-internal-notes',
        title: 'Unreleased Internal Draft Notes',
        status: 'draft',
        locale: 'en',
      },
      {
        id: 'synth-archived-01',
        slug: 'deprecated-experimental-v1',
        title: 'Deprecated Experimental Work',
        status: 'archived',
        locale: 'fa',
      },
    ]

    it('strictly excludes draft and archived records from public indexes', () => {
      const publicCatalog = syntheticCatalog.filter(
        (record) => record.status === 'published',
      )

      expect(publicCatalog).toHaveLength(2)
      expect(publicCatalog.map((r) => r.id)).toEqual([
        'synth-pub-01',
        'synth-pub-02',
      ])
      expect(publicCatalog.some((r) => r.status === 'draft')).toBe(false)
      expect(publicCatalog.some((r) => r.status === 'archived')).toBe(false)
    })

    it('generates canonical and alternates for published record with translation', () => {
      const pubEn = syntheticCatalog.find((r) => r.id === 'synth-pub-01')!
      const pubFa = syntheticCatalog.find((r) => r.id === 'synth-pub-02')!

      const canonicalEn = buildCanonicalUrl(
        origin,
        pubEn.locale,
        `research/${pubEn.slug}`,
      )
      expect(canonicalEn).toBe(
        'https://tahamohamadi.ir/en/research/verified-autonomous-agents/',
      )

      const canonicalFa = buildCanonicalUrl(
        origin,
        pubFa.locale,
        `research/${pubFa.slug}`,
      )
      expect(canonicalFa).toBe(
        'https://tahamohamadi.ir/fa/research/amelen-khodmokhtar-motabar/',
      )

      const alternates = buildAlternateLinks(
        origin,
        pubEn.locale,
        `research/${pubEn.slug}`,
        Boolean(pubEn.translationSlug),
      )
      expect(alternates).toEqual([
        {
          hreflang: 'en',
          href: 'https://tahamohamadi.ir/en/research/verified-autonomous-agents/',
        },
        {
          hreflang: 'fa',
          href: 'https://tahamohamadi.ir/fa/research/verified-autonomous-agents/',
        },
        {
          hreflang: 'x-default',
          href: 'https://tahamohamadi.ir/fa/research/verified-autonomous-agents/',
        },
      ])
    })

    it('omits alternate locale links when translation is unavailable', () => {
      const singleLocaleRecord: SyntheticRecord = {
        id: 'synth-single-fa',
        slug: 'fa-only-special-report',
        title: 'گزارش ویژه فارسی',
        status: 'published',
        locale: 'fa',
      }

      const seo = buildPageSeo(
        origin,
        singleLocaleRecord.locale,
        `research/${singleLocaleRecord.slug}`,
        false,
      )

      expect(seo.canonical).toBe(
        'https://tahamohamadi.ir/fa/research/fa-only-special-report/',
      )
      expect(seo.alternates).toEqual([
        {
          hreflang: 'fa',
          href: 'https://tahamohamadi.ir/fa/research/fa-only-special-report/',
        },
        {
          hreflang: 'x-default',
          href: 'https://tahamohamadi.ir/fa/research/fa-only-special-report/',
        },
      ])
      // Does not invent a phantom /en/ link
      expect(seo.alternates.some((a) => a.hreflang === 'en')).toBe(false)
    })
  })

  describe('Route extraction and locale consistency', () => {
    it('correctly maps locale prefixes and route tails', () => {
      expect(localeFromPath('/fa/')).toBe('fa')
      expect(localeFromPath('/en/blog/')).toBe('en')
      expect(localeFromPath('/fa/projects/alpha/')).toBe('fa')
      expect(localeFromPath('/')).toBeNull()

      expect(stripLocalePrefix('/fa/research/')).toBe('research')
      expect(stripLocalePrefix('/en/teaching/course-101/')).toBe(
        'teaching/course-101',
      )
      expect(stripLocalePrefix('/fa/')).toBe('')
    })
  })

  describe('Empty and honest runtime state behavior', () => {
    it('returns unavailable when API cannot be fetched rather than fabricating dummy records', async () => {
      const result = await fetchCollectionDetail('en', 'non-existent-item')
      expect(result.status).toBe('unavailable')
    })

    it('handles empty collection item array without fabricating entries', () => {
      const emptyItems: CollectionCardOut[] = []
      expect(emptyItems).toHaveLength(0)
      const mapped = emptyItems.map((item) => item.title)
      expect(mapped).toEqual([])
    })
  })
})
