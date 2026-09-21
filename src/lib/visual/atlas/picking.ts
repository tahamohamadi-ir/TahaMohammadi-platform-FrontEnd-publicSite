/** Screen-space picking (Plan C Task 17). Pure projection + shared picker.
 *
 * The projected node/edge sets come from the real `hit-testing` projection
 * (`projectNodes`/`projectEdges`) over the scene's adapted layout; the
 * verdict comes from the shared `pickAt` — nodes win over edges, ties go to
 * the nearer camera depth. The ONLY place a broad phase may be added
 * (Task 19, conditional on the Task 18 benchmark).
 */
import type { AtlasPayload } from '../../atlas/model'
import { resolveLayout } from '../../atlas/layout'
import {
  bowForEdge,
  buildEdgeCurve,
  type UniverseEdge3D,
  type UniverseNode3D,
} from '../research-universe/layout'
import {
  pickAt,
  projectEdges,
  projectNodes,
  type ProjectedEdge3D,
  type ProjectedNode3D,
} from '../research-universe/hit-testing'

export interface AtlasPickProjection {
  matrix: number[]
  width: number
  height: number
}

export interface AtlasPickScene {
  nodes: ProjectedNode3D[]
  edges: ProjectedEdge3D[]
}

export interface AtlasPickResult {
  kind: 'node' | 'edge' | 'none'
  id: string | null
}

/** Adapt stored coordinates to the shared projection inputs. */
export function projectAtlasForPick(
  payload: AtlasPayload,
  projection: AtlasPickProjection,
): AtlasPickScene {
  const layout = resolveLayout(payload)
  const nodes: UniverseNode3D[] = layout.nodes.map((node, index) => ({
    id: node.key,
    kind: 'project' as const,
    level: 1 as const,
    weight: node.radius,
    colorRole: '',
    role: 'standard' as const,
    profile: 'stone' as const,
    radius: node.radius,
    visualScale: 1,
    point: { x: node.x, y: node.y, z: node.z },
    azimuth: index,
    positionSource: 'derived' as const,
  }))
  const pointByKey = new Map(nodes.map((n) => [n.id, n.point]))
  const radiusByKey = new Map(nodes.map((n) => [n.id, n.radius]))
  const edges: UniverseEdge3D[] = []
  for (const relation of payload.relations) {
    const source = pointByKey.get(relation.source)
    const target = pointByKey.get(relation.target)
    if (!source || !target) continue
    const curve = buildEdgeCurve(
      source,
      radiusByKey.get(relation.source) ?? 1,
      target,
      radiusByKey.get(relation.target) ?? 1,
      bowForEdge(relation.key),
    )
    edges.push({
      id: relation.key,
      source: relation.source,
      target: relation.target,
      relationType: relation.type,
      directed: relation.directed,
      start: curve.start,
      control: curve.c1,
      end: curve.end,
      samples: curve.samples,
      c1: curve.c1,
      c2: curve.c2,
      bow: 0,
    })
  }
  return {
    nodes: projectNodes(
      nodes,
      projection.matrix,
      projection.width,
      projection.height,
    ),
    edges: projectEdges(
      edges,
      projection.matrix,
      projection.width,
      projection.height,
    ),
  }
}

/** Nearest node, else nearest edge, else none — the shared verdict. */
export function pickAtlasAt(
  point: { x: number; y: number },
  scene: AtlasPickScene,
  slop: { nodeSlopPx?: number; edgeSlopPx?: number } = {},
): AtlasPickResult {
  return pickAt(point, scene.nodes, scene.edges, slop)
}
