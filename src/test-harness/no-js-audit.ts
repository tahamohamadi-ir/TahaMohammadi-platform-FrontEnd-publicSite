import { getSearchRouteTitle } from '../lib/search-content';
import { primaryNav, shellCopy, type Locale } from '../lib/navigation';
import { PAGE_FAMILY_INDEX_CAPTURES } from './page-family-index-captures';

export type NoJsAuditProfile = 'gateway' | 'home' | 'locale-index' | 'search';

export type NoJsAuditRoute = {
  id: string;
  pf: string;
  path: string;
  locale?: Locale;
  dir?: 'ltr' | 'rtl';
  profile: NoJsAuditProfile;
};

/** All 23 static build routes — gateway, home, PF index families, and search utility. */
export const NO_JS_AUDIT_ROUTES: NoJsAuditRoute[] = [
  { id: 'gateway', pf: 'Gateway', path: '/', profile: 'gateway' },
  { id: 'home-en', pf: 'Home', path: '/en/', locale: 'en', dir: 'ltr', profile: 'home' },
  { id: 'home-fa', pf: 'Home', path: '/fa/', locale: 'fa', dir: 'rtl', profile: 'home' },
  ...PAGE_FAMILY_INDEX_CAPTURES.map((capture) => ({
    id: `${capture.id}-${capture.locale}`,
    pf: capture.pf,
    path: capture.path,
    locale: capture.locale,
    dir: capture.dir,
    profile: 'locale-index' as const,
  })),
  {
    id: 'search-en',
    pf: 'Utility',
    path: '/en/search/',
    locale: 'en',
    dir: 'ltr',
    profile: 'search',
  },
  {
    id: 'search-fa',
    pf: 'Utility',
    path: '/fa/search/',
    locale: 'fa',
    dir: 'rtl',
    profile: 'search',
  },
];

/** Expected static page count for the current build (gateway + 11 EN + 11 FA). */
export const NO_JS_AUDIT_ROUTE_COUNT = 23;

export function getSearchTitle(locale: Locale): string {
  return getSearchRouteTitle(locale);
}

export function getPrimaryNavLabel(locale: Locale, slug: string): string | undefined {
  return primaryNav.find((item) => item.slug === slug)?.label[locale];
}

export function getBrandName(locale: Locale): string {
  return shellCopy.brandName[locale];
}
