/**
 * RU-01 — Research Universe model (renderer-facing).
 *
 * ONE shared semantic model with TWO presentations: the guided, scroll-driven
 * Home hero and the fully interactive About experience. Both presentations
 * consume exactly these types, so a fact can never exist in one and be missing
 * from the other.
 *
 * Data authority: the universe is always adapted from the existing published
 * graph (`GET /api/graph/{locale}` via `lib/hero-graph-content.ts`). Nothing in
 * this module invents research records: it only *classifies* published nodes
 * into presentation kinds and hierarchy levels.
 *
 * The central "Taha Mohammadi" object is a PRESENTATION ANCHOR resolved from the
 * published `identity` node (or, when a payload has no identity node, from the
 * site profile); it is not an invented research record.
 */

export const UNIVERSE_MODEL_VERSION = 'ru01-1.0.0'

/**
 * Presentation kinds. The full vocabulary is defined up front so a richer
 * published graph needs no renderer change; today's published payload only ever
 * produces `person` and `domain`.
 */
export type UniverseNodeKind =
  | 'person'
  | 'domain'
  | 'subdomain'
  | 'project'
  | 'publication'
  | 'tool'
  | 'other'

/** 0 = anchor, 1 = main domain, 2 = subdomain, 3 = project/publication/tool. */
export type UniverseLevel = 0 | 1 | 2 | 3

/** How a kind/level was decided, so the report can separate fact from mapping. */
export type UniverseClassification =
  'type-map' | 'type-derived' | 'distance-derived'

export interface UniverseNode {
  id: string
  label: string
  accessibleLabel: string
  /** Published node type, unchanged. */
  type: string
  kind: UniverseNodeKind
  level: UniverseLevel
  classification: UniverseClassification
  weight: number
  summary: string | null
  colorRole: string
  iconRole: string
  /** Published/derived layout, unchanged from the semantic adapter. */
  x: number
  y: number
  z: number
  layoutSource: 'api' | 'derived'
  /** Resolver-verified related records only (never guessed hrefs). */
  related: ReadonlyArray<{ family: string; id: string; href: string }>
}

export interface UniverseEdge {
  id: string
  source: string
  target: string
  relationType: string
  weight: number
  directed: boolean
  /** Published explanation only; never authored by the renderer. */
  explanation: string | null
}

export interface UniverseLevelCounts {
  level0: number
  level1: number
  level2: number
  level3: number
}

/**
 * The central object. When the published payload carries an identity/person
 * node, the anchor IS that published node (its label and its resolver-verified
 * profile link). When it does not, the anchor is a presentation-only core built
 * from existing site profile facts supplied by the page — never an invented
 * research record, and never a second source of truth for the graph.
 */
export interface UniverseAnchor {
  /** Published node id, or `null` for a presentation-only anchor. */
  id: string | null
  label: string
  accessibleLabel: string
  href: string | null
  source: 'graph-identity-node' | 'site-profile'
}

export type UniverseModel =
  | {
      status: 'ready'
      locale: 'fa' | 'en'
      contractVersion: typeof UNIVERSE_MODEL_VERSION
      /** Where the facts came from; `synthetic-fixture` never ships publicly. */
      source: 'published' | 'synthetic-fixture'
      anchor: UniverseAnchor
      nodes: UniverseNode[]
      edges: UniverseEdge[]
      levelCounts: UniverseLevelCounts
      warnings: string[]
    }
  | { status: 'empty'; locale: 'fa' | 'en'; warnings: string[] }
  | { status: 'error'; locale: 'fa' | 'en'; issues: string[] }
  | { status: 'unavailable'; locale: 'fa' | 'en' }

export type ReadyUniverse = Extract<UniverseModel, { status: 'ready' }>

/**
 * What the client renderer needs to build the scene. It is a strict projection of
 * the ready universe — the same facts the server rendered, in the same shape — so
 * a node can never be drawn from a different value than the HTML it labels.
 *
 * Positions travel with the payload because the layout derives each node's
 * azimuth from its published position: without them the scene would silently fall
 * back to a derived placement and stop honouring authoring intent.
 */
export interface UniverseRendererNode {
  id: string
  label: string
  kind: UniverseNodeKind
  level: UniverseLevel
  weight: number
  colorRole: string
  x: number
  y: number
  z: number
  layoutSource: 'api' | 'derived'
}

export interface UniverseRendererEdge {
  id: string
  source: string
  target: string
  relationType: string
  directed: boolean
  weight: number
}

export interface UniverseRendererPayload {
  contractVersion: typeof UNIVERSE_MODEL_VERSION
  locale: 'fa' | 'en'
  anchor: UniverseAnchor
  nodes: UniverseRendererNode[]
  edges: UniverseRendererEdge[]
}

/**
 * Project a ready universe (or a preset of it) into its renderer payload. Never
 * adds a fact: labels, kinds, levels and published positions are passed through.
 */
export function toUniverseRendererPayload(
  universe: Pick<ReadyUniverse, 'locale' | 'anchor' | 'nodes' | 'edges'>,
): UniverseRendererPayload {
  return {
    contractVersion: UNIVERSE_MODEL_VERSION,
    locale: universe.locale,
    anchor: universe.anchor,
    nodes: universe.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      level: node.level,
      weight: node.weight,
      colorRole: node.colorRole,
      x: node.x,
      y: node.y,
      z: node.z,
      layoutSource: node.layoutSource,
    })),
    edges: universe.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationType: edge.relationType,
      directed: edge.directed,
      weight: edge.weight,
    })),
  }
}

export function isReadyUniverse(model: UniverseModel): model is ReadyUniverse {
  return model.status === 'ready'
}

export function countLevels(
  nodes: ReadonlyArray<{ level: UniverseLevel }>,
): UniverseLevelCounts {
  const counts: UniverseLevelCounts = {
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
  }
  for (const node of nodes) {
    if (node.level === 0) counts.level0 += 1
    else if (node.level === 1) counts.level1 += 1
    else if (node.level === 2) counts.level2 += 1
    else counts.level3 += 1
  }
  return counts
}

/**
 * Integrity guard shared by both presets and by the scene builder: a universe
 * with an edge that points at a missing node is malformed and must be rejected
 * instead of rendered as a dangling curve.
 */
export function findDanglingEdges(
  nodes: ReadonlyArray<{ id: string }>,
  edges: ReadonlyArray<{ id: string; source: string; target: string }>,
): string[] {
  const ids = new Set(nodes.map((node) => node.id))
  const dangling: string[] = []
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) dangling.push(edge.id)
  }
  return dangling
}

/**
 * Presentation order. Deterministic and locale-independent: API/payload order
 * wins first (authoring intent), then weight, then id, so the same published
 * graph always produces the same scene.
 */
export function compareUniverseNodes(
  a: Pick<UniverseNode, 'weight' | 'id'>,
  b: Pick<UniverseNode, 'weight' | 'id'>,
  indexOf: (id: string) => number,
): number {
  const weightDelta = (b.weight ?? 0) - (a.weight ?? 0)
  if (weightDelta !== 0) return weightDelta
  const indexDelta = indexOf(a.id) - indexOf(b.id)
  if (indexDelta !== 0) return indexDelta
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}
