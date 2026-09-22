/** Fragment-scoped draft Atlas preview (Plan C Task 8).
 *
 * Three stages — keep them separate:
 * 1. `consumePreviewFragment` — extract `#token=…`, strip from the address bar
 * 2. `fetchPreviewSnapshot` — Bearer-only GET to `/api/atlas/preview`
 * 3. Shared `AtlasPageContent` presentation (caller wires the result)
 *
 * Authorization never lives in the renderer. Capability stays in memory for
 * this execution path only. No Task-7 refresh is attached here.
 */

import { buildAtlasIndexModel, type AtlasSnapshot } from './snapshot'
import { validateAtlasPayload, type AtlasRejection } from './validate'

export type PreviewUnavailableReason =
  'missing_preview_token' | 'preview_forbidden' | 'preview_error' | 'absent'

export type PreviewSnapshotResult =
  | {
      state: 'ready'
      preview: true
      snapshot: Extract<AtlasSnapshot, { status: 'ready' }>
    }
  | {
      state: 'unavailable'
      preview: false
      reason: PreviewUnavailableReason
    }
  | {
      state: 'invalid'
      preview: false
      reason: AtlasRejection
    }

export interface PreviewFetchOptions {
  fetch?: typeof fetch
  apiBase?: string
}

const TOKEN_HASH_RE = /^#token=([^#]*)$/

/**
 * Read `#token=…` from the location hash, strip the fragment immediately via
 * `history.replaceState` (pathname + search only), and return the capability
 * or `null` when absent/malformed. Must run before any fetch or visible token.
 */
export function consumePreviewFragment(
  history: Pick<History, 'replaceState'>,
  location: Pick<Location, 'hash' | 'pathname' | 'search'>,
): string | null {
  // Capture the fragment BEFORE stripping: with a live `window.location` the
  // hash is already gone by the time `replaceState` returns, so reading it
  // afterwards would always resolve `null` in production.
  const hash = location.hash
  const cleanUrl = `${location.pathname}${location.search}`
  history.replaceState(null, '', cleanUrl)

  const match = TOKEN_HASH_RE.exec(hash)
  if (!match) return null
  const capability = match[1]?.trim() ?? ''
  if (!capability) return null
  return capability
}

function previewUrl(locale: 'en' | 'fa', apiBase: string): string {
  const base = apiBase.replace(/\/+$/, '')
  const path = `/api/atlas/preview?locale=${locale}`
  return base ? `${base}${path}` : path
}

/**
 * Authorized draft fetch. Capability is sent only as `Authorization: Bearer`.
 * Missing capability ⇒ no network. Failures never fall back to public Active
 * Atlas data. Invalid bodies go through `validateAtlasPayload`.
 */
export async function fetchPreviewSnapshot(
  locale: 'en' | 'fa',
  capability: string | null | undefined,
  options: PreviewFetchOptions = {},
): Promise<PreviewSnapshotResult> {
  if (capability == null || capability.trim() === '') {
    return {
      state: 'unavailable',
      preview: false,
      reason: 'missing_preview_token',
    }
  }

  const fetchFn = options.fetch ?? fetch
  const apiBase = options.apiBase ?? ''
  const url = previewUrl(locale, apiBase)

  let response: Response
  try {
    response = await fetchFn(url, {
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${capability}`,
      },
    })
  } catch {
    return {
      state: 'unavailable',
      preview: false,
      reason: 'preview_error',
    }
  }

  if (response.status === 401 || response.status === 403) {
    return {
      state: 'unavailable',
      preview: false,
      reason: 'preview_forbidden',
    }
  }
  if (response.status === 404) {
    return {
      state: 'unavailable',
      preview: false,
      reason: 'absent',
    }
  }
  if (!response.ok) {
    return {
      state: 'unavailable',
      preview: false,
      reason: 'preview_error',
    }
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return {
      state: 'invalid',
      preview: false,
      reason: 'not-object',
    }
  }

  const validated = validateAtlasPayload(raw)
  if (!validated.ok) {
    return {
      state: 'invalid',
      preview: false,
      reason: validated.reason,
    }
  }

  const etag =
    response.headers?.get('ETag') ?? response.headers?.get('etag') ?? null
  return {
    state: 'ready',
    preview: true,
    snapshot: {
      status: 'ready',
      payload: validated.payload,
      etag,
      html: buildAtlasIndexModel(validated.payload),
    },
  }
}

/** Map a preview result onto the shared AtlasSnapshot presentation contract. */
export function snapshotFromPreviewResult(
  result: PreviewSnapshotResult,
): AtlasSnapshot {
  if (result.state === 'ready') return result.snapshot
  if (result.state === 'invalid') {
    return { status: 'invalid', reason: result.reason }
  }
  return { status: 'unavailable' }
}
