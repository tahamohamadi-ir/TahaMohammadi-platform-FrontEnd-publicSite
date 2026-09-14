/**
 * RU-4B — The identity anchor.
 *
 * The anchor ("Taha Mohammadi") is ONE sphere using the SAME shared geometry as
 * every other node, presented through the `identity` material profile. That is the
 * whole object.
 *
 * What was removed and why — the previous generation rendered a layered nucleus:
 * a faceted `IcosahedronGeometry` inner solid, a back-face shell and two
 * `TorusGeometry` rings on different axes. That is three separate primitives and
 * two full circles, and it broke three of the brief's rules at once:
 *
 * - "all primary graph nodes use ONE shared simple sphere geometry" — an
 *   icosahedron is a different mesh;
 * - "no concentric circles / no circular trajectories" — the two rings ARE full
 *   torus circles around the centre, the single strongest "atom / planetary"
 *   cue in the whole composition;
 * - "no custom shells / mechanical forms / futuristic machinery" — the faceted
 *   solid plus its shell is a bespoke instrument silhouette, not a designed
 *   object.
 *
 * The anchor's prominence now comes from scale alone (1.4–1.6× a main domain's
 * diameter, asserted in `presentation.test.ts`) plus its material character,
 * which is exactly what the brief asks for.
 */

import * as THREE from 'three'
import { sharedSphereGeometry } from './spheres'
import type { UniverseMaterials } from './materials'

export interface UniverseCoreVisuals {
  group: THREE.Group
  /** The sphere itself, exposed so the caller can hit-test or inspect it. */
  solid: THREE.Mesh
  /** Radius in scene units, so a caller never re-derives the scale. */
  radius: number
}

export interface UniverseCoreOptions {
  radius: number
}

/**
 * Build the anchor sphere.
 *
 * No ledger and no theme parameter: the geometry is process-shared and the
 * material is a registry material owned by `createUniverseMaterials`, which the
 * node layer re-tints in place on a theme change. The anchor therefore holds no
 * disposable resource of its own, and there is nothing here to dispose.
 */
export function createUniverseCore(
  materials: UniverseMaterials,
  options: UniverseCoreOptions,
): UniverseCoreVisuals {
  const group = new THREE.Group()
  group.name = 'universe-core'
  const radius = Math.max(options.radius, 1)

  // The same unit sphere every other node uses; scale supplies the size.
  const solid = new THREE.Mesh(
    sharedSphereGeometry(),
    materials.nodeMaterials.fine.identity,
  )
  solid.name = 'universe-core-solid'
  solid.scale.setScalar(radius)
  group.add(solid)

  return { group, solid, radius }
}
