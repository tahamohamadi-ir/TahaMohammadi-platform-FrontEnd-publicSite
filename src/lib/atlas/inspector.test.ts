import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ATLAS_CONTRACT_VERSION,
  type AtlasNodeOut,
  type AtlasPayload,
  type AtlasRelationOut,
} from './model'
import { nodeInspectorModel, relationInspectorModel } from './inspector'

const inspectorSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'inspector.ts'),
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

function relation(
  source: string,
  type: string,
  target: string,
  hierarchy: boolean,
  extras: Partial<AtlasRelationOut> = {},
): AtlasRelationOut {
  return {
    key: `${source}~${type}~${target}`,
    type,
    source,
    target,
    directed: true,
    weight: 1,
    hierarchy,
    ...extras,
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
      nodeCount: 8,
      relationCount: 7,
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
      {
        key: 'technology',
        label: 'Technology',
        semanticRole: 'utility',
        visualRole: 'fine',
        allowAsRoot: false,
        allowChildren: false,
        filterVisible: true,
      },
    ],
    relationTypes: [
      {
        key: 'specializes',
        label: 'specializes in',
        inverseLabel: 'specialized by',
        directed: true,
        hierarchyRole: true,
        visualPriority: 90,
      },
      {
        key: 'related-to',
        label: 'related to',
        inverseLabel: 'related to',
        directed: true,
        hierarchyRole: false,
        visualPriority: 50,
      },
      {
        key: 'uses',
        label: 'uses',
        inverseLabel: 'used by',
        directed: true,
        hierarchyRole: false,
        visualPriority: 70,
      },
      {
        key: 'supports',
        label: 'supports',
        inverseLabel: 'supported by',
        directed: true,
        hierarchyRole: false,
        visualPriority: 60,
      },
    ],
    groups: [],
    nodes: [
      node({ key: 'research-area-parent01', type: 'research-area' }),
      node({ key: 'research-area-parent02', type: 'research-area' }),
      node({
        key: 'research-area-child001',
        type: 'research-area',
        summary: 'Child area summary',
      }),
      node({ key: 'project-cccccccc01', type: 'project' }),
      node({ key: 'method-dddddddd01', type: 'method' }),
      node({ key: 'technology-hidden01', type: 'technology' }),
      node({
        key: 'project-with-canonical',
        type: 'project',
        label: 'Canonical project',
        canonical: {
          family: 'project',
          id: '1',
          slug: 'canonical-project',
          title: 'Canonical project title',
          href: '/en/projects/canonical-project/',
        },
      }),
    ],
    relations: [
      relation(
        'research-area-parent01',
        'specializes',
        'research-area-child001',
        true,
      ),
      relation(
        'research-area-parent02',
        'specializes',
        'research-area-child001',
        true,
      ),
      relation(
        'research-area-child001',
        'related-to',
        'project-cccccccc01',
        false,
      ),
      relation('project-cccccccc01', 'uses', 'method-dddddddd01', false),
      relation(
        'technology-hidden01',
        'supports',
        'research-area-child001',
        false,
      ),
      relation(
        'research-area-child001',
        'related-to',
        'project-with-canonical',
        false,
        { explanation: 'Cross-link for canonical fixture' },
      ),
    ],
    ...overrides,
  }
}

describe('inspector projection (Plan C Task 11)', () => {
  it('omits the publications section when the node has none', () => {
    const model = nodeInspectorModel(payload(), 'research-area-child001')
    expect(model.sections.map((s) => s.id)).not.toContain('publications')
  })

  it('lists both parents under parents', () => {
    const model = nodeInspectorModel(payload(), 'research-area-child001')
    const parents = model.sections.find((s) => s.id === 'parents')
    expect(parents?.items.map((i) => i.key).sort()).toEqual([
      'research-area-parent01',
      'research-area-parent02',
    ])
  })

  it('carries source, target, labels, explanation and direction for relations', () => {
    const body = payload()
    const model = relationInspectorModel(
      body,
      'research-area-child001~related-to~project-with-canonical',
    )
    const endpoints = model.sections.find((s) => s.id === 'endpoints')
    expect(endpoints?.items.map((i) => i.key)).toEqual([
      'research-area-child001',
      'project-with-canonical',
    ])
    const details = model.sections.find((s) => s.id === 'details')
    expect(details?.items.some((i) => i.type === 'relation-type')).toBe(true)
    expect(
      details?.items.find((i) => i.type === 'relation-type')?.relationLabel,
    ).toBe('related to')
    expect(details?.items.some((i) => i.type === 'direction')).toBe(true)
    expect(details?.items.some((i) => i.type === 'explanation')).toBe(true)
  })

  it('omits the canonical section when the record is missing and still renders', () => {
    const model = nodeInspectorModel(payload(), 'project-cccccccc01')
    expect(model.sections.map((s) => s.id)).not.toContain('canonical')
    expect(model.sections.length).toBeGreaterThan(0)
  })

  it('includes the canonical section when present', () => {
    const model = nodeInspectorModel(payload(), 'project-with-canonical')
    const canonical = model.sections.find((s) => s.id === 'canonical')
    expect(canonical?.items[0]?.href).toBe('/en/projects/canonical-project/')
    expect(canonical?.items[0]?.label).toBe('Canonical project title')
  })

  it('returns empty sections and a prompt for unknown node keys', () => {
    const body = payload()
    const model = nodeInspectorModel(body, 'missing-node-key')
    expect(model.sections).toEqual([])
    expect(model.prompt).toMatch(/select/i)
    expect(nodeInspectorModel(body, '').sections).toEqual([])
  })

  it('groups neighbour lists by node type via neighbourhood byType', () => {
    const model = nodeInspectorModel(payload(), 'research-area-child001')
    const projects = model.sections.find((s) => s.id === 'projects')
    expect(projects?.items.every((i) => i.type === 'project')).toBe(true)
    expect(projects?.items.map((i) => i.key).sort()).toEqual([
      'project-cccccccc01',
      'project-with-canonical',
    ])
  })

  it('does not import selection, URL, preview, refresh, or search', () => {
    expect(inspectorSource).not.toMatch(
      /from ['"]\.\/(url-state|selection|preview|refresh|search|filters)['"]/,
    )
    for (const forbidden of [
      'pushState',
      'fetch(',
      'localStorage',
      '#token',
      '?focus',
    ]) {
      expect(inspectorSource).not.toContain(forbidden)
    }
  })
})
