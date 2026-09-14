/**
 * RU-04 / RU-4B — Full interactive About scene.
 *
 * The SAME engine as Home, with real camera control: pointer drag orbits,
 * wheel/pinch zooms within hard limits, a node can be focused, and the view can be
 * reset. Nothing is added to the graph to make the interaction richer —
 * interaction richness comes from the camera, not from invented records.
 *
 * "Do not create a second visual implementation for About" is structural here:
 * this module shares `spheres.ts` (one geometry), `materials.ts` (one presentation
 * registry), `presentation-profiles.ts` (one material language) and `edges.ts`
 * (one relationship implementation) with Home. Only the interaction contract
 * differs — Home is scroll-driven and guided, About is pointer-driven.
 *
 * RU-4B also removed the layout rebuild on a breakpoint change and the orbital
 * plane dependency, for the same reasons as Home: positions are a pure function of
 * the published model, so neither a resize nor a theme switch can move a node.
 *
 * Interaction contract:
 * - camera motion is bounded (pitch, distance) so the model can never be lost;
 * - focus/reset transitions are short, cancelling and motion-preference aware;
 * - picking is the shared screen-space picker, so what is drawn is what is
 *   selectable.
 */

import * as THREE from 'three'
import type {
  ProjectedLabel,
  SceneErrorCode,
  SceneMotionPreference,
} from '../scene-contract'
import type { ReadyUniverse } from '../../research-universe/model'
import { createUniverseCore } from './core-object'
import { createUniverseEdges, type UniverseEdgeVisuals } from './edges'
import { createUniverseNodes, type UniverseNodeVisuals } from './nodes'
import { createUniverseMaterials } from './materials'
import {
  compositionTarget,
  computeUniverseLayout,
  fitDistance,
  type UniverseLayout,
} from './layout'
import {
  pickAt,
  projectEdges,
  projectNodes,
  type ProjectedNode3D,
} from './hit-testing'
import { createSceneCore, type SceneCore } from './scene-core'
import type { UniverseRenderTheme } from './theme'

export interface OrbitPose {
  yaw: number
  pitch: number
  distanceScale: number
}

export const ABOUT_ORBIT_LIMITS = {
  minPitch: -0.95,
  maxPitch: 0.95,
  minDistanceScale: 0.55,
  maxDistanceScale: 2.1,
} as const

export interface AboutSceneStats {
  nodes: number
  edges: number
  triangles: number
  drawCalls: number
  pixelRatio: number
  /** Distinct geometry objects the node layer draws with (must be 1). */
  nodeGeometries: number
  /** Distinct material instances in the presentation registry. */
  profileMaterials: number
}

export interface AboutSceneHandle {
  orbit(): OrbitPose
  rotateBy(deltaYaw: number, deltaPitch: number): void
  zoomBy(factor: number): void
  focusNode(nodeId: string): void
  resetView(animate?: boolean): void
  setSelection(selectedId: string | null): void
  setSelectedEdge(edgeId: string | null): void
  setHovered(nodeId: string | null): void
  selectAt(
    offsetX: number,
    offsetY: number,
  ): { kind: 'node' | 'edge' | 'none'; id: string | null }
  setTheme(theme: UniverseRenderTheme): void
  setMotion(motion: SceneMotionPreference): void
  setVisible(visible: boolean): void
  resize(width: number, height: number, devicePixelRatio: number): void
  render(): void
  stats(): AboutSceneStats
  dispose(): void
}

const FOV = 42
const HOME_ORBIT: OrbitPose = { yaw: 0.22, pitch: 0.24, distanceScale: 1 }

/**
 * RU-4C — where the camera looks, which is NOT always the composition centre.
 *
 * The authored composition puts the identity off the domain centroid on purpose,
 * so "point at the composition centre" is the wrong answer once a node is
 * focused: the orbit can rotate to the node's bearing but the clamped pitch
 * still leaves it off-axis, and an off-axis node at focus distance lands outside
 * the frame. Focus animates this point onto the node instead.
 */
function copyPoint(point: { x: number; y: number; z: number }) {
  return { x: point.x, y: point.y, z: point.z }
}
const MOBILE_FIT_PADDING = 1.34
const DESKTOP_FIT_PADDING = 1.14

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

export function createAboutScene(options: {
  canvas: HTMLCanvasElement
  universe: Pick<ReadyUniverse, 'nodes' | 'edges' | 'anchor'>
  theme: UniverseRenderTheme
  motion?: SceneMotionPreference
  onFrame?: (labels: ProjectedLabel[], projected: ProjectedNode3D[]) => void
  onError?: (code: SceneErrorCode) => void
}): AboutSceneHandle | null {
  const { canvas, universe, onFrame, onError } = options
  let theme = options.theme
  let motion: SceneMotionPreference = options.motion ?? 'full'

  const created = createSceneCore({ canvas, theme, fov: FOV, onError })
  if (!created) return null
  // Non-null alias: the builders below are nested functions, and TypeScript does
  // not carry a closure-scope narrowing of the nullable original into them.
  const core: SceneCore = created

  const model = new THREE.Group()
  model.name = 'universe-model'
  core.scene.add(model)

  const materials = createUniverseMaterials(core.ledger, theme)
  // Positions never depend on the viewport, so they are computed exactly once.
  const layout: UniverseLayout = computeUniverseLayout(
    universe.nodes,
    universe.edges,
  )
  /**
   * RU-4C composition: the camera orbits the DOMAIN CENTROID, not the origin, so
   * the identity node sits off the geometric centre of the frame while the three
   * domains stay balanced — the same framing rule Home uses.
   */
  const frameCenter = compositionTarget(layout.nodes)
  /** The point the camera currently looks at; eased by focus/reset. */
  let lookAtPoint = copyPoint(frameCenter)

  model.add(core.groups.edges)
  model.add(core.groups.nodes)
  model.add(core.groups.core)

  const nodes: UniverseNodeVisuals = createUniverseNodes(
    core.ledger,
    theme,
    layout.nodes,
    materials,
  )
  const edges: UniverseEdgeVisuals = createUniverseEdges(
    core.ledger,
    theme,
    layout.edges,
    materials,
  )
  const anchorNode = universe.anchor.id
    ? layout.nodes.find((node) => node.id === universe.anchor.id)
    : undefined
  const coreVisuals = createUniverseCore(materials, {
    radius: anchorNode?.radius ?? 6,
  })

  core.groups.edges.add(edges.group)
  core.groups.nodes.add(nodes.group)
  core.groups.core.add(coreVisuals.group)

  let baseDistance = 360
  let orbit: OrbitPose = { ...HOME_ORBIT }
  let isMobile = false
  let selectedId: string | null = null
  let selectedEdgeId: string | null = null
  let hoveredId: string | null = null
  let animation: number | null = null
  let stats: AboutSceneStats = {
    nodes: layout.nodes.length,
    edges: layout.edges.length,
    triangles: 0,
    drawCalls: 0,
    pixelRatio: 1,
    nodeGeometries: 1,
    profileMaterials: Object.keys(materials.profiles).length,
  }

  function nodeById(id: string) {
    return layout.nodes.find((node) => node.id === id) ?? null
  }

  function incidentIdsFor(id: string | null): Set<string> | null {
    if (id == null) return null
    const incident = new Set<string>([id])
    for (const edge of layout.edges) {
      if (edge.source === id) incident.add(edge.target)
      if (edge.target === id) incident.add(edge.source)
    }
    return incident
  }

  function emphasis(): void {
    nodes.setEmphasis({
      selectedId,
      incidentIds: incidentIdsFor(selectedId),
      selectedEdge:
        selectedEdgeId != null
          ? (layout.edges.find((edge) => edge.id === selectedEdgeId) ?? null)
          : null,
      hoveredId,
    })
    edges.setEmphasis({ selectedNodeId: selectedId, selectedEdgeId })
  }

  /** Apply the orbit to the camera. Never touches FOV or model scale. */
  function applyOrbit(): void {
    const distance = baseDistance * orbit.distanceScale
    const y = Math.sin(orbit.pitch) * distance
    const horizontal = Math.cos(orbit.pitch) * distance
    core.camera.position.set(
      frameCenter.x + Math.sin(orbit.yaw) * horizontal,
      frameCenter.y + y,
      frameCenter.z + Math.cos(orbit.yaw) * horizontal,
    )
    core.camera.lookAt(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z)
    core.requestRender()
  }

  function projectLabels(): void {
    if (!onFrame) return
    const { matrix, width, height } = core.projection()
    const projected = projectNodes(layout.nodes, matrix, width, height)
    // RU-2B: the same projection feeds the labels AND their leader lines.
    onFrame(
      projected.map((node) => ({
        id: node.id,
        x: Math.round(node.x * 10) / 10,
        y: Math.round(node.y * 10) / 10,
        visible: node.visible,
      })),
      projected,
    )
  }

  function captureStats(): void {
    const info = core.renderer.info
    stats = {
      nodes: layout.nodes.length,
      edges: layout.edges.length,
      triangles: info.render.triangles,
      drawCalls: info.render.calls,
      pixelRatio: core.renderer.getPixelRatio(),
      nodeGeometries: 1,
      profileMaterials: Object.keys(materials.profiles).length,
    }
    projectLabels()
  }

  function cancelAnimation(): void {
    if (animation == null) return
    if (typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(animation)
    else clearTimeout(animation as unknown as ReturnType<typeof setTimeout>)
    animation = null
  }

  /**
   * Short bounded transition for focus/reset. Driven by rAF only for the
   * duration of the transition, so an idle About scene schedules no frames.
   */
  function animateTo(
    target: OrbitPose,
    durationMs: number,
    focusPoint: { x: number; y: number; z: number } = frameCenter,
  ): void {
    cancelAnimation()
    const reduced =
      motion !== 'full' || typeof requestAnimationFrame !== 'function'
    if (reduced || durationMs <= 0) {
      orbit = {
        yaw: target.yaw,
        pitch: clamp(
          target.pitch,
          ABOUT_ORBIT_LIMITS.minPitch,
          ABOUT_ORBIT_LIMITS.maxPitch,
        ),
        distanceScale: clamp(
          target.distanceScale,
          ABOUT_ORBIT_LIMITS.minDistanceScale,
          ABOUT_ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      lookAtPoint = copyPoint(focusPoint)
      applyOrbit()
      return
    }

    const from = { ...orbit }
    const fromLook = copyPoint(lookAtPoint)
    const startedAt = performance.now()
    const step = () => {
      const elapsed = performance.now() - startedAt
      const t = Math.min(elapsed / durationMs, 1)
      const eased = t * t * (3 - 2 * t)
      orbit = {
        yaw: from.yaw + (target.yaw - from.yaw) * eased,
        pitch: from.pitch + (target.pitch - from.pitch) * eased,
        distanceScale:
          from.distanceScale +
          (target.distanceScale - from.distanceScale) * eased,
      }
      lookAtPoint = {
        x: fromLook.x + (focusPoint.x - fromLook.x) * eased,
        y: fromLook.y + (focusPoint.y - fromLook.y) * eased,
        z: fromLook.z + (focusPoint.z - fromLook.z) * eased,
      }
      applyOrbit()
      if (t < 1) animation = requestAnimationFrame(step)
      else animation = null
    }
    animation = requestAnimationFrame(step)
  }

  function applySize(
    width: number,
    height: number,
    devicePixelRatio: number,
  ): void {
    const result = core.resize(width, height, devicePixelRatio)
    isMobile = result.isMobile
    baseDistance = fitDistance(
      layout.bounds,
      width / Math.max(height, 1),
      FOV,
      // A projected label chip is drawn ABOVE its node and can be up to 9rem
      // wide, so a narrow stage needs more edge room than the desktop's 1.14:
      // at 1.14 the canonical mobile view pushed the left-hand chip outside the
      // clipped stage (measured: label left = -18px at a 390px viewport).
      isMobile ? MOBILE_FIT_PADDING : DESKTOP_FIT_PADDING,
      frameCenter,
    )
    applyOrbit()
    stats = { ...stats, pixelRatio: result.pixelRatio }
  }

  core.setOnFrame(captureStats)
  emphasis()
  applyOrbit()

  return {
    orbit() {
      return { ...orbit }
    },
    rotateBy(deltaYaw, deltaPitch) {
      orbit = {
        yaw: orbit.yaw + deltaYaw,
        pitch: clamp(
          orbit.pitch + deltaPitch,
          ABOUT_ORBIT_LIMITS.minPitch,
          ABOUT_ORBIT_LIMITS.maxPitch,
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
          ABOUT_ORBIT_LIMITS.minDistanceScale,
          ABOUT_ORBIT_LIMITS.maxDistanceScale,
        ),
      }
      applyOrbit()
    },
    focusNode(nodeId) {
      const node = nodeById(nodeId)
      if (!node) return
      // Focus is relative to the composition centre, so the node being focused
      // ends up in the middle of the frame rather than off to one side.
      const dx = node.point.x - frameCenter.x
      const dy = node.point.y - frameCenter.y
      const dz = node.point.z - frameCenter.z
      const distance = Math.hypot(dx, dy, dz) || 1
      const yaw = Math.atan2(dx, dz)
      const pitch = clamp(Math.asin(dy / distance), -0.6, 0.6)
      animateTo(
        {
          yaw,
          pitch,
          distanceScale: clamp(
            0.62 + distance / Math.max(baseDistance, 1),
            ABOUT_ORBIT_LIMITS.minDistanceScale,
            ABOUT_ORBIT_LIMITS.maxDistanceScale,
          ),
        },
        420,
        // Look at the node itself, so it lands in the middle of the frame and its
        // selection rim is fully inside the canvas.
        node.point,
      )
    },
    resetView(animate = true) {
      if (animate) animateTo(HOME_ORBIT, 380, frameCenter)
      else {
        orbit = { ...HOME_ORBIT }
        lookAtPoint = copyPoint(frameCenter)
        cancelAnimation()
        applyOrbit()
      }
    },
    setSelection(id) {
      selectedId = id
      if (id != null) selectedEdgeId = null
      emphasis()
      core.requestRender()
    },
    setSelectedEdge(edgeId) {
      selectedEdgeId = edgeId
      if (edgeId != null) selectedId = null
      emphasis()
      core.requestRender()
    },
    setHovered(nodeId) {
      if (hoveredId === nodeId) return
      hoveredId = nodeId
      emphasis()
      core.requestRender()
    },
    selectAt(offsetX, offsetY) {
      const { matrix, width, height } = core.projection()
      const picked = pickAt(
        { x: offsetX, y: offsetY },
        projectNodes(layout.nodes, matrix, width, height),
        projectEdges(layout.edges, matrix, width, height),
      )
      if (picked.kind === 'node') {
        selectedId = picked.id
        selectedEdgeId = null
      } else if (picked.kind === 'edge') {
        selectedEdgeId = picked.id
        selectedId = null
      } else {
        selectedId = null
        selectedEdgeId = null
      }
      emphasis()
      core.requestRender()
      return picked
    },
    setTheme(next) {
      theme = next
      core.setTheme(next)
      nodes.applyTheme(next)
      edges.applyTheme(next)
      core.requestRender()
    },
    setMotion(next) {
      motion = next
      if (next !== 'full') cancelAnimation()
    },
    setVisible(visible) {
      core.setVisible(visible)
    },
    resize(width, height, devicePixelRatio) {
      applySize(width, height, devicePixelRatio)
    },
    render() {
      core.renderNow()
    },
    stats() {
      return stats
    },
    dispose() {
      cancelAnimation()
      core.dispose()
    },
  }
}
