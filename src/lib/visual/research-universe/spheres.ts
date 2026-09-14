/**
 * RU-4B — The ONE shared sphere.
 *
 * Every primary node and the identity anchor use a single reusable
 * `THREE.SphereGeometry`, with a segment count chosen for the scale this scene is
 * actually drawn at (a node is ~26 CSS px across on desktop, so 32×20 segments
 * already resolve the silhouette beyond what the DPR clamp can display).
 *
 * Why one geometry object rather than one per node tier:
 * - the brief's core visual rule is "one shared simple sphere geometry, no
 *   per-domain custom mesh". Two tiers would immediately reintroduce a per-tier
 *   primitive and with it a reason to add a third;
 * - the per-tier vertex saving is real but irrelevant at this scale (two meshes
 *   of ~1.2k triangles against a 50k ceiling), while the reuse guarantee is
 *   directly asserted in `presentation.test.ts`;
 * - nodes are drawn through `InstancedMesh`, so the geometry is uploaded once
 *   and its triangle count does not multiply with the node count.
 *
 * The sphere is a UNIT sphere. Every appearance of size comes from a per-instance
 * scale, which is what makes "all differences come from scale, material profile,
 * position, depth, label, graph semantics and interaction state" true by
 * construction instead of by convention.
 */

import * as THREE from 'three'

/**
 * Segment counts. Latitude is always even so the equator falls on a vertex ring,
 * which keeps a node's silhouette symmetric under rotation.
 */
export const SPHERE_SEGMENTS = {
  /** 32×20 ≈ 1,200 triangles — the only vertex tier this scene uses. */
  primary: [32, 20] as const,
} as const

/** Unit radius; per-instance or per-mesh scale supplies the real size. */
export const SPHERE_RADIUS = 1

let shared: THREE.SphereGeometry | null = null

/**
 * The process-wide sphere geometry.
 *
 * Deliberately NOT registered in a per-scene LEDGER: a ledger releases its
 * resources on every mobile↔desktop rebuild (`releaseGeometry()`), and this
 * geometry must survive those rebuilds — it is shared by construction, so
 * disposing it with one scene's generation would corrupt the other scene.
 * `disposeSharedSphereGeometry()` exists for tests, which must not leak GPU
 * allocations between cases.
 */
export function sharedSphereGeometry(): THREE.SphereGeometry {
  if (!shared) {
    const [width, height] = SPHERE_SEGMENTS.primary
    shared = new THREE.SphereGeometry(SPHERE_RADIUS, width, height)
    shared.name = 'ru-shared-sphere'
  }
  return shared
}

/**
 * Release the shared geometry. Only a test (or a full page teardown that owns
 * the whole module instance) should call this: a live scene that is rebuilt for a
 * breakpoint change keeps using the same object.
 */
export function disposeSharedSphereGeometry(): void {
  shared?.dispose()
  shared = null
}

/**
 * Triangle count of the shared sphere, for the performance report and the unit
 * invariants. Read from the geometry itself so the number can never drift from
 * the buffer that is actually uploaded.
 */
export function sharedSphereTriangles(): number {
  const geometry = sharedSphereGeometry()
  const index = geometry.getIndex()
  if (index) return index.count / 3
  return geometry.getAttribute('position').count / 3
}
