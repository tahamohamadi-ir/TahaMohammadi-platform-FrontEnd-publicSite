import { describe, expect, it } from 'vitest'

import { ATLAS_CONTRACT_VERSION, type AtlasPayload } from './model'
import { createSelectionModel } from './selection'

function payload(): AtlasPayload {
  return {
    contractVersion: ATLAS_CONTRACT_VERSION,
    locale: 'en',
    version: {
      id: 1,
      revision: '1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'identity',
        label: 'Identity',
        semanticRole: 'identity',
        visualRole: 'identity',
        allowAsRoot: true,
        allowChildren: false,
        filterVisible: false,
      },
      {
        key: 'research-area',
        label: 'Research area',
        semanticRole: 'area',
        visualRole: 'domain',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: true,
      },
    ],
    relationTypes: [
      {
        key: 'research-focus',
        label: 'research focus',
        inverseLabel: 'research focus of',
        directed: true,
        hierarchyRole: false,
        visualPriority: 70,
      },
    ],
    groups: [],
    nodes: [
      {
        key: 'identity-2b3c4d5e',
        type: 'identity',
        label: 'Taha',
        importance: 90,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
      {
        key: 'research-area-1a2b3c4d',
        type: 'research-area',
        label: 'Area',
        importance: 80,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 1, y: 2, z: 3 },
      },
    ],
    relations: [
      {
        key: 'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
        type: 'research-focus',
        source: 'identity-2b3c4d5e',
        target: 'research-area-1a2b3c4d',
        directed: true,
        hierarchy: false,
        weight: 1,
      },
    ],
  }
}

describe('selection model (Plan C Task 9)', () => {
  it('resolves known and unknown focuses with overview semantics', () => {
    const model = createSelectionModel(payload())
    expect(model.state.mode).toBe('overview')
    expect(model.exists({ kind: 'node', key: 'research-area-1a2b3c4d' })).toBe(
      true,
    )
    expect(
      model.exists({
        kind: 'relation',
        key: 'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
      }),
    ).toBe(true)
    expect(model.exists({ kind: 'node', key: 'nope-zzzzzzzz' })).toBe(false)

    expect(model.resolve({ kind: 'node', key: 'nope-zzzzzzzz' })).toEqual({
      selected: null,
      reason: 'unknown',
    })
    expect(
      model.resolve({ kind: 'node', key: 'research-area-1a2b3c4d' }),
    ).toEqual({
      selected: { kind: 'node', key: 'research-area-1a2b3c4d' },
    })
  })

  it('selects only existing keys; unknown selection returns to overview', () => {
    const model = createSelectionModel(payload())

    model.selectNode('research-area-1a2b3c4d')
    expect(model.state).toEqual({
      mode: 'node',
      key: 'research-area-1a2b3c4d',
    })
    expect(model.stateAttr()).toBe('node')

    model.selectNode('nope-zzzzzzzz')
    expect(model.state.mode).toBe('overview')
    expect(model.stateAttr()).toBe('overview')

    model.selectRelation(
      'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
    )
    expect(model.state.mode).toBe('relation')
    model.clear()
    expect(model.state.mode).toBe('overview')
  })

  it('rejects payloads where a key collides across node and relation sets', () => {
    const bad = payload()
    bad.relations = [
      {
        key: 'research-area-1a2b3c4d',
        type: 'research-focus',
        source: 'identity-2b3c4d5e',
        target: 'research-area-1a2b3c4d',
        directed: true,
        hierarchy: false,
        weight: 1,
      },
    ]
    expect(() => createSelectionModel(bad)).toThrow(/collision/i)
  })

  it('kind-aware exists does not confuse a node key with a relation key', () => {
    const model = createSelectionModel(payload())
    const rel = 'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d'
    expect(model.exists({ kind: 'node', key: rel })).toBe(false)
    expect(
      model.exists({ kind: 'relation', key: 'research-area-1a2b3c4d' }),
    ).toBe(false)
  })
})
