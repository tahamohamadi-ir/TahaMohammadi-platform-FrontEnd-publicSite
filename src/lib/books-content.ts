/**
 * Books page family loaders — canonical `/api/books/*` (PU-16-books / F09).
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

export interface BookListOut {
  locale: string
  slug: string
  title: string
  authors: string
  isbn: string
  publisher: string
  publication_date: string | null
  license: string
  access_state: string
  published_at: string | null
  updated_at: string | null
}

export interface BookDetailOut extends BookListOut {
  description: string
  url: string
  accessibility_notes: string
  cover?: { url: string; alt?: string } | null
  story?: Record<string, unknown> | null
  seo?: Record<string, unknown> | null
  alternates?: Array<{ locale: string; slug: string }>
  relatedRecords?: Array<{ slug: string; title: string; summary?: string }>
}

export type BooksIndexModel =
  { status: 'unavailable' } | { status: 'ready'; books: BookListOut[] }

export type BookDetailModel =
  { status: 'unavailable' } | { status: 'ready'; book: BookDetailOut }

export function getBooksRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Books' : 'کتاب‌ها'
}

export function getBooksUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Books Unavailable',
        message: 'Published books are not available yet.',
      }
    : {
        title: 'کتاب‌ها در دسترس نیست',
        message: 'کتاب‌های منتشرشده هنوز در دسترس نیستند.',
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

export async function listBooks(locale: Locale): Promise<BookListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<BookListOut>(`/api/books/${locale}`)
  } catch {
    return []
  }
}

export async function fetchBooksIndex(
  locale: Locale,
): Promise<BooksIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const books = await listBooks(locale)
  if (!books.length) {
    return { status: 'unavailable' }
  }
  return { status: 'ready', books }
}

export async function getBook(
  locale: Locale,
  slug: string,
): Promise<BookDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const book = await fetchJson<BookDetailOut>(
      `/api/books/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(book)
    if (book.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return book
  } catch {
    return null
  }
}

export async function fetchBookDetail(
  locale: Locale,
  slug: string,
): Promise<BookDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const book = await getBook(locale, slug)
  if (book) {
    return { status: 'ready', book }
  }
  return { status: 'unavailable' }
}

export async function listBookSlugs(locale: Locale): Promise<string[]> {
  const books = await listBooks(locale)
  return books.map((b) => b.slug)
}

export async function resolveBookAlternateAvailability(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const book = await getBook(alternate, slug)
  return book !== null
}
