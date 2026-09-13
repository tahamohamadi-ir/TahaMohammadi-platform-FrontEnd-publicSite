/**
 * RU-02 / RU-2A — Node geometry.
 *
 * Nodes are drawn with two shared `InstancedMesh` tiers (one heavier tier for main
 * domains, one quieter tier for every level-3 output), so raising the node count
 * does not raise the draw-call budget.
 *
 * RU-2A — ONE visible identity for the centre: the level-0 anchor is NOT
 * instanced. The dedicated central nucleus (see `core-object.ts`) is its visible
 * representation, and this module keeps the anchor's metadata purely so the
 * selection ring, hit testing and edge endpoints still resolve to it. The split
 * comes from `partitionLayoutNodes`, a pure function, so a node cannot be drawn
 * twice and cannot be dropped: anchors + standard always equals the input.
 *
 * Selection/emphasis is expressed through three signals only — scale, instance
 * colour and the selection ring — which keeps the state model small enough to be
 * tested, and identical in both presentations.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import { partitionLayoutNodes, type UniverseNode3D } from './layout'
import {
  NODE_TIER_SEGMENTS,
  roleColor,
  tierForKind,
  type UniverseMaterials,
} from './materials'
import type { UniverseNode } from '../../research-universe/model'
import type { UniverseRenderTheme } from './theme'

export type UniverseTier = 'domain' | 'fine'

export interface UniverseNodeVisual {
  id: string
  kind: UniverseNode['kind']
  tier: UniverseTier
  /** `-1` for the anchor: metadata only, no instance is written for it. */
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
}

export interface UniverseNodeVisuals {
  group: THREE.Group
  visuals: UniverseNodeVisual[]
  /** The anchor's metadata; empty when the graph has no anchor node. */
  anchorVisuals: UniverseNodeVisual[]
  tierCounts: Record<UniverseTier, number>
  /** How many generic instances exist. The anchor must never be counted here. */
  instancedCount: number
  setEmphasis(state: EmphasisState): void
  applyTheme(theme: UniverseRenderTheme): void
}

const DIM_LERP = 0.74
/** The anchor's selection ring clears the nucleus silhouette. */
const ANCHOR_RING_SCALE = 1.6

export function createUniverseNodes(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  layoutNodes: ReadonlyArray<UniverseNode3D>,
  materials: UniverseMaterials,
): UniverseNodeVisuals {
  const group = new THREE.Group()
  group.name = 'universe-nodes'

  const { anchors, standard } = partitionLayoutNodes(layoutNodes)

  const tiers: Record<UniverseTier, UniverseNode3D[]> = { domain: [], fine: [] }
  for (const node of standard) tiers[tierForKind(node.kind)].push(node)

  const visuals: UniverseNodeVisual[] = []
  const anchorVisuals: UniverseNodeVisual[] = anchors.map((node) => ({
    id: node.id,
    kind: node.kind,
    tier: 'fine',
    instance: -1,
    baseRadius: node.radius,
    role: node.colorRole,
    position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
    isAnchor: true,
  }))

  const meshes: Partial<Record<UniverseTier, THREE.InstancedMesh>> = {}
  const dummy = new THREE.Object3D()
  let instancedCount = 0

  for (const tier of ['domain', 'fine'] as const) {
    const tierNodes = tiers[tier]
    const [width, height] = NODE_TIER_SEGMENTS[tier]
    const geometry = ledger.track(new THREE.SphereGeometry(1, width, height))
    const material = ledger.trackMaterial(materials.nodeMaterials[tier].clone())
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      Math.max(tierNodes.length, 1),
    )
    mesh.name = `universe-nodes-${tier}`
    mesh.count = tierNodes.length
    mesh.frustumCulled = false

    tierNodes.forEach((node, instance) => {
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
        tier,
        instance,
        baseRadius: node.radius,
        role: node.colorRole,
        position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
        isAnchor: false,
      })
    })

    instancedCount += tierNodes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    group.add(mesh)
    meshes[tier] = mesh
  }

  // Selection ring: one mesh, repositioned, so selection costs no extra draw call
  // per node. It serves both partitions, which is why the anchor needs no instance.
  const ringGeometry = ledger.track(new THREE.RingGeometry(1.4, 1.52, 48))
  const selectionRing = new THREE.Mesh(
    ringGeometry,
    materials.selectionMaterial,
  )
  selectionRing.name = 'universe-selection-ring'
  selectionRing.visible = false
  group.add(selectionRing)

  function writeInstance(
    visual: UniverseNodeVisual,
    scale: number,
    color: THREE.Color,
  ): void {
    if (visual.instance < 0) return // the anchor has no instance by design
    const mesh = meshes[visual.tier]
    if (!mesh) return
    dummy.position.copy(visual.position)
    dummy.scale.setScalar(visual.baseRadius * scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(visual.instance, dummy.matrix)
    mesh.setColorAt(visual.instance, color)
  }

  function setEmphasis(state: EmphasisState): void {
    const { selectedId, incidentIds, selectedEdge } = state
    const canvasColor = roleColor(theme.palette, 'canvas')

    selectionRing.visible = false

    for (const visual of [...visuals, ...anchorVisuals]) {
      const isSelected = selectedId != null && visual.id === selectedId
      const inEdge =
        selectedEdge != null &&
        (visual.id === selectedEdge.source || visual.id === selectedEdge.target)
      const isIncident =
        selectedId == null || incidentIds == null || incidentIds.has(visual.id)

      const scale = isSelected ? 1.3 : isIncident ? 1 : 0.9
      if (!visual.isAnchor) {
        const base = roleColor(theme.palette, visual.role || 'brand')
        const color = base.clone()
        if (selectedId != null && !isIncident) color.lerp(canvasColor, DIM_LERP)
        else if (inEdge) color.lerp(roleColor(theme.palette, 'signature'), 0.25)
        writeInstance(visual, scale, color)
      }

      if (isSelected) {
        selectionRing.position.copy(visual.position)
        selectionRing.scale.setScalar(
          visual.baseRadius * (visual.isAnchor ? ANCHOR_RING_SCALE : 1),
        )
        selectionRing.visible = true
      }
    }

    for (const tier of ['domain', 'fine'] as const) {
      const mesh = meshes[tier]
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })

  return {
    group,
    visuals,
    anchorVisuals,
    tierCounts: { domain: tiers.domain.length, fine: tiers.fine.length },
    instancedCount,
    setEmphasis,
    applyTheme(next: UniverseRenderTheme) {
      materials.selectionMaterial.color.copy(
        roleColor(next.palette, 'signature'),
      )
      materials.nodeMaterials.domain.color.copy(
        roleColor(next.palette, 'research'),
      )
      materials.nodeMaterials.domain.emissive.copy(
        roleColor(next.palette, 'research'),
      )
      materials.nodeMaterials.domain.emissiveIntensity = next.nodeEmissive
      materials.nodeMaterials.fine.color.copy(
        roleColor(next.palette, 'signature'),
      )
      materials.nodeMaterials.fine.emissive.copy(
        roleColor(next.palette, 'signature'),
      )
      materials.nodeMaterials.fine.emissiveIntensity = next.nodeEmissive * 0.6

      for (const tier of ['domain', 'fine'] as const) {
        const mesh = meshes[tier]
        if (!mesh) continue
        const material = mesh.material as THREE.MeshStandardMaterial
        material.color.copy(materials.nodeMaterials[tier].color)
        material.emissive.copy(materials.nodeMaterials[tier].emissive)
        material.emissiveIntensity =
          materials.nodeMaterials[tier].emissiveIntensity
        material.needsUpdate = true
      }

      const ringMaterial = selectionRing.material as THREE.MeshBasicMaterial
      ringMaterial.color.copy(materials.selectionMaterial.color)
      ringMaterial.needsUpdate = true

      // Colours are baked per instance, so re-apply them for the new palette.
      setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })
    },
  }
}
