import type { RuntimeAssetId } from './authority-checksums';

/** Definitive Home featured-project slug → promoted asset ID mapping. */
export const HOME_PROJECT_ASSET_BY_SLUG = {
  'pars-sql-vtd-edge': 'project-data-architecture',
  'organizational-dashboard-research': 'project-dashboard-systems',
} as const satisfies Record<string, RuntimeAssetId>;

/** Definitive Home explore-rail path segment → promoted asset ID mapping. */
export const HOME_RAIL_ASSET_BY_PATH = {
  writing: 'blog-coral-stairs',
  teaching: 'learning-sage-library',
  creative: 'gallery-ivory-forms',
} as const satisfies Record<string, RuntimeAssetId>;

/** Gateway atmosphere uses centered portal variants (theme-specific). */
export const GATEWAY_ATMOSPHERE_ASSETS = {
  light: 'portal-centered-light',
  dark: 'portal-centered-dark',
} as const satisfies Record<'light' | 'dark', RuntimeAssetId>;

/** Home hero atmosphere uses orbit portal variants (theme-specific). */
export const HOME_HERO_ATMOSPHERE_ASSETS = {
  light: 'portal-orbit-light',
  dark: 'portal-orbit-dark',
} as const satisfies Record<'light' | 'dark', RuntimeAssetId>;

/** Brand mark and favicon source IDs. */
export const BRAND_MARK_ASSET_ID = 'brand-primary' as const;
export const BRAND_FAVICON_ASSET_ID = 'brand-favicon' as const;
