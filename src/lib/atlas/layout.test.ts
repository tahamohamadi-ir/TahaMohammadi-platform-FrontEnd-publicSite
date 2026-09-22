import { describe, expect, it } from 'vitest'

import {
  assertComplete,
  labelTierFor,
  radiusFor,
  resolveLayout,
  tierFor,
} from './layout'
import { makeSamplePayload as makePayload } from './sample-payload'

describe('atlas layout consumption (Plan C Task 12)', () => {
  it('consumes stored coordinates and never re-computes them', () => {
    const payloadFixture = makePayload()
    const layout = resolveLayout(payloadFixture)
    expect(layout.nodes.map((n) => [n.key, n.x, n.y, n.z])).toEqual(
      payloadFixture.nodes.map((n) => [
        n.key,
        n.position.x,
        n.position.y,
        n.position.z,
      ]),
    )
  })

  it('derives radius and tiers from importance deterministically', () => {
    expect(tierFor({ importance: 80 })).toBe('primary')
    expect(tierFor({ importance: 79 })).toBe('fine')
    expect(radiusFor({ importance: 100 })).toBeGreaterThan(
      radiusFor({ importance: 40 }),
    )
  })

  it('flags a missing coordinate instead of inventing one', () => {
    const payloadFixture = makePayload()
    const missing = {
      ...payloadFixture,
      nodes: payloadFixture.nodes.map((n) =>
        n.key === 'area-00000001' ? { ...n, position: undefined } : n,
      ),
    }
    expect(() => assertComplete(resolveLayout(missing as never))).toThrow(
      /missing coordinate/i,
    )
  })

  it('is stable across calls and independent of node order', () => {
    const payloadFixture = makePayload()
    expect(resolveLayout(payloadFixture)).toEqual(
      resolveLayout({
        ...payloadFixture,
        nodes: [...payloadFixture.nodes].reverse(),
      }),
    )
  })

  it('tiers labels with the top-10 always cap', () => {
    expect(labelTierFor({ key: 'a', importance: 90 }, ['a'])).toBe('always')
    expect(labelTierFor({ key: 'b', importance: 50 }, [])).toBe('on-demand')
    expect(labelTierFor({ key: 'c', importance: 10 }, [])).toBe('selected')
  })
})
