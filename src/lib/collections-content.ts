/**
 * Collections page family loaders — canonical `/api/v1/collections/*` (PU-16-collections / F12).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import type { Locale } from './navigation'

export interface WorkRefOut {
  contentType: string
  slug: string
  title: string
  summary?: string
  eyebrow?: string
  href?: string
}

export interface CollectionCardOut {
  locale: string
  slug: string
  title: string
  description: string
  curatorName: string
  criteria: string
  curatedDate?: string | null
  curatorTitle?: string | null
  cover?: { url: string; alt?: string } | null
  seo?: Record<string, unknown> | null
  alternates?: Array<{ locale: string; slug: string }>
}

export interface CollectionListOut {
  count: number
  items: CollectionCardOut[]
}

export interface CollectionDetailOut extends CollectionCardOut {
  story?: Record<string, unknown> | null
  items: WorkRefOut[]
}

export type CollectionsIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; collections: CollectionCardOut[] }

export type CollectionDetailModel =
  | { status: 'unavailable' }
  | { status: 'ready'; collection: CollectionDetailOut }

export function getCollectionsRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Collections' : 'مجموعه‌ها'
}

export function getCollectionsUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Collections Unavailable',
        message: 'Published curated collections are not available yet.',
      }
    : {
        title: 'مجموعه‌ها در دسترس نیست',
        message: 'مجموعه‌های گردآوری‌شدهٔ منتشرشده هنوز در دسترس نیستند.',
      }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

export async function listCollections(
  locale: Locale,
): Promise<CollectionCardOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    const payload = await fetchJson<CollectionListOut>(
      `/api/v1/collections/${locale}?page=1&pageSize=50`,
    )
    if (!payload.items || !payload.items.length) return []
    return filterPublishedOnly(payload.items)
  } catch {
    return []
  }
}

export async function fetchCollectionsIndex(
  locale: Locale,
): Promise<CollectionsIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const collections = await listCollections(locale)
  if (!collections.length) {
    return { status: 'unavailable' }
  }
  return { status: 'ready', collections }
}

export async function getCollection(
  locale: Locale,
  slug: string,
): Promise<CollectionDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const collection = await fetchJson<CollectionDetailOut>(
      `/api/v1/collections/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(collection)
    if (collection.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return collection
  } catch {
    return null
  }
}

export async function fetchCollectionDetail(
  locale: Locale,
  slug: string,
): Promise<CollectionDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const collection = await getCollection(locale, slug)
  if (collection) {
    return { status: 'ready', collection }
  }
  return { status: 'unavailable' }
}

export async function listCollectionSlugs(locale: Locale): Promise<string[]> {
  const collections = await listCollections(locale)
  return collections.map((c) => c.slug)
}

export async function resolveCollectionAlternateAvailability(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const collection = await getCollection(alternate, slug)
  return collection !== null
}
