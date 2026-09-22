import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { project2d } from './projection-2d'
import {
  neighbourhoodKeys,
  overviewKeys,
  projectNodesForKeys,
} from './projection-neighbourhood'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

const VIEWPORT = { width: 390, height: 520 }

describe('atlas neighbourhood view (Plan C Task 20)', () => {
  it('contains exactly the selected node, its parents, children and direct relations', () => {
    const payload = readPayload('benchmark.json')
    const focus = 'identity-00000001'
    const keys = neighbourhoodKeys(payload, focus)
    expect(keys).not.toBeNull()
    const set = new Set((keys ?? []).map((n) => n.key))
    // The focus itself is always present.
    expect(set.has(focus)).toBe(true)
    // Every direct neighbour (parents, children, related) is present…
    const incident = payload.relations.filter(
      (r) => r.source === focus || r.target === focus,
    )
    expect(incident.length).toBeGreaterThan(0)
    for (const relation of incident) {
      expect(set.has(relation.source)).toBe(true)
      expect(set.has(relation.target)).toBe(true)
    }
    // …and nothing else: no second-hop node may sneak in.
    const oneHop = new Set<string>([focus])
    for (const relation of incident) {
      oneHop.add(relation.source)
      oneHop.add(relation.target)
    }
    expect(set).toEqual(oneHop)
    // Relations are drawn exactly when both endpoints are in the set.
    const projected = projectNodesForKeys(payload, keys ?? [], focus, VIEWPORT)
    const drawn = new Set(projected.edges.map((e) => e.key))
    for (const relation of payload.relations) {
      const inView = set.has(relation.source) && set.has(relation.target)
      expect(drawn.has(relation.key)).toBe(inView)
    }
  })

  it('restores the overview set byte-identically (Back to overview)', () => {
    const payload = readPayload('benchmark.json')
    const before = project2d(payload, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: null,
    })
    const keys = neighbourhoodKeys(payload, 'identity-00000001')
    const neighbourhood = projectNodesForKeys(
      payload,
      keys ?? [],
      'identity-00000001',
      VIEWPORT,
    )
    // The neighbourhood view actually differs (fewer nodes than the 72-node
    // graph can show at once) — otherwise the round-trip proves nothing.
    expect(neighbourhood.nodes.length).toBeLessThan(before.nodes.length)
    const after = project2d(payload, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: null,
    })
    expect(after).toEqual(before)
    expect(overviewKeys(payload)).toEqual(before.nodes.map((n) => n.key))
  })

  it('resolves an unknown focus to the overview without inventing content', () => {
    const payload = readPayload('benchmark.json')
    expect(neighbourhoodKeys(payload, 'no-such-node')).toBeNull()
    const overview = project2d(payload, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: null,
    })
    const fallback = project2d(payload, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: 'no-such-node',
    })
    // Unknown keys never invent content: same node set, focus not appended.
    expect(fallback.nodes.map((n) => n.key)).toEqual(
      overview.nodes.map((n) => n.key),
    )
  })

  it('keeps every neighbourhood node inside the viewBox', () => {
    const payload = readPayload('benchmark.json')
    const keys = neighbourhoodKeys(payload, 'identity-00000001')
    const projected = projectNodesForKeys(
      payload,
      keys ?? [],
      'identity-00000001',
      VIEWPORT,
    )
    for (const node of projected.nodes) {
      expect(node.cx - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cy - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cx + node.r).toBeLessThanOrEqual(VIEWPORT.width)
      expect(node.cy + node.r).toBeLessThanOrEqual(VIEWPORT.height)
    }
  })

  it('imports no 3D scene module in the mobile path', () => {
    const sources = [
      'projection-2d.ts',
      'projection-neighbourhood.ts',
      'projection-svg.ts',
      'neighborhood.ts',
      'presentation.ts',
    ].map((name) => readFileSync(join(here, name), 'utf8'))
    for (const [index, source] of sources.entries()) {
      expect(
        source,
        `mobile-path source imports a 3D scene module`,
      ).not.toMatch(
        /visual\/atlas\/(scene|controls|picking)|from 'three'|from "three"/,
      )
      void index
    }
  })
})
