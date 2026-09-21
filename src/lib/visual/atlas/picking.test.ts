import { describe, expect, it } from 'vitest'

import { pickAtlasAt, projectAtlasForPick } from './picking'
import type { AtlasPayload } from '../../atlas/model'

function payload(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-21T00:00:00Z',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'a',
        type: 'project',
        label: 'A',
        importance: 80,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
      {
        key: 'b',
        type: 'project',
        label: 'B',
        importance: 20,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 60, y: 0, z: 0 },
      },
    ],
    relations: [
      {
        key: 'a~uses~b',
        type: 'uses',
        source: 'a',
        target: 'b',
        directed: true,
        weight: 1,
        hierarchy: false,
      },
    ],
  }
}

describe('pickAtlasAt (Plan C Task 17)', () => {
  it('selects the node under the pointer within slop', () => {
    const scene = projectAtlasForPick(payload(), {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      width: 800,
      height: 520,
    })
    // Node `a` sits at the origin; the identity view matrix centres the
    // stage, so a click near the centre must resolve to `a`.
    const picked = pickAtlasAt({ x: 400, y: 260 }, scene)
    expect(picked.kind).toBe('node')
    expect(picked.id).toBe('a')
  })

  it('prefers nodes over edges when both are under the pointer', () => {
    const scene = projectAtlasForPick(payload(), {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      width: 800,
      height: 520,
    })
    const picked = pickAtlasAt({ x: 400, y: 260 }, scene)
    expect(picked.kind).not.toBe('edge')
  })

  it('returns none far from every node and edge', () => {
    const scene = projectAtlasForPick(payload(), {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -100, 1],
      width: 800,
      height: 520,
    })
    // Corner of the stage with the graph centred: nothing within slop.
    expect(pickAtlasAt({ x: 5, y: 5 }, scene).kind).toBe('none')
  })
})
