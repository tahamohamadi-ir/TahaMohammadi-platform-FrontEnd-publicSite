/**
 * RU-02 — Shared materials and geometry.
 *
 * One geometry per node tier and one material per colour role, all registered in
 * the disposal ledger, so raising the node count does NOT raise the draw-call or
 * triangle budget linearly: outputs are instanced, and the instanced meshes are
 * shared between the guided Home scene and the interactive About scene.
 *
 * Palette resolution reads the `ScenePalette` roles the existing CA-03 contract
 * already defines; this module never introduces a second colour system.
 */

import * as THREE from 'three'
import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'
import type { UniverseRenderTheme } from './theme'
import { UniverseLedger } from './dispose'

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
 * Geometry tiers kept deliberately small: the whole visible system must stay far
 * below the declared 50k-triangle / 60-draw-call ceilings.
 * - domain sphere: 20×14 segments ≈ 520 tris
 * - output sphere: 12×9 segments ≈ 190 tris
 */
export const NODE_TIER_SEGMENTS = {
  domain: [20, 14] as const,
  fine: [12, 9] as const,
}

export interface UniverseMaterials {
  nodeMaterials: Record<'domain' | 'fine', THREE.MeshStandardMaterial>
  coreMaterial: THREE.MeshStandardMaterial
  coreShellMaterial: THREE.MeshBasicMaterial
  coreRingMaterial: THREE.MeshStandardMaterial
  orbitMaterial: THREE.LineBasicMaterial
  markMaterial: THREE.LineBasicMaterial
  edgeMaterial: THREE.LineBasicMaterial
  selectionMaterial: THREE.MeshBasicMaterial
}

/** Role palette for node instances: kind decides the role when none is given. */
export function roleForNode(
  node: Pick<UniverseNode, 'kind' | 'colorRole'>,
): string {
  if (node.colorRole && node.colorRole !== 'neutral') return node.colorRole
  switch (node.kind) {
    case 'domain':
      return 'research'
    case 'subdomain':
      return 'context'
    case 'project':
      return 'signature'
    case 'publication':
      return 'signature'
    case 'tool':
      return 'brand'
    default:
      return 'brand'
  }
}

export function createUniverseMaterials(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
): UniverseMaterials {
  const { palette } = theme

  const nodeMaterials = {
    domain: ledger.trackMaterial(
      new THREE.MeshStandardMaterial({
        color: roleColor(palette, 'research'),
        roughness: 0.28,
        metalness: 0.36,
        emissive: roleColor(palette, 'research'),
        emissiveIntensity: theme.nodeEmissive,
      }),
    ),
    fine: ledger.trackMaterial(
      new THREE.MeshStandardMaterial({
        color: roleColor(palette, 'signature'),
        roughness: 0.4,
        metalness: 0.24,
        emissive: roleColor(palette, 'signature'),
        emissiveIntensity: theme.nodeEmissive * 0.6,
      }),
    ),
  }

  const coreMaterial = ledger.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: roleColor(palette, 'brand'),
      roughness: 0.22,
      metalness: 0.52,
      emissive: roleColor(palette, 'brand'),
      emissiveIntensity: theme.coreEmissive,
    }),
  )

  const coreShellMaterial = ledger.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: roleColor(palette, 'brand'),
      transparent: true,
      opacity: theme.mode === 'dark' ? 0.16 : 0.1,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )

  const coreRingMaterial = ledger.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: roleColor(palette, 'signature'),
      roughness: 0.34,
      metalness: 0.62,
      transparent: true,
      opacity: 0.9,
    }),
  )

  const orbitMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: roleColor(palette, 'context'),
      transparent: true,
      opacity: theme.orbitOpacity,
      depthWrite: false,
    }),
  )

  const markMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: roleColor(palette, 'context'),
      transparent: true,
      opacity: theme.markOpacity,
      depthWrite: false,
    }),
  )

  const edgeMaterial = ledger.trackMaterial(
    new THREE.LineBasicMaterial({
      color: roleColor(palette, 'ink'),
      transparent: true,
      opacity: theme.edgeOpacity,
      depthWrite: false,
    }),
  )

  const selectionMaterial = ledger.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: roleColor(palette, 'signature'),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )

  return {
    nodeMaterials,
    coreMaterial,
    coreShellMaterial,
    coreRingMaterial,
    orbitMaterial,
    markMaterial,
    edgeMaterial,
    selectionMaterial,
  }
}

/** The node tier a node belongs to; domains are visually heavier than outputs. */
export function tierForKind(kind: UniverseNode['kind']): 'domain' | 'fine' {
  return kind === 'domain' || kind === 'person' ? 'domain' : 'fine'
}
