import type { ImageMetadata } from 'astro'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import portalCenteredDark from '../../assets/media/art/portal-centered-dark.png'
import portalCenteredLight from '../../assets/media/art/portal-centered-light.png'
import portalOrbitDark from '../../assets/media/art/portal-orbit-dark.png'
import portalOrbitLight from '../../assets/media/art/portal-orbit-light.png'
import projectDashboardSystems from '../../assets/media/art/project-dashboard-systems.png'
import projectDataArchitecture from '../../assets/media/art/project-data-architecture.png'
import blogCoralStairs from '../../assets/media/art/blog-coral-stairs.png'
import learningSageLibrary from '../../assets/media/art/learning-sage-library.png'
import galleryIvoryForms from '../../assets/media/art/gallery-ivory-forms.png'
import homeGraphBackplateLight from '../../assets/media/art/home-graph-backplate-light.png'
import homeGraphBackplateDark from '../../assets/media/art/home-graph-backplate-dark.png'
import brandPrimary from '../../assets/media/brand/taha-mark-primary.png'
import brandFavicon from '../../assets/media/brand/taha-mark-favicon.png'

import { isDeferredAssetId } from './authority-checksums'
import type {
  Locale,
  MediaSlot,
  PromotedAssetRecord,
  Theme,
} from './promoted-media-registry'
import {
  altForLocale,
  getPromotedAssetRecord,
  PROMOTED_ASSET_REGISTRY,
  type AltPolicy,
} from './promoted-media-registry'

export type { Locale, Theme, MediaSlot, AltPolicy, PromotedAssetRecord }
export {
  altForLocale,
  getPromotedAssetRecord,
  PROMOTED_ASSET_REGISTRY,
} from './promoted-media-registry'
export {
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
  GATEWAY_ATMOSPHERE_ASSETS,
  HOME_HERO_ATMOSPHERE_ASSETS,
  HOME_GRAPH_BACKPLATE_ASSETS,
  BRAND_MARK_ASSET_ID,
  BRAND_FAVICON_ASSET_ID,
} from './project-mappings'

export function resolveMediaRoot(
  cwd: string = process.cwd(),
  metaUrl: string = import.meta.url,
): string {
  const cwdMediaRoot = path.resolve(cwd, 'src/assets/media')
  if (existsSync(cwdMediaRoot)) {
    return cwdMediaRoot
  }
  return path.resolve(
    path.dirname(fileURLToPath(metaUrl)),
    '../../assets/media',
  )
}

const mediaRoot = resolveMediaRoot()

const SOURCE_IMPORTS: Record<string, ImageMetadata> = {
  'portal-centered-dark': portalCenteredDark,
  'portal-centered-light': portalCenteredLight,
  'portal-orbit-dark': portalOrbitDark,
  'portal-orbit-light': portalOrbitLight,
  'project-dashboard-systems': projectDashboardSystems,
  'project-data-architecture': projectDataArchitecture,
  'blog-coral-stairs': blogCoralStairs,
  'learning-sage-library': learningSageLibrary,
  'gallery-ivory-forms': galleryIvoryForms,
  'home-graph-backplate-light': homeGraphBackplateLight,
  'home-graph-backplate-dark': homeGraphBackplateDark,
  'brand-primary': brandPrimary,
  'brand-favicon': brandFavicon,
}

function assertSourceHash(record: PromotedAssetRecord, source: ImageMetadata) {
  const absolutePath = path.join(mediaRoot, record.assetFile)
  const bytes = readFileSync(absolutePath)
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (digest !== record.sourceSha256) {
    throw new Error(
      `Source hash drift for ${record.id}: expected ${record.sourceSha256}, got ${digest}`,
    )
  }
  if (
    source.width !== record.intrinsic.width ||
    source.height !== record.intrinsic.height
  ) {
    throw new Error(
      `Intrinsic dimension drift for ${record.id}: expected ${record.intrinsic.width}x${record.intrinsic.height}, got ${source.width}x${source.height}`,
    )
  }
}

for (const record of Object.values(PROMOTED_ASSET_REGISTRY)) {
  const source = SOURCE_IMPORTS[record.id]
  if (!source) {
    throw new Error(
      `Missing Astro source import for promoted asset ${record.id}`,
    )
  }
  assertSourceHash(record, source)
}

export interface PromotedMedia extends PromotedAssetRecord {
  source: ImageMetadata
}

export function getPromotedMedia(
  id: string,
  expectedSlot: MediaSlot,
): PromotedMedia {
  if (isDeferredAssetId(id)) {
    throw new Error(`Deferred asset ${id} must not enter runtime`)
  }

  const record = getPromotedAssetRecord(id, expectedSlot)
  const source = SOURCE_IMPORTS[record.id]
  if (!source) {
    throw new Error(
      `Missing Astro source import for promoted asset ${record.id}`,
    )
  }

  return { ...record, source }
}

export function getPromotedMediaAlt(
  id: string,
  expectedSlot: MediaSlot,
  locale: Locale,
): string {
  return altForLocale(getPromotedAssetRecord(id, expectedSlot), locale)
}

export function resolvePromotedMediaAlt(
  id: string,
  expectedSlot: MediaSlot,
  locale: Locale,
  consumerAlt?: string,
): string {
  const record = getPromotedAssetRecord(id, expectedSlot)
  if (record.semantics.kind === 'decorative') {
    return record.semantics.alt
  }
  if (record.semantics.kind === 'consumer-content') {
    const trimmed = consumerAlt?.trim()
    if (!trimmed) {
      throw new Error(
        `Asset ${id} requires consumer-supplied localized alt for locale ${locale}`,
      )
    }
    return trimmed
  }
  if (record.semantics.kind === 'content' && consumerAlt !== undefined) {
    return consumerAlt
  }
  return altForLocale(record, locale)
}

export function listPromotedMediaBySlot(slot: MediaSlot): PromotedMedia[] {
  return Object.values(PROMOTED_ASSET_REGISTRY)
    .filter((record) => record.placement.slot === slot)
    .map((record) => getPromotedMedia(record.id, slot))
}
