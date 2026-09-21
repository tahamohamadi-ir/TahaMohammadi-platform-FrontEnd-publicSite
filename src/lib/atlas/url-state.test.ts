import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import {
  applyFocus,
  buildFocusUrl,
  parseFocus,
  readFocusFromLocation,
  serializeFocus,
} from './url-state'

const codecSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'url-state.ts'),
  'utf8',
)

describe('url-state focus codec (Plan C Task 9)', () => {
  it('round-trips node and relation focus with canonical %7E encoding', () => {
    const node = { kind: 'node' as const, key: 'research-area-1a2b3c4d' }
    expect(buildFocusUrl('/en/atlas/', node)).toBe(
      '/en/atlas/?focus=node:research-area-1a2b3c4d',
    )
    expect(parseFocus('?focus=node:research-area-1a2b3c4d')).toEqual(node)
    expect(serializeFocus(node)).toBe('node:research-area-1a2b3c4d')

    const relation = {
      kind: 'relation' as const,
      key: 'a-11111111~uses~b-22222222',
    }
    const canonical = buildFocusUrl('/en/atlas/', relation)
    expect(canonical).toBe(
      '/en/atlas/?focus=relation:a-11111111%7Euses%7Eb-22222222',
    )
    expect(canonical).not.toContain('%257E')
    expect(serializeFocus(relation)).toBe(
      'relation:a-11111111%7Euses%7Eb-22222222',
    )
    expect(
      parseFocus('?focus=relation:a-11111111%7Euses%7Eb-22222222'),
    ).toEqual(relation)
    expect(parseFocus('?focus=relation:a-11111111~uses~b-22222222')).toEqual(
      relation,
    )
  })

  it('never double-encodes relation separators (%7E not %257E)', () => {
    const serialized = serializeFocus({
      kind: 'relation',
      key: 'a-11111111~uses~b-22222222',
    })
    expect(serialized).toBe('relation:a-11111111%7Euses%7Eb-22222222')
    expect(serialized).not.toMatch(/%257E/i)
    expect(encodeURIComponent('a~b')).toBe('a~b')
  })

  it('returns null for absent, empty, duplicate, malformed, and wrong-arity focus', () => {
    expect(parseFocus('')).toBeNull()
    expect(parseFocus('?')).toBeNull()
    expect(parseFocus('?other=1')).toBeNull()
    expect(parseFocus('?focus=')).toBeNull()
    expect(parseFocus('?focus=nope')).toBeNull()
    expect(parseFocus('?focus=widget:abc')).toBeNull()
    expect(parseFocus('?focus=relation:not-a-relation-key')).toBeNull()
    expect(parseFocus('?focus=relation:a~b')).toBeNull()
    expect(parseFocus('?focus=relation:a~~b')).toBeNull()
    expect(parseFocus('?focus=relation:%E0%A4%A')).toBeNull()
    expect(parseFocus('?focus=node:a&focus=node:b')).toBeNull()
    expect(parseFocus('?focus=node:research-area-1a2b3c4d')).toEqual({
      kind: 'node',
      key: 'research-area-1a2b3c4d',
    })
  })

  it('parses unknown-but-syntactically-valid keys without payload resolve', () => {
    expect(parseFocus('?focus=node:nope-zzzzzzzz')).toEqual({
      kind: 'node',
      key: 'nope-zzzzzzzz',
    })
  })

  it('preserves unrelated query params and leaves hash opaque', () => {
    const href =
      'https://example.test/en/atlas/?utm=1&focus=node:old&x=2#token=cap.secret'
    expect(
      buildFocusUrl(href, { kind: 'node', key: 'research-area-1a2b3c4d' }),
    ).toBe(
      'https://example.test/en/atlas/?utm=1&x=2&focus=node:research-area-1a2b3c4d#token=cap.secret',
    )
    expect(buildFocusUrl(href, null)).toBe(
      'https://example.test/en/atlas/?utm=1&x=2#token=cap.secret',
    )
  })

  it('applyFocus only pushStates and never reloads', () => {
    const pushState = vi.fn()
    const replaceState = vi.fn()
    applyFocus(
      { pushState, replaceState } as unknown as History,
      '/en/atlas/',
      { kind: 'node', key: 'research-area-1a2b3c4d' },
    )
    expect(pushState).toHaveBeenCalledWith(
      null,
      '',
      '/en/atlas/?focus=node:research-area-1a2b3c4d',
    )
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('never encodes camera or filter state', () => {
    const url = buildFocusUrl('/en/atlas/', {
      kind: 'node',
      key: 'research-area-1a2b3c4d',
    })
    expect(url).not.toMatch(/yaw|pitch|zoom|hover|filter/i)
  })

  it('readFocusFromLocation uses search only (never hash)', () => {
    expect(
      readFocusFromLocation({
        search: '?focus=node:research-area-1a2b3c4d',
        hash: '#token=cap.abc',
      } as Location),
    ).toEqual({ kind: 'node', key: 'research-area-1a2b3c4d' })
  })

  it('has zero network / preview / refresh coupling in the codec module', () => {
    for (const forbidden of [
      'fetch(',
      'fetchAtlasSnapshot',
      'fetchPreviewSnapshot',
      'consumePreviewFragment',
      'refreshAtlas',
      'Authorization',
      'localStorage',
    ]) {
      expect(codecSource).not.toContain(forbidden)
    }
  })
})
