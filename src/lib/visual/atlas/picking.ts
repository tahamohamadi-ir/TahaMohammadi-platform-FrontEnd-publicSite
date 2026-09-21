import {
  alwaysLabelKeys,
  labelTierFor,
} from '../../atlas/layout'
import type { AtlasPayload } from '../../atlas/model'
import { neighborhoodOf } from '../../atlas/neighborhood'
import type { SelectionModel } from '../../atlas/selection'
import type { AtlasFocus } from '../../atlas/url-state'
import {
  pickAt,
  projectEdges,
  projectNodes,
  type PickResult,
  type ProjectedEdge3D,
  type ProjectedNode3D,
} from '../research-universe/hit-testing'
import type {
  UniverseEdge3D,
  UniverseNode3D,
} from '../research-universe/layout'
import { ATLAS_PICK_EVENT } from './controls'

export const EDGE_SAMPLES_LOW = 10
export const EDGE_SAMPLES_MEDIUM = 18
export const EDGE_SAMPLES_HIGH = 26

export interface AtlasPickingScene {
  pickAt(x: number, y: number): PickResult
  setHovered(nodeKey: string | null): void
  reframeSelection?(focus: AtlasFocus | null, effectiveWidth?: number): void
  focusNode(nodeKey: string, effectiveWidth?: number): void
  focusRelation?(relationKey: string, effectiveWidth?: number): void
  render(): void
}

export interface AtlasPickingOptions {
  region: HTMLElement
  scene: AtlasPickingScene
  selection: SelectionModel
  onSelect?: (focus: AtlasFocus | null, opener: HTMLElement | null) => void
}

export interface AtlasPickingHandle {
  pick(x: number, y: number, fullFocus?: boolean): PickResult
  dispose(): void
}

interface PickRequestDetail {
  x: number
  y: number
  fullFocus: boolean
  effectiveWidth: number
  opener: HTMLElement | null
}

export function edgeSampleCountFor(visualPriority: number): number {
  if (visualPriority >= 80) return EDGE_SAMPLES_HIGH
  if (visualPriority >= 40) return EDGE_SAMPLES_MEDIUM
  return EDGE_SAMPLES_LOW
}

export function visibleLabelKeys(
  payload: AtlasPayload,
  focus: AtlasFocus | null,
  hoveredNodeKey: string | null,
): string[] {
  const always = alwaysLabelKeys(payload.nodes)
  const demanded = new Set<string>()
  if (hoveredNodeKey) demanded.add(hoveredNodeKey)
  if (focus?.kind === 'node') {
    demanded.add(focus.key)
    const neighborhood = neighborhoodOf(payload, focus.key)
    for (const key of neighborhood.parents) demanded.add(key)
    for (const key of neighborhood.children) demanded.add(key)
    for (const link of neighborhood.incoming) demanded.add(link.nodeKey)
    for (const link of neighborhood.outgoing) demanded.add(link.nodeKey)
  }

  return payload.nodes
    .filter((node) => {
      const tier = labelTierFor(node, always)
      if (tier === 'always') return true
      if (focus?.kind === 'node' && focus.key === node.key) return true
      return tier === 'on-demand' && demanded.has(node.key)
    })
    .map((node) => node.key)
}

export function projectAtlasPick(
  point: { x: number; y: number },
  nodes: ReadonlyArray<UniverseNode3D>,
  edges: ReadonlyArray<UniverseEdge3D>,
  matrix: ReadonlyArray<number>,
  width: number,
  height: number,
): {
  result: PickResult
  projectedNodes: ProjectedNode3D[]
  projectedEdges: ProjectedEdge3D[]
} {
  const projectedNodes = projectNodes(nodes, matrix, width, height)
  const projectedEdges = projectEdges(edges, matrix, width, height)
  return {
    result: pickAt(point, projectedNodes, projectedEdges),
    projectedNodes,
    projectedEdges,
  }
}

function focusFromPick(result: PickResult): AtlasFocus | null {
  if (!result.id || result.kind === 'none') return null
  return result.kind === 'node'
    ? { kind: 'node', key: result.id }
    : { kind: 'relation', key: result.id }
}

function applyPick(selection: SelectionModel, focus: AtlasFocus | null): void {
  if (!focus) selection.clear()
  else if (focus.kind === 'node') selection.selectNode(focus.key)
  else selection.selectRelation(focus.key)
}

export function createAtlasPicking(
  options: AtlasPickingOptions,
): AtlasPickingHandle {
  const { region, scene, selection } = options
  const stage =
    region.querySelector<HTMLElement>('[data-atlas-stage]') ?? region
  const canvas =
    stage.querySelector<HTMLCanvasElement>('[data-atlas-canvas]') ?? stage
  const cleanups: Array<() => void> = []
  let hovered: string | null = null

  function localPoint(event: MouseEvent | PointerEvent): {
    x: number
    y: number
  } {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function commit(
    x: number,
    y: number,
    fullFocus: boolean,
    effectiveWidth?: number,
    opener: HTMLElement | null = null,
  ): PickResult {
    const result = scene.pickAt(x, y)
    const focus = focusFromPick(result)
    if (options.onSelect) options.onSelect(focus, opener)
    else applyPick(selection, focus)
    if (!fullFocus) scene.reframeSelection?.(focus, effectiveWidth)
    if (fullFocus && result.id) {
      if (result.kind === 'node') scene.focusNode(result.id, effectiveWidth)
      else if (result.kind === 'edge') {
        scene.focusRelation?.(result.id, effectiveWidth)
      }
      scene.render()
    }
    return result
  }

  function onPickRequest(event: Event): void {
    const detail = (event as CustomEvent<PickRequestDetail>).detail
    if (!detail) return
    commit(
      detail.x,
      detail.y,
      detail.fullFocus,
      detail.effectiveWidth,
      detail.opener,
    )
  }

  function onPointerMove(event: PointerEvent): void {
    const point = localPoint(event)
    const picked = scene.pickAt(point.x, point.y)
    const next = picked.kind === 'node' ? picked.id : null
    if (next === hovered) return
    hovered = next
    scene.setHovered(hovered)
  }

  function onPointerLeave(): void {
    if (hovered == null) return
    hovered = null
    scene.setHovered(null)
  }

  region.addEventListener(ATLAS_PICK_EVENT, onPickRequest)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerleave', onPointerLeave)
  cleanups.push(() => {
    region.removeEventListener(ATLAS_PICK_EVENT, onPickRequest)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerleave', onPointerLeave)
  })

  return {
    pick(x, y, fullFocus = false) {
      return commit(x, y, fullFocus)
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup()
      scene.setHovered(null)
    },
  }
}
