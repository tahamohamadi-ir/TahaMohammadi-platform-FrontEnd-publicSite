/** Locale route parsing and canonical URL helpers — paths from ROUTE-REGISTRY. */

import { alternateLocale, localePath, type Locale } from './navigation'

export type { Locale }

const DEFAULT_LOCALE: Locale = 'fa'

/**
 * Read the locale prefix from a pathname.
 *
 * @example
 * localeFromPath('/fa/about/'); // 'fa'
 * localeFromPath('/en/');       // 'en'
 * localeFromPath('/');          // null
 */
export function localeFromPath(pathname: string): Locale | null {
  const match = pathname.match(/^\/(fa|en)(?=\/|$)/)
  return match ? (match[1] as Locale) : null
}

/**
 * Remove a leading `fa` or `en` locale segment, returning the route tail.
 *
 * @example
 * stripLocalePrefix('/fa/about/'); // 'about'
 * stripLocalePrefix('/en/');       // ''
 * stripLocalePrefix('/about/');    // 'about'
 */
export function stripLocalePrefix(pathname: string): string {
  let rest = pathname
  if (/^\/(fa|en)(?=\/|$)/.test(rest)) {
    rest = rest.replace(/^\/(fa|en)/, '')
  }
  return rest.replace(/^\/+|\/+$/g, '')
}

/**
 * Build an absolute canonical URL for a locale route.
 *
 * @example
 * buildCanonicalUrl('https://tahamohamadi.ir', 'fa', 'about');
 * // 'https://tahamohamadi.ir/fa/about/'
 */
export function buildCanonicalUrl(
  siteOrigin: string,
  locale: Locale,
  pathSegment = '',
): string {
  const origin = siteOrigin.replace(/\/+$/, '')
  return `${origin}${localePath(locale, pathSegment)}`
}

/**
 * Build hreflang alternate link descriptors for the current page.
 * Omits the alternate locale when `alternateAvailable` is false.
 *
 * @example
 * buildAlternateLinks('https://tahamohamadi.ir', 'en', 'about', true);
 * // [
 * //   { hreflang: 'en', href: 'https://tahamohamadi.ir/en/about/' },
 * //   { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/about/' },
 * //   { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/about/' },
 * // ]
 */
export function buildAlternateLinks(
  siteOrigin: string,
  currentLocale: Locale,
  pathSegment = '',
  alternateAvailable: boolean,
): Array<{ hreflang: string; href: string }> {
  const links: Array<{ hreflang: string; href: string }> = [
    {
      hreflang: currentLocale,
      href: buildCanonicalUrl(siteOrigin, currentLocale, pathSegment),
    },
  ]

  if (alternateAvailable) {
    const alt = alternateLocale(currentLocale)
    links.push({
      hreflang: alt,
      href: buildCanonicalUrl(siteOrigin, alt, pathSegment),
    })
  }

  links.push({
    hreflang: 'x-default',
    href: buildCanonicalUrl(siteOrigin, DEFAULT_LOCALE, pathSegment),
  })

  return links
}

/**
 * Text direction for a locale.
 *
 * @example
 * getDir('fa'); // 'rtl'
 * getDir('en'); // 'ltr'
 */
export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr'
}

export type RouteFamily =
  | 'home'
  | 'about'
  | 'research'
  | 'research-topic'
  | 'research-statement'
  | 'projects'
  | 'project'
  | 'publications'
  | 'publication'
  | 'books'
  | 'book'
  | 'talks'
  | 'talk'
  | 'resources'
  | 'resource'
  | 'collections'
  | 'collection'
  | 'blog'
  | 'article'
  | 'series'
  | 'education'
  | 'course'
  | 'lesson'
  | 'gallery'
  | 'creative-work'
  | 'cv'
  | 'contact'
  | 'search'

/**
 * Generate the canonical localized path for any target product family (§I02).
 */
export function canonicalPath(
  family: RouteFamily,
  locale: Locale,
  slug?: string,
  parentSlug?: string,
): string {
  switch (family) {
    case 'home':
      return localePath(locale, '')
    case 'about':
      return localePath(locale, 'about')
    case 'research':
      return localePath(locale, 'research')
    case 'research-topic':
      return localePath(locale, `research/${slug ?? ''}`)
    case 'research-statement':
      return localePath(locale, `research/statements/${slug ?? ''}`)
    case 'projects':
      return localePath(locale, 'projects')
    case 'project':
      return localePath(locale, `projects/${slug ?? ''}`)
    case 'publications':
      return localePath(locale, 'publications')
    case 'publication':
      return localePath(locale, `publications/${slug ?? ''}`)
    case 'books':
      return localePath(locale, 'books')
    case 'book':
      return localePath(locale, `books/${slug ?? ''}`)
    case 'talks':
      return localePath(locale, 'talks')
    case 'talk':
      return localePath(locale, `talks/${slug ?? ''}`)
    case 'resources':
      return localePath(locale, 'resources')
    case 'resource':
      return localePath(locale, `resources/${slug ?? ''}`)
    case 'collections':
      return localePath(locale, 'collections')
    case 'collection':
      return localePath(locale, `collections/${slug ?? ''}`)
    case 'blog':
      return localePath(locale, 'blog')
    case 'article':
      return localePath(locale, `blog/${slug ?? ''}`)
    case 'series':
      return localePath(locale, `blog/series/${slug ?? ''}`)
    case 'education':
      return localePath(locale, 'education')
    case 'course':
      return localePath(locale, `education/${slug ?? ''}`)
    case 'lesson':
      return localePath(
        locale,
        `education/${parentSlug ?? ''}/lessons/${slug ?? ''}`,
      )
    case 'gallery':
      return localePath(locale, 'gallery')
    case 'creative-work':
      return localePath(locale, `gallery/${slug ?? ''}`)
    case 'cv':
      return localePath(locale, 'cv')
    case 'contact':
      return localePath(locale, 'contact')
    case 'search':
      return localePath(locale, 'search')
    default:
      return localePath(locale, '')
  }
}

/**
 * Reserved segments under primary namespaces (§I02).
 * `series` is reserved under `blog/` (articles cannot take this slug).
 * `statements`, `projects`, `publications` are reserved under `research/`.
 */
export const RESERVED_SLUGS: Record<string, ReadonlySet<string>> = {
  blog: new Set(['series']),
  article: new Set(['series']),
  research: new Set(['statements', 'projects', 'publications']),
  'research-topic': new Set(['statements', 'projects', 'publications']),
}

export function isReservedSlug(family: string, slug: string): boolean {
  return RESERVED_SLUGS[family]?.has(slug) ?? false
}

/**
 * Resolves legacy route migrations and aliases to their canonical targets (§I02).
 * Handles writing -> blog, teaching -> education, creative -> gallery,
 * research/projects -> projects, research/publications -> publications.
 */
export function resolveLegacyMigrationRedirect(
  pathname: string,
): { target: string; permanent: boolean } | null {
  const clean = pathname.replace(/\/+$/, '')
  const match = clean.match(/^\/(fa|en)(?=\/|$)(.*)/)
  const locale: Locale = match ? (match[1] as Locale) : DEFAULT_LOCALE
  const sub = match
    ? (match[2]?.replace(/^\/+/, '') ?? '')
    : clean.replace(/^\/+/, '')

  const parts = sub.split('/')
  const head = parts[0]
  const tail = parts.slice(1).join('/')

  if (head === 'writing') {
    const next = tail ? `blog/${tail}` : 'blog'
    return { target: localePath(locale, next), permanent: true }
  }

  if (head === 'teaching' || head === 'courses') {
    const next = tail ? `education/${tail}` : 'education'
    return { target: localePath(locale, next), permanent: true }
  }

  if (head === 'creative' || head === 'creative-works') {
    const next = tail ? `gallery/${tail}` : 'gallery'
    return { target: localePath(locale, next), permanent: true }
  }

  if (head === 'research' && parts[1] === 'projects') {
    const rest = parts.slice(2).join('/')
    const next = rest ? `projects/${rest}` : 'projects'
    return { target: localePath(locale, next), permanent: true }
  }

  if (head === 'research' && parts[1] === 'publications') {
    const rest = parts.slice(2).join('/')
    const next = rest ? `publications/${rest}` : 'publications'
    return { target: localePath(locale, next), permanent: true }
  }

  return null
}
