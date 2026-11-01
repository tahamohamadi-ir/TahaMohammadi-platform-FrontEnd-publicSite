/** Home Hero v3 — projects the published graph into a flat constellation. Never adds nodes. */

export interface ConstellationInputNode {
  id: string
  label: string
  type: string
  colorRole: string
  layout: { x: number; y: number }
  related: ReadonlyArray<{ href: string }>
}

export interface ConstellationInput {
  nodes: ReadonlyArray<ConstellationInputNode>
  edges: ReadonlyArray<{ id: string; source: string; target: string }>
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
  x: number
  y: number
  left: number
  top: number
  r: number
  side: LabelSide
}

export interface ConstellationOutput {
  nodes: ConstellationNode[]
  edges: { id: string; source: string; target: string; d: string }[]
  rings: { r: number }[]
}

const round = (value: number) => Math.round(value * 10) / 10

export function projectConstellation(
  input: ConstellationInput,
  frame: ConstellationFrame,
): ConstellationOutput {
  if (input.nodes.length === 0) return { nodes: [], edges: [], rings: [] }

  const core = input.nodes.find((node) => node.type === 'identity')
  const xs = input.nodes.map((node) => node.layout.x)
  const ys = input.nodes.map((node) => node.layout.y)
  const originX = core ? core.layout.x : (Math.min(...xs) + Math.max(...xs)) / 2
  const originY = core ? core.layout.y : (Math.min(...ys) + Math.max(...ys)) / 2

  const extent = Math.max(
    ...input.nodes.map((node) =>
      Math.max(
        Math.abs(node.layout.x - originX),
        Math.abs(node.layout.y - originY),
      ),
    ),
  )
  const fit = Math.min(frame.width, frame.height) / 2 - frame.padding
  const scale = extent > 0 ? fit / extent : 0
  const cx = frame.width / 2
  const cy = frame.height / 2

  const nodes: ConstellationNode[] = input.nodes.map((node) => {
    const x = cx + (node.layout.x - originX) * scale
    const y = cy - (node.layout.y - originY) * scale
    const dx = x - cx
    const dy = y - cy
    const level = Math.abs(dy) < Math.abs(dx) * 0.15
    const side: LabelSide = level
      ? dx >= 0
        ? 'right'
        : 'left'
      : dy >= 0
        ? 'bottom'
        : 'top'
    const isCore = node === core
    return {
      id: node.id,
      label: node.label,
      colorRole: node.colorRole,
      href: node.related[0]?.href ?? null,
      core: isCore,
      x: round(x),
      y: round(y),
      left: round((x / frame.width) * 100),
      top: round((y / frame.height) * 100),
      r: isCore ? 30 : 15,
      side: isCore ? 'bottom' : side,
    }
  })

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = input.edges.flatMap((edge) => {
    const a = byId.get(edge.source)
    const b = byId.get(edge.target)
    if (!a || !b) return []
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const bend = 0.16
    const qx = mx - (b.y - a.y) * bend
    const qy = my + (b.x - a.x) * bend
    return [
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        d: `M${a.x} ${a.y} Q${round(qx)} ${round(qy)} ${b.x} ${b.y}`,
      },
    ]
  })

  const distances = nodes
    .filter((node) => !node.core)
    .map((node) => Math.round(Math.hypot(node.x - cx, node.y - cy) / 4) * 4)
    .filter((distance) => distance > 0)
  const outer = distances.length ? Math.max(...distances) : 0
  const radii = outer
    ? [...new Set([round(outer * 0.46), ...distances, round(outer * 1.2)])]
    : []

  return {
    nodes,
    edges,
    rings: radii.sort((a, b) => a - b).map((r) => ({ r })),
  }
}
