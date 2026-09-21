import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { createSelectionModel } from './selection'

const payload = {
  contractVersion: 'atlas01-1.0.0',
  locale: 'en',
  version: {
    id: 1,
    revision: '1-x',
    publishedAt: '2026-09-21T00:00:00.000000+00:00',
    nodeCount: 2,
    relationCount: 1,
    layoutRevision: 1,
  },
  nodeTypes: [],
  relationTypes: [],
  groups: [],
  nodes: [
    {
      key: 'research-area-1a2b3c4d',
      type: 'research-area',
      label: 'PARS-SQL',
      importance: 80,
      mobileOverviewPriority: 'featured',
      aliases: [],
      position: { x: 0, y: 0, z: 0 },
    },
    {
      key: 'identity-2b3c4d5e',
      type: 'identity',
      label: 'Identity',
      importance: 90,
      mobileOverviewPriority: 'featured',
      aliases: [],
      position: { x: 1, y: 1, z: 1 },
    },
  ],
  relations: [
    {
      key: 'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
      type: 'research-focus',
      source: 'identity-2b3c4d5e',
      target: 'research-area-1a2b3c4d',
      directed: true,
      weight: 1,
      hierarchy: false,
    },
  ],
} as unknown as AtlasPayload

describe('atlas selection model (Plan C Task 9)', () => {
  it('treats unknown keys as no selection', () => {
    expect(createSelectionModel(payload).resolve('node:nope')).toEqual({
      selected: null,
      reason: 'unknown',
    })
  })

  it('selects, clears and notifies through the shared model', () => {
    const model = createSelectionModel(payload)
    const seen: string[] = []
    model.subscribe((state) => seen.push(state))
    expect(model.state).toBe('overview')
    model.selectNode('research-area-1a2b3c4d')
    expect(model.state).toBe('node')
    model.selectRelation(
      'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
    )
    expect(model.state).toBe('relation')
    model.clear()
    expect(model.state).toBe('overview')
    expect(seen).toEqual(['node', 'relation', 'overview'])
    expect(model.exists('research-area-1a2b3c4d')).toBe(true)
    expect(model.exists('missing-00000000')).toBe(false)
  })
})
