/**
 * RU-4B — Shared materials and geometry.
 *
 * One geometry (the shared unit sphere, see `spheres.ts`) and one material per
 * PRESENTATION PROFILE and node tier, all registered in the disposal ledger, so
 * raising the node count does not raise the draw-call or triangle budget: nodes
 * are instanced, and every instanced mesh reuses a registry material rather than
 * allocating one per node or per render.
 *
 * The registry is the fix for the previous generation's material flaw. That
 * version assigned each node a `colorRole` and built a `MeshStandardMaterial`
 * per role with `metalness` up to 0.52 and a live `emissive` — which is precisely
 * the combination that renders as a planet, a glass ball or neon. Here a material
 * is a profile's resolved character (`presentation-profiles.ts`): high roughness,
 * zero metalness, and only a fractional emissive floor.
 *
 * `roleColor` still exists for the relationship and selection materials, which are
 * line/marker surfaces rather than tactile solids.
 */

import * as THREE from 'three'
import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'
import type { UniverseRenderTheme } from './theme'
import { UniverseLedger } from './dispose'
import {
  RU_MATERIAL_PROFILES,
  resolveProfileRegistry,
  type RuMaterialProfile,
  type RuResolvedProfile,
} from './presentation-profiles'

/** Colour role → palette key, with a neutral fallback for unknown roles. */
export function roleColor(palette: ScenePalette, role: string): THREE.Color {
  const key = role as keyof ScenePalette
  const hex = palette[key] ?? palette.brand ?? '#16b8a6'
  try {
    return new THREE.Color(hex)
  } catch {
    return new THREE.Color('#16b8a6')
  }
}

/**
 * Node tiers. `domain` is the primary band (main domains); `fine` carries the
 * small markers of the progressive-disclosure pass. Both share the SAME sphere
 * geometry — the tier decides scale range and brightness, never a mesh.
 */
export type UniverseTier = 'domain' | 'fine'

export const NODE_TIERS: readonly UniverseTier[] = ['domain', 'fine'] as const

/**
 * Emissive budget per theme, as the multiplier `resolveProfileMaterial` expects.
 *
 * Dark needs a small lift so a matte object separates from a deep navy canvas;
 * light needs almost none because the canvas is already brighter than the object.
 * These are the only numbers that differ between themes for node materials —
 * which is what "same topology, translate materials only" means in practice.
 */
export function profileEmissiveLift(mode: 'light' | 'dark'): number {
  return mode === 'dark' ? 0.34 : 0.08
}

export interface UniverseMaterials {
  /**
   * `[tier][profile]` → material. Registry-allocated once per theme; a node never
   * allocates a material, and a theme switch re-tints these in place.
   */
  nodeMaterials: Record<
    UniverseTier,
    Record<RuMaterialProfile, THREE.MeshStandardMaterial>
  >
  /** Resolved profile data behind those materials, for tinting and diagnostics. */
  profiles: Readonly<Record<RuMaterialProfile, RuResolvedProfile>>
  selectionMaterial: THREE.MeshBasicMaterial
  markMaterial: THREE.LineBasicMaterial
  edgeMaterial: THREE.LineBasicMaterial
}

/**
 * Neutral base colour for registry materials.
 *
 * Every node's colour arrives per instance (`setColorAt`), and three.js MULTIPLIES
 * the instance colour by the material colour instead of replacing it. A registry
 * material therefore has to be white or each node would be tinted twice and come
 * out darker than its profile — the exact defect the previous generation shipped
 * (`nodeMaterials.domain.color` set to the research role AND the same role written
 * per instance).
 */
const REGISTRY_BASE = 0xffffff

export function createUniverseMaterials(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
): UniverseMaterials {
  const { palette } = theme
  const profiles = resolveProfileRegistry(
    palette,
    profileEmissiveLift(theme.mode),
  )

  const nodeMaterials = Object.fromEntries(
    NODE_TIERS.map((tier) => [
      tier,
      Object.fromEntries(
        RU_MATERIAL_PROFILES.map((profile) => {
          const resolved = profiles[profile]
          return [
            profile,
            ledger.trackMaterial(
              new THREE.MeshStandardMaterial({
                color: REGISTRY_BASE,
                roughness: resolved.roughness,
                metalness: resolved.metalness,
                // A matte ceramic has no broad specular lobe; a small non-metal
                // highlight keeps the sphere from reading as flat felt.
                emissive: new THREE.Color(resolved.color).multiplyScalar(
                  resolved.emissive,
                ),
                emissiveIntensity: 1,
                envMapIntensity: 0,
              }),
            ),
          ]
        }),
      ) as Record<RuMaterialProfile, THREE.MeshStandardMaterial>,
    ]),
  ) as Record<
    UniverseTier,
    Record<RuMaterialProfile, THREE.MeshStandardMaterial>
  >

  const markMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: roleColor(palette, 'context'),
      transparent: true,
      opacity: theme.markOpacity,
      depthWrite: false,
    }),
  )

  /**
   * Relationship curves: thin, restrained, warm neutral, low visual weight.
   *
   * `signature` is the theme's warm/champagne role, which is what the brief asks
   * for ("satin champagne / warm neutral"). `ink` is the fallback so a palette
   * without a warm role still yields a readable line.
   */
  const edgeMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: roleColor(palette, 'signature'),
      transparent: true,
      opacity: theme.edgeOpacity,
      depthWrite: false,
    }),
  )

  const selectionMaterial = ledger.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: roleColor(palette, 'signature'),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )

  return {
    nodeMaterials,
    profiles,
    selectionMaterial,
    markMaterial,
    edgeMaterial,
  }
}

/** The node tier a node belongs to; domains are visually heavier than outputs. */
export function tierForKind(kind: UniverseNode['kind']): UniverseTier {
  // The person anchor is rendered by the dedicated central sphere and is never
  // instanced, so it deliberately has no tier of its own here.
  return kind === 'domain' ? 'domain' : 'fine'
}
