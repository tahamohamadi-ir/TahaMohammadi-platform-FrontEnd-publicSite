/** URL focus codec (Plan C Task 9).
 *
 * Operates only on `location.search` (`?focus=`). Never reads, strips, or
 * migrates `location.hash` / preview `#token`. No network. No Task-7 refresh.
 *
 * Canonical relation form forces `%7E` for every `~` (encodeURIComponent alone
 * leaves `~` raw). Parse accepts both raw `~` and `%7E`; never double-encodes.
 */

import { isNodeKey, isRelationKey } from './model'

export type AtlasFocus = {
  kind: 'node' | 'relation'
  key: string
}

/** Force every `~` to `%7E` without touching already-encoded sequences. */
function encodeFocusKey(key: string): string {
  return encodeURIComponent(key).replace(/~/g, '%7E')
}

function decodeFocusKey(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

function countFocusParams(query: string): number {
  let count = 0
  for (const part of query.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const name = eq >= 0 ? part.slice(0, eq) : part
    if (decodeURIComponent(name.replace(/\+/g, ' ')) === 'focus') count += 1
  }
  return count
}

/**
 * Total, non-throwing focus parser.
 * Absent / empty / unknown discriminator / broken % / wrong relation arity /
 * duplicate `focus` → `null`. Syntactically valid unknown keys still parse.
 */
export function parseFocus(search: string): AtlasFocus | null {
  try {
    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) return null
    if (countFocusParams(query) !== 1) return null

    const value = new URLSearchParams(query).get('focus')
    if (value == null || value === '') return null

    const sep = value.indexOf(':')
    if (sep < 0) return null
    const kind = value.slice(0, sep)
    const rawKey = value.slice(sep + 1)
    if (!rawKey) return null

    if (kind === 'node') {
      // Node keys are never percent-encoded in the canonical form; reject
      // broken escapes if someone still encoded them.
      const key = rawKey.includes('%') ? decodeFocusKey(rawKey) : rawKey
      if (!key || !isNodeKey(key)) return null
      return { kind: 'node', key }
    }

    if (kind === 'relation') {
      const key = decodeFocusKey(rawKey)
      if (!key || !isRelationKey(key)) return null
      return { kind: 'relation', key }
    }

    return null
  } catch {
    return null
  }
}

/** Canonical serializer — relation separators always `%7E`, never `%257E`. */
export function serializeFocus(focus: AtlasFocus): string {
  if (focus.kind === 'node') return `node:${focus.key}`
  return `relation:${encodeFocusKey(focus.key)}`
}

/**
 * Rewrite only the `focus` query param. Preserves other params and leaves any
 * hash byte-equivalent (opaque — never interprets `#token`).
 */
export function buildFocusUrl(href: string, focus: AtlasFocus | null): string {
  const hashIndex = href.indexOf('#')
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href

  const queryIndex = withoutHash.indexOf('?')
  const pathname =
    queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const rawQuery = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : ''

  const kept: string[] = []
  if (rawQuery) {
    for (const part of rawQuery.split('&')) {
      if (!part) continue
      const eq = part.indexOf('=')
      const name = eq >= 0 ? part.slice(0, eq) : part
      let decodedName: string
      try {
        decodedName = decodeURIComponent(name.replace(/\+/g, ' '))
      } catch {
        decodedName = name
      }
      if (decodedName === 'focus') continue
      kept.push(part)
    }
  }
  if (focus) kept.push(`focus=${serializeFocus(focus)}`)
  return `${pathname}${kept.length ? `?${kept.join('&')}` : ''}${hash}`
}

/** Single `pushState` — never reload, never replaceState, no network. */
export function applyFocus(
  history: Pick<History, 'pushState'>,
  href: string,
  focus: AtlasFocus | null,
): void {
  history.pushState(null, '', buildFocusUrl(href, focus))
}

/** Search only — hash is never consulted. */
export function readFocusFromLocation(
  location: Pick<Location, 'search'>,
): AtlasFocus | null {
  return parseFocus(location.search)
}
