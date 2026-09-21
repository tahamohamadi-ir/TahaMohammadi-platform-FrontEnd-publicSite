/** One-hop neighbourhood sets (Plan C Task 10). Pure and cycle-safe.
 *
 * Parents/children follow `hierarchy` edges only; incoming/outgoing cover
 * every directed edge. One hop, no traversal — cycles terminate by
 * construction. All sets sort by key for deterministic output.
 */
import type { AtlasPayload } from './model'

export interface AtlasNeighborhood {
  parents: string[]
  children: string[]
  incoming: string[]
  outgoing: string[]
  byType: Record<string, string[]>
}

const byKey = (a: string, b: string) => (a < b ? -1 : 1)

export function neighborhoodOf(
  payload: AtlasPayload,
  nodeKey: string,
): AtlasNeighborhood {
  const parents = new Set<string>()
  const children = new Set<string>()
  const incoming = new Set<string>()
  const outgoing = new Set<string>()
  const neighbourKeys = new Set<string>()

  for (const relation of payload.relations) {
    if (relation.target === nodeKey) {
      incoming.add(relation.key)
      neighbourKeys.add(relation.source)
      if (relation.hierarchy) parents.add(relation.source)
    }
    if (relation.source === nodeKey) {
      outgoing.add(relation.key)
      neighbourKeys.add(relation.target)
      if (relation.hierarchy) children.add(relation.target)
    }
  }

  const typeOf = new Map(payload.nodes.map((n) => [n.key, n.type]))
  const byType: Record<string, string[]> = {}
  for (const key of neighbourKeys) {
    const type = typeOf.get(key) ?? 'unknown'
    ;(byType[type] ??= []).push(key)
  }
  for (const keys of Object.values(byType)) keys.sort(byKey)

  return {
    parents: [...parents].sort(byKey),
    children: [...children].sort(byKey),
    incoming: [...incoming].sort(byKey),
    outgoing: [...outgoing].sort(byKey),
    byType,
  }
}
