/** Persian-aware search index (Plan C Task 10). Pure.
 *
 * Ranking: match class first (prefix beats substring), then
 * `(-importance, key)` — deterministic across locales and runs.
 */
import type { AtlasPayload } from './model'

const ARABIC_YEH = 'ي'
const PERSIAN_YEH = 'ی'
const ARABIC_KEH = 'ك'
const PERSIAN_KEH = 'ک'
const ZWNJ = '‌'
const TATWEEL = 'ـ'

function foldDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0)
    // U+06F0–U+06F9 (Extended Arabic-Indic) or U+0660–U+0669 (Arabic-Indic).
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

/** Persian text normalisation: ي/ك folding, digit folding, ZWNJ/tatweel strip. */
export function normalizeFa(text: string): string {
  return foldDigits(text)
    .replaceAll(ARABIC_YEH, PERSIAN_YEH)
    .replaceAll(ARABIC_KEH, PERSIAN_KEH)
    .replaceAll(ZWNJ, '')
    .replaceAll(TATWEEL, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface AtlasSearchHit {
  kind: 'node' | 'relation'
  key: string
  label: string
  type: string
}

interface IndexedEntry extends AtlasSearchHit {
  importance: number
  haystacks: string[]
}

function nodeLabel(node: { label?: string; key: string }): string {
  return node.label ?? node.key
}

export interface AtlasSearchIndex {
  search(query: string, options?: { limit?: number }): AtlasSearchHit[]
}

export function buildSearchIndex(payload: AtlasPayload): AtlasSearchIndex {
  const labelByKey = new Map(payload.nodes.map((n) => [n.key, nodeLabel(n)]))
  const typeLabel = new Map<string, string>([
    ...payload.nodeTypes.map((t) => [t.key, t.label] as [string, string]),
    ...payload.relationTypes.map((t) => [t.key, t.label] as [string, string]),
  ])

  const entries: IndexedEntry[] = [
    ...payload.nodes.map((node) => {
      const label = nodeLabel(node)
      return {
        kind: 'node' as const,
        key: node.key,
        label,
        type: node.type,
        importance: node.importance,
        haystacks: [
          label,
          ...(node.aliases ?? []),
          ...(node.canonical ? [node.canonical.title] : []),
        ].map(normalizeFa),
      }
    }),
    ...payload.relations.map((relation) => ({
      kind: 'relation' as const,
      key: relation.key,
      label:
        typeLabel.get(relation.type) ??
        `${labelByKey.get(relation.source) ?? relation.source} → ${labelByKey.get(relation.target) ?? relation.target}`,
      type: relation.type,
      importance: relation.weight,
      haystacks: [
        typeLabel.get(relation.type) ?? relation.type,
        labelByKey.get(relation.source) ?? relation.source,
        labelByKey.get(relation.target) ?? relation.target,
      ].map(normalizeFa),
    })),
  ]

  return {
    search(query: string, options: { limit?: number } = {}): AtlasSearchHit[] {
      const needle = normalizeFa(query)
      if (!needle) return []
      const scored: Array<{
        entry: IndexedEntry
        rank: [number, number, string]
      }> = []
      for (const entry of entries) {
        let matchClass = -1
        for (const hay of entry.haystacks) {
          if (hay.startsWith(needle)) {
            matchClass = 0
            break
          }
          if (matchClass < 0 && hay.includes(needle)) matchClass = 1
        }
        if (matchClass < 0) continue
        scored.push({ entry, rank: [matchClass, -entry.importance, entry.key] })
      }
      scored.sort((a, b) =>
        a.rank[0] === b.rank[0]
          ? a.rank[1] === b.rank[1]
            ? a.rank[2] < b.rank[2]
              ? -1
              : 1
            : a.rank[1] - b.rank[1]
          : a.rank[0] - b.rank[0],
      )
      const limit = options.limit ?? scored.length
      return scored
        .slice(0, limit)
        .map(({ entry }) => ({
          kind: entry.kind,
          key: entry.key,
          label: entry.label,
          type: entry.type,
        }))
    },
  }
}
