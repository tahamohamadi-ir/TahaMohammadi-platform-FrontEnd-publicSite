/**
 * RU-02 — Node geometry.
 *
 * Nodes are drawn with two shared `InstancedMesh` tiers (one heavier tier for
 * main domains, one quieter tier for every level-3 output), so raising the node
 * count does not raise the draw-call budget. Visual weight follows meaning:
 * domains are larger and more emissive than outputs.
 *
 * Selection/emphasis is expressed through three signals only — scale, instance
 * colour and the selection ring — which keeps the state model small enough to be
 * tested, and keeps it identical in both presentations.
 */

import * as THREE from 'three'
import { UniverseLedger } from './dispose'
import type { UniverseNode3D } from './layout'
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
  instance: number
  baseRadius: number
  role: string
  position: THREE.Vector3
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
  tierCounts: Record<UniverseTier, number>
  setEmphasis(state: EmphasisState): void
  applyTheme(theme: UniverseRenderTheme): void
}

const DIM_LERP = 0.74

export function createUniverseNodes(
  ledger: UniverseLedger,
  theme: UniverseRenderTheme,
  layoutNodes: ReadonlyArray<UniverseNode3D>,
  materials: UniverseMaterials,
): UniverseNodeVisuals {
  const group = new THREE.Group()
  group.name = 'universe-nodes'

  const tiers: Record<UniverseTier, UniverseNode3D[]> = { domain: [], fine: [] }
  for (const node of layoutNodes) tiers[tierForKind(node.kind)].push(node)

  const visuals: UniverseNodeVisual[] = []
  const meshes: Partial<Record<UniverseTier, THREE.InstancedMesh>> = {}
  const dummy = new THREE.Object3D()

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
      const role = roleColor(theme.palette, node.colorRole || 'brand')
      mesh.setColorAt(instance, role)
      visuals.push({
        id: node.id,
        kind: node.kind,
        tier,
        instance,
        baseRadius: node.radius,
        role: node.colorRole,
        position: new THREE.Vector3(node.point.x, node.point.y, node.point.z),
      })
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    group.add(mesh)
    meshes[tier] = mesh
  }

  // Selection ring: one mesh, repositioned, so selection costs no extra draw call
  // per node.
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

    for (const visual of visuals) {
      const isSelected = selectedId != null && visual.id === selectedId
      const inEdge =
        selectedEdge != null &&
        (visual.id === selectedEdge.source || visual.id === selectedEdge.target)
      const isIncident =
        selectedId == null || incidentIds == null || incidentIds.has(visual.id)

      const scale = isSelected ? 1.3 : isIncident ? 1 : 0.9
      const base = roleColor(theme.palette, visual.role || 'brand')
      const color = base.clone()
      if (selectedId != null && !isIncident) color.lerp(canvasColor, DIM_LERP)
      else if (inEdge) color.lerp(roleColor(theme.palette, 'signature'), 0.25)
      writeInstance(visual, scale, color)

      if (isSelected) {
        selectionRing.position.copy(visual.position)
        selectionRing.scale.setScalar(visual.baseRadius)
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

  // Initial state: everything at full colour.
  setEmphasis({ selectedId: null, incidentIds: null, selectedEdge: null })

  return {
    group,
    visuals,
    tierCounts: { domain: tiers.domain.length, fine: tiers.fine.length },
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
      setEmphasis({
        selectedId: null,
        incidentIds: null,
        selectedEdge: null,
      })
    },
  }
}
