/**
 * Creative page family loaders — canonical `/api/creative/*` (PUBLIC-221).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import type { components } from '../generated/public-api'
import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import { primaryNav, type Locale } from './navigation'

export type CreativeWorkListOut = components['schemas']['CreativeWorkListOut']
export type CreativeWorkDetailOut =
  components['schemas']['CreativeWorkDetailOut']

export type CreativeIndexModel =
  { status: 'empty' } | { status: 'ready'; works: CreativeWorkListOut[] }

export type CreativeDetailModel =
  | { status: 'unavailable' }
  | { status: 'empty-shell' }
  | { status: 'ready'; work: CreativeWorkDetailOut }

/**
 * Reserved static path for honest PF-02 empty-detail chrome.
 * Never fetched from CMS; excluded from sitemap.
 */
export const CREATIVE_DETAIL_EMPTY_SHELL_SLUG = 'empty-shell'

export function isCreativeDetailEmptyShellSlug(slug: string): boolean {
  return slug === CREATIVE_DETAIL_EMPTY_SHELL_SLUG
}

const creativeNavItem = primaryNav.find((item) => item.slug === 'creative')

export function getCreativeRouteTitle(locale: Locale): string {
  return (
    creativeNavItem?.label[locale] ??
    (locale === 'en' ? 'Creative' : 'آثار خلاقه')
  )
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

export function getCreativeUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return getCreativeEmptyCopy(locale)
}

export function getCreativeEmptyCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getCreativeRouteTitle('en'),
        message: 'Published creative works are not available yet.',
      }
    : {
        title: getCreativeRouteTitle('fa'),
        message: 'آثار خلاقهٔ منتشرشده هنوز در دسترس نیست.',
      }
}

export function formatCreativeCardMeta(work: CreativeWorkListOut): string {
  return [
    work.work_type,
    work.creator_name,
    work.creation_date,
    work.access_state,
  ]
    .filter(Boolean)
    .join(' · ')
}

export async function listCreativeWorks(
  locale: Locale,
): Promise<CreativeWorkListOut[]> {
  if (!canFetchPublicApi()) return []
  const pageSize = 100
  let page = 1
  const collected: CreativeWorkListOut[] = []

  try {
    while (true) {
      const payload = await fetchJson<
        components['schemas']['PagedCreativeWorkListOut']
      >(`/api/creative/${locale}?page=${page}&page_size=${pageSize}`)
      collected.push(...filterPublishedOnly(payload.items ?? []))
      if (
        collected.length >= (payload.count ?? 0) ||
        (payload.items?.length ?? 0) < pageSize
      ) {
        break
      }
      page += 1
    }
  } catch {
    return []
  }

  return collected
}

export async function fetchCreativeIndex(
  locale: Locale,
): Promise<CreativeIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'empty' }
  }

  const works = await listCreativeWorks(locale)
  if (!works.length) {
    return { status: 'empty' }
  }

  return { status: 'ready', works }
}

export async function fetchCreativeDetail(
  locale: Locale,
  slug: string,
): Promise<CreativeDetailModel> {
  if (isCreativeDetailEmptyShellSlug(slug)) {
    return { status: 'empty-shell' }
  }

  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  try {
    const work = await fetchJson<CreativeWorkDetailOut>(
      `/api/creative/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(work)
    if (work.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return { status: 'ready', work }
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return { status: 'unavailable' }
    }
    return { status: 'unavailable' }
  }
}

export async function listCreativeSlugs(locale: Locale): Promise<string[]> {
  const works = await listCreativeWorks(locale)
  const slugs = works.map((item) => item.slug)
  if (!slugs.includes(CREATIVE_DETAIL_EMPTY_SHELL_SLUG)) {
    slugs.push(CREATIVE_DETAIL_EMPTY_SHELL_SLUG)
  }
  return slugs
}

export async function resolveCreativeAlternateAvailability(
  locale: Locale,
  slug?: string,
): Promise<boolean> {
  if (slug && isCreativeDetailEmptyShellSlug(slug)) {
    return true
  }
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const model = await fetchCreativeIndex(alternate)
  return model.status === 'ready'
}
