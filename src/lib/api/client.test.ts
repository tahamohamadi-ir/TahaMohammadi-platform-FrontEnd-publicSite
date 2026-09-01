import { describe, expect, it } from 'vitest'

import {
  assertPublishedOnly,
  filterPublishedOnly,
  PublicApiError,
} from './client'

describe('published-only gate', () => {
  it('accepts records with published_at', () => {
    const record = { id: 1, published_at: '2026-01-01T00:00:00Z' }
    expect(assertPublishedOnly(record)).toBe(record)
  })

  it('rejects draft records', () => {
    expect(() => assertPublishedOnly({ id: 1, published_at: null })).toThrow(
      PublicApiError,
    )
  })

  it('filters unpublished list items', () => {
    const records = [
      { id: 1, published_at: '2026-01-01T00:00:00Z' },
      { id: 2, published_at: null },
    ]
    expect(filterPublishedOnly(records)).toEqual([records[0]])
  })
})
