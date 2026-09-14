/**
 * RU-04 / RU-4B — Guided Home scene.
 *
 * Assembles the shared engine into the scroll-driven presentation: the identity
 * sphere, the main domains, the REAL published relationships, and HTML labels. It
 * never exposes free camera control — the only input is scroll progress, so Home
 * stays GUIDED and the four authored states are the whole story.
 *
 * Motion is applied to the model GROUP and the CAMERA only. The model is never
 * scaled as a whole and the FOV is never used as the motion source: both are
 * explicitly rejected by the product brief because they read as 2D tricks.
 *
 * RU-4B removals, all of them dependencies of the retired orbital generation:
 * - orbital planes and the orbit/mark renderer: the planes were what made the
 *   composition read as satellites around a nucleus;
 * - the layout rebuild on a breakpoint change. Positions are a pure function of
 *   the published model, so a viewport resize can no longer move a node — it only
 *   re-fits the camera and re-clamps the DPR. That is also what makes "Light uses
 *   the SAME topology and SAME object positions as Dark" structural rather than
 *   something to remember;
 * - the scroll-driven global edge emphasis (see `home-motion.ts`).
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
import {
  poseForProgress,
  posesEqual,
  stateForProgress,
  staticPose,
  type HomeScrollStateNumber,
  type UniversePose,
} from './home-motion'
import type { UniverseRenderTheme } from './theme'

export interface HomeSceneOptions {
  canvas: HTMLCanvasElement
  universe: Pick<ReadyUniverse, 'nodes' | 'edges' | 'anchor'>
  theme: UniverseRenderTheme
  motion?: SceneMotionPreference
  onFrame?: (labels: ProjectedLabel[], projected: ProjectedNode3D[]) => void
  onError?: (code: SceneErrorCode) => void
}

export interface HomeSceneStats {
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

export interface HomeSceneHandle {
  setProgress(progress: number): void
  setSelection(selectedId: string | null): void
  setSelectedEdge(edgeId: string | null): void
  setHovered(nodeId: string | null): void
  /**
   * Canvas hit test in canvas-local CSS pixels. Returns what was picked and
   * applies it as the scene selection, so the caller can sync the semantic
   * panels to exactly what the pointer found.
   */
  selectAt(
    offsetX: number,
    offsetY: number,
  ): { kind: 'node' | 'edge' | 'none'; id: string | null }
  setTheme(theme: UniverseRenderTheme): void
  setMotion(motion: SceneMotionPreference): void
  setVisible(visible: boolean): void
  resize(width: number, height: number, devicePixelRatio: number): void
  render(): void
  pose(): UniversePose
  state(): HomeScrollStateNumber
  stats(): HomeSceneStats
  dispose(): void
}

const FOV = 42
/** Extra edge room on a narrow stage, matching the About branch. */
const MOBILE_FIT_PADDING = 1.34
const DESKTOP_FIT_PADDING = 1.14

export function createHomeScene(
  options: HomeSceneOptions,
): HomeSceneHandle | null {
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

  // Positions never depend on the viewport, so this is computed exactly once.
  const layout: UniverseLayout = computeUniverseLayout(
    universe.nodes,
    universe.edges,
  )
  /**
   * RU-4C composition: the camera looks at the DOMAIN CENTROID, so the identity
   * node is not the geometric centre of the frame while the three domains stay
   * balanced around it. Positions themselves are untouched.
   */
  const frameCenter = compositionTarget(layout.nodes)

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

  let baseDistance = 320
  let progress = 0
  let selectedId: string | null = null
  let selectedEdgeId: string | null = null
  let hoveredId: string | null = null
  let currentPose = staticPose()
  let currentState = stateForProgress(0)
  let stats: HomeSceneStats = {
    nodes: layout.nodes.length,
    edges: layout.edges.length,
    triangles: 0,
    drawCalls: 0,
    pixelRatio: 1,
    nodeGeometries: 1,
    profileMaterials: Object.keys(materials.profiles).length,
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

  /**
   * The one relationship the brief allows to read slightly stronger, resolved
   * against the REAL edge list. A pose index beyond the published edge count
   * yields null rather than an invented edge.
   */
  function featuredEdgeId(pose: UniversePose): string | null {
    if (pose.featuredEdge == null) return null
    return layout.edges[pose.featuredEdge]?.id ?? null
  }

  function applyPose(pose: UniversePose): void {
    currentPose = pose
    // Camera and group transforms only — never a whole-model scale.
    model.rotation.y = pose.yaw
    model.rotation.x = pose.pitch
    core.camera.position.set(
      frameCenter.x,
      frameCenter.y,
      Math.max(baseDistance * pose.distanceScale - pose.push, 40),
    )
    core.camera.lookAt(frameCenter.x, frameCenter.y, frameCenter.z)
    edges.setEmphasis({
      selectedNodeId: selectedId,
      selectedEdgeId,
      featuredEdgeId: featuredEdgeId(pose),
    })
    core.requestRender()
  }

  function projectLabels(): void {
    if (!onFrame) return
    const { matrix, width, height } = core.projection()
    const projected = projectNodes(layout.nodes, matrix, width, height)
    const labels: ProjectedLabel[] = projected.map((node) => ({
      id: node.id,
      x: Math.round(node.x * 10) / 10,
      y: Math.round(node.y * 10) / 10,
      visible: node.visible,
    }))
    // RU-2B: the same projection feeds the labels AND their leader lines.
    onFrame(labels, projected)
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

  function applySize(
    width: number,
    height: number,
    devicePixelRatio: number,
  ): void {
    const result = core.resize(width, height, devicePixelRatio)
    baseDistance = fitDistance(
      layout.bounds,
      width / Math.max(height, 1),
      FOV,
      result.isMobile ? MOBILE_FIT_PADDING : DESKTOP_FIT_PADDING,
      frameCenter,
    )
    stats = { ...stats, pixelRatio: result.pixelRatio }
    applyPose(currentPose)
  }

  function emphasisForSelection(): void {
    nodes.setEmphasis({
      selectedId,
      incidentIds: incidentIdsFor(selectedId),
      selectedEdge:
        selectedEdgeId != null
          ? (layout.edges.find((edge) => edge.id === selectedEdgeId) ?? null)
          : null,
      hoveredId,
    })
    edges.setEmphasis({
      selectedNodeId: selectedId,
      selectedEdgeId,
      featuredEdgeId: featuredEdgeId(currentPose),
    })
  }

  core.setOnFrame(captureStats)

  return {
    setProgress(next: number) {
      progress = Number.isFinite(next) ? next : 0
      currentState = stateForProgress(progress)
      const pose =
        motion === 'full'
          ? poseForProgress(progress, layout.edges.length)
          : staticPose()
      // Nothing moved: no redraw is scheduled at all while idle.
      if (posesEqual(pose, currentPose)) return
      applyPose(pose)
    },
    setSelection(id: string | null) {
      selectedId = id
      if (id != null) selectedEdgeId = null
      emphasisForSelection()
      core.requestRender()
    },
    setSelectedEdge(edgeId: string | null) {
      selectedEdgeId = edgeId
      if (edgeId != null) selectedId = null
      emphasisForSelection()
      core.requestRender()
    },
    setHovered(nodeId: string | null) {
      if (hoveredId === nodeId) return
      hoveredId = nodeId
      emphasisForSelection()
      core.requestRender()
    },
    selectAt(offsetX: number, offsetY: number) {
      const { matrix, width, height } = core.projection()
      const projectedNodes = projectNodes(layout.nodes, matrix, width, height)
      const projectedEdges = projectEdges(layout.edges, matrix, width, height)
      const picked = pickAt(
        { x: offsetX, y: offsetY },
        projectedNodes,
        projectedEdges,
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
      emphasisForSelection()
      core.requestRender()
      return picked
    },
    setTheme(next: UniverseRenderTheme) {
      theme = next
      core.setTheme(next)
      nodes.applyTheme(next)
      edges.applyTheme(next)
      core.requestRender()
    },
    setMotion(next: SceneMotionPreference) {
      motion = next
      if (next !== 'full') applyPose(staticPose())
      else applyPose(poseForProgress(progress, layout.edges.length))
    },
    setVisible(visible: boolean) {
      core.setVisible(visible)
    },
    resize(width: number, height: number, devicePixelRatio: number) {
      applySize(width, height, devicePixelRatio)
    },
    render() {
      core.renderNow()
    },
    pose() {
      return currentPose
    },
    state() {
      return currentState
    },
    stats() {
      return stats
    },
    dispose() {
      core.dispose()
    },
  }
}
