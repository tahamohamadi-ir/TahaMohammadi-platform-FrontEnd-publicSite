/**
 * RU-01 — Deterministic hierarchy classification.
 *
 * The published graph payload carries no `groups`, no parent links and no
 * explicit level (the backend schema says so itself: "nodes + edges, no groups
 * in phase 1" — and `contracts/design-authority/v2-overlay.json` pins
 * `groupsFieldExists: false`). So hierarchy is *derived*, never invented:
 *
 * 1. `type-map` — the published `type` string maps to a known kind and level
 *    (this is what today's payload uses: `identity` + `research-topic`).
 * 2. `distance-derived` — an unmapped type gets its level from its graph
 *    distance to the anchor, so an unfamiliar published type still renders in a
 *    sensible place instead of being dropped or hard-coded.
 *
 * Everything here is pure, locale-independent and deterministic: the same
 * payload always yields the same kinds, levels and order.
 */

import type {
  UniverseAnchor,
  UniverseClassification,
  UniverseLevel,
  UniverseNode,
  UniverseEdge,
  UniverseLevelCounts,
} from './model'
import { countLevels } from './model'

export interface ClassifiedType {
  kind: UniverseNode['kind']
  level: UniverseLevel
  classification: UniverseClassification
}

/**
 * Published type vocabulary → presentation kind. Keys are normalized (see
 * `normalizeNodeType`), so `research-topic`, `research_topic` and
 * `researchtopic` all resolve identically — the live payload uses the hyphenated
 * form while the resolver family map uses the joined form.
 */
const KIND_BY_TYPE: Readonly<Record<string, ClassifiedType>> = {
  // Anchor / identity.
  identity: { kind: 'person', level: 0, classification: 'type-map' },
  person: { kind: 'person', level: 0, classification: 'type-map' },
  profile: { kind: 'person', level: 0, classification: 'type-map' },
  // Main research domains.
  'research-topic': { kind: 'domain', level: 1, classification: 'type-map' },
  'research-statement': {
    kind: 'domain',
    level: 1,
    classification: 'type-map',
  },
  'research-axis': { kind: 'domain', level: 1, classification: 'type-map' },
  domain: { kind: 'domain', level: 1, classification: 'type-map' },
  // Subdomains.
  subdomain: { kind: 'subdomain', level: 2, classification: 'type-map' },
  'sub-domain': { kind: 'subdomain', level: 2, classification: 'type-map' },
  'research-subtopic': {
    kind: 'subdomain',
    level: 2,
    classification: 'type-map',
  },
  // Level-3 outputs.
  project: { kind: 'project', level: 3, classification: 'type-map' },
  publication: { kind: 'publication', level: 3, classification: 'type-map' },
  book: { kind: 'publication', level: 3, classification: 'type-map' },
  article: { kind: 'publication', level: 3, classification: 'type-map' },
  series: { kind: 'publication', level: 3, classification: 'type-map' },
  talk: { kind: 'publication', level: 3, classification: 'type-map' },
  tool: { kind: 'tool', level: 3, classification: 'type-map' },
  download: { kind: 'tool', level: 3, classification: 'type-map' },
  resource: { kind: 'tool', level: 3, classification: 'type-map' },
  course: { kind: 'tool', level: 3, classification: 'type-map' },
  lesson: { kind: 'tool', level: 3, classification: 'type-map' },
  creativework: { kind: 'other', level: 3, classification: 'type-map' },
  collection: { kind: 'other', level: 3, classification: 'type-map' },
  landing: { kind: 'other', level: 1, classification: 'type-map' },
}

/** Lowercase, trim, collapse separators. Never throws on odd published input. */
export function normalizeNodeType(type: unknown): string {
  if (typeof type !== 'string') return ''
  return type
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Joined-spelling index (`researchtopic` → `research-topic`).
 *
 * The published vocabulary genuinely uses BOTH forms: the live graph emits the
 * hyphenated `research-topic`, while the backend's resolver families and the
 * CA-02 contract fixture use the joined `researchtopic`. Building this index from
 * the table above keeps one source of truth, so the two spellings can never drift
 * apart (a hard-coded second row is exactly how that drift starts).
 */
const JOINED_KIND_INDEX: Readonly<Record<string, ClassifiedType>> =
  Object.fromEntries(
    Object.entries(KIND_BY_TYPE)
      .filter(([key]) => key.includes('-'))
      .map(([key, value]) => [key.replace(/-/g, ''), value]),
  )

/** Map one published type; unknown types are `other` pending a distance level. */
export function classifyNodeType(type: unknown): ClassifiedType {
  const normalized = normalizeNodeType(type)
  const mapped =
    KIND_BY_TYPE[normalized] ?? JOINED_KIND_INDEX[normalized.replace(/-/g, '')]
  if (mapped) return mapped
  return { kind: 'other', level: 1, classification: 'type-derived' }
}

/**
 * Anchor resolution. Preference order is strictly fact-first:
 * 1. the published node whose type maps to `person`;
 * 2. otherwise the supplied site-profile facts (label + about href) with
 *    `id: null`, so the core is presentation-only and owns no graph identity.
 */
export function resolveUniverseAnchor(
  nodes: ReadonlyArray<Pick<UniverseNode, 'id' | 'label' | 'type'>>,
  profileFallback: { label: string; href: string | null } | null,
): UniverseAnchor | null {
  const identity = nodes.find(
    (node) => classifyNodeType(node.type).kind === 'person',
  )
  if (identity) {
    return {
      id: identity.id,
      label: identity.label,
      accessibleLabel: identity.label,
      href: null,
      source: 'graph-identity-node',
    }
  }
  if (profileFallback && profileFallback.label.trim()) {
    return {
      id: null,
      label: profileFallback.label,
      accessibleLabel: profileFallback.label,
      href: profileFallback.href,
      source: 'site-profile',
    }
  }
  return null
}

export interface UniverseHierarchy {
  levels: Map<string, UniverseLevel>
  kinds: Map<string, UniverseNode['kind']>
  classifications: Map<string, UniverseClassification>
  anchor: UniverseAnchor | null
  /** Highest level actually present, so presets can stop looking for absent ones. */
  maxLevel: UniverseLevel
  counts: UniverseLevelCounts
}

/**
 * Breadth-first distances for nodes whose level cannot come from their type.
 * Bounded (one pass per node, no recursion) and NaN-safe: unreachable nodes keep
 * the level their type implied rather than becoming level 0.
 */
function deriveLevelsByDistance(
  ids: ReadonlyArray<string>,
  edges: ReadonlyArray<Pick<UniverseEdge, 'source' | 'target'>>,
  sourceId: string | null,
): Map<string, UniverseLevel> {
  const adjacency = new Map<string, string[]>()
  for (const id of ids) adjacency.set(id, [])
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    adjacency.get(edge.target)?.push(edge.source)
  }

  const distances = new Map<string, number>()
  if (sourceId == null || !adjacency.has(sourceId)) return new Map()
  distances.set(sourceId, 0)
  let frontier = [sourceId]
  while (frontier.length > 0) {
    const next: string[] = []
    for (const current of frontier) {
      const distance = distances.get(current) ?? 0
      for (const neighbour of adjacency.get(current) ?? []) {
        if (distances.has(neighbour)) continue
        distances.set(neighbour, distance + 1)
        next.push(neighbour)
      }
    }
    frontier = next
  }

  const levels = new Map<string, UniverseLevel>()
  for (const [id, distance] of distances) {
    if (distance === 0) levels.set(id, 0)
    else if (distance === 1) levels.set(id, 1)
    else if (distance === 2) levels.set(id, 2)
    else levels.set(id, 3)
  }
  return levels
}

/**
 * Assign kinds/levels for every node. Type-mapped levels always win; only
 * `other`/unmapped nodes take a distance-derived level, and only when the
 * distance is actually known.
 */
export function buildUniverseHierarchy(
  nodes: ReadonlyArray<Pick<UniverseNode, 'id' | 'label' | 'type'>>,
  edges: ReadonlyArray<Pick<UniverseEdge, 'source' | 'target'>>,
  profileFallback: { label: string; href: string | null } | null = null,
): UniverseHierarchy {
  const anchor = resolveUniverseAnchor(nodes, profileFallback)
  const anchorId = anchor?.id ?? null

  const classified = nodes.map((node) => ({
    id: node.id,
    ...classifyNodeType(node.type),
  }))

  const needsDistance = classified.some(
    (entry) => entry.classification === 'type-derived',
  )
  const distanceLevels = needsDistance
    ? deriveLevelsByDistance(
        nodes.map((node) => node.id),
        edges,
        anchorId,
      )
    : new Map<string, UniverseLevel>()

  const levels = new Map<string, UniverseLevel>()
  const kinds = new Map<string, UniverseNode['kind']>()
  const classifications = new Map<string, UniverseClassification>()
  for (const entry of classified) {
    const derived = distanceLevels.get(entry.id)
    const useDistance =
      entry.classification === 'type-derived' && derived != null
    levels.set(entry.id, useDistance ? (derived as UniverseLevel) : entry.level)
    kinds.set(entry.id, entry.kind)
    classifications.set(
      entry.id,
      useDistance ? 'distance-derived' : entry.classification,
    )
  }

  const ordered = nodes.map((node) => ({ level: levels.get(node.id) ?? 1 }))
  let maxLevel: UniverseLevel = 0
  for (const entry of ordered) {
    if (entry.level > maxLevel) maxLevel = entry.level
  }

  return {
    levels,
    kinds,
    classifications,
    anchor,
    maxLevel,
    counts: countLevels(ordered),
  }
}
