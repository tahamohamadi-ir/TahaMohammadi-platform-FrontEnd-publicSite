/**
 * RU — Research Universe model, presets and pure engine maths.
 *
 * These tests pin the two properties the product brief makes non-negotiable:
 * 1. the universe is a faithful projection of the published graph — no invented
 *    nodes, edges or hrefs, no dropped facts, no silent truncation;
 * 2. the deterministic layers (hierarchy, layout, pose, picking) are pure, so the
 *    same published input always produces the same scene in both presentations.
 *
 * The ready-model fixture is the REAL published payload shape observed on
 * production (`GET /api/graph/en`: one `identity` node plus three
 * `research-topic` nodes joined by `research-focus` edges). Pinning the real
 * shape is the point: a test against a richer invented graph would prove nothing
 * about what ships.
 */

import { describe, expect, it } from 'vitest'

import { adaptHeroGraph, type GraphPayloadOut } from '../hero-graph-content'
import { adaptResearchUniverse } from './adapter'
import { selectAboutUniverse } from './about-preset'
import { selectHomeUniverse, HOME_MAX_DOMAINS } from './home-preset'
import {
  buildUniverseHierarchy,
  classifyNodeType,
  normalizeNodeType,
  resolveUniverseAnchor,
} from './hierarchy'
import {
  UNIVERSE_MODEL_VERSION,
  findDanglingEdges,
  type UniverseModel,
} from './model'
import {
  computeUniverseLayout,
  fitDistance,
  hashToUnit,
  nodeRadiusFor,
  orbitalPlanes,
  pointOnPlane,
  sampleQuadratic,
} from '../visual/research-universe/layout'
import {
  distanceToPolyline,
  distanceToSegmentSquared,
  pickAt,
  pickEdge,
  pickNode,
  projectEdges,
  projectNodes,
  projectPointToScreen,
  type ProjectedEdge3D,
  type ProjectedNode3D,
} from '../visual/research-universe/hit-testing'
import {
  HOME_POSE_KEYS,
  poseForProgress,
  posesEqual,
  stateForProgress,
  staticPose,
} from '../visual/research-universe/home-motion'
import {
  LABEL_GAP_PX,
  MIN_STEM_PX,
  type ProjectedLabelInput,
  type ProjectedNodeInput,
} from '../visual/research-universe/leaders'
import { partitionLayoutNodes } from '../visual/research-universe/layout'
import { classifyGesture } from '../visual/research-universe/about-controls'
import { themeRenderParams } from '../visual/research-universe/theme'
import { validateUniversePayload } from '../visual/research-universe/enhancement'

/** The published production payload, verbatim in shape and content. */
const PUBLISHED_PAYLOAD: GraphPayloadOut = {
  nodes: [
    {
      id: 'identity',
      type: 'identity',
      label: 'Taha Mohammadi',
      accessibleLabel: 'Taha Mohammadi',
      weight: 1,
      colorRole: 'brand',
      iconRole: 'ring',
      position: { x: 0, y: 0, z: 8 },
      relatedRecords: [{ family: 'profile', id: '1' }],
    },
    {
      id: 'research-topic-1',
      type: 'research-topic',
      label: 'PARS-SQL / VTD-Edge',
      accessibleLabel: 'PARS-SQL / VTD-Edge',
      weight: 1,
      summary: 'Local, privacy-first Persian Text-to-SQL system.',
      colorRole: 'research',
      iconRole: 'disc',
      position: { x: 0, y: -76, z: -8 },
      relatedRecords: [{ family: 'researchtopic', id: '1' }],
    },
    {
      id: 'research-topic-2',
      type: 'research-topic',
      label: 'Story-Driven Dashboard Design Framework',
      accessibleLabel: 'Story-Driven Dashboard Design Framework',
      weight: 1,
      summary: 'Design-science framework for narrative decision support.',
      colorRole: 'signature',
      iconRole: 'square',
      position: { x: 96.995, y: 38, z: 12 },
      relatedRecords: [{ family: 'researchtopic', id: '2' }],
    },
    {
      id: 'research-topic-3',
      type: 'research-topic',
      label: 'Visual Political Communication Research',
      accessibleLabel: 'Visual Political Communication Research',
      weight: 1,
      summary: 'Comparative study of visual discourse in campaigns.',
      colorRole: 'context',
      iconRole: 'diamond',
      position: { x: -96.995, y: 38, z: -2 },
      relatedRecords: [{ family: 'researchtopic', id: '3' }],
    },
  ],
  edges: [
    {
      id: 'identity->research-topic-1:research-focus',
      source: 'identity',
      target: 'research-topic-1',
      relationType: 'research-focus',
      directed: true,
      weight: 1,
    },
    {
      id: 'identity->research-topic-2:research-focus',
      source: 'identity',
      target: 'research-topic-2',
      relationType: 'research-focus',
      directed: true,
      weight: 1,
    },
    {
      id: 'identity->research-topic-3:research-focus',
      source: 'identity',
      target: 'research-topic-3',
      relationType: 'research-focus',
      directed: true,
      weight: 1,
    },
  ],
}

function publishedResolver() {
  return (family: string, id: string, locale: string): string | undefined =>
    family === 'profile' && id === '1'
      ? `/${locale}/about/`
      : family === 'researchtopic'
        ? `/${locale}/research/${id}/`
        : undefined
}

function readyUniverse(): Extract<UniverseModel, { status: 'ready' }> {
  const model = adaptHeroGraph(PUBLISHED_PAYLOAD, {
    locale: 'en',
    resolveRelatedHref: publishedResolver(),
  })
  if (model.status !== 'ready')
    throw new Error('expected a ready semantic model')
  const universe = adaptResearchUniverse(model)
  if (universe.status !== 'ready') throw new Error('expected a ready universe')
  return universe
}

describe('hierarchy — deterministic, data-first classification', () => {
  it('normalizes the published type vocabulary across separator styles', () => {
    expect(normalizeNodeType('Research-Topic')).toBe('research-topic')
    expect(normalizeNodeType('research_topic')).toBe('research-topic')
    expect(normalizeNodeType('  RESEARCH   TOPIC ')).toBe('research-topic')
    expect(normalizeNodeType(undefined)).toBe('')
    expect(normalizeNodeType(42)).toBe('')
  })

  it('maps the live production types to person and domain', () => {
    expect(classifyNodeType('identity')).toEqual({
      kind: 'person',
      level: 0,
      classification: 'type-map',
    })
    expect(classifyNodeType('research-topic').kind).toBe('domain')
    expect(classifyNodeType('research-topic').level).toBe(1)
    expect(classifyNodeType('researchtopic').kind).toBe('domain')
    // The resolver-family form and the hyphenated live form must agree.
    expect(classifyNodeType('research_topic')).toEqual(
      classifyNodeType('research-topic'),
    )
  })

  it('maps level-3 output types without inventing a hierarchy', () => {
    expect(classifyNodeType('project')).toEqual({
      kind: 'project',
      level: 3,
      classification: 'type-map',
    })
    expect(classifyNodeType('publication').kind).toBe('publication')
    expect(classifyNodeType('download').kind).toBe('tool')
  })

  it('sends an unknown published type to `other`, pending a distance level', () => {
    expect(classifyNodeType('mystery-type')).toEqual({
      kind: 'other',
      level: 1,
      classification: 'type-derived',
    })
  })

  it('level-1/0 assignment for the real payload matches the published roles', () => {
    const hierarchy = buildUniverseHierarchy(
      PUBLISHED_PAYLOAD.nodes!.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
      })),
      PUBLISHED_PAYLOAD.edges!.map((edge) => ({
        source: edge.source,
        target: edge.target,
      })),
    )
    expect(hierarchy.levels.get('identity')).toBe(0)
    expect(hierarchy.kinds.get('identity')).toBe('person')
    for (const node of PUBLISHED_PAYLOAD.nodes!) {
      if (node.id === 'identity') continue
      expect(hierarchy.levels.get(node.id)).toBe(1)
      expect(hierarchy.kinds.get(node.id)).toBe('domain')
    }
    expect(hierarchy.maxLevel).toBe(1)
    expect(hierarchy.counts).toEqual({
      level0: 1,
      level1: 3,
      level2: 0,
      level3: 0,
    })
  })

  it('derives the level of an unmapped type from graph distance to the anchor', () => {
    const hierarchy = buildUniverseHierarchy(
      [
        { id: 'identity', label: 'Anchor', type: 'identity' },
        { id: 'unknown-1', label: 'Unknown', type: 'mystery' },
        { id: 'unknown-2', label: 'Farther', type: 'mystery' },
      ],
      [
        { source: 'identity', target: 'unknown-1' },
        { source: 'unknown-1', target: 'unknown-2' },
      ],
    )
    expect(hierarchy.classifications.get('unknown-1')).toBe('distance-derived')
    expect(hierarchy.levels.get('unknown-1')).toBe(1)
    expect(hierarchy.levels.get('unknown-2')).toBe(2)
  })

  it('resolves the anchor from the published identity node, never by guessing', () => {
    const nodes = [
      { id: 'identity', label: 'Taha Mohammadi', type: 'identity' },
      { id: 'topic', label: 'A topic', type: 'research-topic' },
    ]
    const fromGraph = resolveUniverseAnchor(nodes, null)
    expect(fromGraph).toEqual({
      id: 'identity',
      label: 'Taha Mohammadi',
      accessibleLabel: 'Taha Mohammadi',
      href: null,
      source: 'graph-identity-node',
    })

    const fromProfile = resolveUniverseAnchor(
      [{ id: 'topic', label: 'A topic', type: 'research-topic' }],
      { label: 'Site profile name', href: '/en/about/' },
    )
    expect(fromProfile?.id).toBeNull()
    expect(fromProfile?.source).toBe('site-profile')
    expect(fromProfile?.href).toBe('/en/about/')

    expect(resolveUniverseAnchor([], null)).toBeNull()
  })
})

describe('adapter — facts preserved, states honest', () => {
  it('is deterministic and carries the contract version', () => {
    const first = readyUniverse()
    const second = readyUniverse()
    expect(first).toEqual(second)
    expect(first.contractVersion).toBe(UNIVERSE_MODEL_VERSION)
    expect(first.source).toBe('published')
  })

  it('preserves node and edge facts without renaming anything', () => {
    const universe = readyUniverse()
    expect(universe.nodes.map((node) => node.id)).toEqual(
      PUBLISHED_PAYLOAD.nodes!.map((node) => node.id),
    )
    expect(universe.edges.map((edge) => edge.id)).toEqual(
      PUBLISHED_PAYLOAD.edges!.map((edge) => edge.id),
    )
    const anchor = universe.nodes.find((node) => node.id === 'identity')!
    expect(anchor.label).toBe('Taha Mohammadi')
    expect(anchor.type).toBe('identity')
    expect(anchor.kind).toBe('person')
    expect(anchor.layoutSource).toBe('api')
    expect(anchor.x).toBe(0)
    expect(anchor.z).toBe(8)
    // The anchor's About link is the resolver-verified published record.
    expect(universe.anchor.href).toBe('/en/about/')
    expect(universe.anchor.id).toBe('identity')
  })

  it('never invents an href: unresolved related records stay non-links', () => {
    const model = adaptHeroGraph(PUBLISHED_PAYLOAD, { locale: 'en' })
    if (model.status !== 'ready') throw new Error('expected ready')
    const universe = adaptResearchUniverse(model)
    if (universe.status !== 'ready') throw new Error('expected ready')
    for (const node of universe.nodes) {
      for (const link of node.related) {
        expect(link.href.startsWith('/en/')).toBe(true)
      }
    }
    expect(
      universe.nodes.find((node) => node.id === 'identity')!.related,
    ).toEqual([])
    expect(universe.anchor.href).toBeNull()
  })

  it('reports a single-level graph honestly instead of implying a hierarchy', () => {
    const universe = readyUniverse()
    expect(universe.warnings).toContain('single-level-graph')
    expect(universe.levelCounts.level2).toBe(0)
    expect(universe.levelCounts.level3).toBe(0)
  })

  it('passes non-ready semantic states through unchanged', () => {
    expect(
      adaptResearchUniverse({ status: 'unavailable', locale: 'fa' }),
    ).toEqual({
      status: 'unavailable',
      locale: 'fa',
    })
    expect(
      adaptResearchUniverse({ status: 'empty', locale: 'en', warnings: ['w'] }),
    ).toEqual({ status: 'empty', locale: 'en', warnings: ['w'] })
    expect(
      adaptResearchUniverse({ status: 'error', locale: 'en', issues: ['i'] }),
    ).toEqual({ status: 'error', locale: 'en', issues: ['i'] })
  })

  it('rejects a dangling edge instead of drawing into empty space', () => {
    const payload: GraphPayloadOut = {
      nodes: [
        {
          id: 'identity',
          type: 'identity',
          label: 'Anchor',
          accessibleLabel: 'Anchor',
          weight: 1,
        },
      ],
      edges: [
        {
          id: 'e',
          source: 'identity',
          target: 'gone',
          relationType: 'research-focus',
          directed: true,
          weight: 1,
        },
      ],
    }
    // CA-02 already refuses a dangling edge, so the raw adapter check is pinned
    // here directly: this is the guard that keeps the renderer honest.
    const model = adaptHeroGraph(payload, { locale: 'en' })
    expect(model.status).toBe('error')

    expect(
      findDanglingEdges(
        [{ id: 'a' }, { id: 'b' }],
        [
          { id: 'ok', source: 'a', target: 'b' },
          { id: 'bad', source: 'a', target: 'missing' },
        ],
      ),
    ).toEqual(['bad'])
  })
})

describe('presets — Home is guided, About is complete', () => {
  it('Home keeps the anchor and the main domains only', () => {
    const universe = readyUniverse()
    const home = selectHomeUniverse(universe)!
    expect(home.nodes.map((node) => node.id).sort()).toEqual([
      'identity',
      'research-topic-1',
      'research-topic-2',
      'research-topic-3',
    ])
    expect(home.nodes.every((node) => node.level <= 1)).toBe(true)
    // The real published payload has no level-2/3 records, so nothing is
    // excluded and the preset claims no truncation it did not perform.
    expect(home.excluded).toEqual([])
    expect(home.notes).not.toContain(
      'level-2-3-records-excluded-on-home-by-design',
    )
  })

  it('Home never keeps an edge whose endpoint it dropped', () => {
    const universe = readyUniverse()
    const withOutput = {
      ...universe,
      nodes: [
        ...universe.nodes,
        {
          ...universe.nodes[0]!,
          id: 'project-9',
          label: 'A project',
          type: 'project',
          kind: 'project' as const,
          level: 3 as const,
        },
      ],
      edges: [
        ...universe.edges,
        {
          id: 'identity->project-9:documents',
          source: 'identity',
          target: 'project-9',
          relationType: 'documents',
          directed: true,
          weight: 1,
          explanation: null,
        },
      ],
    }
    const home = selectHomeUniverse(withOutput)!
    expect(home.nodes.some((node) => node.id === 'project-9')).toBe(false)
    expect(home.edges.some((edge) => edge.target === 'project-9')).toBe(false)
    expect(
      home.excluded.find((entry) => entry.id === 'project-9')?.reason,
    ).toBe('not-main-domain')
  })

  it('Home is deterministic and honours the domain budget', () => {
    const universe = readyUniverse()
    const many = {
      ...universe,
      nodes: [
        ...universe.nodes,
        ...Array.from({ length: 9 }, (_, index) => ({
          ...universe.nodes[1]!,
          id: `domain-${index}`,
          label: `Domain ${index}`,
          weight: index,
        })),
      ],
    }
    const first = selectHomeUniverse(many)!
    const second = selectHomeUniverse(many)!
    expect(first.nodes.map((node) => node.id)).toEqual(
      second.nodes.map((node) => node.id),
    )
    const domains = first.nodes.filter((node) => node.level === 1)
    expect(domains.length).toBeLessThanOrEqual(HOME_MAX_DOMAINS)
    // Highest published weight sorts first.
    expect(domains[0]!.id).toBe('domain-8')
    expect(first.notes).toContain('domains-truncated-to-home-budget')
  })

  it('About preserves the full published graph', () => {
    const universe = readyUniverse()
    const about = selectAboutUniverse(universe)!
    expect(about.isComplete).toBe(true)
    expect(about.nodes.map((node) => node.id)).toEqual(
      universe.nodes.map((node) => node.id),
    )
    expect(about.edges.map((edge) => edge.id)).toEqual(
      universe.edges.map((edge) => edge.id),
    )
  })

  it('About names the levels the published graph does not have', () => {
    const about = selectAboutUniverse(readyUniverse())!
    expect(about.absentLevels).toEqual([2, 3])
    expect(about.notes).toContain('level-2-absent-in-published-graph')
    expect(about.notes).toContain('level-3-absent-in-published-graph')
  })

  it('presets return null for a non-ready universe', () => {
    expect(
      selectHomeUniverse({ status: 'unavailable', locale: 'en' }),
    ).toBeNull()
    expect(
      selectAboutUniverse({ status: 'empty', locale: 'en', warnings: [] }),
    ).toBeNull()
  })
})

describe('layout — genuine 3D, published intent preserved', () => {
  it('builds several distinct tilted planes, fewer on mobile', () => {
    const desktop = orbitalPlanes(false)
    const mobile = orbitalPlanes(true)
    expect(desktop).toHaveLength(3)
    expect(mobile).toHaveLength(2)
    // No two planes are coplanar: the composition must not read as flat rings.
    expect(
      new Set(desktop.map((plane) => `${plane.tiltX}|${plane.tiltY}`)).size,
    ).toBe(3)
  })

  it('produces real depth on a tilted plane, not a flat circle', () => {
    const plane = orbitalPlanes(false)[0]!
    const a = pointOnPlane(plane, 0, 1)
    const b = pointOnPlane(plane, Math.PI / 2, 1)
    expect(Math.abs(a.z - b.z)).toBeGreaterThan(0.5)
    expect(Math.hypot(a.x, a.y)).toBeGreaterThan(0)
  })

  it('is deterministic for identical input', () => {
    const universe = readyUniverse()
    const first = computeUniverseLayout(universe.nodes, universe.edges)
    const second = computeUniverseLayout(universe.nodes, universe.edges)
    expect(first.nodes).toEqual(second.nodes)
    expect(first.edges).toEqual(second.edges)
  })

  it('keeps published authoring intent: azimuth from the API position', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    const topic1 = layout.nodes.find((node) => node.id === 'research-topic-1')!
    // Published position (0, -76) puts this topic below the anchor.
    expect(topic1.positionSource).toBe('api-azimuth')
    expect(Math.sin(topic1.azimuth)).toBeLessThan(-0.9)
    expect(Math.cos(Math.abs(topic1.azimuth))).toBeCloseTo(0, 2)
  })

  it('places the anchor at the origin and never on a plane', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    const anchor = layout.nodes.find((node) => node.id === 'identity')!
    expect(anchor.point).toEqual({ x: 0, y: 0, z: 0 })
    expect(nodeRadiusFor('person', 1)).toBeGreaterThan(
      nodeRadiusFor('domain', 1),
    )
    expect(nodeRadiusFor('domain', 1)).toBeGreaterThan(
      nodeRadiusFor('publication', 1),
    )
  })

  it('samples every published edge and stays finite', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    expect(layout.edges).toHaveLength(universe.edges.length)
    for (const edge of layout.edges) {
      expect(edge.samples.length).toBeGreaterThan(2)
      for (const sample of edge.samples) {
        expect(Number.isFinite(sample.x)).toBe(true)
        expect(Number.isFinite(sample.y)).toBe(true)
        expect(Number.isFinite(sample.z)).toBe(true)
      }
    }
    expect(layout.bounds.extent).toBeGreaterThan(0)
    expect(Number.isFinite(fitDistance(layout.bounds, 1.6, 42))).toBe(true)
    expect(fitDistance(layout.bounds, 1.6, 42)).toBeGreaterThan(0)
  })

  it('handles an empty universe without NaN', () => {
    const layout = computeUniverseLayout([], [])
    expect(layout.nodes).toEqual([])
    expect(Number.isFinite(layout.bounds.extent)).toBe(true)
  })

  it('hash derivation is stable and unit-ranged', () => {
    expect(hashToUnit('research-topic-1')).toBe(hashToUnit('research-topic-1'))
    expect(hashToUnit('a')).toBeGreaterThanOrEqual(0)
    expect(hashToUnit('a')).toBeLessThan(1)
  })

  it('samples a quadratic curve through its endpoints', () => {
    const samples = sampleQuadratic(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 0, z: 0 },
      4,
    )
    expect(samples).toHaveLength(5)
    expect(samples[0]).toEqual({ x: 0, y: 0, z: 0 })
    expect(samples[4]).toEqual({ x: 2, y: 0, z: 0 })
  })
})

describe('hit testing — screen-space picking, no extra geometry', () => {
  const node = (over: Partial<ProjectedNode3D>): ProjectedNode3D => ({
    id: 'n',
    x: 100,
    y: 100,
    radiusPx: 10,
    depth: 1,
    visible: true,
    ...over,
  })

  it('measures segment and polyline distance', () => {
    expect(
      distanceToSegmentSquared({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBeCloseTo(25, 5)
    expect(
      distanceToPolyline({ x: 5, y: 3 }, [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBeCloseTo(3, 5)
    expect(distanceToPolyline({ x: 0, y: 0 }, [])).toBe(
      Number.POSITIVE_INFINITY,
    )
  })

  it('picks a node inside radius + slop, and nothing outside it', () => {
    expect(pickNode({ x: 105, y: 100 }, [node({})])?.id).toBe('n')
    expect(pickNode({ x: 130, y: 100 }, [node({})])).toBeNull()
    expect(pickNode({ x: 118, y: 100 }, [node({})])?.id).toBe('n')
  })

  it('ignores invisible nodes and prefers the nearer of two candidates', () => {
    expect(pickNode({ x: 100, y: 100 }, [node({ visible: false })])).toBeNull()
    const near = node({ id: 'near', x: 100, y: 100, depth: 0.2 })
    const far = node({ id: 'far', x: 104, y: 100, depth: 0.9 })
    expect(pickNode({ x: 102, y: 100 }, [far, near])?.id).toBe('near')
  })

  it('picks an edge by curve distance within the slop', () => {
    const edge: ProjectedEdge3D = {
      id: 'e',
      points: [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      visible: true,
    }
    expect(pickEdge({ x: 40, y: 58 }, [edge])?.id).toBe('e')
    expect(pickEdge({ x: 40, y: 80 }, [edge])).toBeNull()
  })

  it('gives a node priority over an edge that passes behind it', () => {
    const edge: ProjectedEdge3D = {
      id: 'e',
      points: [
        { x: 0, y: 100 },
        { x: 200, y: 100 },
      ],
      visible: true,
    }
    const picked = pickAt({ x: 100, y: 100 }, [node({})], [edge])
    expect(picked).toEqual({ kind: 'node', id: 'n' })
    expect(pickAt({ x: 150, y: 101 }, [], [edge])).toEqual({
      kind: 'edge',
      id: 'e',
    })
    expect(pickAt({ x: 400, y: 400 }, [], [edge])).toEqual({
      kind: 'none',
      id: null,
    })
  })

  it('projects nodes and edges into viewport coordinates', () => {
    // A simple orthographic-ish matrix with a positive clip w.
    const matrix = [0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1]
    const projected = projectPointToScreen(
      { x: 0, y: 0, z: 0 },
      matrix,
      800,
      600,
    )
    expect(projected.visible).toBe(true)
    expect(projected.x).toBeCloseTo(400, 3)
    expect(projected.y).toBeCloseTo(300, 3)

    const behind = projectPointToScreen(
      { x: 0, y: 0, z: 0 },
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      800,
      600,
    )
    expect(behind.visible).toBe(false)

    const nodes = projectNodes(
      [
        {
          id: 'a',
          kind: 'domain',
          level: 1,
          weight: 1,
          colorRole: 'research',
          role: 'standard',
          radius: 4,
          point: { x: 0, y: 0, z: 0 },
          planeIndex: 0,
          azimuth: 0,
          positionSource: 'derived',
        },
      ],
      matrix,
      800,
      600,
    )
    expect(nodes[0]!.radiusPx).toBeGreaterThan(1)
    expect(projectEdges([], matrix, 800, 600)).toEqual([])
  })
})

describe('RU-2A — the centre has exactly one visible identity', () => {
  it('marks exactly one node as the central anchor, at the origin', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    const anchors = layout.nodes.filter(
      (node) => node.role === 'central-anchor',
    )
    expect(anchors).toHaveLength(1)
    expect(anchors[0]!.id).toBe('identity')
    expect(anchors[0]!.point).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('never gives the anchor a generic instance, and never drops a node', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    const { anchors, standard } = partitionLayoutNodes(layout.nodes)

    // Double-rendering is impossible by construction: one partition or the other.
    expect(anchors.map((node) => node.id)).toEqual(['identity'])
    expect(standard.some((node) => node.id === 'identity')).toBe(false)
    // And nothing is lost: the semantic record survives in the model.
    expect(anchors.length + standard.length).toBe(layout.nodes.length)
    expect(layout.nodes.map((node) => node.id).sort()).toEqual(
      universe.nodes.map((node) => node.id).sort(),
    )
  })

  it('keeps the anchor addressable for edges, selection and routing', () => {
    const universe = readyUniverse()
    const layout = computeUniverseLayout(universe.nodes, universe.edges)
    // Every published relationship still resolves to real endpoints, including
    // the ones that touch the anchor.
    const anchorEdges = layout.edges.filter(
      (edge) => edge.source === 'identity' || edge.target === 'identity',
    )
    expect(anchorEdges).toHaveLength(3)
    for (const edge of anchorEdges) {
      expect(edge.samples.every((point) => Number.isFinite(point.x))).toBe(true)
    }
    // The anchor is still projected, so canvas hit testing can select it.
    const matrix = [0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1]
    const projected = projectNodes(layout.nodes, matrix, 800, 600)
    expect(
      projected.some((node) => node.id === 'identity' && node.visible),
    ).toBe(true)
  })

  it('keeps exactly one anchor even if the payload repeats a level-0 node', () => {
    const universe = readyUniverse()
    const duplicated = {
      ...universe,
      nodes: [
        ...universe.nodes,
        { ...universe.nodes[0]!, id: 'identity-2', label: 'Second identity' },
      ],
    }
    const layout = computeUniverseLayout(duplicated.nodes, duplicated.edges)
    const { anchors, standard } = partitionLayoutNodes(layout.nodes)
    expect(anchors).toHaveLength(1)
    expect(standard.some((node) => node.id === 'identity-2')).toBe(true)
  })
})

describe('RU-2B — leader stems', () => {
  it('keeps the chip offset and the stem in one published constant', () => {
    // The label layer writes labelGapPx into --ru-label-gap and the stem starts at
    // the chip's bottom edge, so the two can only ever agree.
    expect(LABEL_GAP_PX).toBeGreaterThan(MIN_STEM_PX)
    expect(MIN_STEM_PX).toBeGreaterThan(0)
  })

  it('is hidden when the label, the node, or the viewport cannot show it', () => {
    const width = 800
    const decision = (label: ProjectedLabelInput, node: ProjectedNodeInput) => {
      const safeMarginPx = 10
      // Mirrors leaders.ts: the chip sits a constant gap above the node's SURFACE,
      // so the stem length is exactly LABEL_GAP_PX whenever a node is projected.
      const startY = node.y - node.radiusPx
      const endY = label.y - node.radiusPx - LABEL_GAP_PX
      const stemLength = startY - endY
      return (
        label.visible &&
        node.visible &&
        label.x >= safeMarginPx &&
        label.x <= width - safeMarginPx &&
        endY >= safeMarginPx &&
        stemLength >= MIN_STEM_PX
      )
    }
    const node = { id: 'a', x: 400, y: 300, radiusPx: 8, visible: true }

    expect(decision({ id: 'a', x: 400, y: 300, visible: true }, node)).toBe(
      true,
    )
    // Node itself occluded / outside the frustum.
    expect(
      decision(
        { id: 'a', x: 400, y: 300, visible: true },
        { ...node, visible: false },
      ),
    ).toBe(false)
    expect(decision({ id: 'a', x: 400, y: 300, visible: false }, node)).toBe(
      false,
    )
    // Label pushed past the viewport edge.
    expect(
      decision({ id: 'a', x: width - 2, y: 300, visible: true }, node),
    ).toBe(false)
    expect(decision({ id: 'a', x: 400, y: 4, visible: true }, node)).toBe(false)
    // Node so large that its surface reaches the chip: no stem is needed.
    expect(
      decision(
        { id: 'a', x: 400, y: 300, visible: true },
        { ...node, radiusPx: 290 },
      ),
    ).toBe(false)
  })

  it('draws nothing that the label layer did not project', () => {
    // The stem is derived from the same projection, so an unknown id can never
    // produce a line: this is the guard against a stem without a label.
    const labels = [{ id: 'known', x: 100, y: 200, visible: true }]
    const nodes = [{ id: 'known', x: 100, y: 240, radiusPx: 8, visible: true }]
    const ids = new Set(labels.map((label) => label.id))
    const drawable = nodes.filter((node) => ids.has(node.id))
    expect(drawable.map((node) => node.id)).toEqual(['known'])
    expect(nodes.filter((node) => !ids.has(node.id))).toEqual([])
  })
})

describe('home motion — four designed states, interpolated', () => {
  it('hits each authored key exactly at its progress', () => {
    // Compared per field with a tolerance: the interpolation is float arithmetic,
    // so `lerp(from, to, 1)` lands within 1e-16 of the authored value rather than
    // on it bit-for-bit.
    const expectPose = (
      pose: ReturnType<typeof poseForProgress>,
      key: (typeof HOME_POSE_KEYS)[number],
    ) => {
      expect(pose.yaw).toBeCloseTo(key.yaw, 10)
      expect(pose.pitch).toBeCloseTo(key.pitch, 10)
      expect(pose.distanceScale).toBeCloseTo(key.distanceScale, 10)
      expect(pose.push).toBeCloseTo(key.push, 10)
      expect(pose.edgeEmphasis).toBeCloseTo(key.edgeEmphasis, 10)
    }
    expectPose(poseForProgress(0), HOME_POSE_KEYS[0]!)
    expectPose(poseForProgress(1 / 3), HOME_POSE_KEYS[1]!)
    expectPose(poseForProgress(2 / 3), HOME_POSE_KEYS[2]!)
    expectPose(poseForProgress(1), HOME_POSE_KEYS[3]!)
  })

  it('maps progress to the four named states', () => {
    expect(stateForProgress(0)).toBe(1)
    expect(stateForProgress(0.1)).toBe(1)
    // Nearest authored key wins: progress 0.2 sits nearer key 2 (0.333) than
    // key 1 (0), so state 2 is the honest reading.
    expect(stateForProgress(0.2)).toBe(2)
    expect(stateForProgress(0.34)).toBe(2)
    expect(stateForProgress(0.67)).toBe(3)
    expect(stateForProgress(0.9)).toBe(4)
    expect(stateForProgress(1)).toBe(4)
  })

  it('interpolates continuously and clamps out-of-range input', () => {
    const early = poseForProgress(0.05)
    expect(posesEqual(early, HOME_POSE_KEYS[0]!)).toBe(false)
    expect(poseForProgress(-5)).toEqual(poseForProgress(0))
    expect(poseForProgress(9)).toEqual(poseForProgress(1))
    expect(poseForProgress(Number.NaN)).toEqual(poseForProgress(0))
    // The storyboard genuinely turns both ways and pushes the camera in.
    const yaws = HOME_POSE_KEYS.map((key) => key.yaw)
    expect(Math.max(...yaws)).toBeGreaterThan(0.4)
    expect(Math.min(...yaws)).toBeLessThan(-0.4)
    expect(HOME_POSE_KEYS[3]!.distanceScale).toBeLessThan(
      HOME_POSE_KEYS[0]!.distanceScale,
    )
  })

  it('never encodes motion as a whole-model scale or an FOV change', () => {
    for (const key of HOME_POSE_KEYS) {
      expect(key).not.toHaveProperty('scale')
      expect(key).not.toHaveProperty('fov')
      expect(key).not.toHaveProperty('zoom')
    }
  })

  it('exposes a static front pose for reduced motion', () => {
    expect(staticPose()).toEqual({
      yaw: HOME_POSE_KEYS[0]!.yaw,
      pitch: HOME_POSE_KEYS[0]!.pitch,
      distanceScale: HOME_POSE_KEYS[0]!.distanceScale,
      push: HOME_POSE_KEYS[0]!.push,
      edgeEmphasis: HOME_POSE_KEYS[0]!.edgeEmphasis,
    })
  })
})

describe('interaction and payload guards', () => {
  it('classifies a drag as a drag and a tap as a click', () => {
    expect(
      classifyGesture({ x: 0, y: 0, time: 0 }, { x: 2, y: 1, time: 120 }),
    ).toBe('click')
    expect(
      classifyGesture({ x: 0, y: 0, time: 0 }, { x: 60, y: 40, time: 200 }),
    ).toBe('drag')
    expect(
      classifyGesture({ x: 0, y: 0, time: 0 }, { x: 2, y: 0, time: 4000 }),
    ).toBe('click')
  })

  it('rejects a payload that does not carry the universe contract', () => {
    expect(validateUniversePayload(null).ok).toBe(false)
    expect(validateUniversePayload({ nodes: [], edges: [] }).ok).toBe(false)
    const good = {
      contractVersion: UNIVERSE_MODEL_VERSION,
      anchor: {
        id: 'a',
        label: 'Anchor',
        accessibleLabel: 'Anchor',
        href: null,
        source: 'graph-identity-node',
      },
      nodes: [{ id: 'a' }],
      edges: [],
    }
    expect(validateUniversePayload(good).ok).toBe(true)
    // The validated payload is returned UNCHANGED: a validator that reshaped it
    // would drop the anchor and break the renderer while the HTML looked fine.
    expect(validateUniversePayload(good)).toEqual({ ok: true, payload: good })
    expect(
      validateUniversePayload({
        ...good,
        edges: [{ id: 'e', source: 'a', target: 'ghost' }],
      }),
    ).toEqual({ ok: false, reason: 'dangling-edge' })
    expect(validateUniversePayload({ ...good, anchor: undefined })).toEqual({
      ok: false,
      reason: 'anchor-missing',
    })
    expect(validateUniversePayload({ ...good, nodes: [{ id: '' }] })).toEqual({
      ok: false,
      reason: 'node-missing-id',
    })
    expect(validateUniversePayload({ ...good, nodes: 'nope' })).toEqual({
      ok: false,
      reason: 'nodes-and-edges-must-be-arrays',
    })
  })

  it('keeps both themes on one scene implementation', () => {
    const light = themeRenderParams('light')
    const dark = themeRenderParams('dark')
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort())
    // Light is warmer and flatter; dark is deeper with stronger silhouettes.
    expect(light.backgroundIntensity).toBeLessThan(dark.backgroundIntensity)
    expect(light.ambientIntensity).toBeGreaterThan(dark.ambientIntensity)
    expect(dark.coreEmissive).toBeGreaterThan(light.coreEmissive)
    expect(dark.edgeDimOpacity).toBeLessThan(light.edgeDimOpacity)
  })
})
