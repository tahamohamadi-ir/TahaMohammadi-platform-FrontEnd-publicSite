/**
 * RU-4B / RU-4C — Node geometry and emphasis.
 *
 * Every node is an instance of the SAME shared unit sphere. A node's size is its
 * instance scale, its visual character comes from its PRESENTATION PROFILE, and
 * nothing else distinguishes two nodes except position, depth, label, graph
 * semantics and interaction state.
 *
 * Batching: one `InstancedMesh` per (tier, profile) that actually has nodes, so
 * each profile keeps its own roughness. A single mesh per tier would force every
 * node in that tier through one material and silently discard the per-profile
 * material character.
 *
 * RU-4C reworked the SELECTION feedback. The previous pass moved a full
 * `RingGeometry` onto the selected node, which is precisely the atom/planet
 * gesture the direction bans ("avoid a complete large gold ring around the node
 * if it creates atom/planet language"; "Selection must remain clear without
 * creating a planetary halo"). It is replaced by three quieter signals:
 *
 *   - a small scale response (+4%),
 *   - the material's own emphasis (the node keeps its colour while everything
 *     unrelated loses contrast),
 *   - a thin back-face RIM — a slightly larger sphere seen from inside, which
 *     reads as a hairline edge on the silhouette rather than a halo, because a
 *     back-face shell cannot produce a glow or a filled ring.
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
  profileEmissiveLift,
  roleColor,
  tierForKind,
  type UniverseMaterials,
  type UniverseTier,
} from './materials'
import {
  RU_DIM_LERP,
  RU_NODE_RESPONSE,
  resolveProfileRegistry,
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
  selectedId: string | null
  incidentIds: ReadonlySet<string> | null
  selectedEdge: { source: string; target: string } | null
  /** Pointer-hovered node, or null. Drives the +2% response only. */
  hoveredId?: string | null
}

export interface UniverseNodeVisuals {
  group: THREE.Group
  visuals: UniverseNodeVisual[]
  anchorVisuals: UniverseNodeVisual[]
  tierCounts: Record<UniverseTier, number>
  instancedCount: number
  /** Batches actually created, `tier:profile` → instance count. */
  batches: Readonly<Record<string, number>>
  geometry: THREE.BufferGeometry
  setEmphasis(state: EmphasisState): void
  applyTheme(theme: UniverseRenderTheme): void
}

/**
 * How much larger the back-face rim is than the sphere it marks. Small enough
 * that it stays a hairline edge on the silhouette.
 */
const RIM_SCALE = 1.05
/** Rim opacity while a node is selected. */
const RIM_OPACITY = 0.52

interface Batch {
  tier: UniverseTier
  profile: RuMaterialProfile
  mesh: THREE.InstancedMesh
}

export function createUniverseNodes(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  layoutNodes: ReadonlyArray<UniverseNode3D>,
  materials: UniverseMaterials,
  geometryByTier: Partial<Record<UniverseTier, THREE.BufferGeometry>> = {},
  scaleEmphasis = true,
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

  // Group into (tier, profile) batches BEFORE allocating anything, so no
  // InstancedMesh is created for a combination this graph does not contain.
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
    const tierGeometry = geometryByTier[entry.tier] ?? geometry
    const mesh = new THREE.InstancedMesh(
      tierGeometry,
      material,
      entry.nodes.length,
    )
    mesh.name = `universe-nodes-${key}`
    mesh.count = entry.nodes.length
    mesh.frustumCulled = false

    entry.nodes.forEach((node, instance) => {
      dummy.position.set(node.point.x, node.point.y, node.point.z)
      dummy.scale.setScalar(node.radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(instance, dummy.matrix)
      mesh.setColorAt(
        instance,
        roleColor(theme.palette, node.colorRole || 'brand'),
      )
      visuals.push({
        id: node.id,
        kind: node.kind,
        tier: entry.tier,
        profile: entry.profile,
        instance,
        baseRadius: node.radius,
        role: node.colorRole,
        position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
        isAnchor: false,
      })
    })

    instancedCount += entry.nodes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    group.add(mesh)
    batches.push({ tier: entry.tier, profile: entry.profile, mesh })
    batchesByName[key] = entry.nodes.length
  }

  // Selection rim: ONE mesh, repositioned, drawn as a back face so it can only
  // ever read as a thin edge on the silhouette — never a filled halo.
  const rim = new THREE.Mesh(geometry, materials.rimMaterial)
  rim.name = 'universe-selection-rim'
  rim.visible = false
  group.add(rim)

  const batchByKey = new Map<string, Batch>()
  for (const batch of batches) {
    batchByKey.set(`${batch.tier}:${batch.profile}`, batch)
  }

  /** Write one instance into its own batch. Never allocates. */
  function writeInstance(
    visual: UniverseNodeVisual,
    scale: number,
    color: THREE.Color,
  ): void {
    if (visual.instance < 0) return
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

    rim.visible = false

    for (const visual of visuals) {
      const isSelected = selectedId != null && visual.id === selectedId
      const inEdge =
        selectedEdge != null &&
        (visual.id === selectedEdge.source || visual.id === selectedEdge.target)
      const isIncident =
        selectedId == null || incidentIds == null || incidentIds.has(visual.id)
      const isHovered = hoveredId != null && visual.id === hoveredId

      const scale = scaleEmphasis
        ? isSelected
          ? RU_NODE_RESPONSE.selectScale
          : !isIncident
            ? RU_NODE_RESPONSE.dimmedScale
            : isHovered
              ? RU_NODE_RESPONSE.hoverScale
              : 1
        : 1

      const base = roleColor(theme.palette, visual.role || 'brand')
      const color = base.clone()
      if (selectedId != null && !isIncident)
        color.lerp(canvasColor, RU_DIM_LERP)
      else if (inEdge) color.lerp(roleColor(theme.palette, 'signature'), 0.22)
      writeInstance(visual, scale, color)

      if (isSelected) {
        rim.position.copy(visual.position)
        rim.scale.setScalar(visual.baseRadius * RIM_SCALE)
        rim.visible = true
      }
    }

    for (const anchor of anchorVisuals) {
      const anchorColor = new THREE.Color(
        materials.profiles[anchor.profile].color,
      )
      if (
        selectedId != null &&
        incidentIds != null &&
        !incidentIds.has(anchor.id)
      ) {
        anchorColor.lerp(canvasColor, RU_DIM_LERP)
      }
      materials.anchorMaterial.color.copy(anchorColor)
      materials.anchorMaterial.needsUpdate = true
      if (selectedId != null && anchor.id === selectedId) {
        rim.position.copy(anchor.position)
        rim.scale.setScalar(anchor.baseRadius * RIM_SCALE)
        rim.visible = true
      }
    }

    for (const batch of batches) {
      batch.mesh.instanceMatrix.needsUpdate = true
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true
    }
  }

  /**
   * Re-tint everything for a theme: the whole registry, the anchor material and
   * the rim, in place. No material or mesh is allocated by a theme switch, and
   * node positions are untouched — Light translates materials only.
   */
  function applyTheme(next: UniverseRenderTheme): void {
    const resolved = resolveProfileRegistry(
      next.palette,
      profileEmissiveLift(next.mode),
      next.mode,
    )
    for (const profile of Object.keys(resolved) as RuMaterialProfile[]) {
      Object.assign(materials.profiles[profile], resolved[profile])
    }

    for (const tier of NODE_TIERS) {
      for (const profile of Object.keys(resolved) as RuMaterialProfile[]) {
        const entry = resolved[profile]
        const material = materials.nodeMaterials[tier][profile]
        // Base stays white: each node's colour is per instance.
        material.color.set(0xffffff)
        material.roughness = entry.roughness
        material.metalness = entry.metalness
        material.emissive.set(entry.color)
        material.emissive.multiplyScalar(entry.emissive)
        material.needsUpdate = true
      }
    }

    const identity = resolved.identity
    materials.anchorMaterial.color.set(identity.color)
    materials.anchorMaterial.roughness = identity.roughness
    materials.anchorMaterial.metalness = identity.metalness
    materials.anchorMaterial.emissive.set(identity.color)
    materials.anchorMaterial.emissive.multiplyScalar(identity.emissive)
    materials.anchorMaterial.needsUpdate = true

    materials.rimMaterial.color.copy(roleColor(next.palette, 'signature'))
    materials.rimMaterial.opacity = RIM_OPACITY
    materials.rimMaterial.needsUpdate = true

    // Colours are baked per instance, so re-apply them for the new palette.
    setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })
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
    applyTheme,
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

export type { UniverseTier }
