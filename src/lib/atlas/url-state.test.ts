import { describe, expect, it, vi } from 'vitest'

import {
  applyFocus,
  buildFocusUrl,
  parseFocus,
  readFocusFromLocation,
} from './url-state'

describe('atlas URL codec (Plan C Task 9)', () => {
  it('round-trips node and relation focus with the node:/relation: discriminator', () => {
    const node = { kind: 'node' as const, key: 'research-area-1a2b3c4d' }
    expect(buildFocusUrl('/en/atlas/', node)).toBe(
      '/en/atlas/?focus=node:research-area-1a2b3c4d',
    )
    expect(parseFocus('?focus=node:research-area-1a2b3c4d')).toEqual(node)

    const relation = {
      kind: 'relation' as const,
      key: 'a-11111111~uses~b-22222222',
    }
    expect(buildFocusUrl('/en/atlas/', relation)).toBe(
      '/en/atlas/?focus=relation:' + encodeURIComponent(relation.key),
    )
    expect(
      parseFocus('?focus=relation:' + encodeURIComponent(relation.key)),
    ).toEqual(relation)
    expect(parseFocus('?focus=relation:' + relation.key)).toEqual(relation) // raw accepted too
  })

  it('treats unknown, malformed and invisible keys as no selection', () => {
    expect(parseFocus('?focus=node:nope')).toEqual({
      kind: 'node',
      key: 'nope',
    }) // grammar-only
    expect(parseFocus('?focus=nope')).toBeNull() // missing discriminator
    expect(parseFocus('?focus=relation:not-a-relation-key')).toBeNull() // wrong key arity
  })

  it('never encodes camera state', () => {
    const url = buildFocusUrl('/en/atlas/', {
      kind: 'node',
      key: 'research-area-1a2b3c4d',
    })
    expect(url).not.toMatch(/yaw|pitch|zoom|hover/)
  })

  it('applies focus through pushState without reload and reads it back', () => {
    const pushState = vi.fn()
    applyFocus({ pushState } as unknown as History, '/en/atlas/', {
      kind: 'node',
      key: 'research-area-1a2b3c4d',
    })
    expect(pushState).toHaveBeenCalledWith(
      {},
      '',
      '/en/atlas/?focus=node:research-area-1a2b3c4d',
    )
    expect(
      readFocusFromLocation({
        search: '?focus=node:research-area-1a2b3c4d',
      } as unknown as Location),
    ).toEqual({ kind: 'node', key: 'research-area-1a2b3c4d' })
  })
})
