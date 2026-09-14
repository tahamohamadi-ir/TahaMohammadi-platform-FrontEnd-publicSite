/**
 * RU-4A — authored-asset + presentation mapping unit coverage.
 *
 * What can be proven without a browser lives here: the GLB contract, the
 * single-flight asset cache, the failure path that keeps the procedural renderer,
 * semantic-slot material replacement, profile mapping, and the scale invariant.
 * The scene-level behaviour (scroll states, drag, selection, mobile containment)
 * stays covered by the existing RU browser suites.
 */

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RU_AUTHORED_ASSETS,
  RU_AUTHORED_GROUPS,
  RU_MATERIAL_SLOTS,
  applySlotMaterials,
  cloneAuthoredGroup,
  inspectAuthoredSignature,
  loadAuthoredSignature,
  resetAuthoredCache,
  type AuthoredLoader,
} from './authored-assets'
import {
  RU_AUTHORED_PROFILES,
  RU_CANONICAL_ROTATION,
  RU_NODE_RESPONSE,
  normalizeLabel,
  presentationInvariantHolds,
  presentationScaleFor,
  resolveAuthoredProfile,
} from './presentation'

/** Minimal glTF stand-in: the contract names plus one mesh per material slot. */
function fakeGltf(
  options: { groups?: readonly string[]; slots?: readonly string[] } = {},
) {
  const groups = options.groups ?? RU_AUTHORED_GROUPS
  const slots = options.slots ?? RU_MATERIAL_SLOTS
  const scene = new THREE.Group()
  scene.name = 'Scene'
  for (const name of groups) {
    const group = new THREE.Group()
    group.name = name
    // Meshes live UNDER their group (as in the real GLB), otherwise cloning a
    // group yields an empty hierarchy and slot replacement has nothing to act on.
    for (const slot of slots) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ name: slot }),
      )
      mesh.name = `${name}_${slot}`
      group.add(mesh)
    }
    scene.add(group)
  }
  return { scene }
}

function loaderFor(
  gltf: { scene: THREE.Object3D },
  onLoad?: () => void,
): AuthoredLoader {
  return {
    loadAsync: vi.fn(async () => {
      onLoad?.()
      return gltf
    }),
  }
}

describe('authored-assets — GLB contract and cache', () => {
  beforeEach(() => {
    resetAuthoredCache()
  })

  it('exposes the reviewed v3 runtime path', () => {
    expect(RU_AUTHORED_ASSETS.signatureV3).toBe(
      '/research-universe/models/taha-research-universe-signature-v3.glb',
    )
  })

  it('maps the five contract groups and measures their diameters', () => {
    const signature = inspectAuthoredSignature(fakeGltf(), 'test.glb')
    for (const name of RU_AUTHORED_GROUPS) {
      expect(signature.groups.has(name)).toBe(true)
    }
    expect(signature.diameters.size).toBe(RU_AUTHORED_GROUPS.length)
  })

  it('loads the GLB once, even for concurrent Home and About mounts', async () => {
    let loads = 0
    const loader = loaderFor(fakeGltf(), () => {
      loads += 1
    })
    const [a, b] = await Promise.all([
      loadAuthoredSignature('test.glb', loader),
      loadAuthoredSignature('test.glb', loader),
    ])
    const third = await loadAuthoredSignature('test.glb', loader)
    expect(loads).toBe(1)
    expect(a).toBe(b)
    expect(third).toBe(a)
  })

  it('reports a contract mismatch instead of rendering a partial family', () => {
    const missingGroup = fakeGltf({ groups: RU_AUTHORED_GROUPS.slice(1) })
    expect(() =>
      inspectAuthoredSignature(missingGroup, 'test.glb'),
    ).toThrowError(/asset-contract-mismatch: missing groups: RU_SIGNATURE_ROOT/)

    const missingSlot = fakeGltf({ slots: RU_MATERIAL_SLOTS.slice(1) })
    expect(() =>
      inspectAuthoredSignature(missingSlot, 'test.glb'),
    ).toThrowError(/missing material slots: RU_SHELL/)
  })

  it('surfaces a typed fetch failure and does not poison later retries', async () => {
    const failing: AuthoredLoader = {
      loadAsync: vi.fn(async () => {
        throw new Error('404')
      }),
    }
    await expect(
      loadAuthoredSignature('test.glb', failing),
    ).rejects.toMatchObject({
      code: 'asset-fetch-failed',
    })

    // The procedural renderer stays in charge on failure, but a later mount may
    // still succeed: a cached rejection would freeze the universe as procedural.
    const recovered = await loadAuthoredSignature(
      'test.glb',
      loaderFor(fakeGltf()),
    )
    expect(recovered.groups.has('CORE')).toBe(true)
  })

  it('clones share immutable geometry while transforms stay independent', () => {
    const signature = inspectAuthoredSignature(fakeGltf(), 'test.glb')
    const first = cloneAuthoredGroup(signature, 'CORE')
    const second = cloneAuthoredGroup(signature, 'CORE')

    const meshOf = (root: THREE.Object3D) => {
      let found: THREE.Mesh | null = null
      root.traverse((object) => {
        if (!found && object instanceof THREE.Mesh) found = object as THREE.Mesh
      })
      return found as unknown as THREE.Mesh
    }
    // Same geometry buffer object → the GLB is decoded once per session.
    expect(meshOf(first).geometry).toBe(meshOf(second).geometry)
    first.position.set(5, 0, 0)
    expect(second.position.x).toBe(0)
    expect(first.name).toBe('CORE_RUNTIME')
  })

  it('replaces authored preview materials by semantic slot, per theme', () => {
    const signature = inspectAuthoredSignature(fakeGltf(), 'test.glb')
    const root = cloneAuthoredGroup(signature, 'DOMAIN_PARS_SQL')

    const dark = Object.fromEntries(
      RU_MATERIAL_SLOTS.map((slot) => [
        slot,
        new THREE.MeshStandardMaterial({ name: `${slot}_DARK` }),
      ]),
    )
    const result = applySlotMaterials(root, dark)
    expect([...result.appliedSlots].sort()).toEqual(
      [...RU_MATERIAL_SLOTS].sort(),
    )

    let seen = 0
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const material = object.material as THREE.Material
      expect(material.name.endsWith('_DARK')).toBe(true)
      seen += 1
    })
    expect(seen).toBe(RU_MATERIAL_SLOTS.length)

    // A slot with no runtime material is left alone (never untextured).
    const light = {
      RU_SHELL: new THREE.MeshStandardMaterial({ name: 'SHELL_LIGHT' }),
    }
    const partial = applySlotMaterials(
      cloneAuthoredGroup(signature, 'CORE'),
      light,
    )
    expect(partial.appliedSlots).toEqual(['RU_SHELL'])
  })
})

describe('presentation — graph records to authored profiles', () => {
  it('maps the published identity and the three current main domains', () => {
    const identity = resolveAuthoredProfile({
      label: 'Taha Mohammadi',
      kind: 'person',
    })
    expect(identity?.group).toBe('CORE')

    const pairs: Array<[string, string]> = [
      ['PARS-SQL / VTD-Edge', 'DOMAIN_PARS_SQL'],
      ['Story-Driven Dashboard Design Framework', 'DOMAIN_DASHBOARD'],
      ['Visual Political Communication Research', 'DOMAIN_VISUAL_POLITICAL'],
    ]
    for (const [label, group] of pairs) {
      expect(resolveAuthoredProfile({ label, kind: 'domain' })?.group).toBe(
        group,
      )
    }
  })

  it('returns null for an unmapped domain so the procedural node stays', () => {
    expect(
      resolveAuthoredProfile({
        label: 'Some Future Research Domain',
        kind: 'domain',
      }),
    ).toBeNull()
    // …and never claims a subnode or an output, which stay procedural by contract.
    expect(
      resolveAuthoredProfile({ label: 'Chapter 3', kind: 'subdomain' }),
    ).toBeNull()
    expect(
      resolveAuthoredProfile({ label: 'Report 7', kind: 'other' }),
    ).toBeNull()
  })

  it('matches labels across typography drift', () => {
    expect(normalizeLabel('PARS‑SQL /  VTD-Edge ')).toBe('pars-sql / vtd-edge')
    expect(
      resolveAuthoredProfile({ label: 'pars-sql /  VTD-Edge', kind: 'domain' })
        ?.key,
    ).toBe('pars-sql')
    // A mapping only exists because the label matches — an unmatched kind never
    // becomes a main domain by accident.
    expect(
      resolveAuthoredProfile({ label: 'Unrelated', kind: 'domain' }),
    ).toBeNull()
  })

  it('never uses the authored diameter blindly', () => {
    const base = presentationScaleFor('domain', 1, 1.0)
    const doubled = presentationScaleFor('domain', 1, 2.0)
    expect(doubled).toBeCloseTo(base / 2, 6)
  })

  it('keeps core > main domain > procedural subnode', () => {
    // The real, measured v3 diameters (Blender units). Ordering is guaranteed by
    // construction — one radius authority (`nodeRadiusFor`) decides the target and
    // the authored diameter only rescales into it — so this test is cheap insurance
    // against a future change of that authority or of the kind mapping.
    expect(
      presentationInvariantHolds({ CORE: 1.44, DOMAIN_PARS_SQL: 1.0 }),
    ).toBe(true)
    // A whole node measuring twice the diameter presents at the same radius: the
    // authored size is compensated, never trusted blindly.
    const authoredRadius = (diameter: number, kind: 'person' | 'domain') =>
      (diameter / 2) * presentationScaleFor(kind, 1, diameter)
    expect(authoredRadius(2.88, 'domain')).toBeCloseTo(
      authoredRadius(1.0, 'domain'),
      6,
    )
    expect(authoredRadius(1.44, 'person')).toBeGreaterThan(
      authoredRadius(1.0, 'domain'),
    )
    // The genuine failure mode is a missing group, which must not pass silently.
    expect(presentationInvariantHolds({ DOMAIN_PARS_SQL: 1.0 })).toBe(false)
    expect(presentationInvariantHolds({ CORE: 0, DOMAIN_PARS_SQL: 1.0 })).toBe(
      false,
    )
  })

  it('defines a canonical orientation for every authored group', () => {
    for (const profile of RU_AUTHORED_PROFILES) {
      expect(RU_CANONICAL_ROTATION[profile.group]).toBeDefined()
    }
    expect(RU_NODE_RESPONSE.hoverScale).toBeCloseTo(1.02, 6)
    expect(RU_NODE_RESPONSE.selectScale).toBeCloseTo(1.04, 6)
  })
})
