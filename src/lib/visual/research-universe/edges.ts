/**
 * RU-4B / RU-4C — Relationships as curved 3D edges.
 *
 * Edges are first-class: they are drawn from the SAME sampled polylines that
 * `hit-testing.ts` uses, so what the user sees is exactly what they can select —
 * no separate invisible pick geometry is created.
 *
 * THE visual rule of this direction lives here: every visible curve represents a
 * REAL graph relationship, thin and restrained. There is no decorative line in
 * this module — no orbit ring, no ellipse, no concentric circle.
 *
 * RU-4C changes:
 * - The permanent direction TICKS are gone. Two short strokes near every target
 *   endpoint turned the Home hero into a technical directed graph, which the
 *   direction explicitly rules out ("No permanent arrowheads"; direction may
 *   stay semantic/interactive). `directed` is still carried on the model and is
 *   still reported by the semantic relationship list and the inspector.
 * - Colour is mineralised (see `resolveEdgeColor`): restrained champagne-grey on
 *   dark, muted aged brass on light — a warm neutral, never gold jewellery.
 * - Curvature now comes from the layout's per-relationship bow (raised so it is
 *   perceptible at Home scale) and the curve lands on both sphere SURFACES.
 *
 * Colour is expressed through vertex colour (one `LineSegments` for the whole
 * system) because WebGL ignores `linewidth`; that keeps relationships quiet by
 * default and readable on selection without a second draw call per edge.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import type { UniverseEdge3D } from './layout'
import { roleColor, type UniverseMaterials } from './materials'
import type { UniverseRenderTheme } from './theme'

export interface EdgeEmphasis {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  /**
   * The single relationship allowed to read slightly stronger at a later Home
   * scroll state, or null. Deliberately one id rather than a global ramp.
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
 * Resting recession for an unselected relationship.
 *
 * The direction wants edges clearly subordinate to the nodes, so at rest the
 * line is lerped most of the way toward the canvas. Only the ACTIVE relationship
 * is strengthened: hover or selection never brightens the whole set.
 */
const EDGE_REST_LERP = 0.74
/** Unrelated relationships recede further while a selection exists. */
const EDGE_DIMMED_LERP = 0.92
/** The featured relationship sits between rest and selection. */
const EDGE_FEATURED_LERP = 0.56
/** How far a selected relationship's colour leans toward the accent role. */
const EDGE_SELECTED_TINT = 0.42

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
        const toward = hasNodeSelection
          ? EDGE_DIMMED_LERP
          : edge.id === featured
            ? EDGE_FEATURED_LERP
            : EDGE_REST_LERP
        color = rest.clone().lerp(canvas, toward)
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
      material.needsUpdate = true
      materials.edgeMaterial.needsUpdate = true
      writeEmphasis({ selectedNodeId: null, selectedEdgeId: null })
    },
  }
}
