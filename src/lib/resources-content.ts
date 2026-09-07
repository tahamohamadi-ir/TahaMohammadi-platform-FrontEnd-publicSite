/**
 * Resources page family loaders — canonical `/api/downloads/*` (PU-16-resources / F11).
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

export interface ResourceListOut {
  locale: string
  slug: string
  title: string
  description: string
  download_type: string
  language: string
  license: string
  access_state: string
  published_at?: string | null
  updated_at?: string | null
}

export interface ResourceDetailOut extends ResourceListOut {
  accessibility_notes: string
  file?: { url: string; alt?: string } | null
  mime?: string | null
  size_bytes?: number | null
  story?: Record<string, unknown> | null
  seo?: Record<string, unknown> | null
  alternates?: Array<{ locale: string; slug: string }>
  relatedRecords?: Array<{ slug: string; title: string; summary?: string }>
}

export type ResourcesIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; resources: ResourceListOut[] }

export type ResourceDetailModel =
  | { status: 'unavailable' }
  | { status: 'ready'; resource: ResourceDetailOut }

export function getResourcesRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Resources & Downloads' : 'منابع و فایل‌ها'
}

export function getResourcesUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Resources Unavailable',
        message: 'Published resources and downloads are not available yet.',
      }
    : {
        title: 'منابع در دسترس نیست',
        message: 'منابع و پرونده‌های منتشرشده هنوز در دسترس نیستند.',
      }
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

export async function listResources(locale: Locale): Promise<ResourceListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<ResourceListOut>(`/api/downloads/${locale}`)
  } catch {
    return []
  }
}

export async function fetchResourcesIndex(
  locale: Locale,
): Promise<ResourcesIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const resources = await listResources(locale)
  if (!resources.length) {
    return { status: 'unavailable' }
  }
  return { status: 'ready', resources }
}

export async function getResource(
  locale: Locale,
  slug: string,
): Promise<ResourceDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const resource = await fetchJson<ResourceDetailOut>(
      `/api/downloads/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(resource)
    if (resource.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return resource
  } catch {
    return null
  }
}

export async function fetchResourceDetail(
  locale: Locale,
  slug: string,
): Promise<ResourceDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const resource = await getResource(locale, slug)
  if (resource) {
    return { status: 'ready', resource }
  }
  return { status: 'unavailable' }
}

export async function listResourceSlugs(locale: Locale): Promise<string[]> {
  const resources = await listResources(locale)
  return resources.map((r) => r.slug)
}

export async function resolveResourceAlternateAvailability(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const resource = await getResource(alternate, slug)
  return resource !== null
}
