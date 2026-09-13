/**
 * RU-02 — The central core.
 *
 * The anchor is rendered as a layered nucleus: a faceted inner solid, a thin
 * back-face shell for volume, and two fine rings on different axes. Restraint is
 * the point — it should read as a precision instrument, not a glowing planet:
 * no bloom, no fresnel shader, no particle field, and only three added draw
 * calls over the nodes and edges.
 *
 * When the published graph carries an identity node, this core IS that node; the
 * caller decides the selection/hit-testing identity, so nothing here invents a
 * research record.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import { roleColor, type UniverseMaterials } from './materials'
import type { UniverseRenderTheme } from './theme'

export interface UniverseCoreVisuals {
  group: THREE.Group
  /** Inner solid, exposed so a caller can orient it (hero tilt reads better). */
  solid: THREE.Mesh
  applyTheme(theme: UniverseRenderTheme): void
}

export interface UniverseCoreOptions {
  radius: number
  /** Ring rotation offsets, so two cores never share the same silhouette. */
  seed?: number
}

export function createUniverseCore(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  materials: UniverseMaterials,
  options: UniverseCoreOptions,
): UniverseCoreVisuals {
  const group = new THREE.Group()
  group.name = 'universe-core'
  const radius = Math.max(options.radius, 3)
  const seed = options.seed ?? 0

  // Faceted inner solid: an icosahedron keeps the instrument read at low cost
  // (detail 1 = 80 triangles).
  const solidGeometry = ledger.track(
    new THREE.IcosahedronGeometry(radius * 0.62, 1),
  )
  const solidMaterial = ledger.trackMaterial(materials.coreMaterial.clone())
  const solid = new THREE.Mesh(solidGeometry, solidMaterial)
  solid.name = 'universe-core-solid'
  solid.rotation.set(0.36 + seed * 0.1, 0.52 - seed * 0.08, 0.18)
  group.add(solid)

  // Back-face shell: barely-there volume so the solid does not read as a decal.
  const shellGeometry = ledger.track(
    new THREE.IcosahedronGeometry(radius * 1.02, 1),
  )
  const shell = new THREE.Mesh(shellGeometry, materials.coreShellMaterial)
  shell.name = 'universe-core-shell'
  group.add(shell)

  // Two fine rings on different axes: the orbital signature of the system.
  for (let index = 0; index < 2; index += 1) {
    const ringGeometry = ledger.track(
      new THREE.TorusGeometry(
        radius * (1.34 + index * 0.26),
        radius * 0.012,
        6,
        128,
      ),
    )
    const ring = new THREE.Mesh(ringGeometry, materials.coreRingMaterial)
    ring.name = `universe-core-ring-${index}`
    ring.rotation.set(
      1.15 + index * 0.72 + seed * 0.2,
      0.32 - index * 0.85,
      index * 0.5,
    )
    group.add(ring)
  }

  return {
    group,
    solid,
    applyTheme(next: UniverseRenderTheme) {
      solidMaterial.color.copy(roleColor(next.palette, 'brand'))
      solidMaterial.emissive.copy(roleColor(next.palette, 'brand'))
      solidMaterial.emissiveIntensity = next.coreEmissive
      solidMaterial.needsUpdate = true
      materials.coreShellMaterial.color.copy(roleColor(next.palette, 'brand'))
      materials.coreShellMaterial.opacity = next.mode === 'dark' ? 0.16 : 0.1
      materials.coreShellMaterial.needsUpdate = true
      materials.coreRingMaterial.color.copy(
        roleColor(next.palette, 'signature'),
      )
      materials.coreRingMaterial.needsUpdate = true
    },
  }
}
