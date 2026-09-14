/**
 * RU-4B — Node geometry and emphasis.
 *
 * Every node is an instance of the SAME shared unit sphere (`spheres.ts`). A
 * node's size is its instance scale, its visual character comes from its
 * PRESENTATION PROFILE, and nothing else distinguishes two nodes except position,
 * depth, label, graph semantics and interaction state.
 *
 * Batching: one `InstancedMesh` per (tier, profile) that actually has nodes. The
 * alternative — one mesh per tier — would force every node in a tier through a
 * single material and therefore a single roughness, which silently discards the
 * per-profile material character the brief asks for (matte ceramic vs satin
 * enamel vs coarse stone). Batching by profile keeps that character at a cost of
 * one draw call per distinct profile in use, and the registry material is shared
 * across the Home and About scenes.
 *
 * Emphasis is deliberately smaller than the previous generation's. The old model
 * scaled a selected node to 1.3× and a dimmed node to 0.9×; the brief caps
 * selection at +3–4% and hover at +2%, with no pulsing, no neon and no halo, so
 * the constants come from `presentation-profiles.ts` (`RU_NODE_RESPONSE`) and
 * dimming is expressed as a loss of contrast toward the canvas rather than a
 * change in physical size.
 *
 * The anchor is NOT instanced: `partitionLayoutNodes` routes it to the dedicated
 * central sphere, and its metadata lives here only so selection, hit testing and
 * relationship endpoints still resolve to it.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import { partitionLayoutNodes, type UniverseNode3D } from './layout'
import {
  NODE_TIERS,
  roleColor,
  tierForKind,
  type UniverseMaterials,
  type UniverseTier,
} from './materials'
import {
  RU_DIM_LERP,
  RU_NODE_RESPONSE,
  type RuMaterialProfile,
} from './presentation-profiles'
import { sharedSphereGeometry } from './spheres'
import type { UniverseNode } from '../../research-universe/model'
import type { UniverseRenderTheme } from './theme'

export interface UniverseNodeVisual {
  id: string
  kind: UniverseNode['kind']
  tier: UniverseTier
  profile: RuMaterialProfile
  /** Index inside its (tier, profile) batch; `-1` for the anchor. */
  instance: number
  baseRadius: number
  role: string
  position: THREE.Vector3
  isAnchor: boolean
}

export interface EmphasisState {
  /** Selected node, or null. */
  selectedId: string | null
  /** Nodes that stay at full colour while a selection exists. */
  incidentIds: ReadonlySet<string> | null
  /** Selected relationship, emphasised in addition to any node selection. */
  selectedEdge: { source: string; target: string } | null
  /**
   * Pointer-hovered node, or null. Drives the +2% response the brief allows and
   * nothing else — no highlight material, no growth of the label box.
   */
  hoveredId?: string | null
}

export interface UniverseNodeVisuals {
  group: THREE.Group
  visuals: UniverseNodeVisual[]
  /** The anchor's metadata; empty when the graph has no anchor node. */
  anchorVisuals: UniverseNodeVisual[]
  tierCounts: Record<UniverseTier, number>
  /** How many generic instances exist. The anchor must never be counted here. */
  instancedCount: number
  /** Batches actually created, `tier:profile` → instance count. */
  batches: Readonly<Record<string, number>>
  /** The shared sphere object, so a test can assert reuse rather than trust prose. */
  geometry: THREE.BufferGeometry
  setEmphasis(state: EmphasisState): void
  applyTheme(theme: UniverseRenderTheme): void
}

/** The anchor's selection ring clears the sphere silhouette without a halo. */
const ANCHOR_RING_SCALE = 1.34
const NODE_RING_SCALE = 1.5
/** Below this, a ring would sit inside the sphere it marks. */
const RING_INNER = 1.32
const RING_OUTER = 1.4

interface Batch {
  tier: UniverseTier
  profile: RuMaterialProfile
  mesh: THREE.InstancedMesh
  /** Batch-local index of each visual id, in layout order. */
  slots: UniverseNodeVisual[]
}

export function createUniverseNodes(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  layoutNodes: ReadonlyArray<UniverseNode3D>,
  materials: UniverseMaterials,
): UniverseNodeVisuals {
  const group = new THREE.Group()
  group.name = 'universe-nodes'

  const { anchors, standard } = partitionLayoutNodes(layoutNodes)

  const anchorVisuals: UniverseNodeVisual[] = anchors.map((node) => ({
    id: node.id,
    kind: node.kind,
    tier: 'fine',
    profile: node.profile,
    instance: -1,
    baseRadius: node.radius,
    role: node.colorRole,
    position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
    isAnchor: true,
  }))

  // Group layout nodes into (tier, profile) batches BEFORE allocating anything,
  // so no InstancedMesh is created for a combination this graph does not contain.
  const tierCounts: Record<UniverseTier, number> = { domain: 0, fine: 0 }
  const grouped = new Map<
    string,
    { tier: UniverseTier; profile: RuMaterialProfile; nodes: UniverseNode3D[] }
  >()
  for (const node of standard) {
    const tier = tierForKind(node.kind)
    const profile = node.profile
    tierCounts[tier] += 1
    const key = `${tier}:${profile}`
    const entry = grouped.get(key)
    if (entry) entry.nodes.push(node)
    else grouped.set(key, { tier, profile, nodes: [node] })
  }

  const geometry = sharedSphereGeometry()
  const dummy = new THREE.Object3D()
  const visuals: UniverseNodeVisual[] = []
  const batches: Batch[] = []
  const batchesByName: Record<string, number> = {}
  let instancedCount = 0

  for (const [key, entry] of grouped) {
    const material = materials.nodeMaterials[entry.tier][entry.profile]
    const mesh = new THREE.InstancedMesh(geometry, material, entry.nodes.length)
    mesh.name = `universe-nodes-${key}`
    mesh.count = entry.nodes.length
    mesh.frustumCulled = false

    const slots: UniverseNodeVisual[] = []
    entry.nodes.forEach((node, instance) => {
      dummy.position.set(node.point.x, node.point.y, node.point.z)
      dummy.scale.setScalar(node.radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(instance, dummy.matrix)
      mesh.setColorAt(
        instance,
        roleColor(theme.palette, node.colorRole || 'brand'),
      )
      const visual: UniverseNodeVisual = {
        id: node.id,
        kind: node.kind,
        tier: entry.tier,
        profile: entry.profile,
        instance,
        baseRadius: node.radius,
        role: node.colorRole,
        position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
        isAnchor: false,
      }
      visuals.push(visual)
      slots.push(visual)
    })

    instancedCount += entry.nodes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    group.add(mesh)
    batches.push({ tier: entry.tier, profile: entry.profile, mesh, slots })
    batchesByName[key] = entry.nodes.length
  }

  // One ring mesh, repositioned: selection costs no extra draw call per node and
  // serves every batch, which is why the anchor needs no instance.
  const ringGeometry = ledger.track(
    new THREE.RingGeometry(RING_INNER, RING_OUTER, 48),
  )
  const selectionRing = new THREE.Mesh(
    ringGeometry,
    materials.selectionMaterial,
  )
  selectionRing.name = 'universe-selection-ring'
  selectionRing.visible = false
  group.add(selectionRing)

  const visualById = new Map<string, UniverseNodeVisual>()
  for (const visual of visuals) visualById.set(visual.id, visual)
  const batchByKey = new Map<string, Batch>()
  for (const batch of batches)
    batchByKey.set(`${batch.tier}:${batch.profile}`, batch)

  /** Write one instance into its own batch. Never allocates. */
  function writeInstance(
    visual: UniverseNodeVisual,
    scale: number,
    color: THREE.Color,
  ): void {
    if (visual.instance < 0) return // the anchor has no instance by design
    const batch = batchByKey.get(`${visual.tier}:${visual.profile}`)
    if (!batch) return
    dummy.position.copy(visual.position)
    dummy.scale.setScalar(visual.baseRadius * scale)
    dummy.updateMatrix()
    batch.mesh.setMatrixAt(visual.instance, dummy.matrix)
    batch.mesh.setColorAt(visual.instance, color)
  }

  function setEmphasis(state: EmphasisState): void {
    const { selectedId, incidentIds, selectedEdge } = state
    const hoveredId = state.hoveredId ?? null
    const canvasColor = roleColor(theme.palette, 'canvas')

    selectionRing.visible = false

    for (const visual of visuals) {
      const isSelected = selectedId != null && visual.id === selectedId
      const inEdge =
        selectedEdge != null &&
        (visual.id === selectedEdge.source || visual.id === selectedEdge.target)
      const isIncident =
        selectedId == null || incidentIds == null || incidentIds.has(visual.id)
      const isHovered = hoveredId != null && visual.id === hoveredId

      // Interaction state only ever nudges scale: selection first, then hover,
      // then a mild recession for unrelated nodes.
      const scale = isSelected
        ? RU_NODE_RESPONSE.selectScale
        : !isIncident
          ? RU_NODE_RESPONSE.dimmedScale
          : isHovered
            ? RU_NODE_RESPONSE.hoverScale
            : 1

      const base = roleColor(theme.palette, visual.role || 'brand')
      const color = base.clone()
      if (selectedId != null && !isIncident)
        color.lerp(canvasColor, RU_DIM_LERP)
      else if (inEdge) color.lerp(roleColor(theme.palette, 'signature'), 0.22)
      writeInstance(visual, scale, color)

      if (isSelected) {
        selectionRing.position.copy(visual.position)
        selectionRing.scale.setScalar(visual.baseRadius * NODE_RING_SCALE)
        selectionRing.visible = true
      }
    }

    for (const anchor of anchorVisuals) {
      if (selectedId != null && anchor.id === selectedId) {
        selectionRing.position.copy(anchor.position)
        selectionRing.scale.setScalar(anchor.baseRadius * ANCHOR_RING_SCALE)
        selectionRing.visible = true
      }
    }

    for (const batch of batches) {
      batch.mesh.instanceMatrix.needsUpdate = true
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true
    }
  }

  setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })

  return {
    group,
    visuals,
    anchorVisuals,
    tierCounts,
    instancedCount,
    batches: batchesByName,
    geometry,
    setEmphasis,
    applyTheme(next: UniverseRenderTheme) {
      materials.selectionMaterial.color.copy(
        roleColor(next.palette, 'signature'),
      )
      materials.selectionMaterial.needsUpdate = true

      // Re-tint the WHOLE registry from the new palette: every profile, every
      // tier, in place. No material or mesh is allocated by a theme switch, and
      // the base colour stays white because each node's colour is per instance.
      for (const tier of NODE_TIERS) {
        for (const [key, resolved] of Object.entries(materials.profiles)) {
          const profile = key as RuMaterialProfile
          const material = materials.nodeMaterials[tier][profile]
          material.color.set(0xffffff)
          material.roughness = resolved.roughness
          material.metalness = resolved.metalness
          material.emissive.set(resolved.color)
          material.emissive.multiplyScalar(resolved.emissive)
          material.needsUpdate = true
        }
      }

      // Colours are baked per instance, so re-apply them for the new palette.
      setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })
    },
  }
}

/** Exposed for tests: the batch key a node lands in. */
export function batchKeyFor(
  tier: UniverseTier,
  profile: RuMaterialProfile,
): string {
  return `${tier}:${profile}`
}

/** Marker so a caller can find the visual record for an id without scanning. */
export function visualLookup(
  visualList: ReadonlyArray<UniverseNodeVisual>,
): ReadonlyMap<string, UniverseNodeVisual> {
  return new Map(visualList.map((visual) => [visual.id, visual]))
}

/** Kept exported so the visual-id map above can be reused by scene tests. */
export type { UniverseTier }
