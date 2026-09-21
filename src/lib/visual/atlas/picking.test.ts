import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from '../../atlas/model'
import { edgeSampleCountFor, visibleLabelKeys } from './picking'

function payload(): AtlasPayload {
  const nodes = Array.from({ length: 14 }, (_, index) => ({
    key: `node-${String(index).padStart(8, '0')}`,
    type: 'topic',
    label: `Node ${index}`,
    importance: index < 12 ? 100 - index : 20,
    mobileOverviewPriority: 'auto' as const,
    aliases: [],
    position: { x: index, y: 0, z: 0 },
  }))
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: nodes.length,
      relationCount: 0,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes,
    relations: [],
  }
}

describe('Atlas picking visual tiers', () => {
  it('keeps only always-tier labels at rest, capped at ten', () => {
    const body = payload()
    const visible = visibleLabelKeys(body, null, null)

    expect(visible).toHaveLength(10)
    expect(visible).toEqual(body.nodes.slice(0, 10).map((node) => node.key))
  })

  it('uses bounded edge sampling tiers from visual priority', () => {
    expect(edgeSampleCountFor(95)).toBeGreaterThan(edgeSampleCountFor(50))
    expect(edgeSampleCountFor(50)).toBeGreaterThan(edgeSampleCountFor(10))
  })
})
