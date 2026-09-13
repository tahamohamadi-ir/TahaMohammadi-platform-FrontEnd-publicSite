/**
 * RU-04 — Full interactive About scene.
 *
 * The same engine as Home, with the FULL published graph and real camera
 * control: pointer drag orbits, wheel/pinch zooms within hard limits, a node can
 * be focused, and the view can be reset. Nothing is added to the graph to make
 * the interaction richer — interaction richness comes from the camera, not from
 * invented records.
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
import { createUniverseOrbits } from './orbits'
import { createUniverseMaterials } from './materials'
import {
  computeUniverseLayout,
  fitDistance,
  type UniverseLayout,
} from './layout'
import { pickAt, projectEdges, projectNodes } from './hit-testing'
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
}

export interface AboutSceneHandle {
  orbit(): OrbitPose
  rotateBy(deltaYaw: number, deltaPitch: number): void
  zoomBy(factor: number): void
  focusNode(nodeId: string): void
  resetView(animate?: boolean): void
  setSelection(selectedId: string | null): void
  setSelectedEdge(edgeId: string | null): void
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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

export function createAboutScene(options: {
  canvas: HTMLCanvasElement
  universe: Pick<ReadyUniverse, 'nodes' | 'edges' | 'anchor'>
  theme: UniverseRenderTheme
  motion?: SceneMotionPreference
  onFrame?: (labels: ProjectedLabel[]) => void
  onError?: (code: SceneErrorCode) => void
}): AboutSceneHandle | null {
  const { canvas, universe, onFrame, onError } = options
  let theme = options.theme
  let motion: SceneMotionPreference = options.motion ?? 'full'

  const created = createSceneCore({ canvas, theme, fov: FOV, onError })
  if (!created) return null
  // Non-null alias: the builders below are nested functions, and TypeScript
  // does not carry a closure-scope narrowing of the nullable original into them.
  const core: SceneCore = created

  const model = new THREE.Group()
  model.name = 'universe-model'
  core.scene.add(model)

  const materials = createUniverseMaterials(core.ledger, theme)
  let layout: UniverseLayout = computeUniverseLayout(
    universe.nodes,
    universe.edges,
    {
      mobile: false,
    },
  )
  let mobile = false

  model.add(core.groups.orbits)
  model.add(core.groups.edges)
  model.add(core.groups.nodes)
  model.add(core.groups.core)

  let orbits = createUniverseOrbits(
    core.ledger,
    theme,
    layout.planes,
    materials,
  )
  let nodes: UniverseNodeVisuals = createUniverseNodes(
    core.ledger,
    theme,
    layout.nodes,
    materials,
  )
  let edges: UniverseEdgeVisuals = createUniverseEdges(
    core.ledger,
    theme,
    layout.edges,
    materials,
  )
  const coreVisuals = createUniverseCore(core.ledger, theme, materials, {
    radius: 8,
    seed: 1,
  })

  core.groups.orbits.add(orbits.group)
  core.groups.edges.add(edges.group)
  core.groups.nodes.add(nodes.group)
  core.groups.core.add(coreVisuals.group)

  let baseDistance = 360
  let orbit: OrbitPose = { ...HOME_ORBIT }
  let selectedId: string | null = null
  let selectedEdgeId: string | null = null
  let animation: number | null = null
  let stats: AboutSceneStats = {
    nodes: layout.nodes.length,
    edges: layout.edges.length,
    triangles: 0,
    drawCalls: 0,
    pixelRatio: 1,
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
    })
    edges.setEmphasis({ selectedNodeId: selectedId, selectedEdgeId })
  }

  /** Apply the orbit to the camera. Never touches FOV or model scale. */
  function applyOrbit(): void {
    const distance = baseDistance * orbit.distanceScale
    const y = Math.sin(orbit.pitch) * distance
    const horizontal = Math.cos(orbit.pitch) * distance
    core.camera.position.set(
      Math.sin(orbit.yaw) * horizontal,
      y,
      Math.cos(orbit.yaw) * horizontal,
    )
    core.camera.lookAt(0, 0, 0)
    core.requestRender()
  }

  function projectLabels(): void {
    if (!onFrame) return
    const { matrix, width, height } = core.projection()
    const projected = projectNodes(layout.nodes, matrix, width, height)
    onFrame(
      projected.map((node) => ({
        id: node.id,
        x: Math.round(node.x * 10) / 10,
        y: Math.round(node.y * 10) / 10,
        visible: node.visible,
      })),
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
  function animateTo(target: OrbitPose, durationMs: number): void {
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
      applyOrbit()
      return
    }

    const from = { ...orbit }
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
      applyOrbit()
      if (t < 1) animation = requestAnimationFrame(step)
      else animation = null
    }
    animation = requestAnimationFrame(step)
  }

  function rebuild(nextMobile: boolean): void {
    orbits.group.removeFromParent()
    nodes.group.removeFromParent()
    edges.group.removeFromParent()
    core.ledger.releaseGeometry()
    layout = computeUniverseLayout(universe.nodes, universe.edges, {
      mobile: nextMobile,
    })
    orbits = createUniverseOrbits(core.ledger, theme, layout.planes, materials)
    nodes = createUniverseNodes(core.ledger, theme, layout.nodes, materials)
    edges = createUniverseEdges(core.ledger, theme, layout.edges, materials)
    core.groups.orbits.add(orbits.group)
    core.groups.edges.add(edges.group)
    core.groups.nodes.add(nodes.group)
    mobile = nextMobile
    emphasis()
    applyOrbit()
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
      const target = nodeById(nodeId)
      if (!target) return
      const distance =
        Math.hypot(target.point.x, target.point.y, target.point.z) || 1
      const yaw = Math.atan2(target.point.x, target.point.z)
      const pitch = clamp(Math.asin(target.point.y / distance), -0.6, 0.6)
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
      )
    },
    resetView(animate = true) {
      if (animate) animateTo(HOME_ORBIT, 380)
      else {
        orbit = { ...HOME_ORBIT }
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
      orbits.applyTheme(next)
      nodes.applyTheme(next)
      edges.applyTheme(next)
      coreVisuals.applyTheme(next)
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
      const result = core.resize(width, height, devicePixelRatio)
      if (result.isMobile !== mobile) rebuild(result.isMobile)
      baseDistance = fitDistance(
        layout.bounds,
        width / Math.max(height, 1),
        FOV,
      )
      applyOrbit()
      stats = { ...stats, pixelRatio: result.pixelRatio }
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
