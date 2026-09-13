/**
 * RU-02 — Universe layout: genuine 3D placement.
 *
 * Companion scene: the anchor sits at the origin and each hierarchy level
 * occupies its OWN TILTED ORBITAL PLANE (not concentric coplanar circles). A
 * node's depth therefore comes from its plane's orientation, which is what gives
 * the system real volumetric structure instead of a flat ring chart.
 *
 * Published authoring intent is preserved rather than overwritten:
 * - a node that carries an API `position` keeps its authored AZIMUTH
 *   (`atan2(y, x)`) and its authored radial ORDER within its level, so a domain
 *   authored to the lower-left stays lower-left and relatively closer/farther;
 * - nodes without a usable position take a deterministic golden-angle azimuth
 *   derived from their id, the same derivation the existing CA-02 adapter uses.
 *
 * Everything is a pure function of the universe model: same input, same
 * coordinates, both locales, every render.
 */

import type {
  UniverseEdge,
  UniverseNode,
  UniverseLevel,
} from '../../research-universe/model'

export interface UniversePoint {
  x: number
  y: number
  z: number
}

export interface OrbitalPlane {
  index: number
  level: UniverseLevel
  radiusX: number
  radiusY: number
  /** Radians. Distinct per plane so no two planes are coplanar. */
  tiltX: number
  tiltY: number
  /** Radians; rotates the plane so nodes do not align radially. */
  phase: number
  segments: number
  /** Depth offset so planes read as separate strata. */
  zOffset: number
}

export interface UniverseNode3D {
  id: string
  kind: UniverseNode['kind']
  level: UniverseLevel
  weight: number
  colorRole: string
  /**
   * Presentation role. RU-2A: the level-0 anchor has ONE visible identity — the
   * dedicated central nucleus — so it is never also instanced as a generic node.
   * The semantic record is untouched; only the renderer treats it differently.
   */
  role: 'central-anchor' | 'standard'
  /** Visual sphere radius in scene units. */
  radius: number
  point: UniversePoint
  planeIndex: number
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
  /** Sampled quadratic curve: used for rendering AND screen-space hit testing. */
  samples: UniversePoint[]
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
  planes: OrbitalPlane[]
  bounds: UniverseBounds
}

/** How many curve segments each edge is sampled into (hit testing + drawing). */
export const EDGE_SAMPLES = 20

/**
 * RU-2A — Split the layout into the node that owns the central nucleus and the
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
 * Desktop uses three tilted planes (domains / subdomains / outputs). Mobile uses
 * two, so the simplified scene keeps the volumetric read with fewer nodes and a
 * narrower frustum.
 */
export function orbitalPlanes(mobile = false): OrbitalPlane[] {
  if (mobile) {
    return [
      {
        index: 0,
        level: 1,
        radiusX: 34,
        radiusY: 24,
        tiltX: 0.42,
        tiltY: -0.28,
        phase: 0.3,
        segments: 72,
        zOffset: 0,
      },
      {
        index: 1,
        level: 3,
        radiusX: 58,
        radiusY: 42,
        tiltX: -0.36,
        tiltY: 0.34,
        phase: 1.1,
        segments: 96,
        zOffset: -6,
      },
    ]
  }
  return [
    {
      index: 0,
      level: 1,
      radiusX: 46,
      radiusY: 32,
      tiltX: 0.46,
      tiltY: -0.3,
      phase: 0.24,
      segments: 96,
      zOffset: 0,
    },
    {
      index: 1,
      level: 2,
      radiusX: 74,
      radiusY: 52,
      tiltX: -0.4,
      tiltY: 0.36,
      phase: 0.95,
      segments: 120,
      zOffset: -11,
    },
    {
      index: 2,
      level: 3,
      radiusX: 104,
      radiusY: 74,
      tiltX: 0.24,
      tiltY: 0.62,
      phase: 1.7,
      segments: 132,
      zOffset: -24,
    },
  ]
}

/**
 * A point on a tilted plane. The plane is a unit ellipse rotated about X and
 * then about Y, so the returned `z` is genuine depth rather than a decoration.
 */
export function pointOnPlane(
  plane: OrbitalPlane,
  azimuth: number,
  radiusScale = 1,
): UniversePoint {
  const angle = azimuth + plane.phase
  const x0 = Math.cos(angle) * plane.radiusX * radiusScale
  const y0 = Math.sin(angle) * plane.radiusY * radiusScale
  const z0 = 0

  // Rotate about X (tilts the plane away from the camera's horizontal axis).
  const y1 = y0 * Math.cos(plane.tiltX) - z0 * Math.sin(plane.tiltX)
  const z1 = y0 * Math.sin(plane.tiltX) + z0 * Math.cos(plane.tiltX)

  // Rotate about Y (gives each plane its own orientation).
  const x2 = x0 * Math.cos(plane.tiltY) + z1 * Math.sin(plane.tiltY)
  const z2 = -x0 * Math.sin(plane.tiltY) + z1 * Math.cos(plane.tiltY)

  return { x: x2, y: y1, z: z2 + plane.zOffset }
}

function planeForLevel(
  planes: OrbitalPlane[],
  level: UniverseLevel,
): OrbitalPlane {
  const exact = planes.find((plane) => plane.level === level)
  if (exact) return exact
  // Levels with no dedicated plane (2 on mobile, or absent published levels)
  // borrow the nearest plane's ORIENTATION so depth stays consistent.
  const ordered = [...planes].sort(
    (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level),
  )
  return ordered[0] ?? planes[0]!
}

/** Visual radius per kind: main domains carry more weight than outputs. */
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

/**
 * Build the 3D layout for one universe (a Home subset or the full About graph).
 * Edges are curved so parallel relationships stay legible, and each carries its
 * sampled polyline for screen-space hit testing.
 */
export function computeUniverseLayout(
  nodes: ReadonlyArray<UniverseNode>,
  edges: ReadonlyArray<UniverseEdge>,
  options: { mobile?: boolean } = {},
): UniverseLayout {
  const mobile = options.mobile === true
  const planes = orbitalPlanes(mobile)

  // Published radial extent per level, so authored relative distance survives.
  const publishedRadius = new Map<string, number>()
  const maxPublishedByLevel = new Map<UniverseLevel, number>()
  for (const node of nodes) {
    const radius = Math.hypot(node.x, node.y)
    if (node.layoutSource !== 'api' || !Number.isFinite(radius)) continue
    publishedRadius.set(node.id, radius)
    maxPublishedByLevel.set(
      node.level,
      Math.max(maxPublishedByLevel.get(node.level) ?? 0, radius),
    )
  }

  const laid: UniverseNode3D[] = []
  // Exactly one node owns the central presentation: the first level-0 person in
  // payload order. A second level-0 node (malformed data) stays a standard node
  // rather than silently duplicating the nucleus.
  const anchorId =
    nodes.find((node) => node.kind === 'person' && node.level === 0)?.id ?? null

  nodes.forEach((node, index) => {
    const plane = planeForLevel(planes, node.level)
    const published = azimuthFromPublished(node)
    const azimuth =
      published ??
      hashToUnit(`universe:${node.id}`) * Math.PI * 2 + index * GOLDEN_ANGLE

    const maxRadius = maxPublishedByLevel.get(node.level) ?? 0
    const ownRadius = publishedRadius.get(node.id) ?? maxRadius
    const radiusScale =
      maxRadius > 0 ? 0.82 + 0.36 * Math.min(ownRadius / maxRadius, 1) : 1

    const isAnchor = node.id === anchorId
    const point = isAnchor
      ? { x: 0, y: 0, z: 0 }
      : pointOnPlane(plane, azimuth, radiusScale)

    laid.push({
      id: node.id,
      kind: node.kind,
      level: node.level,
      weight: node.weight,
      colorRole: node.colorRole,
      role: isAnchor ? 'central-anchor' : 'standard',
      radius: nodeRadiusFor(node.kind, node.weight),
      point,
      planeIndex: plane.index,
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

    const dx = target.point.x - source.point.x
    const dy = target.point.y - source.point.y
    const dz = target.point.z - source.point.z
    const length = Math.hypot(dx, dy, dz) || 1

    // Bow the curve away from the straight chord; the bow axis is derived from
    // the chord itself so curves stay deterministic and non-crossing.
    const bow = 0.16 * length
    const control: UniversePoint = {
      x: (source.point.x + target.point.x) / 2 + (dy / length) * bow,
      y: (source.point.y + target.point.y) / 2 - (dx / length) * bow,
      z: (source.point.z + target.point.z) / 2 + (dz / length) * bow * 0.5,
    }

    laidEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationType: edge.relationType,
      directed: edge.directed,
      start: source.point,
      control,
      end: target.point,
      samples: sampleQuadratic(
        source.point,
        control,
        target.point,
        EDGE_SAMPLES,
      ),
    })
  }

  return {
    nodes: laid,
    edges: laidEdges,
    planes,
    bounds: computeBounds(laid, planes),
  }
}

/** Quadratic Bézier sampling; shared by the renderer and the hit tester. */
export function sampleQuadratic(
  start: UniversePoint,
  control: UniversePoint,
  end: UniversePoint,
  segments: number,
): UniversePoint[] {
  const count = Math.max(2, Math.floor(segments))
  const points: UniversePoint[] = []
  for (let index = 0; index <= count; index += 1) {
    const t = index / count
    const inverse = 1 - t
    points.push({
      x:
        inverse * inverse * start.x +
        2 * inverse * t * control.x +
        t * t * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * t * control.y +
        t * t * end.y,
      z:
        inverse * inverse * start.z +
        2 * inverse * t * control.z +
        t * t * end.z,
    })
  }
  return points
}

function computeBounds(
  nodes: ReadonlyArray<UniverseNode3D>,
  planes: ReadonlyArray<OrbitalPlane>,
): UniverseBounds {
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

  // Planes define the outer frame even when a level has no published nodes, so
  // an absent level never collapses the composition.
  for (const plane of planes) {
    for (let index = 0; index < plane.segments; index += 1) {
      visit(pointOnPlane(plane, (index / plane.segments) * Math.PI * 2, 1))
    }
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
