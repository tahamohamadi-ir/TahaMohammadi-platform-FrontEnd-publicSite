/**
 * CA-04 — Procedural Graph Geometry and Deterministic Layout.
 *
 * Provides deterministic mathematical layout algorithms, orbital geometry
 * generators, and camera projection math for the Three.js constellation renderer.
 *
 * Rules:
 * - Pure functions with strict determinism: identical payload produces identical coordinates.
 * - Respects valid API positions; derives stable multi-ring coordinates when missing.
 * - Handles 0, 1, 3, 5, 12, and 50 nodes without clipping, NaN, or non-finite values.
 * - Projects 3D node coordinates through camera view-projection matrix to screen coordinates.
 */

import type { ProjectedLabel, ScenePayload } from './scene-contract'

export interface LayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface OrbitalRingDefinition {
  radiusX: number
  radiusY: number
  tiltX: number
  tiltY: number
  segments: number
}

export interface ComputedNodeLayout {
  id: string
  x: number
  y: number
  z: number
  radius: number
  ringIndex: number
}

export interface ComputedEdgeLayout {
  id: string
  sourceId: string
  targetId: string
  startX: number
  startY: number
  startZ: number
  endX: number
  endY: number
  endZ: number
  midX: number
  midY: number
  midZ: number
  directed: boolean
  emphasized: boolean
}

export interface GraphLayoutResult {
  nodes: ComputedNodeLayout[]
  edges: ComputedEdgeLayout[]
  rings: OrbitalRingDefinition[]
  bounds: LayoutBounds
}

/**
 * FNV-1a 32-bit hash for deterministic numeric derivation from strings.
 */
export function hashString(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Compute orbital background rings for constellation visual structure.
 */
export function computeOrbitalRings(isMobile = false): OrbitalRingDefinition[] {
  if (isMobile) {
    return [
      { radiusX: 38, radiusY: 28, tiltX: 0.12, tiltY: 0.08, segments: 48 },
      { radiusX: 62, radiusY: 46, tiltX: -0.15, tiltY: 0.1, segments: 64 },
    ]
  }
  return [
    { radiusX: 50, radiusY: 36, tiltX: 0.18, tiltY: 0.12, segments: 64 },
    { radiusX: 85, radiusY: 62, tiltX: -0.14, tiltY: 0.16, segments: 72 },
    { radiusX: 120, radiusY: 88, tiltX: 0.08, tiltY: -0.12, segments: 80 },
  ]
}

/**
 * Deterministically compute 3D node and edge positions.
 *
 * If nodes already have valid coordinates in the payload, they are preserved.
 * Otherwise, coordinates are assigned across concentric elliptical rings using
 * golden-ratio spacing and stable hashing.
 */
export function computeGraphLayout(
  payload: ScenePayload,
  isMobile = false,
): GraphLayoutResult {
  const rings = computeOrbitalRings(isMobile)
  const nodeCount = payload.nodes.length

  const nodes: ComputedNodeLayout[] = []
  const nodeMap = new Map<string, ComputedNodeLayout>()

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ~2.39996 rad

  payload.nodes.forEach((node, index) => {
    let x = node.x
    let y = node.y
    let z = node.z

    // If coordinates are exactly 0,0,0 and there are multiple nodes, or non-finite, derive them
    const needsDerivation =
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z) ||
      (x === 0 && y === 0 && z === 0 && nodeCount > 1)

    const ringIndex = rings.length > 0 ? index % rings.length : 0
    const ring = rings[ringIndex] ?? {
      radiusX: 60,
      radiusY: 45,
      tiltX: 0,
      tiltY: 0,
      segments: 64,
    }

    if (needsDerivation) {
      if (nodeCount === 1) {
        x = 0
        y = 0
        z = 0
      } else {
        const theta = index * GOLDEN_ANGLE + (hashString(node.id) % 100) * 0.01
        const rx = ring.radiusX * (0.85 + (index % 3) * 0.1)
        const ry = ring.radiusY * (0.85 + (index % 3) * 0.1)
        const baseZ = isMobile ? 8 : 20

        x = Math.cos(theta) * rx
        y = Math.sin(theta) * ry
        z =
          Math.sin(theta * 2 + ring.tiltX) *
          baseZ *
          (0.6 + (hashString(node.id) % 40) * 0.01)
      }
    }

    // Normalised node visual radius: weight 1..5 mapped to 2.2..4.8 units
    const radius = Math.max(
      1.8,
      Math.min(5.5, 2.0 + (node.weight || 2.5) * 0.6),
    )

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)

    const computedNode: ComputedNodeLayout = {
      id: node.id,
      x,
      y,
      z,
      radius,
      ringIndex,
    }
    nodes.push(computedNode)
    nodeMap.set(node.id, computedNode)
  })

  if (nodeCount === 0) {
    minX = maxX = minY = maxY = minZ = maxZ = 0
  }

  const edges: ComputedEdgeLayout[] = []
  payload.edges.forEach((edge) => {
    const src = nodeMap.get(edge.source)
    const tgt = nodeMap.get(edge.target)
    if (!src || !tgt) return

    // Calculate quadratic curve control midpoint
    const midX = (src.x + tgt.x) * 0.5 + (tgt.y - src.y) * 0.1
    const midY = (src.y + tgt.y) * 0.5 + (src.x - tgt.x) * 0.1
    const midZ = (src.z + tgt.z) * 0.5 + 4.0

    edges.push({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      startX: src.x,
      startY: src.y,
      startZ: src.z,
      endX: tgt.x,
      endY: tgt.y,
      endZ: tgt.z,
      midX,
      midY,
      midZ,
      directed: edge.directed,
      emphasized: edge.emphasized,
    })
  })

  return {
    nodes,
    edges,
    rings,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  }
}

/**
 * 4x4 matrix vector transform helper for projecting 3D point to NDC coordinates.
 */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  viewProjectionMatrix: number[], // 16 elements column-major
  viewportWidth: number,
  viewportHeight: number,
): { screenX: number; screenY: number; visible: boolean } {
  const m = viewProjectionMatrix
  const w = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!

  if (w <= 0.0001) {
    return { screenX: -9999, screenY: -9999, visible: false }
  }

  const invW = 1.0 / w
  const ndcX = (m[0]! * x + m[4]! * y + m[8]! * z + m[12]!) * invW
  const ndcY = (m[1]! * x + m[5]! * y + m[9]! * z + m[13]!) * invW
  const ndcZ = (m[2]! * x + m[6]! * y + m[10]! * z + m[14]!) * invW

  // Check frustum bounds
  const visible =
    ndcX >= -1.2 &&
    ndcX <= 1.2 &&
    ndcY >= -1.2 &&
    ndcY <= 1.2 &&
    ndcZ >= -1.0 &&
    ndcZ <= 1.0

  const screenX = (ndcX * 0.5 + 0.5) * viewportWidth
  const screenY = (-ndcY * 0.5 + 0.5) * viewportHeight

  return { screenX, screenY, visible }
}

/**
 * Project all nodes in the layout to screen labels.
 */
export function computeProjectedLabels(
  nodes: ComputedNodeLayout[],
  viewProjectionMatrix: number[],
  viewportWidth: number,
  viewportHeight: number,
): ProjectedLabel[] {
  return nodes.map((node) => {
    const { screenX, screenY, visible } = projectPoint(
      node.x,
      node.y,
      node.z,
      viewProjectionMatrix,
      viewportWidth,
      viewportHeight,
    )
    return {
      id: node.id,
      x: Math.round(screenX * 10) / 10,
      y: Math.round(screenY * 10) / 10,
      visible,
    }
  })
}
