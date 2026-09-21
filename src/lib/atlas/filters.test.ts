import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ATLAS_CONTRACT_VERSION,
  type AtlasNodeOut,
  type AtlasNodeTypeOut,
  type AtlasPayload,
  type AtlasRelationOut,
} from './model'
import { filterOptions, filterSet } from './filters'

const filtersSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'filters.ts'),
  'utf8',
)

function typeOf(
  key: string,
  label: string,
  filterVisible: boolean,
  semanticRole = 'record',
): AtlasNodeTypeOut {
  return {
    key,
    label,
    semanticRole,
    visualRole: 'record',
    allowAsRoot: false,
    allowChildren: false,
    filterVisible,
  }
}

function node(key: string, type: string): AtlasNodeOut {
  return {
    key,
    type,
    label: key,
    importance: 50,
    mobileOverviewPriority: 'auto',
    aliases: [],
    position: { x: 0, y: 0, z: 0 },
  }
}

function relation(
  source: string,
  type: string,
  target: string,
): AtlasRelationOut {
  return {
    key: `${source}~${type}~${target}`,
    type,
    source,
    target,
    directed: true,
    weight: 1,
    hierarchy: false,
  }
}

function payload(locale: 'en' | 'fa' = 'en'): AtlasPayload {
  return {
    contractVersion: ATLAS_CONTRACT_VERSION,
    locale,
    version: {
      id: 1,
      revision: '1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: 4,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [
      typeOf(
        'identity',
        locale === 'fa' ? 'هویت' : 'Identity',
        false,
        'anchor',
      ),
      typeOf(
        'research-area',
        locale === 'fa' ? 'دامنهٔ پژوهشی' : 'Research area',
        true,
        'area',
      ),
      typeOf('project', locale === 'fa' ? 'پروژه' : 'Project', true),
      typeOf('publication', locale === 'fa' ? 'انتشار' : 'Publication', true),
      typeOf('method', locale === 'fa' ? 'روش' : 'Method', true, 'utility'),
      typeOf(
        'technology',
        locale === 'fa' ? 'فناوری' : 'Technology',
        true,
        'utility',
      ),
    ],
    relationTypes: [],
    groups: [],
    nodes: [
      node('identity-00000001', 'identity'),
      node('research-area-aaaaaaa1', 'research-area'),
      node('project-cccccccc01', 'project'),
      node('publication-ddddddd1', 'publication'),
    ],
    relations: [
      relation('research-area-aaaaaaa1', 'produces', 'publication-ddddddd1'),
    ],
  }
}

describe('filters (Plan C Task 10)', () => {
  it('maps All plus every filterVisible type, and never offers identity', () => {
    expect(
      filterOptions(payload('en')).map((option) => [option.key, option.label]),
    ).toEqual([
      ['all', 'All'],
      ['research-area', 'Research area'],
      ['project', 'Project'],
      ['publication', 'Publication'],
      ['method', 'Method'],
      ['technology', 'Technology'],
    ])
    expect(filterOptions(payload('fa'))[0]).toEqual({
      key: 'all',
      label: 'همه',
      nodeTypeKey: null,
    })

    const withAnchorLeak = payload('en')
    withAnchorLeak.nodeTypes = [
      typeOf('identity', 'Identity', true, 'anchor'),
      typeOf('centre', 'Centre', true, 'anchor'),
      typeOf('dataset', 'Dataset', true),
      ...withAnchorLeak.nodeTypes.slice(1),
    ]
    const keys = filterOptions(withAnchorLeak).map((option) => option.key)
    expect(keys[0]).toBe('all')
    expect(keys).not.toContain('identity')
    expect(keys).not.toContain('centre')
    expect(keys).toContain('dataset')
  })

  it('computes dim-first membership and leaves the payload identical', () => {
    const body = payload('en')
    const nodes = body.nodes
    const relations = body.relations
    const snapshot = structuredClone(body)

    const project = filterSet(body, 'project')
    expect(project.emphasizedNodes).toEqual(['project-cccccccc01'])
    expect(project.dimmedNodes).toEqual([
      'identity-00000001',
      'publication-ddddddd1',
      'research-area-aaaaaaa1',
    ])
    expect(project.emphasizedRelations).toEqual([])
    expect(project.dimmedRelations).toEqual([
      'research-area-aaaaaaa1~produces~publication-ddddddd1',
    ])

    const all = filterSet(body, 'all')
    expect(all.emphasizedNodes).toEqual([
      'identity-00000001',
      'project-cccccccc01',
      'publication-ddddddd1',
      'research-area-aaaaaaa1',
    ])
    expect(all.dimmedNodes).toEqual([])
    expect(all.emphasizedRelations).toEqual(relations.map((item) => item.key))
    expect(all.dimmedRelations).toEqual([])

    expect(filterSet(body, 'identity').emphasizedNodes).toEqual([])
    expect(filterSet(body, 'nope').emphasizedNodes).toEqual([])

    expect(body.nodes).toBe(nodes)
    expect(body.relations).toBe(relations)
    expect(body).toEqual(snapshot)
  })

  it('does not write URL focus or import selection, preview, or refresh', () => {
    expect(
      filterOptions(payload()).every((option) => !option.key.includes('focus')),
    ).toBe(true)
    expect(filtersSource).not.toMatch(
      /from ['"]\.\/(url-state|selection|preview|refresh|search|neighborhood)['"]/,
    )
    for (const forbidden of [
      'pushState',
      'fetch(',
      'localStorage',
      '#token',
      '?focus',
    ]) {
      expect(filtersSource).not.toContain(forbidden)
    }
  })
})
