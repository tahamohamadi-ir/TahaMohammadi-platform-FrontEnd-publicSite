/**
 * RU-03 — Screen-space picking (pure).
 *
 * Edge selection is a core product requirement, so edges are picked by
 * CURVE-DISTANCE in screen space rather than with invisible 3D geometry: the
 * renderer already samples every relationship into a polyline (`layout.ts`), and
 * this module measures the pointer against those same samples. Nothing extra is
 * uploaded to the GPU to make a relationship clickable.
 *
 * Everything here is a pure function over numbers, so the whole pıcking model is
 * unit-tested without WebGL, a DOM or a browser.
 */

import type { UniverseEdge3D, UniverseNode3D, UniversePoint } from './layout'

export interface ScreenPoint {
  x: number
  y: number
}

export interface ProjectedNode3D {
  id: string
  x: number
  y: number
  /** Screen-space radius in CSS pixels, derived from the view matrix. */
  radiusPx: number
  /** Clip-space depth; smaller means nearer to the camera. */
  depth: number
  visible: boolean
}

export interface ProjectedEdge3D {
  id: string
  points: ScreenPoint[]
  visible: boolean
}

/** Minimum touch/pointer target for canvas picking, matching the 44px floor. */
export const NODE_PICK_SLOP_PX = 10
export const EDGE_PICK_SLOP_PX = 14

export function projectPointToScreen(
  point: UniversePoint,
  matrix: ReadonlyArray<number>,
  width: number,
  height: number,
): { x: number; y: number; depth: number; clipW: number; visible: boolean } {
  const clipW =
    (matrix[3] ?? 0) * point.x +
    (matrix[7] ?? 0) * point.y +
    (matrix[11] ?? 0) * point.z +
    (matrix[15] ?? 1)
  if (!Number.isFinite(clipW) || clipW <= 1e-4) {
    return {
      x: -9999,
      y: -9999,
      depth: Number.POSITIVE_INFINITY,
      clipW: 0,
      visible: false,
    }
  }
  const invW = 1 / clipW
  const ndcX =
    ((matrix[0] ?? 0) * point.x +
      (matrix[4] ?? 0) * point.y +
      (matrix[8] ?? 0) * point.z +
      (matrix[12] ?? 0)) *
    invW
  const ndcY =
    ((matrix[1] ?? 0) * point.x +
      (matrix[5] ?? 0) * point.y +
      (matrix[9] ?? 0) * point.z +
      (matrix[13] ?? 0)) *
    invW
  const ndcZ =
    ((matrix[2] ?? 0) * point.x +
      (matrix[6] ?? 0) * point.y +
      (matrix[10] ?? 0) * point.z +
      (matrix[14] ?? 0)) *
    invW

  const visible =
    ndcX >= -1.15 &&
    ndcX <= 1.15 &&
    ndcY >= -1.15 &&
    ndcY <= 1.15 &&
    ndcZ >= -1 &&
    ndcZ <= 1

  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height,
    depth: invW,
    clipW,
    visible,
  }
}

/** Screen radius of a world-space sphere under the current view projection. */
export function projectedRadiusPx(
  radiusWorld: number,
  matrix: ReadonlyArray<number>,
  width: number,
  height: number,
  clipW: number,
): number {
  if (!Number.isFinite(clipW) || clipW <= 1e-4) return 0
  const invW = 1 / clipW
  const fromX = Math.abs((matrix[0] ?? 1) * invW) * 0.5 * width
  const fromY = Math.abs((matrix[5] ?? 1) * invW) * 0.5 * height
  return Math.max(radiusWorld * Math.max(fromX, fromY), 1)
}

export function projectNodes(
  nodes: ReadonlyArray<UniverseNode3D>,
  matrix: ReadonlyArray<number>,
  width: number,
  height: number,
): ProjectedNode3D[] {
  return nodes.map((node) => {
    const projected = projectPointToScreen(node.point, matrix, width, height)
    return {
      id: node.id,
      x: projected.x,
      y: projected.y,
      radiusPx: projectedRadiusPx(
        node.radius,
        matrix,
        width,
        height,
        projected.clipW,
      ),
      depth: projected.depth,
      visible: projected.visible,
    }
  })
}

export function projectEdges(
  edges: ReadonlyArray<UniverseEdge3D>,
  matrix: ReadonlyArray<number>,
  width: number,
  height: number,
): ProjectedEdge3D[] {
  return edges.map((edge) => {
    let anyVisible = false
    const points = edge.samples.map((sample) => {
      const projected = projectPointToScreen(sample, matrix, width, height)
      if (projected.visible) anyVisible = true
      return { x: projected.x, y: projected.y }
    })
    return { id: edge.id, points, visible: anyVisible }
  })
}

/** Squared distance from a point to a segment; avoids a square root per edge. */
export function distanceToSegmentSquared(
  point: ScreenPoint,
  from: ScreenPoint,
  to: ScreenPoint,
): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) {
    const ox = point.x - from.x
    const oy = point.y - from.y
    return ox * ox + oy * oy
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy),
    ),
  )
  const closestX = from.x + t * dx
  const closestY = from.y + t * dy
  const ox = point.x - closestX
  const oy = point.y - closestY
  return ox * ox + oy * oy
}

/** Minimum distance from a point to a polyline, in pixels. */
export function distanceToPolyline(
  point: ScreenPoint,
  polyline: ReadonlyArray<ScreenPoint>,
): number {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY
  if (polyline.length === 1) {
    const only = polyline[0]!
    return Math.hypot(point.x - only.x, point.y - only.y)
  }
  let best = Number.POSITIVE_INFINITY
  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = distanceToSegmentSquared(
      point,
      polyline[index]!,
      polyline[index + 1]!,
    )
    if (distance < best) best = distance
  }
  return Math.sqrt(best)
}

/**
 * Nearest node under the pointer. A node wins when the pointer is inside its
 * drawn radius plus the slop; ties go to the node nearest the camera, which is
 * what the user believes they are pointing at.
 */
export function pickNode(
  point: ScreenPoint,
  nodes: ReadonlyArray<ProjectedNode3D>,
  slopPx: number = NODE_PICK_SLOP_PX,
): ProjectedNode3D | null {
  let best: ProjectedNode3D | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const node of nodes) {
    if (!node.visible) continue
    const distance = Math.hypot(point.x - node.x, point.y - node.y)
    if (distance > node.radiusPx + slopPx) continue
    if (
      distance < bestDistance - 0.5 ||
      (Math.abs(distance - bestDistance) <= 0.5 &&
        node.depth < (best?.depth ?? Number.POSITIVE_INFINITY))
    ) {
      best = node
      bestDistance = distance
    }
  }
  return best
}

/** Nearest relationship under the pointer, by screen-space curve distance. */
export function pickEdge(
  point: ScreenPoint,
  edges: ReadonlyArray<ProjectedEdge3D>,
  slopPx: number = EDGE_PICK_SLOP_PX,
): ProjectedEdge3D | null {
  let best: ProjectedEdge3D | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const edge of edges) {
    if (edge.points.length < 2) continue
    const distance = distanceToPolyline(point, edge.points)
    if (distance > slopPx) continue
    if (distance < bestDistance) {
      bestDistance = distance
      best = edge
    }
  }
  return best
}

export interface PickResult {
  kind: 'node' | 'edge' | 'none'
  id: string | null
}

/**
 * Composite pick. Nodes take priority over edges: a relationship that passes
 * behind a node must not steal the click that belongs to the node, and a user
 * pointing at a node domain always means the node.
 */
export function pickAt(
  point: ScreenPoint,
  nodes: ReadonlyArray<ProjectedNode3D>,
  edges: ReadonlyArray<ProjectedEdge3D>,
  options: { nodeSlopPx?: number; edgeSlopPx?: number } = {},
): PickResult {
  const node = pickNode(point, nodes, options.nodeSlopPx ?? NODE_PICK_SLOP_PX)
  if (node) return { kind: 'node', id: node.id }
  const edge = pickEdge(point, edges, options.edgeSlopPx ?? EDGE_PICK_SLOP_PX)
  if (edge) return { kind: 'edge', id: edge.id }
  return { kind: 'none', id: null }
}
