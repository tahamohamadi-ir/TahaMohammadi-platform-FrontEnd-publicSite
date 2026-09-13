/**
 * RU-02 — Orbital planes and calibration marks.
 *
 * Each hierarchy level gets its own TILTED plane, generated from the same
 * `pointOnPlane` math the nodes use, so a node always sits exactly on its plane
 * and the composition reads as several distinct orbital strata rather than one
 * flat ring. Marks are gauges, never data: they encode nothing about research
 * relationships.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import type { OrbitalPlane, UniversePoint } from './layout'
import { pointOnPlane } from './layout'
import { roleColor, type UniverseMaterials } from './materials'
import type { UniverseRenderTheme } from './theme'

export interface UniverseOrbitVisuals {
  group: THREE.Group
  applyTheme(theme: UniverseRenderTheme): void
}

const MARKS_PER_PLANE = 48

function ringPoints(plane: OrbitalPlane): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= plane.segments; index += 1) {
    const azimuth = (index / plane.segments) * Math.PI * 2
    const point = pointOnPlane(plane, azimuth, 1)
    points.push(new THREE.Vector3(point.x, point.y, point.z))
  }
  return points
}

/** Short radial ticks: longer every fourth, so the gauges read as calibrated. */
function markSegments(plane: OrbitalPlane): THREE.Vector3[] {
  const segments: THREE.Vector3[] = []
  for (let index = 0; index < MARKS_PER_PLANE; index += 1) {
    const azimuth = (index / MARKS_PER_PLANE) * Math.PI * 2
    const scale = index % 4 === 0 ? 1.035 : 1.017
    const inner: UniversePoint = pointOnPlane(plane, azimuth, 1)
    const outer: UniversePoint = pointOnPlane(plane, azimuth, scale)
    segments.push(
      new THREE.Vector3(inner.x, inner.y, inner.z),
      new THREE.Vector3(outer.x, outer.y, outer.z),
    )
  }
  return segments
}

export function createUniverseOrbits(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  planes: ReadonlyArray<OrbitalPlane>,
  materials: UniverseMaterials,
): UniverseOrbitVisuals {
  const group = new THREE.Group()
  group.name = 'universe-orbits'

  for (const plane of planes) {
    const ringGeometry = ledger.track(
      new THREE.BufferGeometry().setFromPoints(ringPoints(plane)),
    )
    const ring = new THREE.LineLoop(ringGeometry, materials.orbitMaterial)
    ring.name = `orbit-plane-${plane.index}`
    group.add(ring)

    const markGeometry = ledger.track(
      new THREE.BufferGeometry().setFromPoints(markSegments(plane)),
    )
    const marks = new THREE.LineSegments(markGeometry, materials.markMaterial)
    marks.name = `orbit-marks-${plane.index}`
    group.add(marks)
  }

  return {
    group,
    applyTheme(next: UniverseRenderTheme) {
      materials.orbitMaterial.color.copy(roleColor(next.palette, 'context'))
      materials.orbitMaterial.opacity = next.orbitOpacity
      materials.markMaterial.color.copy(roleColor(next.palette, 'context'))
      materials.markMaterial.opacity = next.markOpacity
      materials.orbitMaterial.needsUpdate = true
      materials.markMaterial.needsUpdate = true
    },
  }
}
