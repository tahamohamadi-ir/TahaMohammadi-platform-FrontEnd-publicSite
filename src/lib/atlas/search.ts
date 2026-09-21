/** Client-side Atlas search (Plan C Task 10, spec §16.1).
 *
 * Pure over the loaded payload. Ranking is (prefix before substring, field
 * strength, −importance, key). Relation hits use importance 0 because the
 * payload has no relation importance; weight is not a rank.
 *
 * `normalizeFa` is the search fold only. Focus keys stay in `url-state.ts`
 * (Task 9, frozen): they are ASCII grammar and this function is not applied
 * to `?focus=`.
 */

import type { AtlasPayload } from './model'

export type SearchHit = {
  kind: 'node' | 'relation'
  key: string
  label: string
  type: string
}

export type SearchIndex = {
  search(query: string, options: { limit: number }): SearchHit[]
}

type IndexedField = {
  rank: number
  normalized: string
  display: string
}

type IndexedEntity = {
  kind: 'node' | 'relation'
  key: string
  label: string
  type: string
  importance: number
  fields: IndexedField[]
}

const FIELD_LABEL = 0
const FIELD_CANONICAL = 1
const FIELD_ALIAS = 2
const FIELD_TYPE = 3
const FIELD_EXPLANATION = 4

export function normalizeFa(text: string): string {
  return text
    .replace(/\u064A/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/\u0640/g, '')
    .replace(/\u00A0/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .toLowerCase()
}

function field(rank: number, display: string): IndexedField | null {
  if (!display) return null
  const normalized = normalizeFa(display)
  if (!normalized) return null
  return { rank, normalized, display }
}

function pushField(
  fields: IndexedField[],
  rank: number,
  display: string | undefined,
): void {
  if (!display) return
  const next = field(rank, display)
  if (next) fields.push(next)
}

export function buildSearchIndex(payload: AtlasPayload): SearchIndex {
  const nodeTypeLabel = new Map(
    payload.nodeTypes.map((type) => [type.key, type.label]),
  )
  const relationType = new Map(
    payload.relationTypes.map((type) => [type.key, type]),
  )
  const entities: IndexedEntity[] = []

  for (const node of payload.nodes) {
    const fields: IndexedField[] = []
    pushField(fields, FIELD_LABEL, node.label)
    pushField(fields, FIELD_CANONICAL, node.canonical?.title)
    for (const alias of node.aliases) pushField(fields, FIELD_ALIAS, alias)
    pushField(fields, FIELD_TYPE, nodeTypeLabel.get(node.type))
    entities.push({
      kind: 'node',
      key: node.key,
      label: node.label && node.label.length > 0 ? node.label : node.key,
      type: node.type,
      importance: node.importance,
      fields,
    })
  }

  for (const relation of payload.relations) {
    const type = relationType.get(relation.type)
    const fields: IndexedField[] = []
    pushField(fields, FIELD_TYPE, type?.label)
    pushField(fields, FIELD_TYPE, relation.inverseLabel ?? type?.inverseLabel)
    if (typeof relation.explanation === 'string') {
      pushField(fields, FIELD_EXPLANATION, relation.explanation)
    }
    entities.push({
      kind: 'relation',
      key: relation.key,
      label: type?.label ?? relation.key,
      type: relation.type,
      importance: 0,
      fields,
    })
  }

  return {
    search(query, options) {
      const normalized = normalizeFa(query.trim())
      if (!normalized) return []
      const cap = Number.isFinite(options.limit)
        ? Math.max(0, Math.floor(options.limit))
        : 0
      const hits: Array<
        SearchHit & { shape: number; fieldRank: number; importance: number }
      > = []

      for (const entity of entities) {
        let best: { shape: number; fieldRank: number; display: string } | null =
          null
        for (const candidate of entity.fields) {
          const shape = candidate.normalized.startsWith(normalized)
            ? 0
            : candidate.normalized.includes(normalized)
              ? 1
              : null
          if (shape === null) continue
          if (
            !best ||
            shape < best.shape ||
            (shape === best.shape && candidate.rank < best.fieldRank)
          ) {
            best = {
              shape,
              fieldRank: candidate.rank,
              display: candidate.display,
            }
          }
        }
        if (!best) continue
        hits.push({
          kind: entity.kind,
          key: entity.key,
          label: entity.kind === 'relation' ? best.display : entity.label,
          type: entity.type,
          shape: best.shape,
          fieldRank: best.fieldRank,
          importance: entity.importance,
        })
      }

      hits.sort((left, right) => {
        if (left.shape !== right.shape) return left.shape - right.shape
        if (left.fieldRank !== right.fieldRank)
          return left.fieldRank - right.fieldRank
        if (left.importance !== right.importance)
          return right.importance - left.importance
        if (left.key < right.key) return -1
        if (left.key > right.key) return 1
        return 0
      })

      return hits
        .slice(0, cap)
        .map(({ kind, key, label, type }) => ({ kind, key, label, type }))
    },
  }
}
