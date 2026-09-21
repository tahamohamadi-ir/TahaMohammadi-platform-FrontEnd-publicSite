/** Pure 2D projection model (Plan C Task 13).
 *
 * Affine fit of the consumed layout into a viewport box: node set selection
 * (overview bands with featured-first ordering, hidden excluded, anchor
 * always included), uniform scale + translate, straight edge paths, label
 * offsets. Deterministic for the same input and viewport. Never fabricates
 * filler — a graph smaller than the band keeps exactly its visible nodes.
 */
import type { AtlasNodeOut, AtlasPayload } from './model'
import { radiusFor, resolveLayout } from './layout'

export type Projection2dMode =
  'mobile-overview' | 'webgl-fallback' | 'about-preview'

export interface Viewport2d {
  width: number
  height: number
}

export interface ProjectedNode2d {
  key: string
  cx: number
  cy: number
  r: number
  tier: string
  labelOffset: { dx: number; dy: number }
}

export interface ProjectedEdge2d {
  key: string
  path: string
}

export interface Projection2d {
  viewBox: string
  nodes: ProjectedNode2d[]
  edges: ProjectedEdge2d[]
  transform: { scale: number; tx: number; ty: number }
}

const MOBILE_MIN = 8
const MOBILE_MAX = 15
const ABOUT_MAX = 10

function anchorKey(payload: AtlasPayload): string | null {
  const anchorType = new Set(
    payload.nodeTypes
      .filter((t) => t.semanticRole === 'anchor')
      .map((t) => t.key),
  )
  const anchor =
    payload.nodes.find((n) => anchorType.has(n.type)) ??
    [...payload.nodes].sort((a, b) => b.importance - a.importance)[0]
  return anchor ? anchor.key : null
}

const byImportanceKey = (a: AtlasNodeOut, b: AtlasNodeOut) =>
  a.importance === b.importance
    ? a.key < b.key
      ? -1
      : 1
    : b.importance - a.importance

function band(
  nodes: AtlasNodeOut[],
  cap: number,
  anchor: string | null,
): AtlasNodeOut[] {
  const eligible = nodes.filter((n) => n.mobileOverviewPriority !== 'hidden')
  const featured = eligible
    .filter((n) => n.mobileOverviewPriority === 'featured')
    .sort(byImportanceKey)
  const rest = eligible
    .filter((n) => n.mobileOverviewPriority !== 'featured')
    .sort(byImportanceKey)
  const picked: AtlasNodeOut[] = []
  const seen = new Set<string>()
  for (const node of [...featured, ...rest]) {
    if (picked.length >= cap) break
    if (seen.has(node.key)) continue
    seen.add(node.key)
    picked.push(node)
  }
  if (anchor && !seen.has(anchor)) {
    const anchorNode = nodes.find((n) => n.key === anchor)
    if (anchorNode && anchorNode.mobileOverviewPriority !== 'hidden') {
      if (picked.length >= cap) picked.pop()
      picked.unshift(anchorNode)
    }
  }
  return picked
}

/** Overview node selection for a mode. WebGL fallback shows every visible node. */
export function selectOverviewNodes(
  payload: AtlasPayload,
  options: { mode: 'mobile-overview' | 'about-preview' },
): AtlasNodeOut[]
export function selectOverviewNodes(payload: AtlasPayload): AtlasNodeOut[]
export function selectOverviewNodes(
  payload: AtlasPayload,
  options: { mode?: Projection2dMode } = {},
): AtlasNodeOut[] {
  const mode = options.mode ?? 'mobile-overview'
  if (mode === 'webgl-fallback') return [...payload.nodes]
  const cap = mode === 'about-preview' ? ABOUT_MAX : MOBILE_MAX
  const picked = band(payload.nodes, cap, anchorKey(payload))
  if (
    mode === 'mobile-overview' &&
    picked.length < Math.min(MOBILE_MIN, payload.nodes.length)
  ) {
    return band(
      payload.nodes,
      Math.min(MOBILE_MIN, payload.nodes.length),
      anchorKey(payload),
    )
  }
  return picked
}

export function project2d(
  payload: AtlasPayload,
  options: {
    mode: Projection2dMode
    viewport: Viewport2d
    focusKey: string | null
  },
): Projection2d {
  const { mode, viewport, focusKey } = options
  const { width, height } = viewport
  let selected =
    mode === 'webgl-fallback'
      ? [...payload.nodes]
      : selectOverviewNodes(payload, { mode })
  if (selected.length === 0) {
    return {
      viewBox: `0 0 ${width} ${height}`,
      nodes: [],
      edges: [],
      transform: { scale: 1, tx: 0, ty: 0 },
    }
  }
  if (focusKey) {
    const focused = payload.nodes.find((n) => n.key === focusKey)
    if (focused && !selected.some((n) => n.key === focusKey)) {
      selected = [...selected, focused]
    }
  }

  const layout = resolveLayout(payload)
  const coord = new Map(layout.nodes.map((n) => [n.key, n]))
  const pad = 24
  const xs = selected.map((n) => coord.get(n.key)?.x ?? 0)
  const ys = selected.map((n) => coord.get(n.key)?.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1e-6)
  const spanY = Math.max(maxY - minY, 1e-6)
  const maxRadius = Math.max(...selected.map((n) => radiusFor(n)), 1e-6)
  const scale = Math.min(
    (width - 2 * pad) / spanX,
    (height - 2 * pad) / spanY,
    pad / maxRadius,
  )
  const tx = pad + (width - 2 * pad - spanX * scale) / 2 - minX * scale
  const ty = pad + (height - 2 * pad - spanY * scale) / 2 - minY * scale

  const nodes: ProjectedNode2d[] = selected.map((node) => {
    const c = coord.get(node.key)
    const cx = (c?.x ?? 0) * scale + tx
    const cy = (c?.y ?? 0) * scale + ty
    const r = Math.max(radiusFor(node) * scale, 2)
    return {
      key: node.key,
      cx: Math.round(cx * 100) / 100,
      cy: Math.round(cy * 100) / 100,
      r: Math.round(r * 100) / 100,
      tier: node.importance >= 80 ? 'primary' : 'fine',
      labelOffset: { dx: 0, dy: -(Math.round(r * 100) / 100 + 4) },
    }
  })
  const placed = new Map(nodes.map((n) => [n.key, n]))
  const edges: ProjectedEdge2d[] = []
  for (const relation of payload.relations) {
    const a = placed.get(relation.source)
    const b = placed.get(relation.target)
    if (!a || !b) continue
    edges.push({
      key: relation.key,
      path: `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy}`,
    })
  }

  return {
    viewBox: `0 0 ${width} ${height}`,
    nodes,
    edges,
    transform: {
      scale: Math.round(scale * 1e6) / 1e6,
      tx: Math.round(tx * 100) / 100,
      ty: Math.round(ty * 100) / 100,
    },
  }
}
