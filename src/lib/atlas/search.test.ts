import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { buildSearchIndex, normalizeFa } from './search'

function makePayload(): AtlasPayload {
  const node = (
    key: string,
    label: string,
    importance: number,
    extra: Record<string, unknown> = {},
  ) => ({
    key,
    type: 'research-area',
    label,
    importance,
    mobileOverviewPriority: 'auto',
    aliases: [],
    position: { x: 0, y: 0, z: 0 },
    ...extra,
  })
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'fa',
    version: {
      id: 1,
      revision: '1-x',
      publishedAt: '2026-09-21T00:00:00.000000+00:00',
      nodeCount: 4,
      relationCount: 0,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [
      node('area-00000001', 'پردازش زبان فارسی', 80, {
        aliases: ['Persian NLP'],
      }),
      node('area-00000002', 'بینایی ماشین', 70),
      node('area-00000003', 'زبان‌شناسی رايانه‌ای', 60),
      node('area-00000004', 'پردازش سیگنال', 80),
    ],
    relations: [],
  } as unknown as AtlasPayload
}

describe('atlas search (Plan C Task 10)', () => {
  it('folds Persian orthography before matching', () => {
    expect(normalizeFa('ي')).toBe('ی')
    expect(normalizeFa('ك')).toBe('ک')
    expect(normalizeFa('۰۱۲۳')).toBe('0123')
    expect(normalizeFa('٠١٢٣')).toBe('0123')
    expect(normalizeFa('می‌روم')).toBe('میروم')
    expect(normalizeFa('کتــاب')).toBe('کتاب')
  })

  it('ranks prefix above substring and breaks ties by (-importance, key)', () => {
    const index = buildSearchIndex(makePayload())
    const keys = index.search('پردازش', {}).map((r) => r.key)
    // Both area-1 and area-4 prefix-match; equal importance → key order.
    expect(keys.slice(0, 2)).toEqual(['area-00000001', 'area-00000004'])
    // 'زبان' is a substring of area-1 but a prefix of area-3: prefix wins.
    const ranked = index.search('زبان', {}).map((r) => r.key)
    expect(ranked[0]).toBe('area-00000003')
  })

  it('matches aliases and canonical titles', () => {
    const index = buildSearchIndex(makePayload())
    expect(index.search('nlp', {}).map((r) => r.key)).toContain('area-00000001')
  })

  it('respects the limit', () => {
    const index = buildSearchIndex(makePayload())
    expect(index.search('ا', { limit: 2 })).toHaveLength(2)
  })
})
