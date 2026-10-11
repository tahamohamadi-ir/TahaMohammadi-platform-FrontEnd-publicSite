/** Client-side revalidation for a non-ready Atlas region (availability fix).
 *
 * PRODUCTION DEFECT THIS REPAIRS: `fetchAtlasSnapshot` returns
 * `{status:'unavailable'}` whenever `canFetchPublicApi()` is false, which is
 * every non-DEV build with an empty `PUBLIC_API_BASE_URL`. The static build
 * therefore embedded an honest "unavailable" region, and the runtime selected
 * only `[data-atlas-region][data-atlas-status="ready"]` — so a perfectly
 * healthy public API could never be reached. The feature shipped dead.
 *
 * This module is the recovery path, and it is deliberately narrow:
 *
 * - ONE same-origin `GET /api/atlas/{locale}` from the browser.
 * - `credentials: 'omit'`, `Accept: application/json`, no `Authorization`,
 *   no `If-None-Match` (nothing is embedded to be conditional against — this
 *   is a first fetch, not the Task-7 refresh), no token, no reader identifier.
 * - The body goes through the EXISTING `validateAtlasPayload`. A validator
 *   validates, never reshapes: an invalid payload yields no partial model.
 * - Recovery renders through the EXISTING `buildSharedAtlasBodyHtml`, so
 *   there is exactly one renderer and one honest copy source. No new copy.
 * - ANY failure keeps the server-rendered honest state byte-for-byte.
 *
 * DOM seam: the region is structural (`getAttribute`/`setAttribute`/
 * `querySelector`), so tests inject fakes — no DOM library, no new dependency,
 * matching `enhancement.ts`.
 */
import { buildSharedAtlasBodyHtml } from '../../atlas/presentation'
import { buildAtlasIndexModel, type AtlasSnapshot } from '../../atlas/snapshot'
import type { AtlasPayload } from '../../atlas/model'
import { validateAtlasPayload, type AtlasRejection } from '../../atlas/validate'

/**
 * Fetch and validate the public Atlas payload for a locale.
 *
 * Shared by both client recovery entries (the full Atlas route and the About
 * preview) so there is exactly ONE network contract in the codebase: a single
 * anonymous same-origin GET, no credentials, no token, no reader identifier,
 * and the existing validator — a validator validates, never reshapes.
 *
 * This performs no DOM work and never throws; the caller decides what to
 * render, and every non-`ok` outcome means the honest state stays.
 */
export type AtlasFetchOutcome =
  | { state: 'ok'; payload: AtlasPayload; etag: string | null }
  | { state: 'kept-unavailable' }
  | { state: 'kept-invalid'; reason: AtlasRejection }
  | { state: 'kept-error' }

export async function revalidateAtlasPayload(
  locale: 'en' | 'fa',
  fetchFn: typeof fetch = fetch,
): Promise<AtlasFetchOutcome> {
  let response: Response
  try {
    response = await fetchFn(`/api/atlas/${locale}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { state: 'kept-error' }
  }

  // 404 = the backend genuinely has no active version. That stays honest.
  if (response.status === 404 || !response.ok) {
    return { state: 'kept-unavailable' }
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return { state: 'kept-invalid', reason: 'not-object' }
  }

  const validated = validateAtlasPayload(raw)
  if (!validated.ok) {
    return { state: 'kept-invalid', reason: validated.reason }
  }

  return { state: 'ok', payload: validated.payload, etag: readEtag(response) }
}

export type RevalidationStateName =
  | 'recovered'
  | 'kept-unavailable'
  | 'kept-invalid'
  | 'kept-error'
  | 'not-eligible'

export type RevalidationOutcome =
  | { state: 'recovered' }
  | { state: 'not-eligible' }
  | { state: 'kept-unavailable' }
  | { state: 'kept-invalid'; reason: AtlasRejection }
  | { state: 'kept-error' }

export interface AtlasRevalidationRegion {
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  querySelector(selector: string): unknown
}

export interface RevalidateOptions {
  locale: 'en' | 'fa'
  fetchFn?: typeof fetch
}

/** Only a non-ready region is eligible; a ready one is already authoritative. */
function isEligible(status: string | null): boolean {
  return status === 'unavailable' || status === 'invalid'
}

export interface RevalidationTarget {
  region: AtlasRevalidationRegion
  locale: 'en' | 'fa'
  /** True only for a non-ready region that must be revalidated. */
  needsRevalidation: boolean
}

export interface RevalidationRoot {
  querySelector(selector: string): unknown
}

/**
 * Find the page's single Atlas region and decide whether it must be
 * revalidated.
 *
 * The production defect was the selector here: it matched
 * `[data-atlas-region][data-atlas-status="ready"]` and therefore ignored a
 * server-rendered `unavailable`/`invalid` region entirely, so a healthy public
 * API could never be reached. Matching the bare region and returning the
 * decision as data keeps one selection path for both the ready and the
 * recovering case.
 */
export function resolveRevalidationTarget(
  root: RevalidationRoot,
): RevalidationTarget | null {
  const region = root.querySelector(
    '[data-atlas-region]',
  ) as AtlasRevalidationRegion | null
  if (!region) return null
  const locale: 'en' | 'fa' =
    region.getAttribute('data-atlas-locale') === 'fa' ? 'fa' : 'en'
  return {
    region,
    locale,
    needsRevalidation: isEligible(region.getAttribute('data-atlas-status')),
  }
}

function bodyOf(region: AtlasRevalidationRegion): { innerHTML: string } | null {
  const body = region.querySelector('[data-atlas-body]') as {
    innerHTML?: unknown
  } | null
  if (!body || typeof body.innerHTML !== 'string') return null
  return body as { innerHTML: string }
}

function readEtag(response: Response): string | null {
  return response.headers?.get('ETag') ?? response.headers?.get('etag') ?? null
}

/**
 * Adopt a validated payload onto the region through the shared presentation
 * path. Attribute writes are best-effort bookkeeping; the body swap is the
 * only step that changes what a visitor sees.
 */
function adopt(
  region: AtlasRevalidationRegion,
  locale: 'en' | 'fa',
  body: { innerHTML: string },
  snapshot: Extract<AtlasSnapshot, { status: 'ready' }>,
): void {
  body.innerHTML = buildSharedAtlasBodyHtml(locale, snapshot)
  region.setAttribute('data-atlas-status', 'ready')
  region.setAttribute('data-atlas-contract', snapshot.payload.contractVersion)
  region.setAttribute('data-atlas-revision', snapshot.payload.version.revision)
  if (snapshot.etag) region.setAttribute('data-atlas-etag', snapshot.etag)
  else region.removeAttribute('data-atlas-etag')
  region.setAttribute('data-atlas-revalidation', 'recovered')
}

/**
 * Attempt one client-side revalidation of a non-ready region.
 *
 * Never throws: every failure path returns a `kept-*` outcome and leaves the
 * server-rendered honest state untouched.
 */
export async function revalidateAtlasRegion(
  region: AtlasRevalidationRegion,
  options: RevalidateOptions,
): Promise<RevalidationOutcome> {
  const { locale, fetchFn = fetch } = options
  if (!isEligible(region.getAttribute('data-atlas-status'))) {
    return { state: 'not-eligible' }
  }
  const body = bodyOf(region)
  if (!body) return { state: 'not-eligible' }

  // One shared fetch + validate, so this route and the About preview can
  // never drift into two different network or validation contracts.
  const outcome = await revalidateAtlasPayload(locale, fetchFn)
  if (outcome.state !== 'ok') {
    region.setAttribute('data-atlas-revalidation', outcome.state)
    return outcome
  }

  const snapshot: Extract<AtlasSnapshot, { status: 'ready' }> = {
    status: 'ready',
    payload: outcome.payload,
    etag: outcome.etag,
    html: buildAtlasIndexModel(outcome.payload),
  }
  adopt(region, locale, body, snapshot)
  return { state: 'recovered' }
}
