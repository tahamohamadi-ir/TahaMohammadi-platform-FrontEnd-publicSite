/** Build-time Atlas snapshot loader (server only — no client code paths).
 *
 * Honest availability states:
 * - `unavailable`: no API configured (no fetch attempted) or the backend has
 *   no active version (404) / the request failed before a payload existed.
 * - `invalid`: a 200 body failed the runtime validator — no partial model.
 * - `ready`: a validated payload plus the captured ETag and the semantic
 *   index model.
 */

import { buildPublicApiUrl, canFetchPublicApi } from '../api/resolve-url'
import type { AtlasPayload } from './model'
import { validateAtlasPayload, type AtlasRejection } from './validate'

export interface AtlasIndexNode {
  key: string
  type: string
  label: string
  href: string | null
}

export interface AtlasIndexRelation {
  key: string
  type: string
  source: string
  target: string
  sourceLabel: string
  targetLabel: string
}

export interface AtlasIndexGroup {
  key: string
  label: string
  nodeKeys: string[]
}

export interface AtlasIndexModel {
  nodes: AtlasIndexNode[]
  relations: AtlasIndexRelation[]
  groups: AtlasIndexGroup[]
}

export type AtlasSnapshot =
  | {
      status: 'ready'
      payload: AtlasPayload
      etag: string | null
      html: AtlasIndexModel
    }
  | { status: 'unavailable' }
  | { status: 'invalid'; reason: AtlasRejection }

export interface SnapshotOptions {
  canFetch?: () => boolean
  buildUrl?: (path: string) => string
}

export function buildAtlasIndexModel(payload: AtlasPayload): AtlasIndexModel {
  const labelByKey = new Map<string, string>()
  for (const node of payload.nodes) labelByKey.set(node.key, node.label ?? node.key)
  return {
    nodes: payload.nodes.map((node) => ({
      key: node.key,
      type: node.type,
      // A node the projection served without a label keeps its stable public
      // key as the display name: the key is payload data, never invented copy,
      // and every index entry needs an accessible name.
      label: node.label ?? node.key,
      href: node.canonical?.href ?? null,
    })),
    relations: payload.relations.map((relation) => ({
      key: relation.key,
      type: relation.type,
      source: relation.source,
      target: relation.target,
      sourceLabel: labelByKey.get(relation.source) ?? relation.source,
      targetLabel: labelByKey.get(relation.target) ?? relation.target,
    })),
    groups: payload.groups.map((group) => ({
      key: group.key,
      label: group.label,
      nodeKeys: [...group.nodeKeys],
    })),
  }
}

/** Serialize the embedded payload — `<` escaped so `</script>` can never break out. */
export function serializeAtlasPayload(payload: AtlasPayload): string {
  return JSON.stringify(payload).replace(/</g, '\\u003c')
}

export async function fetchAtlasSnapshot(
  locale: 'en' | 'fa',
  fetchFn: typeof fetch = fetch,
  options: SnapshotOptions = {},
): Promise<AtlasSnapshot> {
  if (locale !== 'en' && locale !== 'fa') return { status: 'unavailable' }
  const canFetch = options.canFetch ?? canFetchPublicApi
  if (!canFetch()) return { status: 'unavailable' }
  const buildUrl = options.buildUrl ?? buildPublicApiUrl

  let response: Response
  try {
    response = await fetchFn(buildUrl(`/api/atlas/${locale}`))
  } catch {
    return { status: 'unavailable' }
  }
  if (response.status === 404) return { status: 'unavailable' }
  if (!response.ok) return { status: 'unavailable' }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return { status: 'invalid', reason: 'not-object' }
  }
  const validated = validateAtlasPayload(raw)
  if (!validated.ok) return { status: 'invalid', reason: validated.reason }
  const etag =
    response.headers?.get('ETag') ?? response.headers?.get('etag') ?? null
  return {
    status: 'ready',
    payload: validated.payload,
    etag,
    html: buildAtlasIndexModel(validated.payload),
  }
}
