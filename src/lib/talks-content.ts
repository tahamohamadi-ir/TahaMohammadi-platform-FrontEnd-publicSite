/**
 * Talks page family loaders — canonical `/api/talks/*` (PU-16-talks / F10).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import { type Locale } from './navigation'

export interface TalkListOut {
  locale: string
  slug: string
  title: string
  speakers: string
  event_name: string
  event_date: string | null
  location: string
  license: string
  access_state: string
  published_at?: string | null
}

export interface TalkDetailOut extends TalkListOut {
  abstract: string
  slides_url?: string | null
  video_url?: string | null
  story?: Record<string, unknown> | null
  seo?: Record<string, unknown> | null
  alternates?: Array<{ locale: string; slug: string }>
  relatedRecords?: Array<{ slug: string; title: string; summary?: string }>
}

export type TalksIndexModel =
  { status: 'unavailable' } | { status: 'ready'; talks: TalkListOut[] }

export type TalkDetailModel =
  { status: 'unavailable' } | { status: 'ready'; talk: TalkDetailOut }

export function getTalksRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Talks & Presentations' : 'سخنرانی‌ها و ارائه‌ها'
}

export function getTalksUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Talks Unavailable',
        message: 'Published talks and presentations are not available yet.',
      }
    : {
        title: 'ارائه‌ها در دسترس نیست',
        message: 'سخنرانی‌ها و ارائه‌های منتشرشده هنوز در دسترس نیستند.',
      }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

async function fetchAllPagedItems<T extends { published_at?: string | null }>(
  pathPrefix: string,
): Promise<T[]> {
  const pageSize = 100
  let page = 1
  const collected: T[] = []

  while (true) {
    const query = `?page=${page}&page_size=${pageSize}`
    const payload = await fetchJson<{ count: number; items: T[] }>(
      `${pathPrefix}${query}`,
    )
    if (!payload.items || !payload.items.length) break
    collected.push(...filterPublishedOnly(payload.items))
    if (collected.length >= payload.count) break
    page += 1
  }

  return collected
}

export async function listTalks(locale: Locale): Promise<TalkListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<TalkListOut>(`/api/talks/${locale}`)
  } catch {
    return []
  }
}

export async function fetchTalksIndex(
  locale: Locale,
): Promise<TalksIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const talks = await listTalks(locale)
  if (!talks.length) {
    return { status: 'unavailable' }
  }
  return { status: 'ready', talks }
}

export async function getTalk(
  locale: Locale,
  slug: string,
): Promise<TalkDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const talk = await fetchJson<TalkDetailOut>(
      `/api/talks/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(talk)
    if (talk.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return talk
  } catch {
    return null
  }
}

export async function fetchTalkDetail(
  locale: Locale,
  slug: string,
): Promise<TalkDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const talk = await getTalk(locale, slug)
  if (talk) {
    return { status: 'ready', talk }
  }
  return { status: 'unavailable' }
}

export async function listTalkSlugs(locale: Locale): Promise<string[]> {
  const talks = await listTalks(locale)
  return talks.map((t) => t.slug)
}

export async function resolveTalkAlternateAvailability(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const talk = await getTalk(alternate, slug)
  return talk !== null
}
