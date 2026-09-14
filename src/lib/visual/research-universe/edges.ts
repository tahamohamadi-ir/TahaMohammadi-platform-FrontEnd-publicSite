/**
 * RU-4B — Relationships as curved 3D edges.
 *
 * Edges are first-class: they are drawn from the SAME sampled polylines that
 * `hit-testing.ts` uses, so what the user sees is exactly what they can select —
 * no separate invisible pick geometry is created.
 *
 * THE visual rule of this direction lives here: every visible curve represents a
 * REAL graph relationship, thin and restrained. There is no decorative line in
 * this module — no orbit ring, no ellipse, no concentric circle, and nothing is
 * generated unless a published edge asked for it.
 *
 * The previous generation also raised an `globalEmphasis` term from the scroll
 * storyboard so the relationships could be "read as a system rather than as
 * decoration". That parameter is gone: on Home the brief allows ONE relationship
 * to become slightly more prominent at a later scroll state and explicitly says
 * "do not add spectacle", so a global brightness ramp driven by scroll is no
 * longer part of the language. Emphasis is now only ever a response to a real
 * selection.
 *
 * Colour is expressed through vertex colour (one `LineSegments` for the whole
 * system) because WebGL ignores `linewidth`; that keeps relationships dimmed by
 * default and readable on selection without a second draw call per edge.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import type { UniverseEdge3D } from './layout'
import { roleColor, type UniverseMaterials } from './materials'
import type { UniverseRenderTheme } from './theme'

export interface EdgeEmphasis {
  /** Selected node: its relationships stay bright, the rest recede. */
  selectedNodeId: string | null
  /** Selected relationship: emphasised on its own, even with no node selected. */
  selectedEdgeId: string | null
  /**
   * The single relationship allowed to read slightly stronger at a later Home
   * scroll state, or null. Deliberately one id rather than a global ramp: the
   * brief permits a single relation to become more prominent, not the whole set.
   */
  featuredEdgeId?: string | null
}

export interface UniverseEdgeVisuals {
  group: THREE.Group
  /** Vertex ranges per edge id, so emphasis never re-samples geometry. */
  segmentsByEdge: Map<string, { start: number; count: number }>
  setEmphasis(state: EdgeEmphasis): void
  applyTheme(theme: UniverseRenderTheme): void
}

/**
 * Default recession for unselected relationships: they are lerped toward the
 * canvas so they read as quiet structure rather than as drawn lines.
 */
const EDGE_REST_LERP = 0.44
/** Unrelated relationships recede further while a selection exists. */
const EDGE_DIMMED_LERP = 0.86
/** The featured relationship sits between rest and selection. */
const EDGE_FEATURED_LERP = 0.24
/** How far a selected relationship's colour leans toward the accent role. */
const EDGE_SELECTED_TINT = 0.5

export function createUniverseEdges(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  layoutEdges: ReadonlyArray<UniverseEdge3D>,
  materials: UniverseMaterials,
): UniverseEdgeVisuals {
  const group = new THREE.Group()
  group.name = 'universe-edges'

  const vertices: number[] = []
  const segmentsByEdge = new Map<string, { start: number; count: number }>()
  const directed: number[] = []

  for (const edge of layoutEdges) {
    const start = vertices.length / 3
    const samples = edge.samples
    for (let index = 0; index < samples.length - 1; index += 1) {
      const from = samples[index]!
      const to = samples[index + 1]!
      vertices.push(from.x, from.y, from.z, to.x, to.y, to.z)
    }
    segmentsByEdge.set(edge.id, {
      start,
      count: Math.max((samples.length - 1) * 2, 0),
    })

    if (edge.directed) {
      // Direction ticks: two short strokes near the target end, on the same
      // curve, so a directed relationship is legible without an arrow texture.
      const last = samples[samples.length - 1]!
      const before = samples[Math.max(samples.length - 3, 0)]!
      const dx = last.x - before.x
      const dy = last.y - before.y
      const dz = last.z - before.z
      const length = Math.hypot(dx, dy, dz) || 1
      const nx = dx / length
      const ny = dy / length
      const nz = dz / length
      for (const t of [0.86, 0.94]) {
        const anchor =
          samples[
            Math.min(samples.length - 1, Math.round(t * (samples.length - 1)))
          ]!
        directed.push(anchor.x, anchor.y, anchor.z)
        directed.push(
          anchor.x - nx * 2.4,
          anchor.y - ny * 2.4,
          anchor.z - nz * 2.4,
        )
      }
    }
  }

  const geometry = ledger.track(new THREE.BufferGeometry())
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  )
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(new Float32Array(vertices.length), 3),
  )

  const material = ledger.trackMaterial(materials.edgeMaterial.clone())
  const lines = new THREE.LineSegments(geometry, material)
  lines.name = 'universe-edges-lines'
  lines.frustumCulled = false
  group.add(lines)

  if (directed.length > 0) {
    const tickGeometry = ledger.track(
      new THREE.BufferGeometry().setFromPoints(
        Array.from(
          { length: directed.length / 3 },
          (_, index) =>
            new THREE.Vector3(
              directed[index * 3]!,
              directed[index * 3 + 1]!,
              directed[index * 3 + 2]!,
            ),
        ),
      ),
    )
    const ticks = new THREE.LineSegments(tickGeometry, materials.markMaterial)
    ticks.name = 'universe-edge-directions'
    ticks.frustumCulled = false
    group.add(ticks)
  }

  const colors = geometry.getAttribute('color') as THREE.BufferAttribute

  function writeEmphasis(state: EdgeEmphasis): void {
    const rest = roleColor(theme.palette, 'signature')
    const canvas = roleColor(theme.palette, 'canvas')
    const selected = roleColor(theme.palette, 'brand')
    const hasNodeSelection = state.selectedNodeId != null
    const featured = state.featuredEdgeId ?? null

    for (const edge of layoutEdges) {
      const range = segmentsByEdge.get(edge.id)
      if (!range) continue
      const incident =
        hasNodeSelection &&
        (edge.source === state.selectedNodeId ||
          edge.target === state.selectedNodeId)
      const isSelectedEdge = state.selectedEdgeId === edge.id

      let color: THREE.Color
      if (isSelectedEdge) {
        color = rest.clone().lerp(selected, EDGE_SELECTED_TINT)
      } else if (hasNodeSelection && incident) {
        color = rest.clone().lerp(selected, EDGE_SELECTED_TINT * 0.6)
      } else {
        const lerpTowardCanvas = hasNodeSelection
          ? EDGE_DIMMED_LERP
          : edge.id === featured
            ? EDGE_FEATURED_LERP
            : EDGE_REST_LERP
        color = rest.clone().lerp(canvas, lerpTowardCanvas)
      }

      for (let index = 0; index < range.count; index += 1) {
        colors.setXYZ(range.start + index, color.r, color.g, color.b)
      }
    }
    colors.needsUpdate = true

    material.opacity =
      state.selectedEdgeId != null || hasNodeSelection
        ? theme.edgeEmphasisOpacity
        : theme.edgeOpacity
    material.needsUpdate = true
  }

  writeEmphasis({ selectedNodeId: null, selectedEdgeId: null })

  return {
    group,
    segmentsByEdge,
    setEmphasis: writeEmphasis,
    applyTheme(next: UniverseRenderTheme) {
      material.opacity = next.edgeOpacity
      materials.edgeMaterial.opacity = next.edgeOpacity
      materials.edgeMaterial.color.copy(roleColor(next.palette, 'signature'))
      materials.markMaterial.color.copy(roleColor(next.palette, 'context'))
      materials.markMaterial.opacity = next.markOpacity
      material.needsUpdate = true
      materials.markMaterial.needsUpdate = true
      writeEmphasis({ selectedNodeId: null, selectedEdgeId: null })
    },
  }
}
