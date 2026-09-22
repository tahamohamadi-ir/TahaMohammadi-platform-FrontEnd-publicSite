/** Deterministic layout consumption (Plan C Task 12). Pure.
 *
 * The backend is the one layout authority (spec §12.1): pin precedence,
 * group attraction, hierarchy seeding and collision relaxation all resolve
 * upstream in `apps/atlas/layout.py`. This module consumes the stored
 * coordinates and derives only presentation facts — radius from importance,
 * bounds, draw order, label tiers — never a re-simulation.
 */
import type { AtlasPayload } from './model'

export type AtlasNodeTier = 'primary' | 'fine'
export type AtlasLabelTier = 'always' | 'on-demand' | 'selected'

export interface AtlasLayoutNode {
  key: string
  x: number
  y: number
  z: number
  radius: number
  tier: AtlasNodeTier
  drawOrder: number
}

export interface AtlasLayout {
  nodes: AtlasLayoutNode[]
  bounds: {
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
  }
  center: { x: number; y: number; z: number }
}

/** Monotonic in importance: a more important node always draws larger. */
export function radiusFor(node: { importance: number }): number {
  return 0.5 + (node.importance / 100) * 1.5
}

export function tierFor(node: { importance: number }): AtlasNodeTier {
  return node.importance >= 80 ? 'primary' : 'fine'
}

/** Top-10 (by importance) keys currently holding the `always` label tier. */
export function alwaysLabelKeys(
  nodes: ReadonlyArray<{ key: string; importance: number }>,
): string[] {
  return [...nodes]
    .filter((n) => n.importance >= 80)
    .sort((a, b) =>
      a.importance === b.importance
        ? a.key < b.key
          ? -1
          : 1
        : b.importance - a.importance,
    )
    .slice(0, 10)
    .map((n) => n.key)
}

export function labelTierFor(
  node: { key: string; importance: number },
  alwaysKeys: readonly string[] = alwaysLabelKeys([node]),
): AtlasLabelTier {
  if (node.importance >= 80)
    return alwaysKeys.includes(node.key) ? 'always' : 'on-demand'
  if (node.importance >= 40) return 'on-demand'
  return 'selected'
}

const byImportanceKey = (
  a: { key: string; importance: number },
  b: { key: string; importance: number },
) =>
  a.importance === b.importance
    ? a.key < b.key
      ? -1
      : 1
    : b.importance - a.importance

export function resolveLayout(payload: AtlasPayload): AtlasLayout {
  // Draw order follows the projection's deterministic ordering
  // ((-importance, key), spec §10.3) — never payload order — so the layout is
  // stable across calls and independent of node order.
  const order = new Map(
    [...payload.nodes]
      .sort(byImportanceKey)
      .map((node, index) => [node.key, index]),
  )
  const nodes: AtlasLayoutNode[] = payload.nodes.map((node) => ({
    key: node.key,
    x: node.position?.x,
    y: node.position?.y,
    z: node.position?.z,
    radius: radiusFor(node),
    tier: tierFor(node),
    drawOrder: order.get(node.key) ?? 0,
  }))

  let { x: minX, y: minY, z: minZ } = { x: Infinity, y: Infinity, z: Infinity }
  let {
    x: maxX,
    y: maxY,
    z: maxZ,
  } = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const n of nodes) {
    if (
      typeof n.x !== 'number' ||
      typeof n.y !== 'number' ||
      typeof n.z !== 'number'
    )
      continue
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.z < minZ) minZ = n.z
    if (n.x > maxX) maxX = n.x
    if (n.y > maxY) maxY = n.y
    if (n.z > maxZ) maxZ = n.z
  }
  if (minX === Infinity) {
    minX = minY = minZ = maxX = maxY = maxZ = 0
  }
  // Output follows draw order ((-importance, key)): fully canonical, so the
  // layout is stable across calls and independent of payload node order.
  nodes.sort((a, b) => a.drawOrder - b.drawOrder)
  return {
    nodes,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
  }
}

/** Every consumed node has finite coordinates — otherwise fail loudly. */
export function assertComplete(layout: AtlasLayout): void {
  for (const node of layout.nodes) {
    if (
      typeof node.x !== 'number' ||
      typeof node.y !== 'number' ||
      typeof node.z !== 'number' ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !Number.isFinite(node.z)
    ) {
      throw new Error(`atlas layout: missing coordinate for node ${node.key}`)
    }
  }
}
