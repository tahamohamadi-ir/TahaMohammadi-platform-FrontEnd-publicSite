/**
 * CA-02 — Published graph adapter and route resolution.
 *
 * Adapts the existing public `GraphPayloadOut` (`GET /api/graph/{locale}`,
 * see `src/generated/public-api.ts`) into deterministic, exact-locale
 * semantic data for the Home hero. Related records resolve to real hrefs
 * only through an explicit caller-supplied resolver; family/ID pairs are
 * never turned into guessed slugs.
 *
 * Dependency note: PU-SYNC-graph (generated resolver fixture) is still
 * NOT_STARTED, so this adapter takes the resolver as an injected function.
 * Callers pass only exact-locale published routes they have already
 * verified (for example via existing family list adapters). Anything the
 * resolver cannot map stays a non-link and is reported separately.
 *
 * No mock personal records enter public output. Fixture payloads live in
 * `tests/fixtures/contracts/hero-graph.json` and are synthetic.
 */

import type { components } from '../generated/public-api'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import type { Locale } from './navigation'

export const HERO_GRAPH_ADAPTER_VERSION = 'ca02-1.0.0'

export type GraphPayloadOut = components['schemas']['GraphPayloadOut']
export type GraphNodeOut = components['schemas']['GraphNodePublicOut']
export type GraphEdgeOut = components['schemas']['GraphEdgePublicOut']
export type GraphRelatedOut = components['schemas']['GraphRelatedRecordOut']

/** Caller-supplied exact-locale resolution. Return `undefined` to leave a non-link. */
export type RelatedHrefResolver = (
  family: string,
  id: string,
  locale: Locale,
) => string | undefined

/**
 * Eligible related-record families. Evidence: `Back-End/apps/api/
 * admin_common.py` `GRAPH_RELATED_FAMILIES` plus the `CONTENT_RELATED_FAMILIES`
 * extension (adds course/creativework/lesson/collection). Unknown families
 * are reported as unresolved and never become links.
 */
export const ELIGIBLE_RELATED_FAMILIES = [
  'landing',
  'profile',
  'article',
  'series',
  'researchtopic',
  'researchstatement',
  'project',
  'publication',
  'book',
  'talk',
  'download',
  'course',
  'creativework',
  'lesson',
  'collection',
] as const

export type EligibleRelatedFamily = (typeof ELIGIBLE_RELATED_FAMILIES)[number]

export function isEligibleRelatedFamily(
  family: string,
): family is EligibleRelatedFamily {
  return (ELIGIBLE_RELATED_FAMILIES as readonly string[]).includes(family)
}

/**
 * Families supported by the current backend resolver
 * (`Back-End/apps/api/record_resolver.py` `RESOLVER_FAMILIES`, 13 entries).
 * Adapter-visible families (`ELIGIBLE_RELATED_FAMILIES`, 15) include
 * `lesson`/`collection` for future I05 work, but those must never be sent
 * to the current resolver: an unknown family returns 400 for the entire
 * batch and would suppress valid links (G3). Unsupported refs stay non-links
 * without poisoning supported batches.
 */
export const RESOLVER_SUPPORTED_FAMILIES = [
  'landing',
  'profile',
  'article',
  'series',
  'researchtopic',
  'researchstatement',
  'project',
  'publication',
  'book',
  'talk',
  'download',
  'course',
  'creativework',
] as const

export type ResolverSupportedFamily =
  (typeof RESOLVER_SUPPORTED_FAMILIES)[number]

export function isResolverSupportedFamily(
  family: string,
): family is ResolverSupportedFamily {
  return (RESOLVER_SUPPORTED_FAMILIES as readonly string[]).includes(family)
}

/**
 * Record-ID wire rule per `Docs/03-contracts/PRODUCT-INTERFACES-V2.md` §I04
 * with the Resolver R1 clarification: canonical ASCII `[1-9][0-9]*` within
 * the signed 64-bit BigAutoField storage range (DEFAULT_AUTO_FIELD).
 * Uses bounded decimal-string comparison (no lossy Number conversion) so
 * `2147483648` and larger 64-bit IDs validate correctly; larger values are
 * treated as invalid, never queried. IDs stay strings on the wire.
 */
const MAX_RELATED_RECORD_ID_STR = '9223372036854775807'

export function isValidRelatedRecordId(id: unknown): boolean {
  if (typeof id !== 'string') return false
  if (!/^[1-9][0-9]*$/.test(id)) return false
  if (id.length > 19) return false
  if (id.length < 19) return true
  return id <= MAX_RELATED_RECORD_ID_STR
}

/**
 * Supported presentation roles. Unknown API roles fall back to `neutral`;
 * raw role strings are never passed through as CSS or icon imports.
 */
export const SUPPORTED_COLOR_ROLES = [
  'brand',
  'signature',
  'research',
  'context',
  'ink',
  'neutral',
] as const

export type SupportedColorRole = (typeof SUPPORTED_COLOR_ROLES)[number]

export const SUPPORTED_ICON_ROLES = [
  'disc',
  'ring',
  'square',
  'diamond',
  'neutral',
] as const

export type SupportedIconRole = (typeof SUPPORTED_ICON_ROLES)[number]

export function normalizeColorRole(value: unknown): SupportedColorRole {
  return typeof value === 'string' &&
    (SUPPORTED_COLOR_ROLES as readonly string[]).includes(value)
    ? (value as SupportedColorRole)
    : 'neutral'
}

export function normalizeIconRole(value: unknown): SupportedIconRole {
  return typeof value === 'string' &&
    (SUPPORTED_ICON_ROLES as readonly string[]).includes(value)
    ? (value as SupportedIconRole)
    : 'neutral'
}

export interface HeroGraphLayout {
  x: number
  y: number
  z: number
  source: 'api' | 'derived'
}

/** FNV-1a 32-bit hash mapped to [0, 1). Deterministic, no randomness. */
function hashToUnit(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) / 4294967296
}

const GOLDEN_ANGLE = 2.399963229728653
const DERIVED_RING_RADII = [42, 82, 116]

/**
 * Stable presentation-only layout derived from node ID and order. `z` is
 * visual depth only and carries no scientific meaning.
 */
export function deriveLayoutPosition(
  id: string,
  index: number,
): HeroGraphLayout {
  const angle =
    hashToUnit(`hero-graph:${id}`) * Math.PI * 2 + index * GOLDEN_ANGLE
  const radius = DERIVED_RING_RADII[index % DERIVED_RING_RADII.length] ?? 82
  const depth = hashToUnit(`hero-graph-depth:${id}`) - 0.5
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.62,
    z: depth * 36,
    source: 'derived',
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readApiLayout(
  node: GraphNodeOut,
  index: number,
): { layout: HeroGraphLayout; derived: boolean } {
  const position = node.position
  if (
    position != null &&
    isFiniteNumber(position.x) &&
    isFiniteNumber(position.y) &&
    (position.z == null || isFiniteNumber(position.z))
  ) {
    return {
      layout: {
        x: position.x,
        y: position.y,
        z: position.z ?? 0,
        source: 'api',
      },
      derived: false,
    }
  }
  return { layout: deriveLayoutPosition(node.id, index), derived: true }
}

export interface HeroGraphRelatedLink {
  family: string
  id: string
  href: string
}

export interface HeroGraphNode {
  id: string
  label: string
  accessibleLabel: string
  type: string
  weight: number
  summary: string | null
  colorRole: SupportedColorRole
  iconRole: SupportedIconRole
  position: { x: number; y: number; z?: number | null } | null
  layout: HeroGraphLayout
  related: HeroGraphRelatedLink[]
}

export interface HeroGraphEdge {
  id: string
  source: string
  target: string
  relationType: string
  weight: number
  directed: boolean
  explanation: string | null
}

export type UnresolvedRelatedReason =
  'unknown-family' | 'invalid-id' | 'unresolved' | 'wrong-locale'

export interface UnresolvedRelated {
  nodeId: string
  family: string
  id: string
  reason: UnresolvedRelatedReason
}

export type HeroGraphModel =
  | {
      status: 'ready'
      locale: Locale
      nodes: HeroGraphNode[]
      edges: HeroGraphEdge[]
      unresolvedRelated: UnresolvedRelated[]
      warnings: string[]
    }
  | { status: 'empty'; locale: Locale; warnings: string[] }
  | { status: 'error'; locale: Locale; issues: string[] }
  | { status: 'unavailable'; locale: Locale }

export interface AdaptHeroGraphOptions {
  locale: Locale
  resolveRelatedHref?: RelatedHrefResolver
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Adapt a published graph payload. Returns explicit empty/error/unavailable
 * states instead of fabricating nodes, edges, or links.
 */
export function adaptHeroGraph(
  payload: GraphPayloadOut | null | undefined,
  options: AdaptHeroGraphOptions,
): HeroGraphModel {
  const { locale, resolveRelatedHref } = options

  if (payload == null || !isRecord(payload)) {
    return { status: 'unavailable', locale }
  }

  const warnings: string[] = []
  const issues: string[] = []

  const rawNodes: unknown =
    (payload as { nodes?: unknown }).nodes === undefined
      ? []
      : (payload as { nodes?: unknown }).nodes
  const rawEdges: unknown =
    (payload as { edges?: unknown }).edges === undefined
      ? []
      : (payload as { edges?: unknown }).edges

  if ((payload as { nodes?: unknown }).nodes === undefined) {
    warnings.push('nodes-absent-treated-as-empty')
  }
  if ((payload as { edges?: unknown }).edges === undefined) {
    warnings.push('edges-absent-treated-as-empty')
  }

  if (!Array.isArray(rawNodes)) {
    return { status: 'error', locale, issues: ['nodes-must-be-an-array'] }
  }
  if (!Array.isArray(rawEdges)) {
    return { status: 'error', locale, issues: ['edges-must-be-an-array'] }
  }

  if (rawNodes.length === 0 && rawEdges.length > 0) {
    return {
      status: 'error',
      locale,
      issues: ['edges-without-nodes-dangling'],
    }
  }
  if (rawNodes.length === 0) {
    return { status: 'empty', locale, warnings }
  }

  const seenIds = new Set<string>()
  const nodes: HeroGraphNode[] = []
  const unresolvedRelated: UnresolvedRelated[] = []

  rawNodes.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`node-${index}-malformed`)
      return
    }
    const candidate = entry as Partial<GraphNodeOut>
    if (!nonBlankString(candidate.id)) {
      issues.push(`node-${index}-missing-id`)
      return
    }
    if (seenIds.has(candidate.id)) {
      issues.push(`duplicate-node-id:${candidate.id}`)
      return
    }
    seenIds.add(candidate.id)

    if (!nonBlankString(candidate.label)) {
      issues.push(`node-missing-label:${candidate.id}`)
      return
    }
    if (!nonBlankString(candidate.accessibleLabel)) {
      issues.push(`node-missing-accessible-label:${candidate.id}`)
      return
    }
    if (!nonBlankString(candidate.type)) {
      issues.push(`node-missing-type:${candidate.id}`)
      return
    }
    if (!isFiniteNumber(candidate.weight)) {
      issues.push(`node-non-finite-weight:${candidate.id}`)
      return
    }

    const { layout, derived } = readApiLayout(candidate as GraphNodeOut, index)
    if (derived) warnings.push(`node-layout-derived:${candidate.id}`)

    const colorRole = normalizeColorRole(candidate.colorRole)
    const iconRole = normalizeIconRole(candidate.iconRole)
    if (
      candidate.colorRole != null &&
      colorRole === 'neutral' &&
      candidate.colorRole !== 'neutral'
    ) {
      warnings.push(`node-color-role-normalized:${candidate.id}`)
    }
    if (
      candidate.iconRole != null &&
      iconRole === 'neutral' &&
      candidate.iconRole !== 'neutral'
    ) {
      warnings.push(`node-icon-role-normalized:${candidate.id}`)
    }

    const relatedRaw = candidate.relatedRecords ?? []
    if (!Array.isArray(relatedRaw)) {
      issues.push(`node-malformed-related:${candidate.id}`)
      return
    }

    const related: HeroGraphRelatedLink[] = []
    relatedRaw.forEach((relatedEntry) => {
      if (!isRecord(relatedEntry)) {
        issues.push(`node-malformed-related-entry:${candidate.id}`)
        return
      }
      const rawFamily = (relatedEntry as { family?: unknown }).family
      const rawRecordId = (relatedEntry as { id?: unknown }).id
      if (typeof rawFamily !== 'string' || typeof rawRecordId !== 'string') {
        issues.push(`node-malformed-related-entry:${candidate.id}`)
        return
      }
      const family: string = rawFamily
      const recordId: string = rawRecordId
      if (!isEligibleRelatedFamily(family)) {
        unresolvedRelated.push({
          nodeId: candidate.id,
          family,
          id: recordId,
          reason: 'unknown-family',
        })
        return
      }
      if (!isValidRelatedRecordId(recordId)) {
        unresolvedRelated.push({
          nodeId: candidate.id,
          family,
          id: recordId,
          reason: 'invalid-id',
        })
        return
      }
      const href = resolveRelatedHref?.(family, recordId, locale)
      if (href == null) {
        unresolvedRelated.push({
          nodeId: candidate.id,
          family,
          id: recordId,
          reason: 'unresolved',
        })
        return
      }
      if (!href.startsWith(`/${locale}/`) || /\s/.test(href)) {
        unresolvedRelated.push({
          nodeId: candidate.id,
          family,
          id: recordId,
          reason: 'wrong-locale',
        })
        return
      }
      related.push({ family, id: recordId, href })
    })

    nodes.push({
      id: candidate.id,
      label: candidate.label,
      accessibleLabel: candidate.accessibleLabel,
      type: candidate.type,
      weight: candidate.weight,
      summary:
        typeof candidate.summary === 'string' && candidate.summary.trim()
          ? candidate.summary
          : null,
      colorRole,
      iconRole,
      position: (candidate.position as HeroGraphNode['position']) ?? null,
      layout,
      related,
    })
  })

  if (issues.length > 0) {
    return { status: 'error', locale, issues }
  }

  const edges: HeroGraphEdge[] = []
  rawEdges.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`edge-${index}-malformed`)
      return
    }
    const candidate = entry as Partial<GraphEdgeOut>
    if (!nonBlankString(candidate.id)) {
      issues.push(`edge-${index}-missing-id`)
      return
    }
    if (!nonBlankString(candidate.source) || !seenIds.has(candidate.source)) {
      issues.push(`edge-dangling-source:${candidate.id}`)
      return
    }
    if (!nonBlankString(candidate.target) || !seenIds.has(candidate.target)) {
      issues.push(`edge-dangling-target:${candidate.id}`)
      return
    }
    if (!nonBlankString(candidate.relationType)) {
      issues.push(`edge-missing-relation:${candidate.id}`)
      return
    }
    if (!isFiniteNumber(candidate.weight)) {
      issues.push(`edge-non-finite-weight:${candidate.id}`)
      return
    }
    if (typeof candidate.directed !== 'boolean') {
      issues.push(`edge-missing-directed:${candidate.id}`)
      return
    }
    edges.push({
      id: candidate.id,
      source: candidate.source,
      target: candidate.target,
      relationType: candidate.relationType,
      weight: candidate.weight,
      directed: candidate.directed,
      explanation:
        typeof candidate.explanation === 'string' &&
        candidate.explanation.trim()
          ? candidate.explanation
          : null,
    })
  })

  if (issues.length > 0) {
    return { status: 'error', locale, issues }
  }

  return { status: 'ready', locale, nodes, edges, unresolvedRelated, warnings }
}

/**
 * Build an exact-match resolver from explicitly verified entries. No
 * prefix guessing: `researchtopic:1` never resolves `researchtopic:10`.
 */
export function createStaticRelatedResolver(
  entries: ReadonlyArray<{
    family: string
    id: string
    locale: Locale
    href: string
  }>,
): RelatedHrefResolver {
  const table = new Map(
    entries.map((entry) => [
      `${entry.locale}|${entry.family}|${entry.id}`,
      entry.href,
    ]),
  )
  return (family, id, locale) => table.get(`${locale}|${family}|${id}`)
}

/** Fetch the published graph payload. Any failure maps to `null` (unavailable). */
export async function fetchHeroGraphPayload(
  locale: Locale,
  fetchFn: typeof fetch = fetch,
): Promise<GraphPayloadOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const response = await fetchFn(buildPublicApiUrl(`/api/graph/${locale}`), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    return (await response.json()) as GraphPayloadOut
  } catch {
    return null
  }
}

/**
 * A05 — Real record resolution for the Home hero (PRODUCT-INTERFACES-V2 §I04).
 *
 * Collects related `{family,id}` pairs from the graph payload (deduped, in
 * request order), resolves them in batches of at most 50 against
 * `GET /api/v1/records/{locale}/resolve`, and maps only exact-locale
 * published hits to canonical hrefs. Anything else stays a non-link:
 * identifiers never become guessed slugs. A failed batch marks its refs
 * unresolved instead of failing the whole graph.
 */

export const MAX_RESOLVE_REFS_PER_REQUEST = 50

export interface RelatedRecordRef {
  family: string
  id: string
}

export type RecordWorkRef = components['schemas']['WorkRefOut']

/**
 * Collect deduped, resolver-supported, well-formed related refs in request order.
 * Adapter-visible but resolver-unsupported families (`lesson`/`collection`)
 * are excluded here so they never poison a mixed batch (G3); they remain
 * non-links via `adaptHeroGraph`'s unresolved path.
 */
export function collectRelatedRefs(
  payload: GraphPayloadOut | null | undefined,
): RelatedRecordRef[] {
  const seen = new Set<string>()
  const refs: RelatedRecordRef[] = []
  const nodes = (payload as { nodes?: unknown } | null | undefined)?.nodes
  if (!Array.isArray(nodes)) return refs
  for (const entry of nodes) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      continue
    }
    const related = (entry as { relatedRecords?: unknown }).relatedRecords
    if (!Array.isArray(related)) continue
    for (const item of related) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        continue
      }
      const { family, id } = item as { family?: unknown; id?: unknown }
      if (typeof family !== 'string' || typeof id !== 'string') continue
      if (!isResolverSupportedFamily(family)) continue
      if (!isValidRelatedRecordId(id)) continue
      const key = `${family}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      refs.push({ family, id })
    }
  }
  return refs
}

function readResolveItems(body: unknown): { items: RecordWorkRef[] } | null {
  if (typeof body !== 'object' || body === null) return null
  const items = (body as { items?: unknown }).items
  if (!Array.isArray(items)) return null
  return { items: items as RecordWorkRef[] }
}

/** Resolve refs in ≤50 batches; failed batches stay unresolved (never throw). */
export async function fetchRecordResolutions(
  locale: Locale,
  refs: readonly RelatedRecordRef[],
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, RecordWorkRef>> {
  const resolved = new Map<string, RecordWorkRef>()
  // Defensive: never send resolver-unsupported families; they would 400 the whole batch.
  const supported = refs.filter(
    (ref) =>
      typeof ref?.family === 'string' &&
      typeof ref?.id === 'string' &&
      isResolverSupportedFamily(ref.family) &&
      isValidRelatedRecordId(ref.id),
  )
  if (supported.length === 0 || !canFetchPublicApi()) return resolved
  for (
    let offset = 0;
    offset < supported.length;
    offset += MAX_RESOLVE_REFS_PER_REQUEST
  ) {
    const batch = supported.slice(offset, offset + MAX_RESOLVE_REFS_PER_REQUEST)
    const query = batch
      .map(
        (ref) =>
          `${encodeURIComponent(ref.family)}:${encodeURIComponent(ref.id)}`,
      )
      .join(',')
    try {
      const response = await fetchFn(
        buildPublicApiUrl(`/api/v1/records/${locale}/resolve?refs=${query}`),
        { headers: { Accept: 'application/json' } },
      )
      if (!response.ok) continue
      const parsed = readResolveItems(await response.json())
      if (parsed === null) continue
      for (const item of parsed.items) {
        if (typeof item?.family !== 'string' || typeof item?.id !== 'string') {
          continue
        }
        resolved.set(`${item.family}:${item.id}`, item)
      }
    } catch {
      continue
    }
  }
  return resolved
}

/**
 * One authoritative family-to-canonical-route mapping (PRODUCT-INTERFACES-V2
 * §I02 + backend `ROUTE_FAMILY_MAP`). The resolver's `routeFamily` is verified
 * against this table, never trusted blindly; mismatches stay non-links.
 */
const CANONICAL_ROUTE_FAMILY: Record<string, string> = {
  landing: 'home',
  profile: 'about',
  article: 'blog',
  series: 'blog/series',
  researchtopic: 'research',
  researchstatement: 'research/statements',
  project: 'projects',
  publication: 'publications',
  book: 'books',
  talk: 'talks',
  download: 'resources',
  course: 'education',
  creativework: 'gallery',
  collection: 'collections',
}

/** Safe single path segment: Unicode letters/numbers, hyphen, underscore only. */
const SAFE_SEGMENT_RE = /^[\p{L}\p{N}_-]+$/u

function isSafeSlugSegment(value: unknown): value is string {
  if (typeof value !== 'string') return false
  // Canonical slugs have no surrounding whitespace; reject padded values.
  if (value.length === 0 || value.length > 200) return false
  const trimmed = value.trim()
  if (trimmed !== value) return false
  if (trimmed.length === 0 || trimmed.length > 200) return false
  if (trimmed === '.' || trimmed === '..') return false
  // Reject separators, whitespace, encodings and controls outright.
  if (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.includes('%') ||
    /\s/.test(trimmed)
  ) {
    return false
  }
  if (!SAFE_SEGMENT_RE.test(trimmed)) return false
  // Belt-and-braces: encoded form must not decode to traversal/separator.
  try {
    const decoded = decodeURIComponent(trimmed)
    if (decoded !== trimmed) return false
  } catch {
    return false
  }
  return true
}

/**
 * Map one verified resolver hit to its canonical href, or `undefined` when
 * it must stay a non-link (other-locale hit, bad slug/route, lesson without
 * its parent course slug, dot traversal, encoded separators, malformed
 * non-string values). Never throws on malformed input; never guesses:
 * every segment comes from the backend-verified WorkRef and is validated
 * and encoded. Singleton Home/About follow the route contract.
 */
export function workRefToHref(
  item: unknown,
  locale: Locale,
): string | undefined {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return undefined
  }
  const rec = item as {
    family?: unknown
    id?: unknown
    locale?: unknown
    slug?: unknown
    routeFamily?: unknown
    courseSlug?: unknown
  }
  if (typeof rec.family !== 'string' || typeof rec.locale !== 'string') {
    return undefined
  }
  if (rec.locale !== locale) return undefined
  const family: string = rec.family

  if (family === 'lesson') {
    // Future I05 shape: fixed education parent + lessons segment. The incoming
    // routeFamily is not trusted (synthetic fixtures vary); the canonical path
    // is built from validated course/slug segments only.
    if (!isSafeSlugSegment(rec.slug) || !isSafeSlugSegment(rec.courseSlug)) {
      return undefined
    }
    const slug = encodeURIComponent((rec.slug as string).trim())
    const courseSlug = encodeURIComponent((rec.courseSlug as string).trim())
    return `/${locale}/education/${courseSlug}/lessons/${slug}/`
  }

  if (family === 'landing') {
    // Singleton Home per route contract; fixed path, incoming routeFamily ignored.
    if (rec.slug !== 'home') return undefined
    return `/${locale}/`
  }

  if (family === 'profile') {
    // Singleton About per route contract; fixed path.
    if (rec.slug !== 'about') return undefined
    return `/${locale}/about/`
  }

  const expectedRoute = CANONICAL_ROUTE_FAMILY[family]
  if (typeof expectedRoute !== 'string') return undefined
  if (
    typeof rec.routeFamily !== 'string' ||
    rec.routeFamily !== expectedRoute
  ) {
    return undefined
  }
  if (!isSafeSlugSegment(rec.slug)) return undefined
  const slug = encodeURIComponent((rec.slug as string).trim())
  return `/${locale}/${expectedRoute}/${slug}/`
}

/** Build the adapter resolver from verified hits; misses stay non-links. */
export function createRecordResolver(
  resolutions: ReadonlyMap<string, RecordWorkRef>,
  locale: Locale,
): RelatedHrefResolver {
  return (family, id, requestLocale) => {
    if (requestLocale !== locale) return undefined
    const item = resolutions.get(`${family}:${id}`)
    if (!item) return undefined
    return workRefToHref(item, locale)
  }
}

/** Fetch and adapt in one step for build-time hero rendering. */
export async function loadHeroGraph(
  locale: Locale,
  resolveRelatedHref?: RelatedHrefResolver,
  fetchFn: typeof fetch = fetch,
): Promise<HeroGraphModel> {
  const payload = await fetchHeroGraphPayload(locale, fetchFn)
  let resolver = resolveRelatedHref
  if (resolver === undefined && payload !== null) {
    // A05: real resolution against the published resolver endpoint.
    // Any failure degrades to honest non-links, never to guessed hrefs.
    try {
      const refs = collectRelatedRefs(payload)
      const resolutions = await fetchRecordResolutions(locale, refs, fetchFn)
      resolver = createRecordResolver(resolutions, locale)
    } catch {
      resolver = undefined
    }
  }
  return adaptHeroGraph(payload, { locale, resolveRelatedHref: resolver })
}
