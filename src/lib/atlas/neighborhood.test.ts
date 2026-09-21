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
import { neighborhoodOf } from './neighborhood'

const neighborhoodSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'neighborhood.ts'),
  'utf8',
)

function node(key: string, type: string): AtlasNodeOut {
  return {
    key,
    type,
    label: key,
    importance: 50,
    mobileOverviewPriority: key.endsWith('hidden') ? 'hidden' : 'auto',
    aliases: [],
    position: { x: 0, y: 0, z: 0 },
  }
}

function relation(
  source: string,
  type: string,
  target: string,
  hierarchy: boolean,
): AtlasRelationOut {
  return {
    key: `${source}~${type}~${target}`,
    type,
    source,
    target,
    directed: true,
    weight: 1,
    hierarchy,
  }
}

function payload(): AtlasPayload {
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
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [
      node('research-area-parent01', 'research-area'),
      node('research-area-parent02', 'research-area'),
      node('research-area-child001', 'research-area'),
      node('project-cccccccc01', 'project'),
      node('method-dddddddd01', 'method'),
      node('method-eeeeeeee01', 'method'),
      node('technology-hidden01', 'technology'),
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
        'research-area-parent01',
        'contains',
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
      relation('method-dddddddd01', 'uses', 'method-eeeeeeee01', false),
      relation('method-eeeeeeee01', 'uses', 'project-cccccccc01', false),
      relation(
        'technology-hidden01',
        'supports',
        'research-area-child001',
        false,
      ),
    ],
  }
}

describe('neighborhood (Plan C Task 10)', () => {
  it('returns both hierarchy parents once, one-hop only, and stays finite on a general cycle', () => {
    const body = payload()
    const child = neighborhoodOf(body, 'research-area-child001')

    expect(child.parents).toEqual([
      'research-area-parent01',
      'research-area-parent02',
    ])
    expect(child.children).toEqual([])
    expect(child.outgoing).toEqual([
      {
        relationKey: 'research-area-child001~related-to~project-cccccccc01',
        relationType: 'related-to',
        nodeKey: 'project-cccccccc01',
      },
    ])
    expect(child.incoming).toEqual([
      {
        relationKey: 'technology-hidden01~supports~research-area-child001',
        relationType: 'supports',
        nodeKey: 'technology-hidden01',
      },
    ])
    expect(child.byType).toEqual({
      project: ['project-cccccccc01'],
      'research-area': ['research-area-parent01', 'research-area-parent02'],
      technology: ['technology-hidden01'],
    })
    expect(JSON.stringify(child)).not.toContain('method-dddddddd01')
    expect(JSON.stringify(child)).not.toContain('method-eeeeeeee01')

    const project = neighborhoodOf(body, 'project-cccccccc01')
    expect(project.incoming).toEqual([
      {
        relationKey: 'method-eeeeeeee01~uses~project-cccccccc01',
        relationType: 'uses',
        nodeKey: 'method-eeeeeeee01',
      },
      {
        relationKey: 'research-area-child001~related-to~project-cccccccc01',
        relationType: 'related-to',
        nodeKey: 'research-area-child001',
      },
    ])
    expect(project.outgoing).toEqual([
      {
        relationKey: 'project-cccccccc01~uses~method-dddddddd01',
        relationType: 'uses',
        nodeKey: 'method-dddddddd01',
      },
    ])
    expect(project.parents).toEqual([])
  })

  it('returns an empty neighbourhood for an unknown key and does not mutate the payload', () => {
    const body = payload()
    const relations = body.relations
    expect(neighborhoodOf(body, 'missing-node-key')).toEqual({
      parents: [],
      children: [],
      incoming: [],
      outgoing: [],
      byType: {},
    })
    expect(body.relations).toBe(relations)
  })

  it('does not import selection, URL, preview, refresh, or search', () => {
    expect(neighborhoodSource).not.toMatch(
      /from ['"]\.\/(url-state|selection|preview|refresh|search|filters)['"]/,
    )
    for (const forbidden of [
      'pushState',
      'fetch(',
      'localStorage',
      '#token',
      '?focus',
    ]) {
      expect(neighborhoodSource).not.toContain(forbidden)
    }
  })
})
