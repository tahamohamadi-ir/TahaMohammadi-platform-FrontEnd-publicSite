import type { RuntimeAssetId } from './authority-checksums';
import { AUTHORITY_CHECKSUMS } from './authority-checksums';
import type { TransformRecipe } from './transform-recipes';
import { getTransformRecipe } from './transform-recipes';

export type Locale = 'fa' | 'en';
export type Theme = 'light' | 'dark';

export type MediaSlot =
  | 'gateway.atmosphere'
  | 'home.hero.atmosphere'
  | 'home.graph.backplate'
  | 'home.project.preview'
  | 'home.rail.preview'
  | 'brand.mark';

export type AltPolicy =
  | { kind: 'decorative'; alt: '' }
  | { kind: 'content'; altByLocale: Readonly<Record<Locale, string>> };

export interface PromotedAssetRecord {
  id: RuntimeAssetId;
  authorityPath: string;
  sourceSha256: string;
  intrinsic: { width: number; height: number };
  approval: { ledgerId: string; decision: string; decisionDate: '2026-08-29' };
  semantics: AltPolicy;
  placement: {
    slot: MediaSlot;
    theme: Theme | 'both';
    locales: readonly Locale[];
  };
  transform: TransformRecipe & {
    formats: readonly ['avif', 'webp'];
    fit: 'cover' | 'contain';
    focalByLocale: Readonly<Partial<Record<Locale, string>>>;
    loading: 'lazy' | 'eager';
    fetchPriority: 'auto' | 'high';
    /** Populated after build measurement; omitted until WP-40 acceptance run. */
    measuredByteCeiling?: Readonly<Partial<Record<string, number>>>;
  };
  assetFile: string;
}

const ledger = (id: RuntimeAssetId) => id;

const decorative = { kind: 'decorative' as const, alt: '' as const };

const projectAlt: AltPolicy = {
  kind: 'content',
  altByLocale: {
    en: 'Project preview image',
    fa: 'تصویر پیش‌نمایش پروژه',
  },
};

export const PROMOTED_ASSET_REGISTRY: Record<RuntimeAssetId, PromotedAssetRecord> = {
  'portal-centered-dark': {
    id: 'portal-centered-dark',
    authorityPath: 'art/portal-centered-dark.png',
    sourceSha256: AUTHORITY_CHECKSUMS['portal-centered-dark'],
    intrinsic: { width: 1672, height: 941 },
    approval: { ledgerId: ledger('portal-centered-dark'), decision: 'seed-promotion-decorative', decisionDate: '2026-08-29' },
    semantics: decorative,
    placement: { slot: 'gateway.atmosphere', theme: 'dark', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('gateway.atmosphere'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'eager',
      fetchPriority: 'high',
    },
    assetFile: 'art/portal-centered-dark.png',
  },
  'portal-centered-light': {
    id: 'portal-centered-light',
    authorityPath: 'art/portal-centered-light.png',
    sourceSha256: AUTHORITY_CHECKSUMS['portal-centered-light'],
    intrinsic: { width: 1672, height: 941 },
    approval: { ledgerId: ledger('portal-centered-light'), decision: 'seed-promotion-decorative', decisionDate: '2026-08-29' },
    semantics: decorative,
    placement: { slot: 'gateway.atmosphere', theme: 'light', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('gateway.atmosphere'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'eager',
      fetchPriority: 'high',
    },
    assetFile: 'art/portal-centered-light.png',
  },
  'portal-orbit-dark': {
    id: 'portal-orbit-dark',
    authorityPath: 'art/portal-orbit-dark.png',
    sourceSha256: AUTHORITY_CHECKSUMS['portal-orbit-dark'],
    intrinsic: { width: 1672, height: 941 },
    approval: { ledgerId: ledger('portal-orbit-dark'), decision: 'seed-promotion-decorative', decisionDate: '2026-08-29' },
    semantics: decorative,
    placement: { slot: 'home.hero.atmosphere', theme: 'dark', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.hero.atmosphere'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'eager',
      fetchPriority: 'high',
    },
    assetFile: 'art/portal-orbit-dark.png',
  },
  'portal-orbit-light': {
    id: 'portal-orbit-light',
    authorityPath: 'art/portal-orbit-light.png',
    sourceSha256: AUTHORITY_CHECKSUMS['portal-orbit-light'],
    intrinsic: { width: 1672, height: 941 },
    approval: { ledgerId: ledger('portal-orbit-light'), decision: 'seed-promotion-decorative', decisionDate: '2026-08-29' },
    semantics: decorative,
    placement: { slot: 'home.hero.atmosphere', theme: 'light', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.hero.atmosphere'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'eager',
      fetchPriority: 'high',
    },
    assetFile: 'art/portal-orbit-light.png',
  },
  'brand-primary': {
    id: 'brand-primary',
    authorityPath: 'brand/taha-mark-primary.png',
    sourceSha256: AUTHORITY_CHECKSUMS['brand-primary'],
    intrinsic: { width: 256, height: 233 },
    approval: { ledgerId: ledger('brand-primary'), decision: 'owner-approved-mark', decisionDate: '2026-08-29' },
    semantics: {
      kind: 'content',
      altByLocale: { en: 'Taha Mohammadi', fa: 'طه محمدی' },
    },
    placement: { slot: 'brand.mark', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('brand.mark'),
      formats: ['avif', 'webp'],
      fit: 'contain',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'brand/taha-mark-primary.png',
  },
  'brand-favicon': {
    id: 'brand-favicon',
    authorityPath: 'brand/taha-mark-favicon.png',
    sourceSha256: AUTHORITY_CHECKSUMS['brand-favicon'],
    intrinsic: { width: 64, height: 64 },
    approval: { ledgerId: ledger('brand-favicon'), decision: 'owner-approved-favicon', decisionDate: '2026-08-29' },
    semantics: decorative,
    placement: { slot: 'brand.mark', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      kind: 'brand',
      widths: [64],
      sizes: '64px',
      formats: ['avif', 'webp'],
      fit: 'contain',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'brand/taha-mark-favicon.png',
  },
  'project-dashboard-systems': {
    id: 'project-dashboard-systems',
    authorityPath: 'art/project-dashboard-systems.png',
    sourceSha256: AUTHORITY_CHECKSUMS['project-dashboard-systems'],
    intrinsic: { width: 1536, height: 1024 },
    approval: {
      ledgerId: ledger('project-dashboard-systems'),
      decision: 'owner-mapping-organizational-dashboard',
      decisionDate: '2026-08-29',
    },
    semantics: projectAlt,
    placement: { slot: 'home.project.preview', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.project.preview'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'art/project-dashboard-systems.png',
  },
  'project-data-architecture': {
    id: 'project-data-architecture',
    authorityPath: 'art/project-data-architecture.png',
    sourceSha256: AUTHORITY_CHECKSUMS['project-data-architecture'],
    intrinsic: { width: 1536, height: 1024 },
    approval: {
      ledgerId: ledger('project-data-architecture'),
      decision: 'owner-mapping-pars-sql',
      decisionDate: '2026-08-29',
    },
    semantics: projectAlt,
    placement: { slot: 'home.project.preview', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.project.preview'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'art/project-data-architecture.png',
  },
  'blog-coral-stairs': {
    id: 'blog-coral-stairs',
    authorityPath: 'art/blog-coral-stairs.png',
    sourceSha256: AUTHORITY_CHECKSUMS['blog-coral-stairs'],
    intrinsic: { width: 1536, height: 1024 },
    approval: {
      ledgerId: ledger('blog-coral-stairs'),
      decision: 'owner-mapping-writing-decorative',
      decisionDate: '2026-08-29',
    },
    semantics: decorative,
    placement: { slot: 'home.rail.preview', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.rail.preview'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'art/blog-coral-stairs.png',
  },
  'learning-sage-library': {
    id: 'learning-sage-library',
    authorityPath: 'art/learning-sage-library.png',
    sourceSha256: AUTHORITY_CHECKSUMS['learning-sage-library'],
    intrinsic: { width: 1536, height: 1024 },
    approval: {
      ledgerId: ledger('learning-sage-library'),
      decision: 'owner-mapping-teaching-decorative',
      decisionDate: '2026-08-29',
    },
    semantics: decorative,
    placement: { slot: 'home.rail.preview', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.rail.preview'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'art/learning-sage-library.png',
  },
  'gallery-ivory-forms': {
    id: 'gallery-ivory-forms',
    authorityPath: 'art/gallery-ivory-forms.png',
    sourceSha256: AUTHORITY_CHECKSUMS['gallery-ivory-forms'],
    intrinsic: { width: 1536, height: 1024 },
    approval: {
      ledgerId: ledger('gallery-ivory-forms'),
      decision: 'owner-mapping-creative-decorative',
      decisionDate: '2026-08-29',
    },
    semantics: decorative,
    placement: { slot: 'home.rail.preview', theme: 'both', locales: ['fa', 'en'] },
    transform: {
      ...getTransformRecipe('home.rail.preview'),
      formats: ['avif', 'webp'],
      fit: 'cover',
      focalByLocale: {},
      loading: 'lazy',
      fetchPriority: 'auto',
    },
    assetFile: 'art/gallery-ivory-forms.png',
  },
};

export function getPromotedAssetRecord(id: string, expectedSlot: MediaSlot): PromotedAssetRecord {
  if (!(id in PROMOTED_ASSET_REGISTRY)) {
    throw new Error(`Unknown promoted asset id: ${id}`);
  }
  const record = PROMOTED_ASSET_REGISTRY[id as RuntimeAssetId];
  if (record.placement.slot !== expectedSlot) {
    throw new Error(`Asset ${id} is registered for ${record.placement.slot}, not ${expectedSlot}`);
  }
  return record;
}

export function altForLocale(record: PromotedAssetRecord, locale: Locale): string {
  if (record.semantics.kind === 'decorative') {
    return record.semantics.alt;
  }
  const alt = record.semantics.altByLocale[locale];
  if (!alt) {
    throw new Error(`Missing alt policy for ${record.id} locale ${locale}`);
  }
  return alt;
}
