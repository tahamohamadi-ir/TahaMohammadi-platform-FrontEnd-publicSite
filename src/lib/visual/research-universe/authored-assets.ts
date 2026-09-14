/**
 * RU-4A — authored-asset runtime (Blender family, semantic slots).
 *
 * Loads the reviewed Blender GLB ONCE per runtime session and hands out clones that
 * share immutable geometry, replacing the authored preview materials by SEMANTIC
 * SLOT at runtime. Blender preview materials are look-dev only and are never used
 * as production materials (see the GLB contract in the RU-4A card).
 *
 * Follows the established portal-asset pattern (`portal-scene.ts`): one exported
 * asset constant, GLTFLoader, role/slot mapping by material NAME, typed error codes
 * for the fallback path. No graph semantics live here — the graph model stays
 * authoritative and this module only answers "which mesh do I put where".
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Runtime location of the reviewed Blender family (v3). */
export const RU_AUTHORED_ASSETS = {
  signatureV3:
    '/research-universe/models/taha-research-universe-signature-v3.glb',
} as const

/** The four semantic material slots the GLB contract promises. */
export const RU_MATERIAL_SLOTS = [
  'RU_SHELL',
  'RU_INNER',
  'RU_ACCENT',
  'RU_EMISSIVE',
] as const

export type RuMaterialSlot = (typeof RU_MATERIAL_SLOTS)[number]

/** The five groups the GLB contract promises (root + core + three domains). */
export const RU_AUTHORED_GROUPS = [
  'RU_SIGNATURE_ROOT',
  'CORE',
  'DOMAIN_PARS_SQL',
  'DOMAIN_DASHBOARD',
  'DOMAIN_VISUAL_POLITICAL',
] as const

export type RuAuthoredGroup = (typeof RU_AUTHORED_GROUPS)[number]

export type AuthoredAssetErrorCode =
  'asset-fetch-failed' | 'asset-parse-failed' | 'asset-contract-mismatch'

export class AuthoredAssetError extends Error {
  readonly code: AuthoredAssetErrorCode
  readonly detail: string

  constructor(code: AuthoredAssetErrorCode, detail: string) {
    super(`${code}: ${detail}`)
    this.name = 'AuthoredAssetError'
    this.code = code
    this.detail = detail
  }
}

export interface AuthoredSignature {
  readonly url: string
  /** One group per contract name; the group objects themselves, never clones. */
  readonly groups: ReadonlyMap<RuAuthoredGroup, THREE.Object3D>
  /** Measured world diameter per group, in authored (Blender) units. */
  readonly diameters: ReadonlyMap<RuAuthoredGroup, number>
}

export interface AuthoredMeshParts {
  readonly root: THREE.Object3D
  /** Material slots actually applied, for diagnostics and tests. */
  readonly appliedSlots: readonly string[]
}

export type RuSlotMaterials = Readonly<
  Partial<Record<RuMaterialSlot, THREE.Material>>
>

/**
 * Validate a parsed glTF against the accepted contract.
 *
 * Exported separately from the loader so the contract can be tested without a
 * network round-trip, and so a mismatch always names what was missing.
 */
export function inspectAuthoredSignature(
  gltf: { scene: THREE.Object3D },
  url: string,
): AuthoredSignature {
  const byName = new Map<string, THREE.Object3D>()
  gltf.scene.traverse((object) => {
    if (object.name) byName.set(object.name, object)
  })

  const groups = new Map<RuAuthoredGroup, THREE.Object3D>()
  const missing: string[] = []
  for (const name of RU_AUTHORED_GROUPS) {
    const found = byName.get(name)
    if (!found) {
      missing.push(name)
      continue
    }
    groups.set(name, found)
  }
  if (missing.length > 0) {
    throw new AuthoredAssetError(
      'asset-contract-mismatch',
      `missing groups: ${missing.join(', ')}`,
    )
  }

  const slotNames = new Set<string>()
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const list = Array.isArray(object.material)
      ? object.material
      : [object.material]
    for (const material of list) {
      if (material?.name) slotNames.add(material.name)
    }
  })
  const missingSlots = RU_MATERIAL_SLOTS.filter((slot) => !slotNames.has(slot))
  if (missingSlots.length > 0) {
    throw new AuthoredAssetError(
      'asset-contract-mismatch',
      `missing material slots: ${missingSlots.join(', ')}`,
    )
  }

  const diameters = new Map<RuAuthoredGroup, number>()
  for (const [name, group] of groups) {
    const box = new THREE.Box3().setFromObject(group)
    const size = new THREE.Vector3()
    box.getSize(size)
    diameters.set(name, Math.max(size.x, size.y, size.z))
  }

  return { url, groups, diameters }
}

/** Minimal loader seam so asset failure is deterministically testable. */
export interface AuthoredLoader {
  loadAsync(url: string): Promise<{ scene: THREE.Object3D }>
}

let pending: Promise<AuthoredSignature> | null = null
let cached: AuthoredSignature | null = null

/**
 * Load the family once per runtime session (single flight).
 *
 * Home and About share the same module instance in one client lifecycle, so
 * navigating between them must not re-fetch or re-decode the GLB. Failures are NOT
 * cached: the caller falls back to the procedural renderer, and a later mount may
 * retry.
 *
 * The optional `loader` is a test seam (the card requires a deterministic
 * authored-asset failure path); production callers pass nothing.
 */
export async function loadAuthoredSignature(
  url: string = RU_AUTHORED_ASSETS.signatureV3,
  loader?: AuthoredLoader,
): Promise<AuthoredSignature> {
  if (cached && cached.url === url) return cached
  if (pending) return pending

  pending = (async () => {
    let gltf: { scene: THREE.Object3D }
    try {
      const parser: AuthoredLoader = loader ?? new GLTFLoader()
      gltf = await parser.loadAsync(url)
    } catch (error) {
      throw new AuthoredAssetError(
        'asset-fetch-failed',
        error instanceof Error ? error.message : String(error),
      )
    }
    let signature: AuthoredSignature
    try {
      signature = inspectAuthoredSignature(gltf, url)
    } catch (error) {
      if (error instanceof AuthoredAssetError) throw error
      throw new AuthoredAssetError(
        'asset-parse-failed',
        error instanceof Error ? error.message : String(error),
      )
    }
    cached = signature
    return signature
  })()

  try {
    return await pending
  } finally {
    pending = null
  }
}

/** Test seam: drop the cached asset (a real page never needs this). */
export function resetAuthoredCache(): void {
  pending = null
  cached = null
}

/**
 * Clone a group for scene use.
 *
 * `Object3D.clone()` shares geometry and material REFERENCES, which is exactly the
 * contract here: transforms become independent per scene, immutable buffers are
 * not duplicated.
 */
export function cloneAuthoredGroup(
  signature: AuthoredSignature,
  group: RuAuthoredGroup,
): THREE.Object3D {
  const source = signature.groups.get(group)
  if (!source) {
    throw new AuthoredAssetError(
      'asset-contract-mismatch',
      `group not present in loaded asset: ${group}`,
    )
  }
  const clone = source.clone(true)
  clone.name = `${group}_RUNTIME`
  return clone
}

/**
 * Replace authored preview materials by SEMANTIC SLOT.
 *
 * Every mesh keeps its material slot identity; a slot with no runtime material is
 * left untouched, so a partially themed scene never renders untextured.
 */
export function applySlotMaterials(
  root: THREE.Object3D,
  slotMaterials: RuSlotMaterials,
): AuthoredMeshParts {
  const applied: string[] = []
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const list = Array.isArray(object.material)
      ? [...object.material]
      : [object.material]
    let changed = false
    const next = list.map((material) => {
      const slot = material?.name as RuMaterialSlot | undefined
      const replacement = slot ? slotMaterials[slot] : undefined
      if (!replacement) return material
      changed = true
      if (!applied.includes(String(slot))) applied.push(String(slot))
      return replacement
    })
    if (changed) {
      object.material = Array.isArray(object.material) ? next : next[0]
    }
  })
  return { root, appliedSlots: applied }
}
