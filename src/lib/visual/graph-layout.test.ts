import { describe, expect, it } from 'vitest'
import {
  computeGraphLayout,
  computeOrbitalRings,
  computeProjectedLabels,
  hashString,
  projectPoint,
} from './graph-layout'
import { SCENE_CONTRACT_VERSION, type ScenePayload } from './scene-contract'

function createTestPayload(nodeCount: number, edgeCount = 0): ScenePayload {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i + 1}`,
    label: `Test Node ${i + 1}`,
    x: 0,
    y: 0,
    z: 0,
    colorRole: 'brand',
    weight: 2 + (i % 4),
    selected: i === 0,
    dimmed: i > 1,
  }))

  const edges = Array.from(
    { length: Math.min(edgeCount, Math.max(0, nodeCount - 1)) },
    (_, i) => ({
      id: `edge-${i + 1}`,
      source: `node-${i + 1}`,
      target: `node-${i + 2}`,
      directed: false,
      emphasized: i === 0,
    }),
  )

  return {
    contractVersion: SCENE_CONTRACT_VERSION,
    locale: 'en',
    nodes,
    edges,
  }
}

describe('CA-04: Procedural Graph Layout and Geometry (§§2, 3, 5, 6)', () => {
  it('strictly produces deterministic coordinates for identical inputs', () => {
    const payload = createTestPayload(12, 6)
    const run1 = computeGraphLayout(payload)
    const run2 = computeGraphLayout(payload)

    expect(run1.nodes).toEqual(run2.nodes)
    expect(run1.edges).toEqual(run2.edges)
    expect(run1.bounds).toEqual(run2.bounds)
  })

  it('handles 0-node payload cleanly without error or NaN', () => {
    const payload = createTestPayload(0)
    const result = computeGraphLayout(payload)

    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
    expect(result.bounds.minX).toBe(0)
    expect(result.bounds.maxX).toBe(0)
  })

  it('positions single node centrally at (0, 0, 0)', () => {
    const payload = createTestPayload(1)
    const result = computeGraphLayout(payload)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]!.x).toBe(0)
    expect(result.nodes[0]!.y).toBe(0)
    expect(result.nodes[0]!.z).toBe(0)
  })

  it('scales layout across required node counts: 3, 5, 12, 50', () => {
    for (const count of [3, 5, 12, 50]) {
      const payload = createTestPayload(count, count - 1)
      const result = computeGraphLayout(payload)

      expect(result.nodes).toHaveLength(count)
      expect(result.edges).toHaveLength(count - 1)

      for (const node of result.nodes) {
        expect(Number.isFinite(node.x)).toBe(true)
        expect(Number.isFinite(node.y)).toBe(true)
        expect(Number.isFinite(node.z)).toBe(true)
        expect(node.radius).toBeGreaterThanOrEqual(1.8)
        expect(node.radius).toBeLessThanOrEqual(5.5)
      }

      for (const edge of result.edges) {
        expect(Number.isFinite(edge.startX)).toBe(true)
        expect(Number.isFinite(edge.startY)).toBe(true)
        expect(Number.isFinite(edge.endX)).toBe(true)
        expect(Number.isFinite(edge.endY)).toBe(true)
        expect(Number.isFinite(edge.midX)).toBe(true)
      }
    }
  })

  it('preserves valid explicit API positions when supplied in payload', () => {
    const payload = createTestPayload(2)
    payload.nodes[0]!.x = -45.5
    payload.nodes[0]!.y = 20.0
    payload.nodes[0]!.z = 5.0
    payload.nodes[1]!.x = 60.0
    payload.nodes[1]!.y = -30.0
    payload.nodes[1]!.z = -10.0

    const result = computeGraphLayout(payload)
    expect(result.nodes[0]!.x).toBe(-45.5)
    expect(result.nodes[0]!.y).toBe(20.0)
    expect(result.nodes[0]!.z).toBe(5.0)
    expect(result.nodes[1]!.x).toBe(60.0)
    expect(result.nodes[1]!.y).toBe(-30.0)
    expect(result.nodes[1]!.z).toBe(-10.0)
  })

  it('applies flatter camera depth and tighter radii on mobile viewports', () => {
    const payload = createTestPayload(12)
    const desktop = computeGraphLayout(payload, false)
    const mobile = computeGraphLayout(payload, true)

    const desktopDepth = desktop.bounds.maxZ - desktop.bounds.minZ
    const mobileDepth = mobile.bounds.maxZ - mobile.bounds.minZ

    expect(mobileDepth).toBeLessThan(desktopDepth)

    const desktopRings = computeOrbitalRings(false)
    const mobileRings = computeOrbitalRings(true)
    expect(desktopRings).toHaveLength(3)
    expect(mobileRings).toHaveLength(2)
    expect(mobileRings[0]!.radiusX).toBeLessThan(desktopRings[0]!.radiusX)
  })

  it('computes edge coordinates aligned with source and target node centers', () => {
    const payload = createTestPayload(3, 2)
    const result = computeGraphLayout(payload)

    expect(result.edges).toHaveLength(2)
    const edge0 = result.edges[0]!
    const srcNode = result.nodes.find((n) => n.id === edge0.sourceId)!
    const tgtNode = result.nodes.find((n) => n.id === edge0.targetId)!

    expect(edge0.startX).toBe(srcNode.x)
    expect(edge0.startY).toBe(srcNode.y)
    expect(edge0.startZ).toBe(srcNode.z)
    expect(edge0.endX).toBe(tgtNode.x)
    expect(edge0.endY).toBe(tgtNode.y)
    expect(edge0.endZ).toBe(tgtNode.z)
  })

  it('projects 3D coordinates accurately to screen space', () => {
    // Identity view-projection matrix with simple perspective w=z+1
    // Standard perspective projection matrix looking down -Z
    const fov = 45 * (Math.PI / 180)
    const aspect = 1.0
    const near = 1
    const far = 1000
    const f = 1.0 / Math.tan(fov / 2)

    const mat = [
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      -(far + near) / (far - near),
      -1,
      0,
      0,
      -(2 * far * near) / (far - near),
      0,
    ]

    // Point in front of camera at (0, 0, -20)
    const projected = projectPoint(0, 0, -20, mat, 800, 600)
    expect(projected.visible).toBe(true)
    expect(projected.screenX).toBeCloseTo(400, 1)
    expect(projected.screenY).toBeCloseTo(300, 1)

    // Point behind camera at (0, 0, 20)
    const behind = projectPoint(0, 0, 20, mat, 800, 600)
    expect(behind.visible).toBe(false)
  })

  it('projects batch of node labels into ProjectedLabel structure', () => {
    const nodes = [
      { id: 'node-1', x: 0, y: 0, z: -20, radius: 3, ringIndex: 0 },
      { id: 'node-2', x: 5, y: 0, z: -20, radius: 3, ringIndex: 0 },
    ]
    const f = 1.0 / Math.tan((45 * Math.PI) / 360)
    const mat = [f, 0, 0, 0, 0, f, 0, 0, 0, 0, -1, -1, 0, 0, -2, 0]

    const labels = computeProjectedLabels(nodes, mat, 1000, 1000)
    expect(labels).toHaveLength(2)
    expect(labels[0]!.id).toBe('node-1')
    expect(labels[0]!.visible).toBe(true)
    expect(labels[0]!.x).toBe(500)
    expect(labels[0]!.y).toBe(500)

    expect(labels[1]!.id).toBe('node-2')
    expect(labels[1]!.visible).toBe(true)
    expect(labels[1]!.x).toBeGreaterThan(500)
  })

  it('hashString provides stable distribution', () => {
    const h1 = hashString('node-test-alpha')
    const h2 = hashString('node-test-alpha')
    const h3 = hashString('node-test-beta')

    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(typeof h1).toBe('number')
  })
})
