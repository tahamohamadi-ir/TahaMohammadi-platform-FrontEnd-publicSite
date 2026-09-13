/**
 * RU-01 — Home preset: the guided subset.
 *
 * Home is GUIDED, not free-control, so it deliberately shows a subset: the
 * presentation anchor plus the main research domains, and only the published
 * relationships among those selected nodes.
 *
 * Two rules this module exists to enforce:
 * - Nothing is invented. A node or edge appears only because the published graph
 *   contains it; the preset only *filters*.
 * - Nothing is silently dropped. Every excluded published node is reported in
 *   `excluded` with its reason, and a Home that excludes level-3 outputs says so
 *   in `notes` rather than pretending the publication has fewer records.
 */

import {
  compareUniverseNodes,
  isReadyUniverse,
  type ReadyUniverse,
  type UniverseEdge,
  type UniverseModel,
  type UniverseNode,
} from './model'

/** Home shows the anchor plus at most this many main domains. */
export const HOME_MAX_DOMAINS = 6

export interface UniversePreset {
  status: ReadyUniverse['status']
  locale: ReadyUniverse['locale']
  anchor: ReadyUniverse['anchor']
  nodes: UniverseNode[]
  edges: UniverseEdge[]
  /** Published nodes intentionally not shown, with the reason. */
  excluded: Array<{
    id: string
    reason: 'not-main-domain' | 'over-domain-limit'
  }>
  notes: string[]
}

function indexOfFactory(
  nodes: ReadonlyArray<{ id: string }>,
): (id: string) => number {
  const order = new Map<string, number>()
  nodes.forEach((node, index) => order.set(node.id, index))
  return (id) => order.get(id) ?? Number.MAX_SAFE_INTEGER
}

/**
 * Subset for Home. Selection is deterministic: level-0 anchors always, then
 * level-1 domains ordered by published weight (then payload order, then id).
 * Level-2/3 records are excluded by design, and only edges whose BOTH endpoints
 * survived the filter are kept — the scene can never draw a link to a node it is
 * not showing.
 */
export function selectHomeUniverse(
  model: UniverseModel,
): UniversePreset | null {
  if (!isReadyUniverse(model)) return null

  const indexOf = indexOfFactory(model.nodes)
  const anchors = model.nodes.filter((node) => node.level === 0)
  const domains = model.nodes
    .filter((node) => node.level === 1)
    .sort((a, b) => compareUniverseNodes(a, b, indexOf))
  const selectedDomains = domains.slice(0, HOME_MAX_DOMAINS)

  const selected = new Set<string>([
    ...anchors.map((node) => node.id),
    ...selectedDomains.map((node) => node.id),
  ])

  const excluded: UniversePreset['excluded'] = []
  for (const node of model.nodes) {
    if (selected.has(node.id)) continue
    excluded.push({
      id: node.id,
      reason: node.level === 1 ? 'over-domain-limit' : 'not-main-domain',
    })
  }

  const edges = model.edges.filter(
    (edge) => selected.has(edge.source) && selected.has(edge.target),
  )

  const notes: string[] = []
  if (domains.length > selectedDomains.length) {
    notes.push('domains-truncated-to-home-budget')
  }
  if (excluded.some((entry) => entry.reason === 'not-main-domain')) {
    notes.push('level-2-3-records-excluded-on-home-by-design')
  }
  if (domains.length === 0) notes.push('no-main-domains-published')

  return {
    status: 'ready',
    locale: model.locale,
    anchor: model.anchor,
    // Deliberate presentation order: the anchor(s) in payload order, then the
    // main domains in the computed (weight-descending) order. Filtering alone
    // would return payload order, which is not the order Home narrates.
    nodes: [...anchors, ...selectedDomains],
    edges,
    excluded,
    notes,
  }
}
