import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import HeroGraph from '../components/hero/HeroGraph.astro'
import {
  collectRelatedRefs,
  createRecordResolver,
  fetchRecordResolutions,
  loadHeroGraph,
  workRefToHref,
  MAX_RESOLVE_REFS_PER_REQUEST,
  type GraphPayloadOut,
  type HeroGraphModel,
  type RecordWorkRef,
  type RelatedRecordRef,
} from './hero-graph-content'
import type { Locale } from './navigation'

function node(
  id: string,
  relatedRecords: unknown = [],
): Record<string, unknown> {
  return {
    id,
    label: `Node ${id}`,
    accessibleLabel: `Graph node ${id}`,
    type: 'researchtopic',
    weight: 1,
    summary: `Summary ${id}`,
    colorRole: 'research',
    iconRole: 'disc',
    relatedRecords,
  }
}

function payloadWith(nodes: Record<string, unknown>[]): GraphPayloadOut {
  return { nodes, edges: [] } as GraphPayloadOut
}

function workRef(
  family: string,
  id: string,
  locale: Locale,
  slug: string,
  routeFamily = 'blog',
  courseSlug: string | null = null,
): RecordWorkRef {
  return {
    family,
    id,
    locale,
    slug,
    title: `Title ${id}`,
    summary: `Summary ${id}`,
    routeFamily,
    courseSlug,
  } as RecordWorkRef
}

/** Stub fetch routing by URL substring; records every requested URL. */
function stubFetch(
  routes: Record<string, { status: number; body: unknown }>,
  seen: string[],
) {
  return (async (input: unknown) => {
    const url = String(input)
    seen.push(url)
    for (const [key, value] of Object.entries(routes)) {
      if (url.includes(key)) {
        return new Response(JSON.stringify(value.body), {
          status: value.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    return new Response('not found', { status: 404 })
  }) as unknown as typeof fetch
}

/** Resolver stub echoing every requested ref as a published same-locale hit. */
function resolvingFetch(
  locale: Locale,
  seen: string[],
  overrides: Record<string, RecordWorkRef> = {},
  failingMarker = '__none__',
) {
  return (async (input: unknown) => {
    const url = String(input)
    seen.push(url)
    if (!url.includes('/api/v1/records/')) {
      return new Response('not found', { status: 404 })
    }
    if (url.includes(failingMarker)) {
      return new Response('boom', { status: 500 })
    }
    const query = url.split('refs=')[1] ?? ''
    const refs = query.split(',').filter(Boolean)
    const items = refs.map((ref) => {
      const [family, id] = ref.split(':').map(decodeURIComponent)
      const key = `${family}:${id}`
      if (overrides[key]) return overrides[key]
      return workRef(
        family,
        id,
        locale,
        `post-${id}`,
        family === 'article' ? 'blog' : 'research',
      )
    })
    return new Response(JSON.stringify({ items, unresolved: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

function readyModel(model: HeroGraphModel) {
  expect(model.status).toBe('ready')
  if (model.status !== 'ready') throw new Error('expected ready model')
  return model
}

beforeEach(() => {
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://cms.example.test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('A05 collectRelatedRefs', () => {
  it('dedupes pairs and skips unknown families and invalid ids', () => {
    const payload = payloadWith([
      node('n1', [
        { family: 'article', id: '7' },
        { family: 'article', id: '7' },
        { family: 'nope', id: '1' },
        { family: 'article', id: '0' },
        { family: 'article', id: '007' },
      ]),
      node('n2', [
        { family: 'article', id: '7' },
        { family: 'book', id: '3' },
      ]),
    ])
    expect(collectRelatedRefs(payload)).toEqual([
      { family: 'article', id: '7' },
      { family: 'book', id: '3' },
    ])
  })

  it('returns an empty list without a node array', () => {
    expect(collectRelatedRefs(null)).toEqual([])
    expect(collectRelatedRefs({} as GraphPayloadOut)).toEqual([])
  })
})

describe('A05 fetchRecordResolutions', () => {
  it(`batches more than ${MAX_RESOLVE_REFS_PER_REQUEST} ids preserving order`, async () => {
    expect(MAX_RESOLVE_REFS_PER_REQUEST).toBe(50)
    const refs: RelatedRecordRef[] = Array.from({ length: 55 }, (_, i) => ({
      family: 'article',
      id: String(i + 1),
    }))
    const seen: string[] = []
    const map = await fetchRecordResolutions(
      'en',
      refs,
      resolvingFetch('en', seen),
    )
    const resolveCalls = seen.filter((url) =>
      url.includes('/api/v1/records/en/resolve'),
    )
    expect(resolveCalls).toHaveLength(2)
    expect(resolveCalls[0].split('refs=')[1].split(',')).toHaveLength(50)
    expect(resolveCalls[1].split('refs=')[1].split(',')).toHaveLength(5)
    expect(map.size).toBe(55)
    expect(map.get('article:55')?.slug).toBe('post-55')
  })

  it('keeps a failed batch unresolved without failing the graph', async () => {
    const refs: RelatedRecordRef[] = Array.from({ length: 55 }, (_, i) => ({
      family: 'article',
      id: String(i + 1),
    }))
    const seen: string[] = []
    // Fail the second batch by matching its first ref (colon stays literal).
    const map = await fetchRecordResolutions(
      'en',
      refs,
      resolvingFetch('en', seen, {}, 'article:51'),
    )
    expect(map.size).toBe(50)
    expect(map.get('article:1')?.slug).toBe('post-1')
    expect(map.has('article:55')).toBe(false)
  })
})

describe('A05 workRefToHref', () => {
  it('maps exact-locale hits to canonical hrefs', () => {
    expect(workRefToHref(workRef('article', '7', 'en', 'a05-post'), 'en')).toBe(
      '/en/blog/a05-post/',
    )
    expect(
      workRefToHref(
        { ...workRef('lesson', '9', 'en', 'lec-1'), courseSlug: 'cs101' },
        'en',
      ),
    ).toBe('/en/education/cs101/lessons/lec-1/')
    expect(workRefToHref(workRef('landing', '1', 'en', 'home'), 'en')).toBe(
      '/en/',
    )
  })

  it('never links other-locale hits, bad slugs, or lessons without courses', () => {
    expect(workRefToHref(workRef('article', '7', 'fa', 'a05-post'), 'en')).toBe(
      undefined,
    )
    expect(
      workRefToHref(workRef('article', '7', 'en', 'has space'), 'en'),
    ).toBe(undefined)
    expect(workRefToHref(workRef('article', '7', 'en', ''), 'en')).toBe(
      undefined,
    )
    expect(workRefToHref(workRef('lesson', '9', 'en', 'lec-1'), 'en')).toBe(
      undefined,
    )
    expect(
      workRefToHref(
        { ...workRef('article', '7', 'en', 'a05-post'), routeFamily: '../x' },
        'en',
      ),
    ).toBe(undefined)
  })

  it('createRecordResolver honours the request locale', () => {
    const map = new Map([
      ['article:7', workRef('article', '7', 'en', 'a05-post')],
    ])
    const resolve = createRecordResolver(map, 'en')
    expect(resolve('article', '7', 'en')).toBe('/en/blog/a05-post/')
    expect(resolve('article', '7', 'fa')).toBe(undefined)
    expect(resolve('article', '999', 'en')).toBe(undefined)
  })
})

describe('A05 fetch-to-rendered-link on Home', () => {
  it.each([['en'], ['fa']] as Array<[Locale]>)(
    'loads, resolves, and renders the canonical link (%s)',
    async (locale) => {
      const seen: string[] = []
      const graphPayload = payloadWith([
        node('node-01', [
          { family: 'article', id: '7' },
          { family: 'article', id: '999' },
        ]),
      ])
      const fetchFn = (async (input: unknown) => {
        const url = String(input)
        seen.push(url)
        if (url.includes(`/api/graph/${locale}`)) {
          return new Response(JSON.stringify(graphPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url.includes(`/api/v1/records/${locale}/resolve`)) {
          return new Response(
            JSON.stringify({
              items: [workRef('article', '7', locale, `a05-post-${locale}`)],
              unresolved: [{ family: 'article', id: '999' }],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        return new Response('not found', { status: 404 })
      }) as unknown as typeof fetch

      const model = readyModel(await loadHeroGraph(locale, undefined, fetchFn))
      const related = model.nodes[0].related
      expect(related).toEqual([
        {
          family: 'article',
          id: '7',
          href: `/${locale}/blog/a05-post-${locale}/`,
        },
      ])
      expect(model.unresolvedRelated).toEqual([
        {
          nodeId: 'node-01',
          family: 'article',
          id: '999',
          reason: 'unresolved',
        },
      ])
      expect(
        seen.some((url) => url.includes(`/api/v1/records/${locale}/resolve`)),
      ).toBe(true)

      const container = await AstroContainer.create()
      const html = await container.renderToString(HeroGraph, {
        props: { locale, graph: model, selectedId: 'node-01' },
      })
      expect(html).toContain(`href="/${locale}/blog/a05-post-${locale}/"`)
      expect(html).not.toContain('article:999')
      expect(html).not.toContain('/undefined/')
    },
  )

  it('degrades to honest non-links when resolution fails', async () => {
    const seen: string[] = []
    const graphPayload = payloadWith([
      node('node-01', [{ family: 'article', id: '7' }]),
    ])
    const fetchFn = stubFetch(
      {
        '/api/graph/en': { status: 200, body: graphPayload },
        '/api/v1/records/en/resolve': { status: 500, body: {} },
      },
      seen,
    )
    const model = readyModel(await loadHeroGraph('en', undefined, fetchFn))
    expect(model.nodes[0].related).toEqual([])
    expect(model.unresolvedRelated).toEqual([
      { nodeId: 'node-01', family: 'article', id: '7', reason: 'unresolved' },
    ])
  })
})
