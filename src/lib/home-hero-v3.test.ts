import { describe, expect, it } from 'vitest'
import { projectConstellation, type ConstellationInput } from './home-hero-v3'

const node = (
  id: string,
  type: string,
  colorRole = 'brand',
  href?: string,
) => ({
  id,
  label: id,
  type,
  colorRole,
  related: href ? [{ href }] : [],
})

const graph: ConstellationInput = {
  nodes: [
    node('taha', 'identity'),
    node('software', 'field', 'research', '/en/research/software/'),
    node('visual', 'field', 'signature'),
    node('data', 'field', 'context'),
    node('pars-sql', 'project', 'research', '/en/projects/pars-sql/'),
    node('mci', 'experience', 'research'),
    node('campaigns', 'project', 'signature'),
    node('dashboards', 'project', 'context'),
  ],
  edges: [
    { id: 'e1', source: 'taha', target: 'software', relationType: 'includes' },
    { id: 'e2', source: 'taha', target: 'visual', relationType: 'includes' },
    { id: 'e3', source: 'taha', target: 'data', relationType: 'includes' },
    {
      id: 'e4',
      source: 'software',
      target: 'pars-sql',
      relationType: 'includes',
    },
    { id: 'e5', source: 'software', target: 'mci', relationType: 'includes' },
    {
      id: 'e6',
      source: 'visual',
      target: 'campaigns',
      relationType: 'includes',
    },
    {
      id: 'e7',
      source: 'data',
      target: 'dashboards',
      relationType: 'includes',
    },
    {
      id: 'cross',
      source: 'visual',
      target: 'dashboards',
      relationType: 'relates',
    },
    { id: 'ghost', source: 'taha', target: 'not-published' },
  ],
}

const size = { width: 600, height: 520, padding: 40 }
const byId = (out: ReturnType<typeof projectConstellation>, id: string) =>
  out.nodes.find((entry) => entry.id === id)!
const radius = (entry: { x: number; y: number }) =>
  Math.hypot(entry.x - 300, entry.y - 260)
const angle = (entry: { x: number; y: number }) =>
  Math.atan2(entry.y - 260, entry.x - 300)
const angularGap = (a: number, b: number) => {
  const gap = Math.abs(a - b) % (Math.PI * 2)
  return gap > Math.PI ? Math.PI * 2 - gap : gap
}

describe('projectConstellation', () => {
  it('centres the identity node and keeps every node inside the frame', () => {
    const out = projectConstellation(graph, size)
    const core = byId(out, 'taha')
    expect(core.core).toBe(true)
    expect(core.depth).toBe(0)
    expect(core.x).toBeCloseTo(300)
    expect(core.y).toBeCloseTo(260)
    expect(core.left).toBeCloseTo(50)
    expect(core.top).toBeCloseTo(50)
    for (const entry of out.nodes) {
      expect(entry.x).toBeGreaterThanOrEqual(size.padding)
      expect(entry.x).toBeLessThanOrEqual(size.width - size.padding)
      expect(entry.y).toBeGreaterThanOrEqual(size.padding)
      expect(entry.y).toBeLessThanOrEqual(size.height - size.padding)
    }
  })

  it('puts fields on the first ring and their children on an outer ring', () => {
    const out = projectConstellation(graph, size)
    const fields = ['software', 'visual', 'data'].map((id) => byId(out, id))
    const children = ['pars-sql', 'mci', 'campaigns', 'dashboards'].map((id) =>
      byId(out, id),
    )
    for (const field of fields) expect(field.depth).toBe(1)
    for (const child of children) expect(child.depth).toBe(2)
    const inner = radius(fields[0]!)
    for (const field of fields) expect(radius(field)).toBeCloseTo(inner, 0)
    for (const child of children)
      expect(radius(child)).toBeGreaterThan(inner + 30)
  })

  it('keeps each child inside its parent field sector and tags its branch', () => {
    const out = projectConstellation(graph, size)
    const sector = (Math.PI * 2) / 3
    for (const [child, parent] of [
      ['pars-sql', 'software'],
      ['mci', 'software'],
      ['campaigns', 'visual'],
      ['dashboards', 'data'],
    ] as const) {
      const entry = byId(out, child)
      expect(entry.parentId).toBe(parent)
      expect(entry.branch).toBe(parent)
      expect(
        angularGap(angle(entry), angle(byId(out, parent))),
      ).toBeLessThanOrEqual(sector / 2)
    }
    expect(byId(out, 'software').branch).toBe('software')
    expect(byId(out, 'taha').branch).toBeNull()
  })

  it('keeps each field radial line free for its label', () => {
    const out = projectConstellation(graph, size)
    for (const field of ['software', 'visual', 'data']) {
      for (const child of out.nodes.filter((entry) => entry.parentId === field))
        expect(
          angularGap(angle(child), angle(byId(out, field))),
        ).toBeGreaterThan(0.1)
    }
  })

  it('draws tree edges per branch and keeps extra links as cross edges', () => {
    const out = projectConstellation(graph, size)
    const edges = Object.fromEntries(out.edges.map((edge) => [edge.id, edge]))
    expect(Object.keys(edges)).not.toContain('ghost')
    expect(edges.e4).toMatchObject({ kind: 'tree', branch: 'software' })
    expect(edges.e1).toMatchObject({ kind: 'tree', branch: 'software' })
    expect(edges.cross).toMatchObject({ kind: 'cross' })
    for (const edge of out.edges) expect(edge.d).toMatch(/^M[\d.]+ [\d.]+ Q/)
  })

  it('shrinks nodes with depth and links only resolved records', () => {
    const out = projectConstellation(graph, size)
    expect(byId(out, 'taha').r).toBeGreaterThan(byId(out, 'software').r)
    expect(byId(out, 'software').r).toBeGreaterThan(byId(out, 'pars-sql').r)
    expect(byId(out, 'pars-sql').href).toBe('/en/projects/pars-sql/')
    expect(byId(out, 'mci').href).toBeNull()
  })

  it('labels outward from the centre', () => {
    const out = projectConstellation(graph, size)
    for (const entry of out.nodes.filter((item) => !item.core)) {
      const dx = entry.x - 300
      const dy = entry.y - 260
      if (entry.side === 'bottom') expect(dy).toBeGreaterThan(0)
      if (entry.side === 'top') expect(dy).toBeLessThan(0)
      if (entry.side === 'right') expect(dx).toBeGreaterThan(0)
      if (entry.side === 'left') expect(dx).toBeLessThan(0)
    }
  })

  it('uses the whole radius for a single ring and keeps unreachable nodes', () => {
    const flatNodes = [
      node('taha', 'identity'),
      node('a', 'topic'),
      node('b', 'topic'),
    ]
    const flatEdges = [
      { id: 'x', source: 'taha', target: 'a' },
      { id: 'y', source: 'taha', target: 'b' },
    ]
    const flat = projectConstellation(
      { nodes: flatNodes, edges: flatEdges },
      size,
    )
    const ringed = projectConstellation(graph, size)
    expect(radius(byId(flat, 'a'))).toBeGreaterThan(
      radius(byId(ringed, 'software')),
    )
    const withIsland = projectConstellation(
      { nodes: [...flatNodes, node('island', 'topic')], edges: flatEdges },
      size,
    )
    expect(byId(withIsland, 'island').depth).toBe(2)
    expect(byId(withIsland, 'island').branch).toBeNull()
  })

  it('derives ascending orbit radii, one per ring', () => {
    const out = projectConstellation(graph, size)
    const radii = out.rings.map((ring) => ring.r)
    expect(radii.length).toBeGreaterThanOrEqual(2)
    expect([...radii].sort((a, b) => a - b)).toEqual(radii)
  })

  it('returns nothing for an empty graph instead of inventing nodes', () => {
    expect(projectConstellation({ nodes: [], edges: [] }, size)).toEqual({
      nodes: [],
      edges: [],
      rings: [],
    })
  })
})
