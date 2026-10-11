/**
 * Writing page family loaders — canonical `/api/articles/*` and `/api/books/*` (PUBLIC-211/212).
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

export type ArticleListOut = components['schemas']['ArticleListOut']
export type ArticleDetailOut = components['schemas']['ArticleDetailOut']
export type BookListOut = components['schemas']['BookListOut']

export type WritingIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; articles: ArticleListOut[]; books: BookListOut[] }

export type WritingDetailModel =
  { status: 'unavailable' } | { status: 'ready'; article: ArticleDetailOut }

const writingNavItem = primaryNav.find((item) => item.slug === 'writing')

export function getWritingRouteTitle(locale: Locale): string {
  return (
    writingNavItem?.label[locale] ?? (locale === 'en' ? 'Writing' : 'نوشتار')
  )
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
    collected.push(...filterPublishedOnly(payload.items ?? []))
    if (
      collected.length >= (payload.count ?? 0) ||
      (payload.items?.length ?? 0) < pageSize
    ) {
      break
    }
    page += 1
  }

  return collected
}

export function getWritingUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getWritingRouteTitle('en'),
        message: 'Published writing is not available yet.',
      }
    : {
        title: getWritingRouteTitle('fa'),
        message: 'نوشتار منتشرشده هنوز در دسترس نیست.',
      }
}

export function formatReadingTime(locale: Locale, minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  return locale === 'en' ? `${minutes} min read` : `${minutes} دقیقه مطالعه`
}

export function formatPublishedDate(
  locale: Locale,
  publishedAt: string | null | undefined,
): string {
  if (!publishedAt) return ''
  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en', {
    dateStyle: 'medium',
  }).format(date)
}

export const BLOG_PAGE_SIZE = 8

export type BlogIndexItem = {
  text: string
  series: string[]
}

export type ArticleNeighbor = {
  slug: string
  title: string
}

/** Keep only items whose visible text and series match the reader's controls. */
export function matchBlogItem(
  item: BlogIndexItem,
  query: string,
  seriesSlug: string | null,
): boolean {
  if (seriesSlug && !item.series.includes(seriesSlug)) return false
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  return item.text.toLocaleLowerCase().includes(needle)
}

export function paginateBlogItems<T>(
  items: T[],
  page: number,
  pageSize = BLOG_PAGE_SIZE,
): { page: number; pageCount: number; items: T[] } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(page, 1), pageCount)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageCount,
    items: items.slice(start, start + pageSize),
  }
}

export function articleNeighbors(
  articles: Array<{ slug: string; title: string }>,
  slug: string,
): { previous: ArticleNeighbor | null; next: ArticleNeighbor | null } {
  const index = articles.findIndex((item) => item.slug === slug)
  if (index < 0) return { previous: null, next: null }
  const previous = index > 0 ? articles[index - 1] : undefined
  const next = index < articles.length - 1 ? articles[index + 1] : undefined
  return {
    previous: previous ? { slug: previous.slug, title: previous.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  }
}

export function formatArticleCardMeta(
  locale: Locale,
  article: ArticleListOut,
): string {
  return [
    formatReadingTime(locale, article.reading_time_minutes),
    article.series?.map((item) => item.title).join(', '),
  ]
    .filter(Boolean)
    .join(' · ')
}

export function formatBookCardMeta(book: BookListOut): string {
  return [
    book.authors,
    book.publisher,
    book.publication_date,
    book.access_state,
  ]
    .filter(Boolean)
    .join(' · ')
}

export async function listArticles(locale: Locale): Promise<ArticleListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<ArticleListOut>(`/api/articles/${locale}`)
  } catch {
    return []
  }
}

export async function listBooks(locale: Locale): Promise<BookListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<BookListOut>(`/api/books/${locale}`)
  } catch {
    return []
  }
}

export async function fetchWritingIndex(
  locale: Locale,
): Promise<WritingIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const [articles, books] = await Promise.all([
    listArticles(locale),
    listBooks(locale),
  ])
  if (!articles.length && !books.length) {
    return { status: 'unavailable' }
  }

  return { status: 'ready', articles, books }
}

export async function fetchArticleDetail(
  locale: Locale,
  slug: string,
): Promise<WritingDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  try {
    const article = await fetchJson<ArticleDetailOut>(
      `/api/articles/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(article)
    if (article.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return { status: 'ready', article }
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

export async function listArticleSlugs(locale: Locale): Promise<string[]> {
  const articles = await listArticles(locale)
  return articles.map((item) => item.slug)
}

export async function resolveWritingAlternateAvailability(
  locale: Locale,
  slug?: string,
): Promise<boolean> {
  if (!slug) {
    return true
  }
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  return (await listArticleSlugs(alternate)).includes(slug)
}
