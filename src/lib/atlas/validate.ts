/** Runtime payload validator — defends the refresh path, never reshapes.
 *
 * Scope note: this is the client-side payload contract validator for the
 * runtime refresh path. The publish-gate validator (issue codes, DAG, locale
 * parity) is Plan A's `apps/atlas/validation.py` and must not be duplicated
 * here; the frontend only ever defends, never re-derives publish validity
 * (spec §20.3).
 */

import { ATLAS_CONTRACT_VERSION, type AtlasPayload } from './model'

export type AtlasRejection =
  | 'not-object'
  | 'unknown-contract'
  | 'nodes-not-array'
  | 'relations-not-array'
  | 'duplicate-key'
  | 'unknown-type'
  | 'unknown-overview-priority'
  | 'dangling-relation'
  | 'missing-coordinate'
  | 'non-finite-coordinate'
  | 'unknown-group-member'

export type AtlasValidationResult =
  { ok: true; payload: AtlasPayload } | { ok: false; reason: AtlasRejection }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Total, side-effect-free validation. On success returns the input payload
 * by identity (never a copy); on failure returns the first rejection reason.
 */
export function validateAtlasPayload(raw: unknown): AtlasValidationResult {
  if (!isRecord(raw)) return { ok: false, reason: 'not-object' }
  if (raw.contractVersion !== ATLAS_CONTRACT_VERSION) {
    return { ok: false, reason: 'unknown-contract' }
  }
  if (!Array.isArray(raw.nodes)) return { ok: false, reason: 'nodes-not-array' }
  if (!Array.isArray(raw.relations))
    return { ok: false, reason: 'relations-not-array' }

  const nodes = raw.nodes as unknown[]
  const relations = raw.relations as unknown[]

  // Duplicate keys across the whole topology (nodes + relations).
  const seen = new Set<string>()
  for (const entry of [...nodes, ...relations]) {
    if (!isRecord(entry) || typeof entry.key !== 'string') {
      return { ok: false, reason: 'duplicate-key' }
    }
    if (seen.has(entry.key)) return { ok: false, reason: 'duplicate-key' }
    seen.add(entry.key)
  }

  // Catalog references: every node type must be declared.
  const nodeTypes = Array.isArray(raw.nodeTypes)
    ? (raw.nodeTypes as unknown[])
    : []
  const knownTypes = new Set<string>()
  for (const t of nodeTypes) {
    if (isRecord(t) && typeof t.key === 'string') knownTypes.add(t.key)
  }
  for (const node of nodes) {
    if (
      !isRecord(node) ||
      typeof node.type !== 'string' ||
      !knownTypes.has(node.type)
    ) {
      return { ok: false, reason: 'unknown-type' }
    }
  }

  // Compact-overview grammar: exactly one field, three values (spec §10.3).
  for (const node of nodes) {
    if (!isRecord(node)) continue
    const priority = (node as { mobileOverviewPriority?: unknown })
      .mobileOverviewPriority
    if (
      priority !== 'auto' &&
      priority !== 'featured' &&
      priority !== 'hidden'
    ) {
      return { ok: false, reason: 'unknown-overview-priority' }
    }
  }

  // Relation endpoints must resolve to known nodes.
  const nodeKeys = new Set<string>()
  for (const node of nodes) {
    if (isRecord(node) && typeof node.key === 'string') nodeKeys.add(node.key)
  }
  for (const relation of relations) {
    if (!isRecord(relation)) return { ok: false, reason: 'dangling-relation' }
    const { source, target } = relation as {
      source?: unknown
      target?: unknown
    }
    if (typeof source !== 'string' || typeof target !== 'string') {
      return { ok: false, reason: 'dangling-relation' }
    }
    if (!nodeKeys.has(source) || !nodeKeys.has(target)) {
      return { ok: false, reason: 'dangling-relation' }
    }
  }

  // Coordinates: every node carries a finite x/y/z triple.
  for (const node of nodes) {
    if (!isRecord(node)) return { ok: false, reason: 'missing-coordinate' }
    const position = (node as { position?: unknown }).position
    if (!isRecord(position)) return { ok: false, reason: 'missing-coordinate' }
    const { x, y, z } = position as { x?: unknown; y?: unknown; z?: unknown }
    if (x === undefined || y === undefined || z === undefined) {
      return { ok: false, reason: 'missing-coordinate' }
    }
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
      return { ok: false, reason: 'non-finite-coordinate' }
    }
  }

  // Group integrity: every member key must resolve to a node.
  const groups = Array.isArray(raw.groups) ? (raw.groups as unknown[]) : []
  for (const group of groups) {
    if (!isRecord(group)) continue
    const members = (group as { nodeKeys?: unknown }).nodeKeys
    if (members === undefined) continue
    if (!Array.isArray(members))
      return { ok: false, reason: 'unknown-group-member' }
    for (const key of members) {
      if (typeof key !== 'string' || !nodeKeys.has(key)) {
        return { ok: false, reason: 'unknown-group-member' }
      }
    }
  }

  return { ok: true, payload: raw as unknown as AtlasPayload }
}
