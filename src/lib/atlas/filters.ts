/** Dim-first Atlas filters (Plan C Task 10, spec §16.2).
 *
 * Chips are `all` plus every `filterVisible` type except `identity` and any
 * `semanticRole: 'anchor'`. Membership is a presentation set: the payload
 * object, its node array and its relation array are never replaced.
 * Filter state is not written to the URL.
 */

import type { AtlasLocale, AtlasPayload } from './model'

export type FilterOption = {
  key: string
  label: string
  nodeTypeKey: string | null
}

export type FilterMembership = {
  emphasizedNodes: readonly string[]
  dimmedNodes: readonly string[]
  emphasizedRelations: readonly string[]
  dimmedRelations: readonly string[]
}

const ALL_LABEL: Record<AtlasLocale, string> = {
  en: 'All',
  fa: 'همه',
}

function compareKey(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function filterOptions(payload: AtlasPayload): FilterOption[] {
  const options: FilterOption[] = [
    { key: 'all', label: ALL_LABEL[payload.locale], nodeTypeKey: null },
  ]
  for (const type of payload.nodeTypes) {
    if (!type.filterVisible) continue
    if (type.key === 'identity' || type.semanticRole === 'anchor') continue
    options.push({ key: type.key, label: type.label, nodeTypeKey: type.key })
  }
  return options
}

export function filterSet(
  payload: AtlasPayload,
  filterKey: string,
): FilterMembership {
  const allowed = new Set(filterOptions(payload).map((option) => option.key))
  const matchAll = filterKey === 'all' && allowed.has('all')
  const matchType = !matchAll && allowed.has(filterKey)
  const emphasizedNodes: string[] = []
  const dimmedNodes: string[] = []

  for (const node of payload.nodes) {
    const emphasized = matchAll || (matchType && node.type === filterKey)
    ;(emphasized ? emphasizedNodes : dimmedNodes).push(node.key)
  }
  emphasizedNodes.sort(compareKey)
  dimmedNodes.sort(compareKey)

  const emphasized = new Set(emphasizedNodes)
  const emphasizedRelations: string[] = []
  const dimmedRelations: string[] = []
  for (const relation of payload.relations) {
    const bothEnds =
      emphasized.has(relation.source) && emphasized.has(relation.target)
    ;(bothEnds ? emphasizedRelations : dimmedRelations).push(relation.key)
  }
  emphasizedRelations.sort(compareKey)
  dimmedRelations.sort(compareKey)

  return { emphasizedNodes, dimmedNodes, emphasizedRelations, dimmedRelations }
}
