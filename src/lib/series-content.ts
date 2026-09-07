/**
 * Series page family loaders — canonical `/api/v1/series/*` (PU-16-series / F12).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import {
  assertPublishedOnly,
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

export interface SeriesListOut {
  locale: string
  slug: string
  title: string
  description: string
  ordering?: number
}

export interface SeriesDetailOut extends SeriesListOut {
  story?: Record<string, unknown> | null
  items: WorkRefOut[]
  seo?: Record<string, unknown> | null
  alternates?: Array<{ locale: string; slug: string }>
}

export type SeriesIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; series: SeriesListOut[] }

export type SeriesDetailModel =
  | { status: 'unavailable' }
  | { status: 'ready'; series: SeriesDetailOut }

export function getSeriesRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Article Series' : 'مجموعه مقالات'
}

export function getSeriesUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Series Unavailable',
        message: 'Published article series are not available yet.',
      }
    : {
        title: 'مجموعه مقالات در دسترس نیست',
        message: 'مجموعه مقالات منتشرشده هنوز در دسترس نیستند.',
      }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

export async function listSeries(locale: Locale): Promise<SeriesListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    const items = await fetchJson<SeriesListOut[]>(`/series/${locale}`)
    if (!Array.isArray(items)) return []
    return items
  } catch {
    return []
  }
}

export async function fetchSeriesIndex(
  locale: Locale,
): Promise<SeriesIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const series = await listSeries(locale)
  if (!series.length) {
    return { status: 'unavailable' }
  }
  return { status: 'ready', series }
}

export async function getSeries(
  locale: Locale,
  slug: string,
): Promise<SeriesDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const series = await fetchJson<SeriesDetailOut>(
      `/api/v1/series/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(series)
    if (series.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return series
  } catch {
    return null
  }
}

export async function fetchSeriesDetail(
  locale: Locale,
  slug: string,
): Promise<SeriesDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const series = await getSeries(locale, slug)
  if (series) {
    return { status: 'ready', series }
  }
  return { status: 'unavailable' }
}

export async function listSeriesSlugs(locale: Locale): Promise<string[]> {
  const series = await listSeries(locale)
  return series.map((s) => s.slug)
}

export async function resolveSeriesAlternateAvailability(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const series = await getSeries(alternate, slug)
  return series !== null
}
