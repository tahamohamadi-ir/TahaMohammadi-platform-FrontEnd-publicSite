/**
 * Bundled entry for atlas-pick-benchmark.mjs — measures the same screen-space
 * pick path as AtlasScene.pickAt (projectNodes + projectEdges + pickAt).
 */

import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

import * as THREE from 'three'

import { resolveLayout } from '../src/lib/atlas/layout'
import type { AtlasPayload } from '../src/lib/atlas/model'
import {
  edgeSampleCountFor,
  projectAtlasPick,
} from '../src/lib/visual/atlas/picking'
import {
  bowForEdge,
  buildEdgeCurve,
  fitDistance,
  sampleCubic,
  type UniverseBounds,
  type UniverseEdge3D,
  type UniverseNode3D,
} from '../src/lib/visual/research-universe/layout'
import {
  RU_PROFILE_CHARACTER,
  resolvePresentationProfile,
} from '../src/lib/visual/research-universe/presentation-profiles'

const FOV = 42
const HOME_ORBIT = { yaw: 0.22, pitch: 0.24, distanceScale: 1 }
const DEFAULT_WIDTH = 1440
const DEFAULT_HEIGHT = 900
const PICK_BUDGET_MS = 8
/** Fixed seed for reproducible screen probe points (Task 18). */
const SCREEN_POINT_SEED = 0x41544c18

export interface BenchmarkOptions {
  fixturePath: string
  iterations: number
  width?: number
  height?: number
}

export interface BenchmarkResult {
  fixturePath: string
  nodeCount: number
  relationCount: number
  iterations: number
  viewport: { width: number; height: number }
  screenPoints: Array<{ x: number; y: number }>
  latenciesMs: number[]
  p50Ms: number
  p95Ms: number
  budgetMs: number
  pass: boolean
  measured: 'screen-space O(n) pick (projectNodes + projectEdges + pickAt)'
  drawCalls: null
  triangles: null
  note: string
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

function buildAtlasPickScene(payload: AtlasPayload): {
  layoutNodes: UniverseNode3D[]
  layoutEdges: UniverseEdge3D[]
  frameCenter: { x: number; y: number; z: number }
  bounds: UniverseBounds
} {
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
  return {
    layoutNodes,
    layoutEdges,
    frameCenter: atlasLayout.center,
    bounds: universeBounds(atlasLayout.bounds),
  }
}

function projectionForHomeOrbit(
  frameCenter: { x: number; y: number; z: number },
  bounds: UniverseBounds,
  width: number,
  height: number,
): { matrix: number[]; width: number; height: number } {
  const baseDistance = fitDistance(
    bounds,
    width / Math.max(height, 1),
    FOV,
    1.14,
    frameCenter,
  )
  const orbit = HOME_ORBIT
  const distance = baseDistance * orbit.distanceScale
  const vertical = Math.sin(orbit.pitch) * distance
  const horizontal = Math.cos(orbit.pitch) * distance
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 1, 4000)
  camera.position.set(
    frameCenter.x + Math.sin(orbit.yaw) * horizontal,
    frameCenter.y + vertical,
    frameCenter.z + Math.cos(orbit.yaw) * horizontal,
  )
  camera.lookAt(frameCenter.x, frameCenter.y, frameCenter.z)
  camera.updateMatrixWorld()
  const matrix = new THREE.Matrix4()
    .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    .toArray()
  return { matrix, width, height }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = clamp(
    Math.ceil((p / 100) * sorted.length) - 1,
    0,
    sorted.length - 1,
  )
  return sorted[index]!
}

function fixedScreenPoints(
  width: number,
  height: number,
  count: number,
): Array<{ x: number; y: number }> {
  const rand = mulberry32(SCREEN_POINT_SEED)
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
  }))
}

export function runBenchmark(options: BenchmarkOptions): BenchmarkResult {
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const raw = readFileSync(options.fixturePath, 'utf8')
  const payload = JSON.parse(raw) as AtlasPayload
  const scene = buildAtlasPickScene(payload)
  const projection = projectionForHomeOrbit(
    scene.frameCenter,
    scene.bounds,
    width,
    height,
  )
  const screenPoints = fixedScreenPoints(width, height, 10)
  const pick = (point: { x: number; y: number }) =>
    projectAtlasPick(
      point,
      scene.layoutNodes,
      scene.layoutEdges,
      projection.matrix,
      projection.width,
      projection.height,
    ).result

  for (let i = 0; i < 20; i += 1) {
    pick(screenPoints[i % screenPoints.length]!)
  }

  const latenciesMs: number[] = []
  for (let i = 0; i < options.iterations; i += 1) {
    const point = screenPoints[i % screenPoints.length]!
    const start = performance.now()
    pick(point)
    latenciesMs.push(performance.now() - start)
  }

  const sorted = [...latenciesMs].sort((a, b) => a - b)
  const p50Ms = percentile(sorted, 50)
  const p95Ms = percentile(sorted, 95)

  return {
    fixturePath: options.fixturePath,
    nodeCount: payload.nodes.length,
    relationCount: payload.relations.length,
    iterations: options.iterations,
    viewport: { width, height },
    screenPoints,
    latenciesMs,
    p50Ms,
    p95Ms,
    budgetMs: PICK_BUDGET_MS,
    pass: p95Ms <= PICK_BUDGET_MS,
    measured: 'screen-space O(n) pick (projectNodes + projectEdges + pickAt)',
    drawCalls: null,
    triangles: null,
    note: 'Node-only benchmark: no DOM/WebGL. View matrix matches Atlas home orbit (FOV 42, 1440×900). Draw-call/triangle stats require a live WebGL scene and are not measured here.',
  }
}
