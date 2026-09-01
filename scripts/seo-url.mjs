/**
 * URL helpers for SEO validation — keep aligned with src/lib/routes.ts and src/lib/seo.ts.
 */

const DEFAULT_LOCALE = 'fa';

export function localePath(locale, pathSegment = '') {
  if (!pathSegment) return `/${locale}/`;
  return `/${locale}/${pathSegment}/`;
}

export function buildCanonicalUrl(siteOrigin, locale, pathSegment = '') {
  const origin = siteOrigin.replace(/\/+$/, '');
  return `${origin}${localePath(locale, pathSegment)}`;
}

export function buildAlternateLinks(siteOrigin, currentLocale, pathSegment = '', alternateAvailable) {
  const links = [
    {
      hreflang: currentLocale,
      href: buildCanonicalUrl(siteOrigin, currentLocale, pathSegment),
    },
  ];

  if (alternateAvailable) {
    const alt = currentLocale === 'en' ? 'fa' : 'en';
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
 * Derive locale and route tail from a dist HTML path such as `en/about/index.html`.
 */
export function localeRouteFromDistRelative(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const homeMatch = normalized.match(/^(fa|en)\/index\.html$/);
  if (homeMatch) {
    return { locale: homeMatch[1], pathSegment: '' };
  }

  const match = normalized.match(/^(fa|en)\/(.+)\/index\.html$/);
  if (!match) return null;

  return { locale: match[1], pathSegment: match[2] };
}
