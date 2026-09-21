import { describe, expect, it } from 'vitest'

import {
  nodeInspectorModel,
  relationInspectorModel,
  emptyInspectorModel,
} from './inspector'
import { makeSamplePayload as makePayload } from './sample-payload'

describe('atlas inspector projection (Plan C Task 11)', () => {
  it('omits the publications section when the node has none', () => {
    const model = nodeInspectorModel(makePayload(), 'area-00000001', 'en')
    expect(model.sections.map((s) => s.id)).not.toContain('publications')
  })

  it('lists both parents under parents', () => {
    const model = nodeInspectorModel(makePayload(), 'area-00000001', 'en')
    const parents = model.sections.find((s) => s.id === 'parents')
    expect(parents?.items.map((i) => i.key).sort()).toEqual([
      'area-00000002',
      'identity-00000001',
    ])
  })

  it('carries source, target, labels, explanation and direction for relations', () => {
    const model = relationInspectorModel(
      makePayload(),
      'identity-00000001~parent-of~area-00000001',
      'en',
    )
    const endpoints = model.sections.find((s) => s.id === 'endpoints')
    expect(endpoints?.items.map((i) => i.key)).toEqual([
      'identity-00000001',
      'area-00000001',
    ])
    const details = model.sections.find((s) => s.id === 'details')
    expect(details).toBeDefined()
  })

  it('omits the canonical section when the record is missing and still renders', () => {
    const payload = makePayload()
    const model = nodeInspectorModel(payload, 'project-00000001', 'en')
    expect(model.sections.map((s) => s.id)).not.toContain('canonical')
    expect(model.sections.length).toBeGreaterThan(0)
  })

  it('returns the empty prompt when nothing is selected', () => {
    expect(emptyInspectorModel('en')).toEqual({
      sections: [],
      prompt: expect.any(String),
    })
    expect(emptyInspectorModel('fa').prompt).toMatch(/./)
  })
})
