/**
 * Home Hero v3 — lays the published graph out as rings around the identity node: fields on the
 * first ring, their projects/experiences further out. Structure comes from edges (`includes`
 * preferred for parenthood); pinned editor positions are ignored. Never adds nodes.
 */

export interface ConstellationInputNode {
  id: string
  label: string
  type: string
  colorRole: string
  related: ReadonlyArray<{ href: string }>
}

export interface ConstellationInput {
  nodes: ReadonlyArray<ConstellationInputNode>
  edges: ReadonlyArray<{
    id: string
    source: string
    target: string
    relationType?: string
  }>
}

export interface ConstellationFrame {
  width: number
  height: number
  padding: number
}

export type LabelSide = 'top' | 'right' | 'bottom' | 'left'

export interface ConstellationNode {
  id: string
  label: string
  colorRole: string
  href: string | null
  core: boolean
  depth: number
  parentId: string | null
  branch: string | null
  x: number
  y: number
  left: number
  top: number
  r: number
  side: LabelSide
}

export interface ConstellationEdge {
  id: string
  source: string
  target: string
  kind: 'tree' | 'cross'
  branch: string | null
  d: string
}

export interface ConstellationOutput {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
  rings: { r: number }[]
}

const round = (value: number) => Math.round(value * 10) / 10
const TAU = Math.PI * 2
const SIBLING_STEP = 0.46
const NODE_RADIUS = [30, 15, 8]

export function projectConstellation(
  input: ConstellationInput,
  frame: ConstellationFrame,
): ConstellationOutput {
  if (input.nodes.length === 0) return { nodes: [], edges: [], rings: [] }

  const ids = new Set(input.nodes.map((entry) => entry.id))
  const edges = input.edges.filter(
    (edge) =>
      ids.has(edge.source) &&
      ids.has(edge.target) &&
      edge.source !== edge.target,
  )
  const core =
    input.nodes.find((entry) => entry.type === 'identity') ?? input.nodes[0]!

  const adjacencyOf = (list: typeof edges) => {
    const adjacency = new Map<string, string[]>()
    for (const edge of list) {
      adjacency.set(edge.source, [
        ...(adjacency.get(edge.source) ?? []),
        edge.target,
      ])
      adjacency.set(edge.target, [
        ...(adjacency.get(edge.target) ?? []),
        edge.source,
      ])
    }
    return adjacency
  }

  const depth = new Map<string, number>([[core.id, 0]])
  const parent = new Map<string, string | null>([[core.id, null]])
  // Explicit `includes` hierarchy first; other links only place what it left out.
  const walk = (adjacency: Map<string, string[]>) => {
    const queue = [...depth.keys()].sort(
      (a, b) => depth.get(a)! - depth.get(b)!,
    )
    while (queue.length) {
      const current = queue.shift()!
      for (const next of adjacency.get(current) ?? []) {
        if (depth.has(next)) continue
        depth.set(next, depth.get(current)! + 1)
        parent.set(next, current)
        queue.push(next)
      }
    }
  }
  walk(adjacencyOf(edges.filter((edge) => edge.relationType === 'includes')))
  walk(adjacencyOf(edges))

  const reachableDepth = Math.max(...depth.values())
  const orphans = input.nodes.filter((entry) => !depth.has(entry.id))
  const orphanDepth = Math.max(reachableDepth + 1, 2)
  for (const orphan of orphans) {
    depth.set(orphan.id, orphanDepth)
    parent.set(orphan.id, null)
  }
  const rings = orphans.length ? orphanDepth : reachableDepth

  const children = new Map<string, string[]>()
  for (const entry of input.nodes) {
    const up = parent.get(entry.id)
    if (up) children.set(up, [...(children.get(up) ?? []), entry.id])
  }
  const leaves = (id: string): number => {
    const kids = children.get(id) ?? []
    return kids.length ? kids.reduce((sum, kid) => sum + leaves(kid), 0) : 1
  }

  const maxRadius = Math.min(frame.width, frame.height) / 2 - frame.padding
  const ringRadius = (level: number) =>
    rings <= 1
      ? maxRadius * 0.8
      : maxRadius * (0.5 + (0.5 * (level - 1)) / (rings - 1))

  const angle = new Map<string, number>()
  const place = (id: string, at: number, sector: number) => {
    angle.set(id, at)
    const kids = children.get(id) ?? []
    if (!kids.length) return
    if (depth.get(id) === 1) {
      // A field keeps its own radial line free so its outward label never sits on a child:
      // children take steps ±1, ±2, … around it, never step 0.
      const steps = kids
        .map((_, index) => (index % 2 ? -1 : 1) * (Math.floor(index / 2) + 1))
        .sort((a, b) => a - b)
      const reach = Math.max(...steps.map(Math.abs))
      const step = Math.min(SIBLING_STEP, (sector * 0.45) / reach)
      kids.forEach((kid, index) => place(kid, at + steps[index]! * step, step))
      return
    }
    const window = Math.min(sector * 0.9, kids.length * SIBLING_STEP)
    const slot = window / kids.length
    kids.forEach((kid, index) =>
      place(kid, at - window / 2 + slot * (index + 0.5), slot),
    )
  }
  const fields = children.get(core.id) ?? []
  const weights = fields.map(leaves)
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
  let cursor = -Math.PI / 2 - (TAU * (weights[0] ?? 1)) / total / 2
  fields.forEach((field, index) => {
    const sector = (TAU * weights[index]!) / total
    place(field, cursor + sector / 2, sector)
    cursor += sector
  })
  orphans.forEach((orphan, index) =>
    angle.set(orphan.id, Math.PI / 7 + (TAU * index) / orphans.length),
  )

  const branchOf = (id: string): string | null => {
    let current: string | null = id
    while (current && depth.get(current)! > 1)
      current = parent.get(current) ?? null
    return current && depth.get(current) === 1 ? current : null
  }

  const cx = frame.width / 2
  const cy = frame.height / 2
  const nodes: ConstellationNode[] = input.nodes.map((entry) => {
    const level = depth.get(entry.id)!
    const isCore = entry.id === core.id
    const theta = angle.get(entry.id) ?? 0
    const distance = isCore ? 0 : ringRadius(level)
    const x = cx + Math.cos(theta) * distance
    const y = cy + Math.sin(theta) * distance
    const dx = x - cx
    const dy = y - cy
    const side: LabelSide =
      Math.abs(dy) < Math.abs(dx) * 0.15
        ? dx >= 0
          ? 'right'
          : 'left'
        : dy >= 0
          ? 'bottom'
          : 'top'
    return {
      id: entry.id,
      label: entry.label,
      colorRole: entry.colorRole,
      href: entry.related[0]?.href ?? null,
      core: isCore,
      depth: level,
      parentId: parent.get(entry.id) ?? null,
      branch: isCore ? null : branchOf(entry.id),
      x: round(x),
      y: round(y),
      left: round((x / frame.width) * 100),
      top: round((y / frame.height) * 100),
      r: NODE_RADIUS[Math.min(level, NODE_RADIUS.length - 1)]!,
      side: isCore ? 'bottom' : side,
    }
  })

  const byId = new Map(nodes.map((entry) => [entry.id, entry]))
  const curve = (a: ConstellationNode, b: ConstellationNode, bend: number) => {
    const qx = (a.x + b.x) / 2 - (b.y - a.y) * bend
    const qy = (a.y + b.y) / 2 + (b.x - a.x) * bend
    return `M${a.x} ${a.y} Q${round(qx)} ${round(qy)} ${b.x} ${b.y}`
  }
  const seen = new Set<string>()
  const projected: ConstellationEdge[] = edges.flatMap((edge) => {
    const a = byId.get(edge.source)!
    const b = byId.get(edge.target)!
    const child = b.parentId === a.id ? b : a.parentId === b.id ? a : null
    const pair = [a.id, b.id].sort().join('|')
    const tree = child !== null && !seen.has(pair)
    if (tree) seen.add(pair)
    return [
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: tree ? 'tree' : 'cross',
        branch: tree ? child.branch : null,
        d: curve(a, b, tree ? 0.08 : 0.24),
      },
    ]
  })

  return {
    nodes,
    edges: projected,
    rings: Array.from({ length: rings }, (_, index) => ({
      r: round(ringRadius(index + 1)),
    })),
  }
}
