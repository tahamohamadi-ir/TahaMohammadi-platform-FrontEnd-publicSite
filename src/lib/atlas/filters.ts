/** Type filters with dim-first membership (Plan C Task 10). Pure.
 *
 * Options derive from the payload: node types with `filterVisible`, never the
 * anchor type (`semanticRole === 'anchor'`). `filterSet` returns membership —
 * never a topology change; the payload is untouched.
 */
import type { AtlasPayload } from './model'

export interface AtlasFilterOption {
  key: string
  label: string
  count: number
}

function isAnchorType(type: { semanticRole?: string; key?: string }): boolean {
  return type.semanticRole === 'anchor' || type.key === 'identity'
}

export function filterOptions(payload: AtlasPayload): AtlasFilterOption[] {
  const counts = new Map<string, number>()
  for (const node of payload.nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1)
  }
  return payload.nodeTypes
    .filter((t) => t.filterVisible && !isAnchorType(t))
    .map((t) => ({ key: t.key, label: t.label, count: counts.get(t.key) ?? 0 }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
}

export function filterSet(
  payload: AtlasPayload,
  filterKey: string,
): Set<string> {
  const members = new Set<string>()
  for (const node of payload.nodes) {
    if (node.type === filterKey) members.add(node.key)
  }
  return members
}
