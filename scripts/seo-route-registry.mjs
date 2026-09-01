/**
 * Static index path segments from ROUTE-REGISTRY.md.
 * Keep aligned with src/lib/seo-route-registry.ts.
 */

export const LOCALES = ['fa', 'en']

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
]
