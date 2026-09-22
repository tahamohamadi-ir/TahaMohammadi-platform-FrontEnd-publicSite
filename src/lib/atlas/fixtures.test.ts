/** Task 4 — Atlas fixture integrity (source-derived, never hand-edited).
 *
 * Fixtures live at `tests/fixtures/atlas/{en,fa,benchmark}.json`, generated
 * from backend@bdb546f by `scripts/atlas-generate-fixtures.py` (exporter only:
 * `atlas_scale_fixture` / `atlas_active_version` + `build_locale_projection`).
 * This test pins the contract facts the plan requires:
 * - files exist with the accepted contract version and real topology scale
 * - EN/FA share topology identity (keys + coordinates), text may differ
 * - every fixture passes the Task-2 runtime validator
 * - scratch-copy mutations (bad key / dangling endpoint / bad overview
 *   priority) are rejected — committed files are never touched.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ATLAS_CONTRACT_VERSION, type AtlasPayload } from './model'
import { validateAtlasPayload } from './validate'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')

function readFixture(name: string): AtlasPayload {
  const raw = readFileSync(join(fixtureDir, name), 'utf8')
  return JSON.parse(raw) as AtlasPayload
}

function keySets(payload: AtlasPayload) {
  return {
    nodes: [...payload.nodes.map((n) => n.key)].sort(),
    relations: [...payload.relations.map((r) => r.key)].sort(),
    groups: [...payload.groups.map((g) => g.key)].sort(),
  }
}

describe('atlas fixtures (Task 4)', () => {
  it('ships en/fa/benchmark fixtures at the accepted contract version', () => {
    for (const name of ['en.json', 'fa.json', 'benchmark.json']) {
      const payload = readFixture(name)
      expect(payload.contractVersion).toBe(ATLAS_CONTRACT_VERSION)
      expect(payload.nodes.length).toBeGreaterThanOrEqual(4)
      expect(payload.relations.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps EN/FA topology identity while locales stay exact', () => {
    const en = readFixture('en.json')
    const fa = readFixture('fa.json')
    expect(en.locale).toBe('en')
    expect(fa.locale).toBe('fa')
    expect(keySets(fa)).toEqual(keySets(en))
    const positionOf = (payload: AtlasPayload) =>
      new Map(payload.nodes.map((n) => [n.key, n.position]))
    expect(positionOf(fa)).toEqual(positionOf(en))
  })

  it('passes every fixture through the Task-2 runtime validator', () => {
    for (const name of ['en.json', 'fa.json', 'benchmark.json']) {
      const result = validateAtlasPayload(readFixture(name))
      expect(result).toEqual({ ok: true, payload: expect.anything() })
      if (result.ok) expect(result.payload).toBeDefined()
    }
  })

  it('rejects scratch-copy mutations without touching committed files', () => {
    const clone = (): AtlasPayload =>
      JSON.parse(JSON.stringify(readFixture('en.json'))) as AtlasPayload
    // Invalid public key on a node.
    const badKey = clone()
    badKey.nodes[0] = { ...badKey.nodes[0], key: 'Bad Key' }
    expect(validateAtlasPayload(badKey).ok).toBe(false)
    // Dangling relation endpoint.
    const dangling = clone()
    dangling.relations[0] = {
      ...dangling.relations[0],
      target: 'does-not-exist',
    }
    expect(validateAtlasPayload(dangling).ok).toBe(false)
    // Invalid compact-overview priority is outside the wire grammar.
    const badPriority = clone()
    badPriority.nodes[0] = {
      ...badPriority.nodes[0],
      mobileOverviewPriority: 'everywhere' as never,
    }
    expect(validateAtlasPayload(badPriority)).toEqual({
      ok: false,
      reason: 'unknown-overview-priority',
    })
  })
})
