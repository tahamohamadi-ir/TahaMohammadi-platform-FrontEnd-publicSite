/** Locale route parsing and canonical URL helpers — paths from ROUTE-REGISTRY. */

import { alternateLocale, localePath, type Locale } from './navigation';

export type { Locale };

const DEFAULT_LOCALE: Locale = 'fa';

/**
 * Read the locale prefix from a pathname.
 *
 * @example
 * localeFromPath('/fa/about/'); // 'fa'
 * localeFromPath('/en/');       // 'en'
 * localeFromPath('/');          // null
 */
export function localeFromPath(pathname: string): Locale | null {
  const match = pathname.match(/^\/(fa|en)(?=\/|$)/);
  return match ? (match[1] as Locale) : null;
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
  let rest = pathname;
  if (/^\/(fa|en)(?=\/|$)/.test(rest)) {
    rest = rest.replace(/^\/(fa|en)/, '');
  }
  return rest.replace(/^\/+|\/+$/g, '');
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
  const origin = siteOrigin.replace(/\/+$/, '');
  return `${origin}${localePath(locale, pathSegment)}`;
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
  ];

  if (alternateAvailable) {
    const alt = alternateLocale(currentLocale);
    links.push({
      hreflang: alt,
      href: buildCanonicalUrl(siteOrigin, alt, pathSegment),
    });
  }

  links.push({
    hreflang: 'x-default',
    href: buildCanonicalUrl(siteOrigin, DEFAULT_LOCALE, pathSegment),
  });

  return links;
}

/**
 * Text direction for a locale.
 *
 * @example
 * getDir('fa'); // 'rtl'
 * getDir('en'); // 'ltr'
 */
export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}
