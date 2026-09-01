/**
 * Search utility route — Pagefind client-side index per locale (PUBLIC-240).
 * Route shape from ROUTE-REGISTRY; copy is UI chrome only.
 */

import { localePath, type Locale } from './navigation'

export const searchQueryParam = 'q'

/** Utility route title — not owner publication content. */
export function getSearchRouteTitle(locale: Locale): string {
  return locale === 'en' ? 'Search' : 'جستجو'
}

export const searchCopy = {
  summary: {
    en: 'Search published pages in this locale.',
    fa: 'جستجو در صفحات منتشرشدهٔ این زبان.',
  },
  queryLabel: { en: 'Search query', fa: 'عبارت جستجو' },
  submitLabel: { en: 'Search', fa: 'جستجو' },
  resultsHeading: { en: 'Results', fa: 'نتایج' },
  indexUnavailable: {
    title: { en: 'Search index unavailable', fa: 'نمایهٔ جستجو در دسترس نیست' },
    message: {
      en: 'The offline search index has not been built yet. Try again after the site build completes.',
      fa: 'نمایهٔ آفلاین جستجو هنوز ساخته نشده است. پس از اتمام build سایت دوباره تلاش کنید.',
    },
  },
  noResults: {
    title: { en: 'No matching results', fa: 'نتیجه‌ای یافت نشد' },
    message: {
      en: 'Try a different query or browse the main sections.',
      fa: 'عبارت دیگری را امتحان کنید یا بخش‌های اصلی را مرور کنید.',
    },
  },
  loading: {
    title: { en: 'Searching', fa: 'در حال جستجو' },
    message: {
      en: 'Looking through the local index.',
      fa: 'در حال جستجو در نمایهٔ محلی.',
    },
  },
  noscript: {
    title: {
      en: 'Search requires JavaScript',
      fa: 'جستجو به جاوااسکریپت نیاز دارد',
    },
    message: {
      en: 'Full-text search runs in the browser using the offline Pagefind index.',
      fa: 'جستجوی تمام‌متن در مرورگر و با نمایهٔ آفلاین Pagefind انجام می‌شود.',
    },
  },
} as const

export function buildSearchPageHref(locale: Locale, query = ''): string {
  const base = localePath(locale, 'search')
  const trimmed = query.trim()
  if (!trimmed) return base
  return `${base}?${searchQueryParam}=${encodeURIComponent(trimmed)}`
}

export function parseSearchQuery(searchParams: URLSearchParams): string {
  return searchParams.get(searchQueryParam)?.trim() ?? ''
}

/** Per-locale Pagefind bundle path written by the build integration. */
export function getSearchBundlePath(locale: Locale): string {
  return `/pagefind/${locale}`
}
