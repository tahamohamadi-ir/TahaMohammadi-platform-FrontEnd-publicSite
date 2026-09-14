/**
 * RU-4C — The identity anchor.
 *
 * The anchor ("Taha Mohammadi") is ONE sphere using the SAME shared geometry as
 * every other node, presented through the `identity` profile — deep mineral teal
 * (dark) / restrained teal (light), never white.
 *
 * RU-4C fixed a real defect here: the anchor used to borrow the white-based
 * registry material, so the identity node rendered white/grey — the one node the
 * direction explicitly says must not be, and the node that is supposed to be the
 * perceptual centre of the composition.
 *
 * What was removed two passes ago and why — the previous generation rendered a
 * layered nucleus: a faceted `IcosahedronGeometry` inner solid, a back-face shell
 * and two `TorusGeometry` rings on different axes. That is three primitives and
 * two full circles, breaking three rules at once (one shared sphere geometry; no
 * concentric circles; no custom shells or mechanical forms).
 *
 * The anchor's prominence comes from scale (1.4–1.6× a main domain's diameter,
 * asserted in `presentation.test.ts`), its deeper material, and its position as
 * the hub of every real relationship.
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
 * material is the `anchorMaterial` owned by `createUniverseMaterials`, which the
 * node layer re-tints in place on a theme change. The anchor therefore holds no
 * disposable resource of its own.
 */
export function createUniverseCore(
  materials: UniverseMaterials,
  options: UniverseCoreOptions,
): UniverseCoreVisuals {
  const group = new THREE.Group()
  group.name = 'universe-core'
  const radius = Math.max(options.radius, 1)

  // The same unit sphere every other node uses; scale supplies the size.
  const solid = new THREE.Mesh(sharedSphereGeometry(), materials.anchorMaterial)
  solid.name = 'universe-core-solid'
  solid.scale.setScalar(radius)
  group.add(solid)

  return { group, solid, radius }
}
