/** Desktop 3D scene (Plan C Task 16). Real engine on the RU lineage.
 *
 * Data path: `resolveLayout(payload)` consumes the backend's stored
 * coordinates (never a re-simulation). Atlas nodes are adapted to RU
 * `UniverseNode3D` records and drawn with the real builders — shared sphere
 * geometry, presentation registry, instanced (tier, profile) batches, edge
 * curves, anchor sphere — imported, never copied. Emphasis is material/colour
 * state only (nothing is added or removed). Exactly one core per scene,
 * render-on-demand only, full disposal, reduced-motion instant.
 *
 * Deliberate deviations from the plan text, with reasons:
 * - NO second sphere tier in `spheres.ts`. The plan asks for a `16x12`
 *   geometry beside the existing `32x20`, but RU-4B's "one shared sphere"
 *   invariant is asserted by `presentation.test.ts` and the RU surface is
 *   frozen to Plan C. Tiers here are (tier, profile) *batches* sharing the
 *   single unit sphere — the same mechanism About uses.
 * - Radius comes from `resolveLayout` (Task 12 owns it); the RU profile scale
 *   is NOT re-applied on top, or the backend's layout authority would be
 *   overridden by a second derivation.
 * - `colorRole` passes the payload's `visualRole` through and lets
 *   `roleColor` fall back to brand — no invented colour semantics.
 * - Camera animation (bounded transitions) belongs to Task 17; focus/reset
 *   apply instantly today under every motion setting.
 */
import type { AtlasPayload } from '../../atlas/model'
import { resolveLayout } from '../../atlas/layout'
import { neighborhoodOf } from '../../atlas/neighborhood'
import type {
  ProjectedLabel,
  SceneErrorCode,
  SceneMotionPreference,
} from '../scene-contract'
import type { ScenePalette } from '../scene-contract'
import {
  createSceneCore,
  type SceneCoreOptions,
} from '../research-universe/scene-core'
import { sharedSphereTriangles } from '../research-universe/spheres'
import { createUniverseMaterials } from '../research-universe/materials'
import {
  createUniverseNodes,
  type UniverseNodeVisuals,
} from '../research-universe/nodes'
import {
  createUniverseEdges,
  type UniverseEdgeVisuals,
} from '../research-universe/edges'
import { createUniverseCore } from '../research-universe/core-object'
import {
  bowForEdge,
  buildEdgeCurve,
  compositionTarget,
  fitDistance,
  type UniverseBounds,
  type UniverseEdge3D,
  type UniverseNode3D,
  type UniversePoint,
} from '../research-universe/layout'
import { resolvePresentationProfile } from '../research-universe/presentation-profiles'
import {
  buildUniverseTheme,
  type UniverseRenderTheme,
} from '../research-universe/theme'
import {
  projectNodes,
  type ProjectedNode3D,
} from '../research-universe/hit-testing'
import { createLabelLayer, type LabelLayer } from '../research-universe/labels'
import type { UniverseNodeKind } from '../../research-universe/model'
import type { SceneCore } from '../research-universe/scene-core'

/** The structural surface of the core the scene needs — stubbed in tests. */
export type AtlasSceneCore = Pick<
  SceneCore,
  | 'renderer'
  | 'scene'
  | 'camera'
  | 'groups'
  | 'ledger'
  | 'requestRender'
  | 'renderNow'
  | 'resize'
  | 'setTheme'
  | 'setVisible'
  | 'setLights'
  | 'setOnFrame'
  | 'projection'
  | 'dispose'
>

export interface AtlasSceneOptions {
  canvas: HTMLCanvasElement
  payload: AtlasPayload
  theme: 'light' | 'dark'
  /** Browser palette from the CSS tokens; falls back to the RU fallback. */
  palette?: ScenePalette
  motion: SceneMotionPreference
  /** DOM container for the HTML label layer; omitted in unit tests. */
  labelsContainer?: HTMLElement | null
  onFrame?: (labels: ProjectedLabel[], projected: ProjectedNode3D[]) => void
  onError?: (code: SceneErrorCode) => void
  coreFactory?: (options: SceneCoreOptions) => AtlasSceneCore | null
}

export interface AtlasOrbitPose {
  yaw: number
  pitch: number
  distanceScale: number
}

export const ATLAS_ORBIT_LIMITS = {
  minPitch: -0.95,
  maxPitch: 0.95,
  minDistanceScale: 0.55,
  maxDistanceScale: 2.1,
} as const

const FOV = 42
const HOME_ORBIT: AtlasOrbitPose = { yaw: 0.22, pitch: 0.24, distanceScale: 1 }
/** Same edge-room rationale as the About scene: chips sit above nodes. */
const MOBILE_FIT_PADDING = 1.34
const DESKTOP_FIT_PADDING = 1.14

export interface AtlasSceneEmphasis {
  selectedNodeId: string | null
  selectedRelationId: string | null
  incident: string[]
  dimmed: string[]
}

export interface AtlasSceneStats {
  nodes: number
  edges: number
  triangles: number
  drawCalls: number
  pixelRatio: number
  nodeGeometries: number
  profileMaterials: number
}

export interface AtlasSceneHandle {
  orbit(): AtlasOrbitPose
  rotateBy(deltaYaw: number, deltaPitch: number): void
  zoomBy(factor: number): void
  focusNode(nodeKey: string): void
  resetView(animate?: boolean): void
  setSelection(nodeKey: string | null): void
  setSelectedRelation(relationKey: string | null): void
  setHovered(nodeKey: string | null): void
  setState(state: 'overview' | 'node' | 'relation', key?: string | null): void
  emphasis(): AtlasSceneEmphasis
  setTheme(next: UniverseRenderTheme): void
  setMotion(motion: SceneMotionPreference): void
  setVisible(visible: boolean): void
  resize(width: number, height: number, devicePixelRatio: number): void
  render(): void
  stats(): AtlasSceneStats
  dispose(): void
}

/** Fallback palettes (the browser passes the real CSS tokens; cf. RU enhancement). */
const FALLBACK_DARK: ScenePalette = {
  canvas: '#071225',
  ink: '#f7f3ea',
  brand: '#16b8a6',
  signature: '#c89b3c',
  research: '#8b75dc',
  context: '#42a98c',
  surface: '#0b1630',
}
const FALLBACK_LIGHT: ScenePalette = {
  canvas: '#f7f8f5',
  ink: '#182328',
  brand: '#087c73',
  signature: '#a77b28',
  research: '#6047b8',
  context: '#137a62',
  surface: '#ffffff',
}

/** Atlas record type → RU kind. Unknown types stay `other`, never invented. */
const KIND_FOR_ATLAS_TYPE: Record<string, UniverseNodeKind> = {
  identity: 'person',
  'research-area': 'domain',
  method: 'subdomain',
  project: 'project',
  publication: 'publication',
  technology: 'tool',
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

function copyPoint(point: UniversePoint): UniversePoint {
  return { x: point.x, y: point.y, z: point.z }
}

export function createAtlasScene(options: AtlasSceneOptions): AtlasSceneHandle {
  const { payload } = options
  // Stored coordinates only — radius/tier/drawOrder are Task 12's derivation.
  const layout = resolveLayout(payload)
  const layoutByKey = new Map(layout.nodes.map((n) => [n.key, n]))
  const labelByKey = new Map(
    payload.nodes.map((n) => [n.key, n.label ?? n.key]),
  )
  const typeByKey = new Map(payload.nodeTypes.map((t) => [t.key, t]))

  // The anchor is the first node whose type owns the anchor semantic role
  // (mirror of the RU "first level-0 person" rule); without one every node
  // is standard and no central sphere is built.
  const anchorKey =
    payload.nodes.find((n) => typeByKey.get(n.type)?.semanticRole === 'anchor')
      ?.key ??
    payload.nodes.find((n) => n.type === 'identity')?.key ??
    null

  const universeNodes: UniverseNode3D[] = []
  for (const node of payload.nodes) {
    const placed = layoutByKey.get(node.key)
    if (!placed) continue
    const kind = KIND_FOR_ATLAS_TYPE[node.type] ?? 'other'
    const label = labelByKey.get(node.key) ?? node.key
    universeNodes.push({
      id: node.key,
      kind,
      level: node.key === anchorKey ? 0 : 1,
      weight: node.importance,
      colorRole: typeByKey.get(node.type)?.visualRole ?? '',
      role: node.key === anchorKey ? 'central-anchor' : 'standard',
      profile: resolvePresentationProfile({ label, kind }),
      radius: placed.radius,
      visualScale: 1,
      point: { x: placed.x, y: placed.y, z: placed.z },
      azimuth: 0,
      // Backend-stored coordinates: computed upstream, not authored here.
      positionSource: 'derived',
    })
  }

  const radiusByKey = new Map(universeNodes.map((n) => [n.id, n.radius]))
  const pointByKey = new Map(universeNodes.map((n) => [n.id, n.point]))
  const layoutEdges: UniverseEdge3D[] = []
  for (const relation of payload.relations) {
    const source = pointByKey.get(relation.source)
    const target = pointByKey.get(relation.target)
    if (!source || !target) continue
    const bow = bowForEdge(relation.key)
    const curve = buildEdgeCurve(
      source,
      radiusByKey.get(relation.source) ?? 1,
      target,
      radiusByKey.get(relation.target) ?? 1,
      bow,
    )
    layoutEdges.push({
      id: relation.key,
      source: relation.source,
      target: relation.target,
      relationType: relation.type,
      directed: relation.directed,
      start: curve.start,
      control: curve.c1,
      end: curve.end,
      samples: curve.samples,
      c1: curve.c1,
      c2: curve.c2,
      bow,
    })
  }

  const frameCenter: UniversePoint =
    universeNodes.length > 0
      ? compositionTarget(universeNodes)
      : { x: 0, y: 0, z: 0 }
  const bounds: UniverseBounds = {
    minX: layout.bounds.minX,
    maxX: layout.bounds.maxX,
    minY: layout.bounds.minY,
    maxY: layout.bounds.maxY,
    minZ: layout.bounds.minZ,
    maxZ: layout.bounds.maxZ,
    extent:
      Math.max(
        layout.bounds.maxX - layout.bounds.minX,
        layout.bounds.maxY - layout.bounds.minY,
        layout.bounds.maxZ - layout.bounds.minZ,
      ) || 1,
  }

  let theme: UniverseRenderTheme = buildUniverseTheme(
    options.palette ??
      (options.theme === 'light' ? FALLBACK_LIGHT : FALLBACK_DARK),
    options.theme,
  )
  let motion: SceneMotionPreference = options.motion
  let disposed = false
  let orbit: AtlasOrbitPose = { ...HOME_ORBIT }
  let lookAtPoint: UniversePoint = copyPoint(frameCenter)
  let baseDistance = 360
  let isMobile = false
  let selectedNodeId: string | null = null
  let selectedRelationId: string | null = null
  let hoveredId: string | null = null
  let stats: AtlasSceneStats = {
    nodes: universeNodes.length,
    edges: layoutEdges.length,
    triangles: sharedSphereTriangles(),
    drawCalls: 0,
    pixelRatio: 1,
    nodeGeometries: 1,
    profileMaterials: 0,
  }

  // Exactly one core per scene. The default is the real engine; tests inject
  // a stub. A null core is a construction failure the orchestrator turns
  // into a 2D fallback — the emphasis math below still works headless.
  const factory =
    options.coreFactory ??
    ((coreOptions: SceneCoreOptions) => createSceneCore(coreOptions))
  let core: AtlasSceneCore | null = null
  try {
    core = factory({
      canvas: options.canvas,
      theme,
      fov: FOV,
      onError: options.onError,
    })
  } catch {
    core = null
  }
  if (!core) options.onError?.('webgl-unavailable')
  const live = core

  let nodeVisuals: UniverseNodeVisuals | null = null
  let edgeVisuals: UniverseEdgeVisuals | null = null
  let labelLayer: LabelLayer | null = null

  if (live) {
    const materials = createUniverseMaterials(live.ledger, theme)
    nodeVisuals = createUniverseNodes(
      live.ledger,
      theme,
      universeNodes,
      materials,
    )
    edgeVisuals = createUniverseEdges(
      live.ledger,
      theme,
      layoutEdges,
      materials,
    )
    stats = {
      ...stats,
      profileMaterials: Object.keys(materials.profiles).length,
    }

    const anchor = anchorKey
      ? universeNodes.find((n) => n.id === anchorKey)
      : undefined
    try {
      const groups = live.groups as {
        edges: { add(g: unknown): void }
        nodes: { add(g: unknown): void }
        core: { add(g: unknown): void }
      }
      groups.edges.add(edgeVisuals.group)
      groups.nodes.add(nodeVisuals.group)
      if (anchor) {
        const coreVisuals = createUniverseCore(materials, {
          radius: anchor.radius,
        })
        groups.core.add(coreVisuals.group)
      }
    } catch {
      // A stub core without group hooks: visuals exist headless for tests.
    }

    if (options.labelsContainer) {
      try {
        labelLayer = createLabelLayer({
          container: options.labelsContainer,
          variant: 'chip',
          metaById: new Map(),
        })
      } catch {
        labelLayer = null
      }
    }

    live.setOnFrame(captureStats)
  }

  function incidentSet(): Set<string> | null {
    if (selectedNodeId == null && selectedRelationId == null) return null
    const incident = new Set<string>()
    if (selectedNodeId != null) {
      const hood = neighborhoodOf(payload, selectedNodeId)
      incident.add(selectedNodeId)
      for (const key of [...hood.parents, ...hood.children]) incident.add(key)
    }
    if (selectedRelationId != null) {
      const relation = payload.relations.find(
        (r) => r.key === selectedRelationId,
      )
      if (relation) {
        incident.add(relation.source)
        incident.add(relation.target)
      }
    }
    return incident
  }

  function applyEmphasis(): void {
    const incident = incidentSet()
    const selectedEdge =
      selectedRelationId != null
        ? (layoutEdges.find((edge) => edge.id === selectedRelationId) ?? null)
        : null
    nodeVisuals?.setEmphasis({
      selectedId: selectedNodeId,
      incidentIds: incident,
      selectedEdge: selectedEdge
        ? { source: selectedEdge.source, target: selectedEdge.target }
        : null,
      hoveredId,
    })
    edgeVisuals?.setEmphasis({
      selectedNodeId: selectedNodeId,
      selectedEdgeId: selectedRelationId,
    })
    labelLayer?.setSelected(selectedNodeId)
  }

  function requestChange(): void {
    if (disposed) return
    live?.requestRender()
  }

  /** Apply the orbit to the camera. Never touches FOV or model scale. */
  function applyOrbit(): void {
    const camera = live?.camera as unknown as {
      position?: { set(x: number, y: number, z: number): void }
      lookAt?(x: number, y: number, z: number): void
    } | null
    try {
      const distance = baseDistance * orbit.distanceScale
      const y = Math.sin(orbit.pitch) * distance
      const horizontal = Math.cos(orbit.pitch) * distance
      camera?.position?.set(
        frameCenter.x + Math.sin(orbit.yaw) * horizontal,
        frameCenter.y + y,
        frameCenter.z + Math.cos(orbit.yaw) * horizontal,
      )
      camera?.lookAt?.(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z)
    } catch {
      // Stub camera in unit tests: the pose math above is still asserted.
    }
    // Reduced motion settles synchronously (instant); full motion coalesces
    // through the scheduler. Task 17 adds the bounded transition on the
    // full-motion path; until then both paths apply the pose exactly once.
    if (motion === 'reduced' || motion === 'off') live?.renderNow()
    else requestChange()
  }

  function captureStats(): void {
    try {
      const renderer = live?.renderer as unknown as {
        info?: { render?: { triangles?: number; calls?: number } }
        getPixelRatio?(): number
      } | null
      const info = renderer?.info?.render
      const projection = live?.projection()
      stats = {
        nodes: universeNodes.length,
        edges: layoutEdges.length,
        triangles: info?.triangles ?? sharedSphereTriangles(),
        drawCalls: info?.calls ?? 0,
        pixelRatio: renderer?.getPixelRatio?.() ?? stats.pixelRatio,
        nodeGeometries: 1,
        profileMaterials: stats.profileMaterials,
      }
      if (projection && options.onFrame) {
        const projected = projectNodes(
          universeNodes,
          projection.matrix,
          projection.width,
          projection.height,
        )
        const labels: ProjectedLabel[] = projected.map((node) => ({
          id: node.id,
          x: Math.round(node.x * 10) / 10,
          y: Math.round(node.y * 10) / 10,
          visible: node.visible,
        }))
        labelLayer?.render(labels, labelByKey, projected)
        options.onFrame(labels, projected)
      }
    } catch {
      // Statistics must never break rendering.
    }
  }

  function emphasis(): AtlasSceneEmphasis {
    const incident = incidentSet() ?? new Set<string>()
    const dimmed =
      selectedNodeId == null && selectedRelationId == null
        ? []
        : universeNodes
            .map((n) => n.id)
            .filter((key) => !incident.has(key))
            .sort()
    return {
      selectedNodeId,
      selectedRelationId,
      incident: [...incident].sort(),
      dimmed,
    }
  }

  /** Mutate selection state without rendering; the caller renders once. */
  function setSelectionState(nodeKey: string | null): void {
    selectedNodeId = nodeKey
    if (nodeKey != null) selectedRelationId = null
    applyEmphasis()
  }

  function setRelationState(relationKey: string | null): void {
    selectedRelationId = relationKey
    if (relationKey != null) selectedNodeId = null
    applyEmphasis()
  }

  live?.renderNow()

  return {
    orbit: () => ({ ...orbit }),
    rotateBy(deltaYaw, deltaPitch) {
      orbit = {
        yaw: orbit.yaw + deltaYaw,
        pitch: clamp(
          orbit.pitch + deltaPitch,
          ATLAS_ORBIT_LIMITS.minPitch,
          ATLAS_ORBIT_LIMITS.maxPitch,
        ),
        distanceScale: orbit.distanceScale,
      }
      applyOrbit()
    },
    zoomBy(factor) {
      orbit = {
        ...orbit,
        distanceScale: clamp(
          orbit.distanceScale * factor,
          ATLAS_ORBIT_LIMITS.minDistanceScale,
          ATLAS_ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      applyOrbit()
    },
    focusNode(nodeKey) {
      // No-op for unknown keys — membership is the model's, not the camera's.
      const node = universeNodes.find((n) => n.id === nodeKey)
      if (!node) return
      setSelectionState(nodeKey)
      // Focus is relative to the composition centre, so the node lands in
      // the middle of the frame rather than off to one side.
      const dx = node.point.x - frameCenter.x
      const dy = node.point.y - frameCenter.y
      const dz = node.point.z - frameCenter.z
      const distance = Math.hypot(dx, dy, dz) || 1
      const yaw = Math.atan2(dx, dz)
      const pitch = clamp(Math.asin(dy / distance), -0.6, 0.6)
      orbit = {
        yaw,
        pitch,
        distanceScale: clamp(
          0.62 + distance / Math.max(baseDistance, 1),
          ATLAS_ORBIT_LIMITS.minDistanceScale,
          ATLAS_ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      lookAtPoint = copyPoint(node.point)
      // Bounded transitions land in Task 17; today every motion applies once.
      applyOrbit()
    },
    resetView() {
      orbit = { ...HOME_ORBIT }
      lookAtPoint = copyPoint(frameCenter)
      applyOrbit()
    },
    setSelection(nodeKey) {
      setSelectionState(nodeKey)
      requestChange()
    },
    setSelectedRelation(relationKey) {
      setRelationState(relationKey)
      requestChange()
    },
    setHovered(nodeKey) {
      if (hoveredId === nodeKey) return
      hoveredId = nodeKey
      applyEmphasis()
      requestChange()
    },
    setState(state, key = null) {
      if (state === 'node') this.setSelection(key)
      else if (state === 'relation') this.setSelectedRelation(key)
      else {
        selectedNodeId = null
        selectedRelationId = null
        applyEmphasis()
        requestChange()
      }
    },
    emphasis,
    setTheme(next) {
      theme = next
      live?.setTheme(next)
      nodeVisuals?.applyTheme(next)
      edgeVisuals?.applyTheme(next)
      requestChange()
    },
    setMotion(next) {
      // Task 17 owns the bounded transitions; the field is read there.
      motion = next
    },
    setVisible(visible) {
      live?.setVisible(visible)
    },
    resize(width, height, devicePixelRatio) {
      const result = live?.resize(
        width,
        height,
        devicePixelRatio,
      ) as unknown as
        { isMobile?: boolean; pixelRatio?: number } | null | undefined
      isMobile = result?.isMobile ?? width < 768
      if (typeof result?.pixelRatio === 'number') {
        stats = { ...stats, pixelRatio: result.pixelRatio }
      }
      baseDistance = fitDistance(
        bounds,
        width / Math.max(height, 1),
        FOV,
        isMobile ? MOBILE_FIT_PADDING : DESKTOP_FIT_PADDING,
        frameCenter,
      )
      applyOrbit()
    },
    render() {
      live?.renderNow()
    },
    stats: () => ({ ...stats }),
    dispose() {
      if (disposed) return
      disposed = true
      try {
        labelLayer?.clear()
      } catch {
        // Teardown must not throw.
      }
      live?.dispose()
    },
  }
}
