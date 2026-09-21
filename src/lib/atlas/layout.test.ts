import { describe, expect, it } from 'vitest'

import type { AtlasNodeOut, AtlasPayload } from './model'
import {
  assertComplete,
  labelTierFor,
  radiusFor,
  resolveLayout,
  tierFor,
  alwaysLabelKeys,
} from './layout'

function payloadFixture(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 12,
      revision: '12-2026-09-20T10:31:04.221000+00:00',
      publishedAt: '2026-09-20T10:31:04.221000+00:00',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 7,
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
        key: 'identity',
        label: 'Identity',
        semanticRole: 'identity',
        visualRole: 'identity',
        allowAsRoot: true,
        allowChildren: false,
        filterVisible: false,
      },
    ],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'identity-2b3c4d5e',
        type: 'identity',
        label: 'Taha Mohammadi',
        importance: 90,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
      {
        key: 'research-area-1a2b3c4d',
        type: 'research-area',
        label: 'PARS-SQL / VTD-Edge',
        importance: 80,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 41.882, y: 12.021, z: 6.5 },
      },
    ],
    relations: [],
  }
}

function withoutCoordinate(payload: AtlasPayload): AtlasPayload {
  const nodes = payload.nodes.map((node, index) => {
    if (index !== 0) return node
    return {
      ...node,
      position: { x: Number.NaN, y: 12, z: 0 },
    }
  })
  return { ...payload, nodes }
}

describe('layout consumption', () => {
  it('consumes stored coordinates and never re-computes them', () => {
    const payload = payloadFixture()
    const layout = resolveLayout(payload)
    const expected = [...payload.nodes]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((node) => [
        node.key,
        node.position.x,
        node.position.y,
        node.position.z,
      ])
    expect(layout.nodes.map((node) => [node.key, node.x, node.y, node.z])).toEqual(
      expected,
    )
  })

  it('derives radius and tiers from importance deterministically', () => {
    expect(tierFor({ importance: 80 })).toBe('primary')
    expect(tierFor({ importance: 79 })).toBe('fine')
    expect(radiusFor({ importance: 100, type: 'research-area' })).toBeGreaterThan(
      radiusFor({ importance: 40, type: 'research-area' }),
    )
  })

  it('flags a missing coordinate instead of inventing one', () => {
    expect(() =>
      assertComplete(resolveLayout(withoutCoordinate(payloadFixture()))),
    ).toThrow(/missing coordinate/i)
  })

  it('is stable across calls and independent of node order', () => {
    const payload = payloadFixture()
    expect(resolveLayout(payload)).toEqual(
      resolveLayout({
        ...payload,
        nodes: [...payload.nodes].reverse(),
      }),
    )
  })

  it('caps always label tier at ten nodes by importance', () => {
    const nodes: AtlasNodeOut[] = Array.from({ length: 12 }, (_, index) => ({
      key: `node-${String(index).padStart(2, '0')}`,
      type: 'project',
      importance: 80 + index,
      mobileOverviewPriority: 'auto' as const,
      aliases: [],
      position: { x: index, y: 0, z: 0 },
    }))
    const always = alwaysLabelKeys(nodes)
    expect(always.size).toBe(10)
    const top = [...nodes]
      .sort(
        (left, right) =>
          right.importance - left.importance || left.key.localeCompare(right.key),
      )
      .slice(0, 10)
    for (const node of top) {
      expect(labelTierFor(node, always)).toBe('always')
    }
    const eleventh = nodes.find((node) => !always.has(node.key))!
    expect(eleventh.importance).toBeGreaterThanOrEqual(80)
    expect(labelTierFor(eleventh, always)).toBe('on-demand')
  })
})
