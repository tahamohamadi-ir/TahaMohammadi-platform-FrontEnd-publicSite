/**
 * RU-01 — About preset: the full universe.
 *
 * About is the fully interactive presentation, so it preserves the complete
 * published graph: every node, every edge, nothing filtered and nothing added.
 * If a hierarchy level has no published records, the preset says so instead of
 * filling it with placeholder content.
 */

import {
  isReadyUniverse,
  type ReadyUniverse,
  type UniverseEdge,
  type UniverseModel,
  type UniverseNode,
} from './model'

export interface AboutUniverse {
  status: ReadyUniverse['status']
  locale: ReadyUniverse['locale']
  anchor: ReadyUniverse['anchor']
  nodes: UniverseNode[]
  edges: UniverseEdge[]
  /** Levels with zero published records; drives honest UI copy, not fake data. */
  absentLevels: Array<1 | 2 | 3>
  isComplete: true
  notes: string[]
}

/** The complete universe for About. Never filters; never invents. */
export function selectAboutUniverse(
  model: UniverseModel,
): AboutUniverse | null {
  if (!isReadyUniverse(model)) return null

  const counts = model.levelCounts
  const absentLevels: Array<1 | 2 | 3> = []
  if (counts.level1 === 0) absentLevels.push(1)
  if (counts.level2 === 0) absentLevels.push(2)
  if (counts.level3 === 0) absentLevels.push(3)

  const notes: string[] = []
  for (const level of absentLevels) {
    notes.push(`level-${level}-absent-in-published-graph`)
  }

  return {
    status: 'ready',
    locale: model.locale,
    anchor: model.anchor,
    nodes: [...model.nodes],
    edges: [...model.edges],
    absentLevels,
    isComplete: true,
    notes,
  }
}
