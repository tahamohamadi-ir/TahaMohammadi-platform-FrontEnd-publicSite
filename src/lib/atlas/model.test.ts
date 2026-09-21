import { describe, expect, it } from 'vitest'

import {
  ATLAS_CONTRACT_VERSION,
  isNodeKey,
  isRelationKey,
  relationKeyParts,
} from './model'

describe('atlas model', () => {
  it('mirrors the backend contract version literally', () => {
    expect(ATLAS_CONTRACT_VERSION).toBe('atlas01-1.0.0')
  })

  it('distinguishes node keys from composed relation keys', () => {
    expect(isNodeKey('research-area-1a2b3c4d')).toBe(true)
    expect(isRelationKey('research-area-1a2b3c4d')).toBe(false)
    expect(
      isRelationKey('identity-2b3c4d5e~research-focus~research-area-1a2b3c4d'),
    ).toBe(true)
    expect(relationKeyParts('a-11111111~uses~b-22222222')).toEqual({
      source: 'a-11111111',
      relationType: 'uses',
      target: 'b-22222222',
    })
    expect(relationKeyParts('not-a-relation')).toBeNull()
    expect(isNodeKey('Bad Key')).toBe(false)
  })
})
