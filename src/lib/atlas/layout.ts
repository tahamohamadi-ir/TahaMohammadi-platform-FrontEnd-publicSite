/** Layout consumption (Plan C Task 12).
 *
 * Reads stored coordinates from the payload — never re-simulates Plan A layout.
 * Derives presentation radius, mesh tier, label tier and draw order deterministically.
 */

import type { AtlasNodeOut, AtlasPayload } from './model'

const R_MIN = 6
const R_MAX = 18
const IDENTITY_RADIUS_FACTOR = 1.45
const ALWAYS_LABEL_CAP = 10

export type AtlasMeshTier = 'primary' | 'fine'
export type AtlasLabelTier = 'always' | 'on-demand' | 'selected'

export interface AtlasLayoutNode {
  key: string
  x: number
  y: number
  z: number
  radius: number
  tier: AtlasMeshTier
  drawOrder: number
}

export interface AtlasLayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface AtlasLayoutCenter {
  x: number
  y: number
  z: number
}

export interface AtlasLayout {
  nodes: AtlasLayoutNode[]
  bounds: AtlasLayoutBounds
  center: AtlasLayoutCenter
}

function compareKey(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function baseRadius(importance: number): number {
  return R_MIN + (R_MAX - R_MIN) * (importance / 100)
}

export function radiusFor(
  node: Pick<AtlasNodeOut, 'importance' | 'type'>,
): number {
  const linear = baseRadius(node.importance)
  if (node.type === 'identity') {
    return IDENTITY_RADIUS_FACTOR * linear
  }
  return linear
}

export function tierFor(node: Pick<AtlasNodeOut, 'importance'>): AtlasMeshTier {
  return node.importance >= 80 ? 'primary' : 'fine'
}

/** Top `ALWAYS_LABEL_CAP` nodes with importance ≥ 80, by (-importance, key). */
export function alwaysLabelKeys(
  nodes: readonly Pick<AtlasNodeOut, 'key' | 'importance'>[],
): ReadonlySet<string> {
  const candidates = nodes.filter((node) => node.importance >= 80)
  const ranked = [...candidates].sort(
    (left, right) =>
      right.importance - left.importance || compareKey(left.key, right.key),
  )
  return new Set(ranked.slice(0, ALWAYS_LABEL_CAP).map((node) => node.key))
}

export function labelTierFor(
  node: Pick<AtlasNodeOut, 'key' | 'importance'>,
  alwaysKeys: ReadonlySet<string>,
): AtlasLabelTier {
  if (node.importance >= 80) {
    return alwaysKeys.has(node.key) ? 'always' : 'on-demand'
  }
  if (node.importance >= 40) return 'on-demand'
  return 'selected'
}

function finiteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function assertComplete(layout: AtlasLayout): void {
  for (const node of layout.nodes) {
    if (
      !finiteCoordinate(node.x) ||
      !finiteCoordinate(node.y) ||
      !finiteCoordinate(node.z)
    ) {
      throw new Error(`missing coordinate for node "${node.key}"`)
    }
  }
}

function boundsFromNodes(nodes: AtlasLayoutNode[]): AtlasLayoutBounds {
  if (nodes.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
    }
  }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
    minZ = Math.min(minZ, node.z)
    maxZ = Math.max(maxZ, node.z)
  }
  return { minX, maxX, minY, maxY, minZ, maxZ }
}

function centerFromBounds(bounds: AtlasLayoutBounds): AtlasLayoutCenter {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
}

export function resolveLayout(payload: AtlasPayload): AtlasLayout {
  const sorted = [...payload.nodes].sort((left, right) =>
    compareKey(left.key, right.key),
  )

  const layoutNodes: AtlasLayoutNode[] = sorted.map((node) => ({
    key: node.key,
    x: node.position.x,
    y: node.position.y,
    z: node.position.z,
    radius: radiusFor(node),
    tier: tierFor(node),
    drawOrder: 0,
  }))

  const byDepth = [...layoutNodes].sort(
    (left, right) =>
      left.z - right.z || compareKey(left.key, right.key),
  )
  byDepth.forEach((node, index) => {
    node.drawOrder = index
  })

  const bounds = boundsFromNodes(layoutNodes)
  return {
    nodes: layoutNodes,
    bounds,
    center: centerFromBounds(bounds),
  }
}
