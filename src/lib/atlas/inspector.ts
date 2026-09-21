/** Inspector data projection (Plan C Task 11). Pure.
 *
 * Ordered §17.3 / §17.4 sections with only real members. Neighbour lists come
 * from `neighborhoodOf` and type buckets match drawn relations. Empty or
 * unknown keys return `{ sections: [], prompt }`.
 */

import type { AtlasLocale, AtlasPayload } from './model'
import { neighborhoodOf, type NeighborhoodLink } from './neighborhood'

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

type CopyTable = Record<
  AtlasLocale,
  {
    prompt: string
    type: string
    title: string
    summary: string
    parents: string
    children: string
    incoming: string
    outgoing: string
    projects: string
    publications: string
    methods: string
    technologies: string
    canonical: string
    endpoints: string
    details: string
  }
>

const COPY: CopyTable = {
  en: {
    prompt: 'Select a node or relation to inspect it.',
    type: 'Type',
    title: 'Title',
    summary: 'Summary',
    parents: 'Parents',
    children: 'Children / subnodes',
    incoming: 'Incoming relationships',
    outgoing: 'Outgoing relationships',
    projects: 'Related projects',
    publications: 'Publications',
    methods: 'Methods',
    technologies: 'Technologies',
    canonical: 'Canonical record',
    endpoints: 'Endpoints',
    details: 'Details',
  },
  fa: {
    prompt: 'برای بررسی، یک گره یا رابطه را انتخاب کنید.',
    type: 'نوع',
    title: 'عنوان',
    summary: 'خلاصه',
    parents: 'والدها',
    children: 'فرزندان / زیرگره‌ها',
    incoming: 'رابطه‌های ورودی',
    outgoing: 'رابطه‌های خروجی',
    projects: 'پروژه‌های مرتبط',
    publications: 'انتشارات',
    methods: 'روش‌ها',
    technologies: 'فناوری‌ها',
    canonical: 'رکورد مرجع',
    endpoints: 'نقاط پایانی',
    details: 'جزئیات',
  },
}

function compareKey(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function displayLabel(label: string | undefined, key: string): string {
  return label ?? key
}

function sortNeighbourItems(items: AtlasInspectorItem[]): AtlasInspectorItem[] {
  return [...items].sort((left, right) => {
    const byType = compareKey(left.type, right.type)
    if (byType !== 0) return byType
    return compareKey(left.key, right.key)
  })
}

function sortRelationLinks(
  links: readonly NeighborhoodLink[],
): NeighborhoodLink[] {
  return [...links].sort((left, right) => {
    const byType = compareKey(left.relationType, right.relationType)
    if (byType !== 0) return byType
    return compareKey(left.nodeKey, right.nodeKey)
  })
}

function pushSection(
  sections: AtlasInspectorSection[],
  id: string,
  heading: string,
  items: AtlasInspectorItem[],
): void {
  if (items.length === 0) return
  sections.push({ id, heading, items })
}

export function nodeInspectorModel(
  payload: AtlasPayload,
  key: string,
): AtlasInspectorModel {
  const copy = COPY[payload.locale]
  const prompt = copy.prompt
  if (!key) return { sections: [], prompt }

  const node = payload.nodes.find((entry) => entry.key === key)
  if (!node) return { sections: [], prompt }

  const nodeByKey = new Map(payload.nodes.map((entry) => [entry.key, entry]))
  const nodeTypeLabel = new Map(
    payload.nodeTypes.map((entry) => [entry.key, entry.label]),
  )
  const relationTypeByKey = new Map(
    payload.relationTypes.map((entry) => [entry.key, entry]),
  )
  const hood = neighborhoodOf(payload, key)
  const sections: AtlasInspectorSection[] = []

  pushSection(sections, 'type', copy.type, [
    {
      key: node.type,
      label: nodeTypeLabel.get(node.type) ?? node.type,
      type: 'node-type',
    },
  ])

  pushSection(sections, 'title', copy.title, [
    {
      key: node.key,
      label: displayLabel(node.label, node.key),
      type: 'title',
    },
  ])

  if (node.summary) {
    pushSection(sections, 'summary', copy.summary, [
      {
        key: `${node.key}#summary`,
        label: node.summary,
        type: 'summary',
      },
    ])
  }

  const hierarchyRelation = (source: string, target: string) =>
    payload.relations.find(
      (relation) =>
        relation.hierarchy &&
        relation.source === source &&
        relation.target === target,
    )

  const neighbourItem = (
    neighbourKey: string,
    relationLabel?: string,
  ): AtlasInspectorItem | null => {
    const peer = nodeByKey.get(neighbourKey)
    if (!peer) return null
    return {
      key: neighbourKey,
      label: displayLabel(peer.label, neighbourKey),
      type: peer.type,
      href: peer.canonical?.href,
      relationLabel,
    }
  }

  const parentItems = sortNeighbourItems(
    hood.parents.flatMap((parentKey) => {
      const edge = hierarchyRelation(parentKey, key)
      const typeRow = edge ? relationTypeByKey.get(edge.type) : undefined
      const item = neighbourItem(
        parentKey,
        typeRow?.inverseLabel ?? typeRow?.label ?? edge?.type,
      )
      return item ? [item] : []
    }),
  )
  pushSection(sections, 'parents', copy.parents, parentItems)

  const childItems = sortNeighbourItems(
    hood.children.flatMap((childKey) => {
      const edge = hierarchyRelation(key, childKey)
      const typeRow = edge ? relationTypeByKey.get(edge.type) : undefined
      const item = neighbourItem(childKey, typeRow?.label ?? edge?.type)
      return item ? [item] : []
    }),
  )
  pushSection(sections, 'children', copy.children, childItems)

  const incomingItems = sortNeighbourItems(
    sortRelationLinks(hood.incoming).flatMap((link) => {
      const typeRow = relationTypeByKey.get(link.relationType)
      const item = neighbourItem(
        link.nodeKey,
        typeRow?.inverseLabel ?? typeRow?.label ?? link.relationType,
      )
      return item ? [item] : []
    }),
  )
  pushSection(sections, 'incoming', copy.incoming, incomingItems)

  const outgoingItems = sortNeighbourItems(
    sortRelationLinks(hood.outgoing).flatMap((link) => {
      const typeRow = relationTypeByKey.get(link.relationType)
      const item = neighbourItem(
        link.nodeKey,
        typeRow?.label ?? link.relationType,
      )
      return item ? [item] : []
    }),
  )
  pushSection(sections, 'outgoing', copy.outgoing, outgoingItems)

  const typedNeighbours = (
    nodeType: string,
    sectionId: string,
    heading: string,
  ) => {
    const keys = hood.byType[nodeType]
    if (!keys?.length) return
    const items = sortNeighbourItems(
      keys.flatMap((neighbourKey) => {
        const item = neighbourItem(neighbourKey)
        return item ? [item] : []
      }),
    )
    pushSection(sections, sectionId, heading, items)
  }

  typedNeighbours('project', 'projects', copy.projects)
  typedNeighbours('publication', 'publications', copy.publications)
  typedNeighbours('method', 'methods', copy.methods)
  typedNeighbours('technology', 'technologies', copy.technologies)

  if (node.canonical) {
    pushSection(sections, 'canonical', copy.canonical, [
      {
        key: node.canonical.slug,
        label: node.canonical.title,
        type: node.canonical.family,
        href: node.canonical.href,
      },
    ])
  }

  return { sections, prompt }
}

export function relationInspectorModel(
  payload: AtlasPayload,
  key: string,
): AtlasInspectorModel {
  const copy = COPY[payload.locale]
  const prompt = copy.prompt
  if (!key) return { sections: [], prompt }

  const relation = payload.relations.find((entry) => entry.key === key)
  if (!relation) return { sections: [], prompt }

  const nodeByKey = new Map(payload.nodes.map((entry) => [entry.key, entry]))
  const typeRow = payload.relationTypes.find(
    (entry) => entry.key === relation.type,
  )
  const source = nodeByKey.get(relation.source)
  const target = nodeByKey.get(relation.target)

  const sections: AtlasInspectorSection[] = []

  pushSection(sections, 'endpoints', copy.endpoints, [
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
  ])

  const detailItems: AtlasInspectorItem[] = [
    {
      key: `${relation.key}#type`,
      label: typeRow?.label ?? relation.type,
      type: 'relation-type',
      relationLabel: typeRow?.inverseLabel ?? relation.inverseLabel,
    },
  ]

  const inverseCopy = typeRow?.inverseLabel ?? relation.inverseLabel
  if (inverseCopy) {
    detailItems.push({
      key: `${relation.key}#inverse`,
      label: inverseCopy,
      type: 'inverse-interpretation',
    })
  }

  detailItems.push({
    key: `${relation.key}#direction`,
    label: relation.directed ? 'directed' : 'undirected',
    type: 'direction',
  })

  detailItems.push({
    key: `${relation.key}#weight`,
    label: String(relation.weight),
    type: 'weight',
  })

  detailItems.push({
    key: `${relation.key}#hierarchy`,
    label: relation.hierarchy ? 'hierarchy' : 'non-hierarchy',
    type: 'hierarchy-role',
  })

  if (relation.explanation) {
    detailItems.push({
      key: `${relation.key}#explanation`,
      label: relation.explanation,
      type: 'explanation',
    })
  }

  pushSection(sections, 'details', copy.details, detailItems)

  return { sections, prompt }
}
