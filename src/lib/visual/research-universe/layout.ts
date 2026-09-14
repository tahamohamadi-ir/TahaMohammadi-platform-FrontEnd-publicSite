/**
 * RU-02 / RU-4B / RU-4C — Universe layout: an authored, asymmetric composition.
 *
 * The direction is a 3D relational topology, not a planetary system. What the
 * layout is responsible for:
 *
 * 1. DIRECTION and DISTANCE come from authored presentation tables below, not
 *    from a shared radius or a shared plane. RU-4C replaced the published
 *    azimuths with authored ones: the published `y` for PARS-SQL is `-76`, which
 *    put that domain straight below the identity and produced a "vertical tail"
 *    plus a Y-shaped star. The published position is still recorded on each node
 *    (`positionSource`) so nothing is lost, and the graph relationships are
 *    untouched — only the composition is art-directed.
 * 2. DEPTH is authored per node, so no two domains are coplanar.
 * 3. The camera target is the DOMAIN CENTROID (see `compositionTarget`), which is
 *    what puts the identity node off the geometric centre of the frame and keeps
 *    the three domains visually balanced.
 *
 * Everything is a pure function of the universe model: same input, same
 * coordinates, both locales, every render, every reload. No theme or viewport
 * parameter can move a node.
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
   * Presentation role. The level-0 anchor has ONE visible identity — the
   * dedicated central sphere — so it is never also instanced as a generic node.
   */
  role: 'central-anchor' | 'standard'
  /**
   * The resolved presentation profile. Carried here because this is the only
   * place that still holds the published LABEL the profile is keyed on; the
   * renderer receives a position/size projection and must not re-derive
   * presentation state from it.
   */
  profile: RuMaterialProfile
  /** Visual sphere radius in scene units: the kind's radius × the visual scale. */
  radius: number
  visualScale: number
  point: UniversePoint
  azimuth: number
  positionSource: 'api-azimuth' | 'authored-azimuth' | 'derived'
}

export interface UniverseEdge3D {
  id: string
  source: string
  target: string
  relationType: string
  directed: boolean
  /** Surface-to-surface: the curve starts and ends ON the spheres it connects. */
  start: UniversePoint
  control: UniversePoint
  end: UniversePoint
  /** Cubic curve through the derived control points, for rendering AND picking. */
  samples: UniversePoint[]
  c1: UniversePoint
  c2: UniversePoint
  /** How far the curve bows off its straight chord, in scene units. */
  bow: number
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
export const EDGE_SAMPLES = 26

/**
 * How far a relationship bows away from its straight chord.
 *
 * RU-4C raised this from 0.12 because the curves were "visually almost straight"
 * at Home scale. It stays well below a flamboyant arc: the curve still reads as a
 * connection, not an orbit. Callers may pass a per-relationship override.
 */
export const EDGE_BOW = 0.11

/**
 * Bounds of the fixed placement space, exported so the unit invariants assert
 * the art direction rather than restate it.
 */
export const PLACEMENT_BOUNDS = {
  minSpread: 0.8,
  maxSpread: 1.28,
  maxDepthOffset: 18,
} as const

/** Base radius the `radialSpread` values are authored against. */
export const PLACEMENT_BASE_RADIUS = 52

/**
 * AUTHORED COMPOSITION — keyed by published node id.
 *
 * `azimuth` is in radians and REPLACES the published direction (art direction,
 * not content). The three current domains are placed as a deliberate triangle:
 *
 *   research-topic-2  +38°   upper right   (warm mineral / dashboard)
 *   research-topic-3  +148°  upper left    (emerald / visual political)
 *   research-topic-1  -62°   lower right   (mineral purple / PARS-SQL)
 *
 * Angular gaps are 110° / 150° / 100° — deliberately unequal, so the composition
 * never reads as an evenly spaced radial star. Spreads (0.92 / 1.28 / 1.16) are
 * unequal but close enough that no single arm extends excessively.
 *
 * Both locales are listed because the published graph numbers its topics
 * independently per locale (`research-topic-1..3` vs `..4..6`); the same domain
 * gets the same composition in both.
 */
export const RU_PLACEMENT: Readonly<
  Record<
    string,
    {
      readonly azimuth: number
      readonly leftish?: boolean
      readonly radialSpread: number
      readonly depthOffset: number
    }
  >
> = {
  'research-topic-1': {
    azimuth: (-62 * Math.PI) / 180,
    radialSpread: 0.92,
    depthOffset: -14,
  },
  'research-topic-2': {
    azimuth: (38 * Math.PI) / 180,
    radialSpread: 1.28,
    depthOffset: 16,
  },
  'research-topic-3': {
    azimuth: (148 * Math.PI) / 180,
    radialSpread: 1.16,
    depthOffset: -9,
  },
  // fa payload — same domains, same composition.
  'research-topic-4': {
    azimuth: (-62 * Math.PI) / 180,
    radialSpread: 0.92,
    depthOffset: -14,
  },
  'research-topic-5': {
    azimuth: (38 * Math.PI) / 180,
    radialSpread: 1.28,
    depthOffset: 16,
  },
  'research-topic-6': {
    azimuth: (148 * Math.PI) / 180,
    radialSpread: 1.16,
    depthOffset: -9,
  },
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
 * Split the layout into the node that owns the central sphere and the nodes that
 * get a generic instance. Both partitions always come from ONE list, so a node
 * can never be rendered twice and no semantic record is dropped:
 * `anchors.length + standard.length === nodes.length`.
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

function publishedAzimuth(node: UniverseNode): number | null {
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

/** Position on the node's authored azimuth ray. No shared radius, no shared plane. */
export function pointForNode(
  node: UniverseNode,
  azimuth: number,
): UniversePoint {
  const { radialSpread, depthOffset } = placementFor(node)
  if (node.level === 0) return { x: 0, y: 0, z: 0 }
  return {
    x: Math.cos(azimuth) * PLACEMENT_BASE_RADIUS * radialSpread,
    y: Math.sin(azimuth) * PLACEMENT_BASE_RADIUS * radialSpread,
    z: depthOffset,
  }
}

/**
 * Where the camera should look.
 *
 * The domain centroid, so the identity node is NOT the geometric centre of the
 * frame (the brief asks for exactly that) while the three domains stay balanced
 * around it. Returns the origin when there is nothing to balance.
 */
export function compositionTarget(
  nodes: ReadonlyArray<Pick<UniverseNode3D, 'role' | 'point'>>,
): UniversePoint {
  const standard = nodes.filter((node) => node.role !== 'central-anchor')
  const pool = standard.length > 0 ? standard : [...nodes]
  if (pool.length === 0) return { x: 0, y: 0, z: 0 }
  const sum = pool.reduce(
    (acc, node) => ({
      x: acc.x + node.point.x,
      y: acc.y + node.point.y,
      z: acc.z + node.point.z,
    }),
    { x: 0, y: 0, z: 0 },
  )
  return {
    x: sum.x / pool.length,
    // Depth is NOT used as a look-at term: the camera stays level with the
    // composition so the authored triangle is not skewed by a vertical shift.
    y: sum.y / pool.length,
    z: 0,
  }
}

/** Unit vector from `from` to `to`, or null when they coincide. */
function direction(
  from: UniversePoint,
  to: UniversePoint,
): UniversePoint | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  const length = Math.hypot(dx, dy, dz)
  if (!(length > 1e-6)) return null
  return { x: dx / length, y: dy / length, z: dz / length }
}

function moveAlong(
  point: UniversePoint,
  dir: UniversePoint,
  distance: number,
): UniversePoint {
  return {
    x: point.x + dir.x * distance,
    y: point.y + dir.y * distance,
    z: point.z + dir.z * distance,
  }
}

/**
 * Build one relationship as a cubic that touches BOTH sphere surfaces.
 *
 * Endpoints are pulled onto the surfaces (a small inset keeps the curve visually
 * attached rather than tangent-floating), so the curve connects the two objects
 * the user sees rather than disappearing into their centres.
 *
 * Curvature is derived from this SPECIFIC pair — a per-edge bow amount plus the
 * pair's own depth separation — so no two relationships share a curvature centre
 * and a set of them cannot combine into one closed orbit.
 */
export function buildEdgeCurve(
  sourcePoint: UniversePoint,
  sourceRadius: number,
  targetPoint: UniversePoint,
  targetRadius: number,
  bow: number = EDGE_BOW,
): {
  c1: UniversePoint
  c2: UniversePoint
  samples: UniversePoint[]
  start: UniversePoint
  end: UniversePoint
} {
  const dir = direction(sourcePoint, targetPoint)
  // Inset: the curve lands just inside the silhouette so it reads as attached.
  const inset = 0.94
  const start = dir
    ? moveAlong(sourcePoint, dir, sourceRadius * inset)
    : sourcePoint
  const end = dir
    ? moveAlong(
        targetPoint,
        { x: -dir.x, y: -dir.y, z: -dir.z },
        targetRadius * inset,
      )
    : targetPoint

  const dx = end.x - start.x
  const dy = end.y - start.y
  const dz = end.z - start.z
  const chord = Math.hypot(dx, dy, dz) || 1
  const planar = Math.hypot(dx, dy) || 1

  // In-plane normal of THIS chord: the direction the arc bulges.
  //
  // CURVATURE — the correction RU-4C makes. The previous implementation rotated
  // the chord about its own midpoint, which is mathematically tidy and leaves the
  // curve's MIDPOINT exactly on the chord: an antisymmetric S that reads as a
  // straight line at UI size (measured bow ratio 0.009, which is what "the curves
  // visually read almost straight" meant). Offsetting both control points to ONE
  // side produces a single C-arc whose midpoint deviates by ~0.75 x the bow, while
  // both endpoints stay exact.
  const nx = -dy / planar
  const ny = dx / planar
  const bowLength = bow * chord
  // Depth separation bends the curve out of the chord's plane too, so the
  // curvature is genuinely 3D rather than a flat arc.
  const zLift = bow * dz * 0.6

  const at = (t: number, offset: number): UniversePoint => ({
    x: start.x + dx * t + nx * offset,
    y: start.y + dy * t + ny * offset,
    z: start.z + dz * t + zLift,
  })

  const c1 = at(1 / 3, bowLength)
  const c2 = at(2 / 3, bowLength)
  return {
    start,
    end,
    c1,
    c2,
    samples: sampleCubic(start, c1, c2, end, EDGE_SAMPLES),
  }
}

/**
 * Per-relationship curvature. Deterministic from the edge id, and bounded to a
 * range that stays perceptible without becoming an arc.
 */
export function bowForEdge(edgeId: string): number {
  const unit = hashToUnit(`ru-edge-bow:${edgeId}`)
  return EDGE_BOW * (0.82 + unit * 0.36)
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
    const authored = RU_PLACEMENT[node.id]
    const published = publishedAzimuth(node)
    const azimuth =
      authored?.azimuth ??
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
      positionSource: isAnchor
        ? 'derived'
        : authored
          ? 'authored-azimuth'
          : published == null
            ? 'derived'
            : 'api-azimuth',
    })
  })

  const byId = new Map(laid.map((node) => [node.id, node]))

  const laidEdges: UniverseEdge3D[] = []
  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source || !target) continue
    const curve = buildEdgeCurve(
      source.point,
      source.radius,
      target.point,
      target.radius,
      bowForEdge(edge.id),
    )
    laidEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationType: edge.relationType,
      directed: edge.directed,
      start: curve.start,
      control: curve.c1,
      end: curve.end,
      c1: curve.c1,
      c2: curve.c2,
      samples: curve.samples,
      bow: bowForEdge(edge.id),
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
 * Bounds of the actual composition — node positions inflated by their own radii.
 * There are no decorative planes to frame the scene, so an absent level can no
 * longer inflate the box either.
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
 *
 * RU-4C frames the OFFSET composition: the camera looks at the domain centroid,
 * so the frustum must cover the box measured from that point rather than from the
 * origin — otherwise the composition drifts off-frame.
 */
export function fitDistance(
  bounds: UniverseBounds,
  aspect: number,
  fovDegrees: number,
  padding = 1.14,
  target: UniversePoint = { x: 0, y: 0, z: 0 },
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1
  const halfFov = (fovDegrees * Math.PI) / 360
  const width =
    Math.max(
      Math.abs(bounds.maxX - target.x),
      Math.abs(bounds.minX - target.x),
    ) * 2
  const height =
    Math.max(
      Math.abs(bounds.maxY - target.y),
      Math.abs(bounds.minY - target.y),
    ) * 2
  const distanceForHeight = Math.max(height, 24) / 2 / Math.tan(halfFov)
  const distanceForWidth =
    Math.max(width, 24) / 2 / Math.tan(halfFov) / safeAspect
  const depth = Math.max(bounds.maxZ - bounds.minZ, 0)
  return (Math.max(distanceForHeight, distanceForWidth) + depth * 0.5) * padding
}

/**
 * WORST-CASE identity envelope, computed from the presentation tables.
 *
 * The brief requires the identity anchor to present at approximately 1.4–1.6× a
 * main domain's diameter. This evaluates the extremes of the whole scale system
 * rather than one sampled pair. Lives here because it needs both the radius
 * authority and the profile scales.
 */
export function identityDiameterEnvelope(): { min: number; max: number } {
  const identityRadius = nodeRadiusFor('person', 1) * RU_PROFILE_SCALE.identity
  const domainBase = nodeRadiusFor('domain', 1)

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
 * True when the sampled polyline starts at the curve's own start point and ends
 * at its end point, within `epsilon`. This is the property that separates a real
 * relationship from a decorative arc: an orbit drawn around the composition does
 * not pass through the two objects it supposedly connects.
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
 * How far a curve's midpoint sits from the straight chord between its endpoints,
 * as a fraction of that chord's length. This is the measurable form of "modest
 * but clearly visible curvature": 0 is perfectly straight, ~0.05+ is visibly bent.
 */
export function curveBowRatio(edge: Pick<UniverseEdge3D, 'samples'>): number {
  const samples = edge.samples
  if (samples.length < 3) return 0
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const mid = samples[Math.floor(samples.length / 2)]!
  const chord = distance(first, last)
  if (!(chord > 1e-6)) return 0
  const chordMid = {
    x: (first.x + last.x) / 2,
    y: (first.y + last.y) / 2,
    z: (first.z + last.z) / 2,
  }
  return distance(mid, chordMid) / chord
}

/**
 * How much the relationship curves differ in their distance from a point.
 *
 * A set of curves that frames the composition as orbit rings sits at a nearly
 * constant radius from the centre, so the spread of their midpoints' radii
 * collapses toward zero. A relational topology has no such common radius.
 * Returns `null` when there is nothing to measure (fewer than two curves).
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

/** Distance from an edge's curve start to the surface of the node it leaves. */
export function surfaceGap(
  edge: Pick<UniverseEdge3D, 'start'>,
  node: Pick<UniverseNode3D, 'point' | 'radius'>,
): number {
  return distance(edge.start, node.point) - node.radius
}

function distance(a: UniversePoint, b: UniversePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}
