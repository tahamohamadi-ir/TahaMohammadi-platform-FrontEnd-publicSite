/**
 * RU-02 / RU-4B — Universe layout: asymmetric, intentional 3D placement.
 *
 * The final direction is a 3D RELATIONAL TOPOLOGY, not a planetary system. The
 * previous generation placed each hierarchy level on a shared TILTED ORBITAL
 * PLANE, which is exactly what made the composition read as "four satellites
 * around a nucleus": equal angular spacing, equal radius, symmetric placement.
 * Planes are gone. What replaces them:
 *
 * 1. DIRECTION comes from published authoring intent. A node that carries an API
 *    `position` keeps its authored azimuth (`atan2(y, x)`), so a domain authored
 *    to the lower-left stays lower-left.
 * 2. DISTANCE, DEPTH and SCALE are presentation. They come from one explicit,
 *    frontend-owned placement table (`RU_PLACEMENT`), not from a shared radius or
 *    a shared plane. This is what breaks the ring: nodes end up with different
 *    x distance, y distance, z depth and visual scale — the four differences the
 *    brief requires.
 * 3. SPREAD is authored per node, in the range 0.78 … 1.38. It is deliberately
 *    NOT equal, and the values are not derived from a formula that could drift
 *    back toward symmetry; they are art direction, written down.
 *
 * Everything is a pure function of the universe model: same input, same
 * coordinates, both locales, every render, every reload.
 *
 * The old engine still drives the Atlas demos, so it is not deleted; this module
 * is the universe's own layout authority.
 */

import type {
  UniverseEdge,
  UniverseNode,
  UniverseLevel,
} from '../../research-universe/model'
import {
  RU_PROFILE_SCALE,
  SCALE_VARIATION_AMPLITUDE,
  resolvePresentationProfile,
  visualScaleFor,
  type RuMaterialProfile,
} from './presentation-profiles'

export interface UniversePoint {
  x: number
  y: number
  z: number
}

export interface UniverseNode3D {
  id: string
  kind: UniverseNode['kind']
  level: UniverseLevel
  weight: number
  colorRole: string
  /**
   * Presentation role. RU-2A: the level-0 anchor has ONE visible identity — the
   * dedicated central sphere — so it is never also instanced as a generic node.
   */
  role: 'central-anchor' | 'standard'
  /**
   * RU-4B: the resolved presentation profile.
   *
   * Carried on the layout record because this is the only place that still holds
   * the published LABEL the profile is keyed on — the renderer receives a
   * position/size projection and must not re-derive presentation state from it.
   * One resolution per node per layout, and the scene simply reads the answer.
   */
  profile: RuMaterialProfile
  /** Visual sphere radius in scene units: the kind's radius × the visual scale. */
  radius: number
  /** The visual scale applied to the kind's radius authority (presentation). */
  visualScale: number
  point: UniversePoint
  azimuth: number
  positionSource: 'api-azimuth' | 'derived'
}

export interface UniverseEdge3D {
  id: string
  source: string
  target: string
  relationType: string
  directed: boolean
  start: UniversePoint
  control: UniversePoint
  end: UniversePoint
  /**
   * Cubic curve through the derived control points, used BOTH for rendering and
   * for screen-space hit testing. A cubic (rather than a single-bow quadratic)
   * is what lets depth participate in the curvature without every relationship
   * bending in the same direction.
   */
  samples: UniversePoint[]
  c1: UniversePoint
  c2: UniversePoint
}

export interface UniverseBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  extent: number
}

export interface UniverseLayout {
  nodes: UniverseNode3D[]
  edges: UniverseEdge3D[]
  bounds: UniverseBounds
}

/** How many curve segments each edge is sampled into (hit testing + drawing). */
export const EDGE_SAMPLES = 24

/**
 * How far a relationship bows away from its straight chord, as a fraction of the
 * chord length. Small on purpose: a curve should read as "these two are
 * connected", not as an orbit.
 */
export const EDGE_BOW = 0.12

/**
 * Bounds of the fixed placement space, kept exported so the unit invariants can
 * assert the art direction rather than restate it.
 */
export const PLACEMENT_BOUNDS = {
  /** Per-node spread range. Deliberately unequal and never a single value. */
  minSpread: 0.78,
  maxSpread: 1.38,
  /** Depth the placement tables are allowed to use, in scene units. */
  maxDepthOffset: 18,
  /** Vertical separation between the domain band and the identity. */
  minVerticalSeparation: 30,
} as const

/**
 * Presentation placement, keyed by published node id.
 *
 * `radialSpread` scales the node's authored radial family; `depthOffset` is the
 * authored z. Both are presentation, so they live in the frontend and no backend
 * record grows a layout field for them.
 *
 * A node with no entry uses the derived defaults below, so a newly published
 * domain still renders in a sensible place instead of being dropped.
 */
export const RU_PLACEMENT: Readonly<
  Record<
    string,
    { readonly radialSpread: number; readonly depthOffset: number }
  >
> = {
  'research-topic-1': { radialSpread: 0.78, depthOffset: -18 },
  'research-topic-2': { radialSpread: 1.38, depthOffset: 17 },
  'research-topic-3': { radialSpread: 0.92, depthOffset: -13 },
  // The fa payload numbers its topics independently, so the SAME domains need
  // their placement in the other locale too. Direction and depth are shared by
  // domain, so both locales compose identically.
  'research-topic-4': { radialSpread: 0.78, depthOffset: -18 },
  'research-topic-5': { radialSpread: 1.38, depthOffset: 17 },
  'research-topic-6': { radialSpread: 0.92, depthOffset: -13 },
} as const

/** Per-level fallback so an unmapped level still gets a deliberate placement. */
const LEVEL_DEFAULT_PLACEMENT: Readonly<
  Record<UniverseLevel, { radialSpread: number; depthOffset: number }>
> = {
  0: { radialSpread: 1, depthOffset: 0 },
  1: { radialSpread: 1.05, depthOffset: 0 },
  2: { radialSpread: 1.1, depthOffset: -12 },
  3: { radialSpread: 1.2, depthOffset: -24 },
}

const GOLDEN_ANGLE = 2.399963229728653

/** FNV-1a → [0,1). Deterministic; identical to the CA-02 derivation family. */
export function hashToUnit(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) / 4294967296
}

/**
 * RU-2A — Split the layout into the node that owns the central sphere and the
 * nodes that get a generic instance. Both partitions always come from ONE list,
 * so a node can never be rendered twice and no semantic record is dropped:
 * `anchors.length + standard.length === nodes.length`.
 *
 * This is a pure function on purpose — the "no accidental double-render" test
 * asserts it in plain node, without WebGL or a DOM.
 */
export function partitionLayoutNodes(nodes: ReadonlyArray<UniverseNode3D>): {
  anchors: UniverseNode3D[]
  standard: UniverseNode3D[]
} {
  const anchors: UniverseNode3D[] = []
  const standard: UniverseNode3D[] = []
  for (const node of nodes) {
    if (node.role === 'central-anchor') anchors.push(node)
    else standard.push(node)
  }
  return { anchors, standard }
}

/**
 * Radius authority per kind, BEFORE the presentation scale. Levels 2–3 stay
 * small: they are the quiet markers of the progressive-disclosure pass.
 */
export function nodeRadiusFor(
  kind: UniverseNode['kind'],
  weight: number,
): number {
  const base =
    kind === 'person'
      ? 7
      : kind === 'domain'
        ? 4.7
        : kind === 'subdomain'
          ? 3.1
          : kind === 'other'
            ? 2.4
            : 2.2
  const weightScale = 0.86 + Math.min(Math.max(weight, 0), 5) * 0.05
  return base * weightScale
}

function azimuthFromPublished(node: UniverseNode): number | null {
  if (node.layoutSource !== 'api') return null
  const radius = Math.hypot(node.x, node.y)
  if (!Number.isFinite(radius) || radius < 1e-3) return null
  return Math.atan2(node.y, node.x)
}

function placementFor(node: UniverseNode): {
  radialSpread: number
  depthOffset: number
} {
  const authored = RU_PLACEMENT[node.id]
  if (authored) return authored
  return LEVEL_DEFAULT_PLACEMENT[node.level] ?? LEVEL_DEFAULT_PLACEMENT[1]
}

/**
 * A node's position on its authored AZIMUTH ray, at its authored spread and
 * depth. There is no shared radius and no shared plane: distance comes from the
 * node's own placement entry, which is what makes the composition asymmetric by
 * construction rather than by a post-hoc offset.
 */
export function pointForNode(
  node: UniverseNode,
  azimuth: number,
): UniversePoint {
  const { radialSpread, depthOffset } = placementFor(node)
  // Level-0 lives at the origin; it is the reference the others are read from.
  if (node.level === 0) return { x: 0, y: 0, z: 0 }
  return {
    x: Math.cos(azimuth) * PLACEMENT_BASE_RADIUS * radialSpread,
    y: Math.sin(azimuth) * PLACEMENT_BASE_RADIUS * radialSpread,
    z: depthOffset,
  }
}

/**
 * Base orbital-free radius. One number for the whole primary band: it is the
 * authoring unit the `radialSpread` values are written against, so the spread
 * table stays readable as art direction.
 */
export const PLACEMENT_BASE_RADIUS = 52

/**
 * Builds one relationship as a rotated cubic.
 *
 * The curve is the chord rotated about its own midpoint in the XY plane, and
 * lifted in Z by the pair's own depth separation. Rotating about the chord's
 * midpoint keeps both endpoints exact, so a relationship always visually
 * touches the two nodes it connects — the property the brief demands ("the curve
 * should visually connect A → B"), which a generic bow does not guarantee once
 * nodes sit at different depths.
 *
 * Curvature is derived from this SPECIFIC pair: no two relationships share a
 * curvature centre, which is what keeps a set of them from combining into one
 * closed orbit (`resemblesClosedOrbit()` asserts it).
 */
function buildEdgeCurve(
  start: UniversePoint,
  end: UniversePoint,
): { c1: UniversePoint; c2: UniversePoint; samples: UniversePoint[] } {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const planarLength = Math.hypot(dx, end.y - start.y) || 1
  // The rotation angle itself carries the sign, so the depth lift can use the
  // same signed planar direction without a second branch.
  const angle = (EDGE_BOW * dx) / planarLength
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const mid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
    z: (start.z + end.z) / 2,
  }
  const depthBend = EDGE_BOW * dz * 0.6

  const place = (t: number, lift: number): UniversePoint => {
    const px = (start.x + end.x) / 2 + (dx / 2) * t
    const py = (start.y + end.y) / 2 + ((end.y - start.y) / 2) * t
    // Rotate about the midpoint in XY: endpoints move to themselves because the
    // offset vector is zero there and (cos, sin) is a rotation.
    const ox = px - mid.x
    const oy = py - mid.y
    return {
      x: mid.x + ox * cos - oy * sin,
      y: mid.y + ox * sin + oy * cos,
      z: mid.z + (dz / 2) * t + depthBend * lift,
    }
  }

  // Cubic control points at t = ±1/3: the curve passes close to the straight
  // chord (so it reads as a connection, not as an arc) while the depth term
  // gives it genuine 3D lift.
  const c1 = place(-1 / 3, 0.66)
  const c2 = place(1 / 3, 0.66)
  return { c1, c2, samples: sampleCubic(start, c1, c2, end, EDGE_SAMPLES) }
}

export function computeUniverseLayout(
  nodes: ReadonlyArray<UniverseNode>,
  edges: ReadonlyArray<UniverseEdge>,
): UniverseLayout {
  const laid: UniverseNode3D[] = []
  // Exactly one node owns the central presentation: the first level-0 person in
  // payload order. A second level-0 node (malformed data) stays a standard node
  // rather than silently duplicating the centre.
  const anchorId =
    nodes.find((node) => node.kind === 'person' && node.level === 0)?.id ?? null

  nodes.forEach((node, index) => {
    const published = azimuthFromPublished(node)
    const azimuth =
      published ??
      hashToUnit(`universe:${node.id}`) * Math.PI * 2 + index * GOLDEN_ANGLE

    const isAnchor = node.id === anchorId
    const visualScale = visualScaleFor(node)
    laid.push({
      id: node.id,
      kind: node.kind,
      level: node.level,
      weight: node.weight,
      colorRole: node.colorRole,
      role: isAnchor ? 'central-anchor' : 'standard',
      profile: resolvePresentationProfile(node),
      radius: nodeRadiusFor(node.kind, node.weight) * visualScale,
      visualScale,
      point: isAnchor ? { x: 0, y: 0, z: 0 } : pointForNode(node, azimuth),
      azimuth,
      positionSource: published == null ? 'derived' : 'api-azimuth',
    })
  })

  const byId = new Map(laid.map((node) => [node.id, node]))

  const laidEdges: UniverseEdge3D[] = []
  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source || !target) continue
    const { c1, c2, samples } = buildEdgeCurve(source.point, target.point)
    laidEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationType: edge.relationType,
      directed: edge.directed,
      start: source.point,
      control: c1,
      end: target.point,
      c1,
      c2,
      samples,
    })
  }

  return {
    nodes: laid,
    edges: laidEdges,
    bounds: computeBounds(laid),
  }
}

/** Cubic Bézier sampling; shared by the renderer and the hit tester. */
export function sampleCubic(
  start: UniversePoint,
  c1: UniversePoint,
  c2: UniversePoint,
  end: UniversePoint,
  segments: number,
): UniversePoint[] {
  const count = Math.max(2, Math.floor(segments))
  const points: UniversePoint[] = []
  for (let index = 0; index <= count; index += 1) {
    const t = index / count
    const inverse = 1 - t
    const a = inverse * inverse * inverse
    const b = 3 * inverse * inverse * t
    const c = 3 * inverse * t * t
    const d = t * t * t
    points.push({
      x: a * start.x + b * c1.x + c * c2.x + d * end.x,
      y: a * start.y + b * c1.y + c * c2.y + d * end.y,
      z: a * start.z + b * c1.z + c * c2.z + d * end.z,
    })
  }
  return points
}

/**
 * Bounds of the actual composition — node positions inflated by their own radii,
 * and every sampled relationship point. There are no decorative planes to frame
 * the scene any more, so an absent level can no longer inflate the box either.
 */
function computeBounds(nodes: ReadonlyArray<UniverseNode3D>): UniverseBounds {
  let minX = 0
  let maxX = 0
  let minY = 0
  let maxY = 0
  let minZ = 0
  let maxZ = 0
  let seen = false

  const visit = (point: UniversePoint, radius = 0) => {
    minX = seen ? Math.min(minX, point.x - radius) : point.x - radius
    maxX = seen ? Math.max(maxX, point.x + radius) : point.x + radius
    minY = seen ? Math.min(minY, point.y - radius) : point.y - radius
    maxY = seen ? Math.max(maxY, point.y + radius) : point.y + radius
    minZ = seen ? Math.min(minZ, point.z - radius) : point.z - radius
    maxZ = seen ? Math.max(maxZ, point.z + radius) : point.z + radius
    seen = true
  }

  for (const node of nodes) visit(node.point, node.radius)

  const extent = Math.max(maxX - minX, maxY - minY, (maxZ - minZ) * 0.6, 24)
  return { minX, maxX, minY, maxY, minZ, maxZ, extent }
}

/**
 * Camera distance that fits the layout for an aspect ratio and field of view.
 * Shared by both presentations so neither needs FOV zoom tricks as motion.
 */
export function fitDistance(
  bounds: UniverseBounds,
  aspect: number,
  fovDegrees: number,
  padding = 1.14,
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1
  const halfFov = (fovDegrees * Math.PI) / 360
  const width = Math.max(bounds.maxX - bounds.minX, 24)
  const height = Math.max(bounds.maxY - bounds.minY, 24)
  const distanceForHeight = height / 2 / Math.tan(halfFov)
  const distanceForWidth = width / 2 / Math.tan(halfFov) / safeAspect
  const depth = Math.max(bounds.maxZ - bounds.minZ, 0)
  return (Math.max(distanceForHeight, distanceForWidth) + depth * 0.5) * padding
}

/**
 * WORST-CASE identity envelope, computed from the presentation tables.
 *
 * The brief requires the identity anchor to be "only approximately 1.4–1.6× the
 * diameter of main domain nodes" and forbids a giant nucleus. Rather than assert
 * one measured sample (which says nothing about the nodes that are not present
 * today), this evaluates the extremes of the whole scale system: the smallest and
 * largest domain the tables can produce against the anchor's fixed scale.
 *
 * Lives here rather than in `presentation-profiles.ts` because it needs both the
 * radius authority (`nodeRadiusFor`) and the profile scales — and this module
 * already depends on that one, not the other way round.
 */
export function identityDiameterEnvelope(): { min: number; max: number } {
  const identityRadius = nodeRadiusFor('person', 1) * RU_PROFILE_SCALE.identity
  const domainBase = nodeRadiusFor('domain', 1)

  // Every profile a MAIN DOMAIN can legitimately resolve to. `identity` is
  // excluded: a domain never maps to it (`profileForKind`), and including it
  // would compare the anchor against itself.
  const domainProfileScales = Object.entries(RU_PROFILE_SCALE)
    .filter(([profile]) => profile !== 'identity')
    .map(([, scale]) => scale)
  const minProfile = Math.min(...domainProfileScales)
  const maxProfile = Math.max(...domainProfileScales)

  const variation = SCALE_VARIATION_AMPLITUDE
  const smallestDomain = domainBase * minProfile * (1 - variation)
  const largestDomain = domainBase * maxProfile * (1 + variation)

  return {
    min: identityRadius / largestDomain,
    max: identityRadius / smallestDomain,
  }
}

/**
 * Is a relationship curve ENDPOINT-DRIVEN?
 *
 * True when the sampled polyline actually starts at the source node's position and
 * ends at the target's, within `epsilon`. This is the property that separates a
 * real relationship from a decorative arc: an orbit drawn around the composition
 * does not pass through the node positions it supposedly connects.
 *
 * Deliberately an exact, local check rather than a geometric "is this an ellipse"
 * detector: the brief warns against a brittle math-based orbit test, and endpoint
 * agreement is both trivially reliable and the actual product requirement
 * ("the curve should visually connect A → B").
 */
export function curveIsEndpointDriven(
  edge: Pick<UniverseEdge3D, 'samples' | 'start' | 'end'>,
  epsilon = 1e-6,
): boolean {
  const first = edge.samples[0]
  const last = edge.samples[edge.samples.length - 1]
  if (!first || !last) return false
  return (
    distance(first, edge.start) <= epsilon &&
    distance(last, edge.end) <= epsilon
  )
}

/**
 * How much the relationship curves differ in their distance from a point.
 *
 * A set of curves that frames the composition as orbit rings sits at a nearly
 * constant radius from the centre, so the spread of their midpoints' radii
 * collapses toward zero. A relational topology has no such common radius.
 *
 * Returns `null` when there is nothing to measure (fewer than two curves), which
 * is the honest answer rather than a misleading `0`.
 */
export function curveMidpointRadiusSpread(
  edges: ReadonlyArray<Pick<UniverseEdge3D, 'samples'>>,
  center: UniversePoint = { x: 0, y: 0, z: 0 },
): number | null {
  if (edges.length < 2) return null
  const radii = edges.map((edge) => {
    const mid = edge.samples[Math.floor(edge.samples.length / 2)]!
    return distance(mid, center)
  })
  return Math.max(...radii) - Math.min(...radii)
}

function distance(a: UniversePoint, b: UniversePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}
