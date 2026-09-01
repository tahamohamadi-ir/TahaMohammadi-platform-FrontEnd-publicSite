/**
 * Static index path segments from ROUTE-REGISTRY.md.
 * Detail slugs are API-driven at build time and are not listed here.
 */

export const LOCALES = ['fa', 'en'] as const
export type SeoLocale = (typeof LOCALES)[number]

/** Route tail without locale prefix; empty string is home `/{locale}/`. */
export const LOCALE_INDEX_ROUTES = [
  '',
  'about',
  'research',
  'publications',
  'projects',
  'writing',
  'teaching',
  'creative',
  'cv',
  'contact',
  'search',
] as const

export type LocaleIndexRoute = (typeof LOCALE_INDEX_ROUTES)[number]
