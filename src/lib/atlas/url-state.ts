/** URL focus codec (Plan C Task 9): `?focus=node:<key>` / `?focus=relation:<key>`.
 *
 * Grammar only — resolution against the payload is the selection model's job.
 * Camera state is never URL state. History moves through `pushState` (never a
 * reload); `popstate` re-reads the URL and re-applies (wired in Task 15).
 */
import { relationKeyParts, type AtlasPayload } from './model'
import type { AtlasFocus } from './selection'

function decodeKey(raw: string): string | null {
  // Accept both percent-encoded and raw composed keys; a malformed escape is
  // a malformed focus, not a guess.
  try {
    return raw.includes('%') ? decodeURIComponent(raw) : raw
  } catch {
    return null
  }
}

export function parseFocus(search: string): AtlasFocus | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(query).get('focus')
  if (!value) return null
  const sep = value.indexOf(':')
  if (sep < 0) return null
  const kind = value.slice(0, sep)
  const rawKey = value.slice(sep + 1)
  if (!rawKey) return null
  if (kind === 'node') return { kind, key: rawKey }
  if (kind === 'relation') {
    const key = decodeKey(rawKey)
    if (!key || !relationKeyParts(key)) return null
    return { kind, key }
  }
  return null
}

export function serializeFocus(focus: AtlasFocus): string {
  return focus.kind === 'node'
    ? `node:${focus.key}`
    : `relation:${encodeURIComponent(focus.key)}`
}

function withFocus(path: string, focus: AtlasFocus | null): string {
  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const queryIndex = base.indexOf('?')
  const pathname = queryIndex >= 0 ? base.slice(0, queryIndex) : base
  const params = new URLSearchParams(
    queryIndex >= 0 ? base.slice(queryIndex + 1) : '',
  )
  params.delete('focus')
  const parts: string[] = []
  const rest = params.toString()
  if (rest) parts.push(rest)
  // The focus value is encoded exactly once here: `URLSearchParams` would
  // leave `~` raw, but the grammar requires the composed relation key
  // percent-encoded in the URL.
  if (focus) parts.push(`focus=${serializeFocus(focus)}`)
  return `${pathname}${parts.length ? `?${parts.join('&')}` : ''}${hash}`
}

export function buildFocusUrl(href: string, focus: AtlasFocus | null): string {
  return withFocus(href, focus)
}

export function applyFocus(
  history: Pick<History, 'pushState'>,
  href: string,
  focus: AtlasFocus | null,
): void {
  history.pushState({}, '', withFocus(href, focus))
}

export function readFocusFromLocation(
  location: Pick<Location, 'search'>,
): AtlasFocus | null {
  return parseFocus(location.search)
}

/** Resolve a parsed focus against the payload: surviving keys stay selected. */
export function resolveFocus(
  payload: AtlasPayload,
  focus: AtlasFocus | null,
): AtlasFocus | null {
  if (!focus) return null
  if (focus.kind === 'node') {
    return payload.nodes.some((n) => n.key === focus.key) ? focus : null
  }
  return payload.relations.some((r) => r.key === focus.key) ? focus : null
}
