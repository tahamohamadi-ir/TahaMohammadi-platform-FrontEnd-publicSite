import * as THREE from 'three'

import { resolveLayout } from '../../atlas/layout'
import type { AtlasPayload } from '../../atlas/model'
import { neighborhoodOf, type Neighborhood } from '../../atlas/neighborhood'
import type { AtlasSelectionMode } from '../../atlas/selection'
import type { AtlasFocus } from '../../atlas/url-state'
import type {
  ProjectedLabel,
  SceneErrorCode,
  SceneMotionPreference,
} from '../scene-contract'
import { createUniverseCore } from '../research-universe/core-object'
import {
  createUniverseEdges,
  type UniverseEdgeVisuals,
} from '../research-universe/edges'
import type {
  PickResult,
  ProjectedNode3D,
} from '../research-universe/hit-testing'
import {
  bowForEdge,
  buildEdgeCurve,
  fitDistance,
  sampleCubic,
  type UniverseBounds,
  type UniverseEdge3D,
  type UniverseNode3D,
} from '../research-universe/layout'
import { createUniverseMaterials } from '../research-universe/materials'
import {
  createUniverseNodes,
  type UniverseNodeVisuals,
} from '../research-universe/nodes'
import {
  RU_PROFILE_CHARACTER,
  resolvePresentationProfile,
} from '../research-universe/presentation-profiles'
import {
  createSceneCore,
  type SceneCore,
} from '../research-universe/scene-core'
import {
  sharedFineSphereGeometry,
  sharedSphereGeometry,
} from '../research-universe/spheres'
import type { UniverseRenderTheme } from '../research-universe/theme'
import {
  edgeSampleCountFor,
  projectAtlasPick,
  visibleLabelKeys,
} from './picking'

export interface AtlasOrbitPose {
  yaw: number
  pitch: number
  distanceScale: number
}

export interface AtlasSceneStats {
  nodes: number
  relations: number
  triangles: number
  drawCalls: number
  pixelRatio: number
  nodeGeometries: number
  profileMaterials: number
  emphasizedNodeKeys: string[]
  dimmedNodeKeys: string[]
  ledger: { geometries: number; materials: number; listeners: number }
}

export interface AtlasSceneFrame {
  projectedNodes: ProjectedNode3D[]
}

export interface AtlasSceneOptions {
  canvas: HTMLCanvasElement
  payload: AtlasPayload
  theme: UniverseRenderTheme
  motion?: SceneMotionPreference
  labels?: AtlasLabelLayer | null
  onFrame?: (frame: AtlasSceneFrame) => void
  onError?: (code: SceneErrorCode) => void
}

export interface AtlasLabelLayer {
  render(
    labels: ReadonlyArray<ProjectedLabel>,
    labelById: ReadonlyMap<string, string>,
    projectedNodes?: ReadonlyArray<ProjectedNode3D>,
  ): void
  setSelected(id: string | null): void
  setVisible(visible: boolean): void
}

export interface AtlasSceneHandle {
  setSelection(focus: AtlasFocus | string | null): void
  setSelectedRelation(relationKey: string | null): void
  setHovered(nodeKey: string | null): void
  setState(state: AtlasSelectionMode, key?: string | null): void
  orbit(deltaYaw?: number, deltaPitch?: number): AtlasOrbitPose
  zoomBy(factor: number): void
  pickAt(x: number, y: number): PickResult
  reframeSelection(focus: AtlasFocus | null, effectiveWidth?: number): void
  focusNode(nodeKey: string, effectiveWidth?: number): void
  focusRelation(relationKey: string, effectiveWidth?: number): void
  resetView(animate?: boolean): void
  setTheme(theme: UniverseRenderTheme): void
  setMotion(motion: SceneMotionPreference): void
  setVisible(visible: boolean): void
  resize(width: number, height: number, devicePixelRatio: number): void
  render(): void
  stats(): AtlasSceneStats
  dispose(): void
}

const FOV = 42
const HOME_ORBIT: AtlasOrbitPose = {
  yaw: 0.22,
  pitch: 0.24,
  distanceScale: 1,
}
const ORBIT_LIMITS = {
  minPitch: -0.95,
  maxPitch: 0.95,
  minDistanceScale: 0.55,
  maxDistanceScale: 2.1,
} as const

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

function nodeKind(
  type: string,
  tier: 'primary' | 'fine',
): UniverseNode3D['kind'] {
  if (type === 'identity' || type === 'person') return 'person'
  if (type === 'project') return 'project'
  if (type === 'publication') return 'publication'
  if (type === 'tool') return 'tool'
  return tier === 'primary' ? 'domain' : 'other'
}

function universeBounds(
  bounds: ReturnType<typeof resolveLayout>['bounds'],
): UniverseBounds {
  return {
    ...bounds,
    extent: Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ,
      1,
    ),
  }
}

function incidentKeys(
  neighborhood: Neighborhood,
  selected: string,
): Set<string> {
  const keys = new Set<string>([
    selected,
    ...neighborhood.parents,
    ...neighborhood.children,
  ])
  for (const link of neighborhood.incoming) keys.add(link.nodeKey)
  for (const link of neighborhood.outgoing) keys.add(link.nodeKey)
  return keys
}

export function createAtlasScene(
  options: AtlasSceneOptions,
): AtlasSceneHandle | null {
  const { canvas, payload, onFrame, onError } = options
  const labels = options.labels ?? null
  let theme = options.theme
  let motion: SceneMotionPreference = options.motion ?? 'full'

  const created = createSceneCore({ canvas, theme, fov: FOV, onError })
  if (!created) return null
  const core: SceneCore = created
  const atlasLayout = resolveLayout(payload)
  const identityKey =
    payload.nodes.find(
      (node) => node.type === 'identity' || node.type === 'person',
    )?.key ?? null

  const payloadByKey = new Map(payload.nodes.map((node) => [node.key, node]))
  const layoutNodes: UniverseNode3D[] = atlasLayout.nodes.map((layoutNode) => {
    const node = payloadByKey.get(layoutNode.key)
    if (!node) throw new Error(`Atlas layout node missing: ${layoutNode.key}`)
    const kind = nodeKind(node.type, layoutNode.tier)
    const profile = resolvePresentationProfile({
      label: node.label ?? node.key,
      kind,
    })
    return {
      id: node.key,
      kind,
      level:
        node.key === identityKey ? 0 : layoutNode.tier === 'primary' ? 1 : 2,
      weight: node.importance,
      colorRole: String(RU_PROFILE_CHARACTER[profile].colorRole),
      role: node.key === identityKey ? 'central-anchor' : 'standard',
      profile,
      radius: layoutNode.radius,
      visualScale: 1,
      point: {
        x: layoutNode.x,
        y: layoutNode.y,
        z: layoutNode.z,
      },
      azimuth: Math.atan2(layoutNode.y, layoutNode.x),
      positionSource: 'derived',
    }
  })
  const layoutNodeByKey = new Map(
    layoutNodes.map((node) => [node.id, node] as const),
  )
  const relationPriority = new Map(
    payload.relationTypes.map((type) => [type.key, type.visualPriority]),
  )
  const layoutEdges: UniverseEdge3D[] = []
  for (const relation of payload.relations) {
    const source = layoutNodeByKey.get(relation.source)
    const target = layoutNodeByKey.get(relation.target)
    if (!source || !target) continue
    const bow = bowForEdge(relation.key)
    const curve = buildEdgeCurve(
      source.point,
      source.radius,
      target.point,
      target.radius,
      bow,
    )
    const samples = sampleCubic(
      curve.start,
      curve.c1,
      curve.c2,
      curve.end,
      edgeSampleCountFor(relationPriority.get(relation.type) ?? 50),
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
      samples,
      c1: curve.c1,
      c2: curve.c2,
      bow,
    })
  }

  const model = new THREE.Group()
  model.name = 'atlas-model'
  core.scene.add(model)
  model.add(core.groups.edges, core.groups.nodes, core.groups.core)

  const materials = createUniverseMaterials(core.ledger, theme)
  const nodes: UniverseNodeVisuals = createUniverseNodes(
    core.ledger,
    theme,
    layoutNodes,
    materials,
    {
      domain: sharedSphereGeometry(),
      fine: sharedFineSphereGeometry(),
    },
    false,
  )
  const edges: UniverseEdgeVisuals = createUniverseEdges(
    core.ledger,
    theme,
    layoutEdges,
    materials,
  )
  core.groups.nodes.add(nodes.group)
  core.groups.edges.add(edges.group)

  const identityNode =
    identityKey == null ? null : (layoutNodeByKey.get(identityKey) ?? null)
  if (identityNode) {
    const identity = createUniverseCore(materials, {
      radius: identityNode.radius,
    })
    identity.group.position.set(
      identityNode.point.x,
      identityNode.point.y,
      identityNode.point.z,
    )
    core.groups.core.add(identity.group)
  }

  const frameCenter = atlasLayout.center
  const bounds = universeBounds(atlasLayout.bounds)
  let baseDistance = 360
  let orbit: AtlasOrbitPose = { ...HOME_ORBIT }
  let lookAt = { ...frameCenter }
  let state: AtlasSelectionMode = 'overview'
  let selectedNodeKey: string | null = null
  let selectedRelationKey: string | null = null
  let hoveredNodeKey: string | null = null
  let emphasizedNodeKeys: string[] = []
  let dimmedNodeKeys: string[] = []
  const labelById = new Map(
    payload.nodes.map((node) => [node.key, node.label ?? node.key]),
  )
  let animation: number | null = null
  let disposed = false

  function cancelAnimation(): void {
    if (animation == null) return
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(animation)
    } else {
      clearTimeout(animation as unknown as ReturnType<typeof setTimeout>)
    }
    animation = null
  }

  function applyOrbit(): void {
    const distance = baseDistance * orbit.distanceScale
    const vertical = Math.sin(orbit.pitch) * distance
    const horizontal = Math.cos(orbit.pitch) * distance
    core.camera.position.set(
      frameCenter.x + Math.sin(orbit.yaw) * horizontal,
      frameCenter.y + vertical,
      frameCenter.z + Math.cos(orbit.yaw) * horizontal,
    )
    core.camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
    core.requestRender()
  }

  function animateTo(
    target: AtlasOrbitPose,
    durationMs: number,
    targetLookAt = frameCenter,
  ): void {
    cancelAnimation()
    const instant =
      motion !== 'full' || typeof requestAnimationFrame !== 'function'
    if (instant || durationMs <= 0) {
      orbit = {
        yaw: target.yaw,
        pitch: clamp(
          target.pitch,
          ORBIT_LIMITS.minPitch,
          ORBIT_LIMITS.maxPitch,
        ),
        distanceScale: clamp(
          target.distanceScale,
          ORBIT_LIMITS.minDistanceScale,
          ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      lookAt = { ...targetLookAt }
      applyOrbit()
      return
    }

    const from = { ...orbit }
    const fromLookAt = { ...lookAt }
    const startedAt = performance.now()
    const step = () => {
      const progress = Math.min((performance.now() - startedAt) / durationMs, 1)
      const eased = progress * progress * (3 - 2 * progress)
      orbit = {
        yaw: from.yaw + (target.yaw - from.yaw) * eased,
        pitch: from.pitch + (target.pitch - from.pitch) * eased,
        distanceScale:
          from.distanceScale +
          (target.distanceScale - from.distanceScale) * eased,
      }
      lookAt = {
        x: fromLookAt.x + (targetLookAt.x - fromLookAt.x) * eased,
        y: fromLookAt.y + (targetLookAt.y - fromLookAt.y) * eased,
        z: fromLookAt.z + (targetLookAt.z - fromLookAt.z) * eased,
      }
      applyOrbit()
      if (progress < 1) animation = requestAnimationFrame(step)
      else animation = null
    }
    animation = requestAnimationFrame(step)
  }

  function poseForPoint(
    point: { x: number; y: number; z: number },
    effectiveWidth?: number,
  ): AtlasOrbitPose {
    const dx = point.x - frameCenter.x
    const dy = point.y - frameCenter.y
    const dz = point.z - frameCenter.z
    const distance = Math.hypot(dx, dy, dz) || 1
    const projectionWidth = core.projection().width
    const width = Math.max(effectiveWidth ?? projectionWidth, 1)
    const inspectorCompensation = Math.sqrt(
      Math.max(projectionWidth, 1) / width,
    )
    return {
      yaw: Math.atan2(dx, dz),
      pitch: clamp(Math.asin(dy / distance), -0.6, 0.6),
      distanceScale: clamp(
        (0.62 + distance / Math.max(baseDistance, 1)) *
          inspectorCompensation,
        ORBIT_LIMITS.minDistanceScale,
        ORBIT_LIMITS.maxDistanceScale,
      ),
    }
  }

  function framePoint(
    point: { x: number; y: number; z: number },
    effectiveWidth: number | undefined,
    full: boolean,
  ): void {
    const target = poseForPoint(point, effectiveWidth)
    if (!full) {
      target.distanceScale = clamp(
        target.distanceScale,
        orbit.distanceScale * 0.85,
        orbit.distanceScale * 1.15,
      )
    }
    animateTo(target, full ? 420 : 260, point)
  }

  function focusForState(): AtlasFocus | null {
    if (state === 'node' && selectedNodeKey) {
      return { kind: 'node', key: selectedNodeKey }
    }
    if (state === 'relation' && selectedRelationKey) {
      return { kind: 'relation', key: selectedRelationKey }
    }
    return null
  }

  function pointForFocus(
    focus: AtlasFocus | null,
  ): { x: number; y: number; z: number } | null {
    if (!focus) return null
    if (focus.kind === 'node') {
      return layoutNodeByKey.get(focus.key)?.point ?? null
    }
    const edge = layoutEdges.find((candidate) => candidate.id === focus.key)
    return edge?.samples[Math.floor(edge.samples.length / 2)] ?? null
  }

  function applyEmphasis(): void {
    const activeNode = state === 'node' ? selectedNodeKey : null
    const activeRelation = state === 'relation' ? selectedRelationKey : null
    const neighborhood =
      activeNode == null ? null : neighborhoodOf(payload, activeNode)
    const incident =
      activeNode == null || neighborhood == null
        ? null
        : incidentKeys(neighborhood, activeNode)
    const selectedEdge =
      activeRelation == null
        ? null
        : (layoutEdges.find((edge) => edge.id === activeRelation) ?? null)

    nodes.setEmphasis({
      selectedId: activeNode,
      incidentIds: incident,
      selectedEdge,
      hoveredId: hoveredNodeKey,
    })
    edges.setEmphasis({
      selectedNodeId: activeNode,
      selectedEdgeId: activeRelation,
    })

    emphasizedNodeKeys = incident ? [...incident].sort() : []
    dimmedNodeKeys =
      incident == null
        ? []
        : payload.nodes
            .map((node) => node.key)
            .filter((key) => !incident.has(key))
            .sort()
    labels?.setSelected(activeNode)
    core.requestRender()
  }

  function resize(
    width: number,
    height: number,
    devicePixelRatio: number,
  ): void {
    const result = core.resize(width, height, devicePixelRatio)
    baseDistance = fitDistance(
      bounds,
      width / Math.max(height, 1),
      FOV,
      result.isMobile ? 1.34 : 1.14,
      frameCenter,
    )
    applyOrbit()
  }

  core.setOnFrame(() => {
    const projection = core.projection()
    const projected = projectAtlasPick(
      { x: -1, y: -1 },
      layoutNodes,
      layoutEdges,
      projection.matrix,
      projection.width,
      projection.height,
    )
    const visible = new Set(
      visibleLabelKeys(payload, focusForState(), hoveredNodeKey),
    )
    labels?.render(
      projected.projectedNodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        visible: node.visible && visible.has(node.id),
      })),
      labelById,
      projected.projectedNodes,
    )
    onFrame?.({ projectedNodes: projected.projectedNodes })
  })
  applyEmphasis()
  resize(canvas.clientWidth || 1, canvas.clientHeight || 1, 1)

  return {
    setSelection(focus) {
      if (typeof focus === 'string') {
        selectedNodeKey = focus
        selectedRelationKey = null
        state = 'node'
      } else if (focus?.kind === 'node') {
        selectedNodeKey = focus.key
        selectedRelationKey = null
        state = 'node'
      } else if (focus?.kind === 'relation') {
        selectedRelationKey = focus.key
        selectedNodeKey = null
        state = 'relation'
      } else {
        selectedNodeKey = null
        selectedRelationKey = null
        state = 'overview'
      }
      applyEmphasis()
      const point = pointForFocus(focusForState())
      if (point) framePoint(point, undefined, false)
    },
    setSelectedRelation(relationKey) {
      selectedRelationKey = relationKey
      if (relationKey != null) {
        selectedNodeKey = null
        state = 'relation'
      } else if (state === 'relation') {
        state = 'overview'
      }
      applyEmphasis()
    },
    setHovered(nodeKey) {
      if (hoveredNodeKey === nodeKey) return
      hoveredNodeKey = nodeKey
      applyEmphasis()
    },
    setState(next, key) {
      state = next
      if (next === 'node' && key !== undefined) selectedNodeKey = key
      if (next === 'relation' && key !== undefined) selectedRelationKey = key
      if (next === 'overview') {
        selectedNodeKey = null
        selectedRelationKey = null
      }
      applyEmphasis()
    },
    orbit(deltaYaw, deltaPitch) {
      if (deltaYaw !== undefined || deltaPitch !== undefined) {
        cancelAnimation()
        orbit = {
          yaw: orbit.yaw + (deltaYaw ?? 0),
          pitch: clamp(
            orbit.pitch + (deltaPitch ?? 0),
            ORBIT_LIMITS.minPitch,
            ORBIT_LIMITS.maxPitch,
          ),
          distanceScale: orbit.distanceScale,
        }
        applyOrbit()
      }
      return { ...orbit }
    },
    zoomBy(factor) {
      cancelAnimation()
      orbit = {
        ...orbit,
        distanceScale: clamp(
          orbit.distanceScale * factor,
          ORBIT_LIMITS.minDistanceScale,
          ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      applyOrbit()
    },
    pickAt(x, y) {
      const projection = core.projection()
      return projectAtlasPick(
        { x, y },
        layoutNodes,
        layoutEdges,
        projection.matrix,
        projection.width,
        projection.height,
      ).result
    },
    reframeSelection(focus, effectiveWidth) {
      const point = pointForFocus(focus)
      if (point) framePoint(point, effectiveWidth, false)
    },
    focusNode(nodeKey, effectiveWidth) {
      const point = layoutNodeByKey.get(nodeKey)?.point
      if (point) framePoint(point, effectiveWidth, true)
    },
    focusRelation(relationKey, effectiveWidth) {
      const point = pointForFocus({ kind: 'relation', key: relationKey })
      if (point) framePoint(point, effectiveWidth, true)
    },
    resetView(animate = true) {
      if (animate) animateTo(HOME_ORBIT, 380, frameCenter)
      else {
        cancelAnimation()
        orbit = { ...HOME_ORBIT }
        lookAt = { ...frameCenter }
        applyOrbit()
      }
    },
    setTheme(next) {
      theme = next
      core.setTheme(theme)
      nodes.applyTheme(theme)
      edges.applyTheme(theme)
      applyEmphasis()
    },
    setMotion(next) {
      motion = next
      if (motion !== 'full') cancelAnimation()
    },
    setVisible(visible) {
      core.setVisible(visible)
      labels?.setVisible(visible)
    },
    resize,
    render() {
      core.renderNow()
    },
    stats() {
      const info = core.renderer.info
      const usedGeometryTiers = new Set(
        atlasLayout.nodes
          .filter((node) => node.key !== identityKey)
          .map((node) => node.tier),
      )
      return {
        nodes: layoutNodes.length,
        relations: layoutEdges.length,
        triangles: info.render.triangles,
        drawCalls: info.render.calls,
        pixelRatio: core.renderer.getPixelRatio(),
        nodeGeometries: usedGeometryTiers.size,
        profileMaterials: Object.keys(materials.profiles).length,
        emphasizedNodeKeys: [...emphasizedNodeKeys],
        dimmedNodeKeys: [...dimmedNodeKeys],
        ledger: core.ledger.counts,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimation()
      core.dispose()
    },
  }
}
