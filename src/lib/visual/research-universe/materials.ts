/**
 * RU-4B / RU-4C — Shared materials and geometry.
 *
 * One geometry (the shared unit sphere, see `spheres.ts`) and one material per
 * PRESENTATION PROFILE and node tier, registered in the disposal ledger, so
 * raising the node count does not raise the draw-call or triangle budget.
 *
 * Two kinds of material live here, and the difference matters:
 *
 * - REGISTRY materials are used by `InstancedMesh`. Their base colour must stay
 *   WHITE, because three.js MULTIPLIES the per-instance colour by the material
 *   colour instead of replacing it — a coloured base tints every node twice.
 * - The ANCHOR material is used by a plain `Mesh` (the identity sphere), which
 *   has no per-instance colour at all. It therefore carries the profile's own
 *   colour directly.
 *
 * That distinction is the fix for a real RU-4B defect: the anchor borrowed the
 * white registry material, so the identity node rendered white/grey — exactly
 * what the direction forbids ("Identity … NOT white", "should become the
 * perceptual center").
 *
 * RU-4C also mineralises the relationship colour: the champagne token is mixed
 * toward a neutral so edges read as restrained warm grey rather than gold.
 */

import * as THREE from 'three'
import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'
import type { UniverseRenderTheme } from './theme'
import { UniverseLedger } from './dispose'
import {
  RU_MATERIAL_PROFILES,
  mixHex,
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

export type UniverseTier = 'domain' | 'fine'

export const NODE_TIERS: readonly UniverseTier[] = ['domain', 'fine'] as const

/**
 * Emissive budget per theme, as the multiplier `resolveProfileMaterial` expects.
 *
 * Both values are deliberately small: the direction asks for "very low or zero
 * visible emissive feel". Dark needs a touch more than light so a matte object
 * separates from a deep navy canvas.
 */
export function profileEmissiveLift(mode: 'light' | 'dark'): number {
  return mode === 'dark' ? 0.3 : 0.06
}

/**
 * Relationship colour: a warm neutral, mineralised per theme.
 *
 * Dark: restrained champagne-grey. Light: muted aged brass. In both cases the
 * saturated token is mixed toward the theme's ink so the line stays subordinate
 * to the nodes and never reads as gold jewellery.
 */
export function resolveEdgeColor(
  palette: ScenePalette,
  mode: 'light' | 'dark',
): string {
  const base = palette.signature ?? '#c89b3c'
  return mixHex(base, palette.ink ?? '#f7f3ea', mode === 'dark' ? 0.42 : 0.3)
}

export interface UniverseMaterials {
  /** `[tier][profile]` → white-based material for instanced nodes. */
  nodeMaterials: Record<
    UniverseTier,
    Record<RuMaterialProfile, THREE.MeshStandardMaterial>
  >
  /**
   * The identity anchor's own material. Carries the profile colour directly,
   * because a plain mesh has no per-instance tint to supply it.
   */
  anchorMaterial: THREE.MeshStandardMaterial
  /** Selected-node rim: a thin back-face shell, never a ring. */
  rimMaterial: THREE.MeshBasicMaterial
  /** Resolved profile data behind the registry, for tinting and diagnostics. */
  profiles: Readonly<Record<RuMaterialProfile, RuResolvedProfile>>
  edgeMaterial: THREE.LineBasicMaterial
}

/** Neutral base colour for registry materials. See the module note. */
const REGISTRY_BASE = 0xffffff

export function createUniverseMaterials(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
): UniverseMaterials {
  const { palette } = theme
  const profiles = resolveProfileRegistry(
    palette,
    profileEmissiveLift(theme.mode),
    theme.mode,
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

  const identityProfile = profiles.identity
  const anchorMaterial = ledger.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(identityProfile.color),
      roughness: identityProfile.roughness,
      metalness: identityProfile.metalness,
      emissive: new THREE.Color(identityProfile.color).multiplyScalar(
        identityProfile.emissive,
      ),
      emissiveIntensity: 1,
      envMapIntensity: 0,
    }),
  )

  // Back-face shell used as a selection rim. Basic material, no lighting, so it
  // reads as a thin edge rather than a lit halo.
  const rimMaterial = ledger.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: roleColor(palette, 'signature'),
      transparent: true,
      opacity: 0.52,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )

  const edgeMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: new THREE.Color(resolveEdgeColor(palette, theme.mode)),
      transparent: true,
      opacity: theme.edgeOpacity,
      depthWrite: false,
    }),
  )

  return {
    nodeMaterials,
    anchorMaterial,
    rimMaterial,
    profiles,
    edgeMaterial,
  }
}

/** The node tier a node belongs to; domains are visually heavier than outputs. */
export function tierForKind(kind: UniverseNode['kind']): UniverseTier {
  return kind === 'domain' ? 'domain' : 'fine'
}
