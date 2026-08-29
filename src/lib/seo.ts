/** Head metadata helpers for canonical URLs and hreflang alternates. */

import { buildAlternateLinks, buildCanonicalUrl, getDir, type Locale } from './routes';

export { getDir };

export interface AlternateLink {
  hreflang: string;
  href: string;
}

export interface PageSeo {
  canonical: string;
  alternates: AlternateLink[];
}

/**
 * Build canonical and alternate link metadata for a locale page.
 *
 * @example
 * buildPageSeo('https://tahamohamadi.ir', 'fa', '', false);
 * // {
 * //   canonical: 'https://tahamohamadi.ir/fa/',
 * //   alternates: [
 * //     { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/' },
 * //     { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/' },
 * //   ],
 * // }
 */
export function buildPageSeo(
  siteOrigin: string,
  locale: Locale,
  pathSegment = '',
  alternateAvailable = false,
): PageSeo {
  return {
    canonical: buildCanonicalUrl(siteOrigin, locale, pathSegment),
    alternates: buildAlternateLinks(siteOrigin, locale, pathSegment, alternateAvailable),
  };
}
