import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ATLAS_CONTRACT_VERSION,
  type AtlasPayload,
  type AtlasNodeOut,
} from './model'
import { buildSearchIndex, normalizeFa } from './search'

const searchSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'search.ts'),
  'utf8',
)

function node(
  partial: Pick<AtlasNodeOut, 'key' | 'type'> & Partial<AtlasNodeOut>,
): AtlasNodeOut {
  return {
    label: partial.key,
    importance: 50,
    mobileOverviewPriority: 'auto',
    aliases: [],
    position: { x: 0, y: 0, z: 0 },
    ...partial,
  }
}

function payload(overrides: Partial<AtlasPayload> = {}): AtlasPayload {
  return {
    contractVersion: ATLAS_CONTRACT_VERSION,
    locale: 'en',
    version: {
      id: 1,
      revision: '1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: 1,
      relationCount: 0,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'research-area',
        label: 'Research area',
        semanticRole: 'area',
        visualRole: 'domain',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: true,
      },
      {
        key: 'project',
        label: 'Project',
        semanticRole: 'record',
        visualRole: 'record',
        allowAsRoot: false,
        allowChildren: false,
        filterVisible: true,
      },
      {
        key: 'method',
        label: 'Method',
        semanticRole: 'utility',
        visualRole: 'fine',
        allowAsRoot: false,
        allowChildren: false,
        filterVisible: true,
      },
    ],
    relationTypes: [
      {
        key: 'uses',
        label: 'uses',
        inverseLabel: 'used by',
        directed: true,
        hierarchyRole: false,
        visualPriority: 70,
      },
    ],
    groups: [],
    nodes: [],
    relations: [],
    ...overrides,
  }
}

describe('normalizeFa (Plan C Task 10)', () => {
  it('folds Arabic yeh/kaf, tatweel, NBSP, zero-width, digits, and Latin case', () => {
    expect(normalizeFa('علي')).toBe(normalizeFa('علی'))
    expect(normalizeFa('كتاب')).toBe('کتاب')
    expect(normalizeFa('کـــتاب')).toBe('کتاب')
    expect(normalizeFa('کتاب\u00A0۱۴۰۳')).toBe('کتاب1403')
    expect(normalizeFa('می‌شود')).toBe('میشود')
    expect(normalizeFa('مي\u200Dشود')).toBe('میشود')
    expect(normalizeFa('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
    expect(normalizeFa('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
    expect(normalizeFa('SQL')).toBe('sql')
  })
})

describe('search index (Plan C Task 10)', () => {
  it('ranks prefix above substring, then field strength, then (-importance, key)', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({
            key: 'research-area-substr02',
            type: 'research-area',
            label: 'Systems query',
            importance: 99,
          }),
          node({
            key: 'research-area-prefix01',
            type: 'research-area',
            label: 'Query systems',
            importance: 10,
          }),
          node({
            key: 'project-alias0001',
            type: 'project',
            label: 'Other',
            importance: 80,
            aliases: ['query log'],
          }),
          node({
            key: 'method-high00001',
            type: 'method',
            label: 'Query index',
            importance: 80,
          }),
          node({
            key: 'method-low000001',
            type: 'method',
            label: 'Query store',
            importance: 20,
          }),
          node({
            key: 'project-bbbbbbbb',
            type: 'project',
            label: 'Query beta',
            importance: 20,
          }),
          node({
            key: 'project-aaaaaaaa',
            type: 'project',
            label: 'Query alpha',
            importance: 20,
          }),
        ],
      }),
    )

    expect(index.search('query', { limit: 10 }).map((hit) => hit.key)).toEqual([
      'method-high00001',
      'method-low000001',
      'project-aaaaaaaa',
      'project-bbbbbbbb',
      'research-area-prefix01',
      'project-alias0001',
      'research-area-substr02',
    ])
  })

  it('matches aliases and canonical titles without replacing the node label', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({
            key: 'project-aliasvision',
            type: 'project',
            label: 'Other',
            importance: 50,
            aliases: ['vision'],
          }),
          node({
            key: 'project-canonvision',
            type: 'project',
            label: 'Other two',
            importance: 50,
            canonical: {
              family: 'project',
              id: '1',
              slug: 'vision',
              title: 'Vision and language',
            },
          }),
        ],
      }),
    )

    const hits = index.search('vision', { limit: 5 })
    expect(hits.map((hit) => hit.key)).toEqual([
      'project-canonvision',
      'project-aliasvision',
    ])
    expect(hits[0]).toEqual({
      kind: 'node',
      key: 'project-canonvision',
      label: 'Other two',
      type: 'project',
    })
  })

  it('matches a node type label and keeps hidden overview nodes searchable', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({
            key: 'research-area-hidden01',
            type: 'research-area',
            label: 'Unrelated',
            mobileOverviewPriority: 'hidden',
          }),
        ],
      }),
    )
    expect(index.search('research', { limit: 5 })).toEqual([
      {
        kind: 'node',
        key: 'research-area-hidden01',
        label: 'Unrelated',
        type: 'research-area',
      },
    ])
  })

  it('folds Persian in both the index and the query', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({
            key: 'publication-fa000001',
            type: 'project',
            label: 'كتاب ۱۴۰۳',
            aliases: ['می‌شود', 'کـــتاب'],
          }),
        ],
      }),
    )
    expect(index.search('1403', { limit: 5 }).map((hit) => hit.key)).toEqual([
      'publication-fa000001',
    ])
    expect(index.search('كتاب', { limit: 5 })).toHaveLength(1)
    expect(index.search('میشود', { limit: 5 })).toHaveLength(1)
    expect(index.search('کتاب', { limit: 5 })).toHaveLength(1)
    expect(index.search('  کتاب  ', { limit: 5 })).toHaveLength(1)
  })

  it('returns an honest empty list for no match or a blank query', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({ key: 'project-aaaaaaaa', type: 'project', label: 'Alpha' }),
        ],
      }),
    )
    expect(index.search('zzzz-no-hit', { limit: 5 })).toEqual([])
    expect(index.search('   ', { limit: 5 })).toEqual([])
    expect(index.search('', { limit: 5 })).toEqual([])
  })

  it('indexes relations by type label, inverse label and explanation, capped by limit', () => {
    const body = payload({
      nodes: [
        node({ key: 'project-aaaaaaaa', type: 'project', label: 'Alpha' }),
        node({ key: 'method-low000001', type: 'method', label: 'Store' }),
      ],
      relations: [
        {
          key: 'project-aaaaaaaa~uses~method-low000001',
          type: 'uses',
          source: 'project-aaaaaaaa',
          target: 'method-low000001',
          directed: true,
          weight: 90,
          hierarchy: false,
          explanation: 'runtime binding',
        },
      ],
    })
    const nodes = body.nodes
    const index = buildSearchIndex(body)
    expect(index.search('used', { limit: 5 })).toEqual([
      {
        kind: 'relation',
        key: 'project-aaaaaaaa~uses~method-low000001',
        label: 'used by',
        type: 'uses',
      },
    ])
    expect(index.search('runtime', { limit: 5 })[0]?.kind).toBe('relation')
    expect(index.search('uses', { limit: 1 })).toHaveLength(1)
    expect(body.nodes).toBe(nodes)
  })

  it('does not encode focus grammar or import selection, URL, preview, or refresh', () => {
    const index = buildSearchIndex(
      payload({
        nodes: [
          node({ key: 'project-aaaaaaaa', type: 'project', label: 'Alpha' }),
        ],
      }),
    )
    const hit = index.search('alpha', { limit: 1 })[0]
    expect(hit?.key).toBe('project-aaaaaaaa')
    expect(hit?.key).not.toMatch(/^(node|relation):/)
    expect(searchSource).not.toMatch(
      /from ['"]\.\/(url-state|selection|preview|refresh|filters|neighborhood)['"]/,
    )
    for (const forbidden of [
      'pushState',
      'fetch(',
      'localStorage',
      '#token',
      'yaw',
      'pitch',
    ]) {
      expect(searchSource).not.toContain(forbidden)
    }
  })
})
