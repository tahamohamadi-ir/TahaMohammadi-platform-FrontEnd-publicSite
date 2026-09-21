import { describe, expect, it } from 'vitest'

import type { AtlasNodeOut, AtlasPayload } from './model'
import { project2d, selectOverviewNodes } from './projection-2d'

function payloadFixture(nodeCount = 20): AtlasPayload {
  const nodes: AtlasNodeOut[] = [
    {
      key: 'identity-00000001',
      type: 'identity',
      label: 'Anchor',
      importance: 100,
      mobileOverviewPriority: 'auto',
      aliases: [],
      position: { x: 0, y: 0, z: 0 },
    },
    ...Array.from({ length: nodeCount - 1 }, (_, index) => {
      const number = index + 1
      return {
        key: `research-area-${String(number).padStart(8, '0')}`,
        type: 'research-area',
        label: `Research area ${number}`,
        importance: 100 - number,
        mobileOverviewPriority:
          number <= 3 ? ('featured' as const) : ('auto' as const),
        aliases: [],
        position: {
          x: Math.cos(number) * (20 + number * 4),
          y: Math.sin(number) * (20 + number * 4),
          z: number % 4,
        },
      }
    }),
  ]
  nodes[nodes.length - 1].mobileOverviewPriority = 'hidden'

  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 13,
      revision: 'task-13',
      publishedAt: '2026-09-21T00:00:00Z',
      nodeCount: nodes.length,
      relationCount: nodes.length - 1,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'identity',
        label: 'Identity',
        semanticRole: 'anchor',
        visualRole: 'anchor',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: false,
      },
      {
        key: 'research-area',
        label: 'Research area',
        semanticRole: 'area',
        visualRole: 'domain',
        allowAsRoot: false,
        allowChildren: true,
        filterVisible: true,
      },
    ],
    relationTypes: [],
    groups: [],
    nodes,
    relations: nodes.slice(1).map((node) => ({
      key: `identity-00000001~parent-of~${node.key}`,
      type: 'parent-of',
      source: 'identity-00000001',
      target: node.key,
      directed: true,
      weight: 1,
      hierarchy: true,
    })),
  }
}

describe('2D Atlas projection', () => {
  it('is deterministic for the same input and viewport', () => {
    const payload = payloadFixture()
    const options = {
      mode: 'mobile-overview' as const,
      viewport: { width: 390, height: 520 },
      focusKey: null,
    }

    expect(project2d(payload, options)).toEqual(project2d(payload, options))
  })

  it('selects 8–15 mobile nodes, includes the anchor and excludes hidden', () => {
    const selected = selectOverviewNodes(payloadFixture(), {
      mode: 'mobile-overview',
    })
    const keys = selected.map((node) => node.key)

    expect(selected.length).toBeGreaterThanOrEqual(8)
    expect(selected.length).toBeLessThanOrEqual(15)
    expect(keys).toContain('identity-00000001')
    expect(keys).not.toContain('research-area-00000019')
    expect(keys.slice(0, 3)).toEqual([
      'research-area-00000001',
      'research-area-00000002',
      'research-area-00000003',
    ])
  })

  it('keeps every projected circle inside the viewBox', () => {
    const viewport = { width: 390, height: 520 }
    const projected = project2d(payloadFixture(), {
      mode: 'mobile-overview',
      viewport,
      focusKey: null,
    })

    for (const node of projected.nodes) {
      expect(node.cx - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cy - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cx + node.r).toBeLessThanOrEqual(viewport.width)
      expect(node.cy + node.r).toBeLessThanOrEqual(viewport.height)
    }
  })

  it('caps about-preview at ten without fabricating filler', () => {
    expect(
      selectOverviewNodes(payloadFixture(), { mode: 'about-preview' }),
    ).toHaveLength(10)

    const small = payloadFixture(5)
    small.nodes[small.nodes.length - 1].mobileOverviewPriority = 'auto'
    expect(
      selectOverviewNodes(small, { mode: 'about-preview' }).map(
        (node) => node.key,
      ),
    ).toEqual([
      'research-area-00000001',
      'research-area-00000002',
      'research-area-00000003',
      'identity-00000001',
      'research-area-00000004',
    ])
  })
})
