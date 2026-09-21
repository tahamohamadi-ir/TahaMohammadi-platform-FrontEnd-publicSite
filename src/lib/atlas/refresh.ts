/** Conditional runtime refresh (Plan C Task 7).
 *
 * One conditional GET against the same-origin Active Atlas API: `If-None-Match`
 * from the embedded snapshot, adopt-newer on a valid newer version,
 * keep-snapshot on every failure. Ordering is `(publishedAt, id)` — never a
 * client clock. No credentials, no reader identifier (spec §11.2).
 *
 * `data-atlas-refresh` is written by the caller from the returned outcome.
 */

import type { AtlasPayload } from './model'
import { validateAtlasPayload } from './validate'

export type AtlasRefreshOutcome =
  | 'not-modified'
  | 'adopted'
  | 'kept-older'
  | 'kept-invalid'
  | 'kept-error'
  | 'absent'

export interface AtlasEmbeddedVersion {
  revision: string
  etag: string
  publishedAt: string
  id: number
}

export interface AtlasAdoptDetail {
  payload: AtlasPayload
  etag: string | null
  selection: { key: string | null; cleared: boolean }
}

export interface RefreshAtlasOptions {
  locale: 'en' | 'fa'
  embedded: AtlasEmbeddedVersion
  selectedKey?: string | null
  fetchFn?: typeof fetch
  onAdopt: (detail: AtlasAdoptDetail) => void
  onKeep: (outcome: Exclude<AtlasRefreshOutcome, 'adopted'>) => void
}

function compareVersion(
  a: { publishedAt: string; id: number },
  b: { publishedAt: string; id: number },
): number {
  if (a.publishedAt < b.publishedAt) return -1
  if (a.publishedAt > b.publishedAt) return 1
  return a.id - b.id
}

function payloadContainsKey(payload: AtlasPayload, key: string): boolean {
  return (
    payload.nodes.some((n) => n.key === key) ||
    payload.relations.some((r) => r.key === key)
  )
}

export async function refreshAtlas(
  options: RefreshAtlasOptions,
): Promise<AtlasRefreshOutcome> {
  const {
    locale,
    embedded,
    selectedKey = null,
    fetchFn = fetch,
    onAdopt,
    onKeep,
  } = options

  let response: Response
  try {
    response = await fetchFn(`/api/atlas/${locale}`, {
      credentials: 'omit',
      headers: {
        'If-None-Match': embedded.etag,
        Accept: 'application/json',
      },
    })
  } catch {
    const outcome: AtlasRefreshOutcome = 'kept-error'
    onKeep(outcome)
    return outcome
  }

  if (response.status === 304) {
    onKeep('not-modified')
    return 'not-modified'
  }
  if (response.status === 404) {
    onKeep('absent')
    return 'absent'
  }
  if (!response.ok) {
    onKeep('kept-error')
    return 'kept-error'
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    onKeep('kept-invalid')
    return 'kept-invalid'
  }

  const validated = validateAtlasPayload(raw)
  if (!validated.ok) {
    onKeep('kept-invalid')
    return 'kept-invalid'
  }

  const next = validated.payload
  const nextMeta = {
    publishedAt: next.version.publishedAt,
    id: next.version.id,
  }
  const embeddedMeta = {
    publishedAt: embedded.publishedAt,
    id: embedded.id,
  }

  if (compareVersion(nextMeta, embeddedMeta) <= 0) {
    onKeep('kept-older')
    return 'kept-older'
  }

  const etag =
    response.headers?.get('ETag') ?? response.headers?.get('etag') ?? null
  const survives =
    typeof selectedKey === 'string' &&
    selectedKey.length > 0 &&
    payloadContainsKey(next, selectedKey)
  onAdopt({
    payload: next,
    etag,
    selection: survives
      ? { key: selectedKey, cleared: false }
      : { key: null, cleared: selectedKey != null && selectedKey !== '' },
  })
  return 'adopted'
}
