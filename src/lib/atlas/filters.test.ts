import { describe, expect, it } from 'vitest'

import { filterOptions, filterSet } from './filters'
import { makeSamplePayload as makePayload } from './sample-payload'
describe('atlas filters (Plan C Task 10)', () => {
  it('derives options from filterVisible types and never the anchor', () => {
    const options = filterOptions(makePayload())
    expect(options.map((o) => o.key).sort()).toEqual([
      'project',
      'research-area',
    ])
    expect(options.find((o) => o.key === 'research-area')).toMatchObject({
      count: 2,
    })
  })

  it('computes dim-first membership without touching the payload', () => {
    const payload = makePayload()
    const before = JSON.stringify(payload)
    const members = filterSet(payload, 'research-area')
    expect([...members].sort()).toEqual(['area-00000001', 'area-00000002'])
    expect(JSON.stringify(payload)).toBe(before)
  })
})
