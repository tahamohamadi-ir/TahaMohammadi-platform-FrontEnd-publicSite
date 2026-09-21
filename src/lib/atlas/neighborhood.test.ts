import { describe, expect, it } from 'vitest'

import { neighborhoodOf } from './neighborhood'
import { makeSamplePayload as makePayload } from './sample-payload'

describe('atlas neighbourhood (Plan C Task 10)', () => {
  it('is cycle-safe and returns both parents for a multi-parent node', () => {
    const payload = makePayload()
    const area1 = neighborhoodOf(payload, 'area-00000001')
    expect(area1.parents).toEqual(['area-00000002', 'identity-00000001'])
    expect(area1.children).toEqual([])
    expect(area1.outgoing).toEqual(
      expect.arrayContaining(['area-00000001~uses~project-00000001']),
    )
    expect(area1.incoming).toEqual(
      expect.arrayContaining([
        'identity-00000001~parent-of~area-00000001',
        'project-00000001~uses~area-00000001',
        'area-00000002~parent-of~area-00000001',
      ]),
    )
    const area2 = neighborhoodOf(payload, 'area-00000002')
    expect(area2.parents).toEqual(['identity-00000001'])
    // The cycle terminates: one-hop sets only, no traversal.
    expect(neighborhoodOf(payload, 'project-00000001').children).toEqual([])
  })

  it('groups neighbours by target type', () => {
    const { byType } = neighborhoodOf(makePayload(), 'identity-00000001')
    expect(byType['research-area']).toEqual(['area-00000001', 'area-00000002'])
  })
})
