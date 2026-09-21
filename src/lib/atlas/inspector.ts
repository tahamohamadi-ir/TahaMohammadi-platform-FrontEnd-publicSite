/** Inspector data projection (Plan C Task 11). Pure.
 *
 * Ordered sections with only the data that exists: a node with no
 * publications has no `publications` section, a missing canonical record
 * omits the canonical section and still renders. Neighbour items carry the
 * edge label and order by (neighbour type, key) so lists never contradict
 * the drawn relations. Never invents canonical content: labels fall back to
 * the public key (payload data), absent data omits the section.
 */
import type { AtlasLocale, AtlasPayload } from './model'
import { neighborhoodOf } from './neighborhood'

export interface AtlasInspectorItem {
  key: string
  label: string
  type: string
  href?: string
  relationLabel?: string
}

export interface AtlasInspectorSection {
  id: string
  heading: string
  items: AtlasInspectorItem[]
}

export interface AtlasInspectorModel {
  sections: AtlasInspectorSection[]
  prompt: string
}

type Copy = Record<string, string>

const COPY: Record<AtlasLocale, Copy> = {
  en: {
    parents: 'Parents',
    children: 'Children',
    relations: 'Relations',
    groups: 'Groups',
    canonical: 'Canonical record',
    endpoints: 'Endpoints',
    details: 'Details',
    prompt: 'Select a node or relation to inspect it.',
  },
  fa: {
    parents: 'والدها',
    children: 'فرزندها',
    relations: 'رابطه‌ها',
    groups: 'گروه‌ها',
    canonical: 'رکورد مرجع',
    endpoints: 'نقاط پایانی',
    details: 'جزئیات',
    prompt: 'برای بررسی، یک گره یا رابطه را انتخاب کنید.',
  },
}

function displayLabel(label: string | undefined, key: string): string {
  return label ?? key
}

export function emptyInspectorModel(locale: AtlasLocale): AtlasInspectorModel {
  return { sections: [], prompt: COPY[locale].prompt }
}

export function nodeInspectorModel(
  payload: AtlasPayload,
  key: string,
  locale: AtlasLocale,
): AtlasInspectorModel {
  const copy = COPY[locale]
  const node = payload.nodes.find((n) => n.key === key)
  if (!node) return emptyInspectorModel(locale)

  const nodeByKey = new Map(payload.nodes.map((n) => [n.key, n]))
  const relationByKey = new Map(payload.relations.map((r) => [r.key, r]))
  const typeLabel = new Map(payload.relationTypes.map((t) => [t.key, t.label]))
  const hood = neighborhoodOf(payload, key)
  const sections: AtlasInspectorSection[] = []

  const neighbourItems = (keys: string[]): AtlasInspectorItem[] =>
    keys
      .map((k) => {
        const peer = nodeByKey.get(k)
        const edge = [...hood.incoming, ...hood.outgoing]
          .map((rk) => relationByKey.get(rk))
          .find((r) => r && (r.source === k || r.target === k))
        return {
          key: k,
          label: displayLabel(peer?.label, k),
          type: peer?.type ?? 'unknown',
          href: peer?.canonical?.href,
          relationLabel: edge
            ? (typeLabel.get(edge.type) ?? edge.type)
            : undefined,
        }
      })
      .sort((a, b) =>
        a.type === b.type ? (a.key < b.key ? -1 : 1) : a.type < b.type ? -1 : 1,
      )

  if (hood.parents.length) {
    sections.push({
      id: 'parents',
      heading: copy.parents,
      items: neighbourItems(hood.parents),
    })
  }
  if (hood.children.length) {
    sections.push({
      id: 'children',
      heading: copy.children,
      items: neighbourItems(hood.children),
    })
  }

  const edgeKeys = [...hood.incoming, ...hood.outgoing].filter((rk) => {
    const r = relationByKey.get(rk)
    return r && !r.hierarchy
  })
  if (edgeKeys.length) {
    sections.push({
      id: 'relations',
      heading: copy.relations,
      items: edgeKeys.sort().map((rk) => {
        const r = relationByKey.get(rk)
        const peerKey = r && r.source === key ? r.target : (r?.source ?? rk)
        const peer = peerKey ? nodeByKey.get(peerKey) : undefined
        return {
          key: rk,
          label: r ? (typeLabel.get(r.type) ?? r.type) : rk,
          type: r?.type ?? 'unknown',
          relationLabel: displayLabel(peer?.label, peerKey ?? rk),
        }
      }),
    })
  }

  const memberships = payload.groups.filter((g) => g.nodeKeys.includes(key))
  if (memberships.length) {
    sections.push({
      id: 'groups',
      heading: copy.groups,
      items: memberships.map((g) => ({
        key: g.key,
        label: g.label,
        type: 'group',
      })),
    })
  }

  if (node.canonical) {
    sections.push({
      id: 'canonical',
      heading: copy.canonical,
      items: [
        {
          key: node.canonical.slug,
          label: node.canonical.title,
          type: node.canonical.family,
          href: node.canonical.href,
        },
      ],
    })
  }

  return { sections, prompt: copy.prompt }
}

export function relationInspectorModel(
  payload: AtlasPayload,
  key: string,
  locale: AtlasLocale,
): AtlasInspectorModel {
  const copy = COPY[locale]
  const relation = payload.relations.find((r) => r.key === key)
  if (!relation) return emptyInspectorModel(locale)

  const nodeByKey = new Map(payload.nodes.map((n) => [n.key, n]))
  const typeRow = payload.relationTypes.find((t) => t.key === relation.type)
  const source = nodeByKey.get(relation.source)
  const target = nodeByKey.get(relation.target)

  const endpoints: AtlasInspectorSection = {
    id: 'endpoints',
    heading: copy.endpoints,
    items: [
      {
        key: relation.source,
        label: displayLabel(source?.label, relation.source),
        type: source?.type ?? 'unknown',
        href: source?.canonical?.href,
      },
      {
        key: relation.target,
        label: displayLabel(target?.label, relation.target),
        type: target?.type ?? 'unknown',
        href: target?.canonical?.href,
      },
    ],
  }

  const detailItems: AtlasInspectorItem[] = [
    {
      key: `${relation.key}#type`,
      label: typeRow?.label ?? relation.type,
      type: 'relation-type',
      relationLabel: typeRow?.inverseLabel ?? relation.inverseLabel,
    },
    {
      key: `${relation.key}#direction`,
      label: relation.directed ? 'directed' : 'undirected',
      type: 'direction',
    },
  ]
  const explanation = relation.explanation
  if (explanation) {
    detailItems.push({
      key: `${relation.key}#explanation`,
      label: explanation,
      type: 'explanation',
    })
  }

  return {
    sections: [
      endpoints,
      { id: 'details', heading: copy.details, items: detailItems },
    ],
    prompt: copy.prompt,
  }
}
