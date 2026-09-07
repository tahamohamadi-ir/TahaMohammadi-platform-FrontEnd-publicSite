import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  adaptHeroGraph,
  collectRelatedRefs,
  createStaticRelatedResolver,
  deriveLayoutPosition,
  isEligibleRelatedFamily,
  isResolverSupportedFamily,
  isValidRelatedRecordId,
  normalizeColorRole,
  normalizeIconRole,
  workRefToHref,
  type GraphPayloadOut,
  type HeroGraphModel,
} from './hero-graph-content'
import type { Locale } from './navigation'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

function readFixturePayload(): GraphPayloadOut {
  const raw = readFileSync(
    path.join(
      repositoryRoot,
      'tests',
      'fixtures',
      'contracts',
      'hero-graph.json',
    ),
    'utf8',
  )
  const fixture = JSON.parse(raw) as {
    synthetic: boolean
    locale: Locale
    payload: GraphPayloadOut
  }
  expect(fixture.synthetic).toBe(true)
  expect(fixture.locale).toBe('en')
  return fixture.payload
}

/** Deterministic synthetic payload of exactly `count` chained nodes. */
function buildPayload(count: number): GraphPayloadOut {
  const colors = ['brand', 'research', 'signature', 'context', 'ink']
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `node-${String(index + 1).padStart(2, '0')}`,
    label: `Node ${index + 1}`,
    accessibleLabel: `Graph node ${index + 1}`,
    type: 'researchtopic',
    weight: 1 + (index % 5),
    summary: `Summary ${index + 1}`,
    colorRole: colors[index % colors.length],
    iconRole: 'disc',
    position: { x: index * 10 - count * 5, y: index * 7 - count * 3 },
    relatedRecords: [],
  }))
  const edges = Array.from({ length: Math.max(0, count - 1) }, (_, index) => ({
    id: `edge-${String(index + 1).padStart(2, '0')}`,
    source: `node-${String(index + 1).padStart(2, '0')}`,
    target: `node-${String(index + 2).padStart(2, '0')}`,
    relationType: 'relates',
    weight: 1,
    directed: index % 2 === 0,
  }))
  return { nodes, edges } as GraphPayloadOut
}

function readyModel(model: HeroGraphModel) {
  expect(model.status).toBe('ready')
  if (model.status !== 'ready') throw new Error('expected ready model')
  return model
}

describe('hero graph unavailable and empty states', () => {
  it('maps a missing payload to unavailable, never to fake nodes', () => {
    for (const locale of ['fa', 'en'] as const) {
      expect(adaptHeroGraph(null, { locale })).toEqual({
        status: 'unavailable',
        locale,
      })
      expect(adaptHeroGraph(undefined, { locale })).toEqual({
        status: 'unavailable',
        locale,
      })
    }
  })

  it('maps zero nodes to empty and tolerates absent optional arrays', () => {
    const empty = adaptHeroGraph({ nodes: [], edges: [] }, { locale: 'en' })
    expect(empty.status).toBe('empty')

    const absent = adaptHeroGraph({} as GraphPayloadOut, { locale: 'fa' })
    expect(absent.status).toBe('empty')
    if (absent.status === 'empty') {
      expect(absent.warnings).toContain('nodes-absent-treated-as-empty')
      expect(absent.warnings).toContain('edges-absent-treated-as-empty')
    }

    const noEdges = adaptHeroGraph(buildPayload(1), { locale: 'en' })
    const ready = readyModel(noEdges)
    expect(ready.edges).toEqual([])
  })

  it('rejects edges without nodes instead of rendering dangling relations', () => {
    const model = adaptHeroGraph(
      {
        nodes: [],
        edges: [
          {
            id: 'edge-01',
            source: 'node-01',
            target: 'node-02',
            relationType: 'relates',
            weight: 1,
            directed: true,
          },
        ],
      } as GraphPayloadOut,
      { locale: 'en' },
    )
    expect(model.status).toBe('error')
    if (model.status === 'error') {
      expect(model.issues).toContain('edges-without-nodes-dangling')
    }
  })
})

describe('hero graph deterministic node and edge coverage', () => {
  it.each([0, 1, 3, 5, 12, 50])(
    'keeps every node of a %i-node payload without truncation',
    (count) => {
      const payload = buildPayload(count)
      const model = adaptHeroGraph(payload, { locale: 'en' })
      if (count === 0) {
        expect(model.status).toBe('empty')
        return
      }
      const ready = readyModel(model)
      expect(ready.nodes).toHaveLength(count)
      expect(ready.nodes.map((node) => node.id)).toEqual(
        payload.nodes?.map((node) => node.id),
      )
      expect(ready.edges).toHaveLength(Math.max(0, count - 1))
    },
  )

  it('emits only API edges without inventing relations', () => {
    const payload = readFixturePayload()
    const model = readyModel(adaptHeroGraph(payload, { locale: 'en' }))
    expect(model.nodes).toHaveLength(5)
    expect(model.edges).toHaveLength(4)
    expect(
      model.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationType: edge.relationType,
        weight: edge.weight,
        directed: edge.directed,
        explanation: edge.explanation,
      })),
    ).toEqual(
      payload.edges?.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationType: edge.relationType,
        weight: edge.weight,
        directed: edge.directed,
        explanation: edge.explanation ?? null,
      })),
    )
    expect(model.edges.find((edge) => edge.id === 'edge-02')?.explanation).toBe(
      'Topic motivates the project.',
    )
  })

  it('produces deterministic layouts and preserves valid API positions', () => {
    const payload = readFixturePayload()
    const first = readyModel(adaptHeroGraph(payload, { locale: 'en' }))
    const second = readyModel(adaptHeroGraph(payload, { locale: 'en' }))
    expect(first.nodes.map((node) => node.layout)).toEqual(
      second.nodes.map((node) => node.layout),
    )

    const apiNode = first.nodes.find((node) => node.id === 'node-01')
    expect(apiNode?.layout.source).toBe('api')
    expect(apiNode?.layout.x).toBe(-80)
    expect(apiNode?.layout.y).toBe(24)

    const derivedNode = first.nodes.find((node) => node.id === 'node-03')
    expect(derivedNode?.layout.source).toBe('derived')
    expect(Number.isFinite(derivedNode?.layout.x ?? NaN)).toBe(true)
    expect(first.warnings).toContain('node-layout-derived:node-03')
    expect(deriveLayoutPosition('node-03', 2)).toEqual(derivedNode?.layout)
  })
})

describe('hero graph boundary validation', () => {
  it('rejects duplicate node IDs as an error without partial output', () => {
    const payload = buildPayload(3)
    const duplicate = {
      ...(payload.nodes?.[0] as object),
      id: payload.nodes?.[1]?.id,
    }
    const model = adaptHeroGraph(
      { nodes: [...(payload.nodes ?? []), duplicate], edges: [] },
      { locale: 'en' },
    )
    expect(model.status).toBe('error')
    if (model.status === 'error') {
      expect(
        model.issues.some((issue) => issue.startsWith('duplicate-node-id:')),
      ).toBe(true)
    }
  })

  it('rejects dangling edge ends as an error', () => {
    const payload = buildPayload(2)
    const model = adaptHeroGraph(
      {
        ...payload,
        edges: [
          ...(payload.edges ?? []),
          {
            id: 'edge-dangling',
            source: 'node-01',
            target: 'node-missing',
            relationType: 'relates',
            weight: 1,
            directed: true,
          },
        ],
      },
      { locale: 'en' },
    )
    expect(model.status).toBe('error')
    if (model.status === 'error') {
      expect(model.issues).toContain('edge-dangling-target:edge-dangling')
    }
  })

  it('rejects non-finite weights as an error', () => {
    const payload = buildPayload(2)
    const nodes = [...(payload.nodes ?? [])]
    nodes[0] = { ...(nodes[0] as object), weight: Number.NaN }
    const model = adaptHeroGraph(
      { nodes, edges: payload.edges },
      { locale: 'en' },
    )
    expect(model.status).toBe('error')
    if (model.status === 'error') {
      expect(model.issues).toContain('node-non-finite-weight:node-01')
    }
  })

  it('normalizes unknown visual roles to neutral instead of raw CSS', () => {
    expect(normalizeColorRole('neon-fog')).toBe('neutral')
    expect(normalizeIconRole('arbitrary-import')).toBe('neutral')
    expect(normalizeColorRole('brand')).toBe('brand')

    const payload = buildPayload(1)
    const nodes = [...(payload.nodes ?? [])]
    nodes[0] = {
      ...(nodes[0] as object),
      colorRole: 'neon-fog',
      iconRole: 'arbitrary-import',
    }
    const model = readyModel(
      adaptHeroGraph({ nodes, edges: [] }, { locale: 'en' }),
    )
    expect(model.nodes[0]?.colorRole).toBe('neutral')
    expect(model.nodes[0]?.iconRole).toBe('neutral')
    expect(model.warnings).toContain('node-color-role-normalized:node-01')
    expect(model.warnings).toContain('node-icon-role-normalized:node-01')
  })
})

describe('hero graph related-record resolution', () => {
  const resolver = createStaticRelatedResolver([
    {
      family: 'researchtopic',
      id: '11',
      locale: 'en',
      href: '/en/research/human-centered-ai/',
    },
    {
      family: 'project',
      id: '7',
      locale: 'en',
      href: '/en/projects/pars-sql/',
    },
    {
      family: 'publication',
      id: '3',
      locale: 'en',
      href: '/en/blog/vtd-edge/',
    },
    {
      family: 'article',
      id: '21',
      locale: 'en',
      href: '/en/blog/visual-discourse/',
    },
  ])

  it('resolves related records only through the explicit resolver', () => {
    const payload = readFixturePayload()
    const model = readyModel(
      adaptHeroGraph(payload, { locale: 'en', resolveRelatedHref: resolver }),
    )
    const node = model.nodes.find((entry) => entry.id === 'node-01')
    expect(node?.related).toEqual([
      {
        family: 'researchtopic',
        id: '11',
        href: '/en/research/human-centered-ai/',
      },
      { family: 'project', id: '7', href: '/en/projects/pars-sql/' },
    ])
    expect(model.unresolvedRelated).toEqual([])
  })

  it('never exposes unresolved IDs as hrefs', () => {
    const payload = readFixturePayload()
    const model = readyModel(adaptHeroGraph(payload, { locale: 'en' }))
    for (const node of model.nodes) {
      expect(node.related).toEqual([])
    }
    expect(model.unresolvedRelated).toHaveLength(4)
    expect(
      model.unresolvedRelated.every((entry) => entry.reason === 'unresolved'),
    ).toBe(true)
  })

  it('reports unknown families and malformed IDs without linking', () => {
    const payload = buildPayload(1)
    const nodes = [...(payload.nodes ?? [])]
    nodes[0] = {
      ...(nodes[0] as object),
      relatedRecords: [
        { family: 'invented-family', id: '5' },
        { family: 'project', id: '007' },
        { family: 'project', id: '0' },
        { family: 'project', id: '۱۲۳' },
        { family: 'project', id: '9223372036854775808' },
        { family: 'project', id: '9' },
      ],
    }
    const model = readyModel(
      adaptHeroGraph(
        { nodes, edges: [] },
        { locale: 'en', resolveRelatedHref: resolver },
      ),
    )
    expect(model.nodes[0]?.related).toEqual([])
    expect(model.unresolvedRelated.map((entry) => entry.reason)).toEqual([
      'unknown-family',
      'invalid-id',
      'invalid-id',
      'invalid-id',
      'invalid-id',
      'unresolved',
    ])
  })

  it('treats cross-locale hrefs as wrong-locale, never as navigation', () => {
    const payload = buildPayload(1)
    const nodes = [...(payload.nodes ?? [])]
    nodes[0] = {
      ...(nodes[0] as object),
      relatedRecords: [{ family: 'project', id: '7' }],
    }
    const model = readyModel(
      adaptHeroGraph(
        { nodes, edges: [] },
        { locale: 'fa', resolveRelatedHref: () => '/en/projects/pars-sql/' },
      ),
    )
    expect(model.nodes[0]?.related).toEqual([])
    expect(model.unresolvedRelated).toEqual([
      { nodeId: 'node-01', family: 'project', id: '7', reason: 'wrong-locale' },
    ])
  })

  it('matches static resolver entries exactly without prefix guessing', () => {
    const exact = createStaticRelatedResolver([
      {
        family: 'researchtopic',
        id: '1',
        locale: 'en',
        href: '/en/research/a/',
      },
    ])
    expect(exact('researchtopic', '1', 'en')).toBe('/en/research/a/')
    expect(exact('researchtopic', '10', 'en')).toBeUndefined()
    expect(exact('researchtopic', '1', 'fa')).toBeUndefined()
  })

  it('resolves related references using the accepted PU-SYNC-graph resolver fixture', () => {
    const resolverFixturePath = path.join(
      repositoryRoot,
      'tests/fixtures/contracts/product-record-resolver.json',
    )
    expect(existsSync(resolverFixturePath)).toBe(true)
    const resolverFixture = JSON.parse(
      readFileSync(resolverFixturePath, 'utf8'),
    )
    const resolvedItems =
      resolverFixture.scenarios.resolveBatchSuccess.response.items

    const resolverFromFixture = createStaticRelatedResolver(
      resolvedItems.map(
        (item: {
          family: string
          id: string
          locale: string
          routeFamily: string
          slug: string
        }) => ({
          family: item.family,
          id: item.id,
          locale: item.locale as Locale,
          href: `/${item.locale}/${item.routeFamily}/${item.slug}/`,
        }),
      ),
    )

    const payload = {
      nodes: [
        {
          id: 'node-mesh',
          label: 'Synthetic Mesh Node',
          accessibleLabel: 'Mesh Node',
          type: 'project',
          weight: 4,
          colorRole: 'brand',
          iconRole: 'disc',
          relatedRecords: [
            { family: 'project', id: '101' },
            { family: 'article', id: '202' },
            { family: 'article', id: '999' },
          ],
        },
      ],
      edges: [],
    }

    const model = readyModel(
      adaptHeroGraph(payload, {
        locale: 'en',
        resolveRelatedHref: resolverFromFixture,
      }),
    )

    expect(model.nodes[0]?.related).toEqual([
      {
        family: 'project',
        id: '101',
        href: '/en/projects/synthetic-distributed-mesh/',
      },
      {
        family: 'article',
        id: '202',
        href: '/en/blog/synthetic-protocol-notes/',
      },
    ])
    expect(model.unresolvedRelated).toEqual([
      {
        nodeId: 'node-mesh',
        family: 'article',
        id: '999',
        reason: 'unresolved',
      },
    ])
  })
})

describe('hero graph record-ID and family rules', () => {
  it('accepts canonical IDs and rejects malformed values', () => {
    expect(isValidRelatedRecordId('1')).toBe(true)
    expect(isValidRelatedRecordId('2147483647')).toBe(true)
    // Signed 64-bit alignment (G2): 32-bit overflow is now valid.
    expect(isValidRelatedRecordId('2147483648')).toBe(true)
    expect(isValidRelatedRecordId('99999999999')).toBe(true)
    expect(isValidRelatedRecordId('9223372036854775807')).toBe(true)
    for (const invalid of [
      '',
      '0',
      '007',
      ' 7',
      '-3',
      '7.0',
      '۱۲۳',
      '²',
      '9223372036854775808',
      '1'.repeat(20),
    ]) {
      expect(isValidRelatedRecordId(invalid), invalid).toBe(false)
    }
    // Non-string wire values never validate and never throw.
    for (const invalid of [undefined, null, 7, 0, true, {}, []]) {
      expect(isValidRelatedRecordId(invalid)).toBe(false)
    }
  })

  it('covers the backend evidence family table without guessing', () => {
    expect(isEligibleRelatedFamily('researchtopic')).toBe(true)
    expect(isEligibleRelatedFamily('creativework')).toBe(true)
    expect(isEligibleRelatedFamily('lesson')).toBe(true)
    expect(isEligibleRelatedFamily('collection')).toBe(true)
    expect(isEligibleRelatedFamily('invented-family')).toBe(false)
    expect(isEligibleRelatedFamily('')).toBe(false)
  })

  it('distinguishes adapter-visible from resolver-supported families (G3)', () => {
    // Adapter shows lesson/collection; current resolver supports 13 only.
    expect(isEligibleRelatedFamily('lesson')).toBe(true)
    expect(isEligibleRelatedFamily('collection')).toBe(true)
    expect(isResolverSupportedFamily('lesson')).toBe(false)
    expect(isResolverSupportedFamily('collection')).toBe(false)
    expect(isResolverSupportedFamily('article')).toBe(true)
    expect(isResolverSupportedFamily('course')).toBe(true)
  })
})

describe('catalog-graph review G1 — safe href mapping', () => {
  function ref(
    family: string,
    slug: unknown,
    routeFamily: unknown,
    locale: Locale = 'en',
    extra: Record<string, unknown> = {},
  ) {
    return {
      family,
      id: '7',
      locale,
      slug,
      title: 'T',
      summary: 'S',
      routeFamily,
      ...extra,
    }
  }

  it('rejects dot traversal and encoded navigation without throwing', () => {
    expect(workRefToHref(ref('article', '..', 'blog'), 'en')).toBeUndefined()
    expect(
      workRefToHref(ref('article', '%2e%2e', 'blog'), 'en'),
    ).toBeUndefined()
    expect(workRefToHref(ref('article', '%2F', 'blog'), 'en')).toBeUndefined()
    expect(workRefToHref(ref('article', 'a/b', 'blog'), 'en')).toBeUndefined()
    expect(workRefToHref(ref('article', 'a\\b', 'blog'), 'en')).toBeUndefined()
    expect(
      workRefToHref(ref('article', 'has space', 'blog'), 'en'),
    ).toBeUndefined()
    expect(workRefToHref(ref('article', '', 'blog'), 'en')).toBeUndefined()
    expect(workRefToHref(ref('article', '.', 'blog'), 'en')).toBeUndefined()
    // Malformed non-string values return undefined, never throw.
    expect(
      workRefToHref(ref('article', 7 as unknown as string, 'blog'), 'en'),
    ).toBeUndefined()
    expect(
      workRefToHref(ref('article', null as unknown as string, 'blog'), 'en'),
    ).toBeUndefined()
    expect(
      workRefToHref(ref('article', 'ok', 7 as unknown as string), 'en'),
    ).toBeUndefined()
    expect(workRefToHref(null, 'en')).toBeUndefined()
    expect(workRefToHref(undefined, 'en')).toBeUndefined()
    expect(workRefToHref('x', 'en')).toBeUndefined()
  })

  it('uses one authoritative route mapping, not shape alone', () => {
    // Correct mapping links.
    expect(workRefToHref(ref('article', 'my-post', 'blog'), 'en')).toBe(
      '/en/blog/my-post/',
    )
    // Wrong route for family stays a non-link even though shape is safe.
    expect(
      workRefToHref(ref('article', 'my-post', 'research'), 'en'),
    ).toBeUndefined()
    expect(
      workRefToHref(ref('article', 'my-post', '../x'), 'en'),
    ).toBeUndefined()
    expect(workRefToHref(ref('project', 'pars', 'projects'), 'en')).toBe(
      '/en/projects/pars/',
    )
    expect(
      workRefToHref(ref('researchstatement', 's', 'research/statements'), 'en'),
    ).toBe('/en/research/statements/s/')
  })

  it('handles singleton Home/About per route contract', () => {
    expect(workRefToHref(ref('landing', 'home', 'home'), 'en')).toBe('/en/')
    // Singleton path is fixed; incoming routeFamily is not trusted.
    expect(workRefToHref(ref('landing', 'home', 'blog'), 'en')).toBe('/en/')
    expect(workRefToHref(ref('landing', 'other', 'home'), 'en')).toBeUndefined()
    expect(workRefToHref(ref('profile', 'about', 'about'), 'en')).toBe(
      '/en/about/',
    )
    expect(
      workRefToHref(ref('profile', 'other', 'about'), 'en'),
    ).toBeUndefined()
  })

  it('keeps browser-normalized pathname stable and encodes Persian slugs', () => {
    const href = workRefToHref(ref('article', 'my-post', 'blog'), 'en')
    expect(href).toBe('/en/blog/my-post/')
    expect(new URL(href!, 'https://example.test').pathname).toBe(href)
    // Traversal hrefs would normalize away; we never emit them.
    expect(new URL('/en/blog/../', 'https://example.test').pathname).toBe(
      '/en/',
    )
    const faSlug = 'مقاله-تستی'
    const faHref = workRefToHref(ref('article', faSlug, 'blog', 'fa'), 'fa')
    expect(faHref).toBe(`/fa/blog/${encodeURIComponent(faSlug)}/`)
    expect(new URL(faHref!, 'https://example.test').pathname).toBe(faHref)
  })
})

describe('catalog-graph review G2 — signed 64-bit IDs', () => {
  it('validates boundary, maximum, overflow and canonical spelling', () => {
    expect(isValidRelatedRecordId('2147483647')).toBe(true)
    expect(isValidRelatedRecordId('2147483648')).toBe(true)
    expect(isValidRelatedRecordId('9223372036854775807')).toBe(true)
    expect(isValidRelatedRecordId('9223372036854775808')).toBe(false)
    expect(isValidRelatedRecordId('99999999999999999999')).toBe(false)
    expect(isValidRelatedRecordId('001')).toBe(false)
    expect(isValidRelatedRecordId('0')).toBe(false)
  })
})

describe('catalog-graph review G3 — mixed batch without poisoning', () => {
  it('excludes lesson/collection from resolver batches, keeps article', () => {
    const payload = {
      nodes: [
        {
          id: 'n1',
          label: 'N',
          accessibleLabel: 'N',
          type: 'project',
          weight: 1,
          relatedRecords: [
            { family: 'article', id: '7' },
            { family: 'lesson', id: '9' },
            { family: 'collection', id: '3' },
          ],
        },
      ],
      edges: [],
    } as unknown as GraphPayloadOut
    // Only the resolver-supported article is collected; lesson/collection
    // never reach the backend so a 400 for `lesson:9` cannot suppress `article:7`.
    expect(collectRelatedRefs(payload)).toEqual([
      { family: 'article', id: '7' },
    ])
  })
})
