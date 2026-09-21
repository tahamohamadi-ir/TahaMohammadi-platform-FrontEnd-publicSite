/** Pure SVG-ready projection of the stored Atlas layout. */

import { assertComplete, resolveLayout } from './layout'
import type { AtlasNodeOut, AtlasPayload } from './model'
import { neighborhoodOf } from './neighborhood'

export type Projection2dMode =
  'mobile-overview' | 'webgl-fallback' | 'about-preview'
export type Projection2dViewMode = 'overview' | 'neighborhood'

export interface Projection2dViewport {
  width: number
  height: number
}

export interface ProjectedNode2d {
  key: string
  cx: number
  cy: number
  r: number
  tier: 'primary' | 'fine'
  labelOffset: { dx: number; dy: number }
}

export interface ProjectedEdge2d {
  key: string
  path: string
}

export interface Projection2dTransform {
  scale: number
  tx: number
  ty: number
}

export interface Projection2dResult {
  viewBox: string
  nodes: ProjectedNode2d[]
  edges: ProjectedEdge2d[]
  transform: Projection2dTransform
}

const MOBILE_OVERVIEW_CAP = 15
const ABOUT_PREVIEW_CAP = 10

function compareKey(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function compareOverviewPriority(
  left: AtlasNodeOut,
  right: AtlasNodeOut,
): number {
  const leftFeatured = left.mobileOverviewPriority === 'featured'
  const rightFeatured = right.mobileOverviewPriority === 'featured'
  if (leftFeatured !== rightFeatured) return leftFeatured ? -1 : 1
  return right.importance - left.importance || compareKey(left.key, right.key)
}

function anchorTypeKeys(payload: AtlasPayload): ReadonlySet<string> {
  return new Set(
    payload.nodeTypes
      .filter(
        (type) =>
          type.key === 'identity' ||
          type.key === 'anchor' ||
          type.semanticRole === 'identity' ||
          type.semanticRole === 'anchor' ||
          type.visualRole === 'identity' ||
          type.visualRole === 'anchor',
      )
      .map((type) => type.key),
  )
}

function isAnchor(
  node: AtlasNodeOut,
  anchorTypes: ReadonlySet<string>,
): boolean {
  return (
    node.type === 'identity' ||
    node.type === 'anchor' ||
    anchorTypes.has(node.type)
  )
}

/**
 * Select the bounded overview set without synthesizing nodes. Hidden nodes are
 * omitted; featured nodes rank first, then all remaining nodes by
 * (-importance, key). Identity/anchor nodes are retained within the cap.
 */
export function selectOverviewNodes(
  payload: AtlasPayload,
  options: { mode: Projection2dMode },
): AtlasNodeOut[] {
  if (options.mode === 'webgl-fallback') return [...payload.nodes]

  const cap =
    options.mode === 'about-preview' ? ABOUT_PREVIEW_CAP : MOBILE_OVERVIEW_CAP
  const visible = payload.nodes
    .filter((node) => node.mobileOverviewPriority !== 'hidden')
    .sort(compareOverviewPriority)
  if (visible.length <= cap) return visible

  const selected = visible.slice(0, cap)
  const selectedKeys = new Set(selected.map((node) => node.key))
  const anchors = visible.filter((node) =>
    isAnchor(node, anchorTypeKeys(payload)),
  )
  for (const anchor of anchors) {
    if (selectedKeys.has(anchor.key)) continue
    const displaced = selected.pop()
    if (displaced) selectedKeys.delete(displaced.key)
    selected.push(anchor)
    selectedKeys.add(anchor.key)
  }
  return selected.sort(compareOverviewPriority)
}

/**
 * Return the focused node and only its direct hierarchy and relation
 * neighbours. The payload and its topology are read-only; no node or relation
 * is synthesized, removed, or rewritten.
 */
export function selectNeighborhoodNodes(
  payload: AtlasPayload,
  focusKey: string,
): AtlasNodeOut[] {
  if (!payload.nodes.some((node) => node.key === focusKey)) return []

  const neighborhood = neighborhoodOf(payload, focusKey)
  const keys = new Set<string>([
    focusKey,
    ...neighborhood.parents,
    ...neighborhood.children,
    ...neighborhood.incoming.map((link) => link.nodeKey),
    ...neighborhood.outgoing.map((link) => link.nodeKey),
  ])
  return payload.nodes.filter((node) => keys.has(node.key))
}

function assertViewport(viewport: Projection2dViewport): void {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError(
      'projection viewport must have positive finite dimensions',
    )
  }
}

/**
 * Uniformly fit selected stored coordinates into the viewport. Bounds include
 * each circle's layout radius, so projected circles remain inside the viewBox.
 */
export function project2d(
  payload: AtlasPayload,
  options: {
    mode: Projection2dMode
    viewport: Projection2dViewport
    focusKey?: string | null
    viewMode?: Projection2dViewMode
  },
): Projection2dResult {
  assertViewport(options.viewport)
  const { width, height } = options.viewport
  const viewBox = `0 0 ${width} ${height}`
  const selected =
    options.viewMode === 'neighborhood' && options.focusKey
      ? selectNeighborhoodNodes(payload, options.focusKey)
      : selectOverviewNodes(payload, { mode: options.mode })
  if (selected.length === 0) {
    return {
      viewBox,
      nodes: [],
      edges: [],
      transform: { scale: 1, tx: 0, ty: 0 },
    }
  }

  const layout = resolveLayout(payload)
  assertComplete(layout)
  const selectedKeys = new Set(selected.map((node) => node.key))
  const layoutNodes = layout.nodes
    .filter((node) => selectedKeys.has(node.key))
    .sort(
      (left, right) =>
        left.drawOrder - right.drawOrder || compareKey(left.key, right.key),
    )

  const minX = Math.min(...layoutNodes.map((node) => node.x - node.radius))
  const maxX = Math.max(...layoutNodes.map((node) => node.x + node.radius))
  const minY = Math.min(...layoutNodes.map((node) => node.y - node.radius))
  const maxY = Math.max(...layoutNodes.map((node) => node.y + node.radius))
  const padding = Math.min(24, width * 0.05, height * 0.05)
  const availableWidth = Math.max(width - 2 * padding, 0)
  const availableHeight = Math.max(height - 2 * padding, 0)
  const scale = Math.min(
    availableWidth / Math.max(maxX - minX, Number.EPSILON),
    availableHeight / Math.max(maxY - minY, Number.EPSILON),
  )
  const tx = (width - (minX + maxX) * scale) / 2
  const ty = (height - (minY + maxY) * scale) / 2

  const nodes = layoutNodes.map((node) => {
    const r = node.radius * scale
    return {
      key: node.key,
      cx: node.x * scale + tx,
      cy: node.y * scale + ty,
      r,
      tier: node.tier,
      labelOffset: { dx: 0, dy: -(r + 4) },
    }
  })
  const projectedByKey = new Map(nodes.map((node) => [node.key, node]))
  const edges = [...payload.relations]
    .sort((left, right) => compareKey(left.key, right.key))
    .flatMap((relation): ProjectedEdge2d[] => {
      const source = projectedByKey.get(relation.source)
      const target = projectedByKey.get(relation.target)
      if (!source || !target) return []
      return [
        {
          key: relation.key,
          path: `M ${source.cx} ${source.cy} L ${target.cx} ${target.cy}`,
        },
      ]
    })

  return {
    viewBox,
    nodes,
    edges,
    transform: { scale, tx, ty },
  }
}
