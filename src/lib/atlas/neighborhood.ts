/** One-hop neighbourhood (Plan C Task 10).
 *
 * Hierarchy edges become parents/children. Other edges stay incoming or
 * outgoing, one entry per drawn relation. `byType` groups the other end's
 * node type. A single pass — no walk — so a general cycle cannot expand
 * past one hop or loop. Hidden overview nodes stay included.
 */

import type { AtlasPayload } from './model'

export type NeighborhoodLink = {
  relationKey: string
  relationType: string
  nodeKey: string
}

export type Neighborhood = {
  parents: readonly string[]
  children: readonly string[]
  incoming: readonly NeighborhoodLink[]
  outgoing: readonly NeighborhoodLink[]
  byType: Readonly<Record<string, readonly string[]>>
}

function compareKey(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function neighborhoodOf(
  payload: AtlasPayload,
  nodeKey: string,
): Neighborhood {
  const parents = new Set<string>()
  const children = new Set<string>()
  const incoming: NeighborhoodLink[] = []
  const outgoing: NeighborhoodLink[] = []

  for (const relation of payload.relations) {
    if (relation.hierarchy) {
      if (relation.target === nodeKey && relation.source !== nodeKey)
        parents.add(relation.source)
      if (relation.source === nodeKey && relation.target !== nodeKey)
        children.add(relation.target)
      continue
    }
    if (relation.target === nodeKey && relation.source !== nodeKey) {
      incoming.push({
        relationKey: relation.key,
        relationType: relation.type,
        nodeKey: relation.source,
      })
    } else if (relation.source === nodeKey && relation.target !== nodeKey) {
      outgoing.push({
        relationKey: relation.key,
        relationType: relation.type,
        nodeKey: relation.target,
      })
    }
  }

  incoming.sort((left, right) =>
    compareKey(left.relationKey, right.relationKey),
  )
  outgoing.sort((left, right) =>
    compareKey(left.relationKey, right.relationKey),
  )

  const typeByKey = new Map(payload.nodes.map((node) => [node.key, node.type]))
  const neighbourKeys = new Set<string>([...parents, ...children])
  for (const link of incoming) neighbourKeys.add(link.nodeKey)
  for (const link of outgoing) neighbourKeys.add(link.nodeKey)
  neighbourKeys.delete(nodeKey)

  const grouped = new Map<string, string[]>()
  for (const key of [...neighbourKeys].sort(compareKey)) {
    const type = typeByKey.get(key)
    if (!type) continue
    const list = grouped.get(type)
    if (list) list.push(key)
    else grouped.set(type, [key])
  }

  const byType: Record<string, readonly string[]> = {}
  for (const type of [...grouped.keys()].sort(compareKey)) {
    const keys = grouped.get(type)
    if (keys) byType[type] = keys
  }

  return {
    parents: [...parents].sort(compareKey),
    children: [...children].sort(compareKey),
    incoming,
    outgoing,
    byType,
  }
}
