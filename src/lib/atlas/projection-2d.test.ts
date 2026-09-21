import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { project2d, selectOverviewNodes } from './projection-2d'
import { makeSamplePayload } from './sample-payload'

function benchmarkPayload(): AtlasPayload {
  return makeSamplePayload()
}

function scalePayload(): AtlasPayload {
  const nodes = []
  nodes.push({
    key: 'identity-00000001',
    type: 'identity',
    label: 'Anchor',
    importance: 100,
    mobileOverviewPriority: 'featured',
    aliases: [],
    position: { x: 0, y: 0, z: 0 },
  })
  for (let i = 1; i <= 20; i += 1) {
    nodes.push({
      key: `area-${String(i).padStart(8, '0')}`,
      type: 'research-area',
      label: `Area ${i}`,
      importance: 90 - i,
      mobileOverviewPriority:
        i <= 3 ? 'featured' : i === 20 ? 'hidden' : 'auto',
      aliases: [],
      position: { x: i * 3, y: (i % 5) * 4, z: i },
    })
  }
  return {
    ...(makeSamplePayload() as unknown as Record<string, unknown>),
    nodes,
    relations: [],
    groups: [],
  } as unknown as AtlasPayload
}

describe('atlas 2D projection (Plan C Task 13)', () => {
  it('is deterministic for the same input and viewport', () => {
    expect(
      project2d(benchmarkPayload(), {
        mode: 'mobile-overview',
        viewport: { width: 390, height: 520 },
        focusKey: null,
      }),
    ).toEqual(
      project2d(benchmarkPayload(), {
        mode: 'mobile-overview',
        viewport: { width: 390, height: 520 },
        focusKey: null,
      }),
    )
  })

  it('selects 8–15 nodes for the mobile overview and honours hidden', () => {
    const payloadFixture = scalePayload()
    const anchorKey = 'identity-00000001'
    const hiddenKey = 'area-00000020'
    const keys = selectOverviewNodes(payloadFixture, {
      mode: 'mobile-overview',
    }).map((n) => n.key)
    expect(keys.length).toBeGreaterThanOrEqual(8)
    expect(keys.length).toBeLessThanOrEqual(15)
    expect(keys).toContain(anchorKey)
    expect(keys).not.toContain(hiddenKey)
  })

  it('keeps every projected node inside the viewBox', () => {
    const projected = project2d(benchmarkPayload(), {
      mode: 'mobile-overview',
      viewport: { width: 390, height: 520 },
      focusKey: null,
    })
    for (const node of projected.nodes) {
      expect(node.cx - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cy - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cx + node.r).toBeLessThanOrEqual(390)
      expect(node.cy + node.r).toBeLessThanOrEqual(520)
    }
  })

  it('reduces the about-preview selection to at most 10 and never fabricates filler', () => {
    const payloadFixture = benchmarkPayload()
    expect(
      selectOverviewNodes(payloadFixture, { mode: 'about-preview' }).length,
    ).toBeLessThanOrEqual(10)
    const small: AtlasPayload = {
      ...payloadFixture,
      nodes: payloadFixture.nodes.slice(0, 2),
      relations: [],
      groups: [],
    }
    expect(
      selectOverviewNodes(small, { mode: 'about-preview' }).map((n) => n.key),
    ).toEqual(small.nodes.map((n) => n.key))
  })
})
