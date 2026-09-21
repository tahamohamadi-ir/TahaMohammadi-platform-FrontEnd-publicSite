/** Shared 2D SVG renderer (Plan C Tasks 8/13).
 *
 * ONE renderer for the 2D projection markup, used by both the server-side
 * shared body builder (`presentation.ts`) and the Astro presentation
 * component (`AtlasProjection2d.astro`). Public Atlas and draft preview
 * therefore share a single projection code path — never two implementations.
 *
 * Output contract (spec §14.1): paths as `<path>`, nodes as `<g>` + `<circle>`,
 * no interactive attributes, `aria-hidden`, never tabbable. All dynamic
 * values are attribute-escaped; coordinates come from the deterministic
 * `project2d` model already rounded to 2 decimals.
 */
import type { Projection2d, Projection2dMode } from './projection-2d'

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatNum(value: number): string {
  return String(value)
}

/** Render a computed 2D projection as escaped, non-interactive SVG markup. */
export function projectionSvgHtml(
  projection: Projection2d,
  mode: Projection2dMode,
): string {
  const edges = projection.edges
    .map(
      (edge) =>
        `<path class="atlas-projection__edge" data-atlas-edge="${escapeAttr(edge.key)}" d="${escapeAttr(edge.path)}"/>`,
    )
    .join('')
  const nodes = projection.nodes
    .map(
      (node) =>
        `<g class="atlas-projection__node" data-atlas-projected="${escapeAttr(node.key)}"><circle cx="${formatNum(node.cx)}" cy="${formatNum(node.cy)}" r="${formatNum(node.r)}"/></g>`,
    )
    .join('')
  return `<svg class="atlas-projection" data-atlas-projection="${escapeAttr(mode)}" viewBox="${escapeAttr(projection.viewBox)}" role="img" aria-hidden="true" focusable="false">${edges}${nodes}</svg>`
}
