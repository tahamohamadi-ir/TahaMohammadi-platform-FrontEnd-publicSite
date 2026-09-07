/**
 * CA-03 — Locked renderer/controller TypeScript contract for the Home hero
 * constellation. Graphics workers (CA-04/CA-05/CA-07) build against these
 * exact signatures; this packet ships no Three.js and no GSAP choreography.
 *
 * Design authority: DESIGN-SPEC §§1–5. The Home scene path must never import
 * the gateway portal path; the gateway gets its own contract in CA-07.
 *
 * DOM binding (semantic source of truth, readable without JS):
 * - `[data-graph-region]` — the hero graph region.
 * - `[data-graph-node="<id>"]` list items carry `data-x`, `data-y`,
 *   `data-z`, `data-color-role`, `data-weight` for the renderer.
 * - `[data-graph-edge="<id>"]` items carry `data-source`, `data-target`,
 *   `data-directed` for relationship emphasis.
 * - The canvas is always `aria-hidden`; labels stay HTML.
 */

import type { HeroGraphEdge, HeroGraphNode } from '../hero-graph-content'
import type { Locale } from '../navigation'

/** Increment when this contract changes; renderers assert compatibility. */
export const SCENE_CONTRACT_VERSION = 'ca03-1.0.0'

export type SceneTheme = 'light' | 'dark'

/** Motion budget: full animation, reduced (static pose, instant selection), or off. */
export type SceneMotionPreference = 'full' | 'reduced' | 'off'

/**
 * Exact palette roles the renderer may use. Values are read from the
 * authored CSS tokens at runtime (see `scenePaletteFromCss`); the renderer
 * must not invent a second palette. Hex values below document the
 * DESIGN-SPEC §2 starting point only.
 */
export interface ScenePalette {
  canvas: string
  ink: string
  brand: string
  signature: string
  research: string
  context: string
  surface: string
}

export const SCENE_PALETTE_ROLES = [
  'canvas',
  'ink',
  'brand',
  'signature',
  'research',
  'context',
  'surface',
] as const satisfies ReadonlyArray<keyof ScenePalette>

export function scenePaletteFromCss(
  readVariable: (name: string) => string,
): ScenePalette {
  return {
    canvas: readVariable('--color-canvas'),
    ink: readVariable('--color-ink'),
    brand: readVariable('--color-brand'),
    signature: readVariable('--color-signature'),
    research: readVariable('--color-research'),
    context: readVariable('--color-context'),
    surface: readVariable('--color-surface'),
  }
}

export interface SceneNodeDatum {
  id: string
  label: string
  x: number
  y: number
  z: number
  colorRole: string
  weight: number
  selected: boolean
  dimmed: boolean
}

export interface SceneEdgeDatum {
  id: string
  source: string
  target: string
  directed: boolean
  emphasized: boolean
}

export interface ScenePayload {
  contractVersion: typeof SCENE_CONTRACT_VERSION
  locale: Locale
  nodes: SceneNodeDatum[]
  edges: SceneEdgeDatum[]
}

/** Projected HTML label positions supplied per frame for label placement. */
export interface ProjectedLabel {
  id: string
  x: number
  y: number
  visible: boolean
}

export type SceneErrorCode =
  | 'webgl-unavailable'
  | 'import-rejected'
  | 'context-lost'
  | 'frame-budget-exceeded'

export interface GraphSceneOptions {
  canvas: HTMLCanvasElement
  payload: ScenePayload
  palette: ScenePalette
  motion: SceneMotionPreference
  selectedId: string | null
  onFrame?: (labels: ProjectedLabel[]) => void
  onError?: (code: SceneErrorCode) => void
}

export interface GraphSceneHandle {
  render(): void
  resize(width: number, height: number, pixelRatio: number): void
  setPalette(palette: ScenePalette): void
  setSelection(selectedId: string | null): void
  setMotion(motion: SceneMotionPreference): void
  dispose(): void
}

/** Implemented by CA-04. Exactly one active scene per route. */
export type GraphSceneFactory = (options: GraphSceneOptions) => GraphSceneHandle

export interface GraphSelectionState {
  selectedId: string | null
}

export interface GraphControllerOptions {
  initialSelectedId?: string | null
  onSelectionChange?: (state: GraphSelectionState) => void
}

/**
 * Implemented by CA-05. The controller owns native selection state; the
 * scene and motion layers consume it and never create a second keyboard
 * tree. `clearSelection` may return focus to the initiating control.
 */
export interface GraphControllerHandle {
  select(id: string | null): void
  clearSelection(returnFocusTo?: HTMLElement | null): void
  getState(): GraphSelectionState
  dispose(): void
}

export type GraphControllerFactory = (
  options: GraphControllerOptions,
) => GraphControllerHandle

/**
 * Motion choreography targets for review (DESIGN-SPEC §5). Text stays
 * visible throughout; reduced motion uses a static pose with instant
 * selection and no pointer tilt.
 */
export const SCENE_MOTION = {
  settleMs: { min: 600, max: 900 },
  selectionMs: { min: 180, max: 280 },
  tiltDegrees: 3,
} as const

/** First-pass engineering ceilings (DESIGN-SPEC §6). Targets, not measurements. */
export const SCENE_PERFORMANCE_CEILINGS = {
  maxActiveCanvasesPerRoute: 1,
  maxDevicePixelRatioDesktop: 1.5,
  maxDevicePixelRatioMobile: 1,
  maxDrawingBufferPixels: 1500000,
  maxDrawCalls: 60,
  maxTriangles: 50000,
  maxSceneJsGzipKiB: 300,
} as const

/**
 * Intrinsic/reserved scene slot dimensions in CSS px (DESIGN-SPEC §2).
 * Text surfaces keep natural flow; these reserve the scene only.
 */
export const SCENE_SLOT = {
  desktopMinHeight: 520,
  desktopMaxHeight: 620,
  mobileMinHeight: 280,
  mobileMaxHeight: 360,
} as const

type ReadyHeroGraph = {
  nodes: HeroGraphNode[]
  edges: HeroGraphEdge[]
  locale: Locale
}

/**
 * Bridge the CA-02 semantic model to renderer input. Coordinates come from
 * the adapter layout (API positions preserved, otherwise deterministic).
 * Selection emphasis is derived from API edges only.
 */
export function toScenePayload(
  model: ReadyHeroGraph,
  selectedId: string | null = null,
): ScenePayload {
  const incident = new Set<string>()
  if (selectedId != null) {
    for (const edge of model.edges) {
      if (edge.source === selectedId) incident.add(edge.target)
      if (edge.target === selectedId) incident.add(edge.source)
    }
  }
  return {
    contractVersion: SCENE_CONTRACT_VERSION,
    locale: model.locale,
    nodes: model.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      x: node.layout.x,
      y: node.layout.y,
      z: node.layout.z,
      colorRole: node.colorRole,
      weight: node.weight,
      selected: node.id === selectedId,
      dimmed:
        selectedId != null && node.id !== selectedId && !incident.has(node.id),
    })),
    edges: model.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      directed: edge.directed,
      emphasized:
        selectedId != null &&
        (edge.source === selectedId || edge.target === selectedId),
    })),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Runtime guard for scene input (used by CA-04/CA-06 conformance tests). */
export function validateScenePayload(
  payload: unknown,
): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = []
  if (!isRecord(payload)) return { ok: false, issues: ['payload-malformed'] }
  if (payload.contractVersion !== SCENE_CONTRACT_VERSION) {
    issues.push('contract-version-mismatch')
  }
  if (payload.locale !== 'fa' && payload.locale !== 'en') {
    issues.push('locale-must-be-fa-or-en')
  }
  const nodes = payload.nodes
  const edges = payload.edges
  if (!Array.isArray(nodes))
    return { ok: false, issues: ['nodes-must-be-an-array'] }
  if (!Array.isArray(edges))
    return { ok: false, issues: ['edges-must-be-an-array'] }

  const seen = new Set<string>()
  nodes.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`node-${index}-malformed`)
      return
    }
    const id = entry.id
    if (typeof id !== 'string' || !id.trim()) {
      issues.push(`node-${index}-missing-id`)
      return
    }
    if (seen.has(id)) {
      issues.push(`duplicate-node-id:${id}`)
      return
    }
    seen.add(id)
    if (typeof entry.label !== 'string' || !entry.label.trim()) {
      issues.push(`node-missing-label:${id}`)
    }
    if (
      !isFiniteNumber(entry.x) ||
      !isFiniteNumber(entry.y) ||
      !isFiniteNumber(entry.z)
    ) {
      issues.push(`node-non-finite-coordinates:${id}`)
    }
    if (!isFiniteNumber(entry.weight)) {
      issues.push(`node-non-finite-weight:${id}`)
    }
    if (
      typeof entry.selected !== 'boolean' ||
      typeof entry.dimmed !== 'boolean'
    ) {
      issues.push(`node-missing-selection-flags:${id}`)
    }
  })

  edges.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`edge-${index}-malformed`)
      return
    }
    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      issues.push(`edge-${index}-missing-id`)
      return
    }
    if (typeof entry.source !== 'string' || !seen.has(entry.source)) {
      issues.push(`edge-dangling-source:${String(entry.id)}`)
    }
    if (typeof entry.target !== 'string' || !seen.has(entry.target)) {
      issues.push(`edge-dangling-target:${String(entry.id)}`)
    }
    if (typeof entry.directed !== 'boolean') {
      issues.push(`edge-missing-directed:${String(entry.id)}`)
    }
    if (typeof entry.emphasized !== 'boolean') {
      issues.push(`edge-missing-emphasized:${String(entry.id)}`)
    }
  })

  return issues.length > 0 ? { ok: false, issues } : { ok: true }
}
