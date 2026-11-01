import { describe, expect, it } from 'vitest'
import { projectConstellation, type ConstellationInput } from './home-hero-v3'

const graph: ConstellationInput = {
  nodes: [
    {
      id: 'identity',
      label: 'Taha Mohammadi',
      type: 'identity',
      colorRole: 'brand',
      layout: { x: 0, y: 0 },
      related: [{ href: '/en/about/' }],
    },
    {
      id: 'topic-1',
      label: 'PARS-SQL',
      type: 'research-topic',
      colorRole: 'research',
      layout: { x: 0, y: -76 },
      related: [{ href: '/en/research/pars-sql/' }],
    },
    {
      id: 'topic-2',
      label: 'Dashboards',
      type: 'research-topic',
      colorRole: 'signature',
      layout: { x: 97, y: 38 },
      related: [],
    },
    {
      id: 'topic-3',
      label: 'Visual communication',
      type: 'research-topic',
      colorRole: 'context',
      layout: { x: -97, y: 38 },
      related: [{ href: '/en/research/visual/' }],
    },
  ],
  edges: [
    { id: 'e1', source: 'identity', target: 'topic-1' },
    { id: 'e2', source: 'identity', target: 'topic-2' },
    { id: 'e3', source: 'identity', target: 'topic-3' },
    { id: 'ghost', source: 'identity', target: 'not-published' },
  ],
}

const size = { width: 600, height: 520, padding: 64 }

describe('projectConstellation', () => {
  it('centres the identity node and keeps every node inside the padded frame', () => {
    const out = projectConstellation(graph, size)
    const core = out.nodes.find((node) => node.core)
    expect(core?.id).toBe('identity')
    expect(core?.x).toBeCloseTo(300)
    expect(core?.y).toBeCloseTo(260)
    for (const node of out.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(size.padding)
      expect(node.x).toBeLessThanOrEqual(size.width - size.padding)
      expect(node.y).toBeGreaterThanOrEqual(size.padding)
      expect(node.y).toBeLessThanOrEqual(size.height - size.padding)
    }
  })

  it('flips the API y axis so positive y renders above the centre', () => {
    const out = projectConstellation(graph, size)
    const below = out.nodes.find((node) => node.id === 'topic-1')
    const above = out.nodes.find((node) => node.id === 'topic-2')
    expect(below!.y).toBeGreaterThan(260)
    expect(above!.y).toBeLessThan(260)
    expect(below!.side).toBe('bottom')
    expect(above!.side).toBe('top')
  })

  it('places a label beside a node only when it sits level with the centre', () => {
    const out = projectConstellation(
      {
        nodes: [
          graph.nodes[0]!,
          { ...graph.nodes[2]!, id: 'level', layout: { x: 97, y: 4 } },
        ],
        edges: [],
      },
      size,
    )
    expect(out.nodes.find((node) => node.id === 'level')?.side).toBe('right')
  })

  it('draws only edges whose two endpoints are published nodes', () => {
    const out = projectConstellation(graph, size)
    expect(out.edges.map((edge) => edge.id)).toEqual(['e1', 'e2', 'e3'])
    for (const edge of out.edges) expect(edge.d).toMatch(/^M[\d.]+ [\d.]+ Q/)
  })

  it('links a node only when a resolved href exists', () => {
    const out = projectConstellation(graph, size)
    expect(out.nodes.find((node) => node.id === 'topic-1')?.href).toBe(
      '/en/research/pars-sql/',
    )
    expect(out.nodes.find((node) => node.id === 'topic-2')?.href).toBeNull()
  })

  it('exposes percentage anchors for the HTML label layer', () => {
    const out = projectConstellation(graph, size)
    const core = out.nodes.find((node) => node.core)
    expect(core?.left).toBeCloseTo(50)
    expect(core?.top).toBeCloseTo(50)
  })

  it('derives ascending orbit radii from real node distances', () => {
    const out = projectConstellation(graph, size)
    expect(out.rings.length).toBeGreaterThanOrEqual(2)
    const radii = out.rings.map((ring) => ring.r)
    expect([...radii].sort((a, b) => a - b)).toEqual(radii)
  })

  it('returns nothing for an empty graph instead of inventing nodes', () => {
    const out = projectConstellation({ nodes: [], edges: [] }, size)
    expect(out).toEqual({ nodes: [], edges: [], rings: [] })
  })
})
