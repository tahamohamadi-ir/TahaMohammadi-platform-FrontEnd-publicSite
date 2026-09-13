/**
 * RU-02 — Relationships as curved 3D edges.
 *
 * Edges are first-class: they are drawn from the SAME sampled polylines that
 * `hit-testing.ts` uses, so what the user sees is exactly what they can select —
 * no separate invisible pick geometry is created.
 *
 * Emphasis is expressed through vertex colour only (one `LineSegments` for the
 * whole system), because WebGL ignores `linewidth`; that keeps relationships
 * dimmed by default and clearly readable on selection without a second draw call
 * per edge.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import type { UniverseEdge3D } from './layout'
import { roleColor, type UniverseMaterials } from './materials'
import type { UniverseRenderTheme } from './theme'

export interface EdgeEmphasis {
  /** Selected node: its relationships stay bright, the rest dim. */
  selectedNodeId: string | null
  /** Selected relationship: emphasised on its own, even with no node selected. */
  selectedEdgeId: string | null
  /**
   * Overall relationship emphasis, 0…1, used with NO selection — the Home
   * storyboard raises it in its "relationship" state so the edges are read as a
   * system rather than as decoration.
   */
  globalEmphasis?: number
}

export interface UniverseEdgeVisuals {
  group: THREE.Group
  /** Vertex ranges per edge id, so emphasis never re-samples geometry. */
  segmentsByEdge: Map<string, { start: number; count: number }>
  setEmphasis(state: EdgeEmphasis): void
  applyTheme(theme: UniverseRenderTheme): void
}

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
    segmentsByEdge.set(edge.id, { start, count: (samples.length - 1) * 2 })

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

  function setEmphasis(state: EdgeEmphasis): void {
    const base = roleColor(theme.palette, 'ink')
    const emphasisColor = roleColor(theme.palette, 'brand')
    const selectedColor = roleColor(theme.palette, 'signature')
    const canvas = roleColor(theme.palette, 'canvas')
    const hasNodeSelection = state.selectedNodeId != null
    const global = Math.max(0, Math.min(1, state.globalEmphasis ?? 0))

    for (const edge of layoutEdges) {
      const range = segmentsByEdge.get(edge.id)
      if (!range) continue
      const incident =
        hasNodeSelection &&
        (edge.source === state.selectedNodeId ||
          edge.target === state.selectedNodeId)
      const isSelectedEdge = state.selectedEdgeId === edge.id

      let color: THREE.Color
      if (isSelectedEdge) color = selectedColor.clone()
      else if (hasNodeSelection && incident) color = emphasisColor.clone()
      else {
        // No selection: the storyboard's global emphasis lifts the whole system
        // from "quiet structure" toward "readable relationships".
        const dim = hasNodeSelection ? 0.88 : 0.5 - global * 0.34
        color = base.clone().lerp(canvas, Math.max(dim, 0))
        if (global > 0 && !hasNodeSelection) {
          color.lerp(emphasisColor, global * 0.45)
        }
      }

      for (let index = 0; index < range.count; index += 1) {
        colors.setXYZ(range.start + index, color.r, color.g, color.b)
      }
    }
    colors.needsUpdate = true

    const baseOpacity =
      theme.edgeOpacity +
      (theme.edgeEmphasisOpacity - theme.edgeOpacity) * global
    material.opacity =
      state.selectedEdgeId != null || hasNodeSelection
        ? theme.edgeEmphasisOpacity
        : baseOpacity
    material.needsUpdate = true
  }

  setEmphasis({ selectedNodeId: null, selectedEdgeId: null })

  return {
    group,
    segmentsByEdge,
    setEmphasis,
    applyTheme(next: UniverseRenderTheme) {
      material.opacity = next.edgeOpacity
      materials.edgeMaterial.opacity = next.edgeOpacity
      materials.edgeMaterial.color.copy(roleColor(next.palette, 'ink'))
      materials.markMaterial.opacity = next.markOpacity
      material.needsUpdate = true
      setEmphasis({ selectedNodeId: null, selectedEdgeId: null })
    },
  }
}
