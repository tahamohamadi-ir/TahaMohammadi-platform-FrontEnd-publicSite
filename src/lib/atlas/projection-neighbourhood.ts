/** Neighbourhood view over the 2D projection (Plan C Task 20). Pure.
 *
 * The neighbourhood of a node is exactly: the node itself, its parents, its
 * children and its direct neighbours (every `neighborhoodOf` key). Relations
 * are drawn when both endpoints are in the set. Nothing here changes
 * topology: the payload is read, never mutated.
 */
import type { AtlasNodeOut, AtlasPayload } from './model'
import { neighborhoodOf } from './neighborhood'
import {
  project2d,
  selectOverviewNodes,
  type Viewport2d,
} from './projection-2d'

/** The 2D projectable node set for a focus: null when no neighbourhood view. */
export function neighbourhoodKeys(
  payload: AtlasPayload,
  focusKey: string,
): AtlasNodeOut[] | null {
  const focus = payload.nodes.find((n) => n.key === focusKey)
  if (!focus) return null
  const hood = neighborhoodOf(payload, focusKey)
  const keys = new Set<string>([
    focusKey,
    ...hood.parents,
    ...hood.children,
    ...Object.values(hood.byType).flat(),
  ])
  const byKey = new Map(payload.nodes.map((n) => [n.key, n]))
  // Deterministic ((-importance, key)) order — never payload order.
  return [...keys]
    .map((key) => byKey.get(key))
    .filter((node): node is AtlasNodeOut => node != null)
    .sort((a, b) =>
      a.importance === b.importance
        ? a.key < b.key
          ? -1
          : 1
        : b.importance - a.importance,
    )
}

/** Project an explicit node set with the shared affine rules. */
export function projectNodesForKeys(
  payload: AtlasPayload,
  selected: AtlasNodeOut[],
  focusKey: string | null,
  viewport: Viewport2d,
) {
  if (selected.length === 0) {
    return {
      viewBox: `0 0 ${viewport.width} ${viewport.height}`,
      nodes: [],
      edges: [],
      transform: { scale: 1, tx: 0, ty: 0 },
    }
  }
  return project2d(payload, {
    mode: 'neighbourhood',
    viewport,
    focusKey: null,
    explicitNodes: selected,
  })
}

/** Overview node keys for a viewport (the `Back to overview` target). */
export function overviewKeys(payload: AtlasPayload): string[] {
  return selectOverviewNodes(payload, { mode: 'mobile-overview' }).map(
    (n) => n.key,
  )
}
