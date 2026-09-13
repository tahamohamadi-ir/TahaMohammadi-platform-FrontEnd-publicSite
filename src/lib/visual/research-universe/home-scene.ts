/**
 * RU-04 — Guided Home scene.
 *
 * Assembles the shared engine into the cinematic, scroll-driven presentation:
 * core + main domains + tilted orbital planes + selected published
 * relationships. It never exposes free camera control — the only input is scroll
 * progress, so Home stays GUIDED and the four authored states are the whole
 * story.
 *
 * Motion is applied to the model GROUP and the CAMERA only. The model is never
 * scaled as a whole and the FOV is never used as the motion source: both are
 * explicitly rejected by the product brief because they read as 2D tricks.
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
import {
  poseForProgress,
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
  onFrame?: (labels: ProjectedLabel[]) => void
  onError?: (code: SceneErrorCode) => void
}

export interface HomeSceneStats {
  nodes: number
  edges: number
  triangles: number
  drawCalls: number
  pixelRatio: number
}

export interface HomeSceneHandle {
  setProgress(progress: number): void
  setSelection(selectedId: string | null): void
  setSelectedEdge(edgeId: string | null): void
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
  let mobile = false
  let layout: UniverseLayout = computeUniverseLayout(
    universe.nodes,
    universe.edges,
    {
      mobile: false,
    },
  )

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
    radius: anchorRadius(layout, universe),
  })

  core.groups.orbits.add(orbits.group)
  core.groups.edges.add(edges.group)
  core.groups.nodes.add(nodes.group)
  core.groups.core.add(coreVisuals.group)

  let baseDistance = 320
  let progress = 0
  let selectedId: string | null = null
  let selectedEdgeId: string | null = null
  let currentPose = staticPose()
  let currentState = stateForProgress(0)
  let stats: HomeSceneStats = {
    nodes: layout.nodes.length,
    edges: layout.edges.length,
    triangles: 0,
    drawCalls: 0,
    pixelRatio: 1,
  }

  function anchorRadius(
    current: UniverseLayout,
    source: Pick<ReadyUniverse, 'anchor'>,
  ): number {
    const anchorId = source.anchor.id
    const found = anchorId
      ? current.nodes.find((node) => node.id === anchorId)
      : null
    return found?.radius ?? 6
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

  function applyPose(pose: UniversePose): void {
    currentPose = pose
    // Camera and group transforms only — never a whole-model scale.
    model.rotation.y = pose.yaw
    model.rotation.x = pose.pitch
    core.camera.position.set(
      0,
      0,
      Math.max(baseDistance * pose.distanceScale - pose.push, 40),
    )
    core.camera.lookAt(0, 0, 0)
    edges.setEmphasis({
      selectedNodeId: selectedId,
      selectedEdgeId,
      globalEmphasis: pose.edgeEmphasis,
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
    onFrame(labels)
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

  function rebuild(nextMobile: boolean): void {
    // Release the previous generation before building the new one.
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
    applyPose(currentPose)
  }

  function applySize(
    width: number,
    height: number,
    devicePixelRatio: number,
  ): void {
    const result = core.resize(width, height, devicePixelRatio)
    if (result.isMobile !== mobile) rebuild(result.isMobile)
    baseDistance = fitDistance(layout.bounds, width / Math.max(height, 1), FOV)
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
    })
    edges.setEmphasis({
      selectedNodeId: selectedId,
      selectedEdgeId,
      globalEmphasis: currentPose.edgeEmphasis,
    })
  }

  core.setOnFrame(captureStats)

  return {
    setProgress(next: number) {
      progress = Number.isFinite(next) ? next : 0
      currentState = stateForProgress(progress)
      const pose = motion === 'full' ? poseForProgress(progress) : staticPose()
      if (
        Math.abs(pose.yaw - currentPose.yaw) < 1e-4 &&
        Math.abs(pose.pitch - currentPose.pitch) < 1e-4 &&
        Math.abs(pose.distanceScale - currentPose.distanceScale) < 1e-4 &&
        Math.abs(pose.push - currentPose.push) < 1e-4 &&
        Math.abs(pose.edgeEmphasis - currentPose.edgeEmphasis) < 1e-4
      ) {
        // Nothing moved: no redraw is scheduled at all while idle.
        return
      }
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
      orbits.applyTheme(next)
      nodes.applyTheme(next)
      edges.applyTheme(next)
      coreVisuals.applyTheme(next)
      core.requestRender()
    },
    setMotion(next: SceneMotionPreference) {
      motion = next
      if (next !== 'full') applyPose(staticPose())
      else applyPose(poseForProgress(progress))
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
